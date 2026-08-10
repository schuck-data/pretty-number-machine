# Pretty Number Machine — Project Plan

**Owner:** Dakota Schuck
**Current version:** v0.14.0 (repo: `schuck-data/pretty-number-machine`, public)
**Live at:** https://schuckdata.com/pretty-number-machine/
**Prototype:** v0.6.6 remains live at betterward.com/pnm — frozen, do not touch
**Last updated:** 2026-08-06 (rev 10 — pre-release control cleanup)

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

Static site, no build step, native ES modules, Three.js via importmap from a
locally vendored copy. No runtime dependency on any third party.

```
pnm/
├── index.html          18 KB   markup + all CSS + bootstrap
├── core/
│   ├── state.js         2 KB   event bus, module registry, DEFAULT_CONFIG, HOT_KEYS
│   ├── math.js          8 KB   FIRST_PRIMES, getPrimeRGB
│   ├── positions.js     5 KB   getShapes, getMaxDim, getMinDim
│   ├── panel.js        21 KB   UI construction + state sync; exports setDimension
│   ├── renderer.js     34 KB   Three.js scene, buildScene, update, resetMorph
│   ├── sheet.js         4 KB   phone bottom-sheet state + drag-to-resize
│   └── transport.js     5 KB   play/pause playhead, scrubs via panel.setDimension
├── modules/
│   ├── physics.js      17 KB   registered
│   ├── info.js         10 KB   registered; exports showInfoAt/hideInfo
│   └── lens.js          7 KB   chalkboard wipe, projected labels, tap-for-info
├── docs/
│   ├── PLAN.md                  this file — the project's memory
│   ├── PLAY-STORE-HANDOFF.md    briefing for the Play submission
│   └── archive/                 superseded docs, flagged as such
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

**Known bugs:** ~~three conflicting N ceilings~~ resolved in v0.8.0. See §5
rev 4 and §6 item 7 for what remains.

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

### Burst 2 — Mobile interaction ✅ SHIPPED 2026-08-06 (v0.8.0)
- [x] Panel → bottom sheet under ~640px (280px fixed sidebar eats two-thirds
      of a phone screen)
- [x] Touch targets to 44px min (prime buttons 38×28, slider thumbs 12×22)
- [x] Gate hover states behind `@media (hover: hover)` — they latch after tap
- [x] `env(safe-area-inset-*)` padding (`viewport-fit=cover` is set, unhandled)
- [x] Reconcile the three N ceilings
- **Done when:** usable one-handed without pinch-zooming
- **Outstanding:** the one-handed judgement itself needs a thumb on a real
  phone. Geometry and every rule verified in-browser; ergonomics cannot be.

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
**See `PLAY-STORE-HANDOFF.md` — full briefing, drafted copy, and the traps.**
- [ ] TWA wrapper via PWABuilder or Bubblewrap (no native code required)
- [ ] Play Console account, $25 one-time
- [ ] `assetlinks.json` at the **domain root** — a different repo, and Jekyll
      drops dot-directories by default. This is the big one.
- [ ] Store listing, screenshots, privacy policy (trivial — no data collected,
      keep it that way)
- **Done when:** installable from Play, launching with no address bar
- **Schedule risk:** new personal Play accounts may need 12 testers for 14 days
  before production access. Verify early; it is the long pole, not the build.

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

**2026-08-06 rev 10** — v0.14.0. Thirteen owner-requested edits ahead of the
Play submission. Mostly small, but three were bugs wearing feature requests.

**The bugs.**

1. **Reset did not reset the hot keys.** `resetToDefaults()` repaints every
   control then calls `scheduleRebuild()`, which by design reads only the
   *cold* keys — the ones needing a scene rebuild. So every hot control was
   corrected in the UI and never written to state. `colorDrift`,
   `colorDriftSpeed`, `pulse`, `pulseSpeed`, `linePulse`, `autoRotate` and
   `driftSpeed` all survived a Reset: the toggle went off and the effect kept
   running. Fixed by pushing one `update()` built from `HOT_KEYS` ∩
   `DEFAULT_CONFIG`, so a hot key added later is covered for free rather than
   needing a new literal in a list of thirty.
2. **Reset did not return the shape.** It always set `dimension` to 0, but the
   morph keeps `morphPos` in renderer module scope and only re-seeds it when
   `morphActive` is false. It was still true, so the next frame overwrote
   `state.dimension` from the stale position and the figure snapped back to
   wherever it had drifted. New exported `resetMorph()`. Reset was working; the
   morph was undoing it one frame later.
3. **Physics never came back.** Crossing N > 1000 unchecks Touch and Collision
   *and dispatches change*, which sets the module's own `touchEnabled` /
   `collisionEnabled` false. Coming back under the cap re-enabled the module and
   the inputs but never re-checked the boxes or re-ran `onChange`, so both flags
   stayed false and the springs were never rebuilt — physics returned dead and
   stayed dead until a manual toggle. Now restored on the capped→uncapped
   transition only, so it cannot overwrite a deliberate choice on every rebuild.

**Parastichy lines fade instead of thinning.** The request was for less
presence at the thinnest setting. Thickness 1 is already the floor —
`LineMaterial` with `worldUnits: false` measures in *device* pixels against the
drawing buffer, so at 3× DPR it is a third of a CSS pixel and there is nothing
below it. The lines now fade toward the **background** below thickness 3.
Deliberately not desaturation, which was the first instinct: on a near-black
field desaturating moves a colour toward grey, which is *brighter*, and a
desaturated 2-line stops reading as red. Hue is the content here. Composition
is handled by a per-line `liveColor` that colour drift writes to, with the fade
applied once at the end of the frame — lerping `material.color` in place would
compound and walk every line into the background.

**Lens labels no longer have a cliff.** The old rule blanked every label above
150 nodes. Labels now show at every N and are thinned by screen-space
occupancy: a 46×14 px grid, first label into a cell wins, ascending `n` so the
smaller number survives a collision. Single-cell occupancy rather than a radius
scan — one Set lookup per node instead of a scan over everything already
placed. Measured at N=10000 / 7336 nodes: **1.93 ms per label pass, no
colliding pairs at any N tested.** Also switched from `getWorldPosition()` to
reading `mesh.position` directly; nodes are added straight to the scene with no
parent transform, so the values are identical but the getter forces a matrix
update per node, thousands of times a frame.

**Everything else.** Default morph speed 0.1 → 0.12, the keyframe dwell being a
fixed 2s timer and so unaffected. Colour drift no longer stops on pause — pause
holds the figure, but the colour cycle is what you are looking at when you stop
to look. Shape section removed (the transport replaced it) and the shape name
went with it. The Labels toggle and the renderer's whole 3D sprite-label path
are gone; the lens owns labelling. Primes' toggles moved into a collapsed
`Visibility` sub-section with Zero node and One node relocated above Parastichy
Lines, and Thickness under the lines it thickens. Info's panel section removed
via a new `hidden` flag on the module — it had to be an explicit opt-out rather
than "skip modules with no controls", because Lens is also controls-free and
earns its section from the hint. "Drift" relabelled "Rotation"; the internal
`autoRotate` / `driftSpeed` names are untouched.

**Physics works while paused** (added late, same batch). `onPointerDown` had a
`if (state.paused) return;` guard; the simulation loop never had one. So pause
left the nodes inert but still looking grabbable. Guard removed, and nothing
else needed to change: while paused the dimension is fixed, so
`interpolatedPos()` returns stable rest positions and the renderer's
`dim !== lastDim` guard skips its own writes — physics owns the meshes more
cleanly paused than running.

That exposed a second bug directly in its way. **`info.js` cleared `paused`
unconditionally when its tooltip closed.** It set `paused = true` on show and
`false` on hide, so pausing deliberately and then right-clicking a node to read
it resumed the animation the instant you let go — the pause was spent by the act
of inspecting something. Invisible while nothing else happened during a pause;
not invisible now that the figure is draggable there. It now records `paused`
on the transition into visible and restores that value on hide.

**A testing note, because it cost time.** Driving synthetic `PointerEvent`s at
the canvas has two traps. OrbitControls is constructed before the modules, so
its listener runs first and throws `NotFoundError` from `setPointerCapture` on a
`pointerId` that was never real — noise, not a fault, and it does not stop the
module handlers. Worse, reusing the same node across trials silently
invalidates the second one: the first drag leaves the node displaced and, with
the render loop suspended, it never springs back, so the next trial projects a
stale screen position and the raycast misses. Use a fresh node per trial and a
reloaded page, or the result is a false negative.

**Morph is a control again**, in Effects, default on. `shapeDrift` has existed
since v0.10.1 with no UI — rev 6 removed the Morph toggle and declared the flag
"effectively constant". Nothing else had to change for the requested behaviour:
the morph is the only motion gated on `shapeDrift`, and pulses, colour drift
and rotation are gated on `paused` alone, so Play with Morph off animates
everything except the shape. No speed slider; morph speed lives on the
transport handle. Also renamed Pulse → Node Pulse to pair with Line Pulse.

**Dazzle** — a second corner button below Reset, opening on the disk seen from
overhead with every prime lit, N=1000, node size 2, morph off and everything
else running. It is Reset with a different normal, and it is implemented that
way: `applyDazzle()` calls `resetToDefaults()` and then states only its
differences. A second exhaustive list of control writes would drift out of step
with the first the moment either changed, and Reset is the one function here
that cannot afford to be almost right. `scheduleRebuild()` being debounced
means the reset's queued rebuild is replaced rather than run twice.

Two things it has to do that are easy to miss: expand the prime grid, because a
prime selected but hidden colours the figure with no way to see or unset it
(the same rule the All button follows); and set `nodeSizeUserSet` *before*
`updateN()`, or the auto-size curve claims the value back and picks 0.4 for
N=1000.

New `setCameraTopDown()` in the renderer. The Disk lies in the XZ plane, so
overhead is the one angle showing the phyllotaxis spiral whole. Distance is
derived from the aspect rather than fixed — the camera declares a *vertical*
FOV, so on a portrait phone the horizontal is the tighter constraint and a
distance framing the disk on a desktop crops it badly. Position is
`(0, d, d*0.0015)` rather than `(0, d, 0)`: a view direction parallel to the up
vector is degenerate, and OrbitControls' azimuth goes undefined so the first
drag snaps the camera somewhere arbitrary.

**The daisy is drawn, not typed.** The request was for a daisy emoji styled to
match the Reset. Those two cannot both hold: 🌼 carries emoji presentation, so
Android substitutes its own colour glyph and ignores `color` outright — exactly
how the transport buttons ended up orange in rev 7. It is eight inline-SVG
petals in `currentColor`, which gets the daisy *and* the subtlety. Third time
this trap has come up in this project; the rule is simply never to type an icon.

Corner Reset brightened 20%, `--text-faint` 0.25 → a new `--text-corner` 0.3.
Its own variable rather than a bump to `--text-faint`, which also dresses the
panel's Reset and the module buttons — those sit on the panel's solid backdrop
and are legible already. **Note:** `#lens-handle` was deliberately matched to
`#corner-reset` and still reads `--text-faint`, so the two now differ slightly.
Left as-is because only the Reset was reported as hard to see.

