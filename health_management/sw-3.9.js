// Service Worker for Weight Loss Tracker PWA
// =============================================================================
// VERSION UPDATE: When bumping version, update:
//   1. CACHE_NAME below (increment version number)
//   2. STATIC_ASSETS file references to match new versioned file names
//   3. See app-X.X.js for full checklist
// =============================================================================
const CACHE_NAME = 'weight-tracker-v29';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles-3.9.css',
  './app-3.9.js',
  './manifest.json',
  './icons/icon-v2.svg',
  './icons/icon-maskable-v2.svg'
];

const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      // Cache local assets
      const localCaching = cache.addAll(STATIC_ASSETS);
      // Try to cache external assets but don't fail if they don't work
      const externalCaching = Promise.all(
        EXTERNAL_ASSETS.map((url) =>
          fetch(url)
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch(() => console.log(`Failed to cache: ${url}`))
        )
      );
      return Promise.all([localCaching, externalCaching]);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses or non-http(s) requests
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // Still cache CDN responses
            if (response && response.status === 200 && event.request.url.includes('cdn.jsdelivr.net')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Offline and not in cache - return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
