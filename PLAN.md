# Pretty Number Machine — Project Plan

**Owner:** Dakota Schuck
**Current version:** v0.6.6 (live at betterward.com/pnm)
**Last updated:** 2026-08-06 (rev 2 — post executive review)

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
└── modules/
    ├── physics.js      17 KB   registered
    ├── info.js         10 KB   registered
    └── nature.js        4 KB   NOT LOADED — absent from featureModules
```

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

### Burst 1 — Offline-capable PWA
- [ ] Vendor Three.js locally (currently jsDelivr CDN)
- [ ] Vendor Space Grotesk locally (currently Google Fonts)
- [ ] `manifest.webmanifest` — name, icons 192/512/maskable, theme-color,
      display standalone, orientation
- [ ] Service worker, cache-first static shell
- [ ] `<meta name="theme-color">`, apple-touch-icon
- **Done when:** installs to home screen, launches with no network

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

1. `nature.js` — wire up or delete? (Burst 5 blocker, trivial either way)
2. Is the repo the source of truth, or has the Drive copy diverged?
3. Device floor — oldest phone this must run on?
