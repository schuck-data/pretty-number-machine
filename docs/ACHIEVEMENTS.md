# Achievements — design and implementation

**Written:** 2026-08-21. **Revised 2026-08-23**, when the list was redesigned
from forty achievements to a hundred and one, and again later that day when the
two open Play Console decisions were settled — see §12. **Revised 2026-08-24
for v7**, which kept the count at 101 and changed what the list is made of.

> **v7, in one paragraph.** Three achievements were dropped (CEILING!,
> MERSENNE!, WHOLE!) and three added (DECOMPOSE!, GALLERY!, TEMPTED!), holding
> the total at 101 and the XP at 2000. Five gild sets were widened so the payoff
> is no longer identical to the selection that earned it — the rule is now
> asserted, see §2a. Two clues that could only be solved by arriving with the
> answer were rewritten. Every achievement that needs one gained a **reference
> link**, and every unlocked row now shows its **criteria**. §13 covers the
> three UI changes and why the trophy room did not become automatic.

> **Read this first.**
>
> **v2 and v7 are both built and verified on a Pixel 7.**
> A hundred and one achievements in a tree, no conjunction, declarative
> triggers, the accordion. Landed 2026-08-23 and shaken out on the device the
> same day: unlocks, the ledger, the banner, the highlight, the labels, the
> accordion, the accessibility pass. `npm run check` now covers it with **72
> assertions**.
>
> **v7 was shaken out on a Pixel 7 on 2026-08-24**, build `v1.0.0-dev.8`, with
> real touch events rather than dispatched ones — `adb shell input tap` produces
> genuine MotionEvents, so `isTrusted` holds and the dom-triggered achievements
> are actually being tested. DECOMPOSE!, GALLERY! and TEMPTED! each fired from a
> finger; all 101 rows render; **no locked row leaks its criteria, its link or
> the trophy button**; the toast carries criteria and is tappable even for the
> twelve with no blurb; the trophy-room button applies the §9 preset and leaves
> the row open; and a reference link opens Chrome with the app still behind it.
>
> One bug was found by opening the app and by nothing else: `achievement:unlocked`
> did not carry `criteria`, so the toast rendered the literal string
> "undefined". Every check was green. There is now a source tripwire asserting
> the payload carries every field the toast prints.
>
> **Published visibility is decided: Tutorial Revealed, everything else Hidden.**
> §12 has the reasoning, and it is the kind that is hard to reconstruct.
>
> **The decomposition view's RENDERING now exists.** `renderer.js` exports
> `buildRunShapes()` and `lerpRunShapes()` — a partial parastichy curve, the
> stretch of a prime's family from p up to n, built the same way the real
> curves are and lerped across the morph. `modules/lens.js` already draws with
> them for tap-to-decompose (2026-08-24). **The gilded version in §2 is now a
> matter of calling them with the gild set**, not new rendering work.
>
> **Everything visual has to be judged on a phone.** The render loop does not
> run in a desktop preview pane (§8), and six separate bugs in this layer were
> invisible until the app was on hardware with a real ledger behind it. Do not
> believe a browser about anything that paints.
>
> **`achievements-data.js` is now the authoritative list**, and the two-sources
> problem in §10 is settled by that. `docs/achievements-v6.xlsx` describes v2
> and is history. `docs/achievements-v7-proposal.xlsx` is the design record for
> this revision — what changed, what was rejected, and why — and it is a
> record, not a source: it was generated FROM the code and is not read back.

Where this disagrees with the code, the code is right and this should be fixed.

---

## 0. Status

| | v1 — replaced | v2 — built 2026-08-23 | v7 — built 2026-08-24 |
|---|---|---|---|
| Count | 40 | 101 | **101, different membership** |
| XP | 45 each, 1800 of 2000 | 15 each, UNITY! takes 500 | unchanged |
| Payoff | gild = whatever was named | gild = whatever was named | **gild ≠ selection, asserted (§2a)** |
| Explanation | blurb | blurb | **blurb + criteria + reference link (§13)** |
| Published | n/a | 16 revealed / 85 hidden | **18 revealed / 83 hidden** |
| Grouping | flat list | tree: Tutorial · Math · Culture · Capstone, eleven clusters |
| Gilding | direct + derivation, gated by a conjunction | **direct only. No derivation until UNITY!** |
| Trigger | ad hoc per achievement | **factor selection, dialling, or a stated relationship** |
| Hints | a sentence each | **crossword clues** |
| Locked rows | show the hint, not tappable | **show the clue and nothing else** |
| Play Console | n/a | **Tutorial Revealed, the other 85 Hidden** (§12) |
| Node reuse | one achievement per node | **many achievements may gild the same node** |

| File | Owns |
|---|---|
| `www/modules/achievements-data.js` | The number sets, the definitions, and the gilding rule. **No Three.js, no renderer** — so it can be checked headlessly |
| `www/modules/achievements.js` | The ledger, the predicates, the UI, the toast, the sound, the gilding paint |
| `www/platform/index.js` | The adapter. Store IDs live here and nowhere else |
| `tools/check-achievements.mjs` | **72 assertions**, in `npm run check` and CI |
| `tools/achievements-table.mjs` | Exports the copy as TSV or JSON from the live data, including the Play Console `initial_state` column. **Proofread the console paste here.** Rewritten 2026-08-23 for the v2 field names, having quietly thrown since the rebuild; now runs in CI so it cannot rot again |
| `docs/achievements-v6.xlsx` | The v2 list. **History** — superseded by the code |
| `docs/achievements-v7-proposal.xlsx` | The v7 design record: every row assessed, drops, additions, rejections |

Achievements are **opt-in**: nothing is recorded until the player turns them on,
and turning them on is FIRST!. That is a design choice, not a privacy hedge —
FIRST! has to be earnable, and it cannot be if tracking was already running.

---

## 1. What v2 changes, and why

### The conjunction is dropped

v1's rule: a prime became *owned* only when every achievement that gilded it had
been earned, and owned primes derived their multiples. That existed to solve one
specific measured failure — under the first design, TWINNING!, SEXY! and
GERMAIN! between them lit 715 of 726 gold nodes in six taps.

