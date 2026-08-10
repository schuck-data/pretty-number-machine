# v1.0.0 Plan — Pretty Number Machine

**For:** whoever builds v1.0.0.
**Read `PLAN.md` for the charter, `PLAY-STORE-HANDOFF.md` for publishing.** This
document covers the v1.0.0 rebuild only.

**Status:** 2026-08-10. Scaffold built and verified. **No work item below has
been implemented yet.** The shipped build is untouched apart from one
service-worker exclusion (§1c).

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
| `/pretty-number-machine/` | shipped, v0.14.4 | Stays live. Untouched during v1 work |
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
| shipped | `pnm-` | `pnm-v0.14.4` |
| v1 | `pnmv1-` | `pnmv1-v1.0.0-dev.1` |

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
| 1 | **WebGL context-loss recovery** | `webglcontextlost` appears **zero** times. Android reclaims GL contexts when backgrounded or under memory pressure; the canvas goes permanently black. Invisible on desktop, invisible on a Pixel 9, fatal on a cheap phone. For a paid app that is a refund | ☐ |
| 2 | **Wall-clock timing** | `renderer.js` uses a hardcoded `const dt = 1 / 60`. Dwell and morph speed are counted in *frames*, so the "3s" dwell is ~1.5s at 120 Hz and ~6s at 30 fps. The pulse effects already use `performance.now()`, so the two systems disagree with each other today | ☐ |
| 3 | **`InstancedMesh` + cheaper material** | Geometry is shared but every node gets its own `MeshStandardMaterial` — full PBR, ~1000 draw calls, no batching. Mobile GPUs struggle in the low hundreds. This is the real ceiling on `MAX_N`, and Dazzle is a one-tap path to it | ☐ |
| 4 | **Cap pixel ratio at 2** | `setPixelRatio(devicePixelRatio)` uncapped. A 3× phone renders 9× the fragments on top of item 3 | ☐ |
| 5 | **Update prompt** | An installed TWA has no refresh button. Since v0.14.4 a browser needs one refresh, but an app left open may never navigate at all. `PLAN.md` §6 item 6 | ☐ |
| 6 | **Measure on a low-end device** | FPS counter behind a debug flag, then actual numbers. Everything above is a hypothesis until this exists | ☐ |
| 7 | **`lang`, reduced motion, meta CSP** | `<html>` has no `lang`. `prefers-reduced-motion` appears zero times in an app that morphs, pulses and rotates continuously. No CSP — Pages cannot set headers but `<meta http-equiv>` works | ☐ |
| 8 | **Error boundary** | Modules are isolated; a renderer failure is a blank screen with no message | ☐ |
| 9 | **Scratch-buffer the position hot path** | `interpolatedPos` allocates three `Vector3`s per node per frame — 180,000 objects/second at N=1000. Benchmarked at **0.063 ms/frame vs 0.005 scratch**, 12× — real, but see §3 | ☐ |
| 10 | **Smoke test + `CACHE_VERSION` CI check** | There are no tests, no CI, no linting. Two real bugs today were caught only by manual browser testing, and `CACHE_VERSION` discipline had three near-misses | ☐ |

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

The draw-call argument for item 3 is sound but **unmeasured**. Frame rates could
not be sampled here at all: the browser pane does not composite, so
`requestAnimationFrame` is throttled and sampling times out.

`PLAY-STORE-HANDOFF.md` §8's "never measured on anything but a Pixel 9" is
**still true**. That is what item 6 is for, and it should come early enough to
falsify items 3 and 4 rather than merely confirm them.

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
