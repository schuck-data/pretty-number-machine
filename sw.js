// Service worker — cache-first static shell.
//
// Deliberately dependency-free and readable, to match the rest of the project:
// no Workbox, no build step. Paths are relative so this works whether the app
// is served from a domain root or a subdirectory; a worker's scope is derived
// from its own location, and relative precache URLs resolve against it.
//
// BUMP CACHE_VERSION on every deploy that changes any precached file.
// Without a bump, returning visitors keep the old code forever.

const CACHE_VERSION = 'pnm-v0.10.1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',

  './core/state.js',
  './core/math.js',
  './core/positions.js',
  './core/panel.js',
  './core/renderer.js',
  './core/sheet.js',
  './core/transport.js',

  './modules/physics.js',
  './modules/info.js',

  './lib/three/three.module.js',
  './lib/three/addons/controls/OrbitControls.js',
  './lib/three/addons/lines/Line2.js',
  './lib/three/addons/lines/LineMaterial.js',
  './lib/three/addons/lines/LineGeometry.js',
  './lib/three/addons/lines/LineSegments2.js',
  './lib/three/addons/lines/LineSegmentsGeometry.js',

  './lib/fonts/SpaceGrotesk-latin.woff2',

  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // addAll is atomic on purpose: a partial cache is a broken offline app, and
  // failing loudly here beats a mystery blank screen in airplane mode.
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .catch((err) => {
        console.error('[PNM sw] precache failed, install aborted:', err);
        throw err;
      })
  );
  // No skipWaiting(). Swapping the worker out from under a live WebGL scene
  // causes confusing bugs; the new version takes over on next launch.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigations: serve the shell offline rather than the browser error page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('./index.html', { ignoreSearch: true })
          .then((hit) => hit || caches.match('./'))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        // Runtime-cache same-origin successes so anything missed by the
        // precache list still works on the second launch.
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
