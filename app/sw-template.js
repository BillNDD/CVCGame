/* The service worker, as source. vite.config.js (wq-pwa) writes it to
   dist/sw.js with the cache name and the precache list filled in, so the
   shipped worker is this file and tests can drive its handlers directly.
   Cache-first service worker. After the first load the app is fully cached
   and makes no network calls, except the adult-initiated version check
   (SPEC section 7a), which this worker never intercepts. A new version
   installs but WAITS: it never activates while the app is open. The adult
   applies it at once (the "wq-activate" message), or the browser applies
   it when the app next starts fresh. */
const CACHE = "wq-__CACHE_VERSION__";           // filled in at build time
const ASSETS = __ASSETS__;

self.addEventListener("install", (e) => {
  /* cache: "reload" bypasses the HTTP cache, so a new service worker never
     precaches a stale copy served under the host's max-age. No skipWaiting
     here: a new version never takes over while the app is open. */
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "wq-activate") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  /* Delete only this app's old caches. CacheStorage is origin-wide, and other
     apps can share the origin on a project-pages host. */
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("wq-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return;   // the update check sees the live host
  if (req.mode === "navigate") {
    /* The app is ONE page, at the root of this scope. Any other page under
       the same path - a diagnostic page, a document, a mistyped address -
       must not be answered with the app's index.html: its assets are
       addressed relative to the page, so they would resolve under the wrong
       folder and the visitor would get a blank white screen. Reported from a
       phone, on exactly such a page. */
    const root = new URL("./", self.location).pathname;
    if (url.pathname !== root && url.pathname !== root + "index.html") {
      e.respondWith(
        fetch(req).catch(() =>
          caches.match(req).then((hit) => hit || caches.match(url.pathname.replace(/\/$/, "") + "/index.html"))
        )
      );
      return;
    }
    /* Re-cache on a miss so offline navigation self-heals after the browser
       evicts the cache under storage pressure. */
    e.respondWith(
      caches.match("./index.html").then((r) =>
        r || fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
      )
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
