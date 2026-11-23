const CACHE_NAME = 'orbitpulse-3d-v2';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fallback/stations.json',
  './fallback/korea.json',
  './fallback/weather.json',
  './fallback/gps.json',
  './fallback/science.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only cache same-origin app assets; never intercept external tiles or live CelesTrak APIs
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  const isStaticAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/models/') ||
    url.pathname.includes('/cesium/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/fallback/');

  if (isStaticAsset) {
    // Cache-first with background refresh for heavy 3D models, Cesium workers, and hashed assets
    event.respondWith(
      caches.match(req).then((cached) => {
        const netPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || netPromise;
      })
    );
    return;
  }

  // Network-first for HTML navigations with offline fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
  );
});
