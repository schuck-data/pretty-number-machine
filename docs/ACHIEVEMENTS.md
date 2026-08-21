# Achievements — design and implementation

**Written:** 2026-08-21. **Status: built, working, and verified on a Pixel 7 and
a Pixel 9.** Not yet connected to Play Games Services — that is
`ANDROID-BUILD.md` §5 step 4.

This document is the design record. **The code is the source of truth**;
anything here that disagrees with `www/modules/achievements-data.js` is wrong
and should be fixed here. `docs/achievements-design.xlsx` is **history** — it
was the working surface while the list was being designed and it predates the
final gilding rule, so do not read numbers out of it. To get the current copy as
a table, run `node tools/achievements-table.mjs`.

---

## 0. What exists

Forty achievements, 1,800 of the 2,000 XP Play Games allows, 200 held in
reserve. All earnable offline and signed out. Nothing is time-limited, nothing
needs a second player, nothing is unobtainable.

| File | Owns |
|---|---|
| `www/modules/achievements-data.js` | The number sets, the definitions, and the gilding rule. **No Three.js, no renderer** — so it can be checked headlessly |
| `www/modules/achievements.js` | The ledger, the predicates, the UI, the toast, the sound, the gilding paint |
| `www/platform/index.js` | The adapter. Store IDs live here and nowhere else |
| `tools/check-achievements.mjs` | 71 assertions, in `npm run check` and CI |
| `tools/achievements-table.mjs` | Exports the copy as TSV or JSON from the live data |

Achievements are **opt-in**: nothing is recorded until the player turns them on,
and turning them on is FIRST!. That is a design choice, not a privacy hedge —
FIRST! has to be earnable, and it cannot be if tracking was already running.

---

## 1. The gilding rule

This is the heart of it and the part most worth understanding before changing
anything.

**Every achievement gilds NODES. Nothing gilds a prime directly.**

A node goes gold two ways:

1. **Directly** — some enabled achievement lists it in `gildNodes`. This is the
   only way to reach a node carrying a prime factor above 131, since no amount
   of prime-ownership can touch those.
2. **By derivation** — every prime in its factorisation is *owned*. Not any,
   every. Owning 2 lights 2, 4, 8 and 16, but not 6, which also needs 3. A
   number is yours when you own everything it is built from — the same claim the
   app already makes about colour.

**Owning a prime is a CONJUNCTION.** A prime becomes owned only when *every*
achievement that gilds it has been earned and is enabled. Prime 11 is gilded by
LUCAS!, TWINNING!, COUSINS!, SEXY!, GERMAIN! and LOUDER!, so all six are needed.
Each on its own merely lights node 11; nothing derives.

**Lines follow ownership.** A prime's parastichy curve goes gold when that prime
is fully owned. Two things this depends on that are easy to miss: a curve only
exists for a **selected** prime, so the trophy room selects the owned ones; and
the colour must be re-asserted every frame, because the renderer rewrites every
line's colour from `liveColor` and then applies a thickness fade.

**Three deliberate exceptions.** Node 0 is the Sun and never gilds. Node 1 has an
empty factorisation, so the rule would light it for free — it is reachable only
by UNITY!. And UNITY!, once earned and switched on, is a master override: every
lit prime becomes owned regardless of its conjunction.

### Why the conjunction exists

The first design let a family *own* its primes outright. Measured in a browser:
**TWINNING! + SEXY! + GERMAIN! — three achievements, six taps — owned 31 of the
32 primes and lit 715 of 726 gold nodes.** Ninety-eight per cent of the finished
board from three of forty, with the other thirty-seven worth eleven nodes
between them.

The spreadsheet could not have shown this. It had per-achievement counts; the
problem was in the *union*, and only appeared once the thing was running.

Under the conjunction those same three light 145 of 853 — seventeen per cent —
and own exactly one prime. **`tools/check-achievements.mjs` asserts that number.
If it ever climbs back into the hundreds, the regression is back.**

A pleasant consequence nobody designed: route counts run from two to seven, and
it is the *small* primes that need the most. So the thin primes (59, 127) fall
early and 2, 3, 7, 11, 13 come last. The board floods near the end, when a long
conjunction finally closes.

### SERIES vs FAM

Two sets per family, and the distinction is load-bearing.

- **`SERIES.x`** — every prime up to 1000 with the property. This is what gets
  **gilded**. A series lights all of its members that fit on the figure.
