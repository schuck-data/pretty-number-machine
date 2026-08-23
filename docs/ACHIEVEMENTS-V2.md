# Achievements v2 — the overhaul

**Status: DRAFT for review. Nothing here is in the code.** Written 2026-08-21,
revised the same day. When it settles it folds into `ACHIEVEMENTS.md` and this
file is deleted — two documents describing one design is the failure mode this
project already warns about.

Every factorisation, sequence and trigger clash in this document was **computed,
not recalled**.

---

## 1. The design

| | v1 | v2 |
|---|---|---|
| Grouping | flat list of 40 | a tree: **Culture** and **Math** branches, plus **Tutorial** |
| Clusters | none | Meme, Lore, Geek, Greeks / Series, Primes, Puzzles / Tutorial |
| Gilding | direct gild + derivation, gated by a **conjunction** | direct gild only. **No derivation until UNITY!** |
| Conjunction rule | load-bearing | **dropped** |
| Default trigger | ad hoc | **select exactly the number's distinct prime factors** |
| Hints | a sentence each | crossword clues: `NAME! -clue-` |
| Locked rows | show hint, not tappable | tappable; preview the gild set on the figure |
| Node reuse | one achievement per node | **many achievements may gild the same node** |

### The gilding rule

A node is gold if an **earned** achievement names it. That is the whole rule.
Four display states sit on top:

| State | Behaviour |
|---|---|
| Decomposition achievement, highlighted | terminal node **gold**; its prime factors **silver**; the line-runs from each silver factor up to the gold node **silver** |
| Series achievement, highlighted | the whole series **gold**, no lines |
| Trophy gallery | nodes gold only. The one line drawn is **89's** — a deliberate NEAT! exception |
| **UNITY! earned** | every gilded prime gets its line and its multiples. The flood, and the finale |

### Why the conjunction went

It existed to stop three easy achievements flooding the board through
derivation. With no derivation before UNITY!, that cannot happen, and it had no
other job. Prime-selection triggers therefore cost nothing, so series are chosen
on interest alone.

**Code consequence:** `primeRoutes()`, `ROUTES`, `ownedPrimes` and the UNITY!
override come out of `achievements-data.js`; the conjunction assertions come out
of `tools/check-achievements.mjs`. One new assertion replaces them: **no two
achievements share an exact selection trigger.**

---

## 2. Clue craft

Borrowed from cryptic crossword setting, which is the same problem.

**Afrit's dictum — "I need not mean what I say, but I must say what I mean."**
The surface may lie about the subject; the parsing may not. **Oblique is not the
same as vague.** A clue that merely withholds is unfair; a clue that disguises
is fair.

**The clue and the preview are crossing letters.** In a grid no answer has one
way in — you have the clue *and* the intersecting letters. Here you have the
clue *and* the highlighted gild set. They are two independent routes and must be
**calibrated as a pair**: where the preview is loud (one labelled node), the clue
can be merciless; where the preview is silent (VOID!, EMPTY SET!), the clue
carries everything alone.

The preview also supplies the enumeration — a crossword's `(7)`. The *number of
nodes* tells you the shape of the answer before you know what it is.

**Confirmation is free here, unlike on paper.** A wrong crossword answer poisons
the crossings; a wrong guess here costs nothing. So these clues can be harder
than a newspaper's.

**Vary the device.** Registers in use:

| Register | Examples |
|---|---|
| Catchphrase | -nice- · -get your kicks- · -hit me- · -we have a problem- |
| Mechanism | -upside down- · -double it, add one- · -stack the coins- |
| False definition | -short and stout- · -three of a kind- · -burning point- |
| Understatement | -a long walk- · -missing- · -off the menu- |
| Pronunciation | -pe-RAS-te-kee- |
| Signpost (Tutorial only) | -switch it on- · -push the slider all the way- |

**Difficulty gradient.** Tutorial clues are **signposts, not teases** — its job
is teaching the app, and a player who cannot find Dazzle is blocked rather than
tickled. Math is fair-but-firm. Lore and Meme can be genuinely hard, because
their preview is a single bright labelled node.

---

## 3. TUTORIAL — the ordered tour (16)

Soft order: all visible, all hints shown, freely skippable. The app's only
tutorial.

