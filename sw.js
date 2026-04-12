// ── Vishwas Jewellers Gold Calculator — Service Worker ──────────────────────
const CACHE_NAME = 'vishwas-gold-v1';
const ASSETS = [
  './VISHWAS_CALCULATOR.html',
  './manifest.webmanifest'
];

// ── Install: pre-cache all assets ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first strategy with network fallback ─────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache, but refresh cache in background (stale-while-revalidate)
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {/* offline — no-op */});

        return cached;
      }

      // Not in cache — try network, then cache it
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback: return the main HTML page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./VISHWAS_CALCULATOR.html');
        }
      });
    })
  );
});