v2 solves the same problem more directly: **nothing derives until UNITY!.** A
node is gold if an earned achievement names it, full stop. The flood happens
once, at the capstone, deliberately.

That leaves the conjunction with no job. It goes, and with it `primeRoutes()`,
`ROUTES`, `ownedPrimes` and the UNITY! override.

**Consequence worth knowing:** prime-selection triggers no longer cost anything.
Under v1, adding a series that named small primes lengthened their conjunctions
and made the whole board close later. Under v2 that coupling is gone, so
achievements are chosen on interest alone.

### The trigger must be the idea, performed

The rule that shaped the Math branch. A clue you can solve by looking at the
panel, not by arriving with the answer already.

TWINNING! passes: the clue states a relationship, and finding two primes with
one even number between them *is* the mathematics. "Set the range to 720" fails
— even knowing 720 is 6!, typing it into a slider is entering a password.

Twelve achievements were cut on this test, including every set-the-range one.
**Their mathematics did not die, it moved into blurbs** on achievements that can
be discovered. The divisor-parity insight from the cut SQUARES! and the
six-neighbours argument from the cut SIXES! both survive that way.

### Dialling rescues the range trigger

The one place setting the range means something: **a phone number is a thing you
dial.** The Dial cluster uses it, and the mechanic works there because it maps to
the fiction rather than being arbitrary.

It also dissolves the factor constraint. A dial does not care what a number
factors into, so area codes that no selection could reach — 313 above all —
became available.

### Three trigger mechanics, in order of preference

1. **Relational** — "two primes six apart". The clue alone is sufficient. Best.
2. **Factor selection** — select exactly the distinct prime factors of the node.
   The default on the Culture side. Discoverable *because of the preview*: the
   locked row shows you the node, and factoring it is what this app is for.
3. **Dialling** — set the range to the number. Reserved for Dial, with one
   deliberate exception (§6).

---

## 2. The gilding rule (v2)

**A node is gold if an earned achievement names it.** That is the whole rule.
Four display states sit on top of it:

| State | Behaviour |
|---|---|
| Decomposition achievement, highlighted | terminal node **gold**; its prime factors **silver**; the line-runs from each silver factor up to the gold node **silver** |
| Series achievement, highlighted | the whole set **gold**, no lines |
| Trophy gallery | nodes gold only. The one line drawn is **89's** — a deliberate NEAT! exception |
| **UNITY! earned** | every gilded prime gets its parastichy line and all of its multiples. The flood, and the finale |

The decomposition view is the one genuinely new piece of rendering. Today a
parastichy line is a single whole curve through every multiple of its prime; this
needs the **run from the factor up to the target node only**. That is a
sub-segment of an existing curve, and it is the main build cost in v2.

It is also the point of the whole thing: three curves converging on 666, each
starting from one of its prime factors, is the app drawing a factorisation.

---

## 2a. The payoff rule — added in v7

**A gild set may not be the selection that earned it.** Tapping eight primes and
lighting the same eight teaches nothing; the point of a gild is to show you
something that was not already on the screen. Selecting `{2, 3, 37}` and
watching 666 assemble is the app teaching you what factorisation feels like.
Selecting `{5, 53}` and lighting 5 and 53 is a receipt.

Sixteen achievements gilded exactly their own selection in v2. Ten of those are
single-prime jokes where the payoff is the recognition — `-so random-` → 17 —
and those are fine and were left alone. The six that did real work and returned
nothing were fixed by **widening the gild to the pattern the clue already
describes**, which costs no slots:

| | was | now |
|---|---|---|
| PRIME DIGITS! | the 8 primes you tapped | all **84** numbers written only in 2/3/5/7 |
| SATOR! | node 25 alone | all **107** palindromes above 1 |
| STRIDE! | 113 and 127 | **113–127 inclusive** — the hole, not its edges |
| BALANCED! | 5 and 53 | 3, 5, 7 and 47, 53, 59 — the symmetry the blurb describes |
| BEST! | 37 and 73 | 12, 21, 37, 73 — the whole four-number joke |
| MERSENNE! | the 4 primes you tapped | **dropped**; PERFECT! covers the subject and pays off |

`check-achievements.mjs` now asserts this, and **SUPERPRIME! is the recorded
exception**: eleven taps returning the same eleven nodes. It survives because the
idea — count along the primes and land on a prime position — is the most
intuitive thing in the cluster and no gild set expresses it any better.

**Node 1 is not available to any of this.** The first version of
`PALINDROME_NODES` counted from 1, and 1 is a palindrome, so SATOR! lit the node
that belongs to UNITY! alone. The checker caught it; there is now an assertion
naming it.

---

## 3. The list

**`docs/achievements-v6.xlsx` is authoritative.** Every achievement carries a
branch, cluster, number, id, name, clue, criteria, gild set, optional blurb and
XP.

| # | Cluster | Count | Branch | v7 |
|---|---|---|---|---|
| 1–18 | Tutorial | 18 | Tutorial | −CEILING!, +DECOMPOSE!, +GALLERY!, +TEMPTED! |
| 19–21 | Series | 3 | Math | |
| 22–34 | Primes | 13 | Math | −MERSENNE! |
| 35–39 | Puzzles | 5 | Math | |
| 40–52 | Meme | 13 | Culture | |
| 53–63 | Lore | 11 | Culture | −WHOLE! |
| 64–79 | Geek | 16 | Culture | |
| 80–87 | Calendar | 8 | Culture | |
| 88–97 | Dial | 10 | Culture | |
| 98–100 | Greeks | 3 | Culture | |
| 101 | Capstone | 1 | — | |

**Tutorial grew because that is where a new feature belongs.** Every Tutorial
entry points at something the player would otherwise never find, and the
decomposition view, the trophy room and the ad shop were all shipping with
nothing pointing at them. CEILING! paid for one of the three: it duplicated
MAXIMALIST!, it was the only configuration in the app below refresh cap — 26.7
fps on a Pixel 7, §9 — and its blurb was *"Okay let's not break your phone."* A
tutorial that rewards degrading the app is teaching the wrong lesson.

