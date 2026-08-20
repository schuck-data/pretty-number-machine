# Handoff — Pretty Number Machine

**Start here.** This is the entry point and the authoritative statement of where
things stand. `ANDROID-BUILD.md` is the plan for the work ahead; the other
documents are history, and Appendix B says which parts of each are still true.

**Written:** 2026-08-15, revised the same day when the scaffold spike landed.
**The web app is feature-complete, and it now also builds and runs as an Android
app. The work ahead is turning that into a Play Store game — see
`ANDROID-BUILD.md`.**

---

## 0. Where things actually are

### The app, as it exists today

A static, no-build-step web app: native ES modules, vendored three.js, event bus
and module registry in `core/state.js`, feature modules crash-isolated. Two
copies are live at schuckdata.com:

| Path | Version | Role |
|---|---|---|
| `schuckdata.com/pretty-number-machine/` | `v0.14.5` | The **shipped** web build. Public, indexed. Frozen apart from live defect fixes |
| `schuckdata.com/pretty-number-machine/v1/` | `v1.0.0-dev.7` | The **v1 build**, feature-complete. `noindex`. This is the code the Android app is built from |

They are independent applications sharing an origin: separate service workers,
scopes and cache namespaces (`pnm-` and `pnmv1-`). Append `?debug` to either
URL for a HUD (fps, frame time, p95, draw calls, triangles, node count, dpr).

### The Android shell — and which copy is alive

Since 2026-08-15 the repo also holds a **Capacitor 8 Android project** in
`android/`, with `package.json` and `capacitor.config.json` at the root. Its
`webDir` points at **`www/`**, a third copy of the web code that belongs to the
app alone.

**`www/` is the living codebase.** All new work goes there. `v1/` and the
shipped root build are now frozen web artifacts: they keep their service
workers, they stay live at schuckdata.com, and they do not receive features or
fixes unless something is broken for a real visitor. The Constants section and
the DEV/EDU comment layers exist only in `www/`, and that asymmetry is
deliberate — do not "sync" them back.

Building needs a toolchain that is **not** the obvious one; `ANDROID-BUILD.md`
§5 lists it, and §9 says why. Read §9 before debugging anything that looks like
a build not taking effect.

Note that the repo root is the published GitHub Pages site, so `android/`'s 53
committed files are served from schuckdata.com. Harmless — no secrets are in
them, and the keystore is gitignored and will never be committed — but it is a
consequence worth knowing about, and it interacts with the open decision about
the web copy's fate (`ANDROID-BUILD.md` §7).

**The web copies are not part of the Android build.** Whether v1 is ever
promoted onto the canonical web path, or the web copies come down, is a website
decision that nothing in `ANDROID-BUILD.md` depends on (see §3).

### The plan

PNM becomes a **Capacitor** app: the v1 web code, bundled unchanged inside a
native Android shell that this repo owns, published free on Google Play as a
**Game → Educational**, with **Play Games Services achievements** (the
achievement-hunter surface) and **one $0.99 in-app product** that turns the
bundled satirical fake ads on. No server, no accounts, no external requests.
iOS is a later second shell on the same code.

The earlier plan — a Trusted Web Activity built with Bubblewrap, sold as a
$0.99 paid app — is **abandoned**. Play Games Services has no web-side API any
more, so a TWA cannot publish achievements without a hand-built native bridge,
and once a native shell exists Capacitor is the standard way to have one.
`ANDROID-BUILD.md` §1 has the goals-to-constraints reasoning.

### Play Console

- **Organisation account created** under `dakota@schuckdata.com` (Workspace
  identity, administered from `ds89holdco@gmail.com`).
- **D-U-N-S issued** 2026-08-10.
- **Identity verification was in progress** as of 2026-08-10, documents uploaded.
  **Check the console for its current state before assuming anything.** Phone
  verification is gated behind identity and organisation verification.
- Nothing has been uploaded. No app record exists yet.

### What is live on the web

- `privacy.html` at `…/pretty-number-machine/privacy.html`, zero external requests
- `https://schuckdata.com/.well-known/assetlinks.json` — served by the
  `schuck-data.github.io` repo for the abandoned TWA. **Removed from that repo
  on 2026-08-15**; it disappears from the live site on the next push there.
  Nothing needs it

---

## 1. The next action

**`ANDROID-BUILD.md` §5 step 4 — Play Games Services.** Steps 1, 2 and 3 are
done; step 3 landed 2026-08-20 along with the achievement design it depended on.

