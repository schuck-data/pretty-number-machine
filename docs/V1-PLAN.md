# v1.0.0 Plan — Pretty Number Machine

> **Start at [`HANDOFF.md`](HANDOFF.md).** It is newer than this document and
> states the current position. Every work item below is now closed; this file is history —
> read it for *why* each v1 change was made, and which performance claims were
> measured rather than judged.

**For:** whoever builds v1.0.0.
**Read `PLAN.md` for the charter, `PLAY-STORE-HANDOFF.md` for publishing.** This
document covers the v1.0.0 rebuild only.

**Status:** 2026-08-10, `v1.0.0-dev.7`. **Feature-complete.** Every work item is
implemented and verified in `v1/`, except instancing, which is deliberately
deferred to v1.1 with reasons in §2 and §3.

**Next is not more code — it is §4 promotion**, then the bundle and an internal
test track. The remaining unknowns are all about publishing, not the app. The shipped build is
untouched apart from the service-worker exclusion (§1c) and the lens-handle fix.

**Item 2 has a consequence worth reading before judging the app:** the dwell and
morph speed tuned on 2026-08-10 were judged against a frame count on a 120Hz
screen. Now that the clock is honest they will feel roughly half as fast. That is
the fix working, not a regression — but the numbers want re-judging by eye.

---

## 0. Why a rebuild at all

The app is well factored — `math.js` is pure functions with no Three.js
dependency, `positions.js` owns interpolation and nothing else, `sheet.js`
refuses to know what is in the panel, and the module registry isolates a
crashing module rather than taking the app down with it.

What it has never been is *an app*. Every problem in §2 is a problem of
environments it has not run in: a phone that reclaims the GL context, a 120 Hz
display, a GPU that cares about draw calls. None of them are visible on a
desktop or flattering Pixel 9.

---

## 1. The arrangement

### 1a. Two builds, one origin

| Path | Build | Purpose |
|---|---|---|
| `/pretty-number-machine/` | shipped, v0.14.5 | Stays live. Untouched during v1 work |
| `/pretty-number-machine/v1/` | v1.0.0-dev | Where all v1 work happens |

The app is **fully relocatable** — every path relative, `manifest.webmanifest`
uses `"start_url": "./"` and `"scope": "./"`, the importmap is relative. So
`v1/` is a plain copy with no edits, and that is not luck: `sw.js` says the
relative paths were deliberate.

`v1/index.html` carries `robots: noindex, nofollow`. A second public copy of the
app is duplicate content, and after §4 it is a dead end.

### 1b. Why a staging path was worth it

Not mainly for rollback — `git revert` on the canonical path already does that,
and the worker's one-generation-at-a-time design gives a revert window of about
one app lifecycle (`PLAY-STORE-HANDOFF.md` §8).

It is worth it because **work item 6 needs a real HTTPS URL on a real handset.**
Low-end performance has never been measured. localhost cannot measure it.

### 1c. Two traps, both already sprung elsewhere today

**The shipped worker would have shadowed `/v1/`.** A worker's scope is the
folder it lives in, so `./v1/` sits inside it, and its navigation branch answers
the cached shell for everything in scope. First visit to `/v1/` would have
served the *old app*. Same bug as `privacy.html`, third occurrence in one day.

Fixed by a bail-out in the shipped `sw.js` covering the whole subtree —
navigations *and* assets. Assets matter too: a `/v1/` URL would miss in the old
cache, fall through to the network, and be runtime-cached into the **old**
generation, filling one build's cache with another build's files. The prefix is
derived from `self.location`, so it survives relocation.

**Cache namespaces would have collided.** Two builds now share one Cache
Storage. The activate handler read "every cache that is not mine" as "every
cache that is stale" — true for one build, false for two. Each worker now only
manages caches carrying its own `CACHE_PREFIX`:

| Build | `CACHE_PREFIX` | `CACHE_VERSION` |
|---|---|---|
| shipped | `pnm-` | `pnm-v0.14.5` |
| v1 | `pnmv1-` | `pnmv1-v1.0.0-dev.3` |

