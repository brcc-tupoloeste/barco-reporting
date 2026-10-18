const CACHE_NAME = 'barco-reporting-v396-offline';

const APP_SHELL = [
  './',
  './index.html'
];

/*
 * BaRCO Reporting Portal
 * Offline app-shell cache for Livestock field encoding.
 *
 * - Keeps the portal available after it has been opened once online.
 * - Same-origin static files can be served from cache.
 * - Apps Script / Google Drive requests are never cached here.
 * - Livestock form data itself is stored by the page in localStorage.
 */

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(key) {
              return key !== CACHE_NAME;
            })
            .map(function(key) {
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);

  // Do not cache Apps Script, Google Drive, or any other external traffic.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation: try network first so updates are picked up when online.
  // If offline, fall back to the cached portal shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              return cache.put('./index.html', copy);
            })
            .catch(function() {});

          return response;
        })
        .catch(function() {
          return caches.match('./index.html')
            .then(function(hit) {
              return hit || caches.match('./');
            });
        })
    );
    return;
  }

  // Static same-origin assets: cache first, network fallback.
  event.respondWith(
    caches.match(request)
      .then(function(hit) {
        if (hit) {
          return hit;
        }

        return fetch(request)
          .then(function(response) {
            if (
              request.method === 'GET' &&
              response &&
              response.ok
            ) {
              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(request, copy);
                })
                .catch(function() {});
            }

            return response;
          });
      })
  );
});