**Dial is still 10 and that is the open question.** A tenth of the list, no
integer content — the trigger is typing a number into a slider, which is the
exact thing §1 calls *entering a password* — a flat payoff every time, and six
of the ten are US area codes that mean nothing abroad. Cutting it to five is
argued in `achievements-v7-proposal.xlsx`; it needs replacement achievements
designed first, so it was left alone rather than done badly.

**Tutorial is softly ordered.** It is a suggested tour of the app's functionality
and the app's only tutorial. All of it is visible from the start and it can be
skipped in any order — Play Games records what the player actually did, and
Dazzle is a big obvious button someone will press in the first ten seconds.

**Lore reports what communities believe about numbers; it asserts nothing.**
That framing is also the cleanest answer when the IARC content-rating form asks
about occult references.

### Rules that govern any addition

**IDs are the key; numbers and names are not.** The ledger writes the `id` to
storage. TREK! was renamed 1701! during v1 design and its id stayed `trek` — had
the id been the display name, every unlock a player already held would have been
orphaned by a cosmetic edit. The same happened again in v2: THELEMA! became
WHOLE!, EIGHTFOLD! became SIT!, MOON! became LUNA!, and all three kept their ids.
The 1–101 numbering is display order and shifts freely; **nothing may key off
it.**

**No two achievements may share an exact selection trigger.** Two achievements
firing on one tap makes both clues meaningless and breaks the preview, since two
locked rows would show different nodes reachable by an identical action. This
replaces the conjunction assertions in the headless checker.

**Watch the gild-set ceiling.** Dropping the conjunction fixed *derivation*
flooding, not *direct-gild* flooding. The largest sets in v2 are REST! at 142
nodes and SEXY! at 120. Five dense sequences were cut for this reason alone —
semiprimes would have gilded 299 of 1000 nodes from a single unlock.

**Jokes age; mathematics does not.** Play Games lets you add achievements after
publication but effectively never remove them, so a list weighted toward current
memes is the one mistake that cannot be corrected later. Meme is deliberately the
smallest Culture cluster it can be.

---

## 4. Clue craft

Borrowed from cryptic crossword setting, which is the same problem.

**Afrit's dictum — "I need not mean what I say, but I must say what I mean."**
The surface may lie about the subject; the parsing may not. **Oblique is not the
same as vague.** A clue that merely withholds is unfair; a clue that disguises is
fair. `_not a baker's_` for 12 is the standard to aim at: it names the answer
exactly while appearing to talk about bread.

**There are no crossing letters. The clue is the only way in.**

This was briefly built the other way. A locked row could be tapped to light up
the numbers it would gild, on the theory that the clue and the preview were two
independent routes to one answer — a crossword's clue plus its intersecting
letters — and that the clue could therefore be merciless because something else
was holding it up.

**Cut 2026-08-23, and rightly.** Showing a locked achievement's nodes hands over
the shape of the answer, and this whole list is built on the answer being worth
finding. The mystery is the product.

**That removes a prop the clues were leaning on, and the clues have to be read
again with it gone.** A clue that was fair when a preview backed it up may not
be fair alone. The Culture side is least affected — its clues name a cultural
handle and either you have it or you look it up — but anything on the Math side
whose clue merely gestures now has to carry the whole load by itself.

**Confirmation is still free.** A wrong crossword answer poisons the crossings;
a wrong guess here costs nothing, so a player can try things. That argument for
difficulty survives. The other one does not.

**Vary the device.** Registers in use: catchphrase (`_nice_`, `_get your kicks_`),
mechanism (`_upside down_`, `_double it, add one_`), false definition
(`_short and stout_`, `_three of a kind_`), understatement (`_a long walk_`),
pronunciation (`_pe-RAS-te-kee_`), and signpost — Tutorial only.

**Difficulty gradient.** Tutorial clues are **signposts, not teases**; its job is
teaching the app, and a player who cannot find Dazzle is blocked rather than
tickled. Math is fair but firm. Lore and Meme can be genuinely hard, because
their preview is a single bright labelled node.

> The spreadsheet writes clues as `_like this_` because Excel will not accept a
> cell beginning with a hyphen. **The real delimiter is a hyphen:** `-like this-`.
> PARAWHAT?!'s `-pe-RAS-te-kee-` has hyphens of its own and has already been
> mangled once by a find-and-replace.

---

## 5. The achievements tree — the accordion

**Two interaction levels, not three.** Branch is a static divider; **cluster** is
what opens. Culture and Math still read as headings without being collapsible.

Fully collapsed that is about fifteen lines — two dividers, eleven cluster
headers, a progress line — which fits a phone sheet without scrolling. A flat
101-row list never can.

- **Progress lives on the cluster header.** `LORE ▸ 4 of 12`. This is the
  at-a-glance value a radial layout would have given, for free.
- **Multiple clusters may be open at once**, with expand-all and collapse-all.
  Expand-all doubles as the completionist's single scannable list.
- **Clues are always visible on locked rows.** Not hidden behind a tap.
- **Cluster-level trophy toggles.** At 101 rows, "show me only what Lore lit up"
  beats 101 individual checkboxes. The per-row ones stay for fine control.
- **Only an earned row is tappable.** It opens its blurb and lights what it
  gilded. A locked row shows its clue and does nothing at all.

### The panel must not move on its own

There was briefly a "peek": tapping a row dropped the sheet to its minimum so
the figure behind it was visible. It existed to serve the locked-row preview,
which is gone — and on its own it read as the panel jumping about for no
reason, which is a worse bug than the one it solved. **Removed.**

The same instinct applies to the figure. Inspecting an earned achievement
reaches the range far enough to see its nodes, and switches all-integers on —
but **only when something in the set is genuinely not being drawn**. FIRST!
gilds node 2, which is already on screen, so tapping it moves nothing. Anything
that mutates shared state on a tap should first check whether it has to.

