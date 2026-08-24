# Handoff — Pretty Number Machine

**Start here.** This is the entry point and the authoritative statement of where
things stand. `ANDROID-BUILD.md` is the plan for the work ahead; the other
documents are history, and Appendix B says which parts of each are still true.

**Written:** 2026-08-15. **Last revised: 2026-08-24**, twice — first at the end
of a long session that added the ads layer, rebuilt the corner controls twice
and finished the decomposition view, and then again for the **v7 achievement
revision**. Everything below is current as of `capacitor-spike`.

**The web app is feature-complete; it builds and runs as an Android app; the
achievement layer is built and verified on a Pixel 7 and a Pixel 9; the ads
layer is built and verified on a Pixel 7; and the decomposition view is
finished. The work ahead is connecting to Play Games Services, choosing a
billing plugin, and getting it into the store — see `ANDROID-BUILD.md`.**

> **v7 is built and verified on a Pixel 7**, build `v1.0.0-dev.8`. The
> achievement list was reworked on 2026-08-24: three dropped, three added, five
> gild sets widened, two clues rewritten, plus reference links, criteria on
> unlocked rows and a trophy-room button. `npm run check` passes with **78
> assertions**; the reasoning is in `docs/ACHIEVEMENTS.md` §2a and §13 and the
> device pass is summarised in §0.
>
> Verified on the device with REAL touch events: all three new triggers fire, all
> 101 rows render, no locked row leaks criteria or link or button, the toast
> carries criteria and is tappable even without a blurb, the trophy-room button
> applies the §9 preset, and a reference link opens Chrome with the app still
> behind it — **no `@capacitor/browser` needed**, which had been an open
> question.

### What changed on 2026-08-24, in one place

A lot landed in one sitting. If you are picking this up cold, this is the list
of things that did not exist before it, each with the document that owns it:

| Landed | Where it lives | Design record |
|---|---|---|
| **The ads layer** — two products, nine slides, paywall, slideshow, intrusion banner | `www/modules/ads.js`, `ads-data.js` | **`docs/ADS.md`** |
| **The corner controls** — flex column, clear view, restore | `www/index.html` | `ADS.md` §3a |
| **The decomposition view** — tap a node or a line under the lens | `www/modules/lens.js` | This document, §1 |
| **Partial parastichy curves** — `buildRunShapes()` / `lerpRunShapes()` | `www/core/renderer.js` | This document, §1 |
| **Two "this feature exists" invitations** | `achievements.js`, `ads.js`, `index.html` | This document, §1 |
| **A note from the author** in the panel | `www/index.html` | — |

### And then, later the same day: the v7 achievement revision

| Landed | Where it lives | Design record |
|---|---|---|
| **3 dropped, 3 added** — out: CEILING!, MERSENNE!, WHOLE!. In: DECOMPOSE!, GALLERY!, TEMPTED! | `achievements-data.js` | `ACHIEVEMENTS.md` §3 |
| **The payoff rule** — a gild set may no longer be the selection that earned it; 5 widened | `achievements-data.js` | **`ACHIEVEMENTS.md` §2a** |
| **Reference links** — 85 of 101, every title verified against the Wikipedia API; six retargeted and two dropped for content rating (§13) | `achievements-data.js`, `achievements.js` | `ACHIEVEMENTS.md` §13 |
| **Criteria on unlocked rows and toasts** — because arriving by accident is common | `achievements.js`, `index.html` | `ACHIEVEMENTS.md` §13 |
| **A trophy-room button**, not an automatic jump — the room is destructive | `achievements.js` | `ACHIEVEMENTS.md` §13 |
| **Two new bus events** — `lens:decompose`, `ads:paywall` | `lens.js`, `ads.js` | `ACHIEVEMENTS.md` §7 |
| **The design record** — every row assessed, with the drops and the rejections | — | `docs/achievements-v7-proposal.xlsx` |

Two things worth carrying forward from that work:

- **The count and the published split are now 101 and 18/83.** The split was
  16/85 and is pinned by the checker, because it is effectively permanent once
  the Play Console is told. Do the arithmetic before publishing, not after.
- **`achievements-data.js` is now the single source of truth.** The
  two-sources problem in `ACHIEVEMENTS.md` §10 is settled: `achievements-v6.xlsx`
  is history and the v7 spreadsheet is a record, not an input.