Step 4 means choosing a PGS plugin (§4 lists candidates and the escape hatch),
then filling in `getGamesPlugin()` in `www/platform/index.js` and pasting the
console-issued ids into the `STORE_IDS` map there. Nothing else in the app
should need to change: everything already runs against the adapter, and the
in-memory fallback keeps a browser working.

**The achievement design is settled** — 40 of them, 1,800 of the 2,000 XP with
200 held back, recorded in `docs/achievements-design.xlsx`. The Play Console
still has to be told about them, which is §6 and Dakota's.

**Work done after step 2, all on `capacitor-spike` and all in `www/` only.**
The branch has moved on since the strip, and none of it is part of the numbered
plan — it came from using the app on a phone and fixing what was wrong:

- A **Constants** panel section exposing the phyllotaxis divergence angle: a
  slider over a full turn, tap to restore the exact golden angle, and an
  optional sweep whose floor is one turn per ~1000 minutes
- The **morph order reordered** for a tall screen — `Spring · String · Chord ·
  Sphere · Disk`, opening on String and climbing. **Line is deregistered**, not
  deleted; it suits landscape and may come back for it
- **DEV/EDU comment layers** through `www/` — see `CODE-NOTES.md`
- The **launcher icon**, which had been shipping as Capacitor's placeholder
- An **inertia slider** in Physics; Dazzle now runs the sweep and disables
  physics; landscape made safe-area aware
- A real bug fixed: sliders were **stealing scroll gestures** on touch

**Settled 2026-08-20: the performance measurement.** Taken on the Pixel 7 over
`chrome://inspect`. §5 below has the numbers. Short version: the app is pinned
to the display's 90 Hz refresh everywhere below N=2500, and only N=10000 costs
anything real.

Everything after that is laid out in `ANDROID-BUILD.md` §5 (technical) and §6
(Play Console).

In parallel, and needing only Dakota:

- The two decisions in `ANDROID-BUILD.md` §7 that are Dakota's — **billing
  plugin** and **fate of the web copy**
- Play Console: verification state, second Admin user, merchant profile
- The **achievement list** — a design task with no dependencies

---

## 2. Decided — do not reopen

| Decision | Value | Notes |
|---|---|---|
| Package name | `com.schuckdata.pnm` | Becomes permanent at first upload to Play. Chosen; not yet locked |
| Distribution model | **Free**, one **$0.99 non-consumable** in-app product | An app ever offered free can never become paid. Free is the deliberate choice, so the one-way door is irrelevant — but it is a door |
| The product | Turns the bundled fake ads **on**. Off by default. Grants an achievement | The satire is the point. No ad SDK, no network, no consent framework, ever |
| Achievements | Local ledger is the source of truth; PGS is the public record and cross-device copy | Works offline and signed out. See `ANDROID-BUILD.md` §3 |
| Identity | Never build accounts. No server, no database | Play holds purchases, PGS holds achievements and saves. Referral/invite features were cut for exactly this reason |
| Listing category | Games → Educational | PGS requires a game; hunters find games |
| Shell | **Capacitor 8** | Targets API 36. Not TWA, not PWABuilder |
| Public address | The owner's home address | It is the business address; merchant accounts display it. Known and accepted |
| Web copy | Stays live, frozen, free | Decided 2026-08-10. Whether that still holds is Dakota's to revisit (`ANDROID-BUILD.md` §7); nothing in the build depends on it |

---

## 3. What only Dakota can do

- Anything with Dun & Bradstreet, including adding the **DBA as a trade style**,
  still outstanding and which nothing will ever remind you about
- Identity and business verification; second Admin user; merchant/payments
  profile; tax interview; payout account
- Choosing the billing plugin; deciding the web copy's fate
- Generating and safeguarding the upload keystore; anything involving
  credentials, keys or payment details
- Accepting Play policies and the developer agreement
- Device testing, screenshots, and judging how anything looks

---

## 4. Traps that have actually bitten

Not hypothetical. Each cost real time. The first four concern the **web
builds**, which stay live; the Capacitor app has no service worker and none of
that machinery — that is one of the reasons for it.

**Service worker scope, four times.** A worker answers navigations for its whole
folder. It swallowed `privacy.html`; it served a seeded stale cache; it would
have swallowed `/v1/`. Any new standalone page or subtree inside an app's scope
must be explicitly excluded, and nothing will warn you.

**`caches.match()` searches every cache, oldest first.** Every lookup is scoped
to the worker's own `CACHE_VERSION` for this reason.

**`CACHE_VERSION` discipline.** Change any precached file without bumping it and
clients stay on old code indefinitely. `tools/check.mjs` guards it — for the web
builds. In the Capacitor app the guard becomes version-name agreement instead.

