// ══════════════════════════════════════════════════════════════
//  VISHWAS GOLD CALCULATOR — Service Worker (sw.js)
//  Caches the app shell for offline use
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'vishwas-gold-v1'

const ASSETS = [
  './',
  './VISHWAS_CALCULATOR.html',
  './manifest.webmanifest',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&family=Dancing+Script:wght@400;500;600;700&display=swap'
]

// ── Install: pre-cache app shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// ── Activate: clean up old caches ─────────────────────────────
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

// ── Fetch: network-first for API calls, cache-first for assets ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Always go network-first for live gold/forex APIs
  const isApiCall =
    url.hostname === 'api.gold-api.com' ||
    url.hostname === 'open.er-api.com'

  if (isApiCall) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, return a fallback JSON so the app can use cached rate
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // Cache-first for everything else (app shell, fonts, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        // Only cache valid same-origin or CORS-approved responses
        if (
          response &&
          response.status === 200 &&
          (response.type === 'basic' || response.type === 'cors')
        ) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