**Build it in SVG and DOM, not Three.js.** The app sits exactly on the display
refresh cap already (§9) — an overlay costs nothing, a second 3D scene costs real
frames. You also get text rendering and accessibility for free, and every toggle
in the current panel is invisible to assistive technology, which a hand-drawn
canvas would deepen.

**Reuse `setFocus()`.** The highlight-and-label machinery exists and works. The
tree only has to call it, which keeps this a presentation change rather than a
systems change. Note its comment claims the largest focus set is thirty — that
was true once and is not now.

---

## 6. Deliberate exceptions

Recorded because each one looks like a bug to anybody running a consistency
check. They are also flagged in the spreadsheet's notes column.

**ENIGMA! triggers on 5 and gilds 23.** The only achievement where the trigger is
not the gilded node's factorisation. It is the Law of Fives — 2 + 3 = 5, and
Discordians are as attached to five as to twenty-three. The discord is the joke.
**Do not "correct" it.**

**SIT! is a range trigger outside Dial.** Range 8 leaves a spare eight-node
figure, which suits the Eightfold Path. **It is now the only one** — CEILING!
was the other, and v7 dropped it.

**SATOR! is no longer an exception here.** It used to gild the single node 25 on
the grounds that the word square has twenty-five letters, which put it in the
factor-convention check as a recorded oddity. In v7 it gilds every palindrome,
so it does not reach that check at all. ENIGMA! is now the only entry in it.

**SUPERPRIME! is the recorded exception to the payoff rule** — §2a.

**REST! triggers on pausing the transport** and gilds all 142 multiples of 7 —
the largest gild set in the design. It is also the only achievement that touches
the play/pause bar at all.

**212 is gilded twice, by different mechanics.** NY! dials it; BOILING! selects
`{2, 53}`. One node, two routes, no conflict.

**NEAT! is the only line drawn in the trophy gallery**, and its multiples are not
gilded as nodes — the line is the point, not the numbers on it.

---

## 7. How an achievement is detected

**True of v1 and carried into v2.** Four kinds of signal, and they are not
interchangeable.

| Trigger | Mechanism |
|---|---|
| `state` | A config value. Swept on `stateChange`, on `build`, and by a 5 Hz backstop in `animate()` |
| `dom` | A real gesture on a named control, guarded by `event.isTrusted` |
| `sampled` | Polled in `animate()` — the morph and the physics resonance |
| `event` | A bus event. `physics:dragStart` for OUCH!, and from v7 `lens:decompose` for DECOMPOSE! and `ads:paywall` for TEMPTED! |
| `derived` | Computed from the ledger. UNITY! only |

v2 adds no new kinds. Dialling is a `state` trigger on N; the relational Math
predicates are `state` triggers on the prime selection; REST! needs a `dom` or
`event` hook on the transport, which nothing currently watches.

**v7 adds no new kinds either**, and each of its three cost one line at the
source:

- **DECOMPOSE!** — `lens:decompose`, emitted inside `buildDecomposition()`
  rather than at the tap. The tap can be a *dismissal*: tapping the same number
  twice clears the view, and clearing a decomposition is not performing one.
- **TEMPTED!** — `ads:paywall`, emitted beside the existing `markPaywallSeen()`
  in `openPaywall()`, which had already identified exactly the right moment. It
  fires on the **door, never on the transaction**; an achievement that paid out
  for a purchase would be a different kind of product.
- **GALLERY!** — a `dom` binding on `#achievements-btn`, the cup that already
  opens the trophy room. A second listener on the same button, so the room still
  opens exactly as before.

**`event.isTrusted` is what makes "manually" mean something.** Programmatic
`.value` and `.checked` assignment fires nothing at all, and anything from
`dispatchEvent()` has `isTrusted === false`. So Dazzle, Reset and the trophy room
can set forty controls without awarding anything. Verified: pressing Dazzle turns
on all-integers, sets node size and selects every prime, and awards only
TRIPPY! — which was the click itself.

There is one place in the codebase that dispatches synthetic events —
`panel.js` around lines 469–494, the module-cap machinery at high N. Without the
`isTrusted` guard the app would hand itself achievements every time N crossed
1000.

---

## 8. Traps found the hard way

Each of these cost a debugging round. **All still apply.**

**`stateChange` is not a reliable signal that state changed.** `core/panel.js`
`scheduleRebuild()` assigns about fifteen keys onto the `state` singleton
directly and calls `buildScene()` itself, never going through `update()`.
Selecting primes, moving N, any filter — none of it emits. Measured: choosing
`{11}` gave `state.primes === [11]`, one `build` event, and **zero** `stateChange`
events. Hence the 5 Hz backstop, which is the only one of the three sweeps a
future writer cannot forget.

**Invalidate the gild cache BEFORE announcing.** `unlock()` emitted
`achievement:unlocked` first, so every listener repainted against a cache
computed without the achievement that had just fired. It read as "1 of 40 earned,
0 numbers gilded".

**A newly earned achievement must join the display set.** `getEnabled()` returns
`enabledOverride ?? all unlocked`. The moment anything touched the selection —
one checkbox, or Show all / Show none — that override became a fixed snapshot and
never grew. Everything earned afterwards was invisible. It presented as *"I just
unlocked TWINNING! and still no lines."*

**Node size must be claimed LAST, and by dispatching `input`.** The panel derives
node size from N until the user touches the slider, and every prime click re-runs
that derivation. Assigning `.value` does not set the panel's private
`nodeSizeUserSet` flag, so the auto curve takes the value straight back. It was
landing on 0.4 instead of 0.6.

**Curve colour and the per-frame fade.** The renderer rewrites every line's colour
from `liveColor` and then applies a thickness fade which, at line width 0,
multiplies everything down to 0.05 brightness. Gold written at build time is
black a frame later. Module `animate()` runs after that pass and before
`render()`, which is the one place the value survives.

**The Cowork browser pane never runs the render loop.** Measured: **zero
`animate()` calls in 700 ms.** Nothing depending on a frame — gilded lines, the
focus highlight, labels, anything sampled — can be judged there. Verify on
device. Also: opening the preview at the site root registers the *shipped*
build's service worker at scope `/`, which then swallows `/www/`. Unregister it
before concluding anything.

