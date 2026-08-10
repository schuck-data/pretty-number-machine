# Handoff — Pretty Number Machine

**Start here.** This is the entry point and the authoritative statement of where
things stand. The other three documents are deeper but partly historical;
Appendix B says which parts of each are still true.

**Written:** 2026-08-10. **The app is feature-complete. Nothing below is a code
task.** What remains is publishing.

---

## 0. Where things actually are

### The two builds

| Path | Version | Role |
|---|---|---|
| `schuckdata.com/pretty-number-machine/` | `v0.14.5` | The **shipped** build. Live, public, indexed. Frozen apart from live defect fixes |
| `schuckdata.com/pretty-number-machine/v1/` | `v1.0.0-dev.7` | The **v1 build**, feature-complete. `noindex`. Where all v1 work happened |

They are independent applications sharing an origin: separate service workers,
separate scopes, separate cache namespaces (`pnm-` and `pnmv1-`). The shipped
worker explicitly hands off the `./v1/` subtree. **Do not merge these concerns.**

Append `?debug` to either URL for a HUD showing fps, frame time, p95, draw
calls, triangles, node count and dpr.

### Play Console

- **Organisation account created** under `dakota@schuckdata.com` (a Google
  Workspace identity, administered from `ds89holdco@gmail.com`).
- **D-U-N-S issued** 2026-08-10, same day it was requested.
- **Identity verification was in progress** at time of writing, with documents
  uploaded and a "please allow a few days" notice. **Check the console for its
  current state before assuming anything.**
- Phone verification is gated behind identity and organisation verification —
  the account is a serial queue, not a checklist.

### What is already published and live

- `privacy.html` at `…/pretty-number-machine/privacy.html`, zero external requests
- `https://schuckdata.com/.well-known/assetlinks.json` returns **200** with the
  real package name and a **placeholder fingerprint**

---

## 1. The next action, and the order that matters

**Promote v1 onto the canonical path, and do it before generating any bundle.**

`start_url` is compiled into the Android manifest at bundle time. Build a bundle
while v1 lives at `/v1/` and the shipped app loads a URL called "v1" **forever**
— changing it later means a new bundle upload, and the name is a lie the moment
v1.1 exists.

Promotion means: copy `v1/`'s application files over the repo root, keeping the
shipped build reachable at a frozen path if it is still wanted (decided
2026-08-10: it stays live). Then:

- The promoted build's `CACHE_VERSION` must move to the `pnm-` namespace, or
  returning users' workers will not recognise it as their own generation.
- The `./v1/` bail-out in the root `sw.js` becomes dead code if `/v1/` is
  retired, and must **stay** if it is not.
- `noindex` must come off the promoted copy and stay on whatever remains at
  `/v1/`.
- Re-run `node tools/check.mjs`, which exists to catch exactly the version and
  precache mistakes this step invites.

---

## 2. The publishing sequence from here

Steps 1–3 of `PLAY-STORE-HANDOFF.md` §4 are done. What is left:

| # | Step | State |
|---|---|---|
| 1 | Promote v1 to the canonical path | **next** |
| 2 | Add a second Play Console user with Admin permissions | not done — this is the only recovery path if the Workspace or domain fails |
| 3 | Merchant/payments profile, tax interview (W-9), payout bank account | blocked on identity verification |
| 4 | **Set the app to Paid at $0.99 — before any production release** | blocked on 3. See §3 |
| 5 | Generate the bundle with **Bubblewrap**, targeting **API 36** | after promotion |
| 6 | Enrol in Play App Signing (the default) | with 5 |
| 7 | Put the **real SHA-256 fingerprint** into `assetlinks.json` in the `schuck-data.github.io` repo | after 6 — it comes from Play Console, and it is the **app signing** cert, not the local upload key |
| 8 | Feature graphic, 1024×500 | **does not exist.** Required |
| 9 | Screenshots, ≥2, phone aspect | needs a device. Use Dazzle for a reproducible hero frame |
| 10 | Data Safety form — declare no collection | true, and worth keeping true |
| 11 | Content rating questionnaire | a mathematics visualiser; expect the lowest rating |
| 12 | Internal test → closed test → production | the internal test is where you find out whether the TWA opens without an address bar |

**Deadline:** from **2026-08-31**, new submissions must target Android 16
(API 36). An extension to 2026-11-01 can be requested in Play Console.

**The 12-tester / 14-day rule does not apply** — that is for personal accounts,
and this is an organisation account. It returns if organisation verification
fails and the account falls back to personal.

---

## 3. Decided and permanent — do not reopen

| Decision | Value | Why it cannot be changed |
|---|---|---|
| Package name | `com.schuckdata.pnm` | Cannot be edited after publishing, ever. Already in the live `assetlinks.json` |
| Price | **Paid, $0.99** | **Free → paid is a one-way door.** An app ever offered free can never become paid; the only remedy is a new listing with a new package name. Set the price **before the first production release** |
| Public address | The owner's home address | It is the business address. Merchant accounts selling paid apps display it on the listing. Known and accepted, not overlooked |
| Free web version | Stays up | A buyer can reach the identical app free in a browser. Weighed and accepted. **Do not take the web version down to protect the listing** |
| Build tool | Bubblewrap, not PWABuilder | PWABuilder pins `targetSdkVersion 35` while the deadline needs 36 |