**Testing update detection is recursive.** The page runs the *previously cached*
copy of the code that detects updates. Reload before concluding anything.

**A meta CSP can kill the app.** `script-src 'self'` blocked the inline importmap
and nothing ran. It needs `'unsafe-inline'`. Capacitor adds its own origin to
this list — see `ANDROID-BUILD.md` §2.

**Verify against a real HTTPS origin, localhost, or the device.** Plain HTTP to a
LAN IP is not a secure context. The Cowork browser pane never runs the render
loop, so nothing about animation or performance can be judged there.

**Certificates: app-signing, not upload.** The old asset-links fingerprint trap
returns in a new coat as the PGS Android credential's SHA-1. It comes from Play
Console after Play App Signing is on, not from the local keystore.

---

## 5. Still unknown

- ~~**Performance in Android System WebView.**~~ **MEASURED 2026-08-20**, on a
  Pixel 7 (panther), Android System WebView Chrome 150, 411x914 at dpr 2.625,
  debug APK. Method: `adb forward` to the WebView's DevTools socket, then
  `Runtime.evaluate` over the CDP websocket — the HUD needs `?debug` and a shell
  has no address bar, so the numbers were read straight off `renderer.info` and
  a `requestAnimationFrame` sampler instead.

  | configuration | nodes | draw calls | triangles | fps | frame p95 | rebuild |
  |---|---|---|---|---|---|---|
  | default, N=30 | 24 | 22 | 13k | **90.5** | 12.7 ms | — |
  | N=1000, primes 2/3/5 | 736 | 510 | 377k | **90.5** | 12.8 ms | 489 ms |
  | **N=1000 + all integers (trophy room)** | 1001 | 675 | 411k | **90.6** | 12.6 ms | 312 ms |
  | N=2500 + all integers (MAXIMALIST!) | 2501 | 1632 | 1.01M | **89.6** | 13.4 ms | 436 ms |
  | N=10000 + all integers (CEILING!) | 10001 | 7226 | 4.19M | **26.7** | 42.3 ms | 1507 ms |
  | N=10000, no all-integers | 7336 | 6440 | 4.10M | **29.3** | 37.0 ms | 1701 ms |

  Read it carefully. Everything at or below N=2500 sits **exactly on the panel's
  90 Hz refresh cap**, which means those figures are a floor, not a ceiling —
  the app is waiting on vsync and the real headroom is unknown and larger. The
  **trophy room at N=1000 is comfortably safe**, which was the open risk in the
  gilding design and is now closed.

  The one real cost is **CEILING! at N=10000: 27 fps and a 1.5-second freeze
  while the scene rebuilds.** Not broken, clearly degraded, and CEILING! is an
  achievement that deliberately sends players there. On anything cheaper than a
  Pixel 7 it will be worse. Decide whether that is acceptable before shipping,
  and note that instancing would be the fix if it is not.

  **Pixel 9 (tokay), measured 2026-08-20**, WebView Chrome 151, 411x923 at
  dpr 2.625. Its panel runs at 120 Hz, so the ceiling is higher and the app
  still reaches it:

  | configuration | nodes | draw calls | fps | frame p95 |
  |---|---|---|---|---|
  | default, N=30 | 24 | 21 | **119.8** | 10.0 ms |
  | trophy room (N=1000, all integers, gilding on) | 1001 | 1005 | **120.2** | 10.2 ms |
  | N=10000 + all integers (CEILING!) | 10001 | 10005 | **34.6** | 32.6 ms |

  So the trophy room is pinned to the refresh cap on both phones — 90 Hz on
  the 7, 120 Hz on the 9 — with gilding and curves on. It has headroom to
  spare and is not a risk on either.

  CEILING! is the only configuration that costs anything, and it costs less
  here than on the 7: **34.6 fps against 26.7**. Still a third of refresh,
  still worth deciding about, but the newer phone absorbs it better. Note the
  draw calls exceed the node count once curves are on — 10,005 for 10,001
  nodes — so the parastichy lines are a real share of the cost at high N, not
  a rounding error.

  Still unmeasured: **anything cheaper than a Pixel 7**
- **Plugin fitness.** Which community Capacitor plugins for PGS v2 and Play
  Billing 8+ are actually maintained. `ANDROID-BUILD.md` §4 makes evaluating
  them the first native task and gives the escape hatch
- **The PGS publish gate** — how many achievements the console requires (design
  for ten regardless)