**A hidden element can still take your taps.** `#ach-toast` is
`pointer-events: none` until `.tappable` sets it to `auto` — and the code that
hid the toast removed `visible` and `open` but not `tappable`. So after the
first achievement with a blurb, an invisible box sat across the top of the
screen for the rest of the session, swallowing taps meant for the figure. The
symptom is maddening: the app works, except that one region of the screen does
nothing, and only sometimes. Anything that toggles `pointer-events` needs a
`:not(.visible)` backstop rather than trusting a class to be cleaned up.

**`position: sticky` resolves against the scrollport you actually have, not the
one you meant.** A back-to-top button set `sticky; bottom: 12px` inside the
scrolling panel and pinned itself off-screen *above* the sheet. A plain
`fixed` corner is wrong the other way, because the desktop panel is a 280px
sidebar rather than the whole width. Anything anchored to the panel should be
placed from `panel.getBoundingClientRect()`, which is one piece of code for both
layouts.

**A ceiling by count is the wrong instrument for labels.** Capping the focus
highlight at N labels silences a set for being large even when its nodes are
spread across the whole figure, and still lets a small set pile up in one
corner. `modules/lens.js` had already solved this with a screen-space grid;
the achievement labels use the same cells and the same rule. Reach for the
lens's answer before inventing another one.

**A column that is not carried across fails silently and forever.** The v2 data
file was rebuilt from the spreadsheet by hand and the blurb column was simply
not brought over. All eighty-eight went missing. Nothing threw, no check failed,
the list rendered perfectly — and the reward for earning an achievement was an
empty box, for as long as it took somebody to tap one and look. Found on the
phone. `tools/check-achievements.mjs` now asserts the count, because "the data
is all there" is not something to take on trust after a rewrite.

**An achievement that holds at the defaults awards itself.** The moment
tracking is switched on, every `state` predicate is swept — so anything true of
the app at rest is free. PHI! tested for the golden angle, which *is*
`DEFAULT_CONFIG.divergenceAngle`, and awarded itself before the player touched
anything; it binds to the "Reset to φ" button now. SPARTA! declares `{2,3,5}`,
which is `DEFAULT_CONFIG.primes`. Neither was visible in a browser with an empty
ledger — it took a phone with real progress on it.

**`resolveN()` is not the range the player set.** When `state.N` is null — and
it is null until somebody sets the range by hand — `resolveN()` returns the
**product of the selected primes**, clamped at 500. Nothing else in the app
makes that substitution and it is easy to write a predicate assuming otherwise.

For dials it is **accepted behaviour, decided 2026-08-23**: selecting `{5, 61}`
puts the figure at 305 and unlocks VICE! with nobody having dialled, and
stumbling into a dial that way is a fine way to find it. Only two are reachable
— 305 and 415 — because every other dial number is prime or above the clamp.
`tools/check-achievements.mjs` pins which two, so a third appearing later is a
decision rather than a surprise.

**A local preview will serve you the SHIPPED build while you think you are
testing `www/`, and it will do it again every time you restart the server.**
The repo root is the published site, so a preview server started at the root
registers the shipped build's service worker at scope `/`. That worker then
answers `/www/index.html` with the root build's cached HTML. The symptom is a
page that looks broken in ways your changes cannot explain: an unguarded
`addEventListener` throwing at a line number that is a CSS comment in the file
you are editing, and no `[PNM] Failed to load module` alongside it.

**The tell is the version string.** The footer reads `v0.14.5` when you are
being served the root and `v1.0.0-dev.7` when you are actually on `www/`. Check
it before believing anything else on the page.

Unregistering the worker and clearing caches fixes it — until the next
`preview_start`, which opens the root and registers it all over again. Doing
that once per session is not enough; do it after every server restart.

An hour went into this twice: once diagnosed correctly, once misdiagnosed as a
stale console buffer, which sent the next debugging round in the wrong
direction entirely.

**Restoring a ledger needs a RELOAD, not a restart.** The procedure below works
only if the write is the last thing that touches storage. Writing the two keys
over CDP and then `am force-stop` + `am start` loses the write every time — the
running app rewrites `pnm-platform-save-v1` from its own in-memory ledger on the
way past, so the restore is overwritten by whatever the app already believed.
**Write the keys, then `location.reload()` in the same CDP session.** The module
re-reads storage on boot and keeps what it finds. Verified 2026-08-24: twelve
unlocks restored exactly, three times, only ever by the reload route.

**`adb shell input swipe` from the left edge is an Android back gesture, not a
lens drag.** The lens handle sits at CSS x 0–44, which is device x 0–115 at
2.625 dpr, and Android reserves roughly the first 52px for edge-back. A swipe
starting at x=57 sends the whole app to the launcher and looks exactly like a
crash. **Start at x=105** — still inside the handle, clear of the gesture zone.

**A tap on a node outside the classroom layer does nothing, and that is
correct.** `onCanvasDown()` returns early when `clientX - viewportRect().left >
edgeLocalPx()`, where `edgeLocalPx()` is `openFraction * width`. So with the
lens part-open, nodes on the right-hand side are not tappable and no
`info:node` is emitted. Half an hour went into this looking like a broken
DECOMPOSE! trigger; the trigger was fine and the node was simply outside the
classroom. When testing, pick a node in the left third.

**Anything that removes `#ach-toast` from the DOM kills every later toast.**
`ensureToastEl()` is `if (toastEl) return toastEl;` — the module holds the
reference, so a detached element is returned forever and nothing appears again.
Nothing in the app does this; a test harness that tidies up between cases does,
and it presents as "the toast stopped working" several steps later.

**Installing wipes the ledger.** `adb install -r` does not clear the WebView's
HTTP cache, so `pm clear` is necessary — and it takes the ledger with it. To
preserve real progress across an install, read `pnm-achievements-v1` and
`pnm-platform-save-v1` out over CDP first and write them back after.

---

## 9. The trophy room