The trailing hyphen is what keeps them disjoint — `pnmv1-…` does not start with
`pnm-`. Deliberate, not luck. Do not drop it.

**Verified 2026-08-10, not assumed:** `/v1/` is controlled by `/v1/sw.js`, both
caches survive side by side at 25 entries each, neither is polluted with the
other's files, and the shipped build still passes Dazzle, Reset and the privacy
policy URL.

---

## 2. Work items

Gate on 1–6. 7–9 are cheap and ride along. 10 is process.

| # | Item | Why | Status |
|---|---|---|---|
| 1 | **WebGL context-loss recovery** | `webglcontextlost` appears **zero** times. Android reclaims GL contexts when backgrounded or under memory pressure; the canvas goes permanently black. Invisible on desktop, invisible on a Pixel 9, fatal on a cheap phone. For a paid app that is a refund |☑ **done** (dev.3) |
| 2 | **Wall-clock timing** | `renderer.js` uses a hardcoded `const dt = 1 / 60`. Dwell and morph speed are counted in *frames*, so the "3s" dwell is ~1.5s at 120 Hz and ~6s at 30 fps. The pulse effects already use `performance.now()`, so the two systems disagree with each other today |☑ **done** (dev.3) |
| 3 | **Cheaper material** ✅ / **`InstancedMesh`** ⏸ | Nodes are now `MeshLambertMaterial`; the PBR shading was cost with no visible benefit at this size. **Instancing deliberately deferred to v1.1.** It is not a renderer change — `nd.mesh` is consumed by physics.js (which writes positions), info.js and physics.js (both raycast the mesh array) and lens.js, so it is an API migration across four files. Now measured: **1002 draw calls at N=1000, one per node.** That is the number instancing would collapse | ☑ **part done** (dev.7) |
| 4 | **Cap pixel ratio at 2** | `setPixelRatio(devicePixelRatio)` uncapped. A 3× phone renders 9× the fragments on top of item 3 |☑ **done** (dev.3) |
| 5 | **Update prompt** | An installed TWA has no refresh button. Since v0.14.4 a browser needs one refresh, but an app left open may never navigate at all. `PLAN.md` §6 item 6 |☑ **done** (dev.5) |
| 6 | **FPS counter behind a debug flag** | `?debug`. Reports fps, frame ms, p95, **draw calls**, triangles, nodes, N, dpr. The draw-call figure is the one that matters — it turned the central performance argument from inference into measurement on first run | ☑ **done** (dev.7) |
| 7 | **`lang`, reduced motion, meta CSP** | `<html>` has no `lang`. `prefers-reduced-motion` appears zero times in an app that morphs, pulses and rotates continuously. No CSP — Pages cannot set headers but `<meta http-equiv>` works |☑ **done** (dev.3) |
| 8 | **Error boundary** | Modules are isolated; a renderer failure is a blank screen with no message |☑ **done** (dev.5) |
| 9 | **Scratch-buffer the position hot path** | *The premise was half wrong.* The `Vector3` churn was real but secondary: `getShapes()` rebuilt **and re-sorted** its array on every call, once per node per frame — a thousand arrays and a thousand sorts per frame at N=1000, for an identical six-entry list. Now cached. The out-vector is opt-in because physics.js legitimately holds two results at once |☑ **done** (dev.5) |
| 10 | **Smoke test + `CACHE_VERSION` CI check** | There are no tests, no CI, no linting. Two real bugs today were caught only by manual browser testing, and `CACHE_VERSION` discipline had three near-misses |☑ **done** (dev.5) |

**Explicitly not in v1.0.0:** panel/renderer refactors, declarative controls,
analytics. `panel.js` (800 lines) and `renderer.js` (1000) are heavy and `state`
is a mutable global with `HOT_KEYS` as an unenforced contract — all true, none
of it a reason to delay shipping.