| # | Name | Clue | Gilds | Trigger |
|---|---|---|---|---|
| 1 | **FIRST!** | -switch it on- | 2 | achievements toggle |
| 2 | **EXHAUSTIVE!** | -show the ones in between- | 1000 | all-integers on |
| 3 | **PARAWHAT?!** | -pe-RAS-te-kee- | 137 | show or adjust the curves |
| 4 | **ART!** | -change how it looks, not what it is- | 433 | any appearance setting |
| 5 | **BOPHADES!** | -as big as it goes- | 2 | node size to max |
| 6 | **MAXIMALIST!** | -push the slider all the way- | 999 | N slider to max |
| 7 | **CEILING!** | -the slider was lying- | 997 | N = 10000 |
| 8 | **ZOOMIES!** | -faster, all the way- | 88, 121 | morph speed to max |
| 9 | **BOING!** | -wait for the bottom- | 314 | reach the Spring form |
| 10 | **TRIPPY!** | -there is a button for this- | 419 | press Dazzle |
| 11 | **NERD!** | -drag the classroom across- | 42 | open the lens |
| 12 | **OUCH!** | -take hold of the Sun- | 149 | drag node 0, physics on |
| 13 | **OOPS!** | -make the springs disagree- | 641 | resonance |
| 14 | **NIGHT!** | -put out the Sun- | 354 | zero node off |
| 15 | **VOID!** | -take every prime away- | — | deselect all |
| 16 | **EMPTY SET!** | -then take away what was left- | — | plus 0 and 1 off |

Blurbs: 3, 9, 11, 13, 16.

**VOID! and EMPTY SET! gild nothing** — no preview, so they keep an
always-visible text hint. The only two in the design.

---

## 4. MATH branch

### 4a. Series (11)

| Name | Clue | Gilds | Trigger | Blurb |
|---|---|---|---|---|
| **FIBONACCI!** | -how nature counts- | 14 nodes | select exactly {2,3,5,13,89} | yes |
| **LUCAS!** | -same rule, different start- | 14 nodes | select exactly {2,3,7,11,29,47} | yes |
| **TRIANGULAR!** | -stack the coins- | 43 nodes | N = 990 | yes |
| **SQUARES!** | -the odd ones out- | 30 nodes | N = 961 | yes |
| **CUBES!** | -n by n by n- | 9 nodes | N = 729 | — |
| **DOUBLE!** | -again, and again- | 2,4,8 … 512 | N = 512 | — |
| **FACTORIAL!** | -one times two times three- | 2,6,24,120,720 | N = 720 | — |
| **RAMANUJAN!** | -more factors than anything smaller- | 14 nodes | N = 840 | yes |
| **PERFECT!** | -equal to the sum of its parts- | 2,3,7,31,6,28,496 | select exactly {2,3,7,31} | yes |
| **EUCLID!** | -one more than all of them multiplied- | 210, 211 | N = 211 | yes |
| **AMICABLE!** | -each is the other's sum- | 220, 284 | select exactly {2,71} | yes |

**SQUARES! gets a new clue and a much better blurb.** The squares are the only
numbers with an *odd* number of divisors, because divisors pair up (d with n/d)
except when a number is its own partner. Verified 1..100: 1, 4, 9, 16, 25, 36,
49, 64, 81, 100. That is the locker problem, and it is a far better thing to
teach than the radial-spacing artefact.

**Only one quadratic sequence survives.** Triangular (43), pronic (31),
pentagonal (24) and tetrahedral (16) all draw the same picture, because r ∝ √n
and all of them are roughly k². TRIANGULAR! is kept as the famous one.

AMICABLE! triggers on {2,71} — 284's factors — because 220's {2,5,11} is wanted
by CONCERT A!. It gilds both halves regardless.

### 4b. Prime families (12)

