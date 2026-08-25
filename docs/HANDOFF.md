# Handoff — Pretty Number Machine

**Start here.** This is the entry point and the authoritative statement of where
things stand. `ANDROID-BUILD.md` is the plan for the work ahead; the other
documents are history, and Appendix B says which parts of each are still true.

**Written:** 2026-08-15. **Last revised: 2026-08-25**, three times — for the
**ads tray and the ladder**, then for the **stuck-drag fix and the OOPS!
recalibration**, and then for **the logo, the colour system and the controls**. Before that, twice on 2026-08-24 — first at the end of a long
session that added the ads layer, rebuilt the corner controls twice and finished
the decomposition view, and then again for the **v7 achievement revision**.
Everything below is current as of `capacitor-spike`.

**The web app is feature-complete; it builds and runs as an Android app; the
achievement layer is built and verified on a Pixel 7 and a Pixel 9; the ads
layer is built and verified on a Pixel 7; the decomposition view is finished;
and as of 2026-08-25 it has a logo, a full icon set and the store graphics. The
work ahead is connecting to Play Games Services, choosing a billing plugin, and
getting it into the store — see `ANDROID-BUILD.md`.**

**Current build: `v1.0.0-dev.41`, installed and verified on a Pixel 7.** Version
lives in three files that `npm run check` holds in agreement: `package.json`,
`www/index.html` and `android/app/build.gradle`. Bump all three or the checker
fails — which is the point, because the WebView caches `https://localhost/` and
a version label read back off the device is the only proof a build landed.

