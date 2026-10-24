const CACHE_NAME = 'foodbridge-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API requests, with offline cache fallback for GET requests
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const resClone = response.clone();
              caches.open('foodbridge-api-cache').then((cache) => {
                cache.put(event.request, resClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cached) => {
              if (cached) return cached;
              return new Response(JSON.stringify({ offline: true, error: 'Offline mode: showing previously saved data.' }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
          })
      );
      return;
    }
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return networkResponse;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