The cup in the top-right corner, beside Reset and Dazzle, and the same kind of
control: one tap, the whole figure changes. **Destructive** — it assigns the knobs
and does not stash what it replaced, exactly as Dazzle does.

It **resets first**, then applies. Without that it inherited colour scheme,
filters, glow, the divergence angle and the camera from whatever the player was
looking at, and no two trophy rooms looked alike. It reuses `#reset-btn` rather
than a private copy, because reset writes ~40 DOM values by hand and also calls
`resetMorph()` and `resetCamera()` — and "reset does not reset everything" has
been a bug here twice.

| Knob | Value | Why |
|---|---|---|
| N | 1000 | The measured point. Sits exactly on the physics cap, so the module-cap machinery never fires its synthetic DOM events |
| All integers | on | The dark field has to be visible or the sieve does not read |
| Selected primes | the owned ones | A curve only exists for a selected prime |
| Shape | 1.60 | Nearly a sphere, nudged toward the disk |
| Morph | off | The rotation is the movement here |
| Auto-rotate | on, 0.15 | On display |
| Node size | **0.6, claimed last** | Every prime click re-runs the panel's auto-size derivation. See §8 |
| Line width | 0 | Hairline. Gilded lines are distinguished by colour alone |
| Gilding | on | |

**v2 changes what the room shows**, not how it is built: nodes gold only, with
89's line as the sole exception, until UNITY! is earned. "Selected primes: the
owned ones" needs restating once ownership no longer exists.

**Performance is measured and safe.** The trophy room at N=1000 with gilding and
curves on sits exactly on the display refresh cap on both test devices — 90.6 fps
on a Pixel 7, 120.2 on a Pixel 9. Those are floors, not ceilings; the app is
waiting on vsync. The only configuration that costs anything is CEILING! at
N=10000, at 26.7 and 34.6 fps.

---

## 10. What building v2 touches

| File | State |
|---|---|
| `achievements-data.js` | **done.** Conjunction machinery gone. 101 definitions with `branch`, `cluster`, `no`, and declarative `sel` / `range` triggers |
| `achievements.js` | **done.** Generated predicates, the accordion, locked rows tappable, focus in white, label threshold, cluster toggles |
| `platform/index.js` | **done.** 101 store ids, generated from the data file |
| `sheet.js` | **done.** Collapse-to-peek on focus, driven by an event so the seam holds |
| `index.html` | **done.** Accordion styles |
| `check-achievements.mjs` | **done.** Conjunction assertions out; trigger uniqueness, the dial guard, the gild ceiling, the blurb count, the default-state guard and the en-dash guard in. 54 assertions at the time; 72 now |
| `renderer.js` | **done 2026-08-24.** `buildRunShapes()` / `lerpRunShapes()`, drawn by `lens.js` and now rewarded by DECOMPOSE! |
| `transport.js` | not needed. REST! binds to `#transport-btn` through the existing delegated `onTrusted`, so nothing had to be added |

### The remaining piece

The decomposition view wants the run of a prime's parastichy curve **from the
factor up to the target node only**, drawn in silver. Today a curve is one whole
line through every multiple of its prime. That is a sub-segment of existing
geometry, and it is the reason 666 is worth looking at: three curves converging
on it, each starting at one of its prime factors.

### Two sources of truth — SETTLED 2026-08-24

**The code is authoritative.** `achievements-v6.xlsx` describes v2 and is now
history; it was not updated for v7 and should not be. The second option in the
original note was taken, minus the deletion — the file stays as a record of
where the list came from.

`achievements-v7-proposal.xlsx` is a **design record, not a source**. It was
generated from `achievements-data.js`, annotated, and read back by a human only.
Nothing imports it and nothing should.

### What v7 touched

| File | Change |
|---|---|
| `achievements-data.js` | 3 dropped, 3 added, renumbered 1–101, 5 gild sets widened, 2 clues rewritten, `PRIME_DIGIT_NODES` / `PALINDROME_NODES` / `STRIDE_GAP` added, `LINKS` added and merged onto every definition as `link` |
| `achievements.js` | 3 predicates and their bindings; criteria on the row and the toast; the reference link; the trophy-room button and its handler; the row's ignore list widened to `input, button, a` |
| `lens.js` | one `emit('lens:decompose', { n })` |
| `ads.js` | one `emit('ads:paywall', { id })` |
| `index.html` | styles for `.ach-criteria`, `.ach-link`, `.ach-trophy-btn`, `.ach-toast-criteria` |
| `platform/index.js` | store ids regenerated from the data file |
| `achievements-table.mjs` | a `link` column, deliberately outside the Play Console set |
| `check-achievements.mjs` | 60 → 72 assertions |

---

## 11. Checking it

```bash
npm run check
```

Runs `tools/check.mjs` and `tools/check-achievements.mjs` — **72 assertions**
over the list shape, the XP budget, trigger uniqueness, the dial guard, the
computed families, the gilding rule, the gild-set ceiling, and from v7 the
payoff rule and the reference links. Dependency-free, in CI.

```bash
node tools/achievements-table.mjs        # TSV
node tools/achievements-table.mjs --json # JSON
```

**v1's untestable half is still untestable.** The gilding *rule* is checked
headlessly because `achievements-data.js` is free of Three.js. The ledger and
display-set logic live in `achievements.js`, which imports the renderer and
cannot load in Node — and **two of the bugs in §8 were in that half.** v2 is a
good moment to lift the ledger and enabled-set into a third Three-free file.

---

## 12. Decided 2026-08-23

Both of these were open until Dakota settled them. They are recorded here rather
than only in the code because the *reasoning* is the part that does not survive
in a diff.

### Published visibility — Tutorial revealed, everything else hidden

Every PGS achievement publishes either **Revealed** (name and `criteria` visible
in the Play Games app before anyone earns it) or **Hidden** (both concealed
until unlocked). `criteria` is written as plain instructions, because that is
what the console wants — "Select exactly 2, 3 and 5." Publishing all 101
revealed would put a complete walkthrough on the player's own profile, outside
the app, undoing §4 entirely.

