// sw.js - Enhanced Service Worker for Kaprao52 PWA
const CACHE_NAME = 'kaprao52-v24-cache-v1';
const STATIC_CACHE = 'kaprao52-static-v1';
const IMAGE_CACHE = 'kaprao52-images-v1';
const API_CACHE = 'kaprao52-api-v1';

// URLs to cache immediately on install
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// External resources with versioning
const externalResources = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://static.line-scdn.net/liff/edge/2/sdk.js'
];

// Install event - Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache core app shell
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      }),
      // Cache static resources
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(externalResources);
      })
    ]).then(() => {
      console.log('[SW] Install completed');
      return self.skipWaiting();
    })
  );
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old versions of our caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== IMAGE_CACHE && 
              cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation completed');
      return self.clients.claim();
    })
  );
});

// Enhanced fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Network First for API calls (with cache fallback)
  if (url.pathname.includes('googleapis.com') || 
      url.pathname.includes('script.google.com')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Strategy 2: Cache First for images (with network fallback)
  if (request.destination === 'image' || 
      url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Strategy 3: Stale While Revalidate for static assets
  if (url.pathname.includes('cdn.') || 
      url.pathname.includes('static.')) {
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
    return;
  }

  // Strategy 4: Cache First for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Update cache in background
    fetch(request).then((response) => {
      cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Offline - Resource unavailable', { status: 503 });
  }
}

// Network First Strategy
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always fetch from network to update cache
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.error('[SW] Network fetch failed:', error);
    return null;
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return networkPromise.then((response) => {
    if (!response) {
      return new Response('Resource unavailable offline', { status: 503 });
    }
    return response;
  });
}

// Background Sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  console.log('[SW] Syncing pending orders...');
  // Implementation would sync from IndexedDB
  // This is a placeholder for future implementation
}

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'แจ้งเตือนใหม่จาก Kaprao52',
    icon: 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png',
    vibrate: [100, 50, 100],
    data: {
      url: './'
    },
    actions: [
      {
        action: 'open',
        title: 'เปิดแอพ'
      },
      {
        action: 'close',
        title: 'ปิด'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Kaprao52', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || './')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'getCacheStats') {
    getCacheStats().then((stats) => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(stats);
      }
    });
  }
});

// Get cache statistics
async function getCacheStats() {
  const cacheNames = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  const stats = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = keys.length;
  }
  
  return stats;
}
