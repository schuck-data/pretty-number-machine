// Service worker — cache-first static shell.
//
// Deliberately dependency-free and readable, to match the rest of the project:
// no Workbox, no build step. Paths are relative so this works whether the app
// is served from a domain root or a subdirectory; a worker's scope is derived
// from its own location, and relative precache URLs resolve against it.
//
// BUMP CACHE_VERSION on every deploy that changes any precached file.
// Without a bump, returning visitors keep the old code forever.

const CACHE_VERSION = 'pnmv1-v1.0.0-dev.5';

// Every cache this worker is allowed to touch begins with this. CACHE_VERSION
// must start with it too.
//
// Load-bearing since ./v1/ appeared. Two builds now share an origin, and
// therefore share one Cache Storage. Without a prefix the activate handler
// below reads "every cache that is not mine" as "every cache that is stale",
// which is true for one build alone and false the moment a second exists — it
// would count the OTHER build's cache as its own junk and eventually bin it,
// taking that build offline.
//
// The trailing hyphen is what separates the two namespaces: 'pnm-…' is the other build's and
// does not start with 'pnmv1-'. That is deliberate, not luck. Do not drop the hyphen.
const CACHE_PREFIX = 'pnmv1-';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',

  './core/notices.js',
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
  // skipWaiting() so a new version becomes the ACTIVE worker as soon as it has
  // finished precaching, instead of queueing until every copy of the app is
  // closed. Without it an update is invisible indefinitely — a browser tab gets
  // closed eventually, but an installed TWA might not be for weeks.
  //
  // This is safe here only because of two deliberate choices below: the new
  // worker does NOT claim pages that are already running, and activate does NOT
  // delete the cache those pages are still reading from. Add either of those
  // back and this becomes the mixed-generation bug that took the app down on
  // 2026-08-09 — new JavaScript against old, live.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const stale = (await caches.keys())
      .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_VERSION);
    const clients = await self.clients.matchAll({ includeUncontrolled: true });

    // Claim only on a genuine first install, when no older cache exists and so
    // no page can be mid-generation. It earns its place there: it lets the very
    // first visit work offline without needing a relaunch.
    //
    // Claiming on an UPDATE would be the bug. The running page has already
    // loaded its modules; switching its controller would point any later fetch
    // at the new generation while the old one is still executing.
    if (stale.length === 0) {
      await self.clients.claim();
      return;
    }

    // Never bin a cache a live client may still be reading from. The old worker
    // keeps serving that page from its own generation until the page goes away,
    // which is what keeps it coherent.
    //
    // Deleting everything older than the previous generation bounds storage at
    // two while preserving the one that matters. With no clients at all, there
    // is nothing to protect and everything stale goes.
    const doomed = clients.length > 0 ? stale.slice(0, -1) : stale;
    await Promise.all(doomed.map((k) => caches.delete(k)));
  })());
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
  // The worker's generation defines the WHOLE app. A client runs entirely one
  // version or entirely another, never a mixture. Stale-but-working beats
  // fresh-and-broken, and the swap happens between page loads rather than
  // under a half-rendered scene.
  //
  // Since v0.14.4 that swap costs ONE refresh rather than closing every copy:
  // skipWaiting() makes a new version active as soon as it has precached, but
  // it does not claim the running page and does not delete the cache that page
  // is reading from, so the page you are looking at finishes its life on the
  // generation it started with. The NEXT navigation gets the new one.
  //
  // Still outstanding for the TWA case, and the reason PLAN.md section 6
  // item 6 stays open: an installed app has no refresh button. A long-lived
  // copy needs an "update available" prompt to learn there is something newer,
  // because it may never navigate at all.
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

  // Every lookup below goes through THIS worker's own cache, never the global
  // caches.match(). That distinction is load-bearing as of v0.14.4.
  //
  // caches.match() searches EVERY cache in storage and returns the first hit,
  // in creation order — so it is oldest-first. That was harmless while activate
  // deleted every old cache, because there was only ever one to search. Now
  // that a previous generation is deliberately kept alive for pages still
  // running on it, a global match would hand this worker the OLD generation's
  // files. Caught in testing: a seeded v0.14.3 cache served its index.html to
  // the v0.14.4 worker, which is precisely the mixed-generation failure the
  // whole cache-first design exists to prevent.
  //
  // Scoping to CACHE_VERSION is what makes keeping old caches safe: each
  // generation reads only its own, so the two cannot bleed into each other.
  const fromOwnCache = (req, opts) =>
    caches.open(CACHE_VERSION).then((c) => c.match(req, opts));

  if (request.mode === 'navigate' && !isStandaloneDoc) {
    event.respondWith(
      fromOwnCache('./index.html', { ignoreSearch: true })
        .then((hit) => hit || fromOwnCache('./'))
        .then((hit) => hit || fetch(request))
    );
    return;
  }

  event.respondWith(
    fromOwnCache(request, { ignoreSearch: true }).then((hit) => {
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
