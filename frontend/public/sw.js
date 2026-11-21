/* Bhagya service worker.
 *
 * Deliberately small and safe for an app that shows personal, signed-in content:
 *  - Pages (navigations) always come from the network. They are never stored, so nobody can be shown a stale page, or
 *    another person's page. If the network fails, the offline page is shown instead.
 *  - Only the build's fingerprinted files (/assets/*) and the app icons are cached. Fingerprinted files never change
 *    for a given name, so cache-first is correct for them.
 *  - Nothing else is touched: /api/ calls, anything with an Authorization header, other websites, non-GET requests
 *    and range requests (audio/video) all go straight to the network.
 * Bump VERSION to drop every old cache on the next visit. Between bumps the cache keeps only the most recent MAX_ASSETS
 * fingerprinted files, so it cannot grow with every deploy (a build has about 175; a visitor loads only the pages they open).
 */
const VERSION = "v1";
const STATIC_CACHE = `bhagya-static-${VERSION}`;
const MAX_ASSETS = 120;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bhagya-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Oldest-first: the cache lists entries in the order they were stored, so the first ones are from older builds.
const trimAssets = (cache) =>
  cache.keys().then((reqs) => {
    const assets = reqs.filter((r) => new URL(r.url).pathname.startsWith("/assets/"));
    return Promise.all(assets.slice(0, Math.max(0, assets.length - MAX_ASSETS)).map((r) => cache.delete(r)));
  });

const isCacheable = (url) => url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.headers.has("range") || req.headers.has("authorization")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
    return;
  }

  if (isCacheable(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy).then(() => trimAssets(c)));
            }
            return res;
          }),
      ),
    );
  }
});