**Three things were built wrong first and rebuilt.** They are written up where
they happened, because in each case the wrong version looked right:

1. **Decomposition runs as straight polylines.** `core/math.js` warns above
   `buildParastichy` that spirals must be interpolated in POLAR space because
   Cartesian "cuts corners across the curve". They were built in Cartesian
   anyway and threw chords across the figure. → `renderer.js`, `buildRunShapes`
2. **The decomposition painted silver.** Colour in this app IS the
   factorisation, so a silver 42 had been stripped of the fact being explained.
   → `lens.js`, the note above `DECOMP_LINE_WIDTH`
3. **The corner column moved left to dodge a collision** and collided with
   something else. Fixed at the source by moving the sheet's menu button
   instead. → `ADS.md` §3a

**And one debugging lesson worth more than any of them:** the event bus in
`core/state.js` wraps every handler in `try/catch` and logs to `console.error`.
A module that silently does nothing has probably **thrown inside an event
handler**, and `emit()` will have returned perfectly normally. It is invisible
from the page and one line in `adb logcat | grep Capacitor/Console`. That cost
half an hour; it should cost you thirty seconds.

**Reading order for someone picking this up cold:**

1. This document, all of it. It is short and it is the only thing that claims to
   be current.
2. `ANDROID-BUILD.md` **§9** — the trap list. Every entry cost real time. Read it
   before debugging anything that looks like a build not taking effect.
3. `ACHIEVEMENTS.md` if the work is achievement-shaped. Its §8 is a second trap
   list, for that layer, and its §0 says which parts describe built code.
4. `ADS.md` if the work is ads-shaped. **Read its §1a before touching any
   paywall copy** — the pitch withholds the joke on purpose, and an edit that
   makes it clearer destroys the product.
5. `ANDROID-BUILD.md` §5 for the next technical step, §6 for the Play Console
   sequence.

Everything else in `docs/` is history. Appendix B says which parts of each are
still true. **Where any document disagrees with the code, the code is right and
the document should be fixed.**

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
- **Identity verification was started**, documents uploaded.
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

Nothing in the app is half-finished. Everything below needs either Dakota or the
Play Console, and the two code tasks are both blocked on a decision rather than
on work.

### The queue, in the order it unblocks

1. **Choose a PGS plugin** (`ANDROID-BUILD.md` §4 lists candidates and the
   escape hatch), then fill in `getGamesPlugin()` in `www/platform/index.js` and
   paste the console-issued ids into `STORE_IDS`. Nothing else should need to
   change: everything already runs against the adapter, and the in-memory
   fallback keeps a browser working.
2. **Choose a billing plugin**, same shape of job. `platform/index.js` has
   `PRODUCT_IDS` and an id-aware `billing` adapter waiting. Until then every
   purchase honestly fails as "the store is not available right now", which is
   what the paywall says. **A plugin must map its result onto `available`** —
   `ADS.md` §4 explains why that field is not decoration.
3. **Play Console**: verification state, second Admin user, merchant profile,
   then the achievement list. **Do not create achievements until the list is
   final** — they can be added afterwards and effectively never removed.
   `tools/achievements-table.mjs` prints all 101 with the `initial_state`
   column the console wants.

### Achievements need revisiting, and it is a real design task

Flagged by Dakota 2026-08-24, deliberately deferred. The app grew three
features the 101-item list predates — the ads layer, the decomposition view,
and clear view — and none of them has anything to find. That is a gap rather
than a bug, but it interacts with two things that are hard to undo:

- **UNITY! counts everything.** Its predicate is
  `countUnlocked() >= ACHIEVEMENT_DEFS.length - 1`, so every addition raises the
  bar for the capstone. Adding ten achievements means ten more before UNITY!
  fires for anybody.
- **Purchases must still grant nothing.** `ADS.md` §2 has the arithmetic: the
  `- 1` slack is UNITY! itself, so a single paid achievement paywalls the
  capstone permanently.

There is deliberate headroom for this — `ACHIEVEMENTS.md` says the XP budget
was built so later additions have somewhere to come from. Read that before
adding anything.

### The decomposition view — finished 2026-08-24

Tap a node with the lens open and the figure shows what the number is made of:
the node lifts, every prime in its factorisation lifts, a run climbs from each
prime to it along that prime's parastichy family, and everything else steps
back. Tap a **line** instead and the question changes to "what does this prime
touch" — the whole family lights with every multiple.

