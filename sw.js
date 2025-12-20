// sw.js - หัวใจสำคัญของ PWA
const CACHE_NAME = 'kaprao52-v9.3-cache';
const urlsToCache = [
  './', // Cache หน้าแรก (สำคัญมากสำหรับ GitHub Pages)
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Varela+Round&family=Kanit:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdn-icons-png.flaticon.com/512/3448/3448609.png',
  'https://www.soundjay.com/buttons/sounds/button-3.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  'https://www.soundjay.com/misc/sounds/crumple-paper-1.mp3',
  'https://www.soundjay.com/misc/sounds/magic-chime-01.mp3'
];

// 1. Install Service Worker & Cache Files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. Activate & Clean old cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy: Cache First, then Network (Offline-First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