**One structural change worth knowing.** Removing the Shape section removed the
`#dimension` slider, which the transport had been scrubbing by writing to and
firing its `input` event. Rather than leave a hidden input behind as a message
bus nobody could find, the keyframe-stickiness rule is now
`panel.setDimension()` and the transport calls it directly. Still one
implementation of "the dimension changed"; the DOM is no longer in the middle
of it. `transport.js` now imports `panel.js` — no cycle, panel does not import
transport.

**Verified** at localhost against a clean `pnm-v0.14.0` cache: no console
errors, all eight panel sections correct, Reset clears all five previously
surviving hot keys, dimension returns 1.4 → 0, keyframe stickiness snaps
0.4915 → 0.5, physics re-checks and re-enables on the way back under the cap,
node drag grabs while paused, and a deliberate pause survives a right-click
tooltip while a running scene still resumes after one.
**Not verified:** anything needing the render loop. The browser pane must be
visible to composite frames, so `requestAnimationFrame` is suspended and the
morph, the line fade, and colour-drift-while-paused cannot be observed here —
same tooling limit as §7. Those four need a real browser.

**2026-08-06 rev 9** — v0.13.0. Lens refinements, all from device feedback.

- **Handle moved to the top left** and restyled to match the corner Reset:
  transparent, faint border, `--text-faint`. It sits below the Reset's row on
  purpose — dragged nearly fully open the handle reaches the right-hand side,
  and at the same height the two controls would collide.