The rendering it needed is `buildRunShapes()` / `lerpRunShapes()` in
`renderer.js`: a **partial parastichy curve**, built the same way the real
curves are and lerped across the morph. **`ACHIEVEMENTS.md` §2's gilded
decomposition is now a matter of calling those two functions with the gild
set** — no new rendering work.

Five things in it are worth knowing before touching it, all of them written up
beside the code in `modules/lens.js`:

- **Runs interpolate in polar space.** A polyline through the multiples cuts
  chords across the figure. `core/math.js` says so above `buildParastichy`.
- **Nothing is recoloured, only lit or dimmed.** Colour here IS the
  factorisation. Participants glow in their OWN hue; a silver glow was the
  thing that washed them out, not the brightening.
- **Ghosts.** A decomposition of 42 needs 7, and if 7 is not selected the
  renderer never built a mesh for it. Missing terms are drawn by the lens in
  plain silver and labelled. They are this module's own meshes and are disposed
  rather than restored.
- **It outlives the tooltip.** Dismissing the card does not clear the figure.
  Three ways out: tap the same node again, close the lens, rebuild the scene.
  Deliberately not a tap on empty space, which is how an orbit drag begins.
- **Colour drift is suspended** while a decomposition is up.
- **Runs are depth-tested like anything else**, and the base curve for a prime
  that has a run is HIDDEN rather than dimmed. The first is because a line
  passing through the nodes it threads reads as a drawing laid over a
  photograph — losing a stretch behind the far side is what tells you the run
  has a far side. The second is because a run traces the same path as the first
  stretch of its own curve, so leaving both visible is coincident geometry and
  z-fights along exactly the line the player was asked to look at.

The dials — `DECOMP_LINE_WIDTH`, `DECOMP_GLOW`, `LIFT_*`, `BRIGHTEN`, `DIM` —
were tuned on a Pixel 7 at N=60 and trade against each other. **They have not
been judged at high N.** Change them as a set.

### Two invitations, added 2026-08-24

Both features above were invisible: a hundred and one achievements and a whole
shop behind controls that look like every other control. Each now announces
itself and then stops.

- **The achievements switch** glows gold with a sparkle until it is switched
  on. Continuous, which is only acceptable because it lives inside a collapsed
  panel section and cannot interrupt anybody.
- **The ads button** gets a single wave of gold — every 5 minutes if the
  paywall has never been opened, every 20 once it has, never once owned. Seen
  is persisted, not per-launch. It never fires over an open overlay or in clear
  view.

**Judge anything visual on a phone.** The render loop does not run in a desktop
preview pane, and eight separate bugs across this layer were invisible until the
app was on hardware. `ACHIEVEMENTS.md` §8 lists the achievement-layer ones.

---

## 2. Decided — do not reopen

| Decision | Value | Notes |
|---|---|---|
| Package name | `com.schuckdata.pnm` | Becomes permanent at first upload to Play. Chosen; not yet locked |
| Distribution model | **Free**, with **two non-consumable** in-app products | Revised 2026-08-23 from a single $0.99 unlock. An app ever offered free can never become paid. Free is the deliberate choice, so the one-way door is irrelevant — but it is a door |
| The products | **$0.99 addition ads, $4.95 multiplication ads.** Advertising AS the product: you pay to be shown commercials for mathematical operators. Neither grants an achievement | The satire is the point. No ad SDK, no network, no consent framework, ever. `docs/ADS.md` |
| Purchases and achievements | **Purchases grant nothing.** All 101 stay earnable by playing | Arithmetic, not principle: UNITY! needs all-but-one, and that slack is UNITY! itself, so any paid achievement paywalls the capstone |
| Achievements | Local ledger is the source of truth; PGS is the public record and cross-device copy | Works offline and signed out. See `ANDROID-BUILD.md` §3 |
| Achievement visibility | **Tutorial (16) publishes Revealed; the other 85 publish Hidden** | Decided 2026-08-23. Hidden criteria are what let hunters collaborate on the clues rather than read the answers. Near-permanent once the console is told. `ACHIEVEMENTS.md` §12 |
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

**A module that silently does nothing has thrown inside an event handler.**
`core/state.js`'s `emit()` wraps every listener in `try/catch` and logs to
`console.error`, so the emit returns perfectly normally and the page looks fine
while the feature is simply absent. Invisible from DevTools' own evaluation, one
line in `adb logcat | grep Capacitor/Console`. Cost half an hour on 2026-08-24;
check it first, not last.

