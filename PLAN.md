# Pretty Number Machine — Project Plan

**Owner:** Dakota Schuck
**Current version:** v0.7.0 (repo: `schuck-data/pretty-number-machine`, private)
**Prototype:** v0.6.6 remains live at betterward.com/pnm — frozen, do not touch
**Last updated:** 2026-08-06 (rev 3 — Burst 1 shipped)

---

## 0. Charter

**Primary goal:** Portfolio piece and reach. A neat thing that exists, is
findable, and is legible to someone evaluating the work.

**Secondary:** Income potential, if it materializes. Not a constraint on scope.

**Cadence:** Side project, bursts of focus. Every work package must be
completable in one burst and must leave the app shippable. No multi-session
refactors that leave things broken.

**Platform:** Android first via Google Play. Apple later or never.

### What this charter rules out

- **The M2 core-controls refactor** (from rev 1) is deferred indefinitely. It is
  a multi-session job that leaves the app broken mid-flight — the worst possible
  shape for burst work — and it only pays off if skins get built.
- **Three skins** is descoped to Phase 2, optional. One well-onboarded default
  plus a Drift toggle captures most of the value.
- **Apple submission** is deferred. Apple 4.2 rejects thin web wrappers; Google
  Play accepts PWAs as Trusted Web Activities with no native code. All the
  "must feel native" pressure was Apple pressure.

### How to use this doc

This file is the project's memory. Claude sessions do not reliably persist;
this file does. Commit it to the repo. Open it at the start of a burst,
update §5 at the end of one.

---

## 1. Current material

Static site, no build step, native ES modules, Three.js via importmap from CDN.

```
pnm/
├── index.html          18 KB   markup + all CSS + bootstrap
├── core/
│   ├── state.js         2 KB   event bus, module registry, DEFAULT_CONFIG, HOT_KEYS
│   ├── math.js          8 KB   FIRST_PRIMES, getPrimeRGB
│   ├── positions.js     5 KB   getShapes, getMaxDim, getMinDim
│   ├── panel.js        21 KB   UI construction + state sync
│   └── renderer.js     34 KB   Three.js scene, buildScene, update, resolveN
├── modules/
│   ├── physics.js      17 KB   registered
│   └── info.js         10 KB   registered
├── manifest.webmanifest        PWA manifest, relative start_url/scope
├── sw.js                       service worker — BUMP CACHE_VERSION on deploy
├── icons/                      192, 512, 512-maskable, apple-touch
└── lib/
    ├── three/         1.4 MB   three@0.170.0 + 6 addon files
    └── fonts/          22 KB   Space Grotesk variable woff2 + OFL
```

`nature.js` was deleted in v0.7.0 — it was never registered. Recoverable from
git history if it turns out to be wanted.

**Strong:** event bus + module registry; single `DEFAULT_CONFIG`; `HOT_KEYS`
separating live-mutable from rebuild-required params; split-channel CSS custom
properties; module crash isolation.

**The asset:** In Additive RGB mode, a node's color *is* its factorization.
2=red, 3=green, 5=blue; 6 is yellow because red+green; 30 goes white. Not a
clever visualization of a known thing — a representation where the color
carries the mathematical content. This is the whole idea. Protect it, lead
with it, explain it.

**Known debt (deferred, not urgent):** `panel.js` `scheduleRebuild()` reads
~20 core controls by hardcoded element ID, coupling core state to markup in
`index.html`. Blocks a skin system. Does not block anything in Phase 1.

**Known bugs:** three conflicting N ceilings — `state.maxN`=50000,
`getMaxN()`=10000, slider max=2500.

---

## 2. Product gaps that matter more than features

- **No onboarding.** First-timer sees 30+ controls and a spinning object. The
  color rule — the entire idea — is invisible unless already known.
- **Nothing leaves the app.** No shareable link, no preset, no screenshot with
  attribution. This is the reach mechanism and it does not exist.
- **No explanation anywhere.** No README worth the name, no writeup. For a
  portfolio-primary project this is the largest single gap.

---

## 3. Work packages

Each is one burst. Each ships. Order matters; scope does not creep.

### Burst 1 — Offline-capable PWA ✅ SHIPPED 2026-08-06 (v0.7.0)
- [x] Vendor Three.js locally (was jsDelivr CDN) → `lib/three/`
- [x] Vendor Space Grotesk locally (was Google Fonts) → `lib/fonts/`
- [x] `manifest.webmanifest` — name, icons 192/512/maskable, theme-color,
      display standalone, orientation