- **Physics stands down whenever the lens is open.** Under the classroom layer
  a tap means "explain this number", and flinging nodes out of position would
  contradict the labels pinned beside them. Physics settles back to true
  positions once on open, then ignores input until the lens closes. Wired
  through a published `state.lensOpen` flag so neither module imports the
  other.
- **Chalkboard retextured.** The first attempt used repeating linear gradients
  at fixed angles; those cross into a regular weave and read as stitched
  fabric, which is what the owner saw. Grain is now fractal noise from an
  inline SVG turbulence filter — no repeating structure, so it reads as slate
  tooth — over broad cloudy smears and a faint vignette. Data URI, so still
  nothing fetched and still offline-clean.

Bug found while testing: the lens measured itself against the **canvas** rect.
The canvas is sized by the renderer and can lag its own box — it reports 0x0
until the first resize callback lands — and a zero width collapsed every
calculation: the handle pinned to 0 while the lens reported itself fully open.
It now measures the `#viewport` element and uses the canvas only as an event
target.

**2026-08-06 rev 8** — v0.12.1. **The lens ships.**

`modules/lens.js` — a classroom layer dragged across the figure by a tab on
the left edge of the viewport. Left of the handle is chalkboard with every
node labelled and tappable for its maths; right of it is the plain view. Both
visible at once, hard edge between them.