> **v7 is built and verified on a Pixel 7.** The achievement list was reworked
> on 2026-08-24 — three dropped, three added, five gild sets widened, two clues
> rewritten, plus reference links, criteria on unlocked rows and a trophy-room
> button — and then shaken out across a run of builds the same day. The
> reasoning is in `docs/ACHIEVEMENTS.md` §2a, §9, §11 and §13; the assertion
> count lives in §11 and nowhere else, because it went stale three times.
>
> **Verified on the device with REAL touch events** — `adb shell input tap`
> produces genuine MotionEvents, so `isTrusted` holds and the dom-triggered
> achievements are actually under test rather than being handed their unlock.
> All three new triggers fire from a finger; all 101 rows render; no locked row
> leaks its criteria, its link or the trophy button; the toast carries criteria
> and is tappable even for the twelve with no blurb; the trophy-room button
> applies the §9 preset; and a reference link opens Chrome with the app still
> resident behind it — **no `@capacitor/browser` needed**, which had been an
> open question.
>
> **Landed after that, same day, all verified on the device:**
> the reference links retargeted for content rating (§13) — a link is a
> machine-readable assertion in a way a number is not;
> SUPERPRIME! gilding its whole family rather than the grid (§2a), which turned
> out to be the cause of a "flat payoff" that had been recorded as a design
> trade-off;
> the capstone no longer countable by ids dropped from the design (§8);
> two source tripwires that had been passing unconditionally since the day they
> were written, one of them the SPARTA! guard (§8);
> clear view moved to the top left and the drawer button back to the right
> (`ADS.md` §3a);
> the camera re-framing on resize, which Dazzle and the trophy room both needed
> (§9, and HANDOFF's seams below);
> and the ledger lifted into `achievements-ledger.js` so it can be tested at all
> (§11).

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

### And then, the next day: the ads tray and the ladder (2026-08-25)

The corner stack had grown to three permanent ads buttons, which is three
buttons' worth of figure you cannot see. It is a tray behind one door now, and
the shop grew a third tier that exists only as a promise.

| Landed | Where it lives | Design record |
|---|---|---|
| **The `+s` door and the tray** — one control on screen; the operators live behind it | `www/index.html`, `modules/ads.js` | **`ADS.md` §1b** |
| **The ladder** — own nothing, see `+`; own `+`, see `×`; own `×`, see `^`. One rung per purchase | `modules/ads-data.js` → `requires` | `ADS.md` §1b |
| **A third product, `ads-exponential` — announced, not sellable.** No price, no store id, no deck; its sheet says *Coming soon* | `modules/ads-data.js`, `ads.js` | `ADS.md` §1b |
| **`isSellable()`** — the sellable/announced split, which `check-ads.mjs` now asserts both halves of | `modules/ads-data.js` | `ADS.md` §1b |

Three things worth carrying forward:

- **The chain is data.** Both button gates used to hardcode a product name;
  they read `requires` now, and `check-ads.mjs` asserts the *shape* — exactly
  one root, everything else gated on the one before it — rather than the three
  specific links. That is what catches a fourth product bolted on as a second
  root, or into a cycle where its button could never appear at all.
- **The failure to guard against is shipping `^` as buyable** — a Buy button
  with no transaction behind it, one line of well-meant tidying away. The
  checker asserts no price, no store id, no deck, no `data-buy`, and `openFor`
  routing it away from the paywall.
- **A grep proves a CSS rule was written, not that it wins.** `#corner-stack
  button` is (0,1,0,1) and a bare `#ads-btn` is (0,1,0,0), so the tray-hiding
  rule lost and every operator stayed on screen. It cost a device round to find
  and `check-ads.mjs` was no help, because it greps for the text. Both rules are
  scoped through `#corner-stack` now.

### And later that day: a stuck drag, and OOPS! recalibrated

| Landed | Where it lives | Design record |
|---|---|---|
| **The lost-pointerup fix** — physics binds its release to the WINDOW now, and listens for `pointercancel` | `www/modules/physics.js` | §4 below |
| **The settle test also requires the node to be near home** | `www/modules/physics.js` → `SETTLE_HOME_DIST` | §4 below |
| **`_physicsTouch` and `_physicsCollision` into `HOT_KEYS`** — each was silently rebuilding the whole scene | `www/core/state.js` | §4 below |
| **OOPS! measures displacement and asks for a proportion**, calibrated against a real deranged figure | `achievements.js`, `achievements-data.js` | **`ACHIEVEMENTS.md` §13a** |

**Verified on a Pixel 7, and the method is worth stealing.** The whole loop ran
on hardware over Chrome DevTools on the adb socket: `screencap` to a RAW file and
diff the pixels to turn "is it twitching" into a number; hook
`uniformMatrix4fv` on the WebGL prototype to read every object's model-view
matrix and see WHICH things move, without touching the app; and for OOPS!, a
temporary in-page readout to pick a threshold from a figure rather than from a
guess. See `ACHIEVEMENTS.md` §13a.

**Three of my own theories died on the way**, all of them about collision, and
the reason they survived is the `HOT_KEYS` bug: toggling Collision silently
rebuilt the scene, which wiped the physics state and looked exactly like a fix.
**A control that secretly does something enormous will invalidate every
experiment run through it.** That cost more than the bug did.

### And then, the same day: a logo, a colour system, and drawn controls

| Landed | Where it lives | Design record |
|---|---|---|
| **The mark, and every icon** — adaptive launcher at five densities, legacy square and round, the 512 store icon, the 1024×500 feature graphic, refreshed web icons | `tools/logo/`, `docs/store/`, `android/…/mipmap-*`, `www/icons/` | This section |
| **Five palettes, ten backgrounds** — two colourblind-safe *by measurement* | `core/math.js` → `PALETTES`, `BACKGROUNDS`, `SAFE_PALETTES` | This section |
| **Perceptual composite mixing** — every scheme but `rgb` blends in OKLab | `core/math.js` → `nodeColor`, `mixModeFor` | The note above `nodeColor` |
| **New defaults: cyberpunk on navy** | `core/state.js`, `index.html`, `panel.js` Reset | Pinned in three places by `check.mjs` |
| **Dropdowns the app draws**, every option showing its colours | `core/dropdown.js` | Its own header |
| **A hue / saturation / lightness background picker** | `index.html`, `panel.js` → `applyHSL` | — |
| **Sliders that do not steal a scroll** | `core/slider.js` | §4, the slider trap |
| **CVD simulation** — protanopia, deuteranopia, tritanopia | `tools/cvd.mjs` | Used by `check.mjs` |

**THE LOGO IS GENERATED BY THE APP'S OWN MATHEMATICS.** `tools/logo/make-logo.mjs`
imports `www/core/math.js` and asks it the same questions the renderer asks — the
golden angle, the colour law, `buildLineArcs`. The mark is not a picture *of* the
figure, it IS the figure: two prime chains braided, trimmed to one
lowest-common-multiple span (6 to 12), with an accent at **7, which is not a node
at all**. 7 is coprime to both primes, so neither chain touches it and it floats
in the gap they leave — the sieve, drawn. Its colour is derived too: ask
`getPrimeRGB` what 7 *would* be if selected, and the palette answers.

Regenerate everything with `node tools/logo/build-assets.mjs <outdir>`, then
rasterise. **Rasterising has two traps, both of which shipped a broken icon
before they were understood** — see §4.

**That `math.js` imports nothing is now load-bearing twice over**: it is what lets
the checker measure palettes headlessly, and what lets the logo be generated from
the product's own code. Do not give it an import.

**Four things worth carrying forward:**

- **Colour is additive only where addition is the CLAIM.** `rgb` keeps summing,
  because 2 red plus 3 green really is 6 yellow. Every other palette blends in
  OKLab: cyan is already `(0, 0.9, 1)`, so adding anything with red in it makes
  white — and most numbers are composite, so the figure went pale. Measured
  before the change, cyberpunk's composites carried chroma 16/21/28 against RGB's
  90/107/46. The honest limit is that no rule escapes: three well-separated
  factors go neutral under blending exactly as they go white under addition.
- **"Colourblind-safe" is a measurement, not an intention.** `tools/cvd.mjs`
  simulates the three deficiencies and scores a palette by its CLOSEST pair.
  `SAFE_PALETTES` is held to 10 dE and a 12° hue floor, and it caught a grey I
  had substituted into Okabe-Ito colliding with reddish purple at 5.7 dE.
- **Two shades of one hue are one colour.** dE counts a lightness difference as
  distance, which is right for "can you tell these apart" and wrong for "are
  these different colours". Hence the separate hue floor — it is what found two
  purples sitting at the same hue angle in the first cyberpunk draft.
- **A native `<select>` popup and a native colour input belong to the operating
  system.** Neither can be styled and an `<option>` holds only text. Both are
  drawn by the app now, over the real controls, which stay the source of truth —
  so `.value`, Reset and the checker's markup scan all still work.

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
| `schuckdata.com/pretty-number-machine/v1/` | `v1.0.0-dev.7` | The **v1 build**, feature-complete. `noindex`. **Frozen.** The Android app was built from this during the Capacitor spike and is NOT any more — step 2 gave the app its own copy at `www/`, which `capacitor.config.json` points `webDir` at. `v1/` is its ancestor, not its source |

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

**Two open jobs that need nobody but whoever picks this up:**

4. **The contrast pass.** The figure does not adapt to its background, and the
   light backgrounds are unusable because of it. Measured against `paper`:
   four of the seven default node colours sit under 1.6:1, and the gilding gold
   under 2:1 — **so the trophy room is invisible on a light ground.** Blue is
   weak on the dark ones too, at 1.99:1. `ensureContrast()` already exists, is
   already tested, and is documented as making "the least change that makes it
   legible" while keeping the hue — it is simply never applied to the FIGURE,
   only to the panel's prime buttons. It needs applying against the ACTIVE
   background, plus a companion that darkens rather than lightens for the light
   ones. Deliberately deferred by Dakota, who wanted the options first.
5. **The frozen web copies still carry the old icons.** `/` and `/v1/` show the
   RGB-Venn mark while the app shows the braid. Changing them means touching a
   frozen build AND bumping `CACHE_VERSION`, or visitors keep the old icon
   indefinitely — trap #3. Dakota's call, since "frozen" was a decision.

### One open defect: the shimmer invites a hidden button

Found 2026-08-25 while reading, **not yet fixed and not yet seen on a device.**
`shimmerOnce()` in `ads.js` animates `#ads-btn`, which was the corner's ads
control when the shimmer was written. The tray made `#ads-btn` the *addition
product* button and put it behind the `+s` door, where `index.html` gives it
`display: none` unless `body.ads-tray-open`. So the invitation now fires on an
element the player cannot see, except in the one state — tray already open —
where they have plainly found the shop and need no invitation.

The fix is almost certainly one line, retargeting the shimmer to `#ads-menu-btn`,
the door. Two things to decide with it: whether the schedule should also stop
while the tray is open (a shimmering door the player is already looking through
is noise), and whether owning `ads-addition` is still the right stop condition
now that owning it reveals a *second* thing to buy.

`check-ads.mjs` did not catch this — it asserts the two cadence constants, not
what they animate. It is the same shape of miss as the CSS specificity bug in
§1b: **a grep proves the code was written, not that it reaches the screen.**

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
| Distribution model | **Free**, with **two sellable non-consumable** in-app products, and a third announced but not sold | Revised 2026-08-23 from a single $0.99 unlock. An app ever offered free can never become paid. Free is the deliberate choice, so the one-way door is irrelevant — but it is a door |
| The products | **$0.99 addition ads, $4.95 multiplication ads**, plus **`^` announced and never sold**. Advertising AS the product: you pay to be shown commercials for mathematical operators. None grants an achievement | The satire is the point. No ad SDK, no network, no consent framework, ever. Two store ids go in the console, not three — `^` has none. `docs/ADS.md` §1b |
| The shop's shape | **A ladder behind one door.** `+s` opens a tray; each tier is the key to the next | Revised 2026-08-25 from three permanent corner buttons. The chain is data (`requires`), not code |
| Purchases and achievements | **Purchases grant nothing.** All 101 stay earnable by playing | Arithmetic, not principle: UNITY! needs all-but-one, and that slack is UNITY! itself, so any paid achievement paywalls the capstone |
| Achievements | Local ledger is the source of truth; PGS is the public record and cross-device copy | Works offline and signed out. See `ANDROID-BUILD.md` §3 |
| Achievement visibility | **Tutorial (16) publishes Revealed; the other 85 publish Hidden** | Decided 2026-08-23. Hidden criteria are what let hunters collaborate on the clues rather than read the answers. Near-permanent once the console is told. `ACHIEVEMENTS.md` §12 |
| Identity | Never build accounts. No server, no database | Play holds purchases, PGS holds achievements and saves. Referral/invite features were cut for exactly this reason |
| Listing category | Games → Educational | PGS requires a game; hunters find games |
| Shell | **Capacitor 8** | Targets API 36. Not TWA, not PWABuilder |
| Public address | The owner's home address | It is the business address; merchant accounts display it. Known and accepted |
| The default look | **Cyberpunk palette on the navy background** | Chosen 2026-08-25. Cyberpunk is colourblind-safe by MEASUREMENT — 16.9 dE and 34° between its closest hues, against okabe-ito's 10.9. Both are one option away from each other. The default lives in three places (`DEFAULT_CONFIG`, the `selected` attribute, Reset) and the checker pins all three |
| The logo | **The braid, generated from `math.js`** | The mark follows the default palette, so the icon and the first launch agree. The accent at 7 is derived, not chosen: 7 is the gap the two primes leave, and `getPrimeRGB` answers what colour it would be |
| How composites mix | **Additive for `rgb`, perceptual (OKLab) for everything else** | `rgb` keeps addition because there the addition IS the claim. Anything else adds to white, and most numbers are composite |
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

**Bind a drag's RELEASE to the window, not to the element it started on.**
`physics.js` registered `pointerdown` on the canvas with capture — correct, a
drag must start on the figure — but also `pointermove` and `pointerup` on the
canvas, and no `pointercancel` at all. Release the pointer anywhere else (the
transport bar, a corner control, the panel, off the screen edge) and
`onPointerUp` never fires: `draggedNode` stays set for the rest of the session,
the node is pinned off its rest position, and the figure twitches forever.
Nothing clears it — **not even a scene rebuild**, because `build()` never
touches `draggedNode`. `info.js` and `lens.js` both already did this correctly;
physics was the only one of the three that did not. Diagnosed 2026-08-25 and it
had a second symptom nobody had connected to it: `onPointerDown` sets
`controls.enabled = false` and only `onPointerUp` restores it, **so a lost
release also freezes the camera.**

**Near-zero NET force does not mean "at rest".** It is equally true at a
DISPLACED equilibrium, which is what every neighbour of a held node settles
into. The settle test snapped such nodes home on force alone; their springs
hauled them straight back out; ~4.7 teleports per frame across a 22-node
figure. Any "has it stopped" test needs a DISTANCE as well as a force.

**A control marked `hot: true` still rebuilds unless its key is in `HOT_KEYS`.**
The flag on the control routes the change through `update()`; `update()` rebuilds
the scene for any key it does not find in that set. `_physicsTouch` and
`_physicsCollision` declared hot and were absent from the set, so each flick
disposed and recreated every mesh — 312 ms at N=1000 — and silently wiped
physics' offsets. **The two halves must agree and nothing checks that they do.**

**A module that silently does nothing has thrown inside an event handler.**
`core/state.js`'s `emit()` wraps every listener in `try/catch` and logs to
`console.error`, so the emit returns perfectly normally and the page looks fine
while the feature is simply absent. Invisible from DevTools' own evaluation, one
line in `adb logcat | grep Capacitor/Console`. Cost half an hour on 2026-08-24;
check it first, not last.

**Rasterising the logo has two traps, and each shipped a broken icon.**
*Chrome's `--screenshot` honours a minimum window size*, so anything under about
128px came back clamped and blank — the xhdpi launcher icon shipped as a white
square, and the tell was arithmetic, not visual: 96px at 299 bytes where 48px was
1433. Use CDP's `Page.captureScreenshot` with an explicit clip, which has no
floor. *And CDP composites onto opaque WHITE unless told otherwise* — the
adaptive foreground must be transparent, and an opaque one covers the background
layer completely, which put the mark on a white circle while the APK provably
held `#0A1226`. `Emulation.setDefaultBackgroundColorOverride` with `a: 0` is the
fix. Both were caught by a size floor and a framebuffer sample; neither was
visible in a thumbnail. Verify every render against a size floor and refuse a
thin one.

**A tool that navigates to a file it does not write will silently render an
error page.** The asset rasteriser navigated to `<name>.html` assuming an earlier
step had left one behind. In a fresh directory every shot was Chrome's
broken-image page — and at 512px that page is large enough to pass the size
floor, so 15 of 21 reported ok and only the small ones failed. A check that
passes for the wrong reason is worse than no check.

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
| A colour palette, or a background | `core/math.js` → `PALETTES` and `BACKGROUNDS`. They live in the one module that imports nothing so `tools/check.mjs` can load them headlessly and measure them |
| Whether a palette may claim to be colourblind-safe | `core/math.js` → `SAFE_PALETTES`, held to ≥10 dE by `tools/cvd.mjs`, which simulates protanopia, deuteranopia and tritanopia. okabe-ito sits at 10.9, cyberpunk at 13.8 |
| How a dropdown looks, or what its options preview | `core/dropdown.js` |
| Ad copy, prices, palettes | `modules/ads-data.js`. **Read `ADS.md` §1a first** |
| Which ads button appears when, or adding a fourth tier | `modules/ads-data.js` → `order` and `requires`. The chain is data; `ads.js` reads it. **`ADS.md` §1b** |
| The tray opening, closing, or what dismisses it | `modules/ads.js` → `TRAY_OPEN`, `trayIsOpen()`. Show/hide is CSS in `index.html`, scoped through `#corner-stack` because specificity bit once |
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

**Line counts are `www/`**, the living codebase. They were `v1/`'s until
2026-08-25 and had drifted far enough to mislead — `renderer.js` is 1789 lines
here and 1310 there, and `notices.js` is SMALLER because the app build dropped
the update prompt. If a count looks wrong, run `wc -l www/core/*.js
www/modules/*.js` rather than trusting this table.

**Core** — always loaded, no crash isolation.

| File | Lines | Owns |
|---|---|---|
| `core/renderer.js` | 1836 | Three.js scene construction, the animation loop, camera, disposal, context-loss recovery. The big one |
| `core/panel.js` | 1204 | The side panel: control construction, wiring, Reset, Dazzle. Coupled to the markup by `id` |
| `core/math.js` | 624 | Pure functions. Primes, factorisation, colour, visibility rules, **the palettes and the backgrounds**. **No Three.js — and no imports at all**, which is what lets `check.mjs` and the logo generator load it |
| `core/transport.js` | 214 | The play/pause/scrub bar and its speed mapping |
| `core/positions.js` | 358 | The shape registry and `interpolatedPos()`. Owns how shapes blend |
| `core/state.js` | 258 | `DEFAULT_CONFIG`, the mutable `state` singleton, the event bus, the module registry, reduced-motion defaults |
| `core/debug-hud.js` | 122 | `?debug` overlay. Self-contained |
| `core/sheet.js` | 131 | Phone bottom-sheet position and drag. Owns *where the sheet sits*, never what is in it |
| `core/dropdown.js` | 166 | The dropdown the app draws itself. A native select's POPUP belongs to the OS and an `<option>` holds only text, so colour schemes and backgrounds could not SHOW their colours. Enhances a real `<select>`, which stays the source of truth |
| `core/slider.js` | 124 | Sliders that do not steal a scroll. Range inputs are `pointer-events: none` and this drives them; touch needs a horizontal drag, a mouse keeps click-to-position. See §4 |
| `core/notices.js` | 121 | The fatal error boundary. **Imports nothing** — it must work when the rest has failed. The update prompt is GONE in the app build: no service worker, and Play announces its own updates |

**Feature modules** — dynamically imported, crash-isolated. One that throws is
disabled and the app carries on. The achievements and fake-ads modules will be
two more of these.

| File | Lines | Owns |
|---|---|---|
| `modules/physics.js` | 726 | Drag and spring simulation. The only module that **writes** node positions |
| `modules/info.js` | 424 | Tap/right-click a node for its maths. Owns the tooltip |
| `modules/lens.js` | 828 | The classroom lens: chalkboard layer, projected HTML labels, tap-for-info, **and the decomposition view** |
| `modules/achievements.js` | 1699 | The ledger, predicates, panel section, toast, sound, gilding paint. See `ACHIEVEMENTS.md` |
| `modules/ads.js` | 738 | Entitlement, paywall, slideshow, **the `+s` door and the tray**, the operator buttons and their `requires` gates, the announced tier's sheet, the intrusion banner, the shimmer schedule. See `ADS.md` |
| `modules/ads-data.js` | 345 | The three products (two sellable, one announced), the `requires` chain, `isSellable()`, the palettes and every word of the slide copy. **No Three.js, no DOM** — checkable headlessly, which is the point, because copy is what rendering tests cannot judge |
| `modules/achievements-data.js` | 963 | The number sets, definitions, gilding rule and reference links. **No Three.js** — checkable headlessly |
| `modules/achievements-ledger.js` | 120 | The ledger and its merge contract, lifted out on 2026-08-24 **so it can be tested at all** — it is the only part of the achievement layer that loads headlessly |
| `platform/index.js` | 326 | The native adapter and the store-id map. Not a module; imported by achievements.js |

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

**A slider in a scrolling panel needs `touch-action: pan-y` — AND THAT IS ONLY
HALF OF IT.** `pan-y` stops the slider capturing a vertical drag, which it does
correctly, and it is what fixed the 209-degree false bug report below. It does
NOT stop the other half: a range input sets its value on touch-DOWN, jumping the
thumb to wherever the finger landed. Resting a finger on a slider to begin
scrolling teleports the value before any direction has been expressed. That is
the bug Dakota kept hitting long after `pan-y` was in, and it is why the fix
looked complete and was not.

**It cannot be prevented.** Probing the live events on a Pixel 7:

```
pointerdown  cancelable=true   pointerType=touch  defaultPrevented=true
touchstart   cancelable=false
```

`preventDefault()` on pointerdown runs and changes nothing, because the value is
set on the touchstart path — and Chrome makes touchstart NON-CANCELABLE
precisely because `touch-action` has already declared panning is allowed. There
is no event left to cancel. Note also that no synthetic gesture reproduced it —
adb swipe, CDP touch events, a scripted thumb-arc — while a real thumb hit it
every time, so it read as absent for a long while.

The fix is **`core/slider.js`**: range inputs get `pointer-events: none` and the
module drives them. Touch requires a horizontal drag; a mouse keeps
click-to-position. **And `pan-y` has to MOVE to the parent** — with the input out
of the pointer path the touch lands on its container, and a container at the
default `touch-action: auto` lets the browser claim the horizontal gesture and
fire pointercancel ten pixels into a drag.

Worth remembering how the original surfaced: it produced a false bug report. A
screenshot taken after an accidental drag showed the divergence angle at 209°,
which looked exactly like a wrong default, and the wrong thing was very nearly
"fixed".

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
| `tools/check.mjs` | Precache paths exist, `CACHE_VERSION` matches `CACHE_PREFIX`, the UI version label agrees, no hardcoded frame step, prime colours reach 4.5:1 — and since 2026-08-25 the colour controls: every background option resolves to a `BACKGROUNDS` entry and every scheme to a palette, no palette repeats a colour, the default scheme AND background each agree across `state`, the markup and Reset, and any palette in `SAFE_PALETTES` clears 10 dE and a 12° hue gap under simulated protanopia, deuteranopia and tritanopia |
| `tools/cvd.mjs` | Not a checker — the CVD simulation and perceptual distance the palette assertions are built on. Viénot-Brettel-Mollon |
| `tools/check-achievements.mjs` | The number sets, the gilding and payoff rules, the ledger's merge contract, no two achievements declaring the same selection, nothing true at the defaults, the published Revealed/Hidden split, and the reference links including a content-rating denylist. Count lives in `ACHIEVEMENTS.md` §11, in one place only |
| `tools/check-ads.mjs` | Every deck whole, prices agreeing with themselves, **the pitch not giving the joke away**, no development bypass that entitles without a purchase, the two shimmer cadences, the ladder's shape (one root, no cycles) and the announced tier staying unsellable |

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
| `ANDROID-BUILD.md` | **The plan.** Repo changes, web-side design, native plugins, build and console sequences, open decisions | Current. §5 steps 1–3 done and **6's icons done**; **4 (PGS) and 5 (billing) not started**. §9 is the trap list and is worth reading first |
| `ADS.md` | **The ads layer.** The register the copy must hold, the products, the reveal the paywall withholds, the entitlement rule, the corner-controls collision history, and **§1b for the door, the tray, the ladder and the announced tier** | Current, 2026-08-25 |
| `ACHIEVEMENTS.md` | **The achievement layer.** The gilding rule, the payoff rule (§2a), clue craft, the accordion, what an earned row shows (§13), **how OOPS! was re-measured and calibrated (§13a)**, the traps (§8), and what is still open (§14) | Current, 2026-08-25. Describes **v7 as built** |
| `CODE-NOTES.md` | The two comment layers in `www/` — `DEV:` for implementation, `EDU:` for the mathematics — and where the mathematics actually lives | Current, 2026-08-15 |
| `achievements-v6.xlsx` | The v2 list, as it stood before v7 | **History.** `achievements-data.js` is authoritative now — see `ACHIEVEMENTS.md` §10. For the current list, run `tools/achievements-table.mjs` |
| `achievements-v7-proposal.xlsx` | The v7 design record: all 101 assessed against the rubric, the drops, the additions, the rejections, and the cluster-balance argument | A record, not a source. Generated from the code; nothing reads it back |
| `PLAN.md` | The charter, the project's history and reasoning, the gotchas learned building the web app | History. Predates v1; its Burst 6 (TWA via Bubblewrap) is superseded |
| `V1-PLAN.md` | Why each v1 change was made; which performance claims were measured versus judged | History. All items closed. Its references to a paid TWA are superseded |
| `archive/PLAY-STORE-HANDOFF.md` | The TWA / paid-app plan, in full | **Superseded 2026-08-15.** Kept for the asset-links and Play-deadline reasoning only |
| `archive/BURST-1-BRIEF.md` | Early history | History |

If these disagree with this document, **this document is newer**. If it
disagrees with the code, the code is right and this should be fixed.
