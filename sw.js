// sw.js - Enhanced Service Worker for Kaprao52 PWA
const CACHE_NAME = 'kaprao52-v27-cache-v1';
const STATIC_CACHE = 'kaprao52-static-v2';
const IMAGE_CACHE = 'kaprao52-images-v2';
const API_CACHE = 'kaprao52-api-v1';

// URLs to cache immediately on install
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Image files to cache
const imageFiles = [
  './images/kaprao-kai-yiao-ma.jpg',
  './images/kaprao-kung.jpg',
  './images/kaprao-moo-krob.jpg',
  './images/kaprao-moo-sap.jpg',
  './images/kaprao-nor-mai.jpg',
  './images/kaprao-san-ko.jpg',
  './images/khai-dao-rod-sot-makham.jpg',
  './images/khao-pad-moo-chin.jpg',
  './images/kung-kra-thiam.jpg',
  './images/kung-rod-sot-makham.jpg',
  './images/mama-pad-kaprao.jpg',
  './images/prik-kang-moo-chin.jpg',
  './images/san-ko-kra-thiam.jpg'
];

// External resources with versioning
const externalResources = [];

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
      }),
      // Cache local images
      caches.open(IMAGE_CACHE).then((cache) => {
        console.log('[SW] Caching local images');
        return cache.addAll(imageFiles.map(img => img)).catch(err => {
          console.log('[SW] Some images failed to cache:', err);
        });
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

  // Strategy 2: Network First for local images (to always get new images)
  if ((request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) &&
    url.origin === self.location.origin) {
    event.respondWith(networkFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Strategy 2b: Cache First for external images
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

  // Strategy 4: Network First for navigation requests (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      }).catch(() => {
        return caches.match('./index.html');
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
    }).catch(() => { });
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

// Image compression and resize using Canvas API
async function compressImage(imageBlob, maxWidth = 400, maxHeight = 400, quality = 0.8) {
  try {
    // Create bitmap from blob
    const bitmap = await createImageBitmap(imageBlob);

    // Calculate new dimensions maintaining aspect ratio
    let { width, height } = bitmap;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Create canvas and draw resized image
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Convert to blob with compression
    const compressedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality
    });

    return compressedBlob;
  } catch (error) {
    console.error('[SW] Image compression failed:', error);
    return imageBlob; // Return original if compression fails
  }
}

// Create thumbnail version for menu display
async function createThumbnail(imageBlob, size = 150) {
  return compressImage(imageBlob, size, size, 0.7);
}

// Enhanced cache first strategy for images with compression
async function cacheFirstWithCompression(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Update cache in background
    fetch(request).then(async (response) => {
      if (response.ok) {
        const imageBlob = await response.blob();
        const compressedBlob = await compressImage(imageBlob, 400, 400, 0.85);
        const compressedResponse = new Response(compressedBlob, {
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Compressed': 'true'
          }
        });
        cache.put(request, compressedResponse);
      }
    }).catch(() => { });
    return cached;
  }

  try {
    const response = await fetch(request);
    if (!response.ok) return response;

    // Compress image before caching
    const imageBlob = await response.blob();
    const originalSize = imageBlob.size;
    const compressedBlob = await compressImage(imageBlob, 400, 400, 0.85);
    const compressedSize = compressedBlob.size;

    console.log(`[SW] Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${((1 - compressedSize / originalSize) * 100).toFixed(0)}% reduction)`);

    const compressedResponse = new Response(compressedBlob, {
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Compressed': 'true',
        'X-Original-Size': originalSize.toString()
      }
    });

    cache.put(request, compressedResponse.clone());
    return compressedResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Offline - Resource unavailable', { status: 503 });
  }
}