---

## 4. What only Dakota can do

- Anything with Dun & Bradstreet, including adding the **DBA as a trade style**,
  which is still outstanding and which nothing will ever remind you about
- Identity and business verification
- Merchant/payments profile, tax interview, payout bank account
- Setting the price
- Accepting Play policies and the developer agreement
- Anything involving credentials, keys or payment details
- Taking device screenshots
- Judging how anything looks

---

## 5. Traps that have actually bitten

Not hypothetical. Each of these cost real time.

**Service worker scope, four times.** A worker answers navigations for its whole
folder. It swallowed `privacy.html`; it served a seeded stale cache; it would
have swallowed `/v1/`. **Any new standalone page or subtree inside an app's
scope must be explicitly excluded, and nothing will warn you.**

**`caches.match()` searches every cache, oldest first.** Harmless while old
caches were deleted immediately. The moment a previous generation is kept alive
on purpose, a global match serves the *old* files. Every lookup is now scoped to
the worker's own `CACHE_VERSION`.

**Testing update detection is recursive.** The page runs the *previously cached*
copy of the code that detects updates, so a new detection attempt is tested
against the old logic still in the cache. Reload so the page is running the new
code before concluding anything.

**`CACHE_VERSION` discipline.** Change any precached file without bumping it and
clients stay on old code indefinitely. Three near-misses in one day.
`tools/check.mjs` now guards it.

**A meta CSP can kill the app.** `script-src 'self'` blocked the inline importmap
and module bootstrap, and nothing ran at all. It needs `'unsafe-inline'`;
hashing was rejected because there is no build step, so a hash goes stale
silently.

**Verify against a real HTTPS origin or localhost.** Plain HTTP to a LAN IP is
not a secure context, so no worker registers and every load is coherent by
construction — useless for testing anything about caching.

---

## 6. Still unknown

- **Performance on low-end hardware.** Never measured; no such device available.
  Draw calls *are* now measured: **1002 at N=1000, one per node.** How much a
  cheap phone cares is still open. `?debug` is how the first one that runs it
  produces a number rather than an impression.
- **Whether a paid TWA behaves like a free one.** No reason to think otherwise
  — the purchase gates the install, not the content — but unobserved.
- **Whether the generated Android manifest preserves `start_url` and `scope`.**
  Confirm before publishing. Orientation is fine: the manifest declares
  `"any"`, so the API 36 orientation restriction does not apply.
- **Nothing past §2 step 1 has been executed.** Everything there is written from
  knowledge, not from having done it. Expect the console UI to have moved.

---

## Appendix A — Codebase directory

No build step, no dependencies, no bundler. Open `index.html` from any static
server and it runs. Three.js is vendored under `lib/`. Every path is relative,
which is what let `v1/` be a plain copy with no edits.

### Where do I change…

| I want to change | Look in |
|---|---|
| A default value for anything | `core/state.js` → `DEFAULT_CONFIG` |
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
| Offline behaviour, caching, update semantics | `sw.js` |
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
disabled and the app carries on.

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
Nothing enforces it: put a key in the wrong set and it fails silently and
confusingly.

**`nd.mesh` is a de facto public API.** `physics.js` writes `nd.mesh.position`
directly; `physics.js` and `info.js` both raycast against the array of node
meshes; `lens.js` reads positions off it. **This is why instancing is a v1.1
project and not a renderer change** — it would migrate four files at once.

**`shapeDriftSpeed` and `transport.js`'s `SPEED_DEFAULT` must agree.** The
transport's handle height is a mapping centred on that value; a mismatch parks
the handle at the wrong place for the speed actually in force.

**Reset writes ~40 DOM values by hand** in `panel.js`. Every new control is a
chance to forget one. "Reset does not reset everything" has been a bug twice.

**Timing is wall-clock.** `dt` is measured and clamped to 100 ms. Do not
reintroduce a fixed frame step — `tools/check.mjs` fails the build if you do.

### Checks

```bash
node tools/check.mjs
```

Dependency-free. Verifies precache paths exist, `CACHE_VERSION` matches
`CACHE_PREFIX`, the UI version label agrees with it, and no hardcoded frame step
returned. Runs in CI on push and PR, alongside a parse check of every module.

**There is no browser smoke test.** It needs Playwright, so it needs
dependencies. That is a decision, not an oversight — but it means *every*
behavioural claim in this project was verified by driving a real browser by
hand, and two real bugs were found that way that reading never would have.

---

## Appendix B — The other documents

| Document | Read it for | What is stale |
|---|---|---|
| `PLAN.md` | The charter, the project's history and reasoning | Predates v1 entirely |
| `PLAY-STORE-HANDOFF.md` | **Still the best reference** on the asset-links trap (§2), paid-app mechanics (§3), and Play deadlines (§5) | Its §4 sequence is superseded by §2 here. Its status block describes the shipped build |
| `V1-PLAN.md` | Why each v1 change was made, and which performance claims were measured versus judged | Work items are all closed; it is now history rather than a plan |

If these disagree with this document, **this document is newer**. If it
disagrees with the code, the code is right and this should be fixed.