**The Tutorial cluster ships Revealed; Math, Culture and Capstone ship Hidden.**
Tutorial is the ordered tour — its clues are nudges, not riddles, and giving away
"Press Dazzle" costs nothing — so a hunter browsing the list finds a real on-ramp
rather than 101 mystery entries. That was 16 revealed and 85 hidden; **v7 moved
it to 18 and 83** when Tutorial grew.

**Do that arithmetic before the console is told, not after.** The split is free
to change today and effectively permanent once Play Games has it, which is why
the checker pins the exact pair.

**Dakota's reason, which is the part worth keeping:** hidden criteria are what
let achievement hunters *collaborate*. A solved list is read alone; a concealed
one gets worked out together. The concealment is not withholding, it is the
thing that makes a community around the game possible.

Lives in code as `REVEALED_CLUSTERS` in `achievements-data.js`, which gives every
definition a `hidden` field; `tools/achievements-table.mjs` prints it as the
`initial_state` column, which is the Play Console's own field name. The checker
pins the split at 18/83, because it is near-permanent once the console is told.

Not foreclosed: PGS has a **reveal** call, so a hidden achievement can be opened
up programmatically once a player is close, filling the list in as they play.
A later refinement; nothing here blocks it.

---

## 12a. The golden angle moved to PHI!

Decided 2026-08-23. **PHI! gilds 137 and PARAWHAT?! gilds 34 and 55.**

PHI! used to gild 161 — the digits of φ, matching PI! at 314 and TAU! at 628 —
while 137, the golden ANGLE, belonged to PARAWHAT?!. But PHI!'s criteria is
"set the divergence angle back to the golden angle", so 137 is the number a
player goes looking for, and finding it lit under a different achievement is a
small betrayal of the clue.

PI! and TAU! keep their digits, because their angles are 180 and 360 and
neither means anything on this figure. PHI! is the one Greek whose angle is
worth more than its decimals, which is the whole reason the golden angle has a
name.

PARAWHAT?! took **34 and 55** in exchange: consecutive Fibonacci numbers, and
the two spiral counts you get if you count the parastichy families on a
sunflower — one number per family. It is what would be in front of you if you
did what the achievement asks.

---

---

## 13. What an earned row shows — added 2026-08-24

Three changes, all about the moment *after* an unlock rather than before it.
None touches a locked row, and that constraint shapes all three: **the clue is
still the only way in** (§4).

### The criteria, on the row and on the toast

Until v7 nothing displayed `criteria`. It existed because the Play Console
requires a public description per achievement, and a comment on the definitions
said so and asked that it not be tidied away.

It is shown now because **arriving on an achievement by accident is common**,
and documented in at least four separate ways:

- seven two-prime selections also satisfy a relational predicate — `{7, 13}`
  earns QUARTER! and SEXY! together, see §14;
- GOLDBACH! and NEAT! stack on top of those whenever the range lines up;
- two dials are reachable without dialling, §8, accepted on 2026-08-23;
- REST! fires on pausing the transport, which players do for unrelated reasons.

The clue deliberately does not say what you did. The criteria does. On the toast
it sits above the blurb, because the toast is the exact moment somebody asks
*what did I just do?*

**Consequence:** every toast is now tappable. It used to be tappable only when
there was a blurb, which left twelve dead taps. Safe against the swallowed-taps
bug in §8 — the `:not(.visible)` backstop in the stylesheet is what actually
guarantees that, never the class.

### The reference link

87 of the 101 carry one; the rest are jokes a footnote would only flatten. They
appear on **earned rows only** — a link names the answer as surely as a blurb
does.

**Stored as a `link` field, never as markup inside the blurb.** Blurbs go to the
Play Console through `achievements-table.mjs`, and an anchor written into blurb
text would leak into that column. `link` exists in the export but sits
deliberately outside the console column set.

**The twelve with no blurb need it most** — for MASONIC!, ENIGMA!, CATCH!,
JACKPOT! and the rest, the link is not a footnote but the entire explanation.
The checker asserts nothing has neither. MEME! is the single recorded exception,
because an encyclopedia article cannot deliver a punchline.

**Every title was verified against the Wikipedia API** — all resolve directly,
none is a redirect or a disambiguation page. Eleven were wrong on the first
pass: CENTRAL! pointed at a disambiguation page, and every area-code article has
been renamed at some point. Re-checking the whole set costs two API calls.

**No Capacitor plugin is needed. Confirmed on a Pixel 7, 2026-08-24.**
`Bridge.launchIntent()` fires an `ACTION_VIEW` intent for any URL whose host is
neither the app host nor in `allowNavigation`, and `capacitor.config.json` sets
no `allowNavigation` at all. `setSupportMultipleWindows` is left at its default
of false, so a `target="_blank"` link navigates in place and reaches
`shouldOverrideUrlLoading`, which calls that same intent.

Tapping REST!'s link brought `com.android.chrome` to the foreground on
`en.wikipedia.org/wiki/Sabbath`, with the app still resident behind it and its
ledger untouched. `@capacitor/browser` stays uninstalled.

### The trophy room is a button, not a tap

The ask was for tapping an achievement to take you into trophy room view. It
does not, and the reason is worth keeping.

**Half the mechanism was already there.** `setFocus()` calls `fitFigureTo()`,
which raises the range and switches all-integers on — but only when something in
the gild set is genuinely not being drawn — and it *stashes* what it replaced in
`rangeBeforeFocus` / `allIntBeforeFocus`, which `restoreFigure()` puts back. Tap
to look, tap again to go back, already scoped to two knobs.

**`applyTrophyRoom()` is not like that.** It clicks `#reset-btn` first, which
writes about forty DOM values by hand plus `resetMorph()` and `resetCamera()`,
and it stashes **nothing** — destructive by design, deliberately matching Dazzle
(§9). Wiring that to a row tap would discard whatever the player had built every
time they opened a row to read a blurb. It would also reverse §5's *"the panel
must not move on its own"*, which was decided after a much smaller version of
the same motion was built and removed.