The governing constraint was the owner's: the figure must not be disturbed —
smooth and visible throughout. That ruled out the obvious implementations:

- **Chalkboard** is a DOM layer over the canvas using `mix-blend-mode:
  lighten`. The background is near-black and the content is bright, so lighten
  takes the board where the scene is darker and the scene where it is
  brighter. The board replaces the background and leaves every node untouched,
  with no renderer involvement at all. Texture is CSS — no asset loaded, still
  zero external requests.
- **Labels** are HTML projected from 3D each frame. The existing `showLabels`
  flag is not in `HOT_KEYS`, so toggling it rebuilds the whole scene —
  precisely the disturbance being avoided. Above 150 nodes labels are
  suppressed; they are unreadable at that density and the DOM cost is real.
- **Tap-for-info** calls a new `showInfoAt()` / `hideInfo()` exported from
  `info.js` rather than reimplementing hit-testing or tooltip content. That
  module already raycast nodes *and* curves; it was simply unreachable on a
  phone, being bound to right-click.

Three bugs found building it, all worth remembering:

1. **`destroy()` is not a teardown hook.** `cleanup()` calls every module's
   `destroy()` before *every* scene rebuild. The lens removed its DOM there,
   so the feature deleted itself on the first rebuild after boot. A module's
   `destroy()` must release per-scene state only.
2. **`cache.addAll()` may satisfy itself from the browser's HTTP cache.** A
   freshly bumped `CACHE_VERSION` served a module missing an export that had
   already shipped — the new cache filled with old files, which is the exact
   failure the version bump exists to prevent. Now precaches with
   `new Request(url, { cache: 'reload' })`.
3. **A sticky tooltip never got dismissed.** Opting out of `info.js`'s
   release-to-hide meant it survived every later tap. Any canvas press now
   dismisses first, then re-shows only if the tap landed inside the lens.

Open: `lens.init()` was observed running twice per load while `info.init()`
ran once. Cause not identified. `buildDom()` is idempotent and the listener is
removed before being added, so it is harmless — but it is not understood, and
something in the module registry may be calling init more than once.

Also fixed: the transport icons rendered **orange on Android**. Not a colour
choice — U+23F8 and U+25B6 carry emoji presentation, so the platform
substituted its own glyph and ignored `color`. Icons are CSS shapes now, and
the corner Reset uses inline SVG for the same reason.

**2026-08-06 rev 7** — v0.11.0. **The site is live.**

https://schuckdata.com/pretty-number-machine/ — HTTPS enforced, service worker
active and correctly scoped to the subdirectory, 24 files precached, manifest
served as `application/manifest+json`, no console errors. GitHub Pages sat in a
multi-hour Actions/Pages outage before this; the first two builds errored and
one queued job was cancelled after 8 minutes without ever running. Nothing was
wrong with the repo. `.nojekyll` was added along the way and is worth keeping —
this is a static app with no Liquid, no front matter, and nothing to gain from
the Jekyll pass.

Also in this rev:
- **Default shape is now `Line` (dimension 0)** rather than `Disk` (0.5), so
  the app opens on a straight row of nodes with the parastichy curves arcing
  off to the right, and the morph travels rightward from there.
- **Morph speed came back, on the handle's vertical axis.** Lift the play
  button to speed the morph up, drop it to slow down; the handle rests higher
  or lower to show the current pace. Bounds are the old speed slider's
  (0.05–2.0), mapped logarithmically — linearly, the useful slow end would be
  crushed into the bottom eighth of the travel. Removing the speed slider in
  rev 6 cost nothing after all; the control just moved onto the thing it
  controls.
- The drag **locks to one axis** on first movement. Horizontal scrubs and
  pauses; vertical changes speed and deliberately does not pause, so you can
  watch the pace change while it runs. Letting both run at once meant every
  scrub nudged the speed and every speed change nudged the shape.
