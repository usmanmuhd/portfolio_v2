// Diet Coke Tracker - Service Worker
// =============================================================================
// VERSION UPDATE CHECKLIST:
//   1. Rename this file to sw-X.X.js
//   2. Update CACHE_NAME below
//   3. Update STATIC_ASSETS file references
//   4. See app-X.X.js for full checklist
// =============================================================================
const CACHE_NAME = 'diet-coke-tracker-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles-1.4.css',
  './app-1.4.js',
  './manifest.json',
  './icons/icon.svg'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        // Return cached version or fetch new
        const fetchPromise = fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));

            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
  );
});

// Handle skip waiting message
self.addEventListener('message', event => {
  if (event.data && (event.data.action === 'skipWaiting' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});
