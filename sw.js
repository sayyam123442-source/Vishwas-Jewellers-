// ══════════════════════════════════════════════════════════════
//  VISHWAS GOLD CALCULATOR — Service Worker
//  Cache-first for app shell, network-first for live API calls
// ══════════════════════════════════════════════════════════════

const CACHE_NAME   = 'vishwas-gold-v1'
const OFFLINE_PAGE = './VISHWAS_CALCULATOR.html'

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  './',
  './VISHWAS_CALCULATOR.html',
  './manifest.webmanifest',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&family=Dancing+Script:wght@400;500;600;700&display=swap',
]

// API hosts — always network-first, never cache
const API_HOSTS = [
  'api.gold-api.com',
  'open.er-api.com',
]

// ── Install: pre-cache app shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: routing strategy ───────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // 1. Live API calls → Network only (no caching, no fallback)
  if (API_HOSTS.includes(url.hostname)) {
    event.respondWith(fetch(event.request))
    return
  }

  // 2. Google Fonts → Cache first, fallback to network
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          return response
        })
      )
    )
    return
  }

  // 3. App shell → Cache first, then network, fallback to offline page
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached

      return fetch(event.request)
        .then(response => {
          // Cache valid GET responses
          if (
            event.request.method === 'GET' &&
            response.status === 200 &&
            response.type !== 'opaque'
          ) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline fallback — serve the calculator HTML
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_PAGE)
          }
        })
    })
  )
})