- Whether bundled satirical self-ads trigger the "contains ads" declaration
- **Only §5 step 1 of `ANDROID-BUILD.md` has been executed** (2026-08-15). The
  rest is written from knowledge, not from having done it. The console sections
  especially: expect the UI to have moved. Step 1 needed three corrections on
  contact with reality, all now recorded in that document's §9 — assume the
  later steps will need the same

---

## Appendix A — Codebase directory

No build step, no dependencies, no bundler. Open `index.html` from any static
server and it runs. Three.js is vendored under `lib/`. Every path is relative.
This describes the code as it is today; `ANDROID-BUILD.md` §2 lists what the
build adds and removes.

### Where do I change…

| I want to change | Look in |
|---|---|
| A default value for anything | `core/state.js` → `DEFAULT_CONFIG` |
| The divergence angle, or the Constants section | `core/positions.js` → `setDivergenceAngle()`; `core/renderer.js` → `stepDivergence()` and `refreshDivergenceCurves()`; markup in `index.html` (app build only) |
| Whether a change needs a full scene rebuild | `core/state.js` → `HOT_KEYS` |
| A panel control, or what Reset restores | `core/panel.js` |
| The Dazzle preset | `core/panel.js` → `applyDazzle()` |
| Node appearance, materials, glow, pulse, colour drift | `core/renderer.js` |
| Parastichy line thickness / brightness / glow | `core/renderer.js` → the `LINE_*` constants |
| Camera home, or what Reset does to the view | `core/renderer.js` → `HOME_CAM_POS`, `resetCamera()` |
| Morph dwell or travel speed | `core/renderer.js` → `DWELL_SECONDS`; `core/state.js` → `shapeDriftSpeed` (and `SPEED_DEFAULT` in `core/transport.js`, which **must match**) |
| The shapes themselves, or how they interpolate | `core/positions.js` |
| **The morph ORDER** — which shape follows which | `core/positions.js`, the `registerShape` calls at the bottom. That block is the single source of truth: the renderer derives its dwell keyframes and travel limits from it, the transport derives the scrub range from it, and the curve interpolator reads the same list. Two things outside it must be changed by hand and are commented as such — `DEFAULT_CONFIG.dimension` (the opening shape) and Dazzle's pinned `dimension` in `panel.js` |
| Factorisation, colour derivation, which nodes are visible | `core/math.js` |
| The phone bottom sheet | `core/sheet.js` |
| The play/pause/scrub bar | `core/transport.js` |
| The update prompt or the error boundary | `core/notices.js` |
| The debug HUD | `core/debug-hud.js` |
| Offline behaviour, caching, update semantics (web builds only) | `sw.js` |
| Markup, styles, the bootstrap, the CSP | `index.html` |

### Files

**Core** — always loaded, no crash isolation.

| File | Lines | Owns |
|---|---|---|
| `core/renderer.js` | 1310 | Three.js scene construction, the animation loop, camera, disposal, context-loss recovery. The big one |
| `core/panel.js` | 843 | The side panel: control construction, wiring, Reset, Dazzle. Coupled to the markup by `id` |
| `core/math.js` | 217 | Pure functions. Primes, factorisation, colour, visibility rules. **No Three.js dependency** |
| `core/transport.js` | 214 | The play/pause/scrub bar and its speed mapping |
| `core/positions.js` | 202 | The shape registry and `interpolatedPos()`. Owns how shapes blend |
| `core/state.js` | 144 | `DEFAULT_CONFIG`, the mutable `state` singleton, the event bus, the module registry, reduced-motion defaults |
| `core/debug-hud.js` | 122 | `?debug` overlay. Self-contained |
| `core/sheet.js` | 106 | Phone bottom-sheet position and drag. Owns *where the sheet sits*, never what is in it |
| `core/notices.js` | 266 | Update prompt and fatal error boundary. **Imports nothing** — it must work when the rest has failed |

**Feature modules** — dynamically imported, crash-isolated. One that throws is
disabled and the app carries on. The achievements and fake-ads modules will be
two more of these.

| File | Lines | Owns |
|---|---|---|
| `modules/physics.js` | 580 | Drag and spring simulation. The only module that **writes** node positions |
| `modules/info.js` | 390 | Tap/right-click a node for its maths. Owns the tooltip |
| `modules/lens.js` | 305 | The classroom lens: chalkboard layer, projected HTML labels, tap-for-info |

A module is an object with any of `init(ctx)`, `beforeBuild(ctx)`, `build(ctx)`,
`animate(ctx)`, `destroy()`, plus `enabled` and an optional `controls` array
that the panel renders automatically. It calls `registerModule(name, mod)` from
an exported `register()`.

### Seams that will bite