- **Corner Reset**, top right, faint. Shares one `resetToDefaults()` with the
  panel's own Reset rather than duplicating it. Icon is inline SVG.

Fixed: the transport icons were **orange on Android**, reported as an
aesthetic clash. It was not a colour choice — U+23F8 and U+25B6 carry emoji
presentation, so Android substituted its own colour glyph and ignored `color`
entirely. Icons are now CSS shapes. Worth remembering for any future icon.

**2026-08-06 rev 6** — v0.10.1. Morph controls replaced by a transport bar.

The Morph toggle and its speed slider are gone. In their place, a bar along
the bottom whose play/pause button **is** the slider handle: it rides the
track as the shape morphs, and dragging it scrubs the shape by hand. On a
phone it shares the bottom row with the drawer button, which moved right to
make room.

State model changed to suit:
- `shapeDrift` now defaults **true** and is effectively constant — morphing is
  the app's resting state rather than an opt-in. `paused` is what the button
  controls, and it freezes everything: morph, rotation, pulse, colour drift.
- `paused` added to `HOT_KEYS`. It was reachable through `update()` but absent
  from that set, so toggling it would have triggered a full scene rebuild for
  a flag the render loop reads every frame anyway.
- Manual dimension changes now set `paused` instead of clearing `shapeDrift`.
  Under the old model, scrubbing disabled morphing outright and Play afterwards
  did nothing.
- The idle timer that switched morphing on after 3s of quiet is deleted. It
  existed because morphing had no visible control; it has one now.

Costs, accepted deliberately:
- Morph **speed** is no longer adjustable — fixed at the old default of 0.1.
  That is the price of removing the slider.

Notes:
- `state.paused` had existed since before this session with no UI attached to
  it. This is the first thing that switches it on.
- Scrubbing writes to the existing `#dimension` slider and dispatches its
  `input` event rather than reimplementing the logic, so keyframe stickiness,
  the shape label, and the pause-on-manual-change rule all still live in one
  place in `panel.js`.
- The handle's position is polled from `state.dimension` each frame. While
  morphing, the renderer mutates that value directly without going through
  `update()`, so there is no event to subscribe to.

**2026-08-06 rev 5** — v0.9.0. Second round of device feedback, five requests.

- **Drawer handle** is now a wide accent pill riding the sheet's top edge:
  at the bottom of the screen when the sheet is away, lifted above it when
  open. Reads as a handle rather than a stray button and stays in the thumb's
  arc either way.
- **Drag to resize** the view/drawer split, in a new `core/sheet.js`. It owns
  where the sheet sits, not what is in it — `panel.js` is coupled to the
  markup tightly enough already. Bounds 25–85% of screen height. Everything
  hangs off the single `--sheet-h` property, so the sheet edge and the
  viewport edge cannot drift apart, and the renderer picks up the new size
  through its existing ResizeObserver with no wiring between the two.
- **Node size now scales with N** — `(30/N)^0.25`, clamped to 0.2–1.0, giving
  1.0 at N=30 and 0.2 at N=10000. Fixed nodes at high N overlapped into blobs
  and buried the parastichy lines. Touching the slider hands control to the
  user permanently; Reset hands it back.
- **Shape section** moved above Primes.
- **Prime grid expands in steps** — 11 / 18 / 25 / 32 primes, with All / None /
  More trailing the visible set and More becoming Less at full extent.

Decisions worth keeping:
- The grid offers 32 primes, not 33. Dropping 137 makes the expanded grid end
  exactly on All/None/Less instead of spilling one button onto a sixth row.
  `FIRST_PRIMES` itself is untouched — `info.js` derives prime ordinals from
  it by index, so truncating it would have silently broken the readout for
  137. The UI list is a slice, declared in `panel.js`.
- Row counts only work out exactly at seven-per-row, which is what a phone
  fits. A narrow desktop sidebar wraps differently; the step sizes stay
  sensible, the row arithmetic just stops being exact.
- Less can never hide a selected prime. It collapses to the smallest step that
  still shows everything active, because a prime switched on but invisible
  would affect the render with no way to see or unset it. All expands for the
  same reason.

**2026-08-06 rev 4b** — v0.8.1. First real-device feedback, on a Pixel 9
served over LAN. Two faults that every synthetic check had passed:

- The viewport ran full-bleed with the sheet floating over it, so the
  visualisation sat *behind* the controls — black top half, object hidden.
  Every measurement said the layout was correct, because it was: the geometry
  was right and the composition was wrong. The viewport now ends where the
  sheet begins (`--sheet-h`, one value shared by both) and reclaims the screen
  when the sheet is dismissed.