So the tap stays light and reversible, and the destructive version gets an
explicit button inside the opened row — consented, exactly as the cup and Dazzle
already are. It pairs with GALLERY!: the achievement teaches that the cup exists,
the button gives a reason to press it.

**If the automatic version is ever wanted**, the work is making the trophy room
reversible — snapshot the whole config before applying, restore on unfocus, the
same shape as `rangeBeforeFocus` but wider. §9's warning that *"reset does not
reset everything"* has already been a bug twice, and it applies in reverse: a
restore that misses a knob is the same bug in the same place.

### Blurbs do not explain the app

A blurb carries the mathematics or the joke. It is not the place for development
history, for which control to press, or for an advert for a feature. Four were
trimmed in v7 — PARAWHAT?! had picked up how the app came to be written,
SUPERPRIME! and HEINZ! each ended by naming furniture, and STRIDE! had a factual
error besides. **The tell is a second half that arrives for no apparent reason.**

Machinery is fine where it *is* the subject: FIRST! explains gilding because that
is what FIRST! is for, PI! describes the figure collapsing because that is the
achievement, and GALLERY! describes the trophy room because it is about the
trophy room.

---

## 14. Still open

**Dial.** Ten achievements, no integer content, a flat payoff every time, six of
them US-only. Cutting to five is argued in `achievements-v7-proposal.xlsx`, and
it needs replacements designed first — Puzzles and Greeks are the underweight
clusters and the obvious home for them.

**The trigger collisions.** `check-achievements.mjs` enforces "no two
achievements share an exact selection" over literal `sel` arrays only. The
relational predicates in `achievements.js` are never compared against them, and
`pairWhere()` accepts *any* two-prime selection — so seven literals double-fire,
and CARDS! triple-fires:

| Achievement | Selection | Also fires |
|---|---|---|
| CARDS! | {3, 7} | COUSINS!, GERMAIN! |
| BEST! | {37, 73} | EMIRP! |
| LIGHTSPEED! | {13, 23} | SQUARE UP! |
| MEMORY! | {2, 5} | GERMAIN! |
| INHERITED! | {2, 23} | SQUARE UP! |
| QUARTER! | {7, 13} | SEXY! |
| SHORTEST! | {2, 7} | SQUARE UP! |

GOLDBACH! and NEAT! widen it further, both being two-prime predicates gated on
the range.

**This may well be a feature.** Two unlocks from one tap is a small *oh, that as
well* — and showing the criteria (§13) removes the confusion that was the main
argument against it. But the doc and the code presently disagree about whether
the rule holds, and the checker reports green either way. Decide it, then either
record the expected list as an assertion — the treatment ENIGMA! already gets —
or change seven selections.

### SPARTA! is earned, not free

300 is 2²·3·5², so its radical is `{2, 3, 5}` — which is `DEFAULT_CONFIG.primes`
and what Reset restores, so it awarded itself the moment tracking was switched
on. **The number stays; the range becomes a second gate.** SPARTA! now needs
exactly `{2, 3, 5}` *and* the range at 300.

That is the right gate because **300 is the number the achievement is about**.
Nothing gives it away: the auto-range derives from the product of the selected
primes, and 2·3·5 is 30, so arriving at 300 with exactly those three primes
means somebody dialled it on purpose. Reset restores both halves at once, so it
cannot leak through Reset either.

The criteria string grew to match: *"Select exactly 2, 3 and 5, with the range
at 300."*

**A rejected first attempt is worth recording, because it looked right.** The
original fix was an *arming flag*: a trusted click on a prime button armed the
predicate, Reset and Dazzle disarmed it. It failed on the phone. Tapping a prime
button sets the flag in the document's capture phase, but the button's own
handler — the one that actually changes `state.primes` — runs afterwards in the
bubble phase, so there is a window in which the flag is armed and the selection
is still the *old* one. Arm it while sitting at the default `{2, 3, 5}` and
SPARTA! fires from a tap on an unrelated prime. Verified on a Pixel 7: it awarded
itself on the first tap of prime 7.

The general lesson, which will apply again: **a flag armed in the capture phase
describes the state BEFORE the gesture, not after it.** Anything that gates a
`state` predicate on a gesture has this hazard. Gating on another piece of state
does not.

It keeps its `sel(2, 3, 5)` declaration in the data file so the "no two
achievements share a selection" check still covers it; `achievements.js`
overrides the generated test. The checker greps for the override, pins that the
auto-range for `{2,3,5}` is 30, and asserts no other achievement claims 300 as
its dial.

---

### Carried over, still open

- **Play Console XP limits are unverified.** UNITY! takes 500 XP, so a
  per-achievement maximum below that would break the budget. Check before
  creating anything in the console.
- **`criteria` is the public string**, and from v7 it is also shown in-app
  (§13). For the 18 Revealed Tutorial achievements it is visible in the Play
  Games app before anyone earns it; for the 83 Hidden ones it appears on unlock.
  A typo ships either way, and `tools/achievements-table.mjs` is where to
  proofread all 101 at once.
- **REST! at 142 nodes** is still the largest gild set. Trim or accept.
- **Series is three members** and would fold into Primes without loss.
- **Accessibility.** Every toggle in the panel is a zero-size checkbox behind a
  styled track, so the accessibility tree shows nothing. Pre-existing, and the
  new trophy-room button is a real `<button>` precisely so it does not add to
  the pile.
- **No toast or sound settings persist.** Sound defaults on and resets each
  launch.

### Closed by v7

- ~~CEILING! costs real frames — 26.7 fps on a Pixel 7~~ — dropped.
- ~~SUPERPRIME! needs eleven taps, SATOR! seven~~ — SATOR! is unchanged in
  effort but now pays off; SUPERPRIME! is recorded as the payoff-rule exception
  in §2a rather than left as a loose end.
- ~~Re-read the Math clues now that nothing backs them up~~ — done for the two
  that could only be solved by already knowing the answer, LUCAS! and COLLATZ!.
  The rest were read and left.
- ~~The label threshold for the locked-row preview~~ — the locked-row preview
  does not exist; §5 and §8 record what replaced it.
