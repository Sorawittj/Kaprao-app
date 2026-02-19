/**
 * =============================================
 * Kaprao52 App - Enhanced Service Worker v2
 * =============================================
 * PWA support with:
 * - Precise caching strategies
 * - Background sync for offline orders
 * - Offline fallback page
 * - Push notification handling
 */

const CACHE_VERSION = 'kaprao52-v28';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_PAGE = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    '/css/variables.css',
    '/css/base.css',
    '/css/components.css',
    '/css/animations.css',
    '/css/navigation.css',
    '/css/responsive.css',
    '/js/core/StateManager.js',
    '/js/core/IdempotentRequest.js',
    '/js/core/ErrorBoundary.js',
    '/js/auth/AuthManager.js',
    '/js/ui/SkeletonLoader.js',
    '/js/ui/ToastQueue.js'
];

// Install event - Precache critical assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Precaching assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('[SW] Precache failed:', err))
    );
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('kaprao52-') && !name.startsWith(CACHE_VERSION))
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - Handle all requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests (except for API calls handled by background sync)
    if (request.method !== 'GET') {
        if (url.pathname.includes('/orders') || url.pathname.includes('/api')) {
            // Queue for background sync
            event.respondWith(queueForSync(request));
        }
        return;
    }
    
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }
    
    // Strategy 2: Stale While Revalidate for images
    if (request.destination === 'image') {
        event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
        return;
    }
    
    // Strategy 3: Network First for API calls
    if (isAPIRequest(url)) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }
    
    // Strategy 4: Network First for navigation
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, STATIC_CACHE, true));
        return;
    }
    
    // Default: Network with cache fallback
    event.respondWith(networkWithCacheFallback(request));
});

// Background Sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncPendingOrders());
    }
});

// Push Notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'แจ้งเตือนใหม่จาก Kaprao52',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        tag: 'kaprao52-notification',
        requireInteraction: false,
        actions: [
            { action: 'open', title: 'เปิดแอพ' },
            { action: 'close', title: 'ปิด' }
        ],
        data: { url: '/' }
    };
    
    event.waitUntil(
        self.registration.showNotification('Kaprao52', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const url = event.notification.data?.url || '/';
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    // Focus existing window if open
                    for (const client of clientList) {
                        if (client.url === url && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Open new window
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                })
        );
    }
});

// ==========================================
// Caching Strategies
// ==========================================

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
        // Update cache in background
        fetch(request).then(response => {
            if (response.ok) cache.put(request, response);
        }).catch(() => {});
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request, cacheName, isNavigation = false) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cached = await cache.match(request);
        
        if (cached) return cached;
        
        // Return offline page for navigation
        if (isNavigation) {
            return cache.match(OFFLINE_PAGE) || new Response('Offline', { status: 503 });
        }
        
        return new Response('Network error', { status: 503 });
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    const networkPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => cached);
    
    return cached || networkPromise;
}

async function networkWithCacheFallback(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw error;
    }
}

// ==========================================
// Background Sync Helpers
// ==========================================

const pendingRequests = new Map();

async function queueForSync(request) {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Clone request for storage
    const requestData = {
        url: request.url,
        method: request.method,
        headers: Array.from(request.headers.entries()),
        body: await request.text(),
        timestamp: Date.now()
    };
    
    pendingRequests.set(id, requestData);
    
    // Register for sync
    if ('sync' in self.registration) {
        await self.registration.sync.register('sync-orders');
    }
    
    // Return queued response
    return new Response(
        JSON.stringify({ queued: true, id }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
}

async function syncPendingOrders() {
    console.log('[SW] Syncing pending orders...');
    
    for (const [id, requestData] of pendingRequests.entries()) {
        try {
            const response = await fetch(requestData.url, {
                method: requestData.method,
                headers: requestData.headers,
                body: requestData.body
            });
            
            if (response.ok) {
                pendingRequests.delete(id);
                
                // Notify clients
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SYNC_COMPLETE',
                        id,
                        timestamp: Date.now()
                    });
                });
            }
        } catch (error) {
            console.error('[SW] Sync failed for', id, error);
        }
    }
}

// ==========================================
// Utilities
// ==========================================

function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.json', '.woff2', '.woff'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function isAPIRequest(url) {
    return url.pathname.includes('/rest/v1/') || 
           url.hostname.includes('supabase.co');
}

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data === 'getPendingCount') {
        event.ports[0].postMessage({ count: pendingRequests.size });
    }
});
