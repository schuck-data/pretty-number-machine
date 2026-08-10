// Service worker — cache-first static shell.
//
// Deliberately dependency-free and readable, to match the rest of the project:
// no Workbox, no build step. Paths are relative so this works whether the app
// is served from a domain root or a subdirectory; a worker's scope is derived
// from its own location, and relative precache URLs resolve against it.
//
// BUMP CACHE_VERSION on every deploy that changes any precached file.
// Without a bump, returning visitors keep the old code forever.

const CACHE_VERSION = 'pnm-v0.14.2';

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
  './modules/lens.js',

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
  // {cache: 'reload'} is load-bearing. A plain addAll() is allowed to satisfy
  // itself from the browser's own HTTP cache, so bumping CACHE_VERSION could
  // fill the *new* cache with *old* files and leave someone running a mixture
  // of two versions — the exact failure the version bump exists to prevent.
  // Seen for real: a freshly bumped cache served a JavaScript module missing
  // an export that had already shipped.
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(
        PRECACHE.map((url) => new Request(url, { cache: 'reload' }))
      ))
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

  // Navigations: cache-first, from the SAME versioned cache as everything
  // else. This is load-bearing, not a performance choice.
  //
  // It used to be network-first, which quietly guaranteed the app could run
  // two versions of itself at once: the HTML came fresh off the network while
  // core/ and modules/ came cache-first from whatever generation the active
  // worker owned. Merely stale for most of this project's life — until v0.14.0
  // deleted the #dimension slider, at which point the new HTML met the old
  // panel.js and threw `Cannot set properties of null (setting 'min')` before
  // the renderer ever started. Menu and buttons, no figure. Every returning
  // visitor saw it.
  //
  // The worker's generation now defines the WHOLE app. A client runs entirely
  // v0.14.1 or entirely v0.14.2, never a mixture. Stale-but-working beats
  // fresh-and-broken, and with no skipWaiting() the swap happens on relaunch,
  // when nothing is half-rendered.
  //
  // Cost, accepted: an update is invisible until every copy of the app is
  // closed. That was already true of the JavaScript; it is now also true of
  // the markup, so the two can no longer disagree. See PLAN.md section 6
  // item 6 — an "update available" toast is the right next step, and is now
  // the only way a long-lived client learns there is something newer.
  //
  // One exception, and it is not a softening of the rule above. The shell
  // answers navigations because every navigation into this scope IS the app —
  // that stopped being true when privacy.html arrived. It is a standalone
  // document with no shared JavaScript, so it cannot desynchronise from the
  // worker's generation the way index.html could, and serving the app in its
  // place is simply wrong: Google Play requires the privacy policy URL to be
  // reachable, and anyone who had ever opened the app would have followed that
  // link and been handed the app again. A first-time visitor has no worker and
  // would have seen the real page, so this would have looked fine in review and
  // broken for actual users.
  const isStandaloneDoc = /\/privacy\.html$/.test(new URL(request.url).pathname);

  if (request.mode === 'navigate' && !isStandaloneDoc) {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then((hit) => hit || caches.match('./'))
        .then((hit) => hit || fetch(request))
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