| Name | Clue | Gilds | Trigger | Blurb |
|---|---|---|---|---|
| **TWINNING!** | -one even number between them- | 69 primes | pair differing by 2 | yes |
| **COUSINS!** | -four apart- | 81 primes | pair differing by 4 | — |
| **SEXY!** | -it really is Latin- | 120 primes | pair differing by 6 | yes |
| **GERMAIN!** | -double it, add one- | 37 primes | pair q = 2p+1 | yes |
| **EMIRP!** | -read it the other way- | 36 primes | digit-reversal pair | yes |
| **HAPPY!** | -square the digits, and again- | 35 primes | select exactly the nine | yes |
| **EULER!** | -forty in a row, then it breaks- | 31 primes | select exactly the ten | yes |
| **MERSENNE!** | -one less than a power of two- | 3, 7, 31, 127 | select exactly {3,7,31,127} | yes |
| **FERMAT!** | -and together, one byte- | 3,5,17,255,257 | select exactly {3,5,17} | yes |
| **NEAT!** | -almost a straight line- | 89 **and its line** | two primes incl. 89, N ≥ 178 | yes |
| **LOUDER!** | -nothing but ones- | 11 | select exactly 11 | yes |
| **SMART!** | -the same both ways- | 101 | select 101, lens open | yes |

**FERMAT! is the find of the pass.** 3 × 5 × 17 = 255 — the three smallest
Fermat primes multiply to exactly one byte, which is also 2⁸ − 1. One selection,
Gauss's 17-gon and a byte. This absorbed the separate BYTE! entry.

SEXY! at 120 nodes is the largest gild set in the design, and therefore the worst
case for the locked-row preview.

### 4c. Puzzles (5)

Rebuilt. The old contents were base-10 accidents — cube the digits, square and
split the digits — which say nothing about numbers, only about how we happen to
write them. The app already makes that distinction in HAPPY!'s blurb.

| Name | Clue | Gilds | Trigger | Blurb |
|---|---|---|---|---|
| **SIXES!** | -every prime hides beside one- | multiples of 6 | select exactly {2, 3} | yes |
| **GOLDBACH!** | -two make an even- | the pair | N even, two primes summing to N | yes |
| **DESERT!** | -a long walk- | 888–906 | N = 907 | yes |
| **COLLATZ!** | -the long way down- | 871 | select exactly {13, 67} | yes |
| **BLACK HOLE!** | -all roads lead here- | 495 | select exactly {3, 5, 11} | yes |

**SIXES! is the best achievement in this design.** Every prime above 3 is one
away from a multiple of 6 — verified with no exceptions under 1000 — and the
reason is a one-line proof: of the six numbers around a multiple of 6, four are
divisible by 2 or 3, so only the two neighbours can be prime. **You watch it
happen**: light 2 and 3, and every remaining prime is sitting next to something
lit. It also redeems the {2,3} trigger I had rejected as a trivial two-tap —
triviality is the point, because 6 = 2 × 3.

**GOLDBACH!** makes the player do mathematics rather than recognise a name. The
grid reaches 123 even numbers as a sum of two grid primes, and **18 of them have
exactly one answer** — 224 = 97+127, 230 = 103+127, 232 = 101+131 among them.

**DESERT!** — the longest run of consecutive composites under 1000 is 19 long,
888 to 906, between the primes 887 and 907. The blurb carries the constructive
trick: n!+2 through n!+n are all composite, so a prime-free stretch can be made
as long as you like.

**BLACK HOLE!** — take any three-digit number whose digits are not all equal,
subtract digits-ascending from digits-descending, repeat. All 891 of them land on
495 and stay. *Caveat kept honestly: this is still a base-10 result. It survives
because the idea — a process with a single attractor — is general, and because
it pairs with COLLATZ!, where everything falls to 1.*

**Cut:** ARMSTRONG!, AUTOMORPHIC!, KAPREKAR! (base-10 trivia). **STUBBORN!**
(196, the Lychrel candidate) is available if a sixth is wanted; it is base-10
too, and less satisfying to *do* than the others.

**LOCKERS!** was folded into SQUARES! rather than made separate.

---

## 5. CULTURE branch

Default trigger: **select exactly the number's distinct prime factors**, unless
something better exists.

### 5a. Meme (16)