- [x] Service worker, cache-first static shell
- [x] `<meta name="theme-color">`, apple-touch-icon
- **Done when:** installs to home screen, launches with no network
- **Outstanding:** criteria 3 and 4 (home-screen install, airplane mode) need a
  real device and a public HTTPS URL. Verified locally: offline load with the
  server killed, and the full update path. See §7.

### Burst 2 — Mobile interaction
- [ ] Panel → bottom sheet under ~640px (280px fixed sidebar eats two-thirds
      of a phone screen)
- [ ] Touch targets to 44px min (prime buttons 38×28, slider thumbs 12×22)
- [ ] Gate hover states behind `@media (hover: hover)` — they latch after tap
- [ ] `env(safe-area-inset-*)` padding (`viewport-fit=cover` is set, unhandled)
- [ ] Reconcile the three N ceilings
- **Done when:** usable one-handed without pinch-zooming

### Burst 3 — Serialization and sharing
- [ ] Config → URL hash
- [ ] Restore from hash on load
- [ ] Share button (Web Share API, clipboard fallback)
- **Done when:** a configuration can be sent to someone and opens identically

### Burst 4 — Onboarding
- [ ] One screen, dismissible, teaching only the color rule: 2 red, 3 green,
      5 blue, 6 yellow because 2×3
- [ ] Sensible first-run defaults (small N, labels on) so the rule is visible
- **Done when:** a stranger gets the idea in ten seconds

### Burst 5 — Portfolio packaging ← **primary goal complete here**
- [ ] README: what it is, the color idea, screenshots, live link
- [ ] Short writeup on the factorization-as-color idea (~3 hrs, highest
      leverage item in the project — it is both the portfolio artifact and
      the shareable object)
- [ ] Repo hygiene: `nature.js` wired up or deleted, license, clean history

### GATE — Post it
r/math, Hacker News, Mathstodon, math-teacher communities. These respond to
the *idea*, not to an app listing. Watch for: return visits, shares, requests.
Everything after this point is contingent on signal.

### Burst 6 — Google Play
- [ ] TWA wrapper via PWABuilder or Bubblewrap (no native code required)
- [ ] Play Console account, $25 one-time
- [ ] Store listing, screenshots, privacy policy (trivial — no data collected,
      keep it that way)
- **Done when:** installable from Play

### Burst 7 — Audio prototype (do any time, out of order)
Highest-variance item. Cheap to test, potentially reshapes the product.

Prime factorization *is* just intonation: 2 = octave (2:1), 3 = perfect fifth
(3:2), 5 = major third (5:4), 7 = harmonic seventh (7:4). A node's pitch is
the product of its factors' ratios, so nodes that look related sound related —
the same fact in two senses.

- [ ] `modules/audio.js` — existing registry means no core changes
- [ ] Gesture-gated init (Web Audio requires user gesture; never autoplay)
- [ ] Master mute
- **Decision point:** if it is magic, it becomes a headline feature. If it is
  mediocre, cut it and lose nothing.

---

## Phase 2 — contingent, not committed

Only if the gate shows signal:
- Core controls → schema refactor (the deferred M2)
- Skins: Teach / Play / Drift as defaults + vocabulary + exposed-control sets
- Export: stills, video, wallpaper-sized output
- Apple submission (needs the above to survive 4.2 review)

**Guardrail if a contemplative skin ships:** keep it contemplative, not
assertive. No healing-frequency claims, no numerology. The structure is
genuinely orderly; the awe carries itself. The same binary ships the teaching
mode, and its credibility is worth more.

---

## 4. Standing decisions

- Portfolio and reach over revenue; revenue is upside, not a constraint
- Web URL is the primary artifact; the Play listing is secondary
- Every burst ships; nothing is left half-refactored
- Additive RGB colouring is the core idea — protect it
- Audio, if built, is just intonation from prime ratios, not arbitrary mapping
- No data collection, ever — keeps the privacy policy trivial

---

## 5. Status log

**2026-08-06 rev 3** — Burst 1 shipped. v0.6.6 → v0.7.0.

Charter amended by owner: **the app is the deliverable.** The Play Store
listing is the goal, not a contingent nice-to-have. Portfolio and reach still
matter but no longer outrank it, so the burst order stays roughly as written in
rev 2 — offline shell first, store at the end — rather than the reach-first
reordering that was on the table.

Project moved out of the betterward.com repo into its own private repo,
`schuck-data/pretty-number-machine`. betterward.com/pnm is frozen at v0.6.6 as
the original prototype and is not to be modified.

Shipped:
- Three.js 0.170.0 and Space Grotesk vendored locally. Zero third-party
  requests at runtime, verified in the network log.
- Icons generated from the app's own colour rule — 30 = 2x3x5 as three
  additive discs, using the exact `getPrimeRGB('rgb')` values. Legible at
  48px in a way a node-graph screenshot would not be.