**`state` is a mutable global singleton** in `state.js`, written from many
places. `HOT_KEYS` declares which properties can change without a scene rebuild.
Nothing enforces it: put a key in the wrong set and it fails silently.

**`nd.mesh` is a de facto public API.** `physics.js` writes `nd.mesh.position`
directly; `physics.js` and `info.js` both raycast against the array of node
meshes; `lens.js` reads positions off it. This is why instancing is a project
and not a renderer change — it would migrate four files at once.

**`shapeDriftSpeed` and `transport.js`'s `SPEED_DEFAULT` must agree.**

**Reset writes ~40 DOM values by hand** in `panel.js`. Every new control is a
chance to forget one. "Reset does not reset everything" has been a bug twice.
The Constants controls were added to that list when they were built; the next
control must be too.

**Nodes and curves used to disagree about the morph order, and could again.**
Node positions come from `interpolatedPos()`, which walks the shape registry.
Curve positions come from `lerpShapeArrays()`, which until 2026-08-15 was a
hardcoded if/else chain with the old order and its 0.5 spacing baked into every
branch. Changing the registry would have moved the nodes to the new arrangement
and left the parastichy curves describing the old one — the figure tearing in
half, with no error raised anywhere. Both now read `getShapes()`. Anything else
added that interpolates between shapes must read it too, and a hardcoded `0.5`
step is the smell to watch for.

**A slider in a scrolling panel needs `touch-action: pan-y`.** Without it a range
input claims the whole gesture the moment a finger lands on it, so scrolling the
panel past a slider drags that slider instead — and the value teleports to
wherever the finger was horizontally, rather than nudging. This affected every
slider in the panel and went unnoticed for a long time because on a mouse it
does not happen at all. It is fixed on the element type in `www/index.html`, so
a new slider inherits the fix; a new *custom* control that handles its own
pointer events does not, and must think about it.

Worth remembering how it surfaced: it produced a false bug report. A screenshot
taken after an accidental drag showed the divergence angle at 209°, which looked
exactly like a wrong default, and the wrong thing was very nearly "fixed".

**An angle change is not a rebuild.** `divergenceAngle` is in `HOT_KEYS` so it
never reaches `buildScene()`, which would dispose and recreate every mesh in the
scene. The scene is kept in step by `stepDivergence()` in `renderer.js` instead,
which is also where the deliberate compromise lives: node positions are exact
every frame, parastichy curve arrays are rebuilt at 20 Hz and settled exactly
once the angle stops moving. Anything else added that invalidates geometry
without changing its SIZE should follow the same pattern rather than reaching
for a rebuild.

**Timing is wall-clock.** `dt` is measured and clamped to 100 ms. Do not
reintroduce a fixed frame step — `tools/check.mjs` fails the build if you do.

### Checks

```bash
node tools/check.mjs
```

Dependency-free. Verifies precache paths exist, `CACHE_VERSION` matches
`CACHE_PREFIX`, the UI version label agrees with it, and no hardcoded frame step
returned. Runs in CI on push and PR, alongside a parse check of every module.
The precache and cache-version guards go away with the Capacitor build and are
replaced by version-name agreement (`ANDROID-BUILD.md` §2).

**There is no browser smoke test.** It needs Playwright, so it needs
dependencies — a decision that was defensible while the project had none.
Capacitor ends that era; revisit. Every behavioural claim so far was verified
by driving a real browser by hand, and two real bugs were found that way.

---

## Appendix B — The other documents

| Document | Read it for | Status |
|---|---|---|
| `ANDROID-BUILD.md` | **The plan.** Repo changes, web-side design, native plugins, build and console sequences, open decisions | Current. Steps 1–2 executed 2026-08-15; §9 is the trap list and is worth reading first |
| `CODE-NOTES.md` | The two comment layers in `www/` — `DEV:` for implementation, `EDU:` for the mathematics — and where the mathematics actually lives | Current, 2026-08-15 |
| `PLAN.md` | The charter, the project's history and reasoning, the gotchas learned building the web app | History. Predates v1; its Burst 6 (TWA via Bubblewrap) is superseded |
| `V1-PLAN.md` | Why each v1 change was made; which performance claims were measured versus judged | History. All items closed. Its references to a paid TWA are superseded |
| `archive/PLAY-STORE-HANDOFF.md` | The TWA / paid-app plan, in full | **Superseded 2026-08-15.** Kept for the asset-links and Play-deadline reasoning only |
| `archive/BURST-1-BRIEF.md` | Early history | History |

If these disagree with this document, **this document is newer**. If it
disagrees with the code, the code is right and this should be fixed.
