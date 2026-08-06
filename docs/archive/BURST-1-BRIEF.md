> **ARCHIVED — do not follow this document.**
>
> Burst 1 shipped on 2026-08-06 (v0.7.0). This brief is kept only as a record
> of what was asked for. Two of its instructions were wrong, and following
> them again would reintroduce the bugs:
>
> - **§Tasks 1** says to grep for `three/addons/` imports and vendor "every
>   addon actually imported, and only those." That finds four files; the app
>   needs six. `Line2.js` and `LineGeometry.js` transitively import
>   `LineSegments2.js` and `LineSegmentsGeometry.js`, which appear nowhere in
>   our source. Omitting them breaks the app at load.
> - **§Acceptance criterion 6** says bumping `CACHE_VERSION` and reloading
>   twice serves the new code. It does not, and it contradicts the
>   no-`skipWaiting()` rule two sections above it. A waiting service worker
>   activates when every client is *closed*, not reloaded.
>
> Current guidance lives in `docs/PLAN.md` — charter in §0, gotchas in §8.

---

# Burst 1 Brief — Offline-capable PWA

**For:** Claude Code, working in the `pnm/` directory of the betterward.com repo
**Prereq:** Read `PLAN.md` in this directory first. It has the charter and the
full roadmap. This brief covers Burst 1 only.

---

## Scope discipline

Do **only** what is listed under "Tasks." This is a side project worked in
bursts; the value of a burst is that it ends shippable. Specifically:

- **Do not refactor `panel.js` or `renderer.js`.** There is known coupling in
  `panel.js` (`scheduleRebuild()` reads ~20 controls by hardcoded element ID).
  It is documented, it is deferred, and it is not this burst.
- **Do not change any visual output or control behaviour.** A user should not
  be able to tell Burst 1 happened, except that the app now installs and works
  offline.
- **Do not add features.** No skins, no audio, no export, no onboarding.
- If you find something worth doing that is out of scope, add it to §6 "Open"
  in `PLAN.md` rather than doing it.

---

## Context you need

Static site, no build step, no package manager. Native ES modules loaded
directly by the browser. Three.js comes from a CDN via importmap.

```
pnm/
├── index.html          markup + all CSS + module bootstrap
├── core/
│   ├── state.js        event bus, module registry, DEFAULT_CONFIG, HOT_KEYS
│   ├── math.js         FIRST_PRIMES, getPrimeRGB
│   ├── positions.js    getShapes, getMaxDim, getMinDim
│   ├── panel.js        UI construction + state sync
│   └── renderer.js     Three.js scene, buildScene, update, resolveN
└── modules/
    ├── physics.js      registered in index.html featureModules
    ├── info.js         registered in index.html featureModules
    └── nature.js       NOT registered — dead file, leave it alone this burst
```

**Critical deployment fact:** the app is served from a **subdirectory**,
`betterward.com/pnm/`, not from a domain root. Every path in this burst —
service worker scope, manifest `start_url` and `scope`, icon paths,
registration path — must account for that. Use relative paths where possible.
A service worker at `/pnm/sw.js` gets scope `/pnm/`, which is what we want.
Getting this wrong is the single most likely way this burst fails.

---

## Tasks

### 1. Vendor Three.js locally

Currently `index.html` has:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
```

Pin to **0.170.0** — do not upgrade, that is a separate risk.

- Grep the whole codebase for `three/addons/` imports first. `renderer.js`
  very likely pulls `OrbitControls`; there may be others. Vendor **every**
  addon actually imported, and only those.
- Place under `vendor/three/` and rewrite the importmap to relative paths.
- Verify in-browser afterward: no network requests to jsdelivr, no console
  errors, scene renders identically.

Why this matters beyond offline: remote code execution from a CDN is an
app-store review flag, and Burst 6 wraps this same code as a TWA.

### 2. Vendor the font

`index.html` loads Space Grotesk from Google Fonts. Weights used: 300, 400,
600, 700.

- Download woff2 files, self-host under `vendor/fonts/`, declare with
  `@font-face` and `font-display: swap`.
- Space Grotesk is SIL Open Font License — self-hosting is permitted. Include
  the OFL license file alongside the fonts.
- Only ship weights actually used. Latin subset is fine.

### 3. Icons

None exist. Generate from the app itself — a rendered still of the additive-RGB
node structure on the `#0c0c0f` background is on-brand and free.

Needed: 192×192, 512×512, and a 512×512 maskable variant with the safe-area
padding maskable icons require (keep content within the inner 80%). Plus a
180×180 `apple-touch-icon.png`.

### 4. Web app manifest

`manifest.webmanifest`:

- `name`: Pretty Number Machine
- `short_name`: something that fits under a home-screen icon
- `start_url` and `scope`: correct for the `/pnm/` subdirectory
- `display`: standalone
- `background_color` and `theme_color`: `#0c0c0f` (matches `--bg` in the CSS)
- `orientation`: leave unset or `any` — the visualization works in both
- icons array pointing at the files from task 3

Link it from `index.html` and add `<meta name="theme-color" content="#0c0c0f">`
and the apple-touch-icon link.

### 5. Service worker

Cache-first for the static shell. Keep it simple and readable — no Workbox,
no build step, consistent with the rest of the project.

- Precache: `index.html`, all of `core/`, the two registered files in
  `modules/`, the vendored Three.js and addons, the fonts, the icons, the
  manifest.
- **Include a `CACHE_VERSION` constant** and delete non-matching caches on
  `activate`. Without this, users get permanently stuck on stale code, and
  debugging that later is miserable.
- Do not call `skipWaiting()` unconditionally — taking over mid-session while
  a WebGL scene is live is a good way to cause confusing bugs. Let the new
  worker activate on next launch.
- Register it from `index.html` guarded by `'serviceWorker' in navigator`, and
  fail silently — a registration error must never break the app.

---

## Acceptance criteria

Do not consider the burst done until all of these pass:

1. Loads and renders identically to current production. No visual or
   behavioural change.
2. DevTools Network tab shows **zero** third-party requests.
3. Installs to an Android home screen with the correct icon and name.
4. Launches and fully works with the device in airplane mode.
5. Lighthouse PWA checks pass.
6. Bumping `CACHE_VERSION` and reloading twice serves the new code — verify
   this, do not assume it.
7. No new console errors or warnings.

---

## On finishing

1. Update `PLAN.md` §5 Status log: what shipped, anything discovered, anything
   deferred.
2. Check off the Burst 1 boxes in `PLAN.md` §3.
3. Add anything surprising to `PLAN.md` §6 Open.
4. Bump the version string in `index.html` (currently `v0.6.6`) — suggest
   `v0.7.0`, since offline capability is a real change.
5. Commit with a message that says what changed and why.

Next burst is mobile interaction (bottom sheet, 44px touch targets, hover
gating, safe-area insets). Do not start it now.