- **`FAM.x`** — the members inside the 32-prime selectable grid. This is what
  **triggers** an achievement, because a predicate like `isExactly()` can only
  ask for primes a player is able to switch on.

Computing the property over the full range also corrects which *in-grid* primes
qualify, and that is a fix rather than a side effect. 131 **is** a sexy prime —
137 is six away and prime — but the old within-the-grid definition denied it
because 137 is the one prime the panel does not offer. Same for 107 and 113 as
emirps: 701 and 311 are prime, they were merely out of view. **The property
belongs to the number, not to the user interface.**

### The picture at N = 1000

| | count |
|---|---|
| Gold, everything earned | 853 |
| Dark | 146 |
| Reachable only by a direct gild | 131 |
| Node 1 | UNITY! alone |
| Node 0 | the Sun, never gilds |

---

## 2. The trophy room

The cup in the top-right corner, beside Reset and Dazzle, and the same kind of
control: one tap, the whole figure changes. **Destructive** — it assigns the
knobs and does not stash what it replaced, exactly as Dazzle does.

It **resets first**, then applies. Without that it inherited colour scheme,
filters, glow, the divergence angle and the camera from whatever the player was
looking at, and no two trophy rooms looked alike. It reuses `#reset-btn` rather
than a private copy of the reset, because reset writes ~40 DOM values by hand
and also calls `resetMorph()` and `resetCamera()` — and "reset does not reset
everything" has been a bug here twice.

| Knob | Value | Why |
|---|---|---|
| N | 1000 | The measured point. Sits exactly on the physics cap, so the module-cap machinery never fires its synthetic DOM events |
| All integers | on | The dark field has to be visible or the sieve does not read |
| Selected primes | the owned ones | A curve only exists for a selected prime, so an owned prime with its button off has no line to gild |
| Shape | 1.60 | Nearly a sphere, nudged toward the disk |
| Morph | off | The rotation is the movement here |
| Auto-rotate | on, 0.15 | On display |
| Node size | **0.6, claimed last** | Every prime click re-runs the panel's auto-size derivation. See §4 |
| Line width | 0 | Hairline. Gilded lines are distinguished by colour alone |
| Gilding | on | |

Gilding works **outside** the room too, off by default, toggled in the panel.

---

## 3. How an achievement is detected

Four kinds of signal, and they are not interchangeable.

| Trigger | Mechanism |
|---|---|
| `state` | A config value. Swept on `stateChange`, on `build`, and by a 5 Hz backstop in `animate()` |
| `dom` | A real gesture on a named control, guarded by `event.isTrusted` |
| `sampled` | Polled in `animate()` — the morph and the physics resonance |
| `event` | A bus event. Only `physics:dragStart`, added for OUCH! |
| `derived` | Computed from the ledger. UNITY! only |

**`event.isTrusted` is what makes "manually" mean something.** Programmatic
`.value` and `.checked` assignment fires nothing at all, and anything from
`dispatchEvent()` has `isTrusted === false`. So Dazzle, Reset and the trophy
room can set forty controls without awarding anything. Verified: pressing Dazzle
turns on all-integers, sets node size and selects every prime, and awards only
TRIPPY! — which was the click itself.

There is one place in the codebase that dispatches synthetic events —
`panel.js` around lines 469–494, the module-cap machinery at high N. Without the
`isTrusted` guard the app would hand itself achievements every time N crossed
1000.

---

## 4. Traps found the hard way

Each of these cost a debugging round. They are here so the next one does not.

**`stateChange` is not a reliable signal that state changed.** `core/panel.js`
`scheduleRebuild()` assigns about fifteen keys onto the `state` singleton
directly and calls `buildScene()` itself, never going through `update()`.
Selecting primes, moving N, any filter — none of it emits. Measured: choosing
`{11}` gave `state.primes === [11]`, one `build` event, and **zero**
`stateChange` events. Hence the 5 Hz backstop, which is the only one of the
three sweeps a future writer cannot forget.

**Invalidate the gild cache BEFORE announcing.** `unlock()` emitted
`achievement:unlocked` first, so every listener repainted against a cache
computed without the achievement that had just fired. It read as "1 of 40
earned, 0 numbers gilded".

**A newly earned achievement must join the display set.** `getEnabled()` returns
`enabledOverride ?? all unlocked`. The moment anything touched the selection —
one checkbox, or Show all / Show none — that override became a fixed snapshot
and never grew. Everything earned afterwards was invisible: no gilding, and no
contribution to the ownership conjunction. It presented as *"I just unlocked
TWINNING! and still no lines."*