- `manifest.webmanifest` + cache-first service worker, both using relative
  paths so the app runs from a domain root or any subdirectory unchanged.

Discovered:
- `Line2.js` and `LineGeometry.js` transitively import `LineSegments2.js` and
  `LineSegmentsGeometry.js`, which appear nowhere in our source. The Burst 1
  brief said to grep for addon imports and vendor "only those" — following
  that literally ships a broken app. Vendor addons transitively.
- Space Grotesk is a variable font. One 22 KB woff2 covers 300–700; the four
  weights in the old Google Fonts URL were always the same file.
- Burst 1 acceptance criterion 6 ("reload twice serves new code") is wrong and
  contradicts the no-`skipWaiting()` rule two sections above it. A waiting
  worker activates when every client is **closed**, not reloaded. Verified the
  real path: leave the app, come back, new worker activates and the old cache
  is deleted. Behaviour is correct; the test was not.

**2026-08-06 rev 2** — Executive review. Charter set: portfolio/reach primary,
burst cadence, Android-first. Rev 1's M2 refactor deferred; three-skin scope
cut to Phase 2. Android-first collapses PWA work and store submission into
nearly the same effort. Portfolio packaging (Burst 5) identified as the actual
finish line. Nothing built yet.

**2026-08-06 rev 1** — Codebase reviewed via Drive. Architecture assessed:
module registry and state layer strong, core panel coupling the one real
blocker to skins. Plan drafted.

---

## 6. Open

1. ~~`nature.js` — wire up or delete?~~ **Decided: delete.** Not registered in
   `featureModules`, nothing imports it, git history keeps it recoverable.
2. ~~Is the repo the source of truth, or has the Drive copy diverged?~~
   **Answered:** they were byte-identical (`diff -rq` clean). Moot now — the
   new repo is the sole source of truth.
3. ~~Device floor?~~ **Partly answered:** test device is a Pixel 9. That is a
   fast phone, so it will flatter the app. Still unknown how this performs on
   low-end hardware, which is what decides the N ceiling in Burst 2.
4. **Where does the app get hosted?** A TWA needs a public HTTPS URL it can
   verify ownership of. betterward.com is off the table. Options: GitHub Pages
   on this repo, or a domain. Blocks Burst 6, nothing before it. All paths are
   relative, so any choice works without code changes.
5. **Repo is private.** Fine for now; must go public before it can serve as a
   portfolio piece.
6. **No update prompt.** With no `skipWaiting()`, someone who never fully
   closes the app can sit on old code indefinitely. Correct for a store app,
   where users close things. If it becomes a problem, the fix is an
   "update available — reload" toast, not `skipWaiting()`.
7. **The gate has no instrument.** §4 says no data collection, ever. The GATE
   says watch for return visits and shares. Those are incompatible: with zero
   analytics the only observable signal is people talking to you. Decide
   whether the gate is explicitly qualitative or whether one privacy-preserving
   exception is allowed.

---

## 7. Verification status

What has actually been proven, and how — so nobody re-litigates it or assumes
more than was tested.

| Claim | Status | How |
|---|---|---|
| Renders identically to v0.6.6 | ✅ | Owner confirmed visually at localhost |
| Zero third-party requests | ✅ | Network log: all 16 requests same-origin |
| No console errors | ✅ | Console clean across reloads |
| Works with no server at all | ✅ | Server killed; app fully loaded, 69 controls, WebGL live |
| `CACHE_VERSION` bump ships new code | ✅ | Bumped, relaunched, old cache deleted, new HTML served |
| Installs to Android home screen | ❌ | Needs a public HTTPS URL + device |
| Works in airplane mode on device | ❌ | Same |
| Lighthouse PWA checks | ❌ | Same |

Automated screenshots do not work in this environment — the browser pane must
be visible to composite frames, so the render loop is suspended and the canvas
reports 0x0. This affects the original v0.6.6 identically, so it is a tooling
limit, not an app bug. Visual checks need a human at a real browser.

---

## 8. Gotchas for future bursts

- **Registering the service worker on `window.load` does not work here.** The
  bootstrap module in `index.html` uses top-level `await` for its dynamic
  module imports, so it can resume *after* `load` has already fired, and a
  listener added at that point never runs. Offline support then silently never
  installs, with no error anywhere. Guard on `document.readyState` instead.
  Caught in v0.7.0 only because the cache was cleared and re-tested.
- **Vendored Three.js addons need transitive imports.** Grepping app source
  for `three/addons/` finds four files; the app needs six.
- **A waiting service worker does not activate on reload.** Close every client
  and reopen, or you will conclude the update path is broken when it is not.