| Name | Clue | Gilds | Trigger |
|---|---|---|---|
| **NICE!** | -nice- | 69 | {3, 23} |
| **DUDE!** | -what was I saying?- | 420 | {2, 3, 5, 7} |
| **MEME!** | -kids these days- | 67 | select exactly 67 |
| **OIL!** | -upside down- | 710 | {2, 5, 71} |
| **NOT FOUND!** | -missing- | 404 | {2, 101} |
| **TEAPOT!** | -short and stout- | 418 | {2, 11, 19} |
| **NIXED!** | -off the menu- | 86 | {2, 43} |
| **CATCH!** | -damned either way- | 22 | {2, 11} |
| **ROUTE!** | -get your kicks- | 66 | {2, 3, 11} |
| **CARDS!** | -hit me- | 21 | {3, 7} |
| **JACKPOT!** | -three of a kind- | 777 | {3, 7, 37} |
| **HEINZ!** | -varieties- | 57 | {3, 19} |
| **SLURPEE!** | -any time- | 711 | {3, 79} |
| **SPARTA!** | -this is- | 300 | {2, 3, 5} |
| **JUMBO!** | -upper deck- | 747 | {3, 83} |
| **BRADBURY!** | -burning point- | 451 | {11, 41} |

**JACKPOT!'s clue was rewritten.** -just one more- was vague rather than oblique
— it could have been almost anything. -three of a kind- says exactly what it
means (three identical digits) while reading as gambling.

**HEINZ! earns a blurb and is the best joke in the set.** 57 varieties — but 57
is also the *Grothendieck prime*: one of the century's great mathematicians,
asked for an example of a prime, said "57". In a prime-factorisation app you
watch it come apart into 3 × 19. The app tells the joke rather than referencing
one, and it will not age.

**BRADBURY!** carries Fahrenheit 451 and HTTP 451. **NOT FOUND!** carries HTTP
404 and the Atlanta area code — same node, two jokes, which is why it wins
{2,101} over 202 and 808.

**Dropped: EMERGENCY! (911).** 911 is prime and above the grid, so no factor
trigger exists, and no better one presented itself.

### 5b. Lore (10)

Framing: **report what communities believe about numbers; assert nothing.** Also
the cleanest answer when the IARC content-rating form asks about occult
references.

| Name | Clue | Gilds | Trigger |
|---|---|---|---|
| **BEAST!** | -number of a man- | 666 | {2, 3, 37} |
| **ANGEL!** | -a repeating message- | 111, 222 … 999 | {2, 3, 5, 7, 37} |
| **LUCKY!** | -seventh heaven- | 7 | select exactly 7 |
| **UNLUCKY!** | -no thirteenth floor- | 13 | select exactly 13 |
| **ENIGMA!** | -fnord- | 23 | select exactly 23 |
| **MASONIC!** | -the highest degree- | 33 | {3, 11} |
| **THELEMA!** | -do what thou wilt- | 93 | {3, 31} |
| **FISHES!** | -the miraculous draught- | 153 | {3, 17} |
| **OTHER BEAST!** | -the older manuscript- | 616 | {2, 7, 11} |
| **CENTRAL!** | -the number that never rings- | 555 | {3, 5, 37} |

**ANGEL! solves the repdigit collision.** All nine three-digit repdigits are
built from exactly {2, 3, 5, 7, 37} — 5 only in 555, 7 only in 777 — so one
selection gilds all nine while 666 keeps {2,3,37}. 37 is the quiet star: every
repdigit is a multiple of it, because 111 = 3 × 37.

### 5c. Geek (10)

| Name | Clue | Gilds | Trigger |
|---|---|---|---|
| **1701!** | -deck 47, sector 47- | 47 | select exactly 47 |
| **LOCALHOST!** | -no place like it- | 127 | select 127, N = 127 |
| **RAWR!** | -so random- | 17 | select exactly 17 |
| **BEST!** | -the twenty-first, reflected- | 37, 73 | select exactly {37, 73} |
| **CONCERT A!** | -tune up- | 440 | {2, 5, 11} |
| **LIGHTSPEED!** | -in a vacuum- | 299 | {13, 23} |
| **MEMORY!** | -ought to be enough- | 640 | {2, 5} |
| **NY!** | -NY- | 212 | {2, 53} |
| **SPACE CITY!** | -we have a problem- | 713 | {23, 31} |
| **GRACELAND!** | -the king- | 901 | {17, 53} |

Area codes trimmed from nine to three. **Runner-up if one does not land:**
VICE! (305, {5,61}). **Dead — a prime factor above the grid:** 313 (Detroit),
617, 718, 773, 818, 601, 503, 514, 604.