---

## 3. Honesty about the performance numbers

Item 9 was measured. **Items 3 and 4 were not.**

The allocation benchmark is real: 12× slower than a scratch buffer. But 0.063
ms/frame on a desktop CPU **is not the bottleneck**, and saying otherwise would
be dressing up a guess. Its real cost is GC pressure showing up as jank spikes,
which that benchmark does not capture.

The draw-call argument for item 3 is **no longer unmeasured**. The HUD from item
6 reports, on first run:

| State | Draw calls | Nodes | Triangles |
|---|---|---|---|
| Default | 25 | 24 | 13,798 |
| Dazzle | **1002** | 1001 | 254,038 |

Exactly one draw call per node, as argued. The mechanism is now confirmed; what
remains unknown is how much a given phone cares.

Frame timings still cannot be taken here. The HUD reported 113.3 ms in both the
24-node and the 1001-node case — identical cost across a fortyfold difference in
work, which measures the browser pane's throttle rather than the app.

`PLAY-STORE-HANDOFF.md` §8's "never measured on anything but a Pixel 9" is
**still true, and will remain true through v1.0.0.**

**Decided 2026-08-10: no low-end device is available, so items 1, 3 and 4 are
built on educated judgement.** That is a legitimate call — the reasoning is
strong and the changes are standard practice for shipped WebGL — but it is not
the same thing as knowing, and the difference should not quietly evaporate
between here and the store listing.

What the judgement rests on, stated so it can be argued with later:

- **Item 3 (instancing).** ~1000 draw calls with a unique `MeshStandardMaterial`
  each. Mobile GPUs are draw-call bound far more than fragment bound, and PBR
  shading for flat-coloured spheres buys nothing. Low confidence in the *size*
  of the win, high confidence in its *direction*.
- **Item 4 (pixel ratio cap).** Capping at 2 is near-universal in shipped WebGL.
  On a 3× display it removes ~55% of fragments for a difference most people
  cannot see. This is the safest bet on the list.
- **Item 1 (context loss).** Not a performance guess at all. Android reclaims GL
  contexts; without a handler the canvas stays black permanently. The only
  uncertainty is *how often*, not *whether*.

**Do not let this become a claim that v1.0.0 is fast on low-end hardware.** It
is a claim that v1.0.0 removes the three things most likely to make it slow.
First run on a cheap handset is still a genuine unknown, and the FPS counter
exists so that run produces a number instead of an impression.

---

## 4. Promotion

`/v1/` is a staging area, not the destination.

`start_url` is compiled into the Android manifest at bundle time. Build the
bundle while v1 lives at `/v1/` and the shipped app loads a URL called "v1"
**forever** — changing it later means a new bundle upload, and the name goes
stale the moment v1.1 exists.

So: **build at `/v1/` → verify on real devices → promote onto the canonical path
→ then generate the bundle.** Never the other order.

The old build stays live at a frozen path afterwards, by decision on
2026-08-10. Note what that does and does not buy: installed apps point at the
canonical URL, so a parked old copy helps *comparison*, not users. Users are
protected by `git revert` and the worker's revert window.

---

## 5. Decided and permanent

Both already baked into published artefacts:

- **Package name `com.schuckdata.pnm`** — in the live `assetlinks.json`
- **Paid at $0.99, web version stays free** — free → paid is a one-way door

See `PLAY-STORE-HANDOFF.md` §3.

---

## 6. Unknowns

- **Low-end performance**, still (§3).
- **Whether item 3 is worth its risk.** Instancing rewrites per-node colour, the
  pulse, colour drift and the glow sprites at once — the most delicate part of
  the renderer. Approved on 2026-08-10 with that understood.
- **How the retune lands.** After item 2 the dwell and speed numbers change
  meaning. They were tuned against a frame count and will need re-judging by
  eye, not arithmetic.
- **Nothing in §2 has been executed.** Every row is written from reading the
  code, not from having changed it.
