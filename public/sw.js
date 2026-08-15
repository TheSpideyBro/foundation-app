// Service worker for হিলফুল ফাউন্ডেশন PWA
// Strategy: cache-first for static assets & icons; network-first for navigation
// (pages always served fresh when online; cached shell when offline).

const CACHE_NAME = "hilful-cache-v1";

// Static assets are immutable-hashed and safe to cache forever
const STATIC_BLACKLIST_PATTERNS = [/_next\/static/, /icons\//, /\.png$/, /\.jpg$/, /\.svg$/];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Only GET requests
  if (event.request.method !== "GET") return;

  const isStatic = STATIC_BLACKLIST_PATTERNS.some((p) => p.test(url.pathname));

  if (isStatic) {
    // Cache-first: instant for repeat visits
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res.ok) cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Network-first for navigation/pages: fresh when online
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