**`getPrimeRGB` takes the whole SELECTION and returns a map.** There is no
"colour of 7" — the scheme assigns by position in the selected list, so an
unselected prime genuinely has no colour on the figure. Anything that needs one
anyway has to fall back rather than invent (the decomposition uses silver).

**Spirals interpolate in polar space.** `core/math.js` says it above
`buildParastichy` and it has now been rediscovered the hard way: straight
segments between multiples cut chords clean across the figure. Anything drawing
a path along a parastichy family must use `buildRunShapes()`.

**Labels need a HALO, not a drop shadow.** A shadow lights one side of each
glyph; the moment a label lands on a pale node it vanishes. `.lens-label` in
`index.html` carries the four-offset halo and the rest of the point-label rules.

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
- Whether bundled satirical self-ads trigger the "contains ads" declaration.
  The app serves no third-party advertising and makes no network request, but
  the declaration asks about ads, not about ad networks. Answer before the
  listing is filled in
- **The decomposition view at high N.** Its six dials were tuned on a Pixel 7 at
  N=60 and have never been judged above that. At N=1000 the run for prime 2 is
  five hundred knots, and whether that reads as an explanation or as a scribble
  is unknown
- **The ads intrusion cadence** — 90 seconds to the first banner, then every
  four minutes — was reasoned about, not lived with
- **The shimmer cadences** likewise: five minutes unseen, twenty once seen
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
| Anything about the decomposition view — colours, sizes, ghosts | `modules/lens.js`, the dials above `DECOMP_LINE_WIDTH` |
| A partial parastichy curve, for anything | `core/renderer.js` → `buildRunShapes()` / `lerpRunShapes()` |
| Ad copy, prices, palettes | `modules/ads-data.js`. **Read `ADS.md` §1a first** |
| How long before the ads close button works | `modules/ads.js` → `CLOSE_APPEAR_MS`, `CLOSE_ARM_MS` |
| Label legibility on the figure | `index.html` → `.lens-label`, which carries the point-label rules in a comment |
| The stacking order of anything | `index.html` → the run written out above `#panel`'s `z-index` |
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
| `modules/achievements.js` | ~800 | The ledger, predicates, panel section, toast, sound, gilding paint. See `ACHIEVEMENTS.md` |
| `modules/ads.js` | ~430 | Entitlement, paywall, slideshow, the multiplication button, the intrusion banner, the shimmer schedule. See `ADS.md` |
| `modules/ads-data.js` | ~250 | The two products, the palettes and every word of the slide copy. **No Three.js, no DOM** — checkable headlessly, which is the point, because copy is what rendering tests cannot judge |
| `modules/achievements-data.js` | ~430 | The number sets, definitions and gilding rule. **No Three.js** — checkable headlessly |
| `platform/index.js` | ~250 | The native adapter and the store-id map. Not a module; imported by achievements.js |

A module is an object with any of `init(ctx)`, `beforeBuild(ctx)`, `build(ctx)`,
`animate(ctx)`, `destroy()`, plus `enabled` and an optional `controls` array
that the panel renders automatically. It calls `registerModule(name, mod)` from
an exported `register()`.

### Seams that will bite

**`state` is a mutable global singleton** in `state.js`, written from many
places. `HOT_KEYS` declares which properties can change without a scene rebuild.
Nothing enforces it: put a key in the wrong set and it fails silently.

**Camera framing is a function of the viewport ASPECT, so it goes stale when
the viewport changes shape.** `setCameraTopDown()` — what Dazzle uses — derives
its distance from `threeCamera.aspect`, because the camera declares a VERTICAL
fov and on a portrait phone the horizontal is the tighter constraint. The
`ResizeObserver` updated the aspect and the projection matrix and stopped there,
so the distance was never re-derived.

Reported and reproduced 2026-08-24: open the sheet, press Dazzle, close the
sheet, and the figure arrives far too close. Dazzle with the sheet up sees a
411x384 viewport, aspect 1.07, and frames at distance 11.4. The sheet closes,
the viewport becomes 411x914 and the aspect 0.45, where the right distance is
11.4 / 0.45 = 25.3. The camera stayed at 11.4 — **more than twice as close as it
should have been**, and only in that one order of operations, which is why it
survived so long.