### 5d. Greeks (3)

Constants **as angles**, not decimal digits — more honest, and the only thing
that works, since π (314), τ (628), e (271), α (137) and γ (577) all carry a
prime factor above the grid.

Triggered from the **Constants** panel section, which has no achievement
attached today and is the least discoverable thing in the app.

| Name | Clue | Gilds | Trigger |
|---|---|---|---|
| **PHI!** | -the angle nature picks- | 161 | divergence = the golden angle |
| **PI!** | -half a turn- | 314 | divergence = 180° |
| **TAU!** | -the whole turn- | 628 | divergence = 360° |

PI! and BOING! both gild 314. Permitted now, and a pleasing coincidence — a
spring's period is 2π√(m/k).

---

## 6. UNITY! — the capstone (1)

| Name | Clue | Gilds | Trigger |
|---|---|---|---|
| **UNITY!** | -everything else, first- | 1, **and the flood** | every other achievement earned |

Outside the tree. On unlock every gilded prime gets its parastichy line and all
its multiples: roughly 235 named nodes become 854.

---

## 7. Dropped, and why

| Dropped | Why |
|---|---|
| **EMERGENCY!** (911) | prime and above the grid; no trigger available |
| **SIXSEVEN!** | absorbed into MEME!, which now holds 67 |
| old **MEME!** (67 + 69) | overlapped NICE! and SIXSEVEN! entirely |
| **ARMSTRONG!**, **AUTOMORPHIC!**, **KAPREKAR!** | base-10 trivia — the sets evaporate in any other base |
| pronic, pentagonal, tetrahedral | draw the same picture as SQUARES! |
| **RHO!** (132) | clashed with ROUTE! on {2,3,11} |
| **SNOOKER!** (147) | clashed with CARDS! on {3,7} |
| **FLOOD!** (40) | clashed with MEMORY! on {2,5} |
| **MALA!** (108) | radical {2,3} — now used by SIXES!, which deserves it |
| six area codes | trimmed from nine to three |
| semiprimes, sphenic, harshad, abundant, palindromes | 299 / 135 / 212 / 246 / 107 nodes each |
| **BYTE!** | merged into FERMAT!, since 3 × 5 × 17 = 255 |

**On the dense sequences.** Dropping the conjunction fixed *derivation* flooding,
not *direct-gild* flooding. SEMIPRIME! would gild 299 of 1000 nodes from one
unlock, against SEXY!'s 120 as the current worst case. If one returns it should
be SPHENIC! (135, "three different primes") and it should be a deliberate
decision about the ceiling.

---

## 8. Counts and XP

| Cluster | Count |
|---|---|
| Tutorial | 16 |
| Math — Series | 11 |
| Math — Primes | 12 |
| Math — Puzzles | 5 |
| Culture — Meme | 16 |
| Culture — Lore | 10 |
| Culture — Geek | 10 |
| Culture — Greeks | 3 |
| Capstone | 1 |
| **Total** | **84** |

Play Games caps total XP at 2000.

| Count | XP each | Total | Held back |
|---|---|---|---|
| **84** | **20** | **1680** | **320** |
| 84 | 22 | 1848 | 152 |
| 80 | 25 | 2000 | 0 — do not |

**84 at 20 XP holds 320 in reserve.** That reserve matters: achievements can be
added after publication but effectively never removed, so a list that spends the
whole budget is the one shape that cannot be corrected later.

**Unverified:** whether Play Console constrains individual XP to particular
increments or a per-achievement maximum. Check before the arithmetic hardens.

---

## 9. Open

- **The label threshold** for the locked-row preview. SEXY! at 120 nodes is the
  worst case; working proposal is to label sets of ≤ 8 and show larger sets as
  shape only
- **Blurb pass** — marked per row above, not yet written
- **STUBBORN!** (196) — in or out as a sixth puzzle
- **Whether Tutorial should teach the Constants panel**, or leave it to the Greeks
- **GOLDBACH!'s exact predicate** — "N even and two primes summing to N" needs a
  decision on whether N must be exactly the sum or merely even
- **Cluster colour-coding** — deferred; BEAST! gilding red was the seed
