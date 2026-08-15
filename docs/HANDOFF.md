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

**`ANDROID-BUILD.md` §5 step 3 — the adapter and the achievement ledger.**
Steps 1 and 2 were both executed on 2026-08-15. The app builds, installs and
runs well on the Pixel 9; the web-only machinery is gone from the app copy; the
checks guard the app build on its own terms.

Step 3 is `platform/` with its no-op fallback and `modules/achievements.js`, and
it has a prerequisite that is **not** code: the achievement list must be
designed first (`ANDROID-BUILD.md` §3, ten of them, 2000 XP to share out). That
is a joint task and nothing else blocks it.

**Still owed from step 1: a performance measurement.** Nothing has been measured
on device — see §5 below. It has not blocked anything so far and does not block
step 3, but no claim about WebView performance may be made until it is done.

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

- **Performance in Android System WebView** on the Pixel and on anything cheaper.
  Chrome numbers: **1002 draw calls at N=1000**, one per node, instancing
  deferred. WebView is Chromium and should match; measure, don't assume.
  **Still unmeasured as of 2026-08-15.** The app is known to *run* on the
  Pixel 9 and to look right, and it was judged good by hand — but "working
  great" is not a number, and no fps or draw-call figure has been taken.
  `ANDROID-BUILD.md` §5 step 1 says how to attach the HUD in a shell
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
