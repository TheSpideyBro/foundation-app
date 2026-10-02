// U-M5: minimal honest offline. The previous worker was a deliberate no-op
// (an installed PWA with no offline behavior showed a dead network-error
// page). Now: cache the /offline fallback page on install and serve it for
// navigation requests when the network fails. Everything else passes
// straight through — this app needs live data, so no app-shell caching.
const OFFLINE_URL = "/offline";
const CACHE_NAME = "foundation-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only navigations get the offline fallback — API/asset requests keep
  // their own error semantics.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached || Response.error())
      )
    );
    return;
  }
  event.respondWith(fetch(request));
});
