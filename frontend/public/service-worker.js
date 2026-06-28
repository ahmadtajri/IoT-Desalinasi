// Service Worker for PWA offline support and caching
// NOTE: PWA install & service worker require HTTPS (except localhost)
// Setup HTTPS with Let's Encrypt on your VPS for full PWA support

const CACHE_NAME = 'iot-desalinasi-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.error('[Service Worker] Cache installation failed:', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests and API calls (they should always use network)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) schemes
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // For API calls, use network-first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page if available
            return caches.match('/offline.html').catch(() => {
              return new Response('Service unavailable - offline mode', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
          });
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(error => {
        console.error('[Service Worker] Fetch failed:', error);
        // Return offline page or error response
        return caches.match('/offline.html').catch(() => {
          return new Response('Network request failed - offline mode', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