- The sheet opened by default, so a phone user landed on a wall of controls
  instead of the thing the app is for. It now starts collapsed below 640px,
  set before the renderer initialises so the scene is never sized to the wrong
  box.

Worth keeping: measuring geometry does not test composition. "Nothing
overlaps" and "you can see the point of the app" are different claims, and
only the second one matters.

**2026-08-06 rev 4** — Burst 2 shipped. v0.7.0 → v0.8.0.

Built while GitHub Pages was down in an outage, so nothing here is verified on
a device yet.

Shipped:
- Below 640px the panel is a bottom sheet: full width, 58vh, rounded top,
  slides down out of frame when dismissed. Viewport goes full-bleed behind it.
  Toggle relocates to the top-right, clear of both the sheet and the status
  bar, and its arrow flips to ▾/▴ via CSS so the inline handler stays untouched.
- Safe-area insets on the sheet's padding and the toggle's position.
- All 8 `:hover` rules moved into a single `@media (hover: hover)` block.
- Touch targets ≥44px under `@media (pointer: coarse)` — keyed on pointer
  type, not width, so a narrow desktop window keeps its mouse-sized controls
  and a tablet gets thumb-sized ones. Form fields go to 16px to stop iOS
  zooming on focus.
- N ceilings unified in `state.js` as `MAX_N` / `SLIDER_MAX_N` / `AUTO_N_MAX`.

Discovered:
- The "three conflicting N ceilings" were two ceilings and one corpse.
  `DEFAULT_CONFIG.maxN = 50000` was read by nothing. `MAX_N` (10000) and
  `SLIDER_MAX_N` (2500) differ deliberately — slider precision would be
  useless spanning 10000.
- The genuine bug underneath: above 2500 the slider parked at its maximum and
  silently misreported N, then yanked N down to 2500 on the next nudge. It is
  now disabled and dimmed above the slider range, with a tooltip.
- Reset sets the N slider by hand and never calls `updateN()`, so it needed
  the new out-of-range styling cleared explicitly or a reset from N=5000 left
  a dead grey slider.
- **The service worker makes local iteration lie.** Navigations are
  network-first so `index.html` looked fresh, but `core/*.js` are subresources
  and came cache-first — an entire round of N-ceiling testing ran against
  v0.7.0's JavaScript and reported a fix as broken. Bump `CACHE_VERSION`
  before testing, every time.

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
7. ~~**Reset does not update `selectedPrimes`.**~~ **Stale — already fixed.**
   `resetToDefaults()` calls `updateSelectedPrimes()`, which rebuilds the array
   from the repainted grid. Confirmed in rev 10 while chasing the *real* Reset
   bug, which was a different thing entirely: the hot keys were never written
   to state at all. See rev 10.
8. **The gate has no instrument.** §4 says no data collection, ever. The GATE
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
| Live over HTTPS with correct MIME types | ✅ | manifest as application/manifest+json; http 301s to https |
| Service worker active on the real origin | ✅ | Scope /pretty-number-machine/, 24 files precached |
| Installs to Android home screen | ⏳ | URL now exists; awaiting the owner's device |
| Works in airplane mode on device | ⏳ | Same |
| Lighthouse PWA checks | ❌ | Not yet run |
| Bottom sheet geometry below 640px | ✅ | Open y=384 h=531 w=412; closed y=915 = exactly offscreen |
| Viewport full-bleed behind sheet | ✅ | x=0, matches innerWidth/innerHeight |
| Desktop layout unregressed | ✅ | 280px sidebar, viewport x=280, 69 controls, no errors |
| Hover rules mouse-only | ✅ | All 8 inside `(hover: hover)`; zero outside |
| Touch targets ≥ 44px | ⚠️ | Rules verified in the CSSOM; `pointer: coarse` cannot be emulated here |
| N ceiling behaviour | ✅ | 5000 disables slider, 99999 clamps to 10000, reset clears state |
| One-handed usability | ❌ | Needs a thumb on a real phone |

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
- **The service worker will serve you stale JavaScript while you develop.**
  Navigations are network-first so `index.html` looks fresh, but everything
  under `core/` and `modules/` is cache-first. Bump `CACHE_VERSION` before
  testing a change or you will debug code that is not running.
- **CSS transitions freeze in a non-compositing browser pane.** A transitioned
  property reports its *start* value forever, so `transform` reads as identity
  and a working slide-out looks broken. Set `transition: none` before
  measuring.