The resize now re-derives the distance, but only while the camera is still where
Dazzle put it. A `start` listener on OrbitControls clears that the instant the
player orbits, pans or zooms, and `resetCamera()` clears it too because
`HOME_CAM_POS` is a fixed vector with nothing to re-derive. The refit keeps the
camera's DIRECTION and changes only its distance — re-running
`setCameraTopDown()` outright would snap the azimuth back to zero, which is
visible as a jump, and Dazzle turns auto-rotate on.

**The trophy room had the same bug in a different shape**, found the same day.
It never framed from the aspect at all — it inherits `HOME_CAM_POS` from Reset,
a fixed vector — so it arrived 1.6x too close in portrait. `frameToFit()` is the
shared fix: it sets the distance from the aspect along whatever direction the
camera is already looking, and arms the same refit. See `ACHIEVEMENTS.md` §9.

**Anything else that frames from the aspect, or from a fixed vector, has one of
these two problems**, and nothing guards against either generally.

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
npm run check
```

Three dependency-free checkers, all of them in CI on push and PR alongside a
parse check of every module and a run of the achievement table exporter.

| | Asserts |
|---|---|
| `tools/check.mjs` | Precache paths exist, `CACHE_VERSION` matches `CACHE_PREFIX`, the UI version label agrees, no hardcoded frame step, prime colours reach 4.5:1 |
| `tools/check-achievements.mjs` | The number sets, the gilding and payoff rules, the ledger's merge contract, no two achievements declaring the same selection, nothing true at the defaults, the published Revealed/Hidden split, and the reference links including a content-rating denylist. Count lives in `ACHIEVEMENTS.md` §11, in one place only |
| `tools/check-ads.mjs` | 43 assertions. Every deck whole, prices agreeing with themselves, **the pitch not giving the joke away**, no development bypass that entitles without a purchase, the two shimmer cadences |

Several of those are **source greps rather than behavioural tests**, and that
is deliberate rather than lazy: `achievements.js`, `ads.js` and `lens.js` all
import three.js and cannot be loaded headlessly, which is the whole reason the
`-data.js` files exist separately. What the greps defend is *deletion* — a
one-line override or guard that somebody tidies away, silently restoring a bug
that took a phone to find. A grep is a poor test and a good tripwire, and each
one says which it is.

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
| `ANDROID-BUILD.md` | **The plan.** Repo changes, web-side design, native plugins, build and console sequences, open decisions | Current. §5 steps 1–3 done; **4 (PGS) and 5 (billing) not started**. §9 is the trap list and is worth reading first |
| `ADS.md` | **The ads layer.** The register the copy must hold, the two products, the reveal the paywall withholds, the entitlement rule, and the corner-controls collision history | Current, 2026-08-24 |
| `ACHIEVEMENTS.md` | **The achievement layer.** The gilding rule, the payoff rule (§2a), clue craft, the accordion, what an earned row shows (§13), the traps (§8), and what is still open (§14) | Current, 2026-08-24. Describes **v7 as built** |
| `CODE-NOTES.md` | The two comment layers in `www/` — `DEV:` for implementation, `EDU:` for the mathematics — and where the mathematics actually lives | Current, 2026-08-15 |
| `achievements-v6.xlsx` | The v2 list, as it stood before v7 | **History.** `achievements-data.js` is authoritative now — see `ACHIEVEMENTS.md` §10. For the current list, run `tools/achievements-table.mjs` |
| `achievements-v7-proposal.xlsx` | The v7 design record: all 101 assessed against the rubric, the drops, the additions, the rejections, and the cluster-balance argument | A record, not a source. Generated from the code; nothing reads it back |
| `PLAN.md` | The charter, the project's history and reasoning, the gotchas learned building the web app | History. Predates v1; its Burst 6 (TWA via Bubblewrap) is superseded |
| `V1-PLAN.md` | Why each v1 change was made; which performance claims were measured versus judged | History. All items closed. Its references to a paid TWA are superseded |
| `archive/PLAY-STORE-HANDOFF.md` | The TWA / paid-app plan, in full | **Superseded 2026-08-15.** Kept for the asset-links and Play-deadline reasoning only |
| `archive/BURST-1-BRIEF.md` | Early history | History |

If these disagree with this document, **this document is newer**. If it
disagrees with the code, the code is right and this should be fixed.