**Node size must be claimed LAST, and by dispatching `input`.** The panel derives
node size from N until the user touches the slider, and every prime click
re-runs that derivation. Assigning `.value` does not set the panel's private
`nodeSizeUserSet` flag, so the auto curve takes the value straight back. It was
landing on 0.4 instead of 0.6.

**Curve colour and the per-frame fade.** The renderer rewrites every line's
colour from `liveColor` and then applies a thickness fade which, at line width
0, multiplies everything down to 0.05 brightness. Gold written at build time is
black a frame later. Module `animate()` runs after that pass and before
`render()`, which is the one place the value survives.

**The Cowork browser pane never runs the render loop.** Measured: **zero
`animate()` calls in 700 ms.** Nothing depending on a frame — gilded lines, the
focus highlight, labels, anything sampled — can be judged there. Verify on
device. Also: opening the preview at the site root registers the *shipped*
build's service worker at scope `/`, which then swallows `/www/`. Unregister it
before concluding anything.

**Installing wipes the ledger.** `adb install -r` does not clear the WebView's
HTTP cache, so `pm clear` is necessary — and it takes the ledger with it. To
preserve real progress across an install, read `pnm-achievements-v1` and
`pnm-platform-save-v1` out over CDP first and write them back after.

---

## 5. Open questions

Nothing here blocks step 4.

**Design**

- **NIGHT! is on 354 as a placeholder** — the lunar year. "Obviously lunar" and
  "rescues a dark node" barely overlap; 354, 384 and 235 are all smooth, and the
  only lunar orphan found was 709 (the synodic month in hours), which rounds.
- **SEXY! has no home prime.** Every other family has one for its icon. 29 or 61
  suggested.
- **HAPPY! is the only pure memory test.** Nine primes with no relationship to
  spot — you either know them or you look them up. Every other family is a short
  roster or a two-tap relationship.
- **LOUDER!'s condition does not use its joke.** "These go to eleven" triggers on
  selecting 11. Line width maxes at 12, so a maximum-related condition would land
  better.
- **15 of 40 gild nothing** — the general group. The trophy room does not change
  when you earn them. By design, but if every achievement should move the
  picture they need gild sets.
- **NEAT! and the 89 line.** The brief said unlocking NEAT! should gild 89's
  parastichy. Under the conjunction it takes all four of 89's routes —
  FIBONACCI!, SEXY!, GERMAIN!, NEAT!. Decide whether NEAT! is an exception.

**Play Console (§6 work)**

- **Standard or hidden?** Play Games shows a *standard* achievement's description
  to players before they earn it. The in-app list deliberately shows the title
  and nothing else while locked, so standard achievements would undo that on the
  player's Play Games profile. Hidden fixes it but hunters dislike a mostly
  hidden list. **Decide before creating them in the console.**
- `criteria` exists on every definition for this reason and is rendered nowhere
  in-app. Do not tidy it away.

**Engineering**

- **The untestable half.** The gilding *rule* is checked headlessly because
  `achievements-data.js` is free of Three.js. The ledger and display-set logic
  live in `achievements.js`, which imports the renderer and cannot load in Node —
  and **two of the bugs above were in that half**. If a third appears, lift the
  ledger and enabled-set into a third Three-free file so it can be tested.
- **CEILING! costs real frames.** N=10000 measures 26.7 fps on a Pixel 7 and
  34.6 on a Pixel 9, against 90/120 everywhere below N=2500. It is an
  achievement that deliberately sends players there.
- **The app's toggles are invisible to assistive technology.** Every one is a
  zero-size checkbox behind a styled track, so the accessibility tree shows
  nothing. Pre-existing across the whole panel, not new — but worth a pass
  before any Play accessibility review.
- **No toast/sound settings persist.** Sound defaults on and resets each launch.

---

## 6. Checking it

```bash
npm run check
```

Runs `tools/check.mjs` and `tools/check-achievements.mjs` — 71 assertions over
the number sets, the definitions, the store-id map, prime reachability, the
finished picture, and the conjunction guard. Dependency-free, in CI.

```bash
node tools/achievements-table.mjs        # TSV
node tools/achievements-table.mjs --json # JSON
```

The current copy — name, criteria, hint, subtitle, blurb, and what each gilds —
generated from the live data so it cannot drift.
