// PNM — Achievement Definitions and Number Sets
//
// Every integer set the achievement design depends on, and the gilding rule
// itself. Split out from achievements.js for the same reason core/math.js is
// split out from everything else: **this file has no Three.js dependency and no
// renderer dependency**, so it can be imported, reasoned about and tested
// without a browser. `node tools/check-achievements.mjs` does exactly that.
//
// That matters more here than it looks. These lists are long, several are easy
// to get subtly wrong by hand, and a wrong one would be invisible in the app —
// an achievement that never fires, or a node quietly gilded that should not be.
// They are computed rather than written out as literals for the same reason the
// golden angle is computed in math.js: a hand-copied list is a second source of
// truth that drifts in silence.
//
// DESIGN RECORD: docs/ACHIEVEMENTS.md. The list itself was designed in
// docs/achievements-v6.xlsx, which is where names, clues and blurbs came from.
// If the two ever disagree, this file is the code and therefore right.

import { SELECTABLE_PRIMES, isPrimeNumber, primeFactorsOf } from '../core/math.js';

// The range the gilding design is specified against, and the trophy room's
// pinned N.
export const TROPHY_N = 1000;

const P = SELECTABLE_PRIMES;
const PSET = new Set(P);

// ============================================================
// SEQUENCES
// ============================================================
export function seqFib(limit) {
  const out = [];
  let a = 1, b = 1;
  while (a <= limit) { if (a >= 2) out.push(a); [a, b] = [b, a + b]; }
  return [...new Set(out)];
}

// EDU: the Lucas numbers obey the same rule as the Fibonacci numbers — each is
// the sum of the two before it — but start 2, 1 rather than 1, 1. That single
// change of seed produces a completely different sequence which nonetheless
// grows at the same rate, because the growth rate is a property of the RULE
// (the golden ratio) and not of where you begin.
export function seqLucas(limit) {
  const out = [];
  let a = 2, b = 1;
  while (a <= limit) { if (a >= 2) out.push(a); [a, b] = [b, a + b]; }
  return [...new Set(out)].sort((x, y) => x - y);
}

// EDU: a perfect number equals the sum of its proper divisors — 6 = 1+2+3.
// Euclid showed 2^(p-1)(2^p - 1) is perfect whenever 2^p - 1 is prime, and
// Euler showed every even perfect number has that shape, so each one carries a
// Mersenne prime inside it. Only three exist below 1000.
export function seqPerfect(limit) {
  const out = [];
  for (let n = 2; n <= limit; n++) {
    let s = 1;
    for (let d = 2; d * d <= n; d++) {
      if (n % d !== 0) continue;
      s += d;
      if (d * d !== n) s += n / d;
    }
    if (s === n) out.push(n);
  }
  return out;
}

export function multiplesOf(p, limit) {
  const out = [];
  for (let k = 1; k * p <= limit; k++) out.push(k * p);
  return out;
}

export const reverseNum = n => +String(n).split('').reverse().join('');
export const isPalindrome = n => String(n) === String(n).split('').reverse().join('');

export const FIB_NODES     = seqFib(TROPHY_N);
export const LUCAS_NODES   = seqLucas(TROPHY_N);
export const PERFECT_NODES = seqPerfect(TROPHY_N);
export const REST_NODES    = multiplesOf(7, TROPHY_N);          // 142 of them
export const REPDIGITS     = [111, 222, 333, 444, 555, 666, 777, 888, 999];

// ============================================================
// PRIME FAMILIES
// ============================================================
// TWO sets per family, and the distinction matters.
//
//   SERIES.x  — every prime up to 1000 with the property. This is what gets
//               GILDED: a family should light all of its members that fit on
//               the figure, not just the handful the panel happens to offer.
//   FAM.x     — the members inside the selectable grid, for anything that has
//               to name them.
//
// DEV: computing the property over the full range rather than within the grid
// also changes which IN-GRID primes qualify, and that is a correction rather
// than a side effect. 131 is a sexy prime — 137 is six away and prime — but a
// within-the-grid definition would deny it, because 137 is the one prime the
// panel does not offer. The property belongs to the number, not to the UI.
const P1000 = [];
for (let n = 2; n <= TROPHY_N; n++) if (isPrimeNumber(n)) P1000.push(n);
const P1000SET = new Set(P1000);

const gap = (d) => P1000.filter(p => P1000SET.has(p - d) || P1000SET.has(p + d));

export const SERIES = {
  twins:   gap(2),
  cousins: gap(4),
  sexy:    gap(6),
  // EDU: p is a Sophie Germain prime when 2p+1 is also prime. 2p+1 may be well
  // past the end of the figure — that is fine, the property is about p.
  germain: P1000.filter(p => isPrimeNumber(2 * p + 1)),
  // EDU: an emirp is a prime whose digits reversed give a DIFFERENT prime.
  // "Emirp" is "prime" spelled backwards.
  emirp:   P1000.filter(p => reverseNum(p) !== p && isPrimeNumber(reverseNum(p))),
  perfect: [...new Set(PERFECT_NODES.flatMap(primeFactorsOf))].sort((a, b) => a - b),
};

// Selectable primes with a property, for the achievements that name them.
// Computed rather than typed so the definitions below cannot drift from truth.
export const PALINDROMIC_PRIMES = P.filter(isPalindrome);            // 2 3 5 7 11 101 131
export const PRIME_DIGIT_PRIMES = P.filter(p => String(p).split('').every(d => '2357'.includes(d)));
// EDU: a super-prime sits at a PRIME position in the list of primes. 2 is the
// 1st prime, 3 the 2nd, 5 the 3rd — so 3, 5, 11, 17 … are the primes you reach
// by counting with primes. Not the same thing as a prime whose digits are prime.
// Every super-prime on the figure — 39 of them. This is the GILD.
export const SUPER_PRIME_NODES = P1000.filter((p, i) => isPrimeNumber(i + 1));
// The eleven inside the selectable grid. This is the SELECTION, because those
// are the only ones the panel offers.
//
// DEV: the gild used to be this set as well, which made SUPERPRIME! eleven taps
// returning the same eleven nodes — the flat payoff §2a exists to prevent, and
// the one place the family rule at the top of this section was not followed.
// Counting along the panel is still how you FIND it; what lights up is now the
// whole family, most of which is past the end of the grid.
export const SUPER_PRIMES = SUPER_PRIME_NODES.filter(p => PSET.has(p));

// RUN!: primes reachable as the sum of three or more consecutive primes.
export const RUN_TARGETS = (() => {
  const out = new Set();
  for (let i = 0; i < P1000.length; i++) {
    let s = 0;
    for (let j = i; j < P1000.length; j++) {
      s += P1000[j];
      if (s > 131) break;
      if (j - i >= 2 && PSET.has(s)) out.add(s);
    }
  }
  return [...out].sort((a, b) => a - b);
})();

// GOLDBACH!: every even number two selectable primes can build.
export const GOLDBACH_EVENS = (() => {
  const out = new Set();
  for (const a of P) for (const b of P) if ((a + b) % 2 === 0) out.add(a + b);
  return [...out].sort((x, y) => x - y);
})();

// SQUARE UP!: the squares two selectable primes can reach.
export const SQUARE_UP_NODES = (() => {
  const out = new Set();
  for (const a of P) for (const b of P) {
    if (a >= b) continue;
    const s = a + b;
    if (Number.isInteger(Math.sqrt(s))) out.add(s);
  }
  return [...out].sort((x, y) => x - y);
})();

// PAYOFF SETS — added in v7.
//
// Each of these replaces a gild set that was identical to the SELECTION that
// earned it. Tapping eight primes and lighting the same eight teaches nothing;
// the point of a gild is to show you something you did not already have on
// screen. See docs/ACHIEVEMENTS.md §2a.
//
// All three are well inside the 150-node ceiling that check-achievements.mjs
// pins — the largest set in the design is still REST! at 142.

// PRIME DIGITS! — every number written with nothing but 2, 3, 5 and 7, not just
// the eight PRIMES that are. Eighty-four of them, and the scatter is the point:
// it makes the base-ten fact visible instead of merely asserted.
export const PRIME_DIGIT_NODES = (() => {
  const out = [];
  for (let n = 2; n <= TROPHY_N; n++) {
    if (String(n).split('').every(c => '2357'.includes(c))) out.push(n);
  }
  return out;
})();

// SATOR! — every palindrome below the ceiling. The clue is "reads the same every
// way", and now the payoff reads that way too. It used to gild the single node
// 25, on the grounds that the word square has twenty-five letters, which is a
// long walk for a small view.
export const PALINDROME_NODES = (() => {
  const out = [];
  // FROM 2, NOT 1. 1 is a palindrome and must still stay dark: it belongs to
  // UNITY! and to nothing else, because it is the one number that is not built
  // out of primes. check-achievements.mjs caught this the first time round.
  for (let n = 2; n <= TROPHY_N; n++) if (isPalindrome(n)) out.push(n);
  return out;
})();

// STRIDE! — the whole gap, not its two endpoints. The clue describes a stretch
// of number line with no primes in it, so the hole is what should light up.
export const STRIDE_GAP = (() => {
  const out = [];
  for (let n = 113; n <= 127; n++) out.push(n);
  return out;
})();

// ============================================================
// THE DEFINITIONS
// ============================================================
// Data only — no predicates. Where a trigger is an exact prime selection or an
// exact range it is DECLARED here rather than hand-written in achievements.js:
//
//   sel: [2, 3, 37]   the player must have exactly these primes selected
//   range: 911        the range must be exactly this
//   custom: true      achievements.js supplies a test function
//
// DEV: this is the biggest change from v1, where every one of forty triggers was
// a hand-written predicate. Declaring them buys two things. Fifty-odd predicates
// collapse to one generated comparison, and — the reason that matters — the
// headless checker can assert that **no two achievements share a selection**.
// Two achievements firing on one tap makes both their clues meaningless and
// breaks the locked-row preview, since two rows would show different nodes
// reachable by an identical action. Under v1 nothing could have caught that.
//
// XP: 15 each across 100, and UNITY! takes the remaining 500 of Play's 2000.
// Holding the reserve inside the capstone rather than leaving it unspent means
// later additions have somewhere to come from — drop UNITY! to 350 and you have
// ten more achievements. Achievements can be added after publication and
// effectively never removed, so that flexibility is the whole point.
export const XP = 15;
export const XP_UNITY = 500;

// PLAY CONSOLE VISIBILITY — decided 2026-08-23, and it is near-permanent.
//
// Every PGS achievement is published either REVEALED (its name and `criteria`
// are visible in the Play Games app before anyone earns it) or HIDDEN (both are
// concealed until the player unlocks it).
//
// `criteria` is written as plain instructions — "Select exactly 2, 3 and 5." —
// because that is what the Play Console wants. But the in-app panel deliberately
// shows only the clue, never the criteria: the concealment is the design, and
// §4 of docs/ACHIEVEMENTS.md is a whole section on making the clues fair without
// giving them away. Publishing everything revealed would put a complete
// walkthrough on the player's own profile, outside the app, where nothing can be
// done about it.
//
// So: the Tutorial cluster ships REVEALED and everything else ships HIDDEN.
// Tutorial is the ordered tour — its clues are nudges rather than riddles, and
// "Press Dazzle" costs nothing to give away — so hunters browsing the list see a
// real on-ramp instead of 101 mystery entries. The Math, Culture and Capstone
// clusters are the puzzle, and stay shut.
//
// Dakota's reason for the split, recorded because it is the thing a future
// reader will want and cannot infer: hidden criteria are what let achievement
// hunters COLLABORATE. A solved list is read alone; a concealed one gets worked
// out together.
//
// PGS also has a reveal call, so a hidden achievement can be opened up
// programmatically once a player is close. That is a later refinement and
// nothing here forecloses it — but the published type is the part that is hard
// to take back, so it is decided now.
const REVEALED_CLUSTERS = new Set(['Tutorial']);

const defs = [];
const d = (no, cluster, id, name, clue, criteria, gildNodes, trigger, opts = {}) => {
  defs.push({
    no, id, name, clue, criteria, cluster,
    branch: opts.branch || BRANCH_OF[cluster],
    gildNodes, gildLines: opts.gildLines || [],
    xp: id === 'unity' ? XP_UNITY : XP,
    blurb: opts.blurb || '',
    hidden: opts.hidden !== undefined ? opts.hidden : !REVEALED_CLUSTERS.has(cluster),
    ...trigger,
  });
};
const BRANCH_OF = {
  Tutorial: 'Tutorial', Series: 'Math', Primes: 'Math', Puzzles: 'Math',
  Meme: 'Culture', Lore: 'Culture', Geek: 'Culture', Calendar: 'Culture',
  Dial: 'Culture', Greeks: 'Culture', Capstone: 'Capstone',
};
const sel   = (...primes) => ({ kind: 'state', sel: primes.sort((a, b) => a - b) });
const range = (n)         => ({ kind: 'state', range: n });
const custom = (kind = 'state') => ({ kind, custom: true });

// ---- TUTORIAL — the ordered tour ----------------------------------------
d(1,  'Tutorial', 'first',      'FIRST!',       '-switch it on-',                      'Switch achievements on from the achievements section.', [2],    custom('dom'));
d(2,  'Tutorial', 'exhaustive', 'EXHAUSTIVE!',  '-show the ones in between-',          'Switch on all integers in range.',                      [1000], custom('dom'));
// PARAWHAT?! gilds the two spiral COUNTS. Count the parastichy families on a
// sunflower and you get 34 one way and 55 the other — consecutive Fibonacci
// numbers, one per family. It is what you would have in front of you if you
// actually did what this achievement asks, which fits better than the angle it
// used to carry. 137 went to PHI!, where the golden angle belongs.
d(3,  'Tutorial', 'parawhat',   'PARAWHAT?!',   '-pe-RAS-te-kee-',                     'Turn on or adjust parastichy line visibility.',         [34, 55], custom('dom'));
d(4,  'Tutorial', 'art',        'ART!',         '-change how it looks, not what it is-','Change any appearance setting.',                       [433],  custom('dom'));
d(5,  'Tutorial', 'bophades',   'ORBS!',        '-so big-',                            'Take node size to its maximum.',                        [8],    custom('dom'));
d(6,  'Tutorial', 'maximalist', 'MAXIMALIST!',  '-push the slider all the way-',       'Take the range slider to its maximum, 2500.',           [999],  custom('dom'));
d(7,  'Tutorial', 'zoomies',    'ZOOMIES!',     '-faster, all the way-',               'Turn morph speed up to maximum.',                       [88, 121], custom());
d(8,  'Tutorial', 'boing',      'BOING!',       '-wait for the bottom-',               'Let the morph reach the Spring form.',                  [6],    custom('sampled'));
d(9,  'Tutorial', 'trippy',     'TRIPPY!',      '-there is a button for this-',        'Press Dazzle.',                                         [815],  custom('dom'));
d(10, 'Tutorial', 'nerd',       'NERD!',        '-drag the classroom across-',         'Open the classroom lens.',                              [42],   custom());
// DECOMPOSE! is the second half of NERD!, not a duplicate of it: NERD! rewards
// opening the lens, this rewards using it. Gilds 30 because 2 x 3 x 5 is the
// cleanest three-distinct-factor number on the board — three runs converging,
// which is the whole argument for the view. 42 belongs to NERD! already.
d(11, 'Tutorial', 'decompose',  'DECOMPOSE!',   '-take one apart-',                    'Tap a number under the classroom lens to break it into its prime factors.', [30], custom('event'));
d(12, 'Tutorial', 'ouch',       'OUCH!',        '-take hold of the Sun-',              'With physics on, drag node 0.',                         [149],  custom('event'));
d(13, 'Tutorial', 'oops',       'OOPS!',        '-make the springs disagree-',         'With physics on, knock half the nodes well out of place at the same time.', [641], custom('sampled'));
d(14, 'Tutorial', 'night',      'NIGHT!',       '-put out the Sun-',                   'Switch off the zero node.',                             [354],  custom());
d(15, 'Tutorial', 'void',       'VOID!',        '-take every prime away-',             'Deselect every prime.',                                 [],     custom());
d(16, 'Tutorial', 'empty-set',  'EMPTY SET!',   '-then take away what was left-',      'Deselect every prime and switch off both 0 and 1.',     [86],   custom());
// The last two corner controls. Both are "this feature exists" invitations —
// the trophy room and the ad shop are the only major features with nothing
// pointing at them.
d(17, 'Tutorial', 'gallery',    'GALLERY!',     '-see what you have won-',             'Open the trophy room.',                                 [100],  custom('dom'));
// TEMPTED! fires on OPENING the shop and never on buying. An achievement that
// paid out for a purchase would be a different kind of product entirely.
d(18, 'Tutorial', 'tempted',    'TEMPTED!',     '-open the shop, buy nothing-',        'Open the advertisement shop.',                          [99],   custom('event'));

// ---- MATH · SERIES ------------------------------------------------------
d(19, 'Series', 'fibonacci', 'FIBONACCI!', '-how nature counts-',            'Select exactly the five Fibonacci primes and nothing else.', FIB_NODES,   sel(2, 3, 5, 13, 89));
d(20, 'Series', 'lucas',     'LUCAS!',     '-two and one, then add as before-',     'Select exactly 2, 3, 7, 11, 29 and 47.',                     LUCAS_NODES, sel(2, 3, 7, 11, 29, 47));
d(21, 'Series', 'perfect',   'PERFECT!',   '-equal to the sum of its parts-','Select exactly 2, 3, 7 and 31.',   [...SERIES.perfect, ...PERFECT_NODES], sel(2, 3, 7, 31));

// ---- MATH · PRIMES ------------------------------------------------------
d(22, 'Primes', 'twinning',    'TWINNING!',     '-one even number between them-',        "Select exactly two primes that differ by 2.",                SERIES.twins,   custom());
d(23, 'Primes', 'cousins',     'COUSINS!',      '-four apart-',                          'Select exactly two primes that differ by 4.',                SERIES.cousins, custom());
d(24, 'Primes', 'sexy',        'SEXY!',         '-six apart, and that is the real name-','Select exactly two primes that differ by 6.',                SERIES.sexy,    custom());
d(25, 'Primes', 'germain',     'GERMAIN!',      '-double it, add one-',                  'Select exactly two primes p and q where q = 2p+1.',          SERIES.germain, custom());
d(26, 'Primes', 'emirp',       'EMIRP!',        '-read it the other way-',               "Select exactly two primes that are each other's digit reversal.", SERIES.emirp, custom());
d(27, 'Primes', 'fermat',      'FERMAT!',       '-one more than a power of two-',        'Select exactly 3, 5 and 17.',                                [3, 5, 17, 255, 257],   sel(3, 5, 17));
d(28, 'Primes', 'neat',        'NEAT!',         '-almost a straight line-',              'Two primes selected, one of them 89, with the range at least 178.', [89],             custom(), { gildLines: [89] });
d(29, 'Primes', 'louder',      'LOUDER!',       '-these ones go to-',                    'Select exactly 11.',                                         [11],                   sel(11));
d(30, 'Primes', 'smart',       'SMART!',        '-intro class-',                         'Select exactly 101 and view it through the classroom lens.', [101],                  custom());
d(31, 'Primes', 'balanced',    'BALANCED!',     '-exactly halfway between its neighbours-','Select exactly 5 and 53.',                       [3, 5, 7, 47, 53, 59],            sel(5, 53));
d(32, 'Primes', 'stride',      'STRIDE!',       '-the widest step-',                     'Select exactly 113 and 127.',                    STRIDE_GAP,                       sel(113, 127));
d(33, 'Primes', 'all-prime',   'PRIME DIGITS!', '-every digit too-',                     'Select exactly 2, 3, 5, 7, 23, 37, 53 and 73.',  PRIME_DIGIT_NODES,                sel(...PRIME_DIGIT_PRIMES));
d(34, 'Primes', 'super-prime', 'SUPERPRIME!',   '-count the primes and land on one-',    'Select exactly 3, 5, 11, 17, 31, 41, 59, 67, 83, 109 and 127.', SUPER_PRIME_NODES,   sel(...SUPER_PRIMES));

// ---- MATH · PUZZLES -----------------------------------------------------
d(35, 'Puzzles', 'goldbach',  'GOLDBACH!',   '-two make an even-',                'With the range set to an even number, select exactly two primes that add up to it.', GOLDBACH_EVENS,  custom());
d(36, 'Puzzles', 'collatz',   'COLLATZ!',    '-halve it, or triple it and add one-',               'Select exactly 13 and 67.',                                   [871],            sel(13, 67));
d(37, 'Puzzles', 'run',       'RUN!',        '-a run of them adds up to another-','Select three or more primes in a row together with the prime they add up to.', RUN_TARGETS, custom());
d(38, 'Puzzles', 'stairs',    'STAIRS!',     '-three evenly spaced-',             'Select exactly three primes that are evenly spaced.',         [3, 5, 7],        custom());
d(39, 'Puzzles', 'square-up', 'SQUARE UP!',  '-two that add to a square-',        'Select exactly two primes that add up to a square number.',   SQUARE_UP_NODES,  custom());

// ---- CULTURE · MEME -----------------------------------------------------
d(40, 'Meme', 'nice',    'NICE!',     '-nice-',                'Select exactly 3 and 23.',       [69],  sel(3, 23));
d(41, 'Meme', 'dude',    'DUDE!',     '-what was I saying?-',  'Select exactly 2, 3, 5 and 7.',  [420], sel(2, 3, 5, 7));
d(42, 'Meme', 'meme',    'MEME!',     '-kids these days-',     'Select exactly 67.',             [67],  sel(67));
d(43, 'Meme', 'oil',     'OIL!',      '-upside down-',         'Select exactly 2, 5 and 71.',    [710], sel(2, 5, 71));
d(44, 'Meme', 'catch',   'CATCH!',    '-damned either way-',   'Select exactly 2 and 11.',       [22],  sel(2, 11));
d(45, 'Meme', 'route',   'ROUTE!',    '-get your kicks-',      'Select exactly 2, 3 and 11.',    [66],  sel(2, 3, 11));
d(46, 'Meme', 'cards',   'CARDS!',    '-hit me-',              'Select exactly 3 and 7.',        [21],  sel(3, 7));
d(47, 'Meme', 'jackpot', 'JACKPOT!',  '-three of a kind-',     'Select exactly 3, 7 and 37.',    [777], sel(3, 7, 37));
d(48, 'Meme', 'heinz',   'HEINZ!',    '-varieties-',           'Select exactly 3 and 19.',       [57],  sel(3, 19));
d(49, 'Meme', 'slurpee', 'SLURPEE!',  '-any time-',            'Select exactly 3 and 79.',       [711], sel(3, 79));
d(50, 'Meme', 'sparta',  'SPARTA!',   '-this is-',             'Select exactly 2, 3 and 5, with the range at 300.', [300], sel(2, 3, 5));
d(51, 'Meme', 'jumbo',   'JUMBO!',    '-upper deck-',          'Select exactly 3 and 83.',       [747], sel(3, 83));
d(52, 'Meme', 'deck',    'DECK!',     '-a full one-',          'Select exactly 2 and 13.',       [52],  sel(2, 13));

// ---- CULTURE · LORE -----------------------------------------------------
d(53, 'Lore', 'beast',       'BEAST!',       '-number of a man-',       'Select exactly 2, 3 and 37.',       [666],      sel(2, 3, 37));
d(54, 'Lore', 'angel',       'ANGEL!',       '-a repeating message-',   'Select exactly 2, 3, 5, 7 and 37.', REPDIGITS,  sel(2, 3, 5, 7, 37));
d(55, 'Lore', 'lucky',       'LUCKY!',       '-*th heaven-',            'Select exactly 7.',                 [7],        sel(7));
d(56, 'Lore', 'unlucky',     'UNLUCKY!',     '-fourteenth floor-',      'Select exactly 13.',                [13],       sel(13));
// DELIBERATE: the trigger does NOT match the gilded node's factors. 5 opens 23
// — the Law of Fives, 2+3=5. The only such exception in the design, and the
// discord is the joke. Do not "correct" it. See docs/ACHIEVEMENTS.md §6.
d(57, 'Lore', 'enigma',      'ENIGMA!',      '-fnord-',                 'Select exactly 5.',                 [23],       sel(5));
d(58, 'Lore', 'masonic',     'MASONIC!',     '-the highest degree-',    'Select exactly 3 and 11.',          [33],       sel(3, 11));
d(59, 'Lore', 'other-beast', 'OTHER BEAST!', '-the older manuscript-',  'Select exactly 2, 7 and 11.',       [616],      sel(2, 7, 11));
d(60, 'Lore', 'rest',        'REST!',        '-gotta take breaks-',     'Pause the transport.',              REST_NODES, custom('dom'));
// DELIBERATE: a range trigger outside the Dial cluster. Range 8 leaves a spare
// eight-node figure, which suits the idea.
d(61, 'Lore', 'eightfold',   'SIT!',         '-the middle way-',        'Set the range to 8.',               [8],        range(8));
d(62, 'Lore', 'sator',       'SATOR!',       '-reads the same every way-','Select all palindromic primes.',  PALINDROME_NODES, sel(...PALINDROMIC_PRIMES));
d(63, 'Lore', 'choirs',      'CHOIRS!',      '-nine ranks of them-',    'Select exactly 3.',                 [9],        sel(3));

// ---- CULTURE · GEEK -----------------------------------------------------
d(64, 'Geek', 'not-found',  'NOT FOUND!',  '-missing-',                   'Select exactly 2 and 101.',                          [404], sel(2, 101));
d(65, 'Geek', 'teapot',     'TEAPOT!',     '-short and stout-',           'Select exactly 2, 11 and 19.',                       [418], sel(2, 11, 19));
d(66, 'Geek', 'bradbury',   'BRADBURY!',   '-burning point-',             'Select exactly 11 and 41.',                          [451], sel(11, 41));
d(67, 'Geek', 'trek',       '1701!',       '-turns up more often than it should-',        'Select exactly 47.',                                 [47],  sel(47));
d(68, 'Geek', 'localhost',  'LOCALHOST!',  '-no place like it-',          'Select exactly 127, with the range set to 127.',     [127], custom());
d(69, 'Geek', 'rawr',       'RAWR!',       '-so random-',                 'Select exactly 17.',                                 [17],  sel(17));
d(70, 'Geek', 'best',       'BEST!',       '-the twenty-first, reflected-','Select exactly 37 and 73.',                         [12, 21, 37, 73], sel(37, 73));
d(71, 'Geek', 'concert-a',  'CONCERT A!',  '-tune up-',                   'Select exactly 2, 5 and 11.',                        [440], sel(2, 5, 11));
d(72, 'Geek', 'lightspeed', 'LIGHTSPEED!', '-in a vacuum-',               'Select exactly 13 and 23.',                          [299], sel(13, 23));
d(73, 'Geek', 'memory',     'MEMORY!',     '-ought to be enough-',        'Select exactly 2 and 5.',                            [640], sel(2, 5));
d(74, 'Geek', 'skeleton',   'SKELETON!',   '-what you are built on-',     'Select exactly 2 and 103.',                          [206], sel(2, 103));
d(75, 'Geek', 'inherited',  'INHERITED!',  '-what makes you you-',        'Select exactly 2 and 23.',                           [46],  sel(2, 23));
d(76, 'Geek', 'elements',   'ELEMENTS!',   '-the whole table-',           'Select exactly 2 and 59.',                           [118], sel(2, 59));
d(77, 'Geek', 'freezing',   'FREEZING!',   '-where water gives up, K?-',  'Select exactly 3, 7 and 13.',                        [273], sel(3, 7, 13));
d(78, 'Geek', 'body-heat',  'BODY HEAT!',  '-normal, C?-',                'Select exactly 37.',                                 [37],  sel(37));
// 212 is gilded twice on purpose: NY! dials it, BOILING! takes it apart.
d(79, 'Geek', 'boiling',    'BOILING!',    '-F water-',                   'Select exactly 2 and 53.',                           [212], sel(2, 53));

// ---- CULTURE · CALENDAR -------------------------------------------------
d(80, 'Calendar', 'year',     'YEAR!',     '-once around-',                          'Select exactly 5 and 73.',      [365], sel(5, 73));
d(81, 'Calendar', 'leap',     'LEAP!',     "-dayn't-",                               'Select exactly 2, 3 and 61.',   [366], sel(2, 3, 61));
d(82, 'Calendar', 'months',   'MONTHS!',   "-not a baker's-",                        'Select exactly 2 and 3.',       [12],  sel(2, 3));
d(83, 'Calendar', 'moon',     'LUNA!',     '-one cycle of it-',                      'Select exactly 29.',            [29],  sel(29));
d(84, 'Calendar', 'metonic',  'METONIC!',  '-wait long enough and the moon repeats-','Select exactly 19.',            [19],  sel(19));
d(85, 'Calendar', 'quarter',  'QUARTER!',  '-thirteen weeks-',                       'Select exactly 7 and 13.',      [91],  sel(7, 13));
d(86, 'Calendar', 'shortest', 'SHORTEST!', '-February, usually-',                    'Select exactly 2 and 7.',       [28],  sel(2, 7));
d(87, 'Calendar', 'longest',  'LONGEST!',  '-thirty days hath not this one-',        'Select exactly 31.',            [31],  sel(31));

// ---- CULTURE · DIAL — the trigger is dialling ---------------------------
d(88, 'Dial', 'help',       'HELP!',       '-dial-',                       'Set the range to 911.', [911], range(911));
d(89, 'Dial', 'central',    'CENTRAL!',    '-the number that never rings-','Set the range to 555.', [555], range(555));
d(90, 'Dial', 'ny',         'NY!',         '-NY-',                         'Set the range to 212.', [212], range(212));
d(91, 'Dial', 'space-city', 'SPACE CITY!', '-we have a problem-',          'Set the range to 713.', [713], range(713));
d(92, 'Dial', 'graceland',  'GRACELAND!',  '-the king-',                   'Set the range to 901.', [901], range(901));
d(93, 'Dial', 'motor-city', 'MOTOR CITY!', '-lose yourself-',              'Set the range to 313.', [313], range(313));
d(94, 'Dial', 'vice',       'VICE!',       '-south beach-',                'Set the range to 305.', [305], range(305));
d(95, 'Dial', 'bay',        'BAY!',        '-by the bay-',                 'Set the range to 415.', [415], range(415));
d(96, 'Dial', 'aloha',      'ALOHA!',      '-island time-',                'Set the range to 808.', [808], range(808));
d(97, 'Dial', 'nola',       'NOLA!',       '-the big easy-',               'Set the range to 504.', [504], range(504));

// ---- CULTURE · GREEKS — constants as angles ----------------------------
// DEV: PHI! is a DOM trigger and the other two Greeks are not, which looks
// inconsistent until you check the default: DEFAULT_CONFIG.divergenceAngle IS
// the golden angle, so a state test for it is true the instant achievements are
// switched on. Caught on a Pixel 7 — PHI! had awarded itself before the player
// touched anything. It binds to the "Reset to φ" button instead, which is a
// thing somebody has to do. π and τ are safe as state tests because neither is
// a default.
// The one Greek that gilds an ANGLE rather than decimal digits, and it should:
// its criteria is about the golden angle, so 137 is the number a player goes
// looking for. PI! and TAU! keep their digits (314, 628) because their angles
// are 180 and 360, which mean nothing on this figure.
d(98, 'Greeks', 'phi', 'PHI!', '-the angle nature picks-', 'Set the divergence angle back to the golden angle.', [137], custom('dom'));
d(99, 'Greeks', 'pi',  'PI!',  '-half a turn-',            'Set the divergence angle to 180 degrees.',      [314], custom());
d(100,'Greeks', 'tau', 'TAU!', '-the whole turn-',         'Set the divergence angle to a full turn.',      [628], custom());

// ---- CAPSTONE ----------------------------------------------------------
// DEV: node 1 has an empty factorisation, so the derivation rule can never
// reach it. It is reachable only here.
d(101,'Capstone', 'unity', 'UNITY!', '-everything else, first-', 'Earn every other achievement.', [1], custom('derived'));

export const ACHIEVEMENT_DEFS = defs;


// ============================================================
// BLURBS
// ============================================================
// The explanation, shown when an EARNED achievement is tapped open. Never on a
// locked row: the blurb is the reward for having worked it out, and half of it
// would give the answer away.
//
// DEV: these live apart from the definitions purely so the list above stays
// scannable — a hundred and one rows each carrying a paragraph is unreadable.
// They came from docs/achievements-v6.xlsx, which is where they were written.
//
// Thirteen achievements have none, deliberately. A blurb earns its place when
// there is real mathematics or a real fact behind the joke; NICE! explaining
// itself would be worse than NICE! saying nothing.
const BLURBS = {
  'first':
    'Congratulations, you\'ve unlocked the Achievements! As a reward, your trophy room view has a ' +
    'gilded 2. So shiny! So rewarding! How many more numbers can you gild? Only one way to find ' +
    'out! (In the world of Primes, 2 comes 1st.)',
  'exhaustive': 'You\'ve discovered the many toggles that change the shape of the Pretty Number Machine. Nice!',
  'parawhat':
    'Counting by prime multiples looks cool. This is the texture of the numberline implicit in ' +
    'the concept of quantity. You\'re unlocking the arcane mysteries of the universe on a phone ' +
    'app! The future is wild!',
  'art': 'Art cannot be explained, it must be EXPERIENCED!',
  'decompose':
    'Every natural number has a unique collection of primes that make it up, and every collection ' +
    'of primes makes a natural number. This is the backbone of all mathematics.',
  'gallery': 'The trophy room shows you all that you\'ve unlocked. Look at that!',
  'tempted': 'Spare a coin?',
  'bophades': 'Wow, they\'re huge!',
  'maximalist': 'So many!',
  'zoomies': '88 miles an hour, and 1.21 gigawatts.',
  'boing': 'Boingyboingyboingy! 6 looks kinda like a spring, right?',
  'trippy':
    'Far out dude, look at all the colors! You know, like, sunflowers are like a lotus if you ' +
    'really think about it man. Anyway, are you big into music?',
  'nerd':
    'Knowing the name of a thing may not tell you much about its intrinsic nature, but precise ' +
    'jargon sure helps in conversation!',
  'ouch': 'Oof, you okay? Sun hot.',
  'oops': 'Physics allows for stuff to get weird.',
  'night': 'Uhh, who turned out the lights?',
  'void':
    'Turn off every prime and two numbers are left: 0 and 1. They are the only ones not built out ' +
    'of primes.',
  // The character is U+2205 EMPTY SET, not a slashed zero and not a Scandinavian
  // O. It is the achievement's whole joke, so it is the symbol itself rather
  // than a description of one.
  'empty-set': '∅. Not zero, nothing. Null. Zilch.',
  'fibonacci':
    'The Fibonacci numbers are 1, 1, 2, 3, 5, 8, 13, 21 and so on. Add the last two to get the ' +
    'next. Can be found on the spirals of a pinecone.',
  'lucas':
    'The Lucas numbers follow the same rule as the Fibonacci numbers – add the last two to get the ' +
    'next – but start 2, 1 instead of 1, 1. You get a completely different sequence that still ' +
    'grows at the golden ratio. The two are twins: change only where you begin.',
  'perfect':
    'A perfect number equals the sum of its proper divisors: 6 = 1+2+3, and 28 = 1+2+4+7+14. Euclid ' +
    'proved that 2^(p-1)(2^p - 1) is perfect whenever 2^p - 1 is prime, and Euler proved every even ' +
    'perfect number has that form. So each one is built from a Mersenne prime: 6 = 2x3, 28 = 4x7, ' +
    '496 = 16x31. Only three exist below 1000; the next is 8128. Whether any odd perfect number ' +
    'exists is still open after two thousand years.',
  'twinning':
    'Twin primes are only 2 apart, like 11 and 13. Nobody knows whether they ever stop; people have ' +
    'been trying to find out since 1849. Look at where they sit and you will notice something: ' +
    'every prime above 3 is one away from a multiple of six. Of the six numbers around any multiple ' +
    'of six, four are divisible by 2 or by 3, so only the two neighbours are ever left standing – ' +
    'and a pair of twins is a multiple of six with a prime on each side.',
  'cousins': 'Primes 4 apart are called cousins. That is the real name.',
  'sexy':
    'Primes 6 apart are called sexy primes. Sex is Latin for six. Mathematicians named these and ' +
    'nobody stopped them.',
  'germain':
    'Pick a prime, double it, add 1. If that is prime too, the first one is a Sophie Germain prime. ' +
    'Sophie Germain had to sign her work with a man\'s name to get anyone to read it.',
  'emirp':
    'Write a prime backwards. If you get a different prime, it is an emirp – which is \'prime\' ' +
    'spelled backwards. There are four pairs in the grid: 13 and 31, 17 and 71, 37 and 73, 79 and ' +
    '97.',
  'fermat':
    '3, 5 and 17 are each one more than a power of two: 2+1, 4+1, 16+1. Fermat believed every ' +
    'number of that shape was prime.',
  'neat':
    'Each node sits a little further round the circle than the one before. Turn that far 89 times ' +
    'and you land almost exactly back where you started. So the multiples of 89 stack up in a ' +
    'nearly straight line – the only spoke in the whole figure.',
  'smart': '101 reads the same forwards and backwards. It is the smallest three-digit prime.',
  'balanced':
    '5 sits exactly halfway between 3 and 7. 53 sits exactly halfway between 47 and 59. They are ' +
    'the only two primes in this grid that are the average of the primes on either side of them – ' +
    'everywhere else the gap in front and the gap behind are different sizes.',
  'stride':
    'After 113 the next prime is 127. Thirteen numbers in a row with nothing prime among them, ' +
    'the widest gap anywhere in this grid. Gaps grow without limit, and you can force one as long ' +
    'as ' +
    'you like: take any n, and n!+2, n!+3, all the way to n!+n are every one of them composite, ' +
    'because n!+k always has k as a factor.',
  'all-prime':
    '2, 3, 5 and 7 are the prime digits. Eight primes are written with nothing else, and ' +
    'eighty-four numbers altogether. Worth noticing that this is a fact about writing in base ten ' +
    'rather than about the numbers themselves – change base and the set dissolves.',
  'super-prime':
    '2 is the 1st prime, 3 is the 2nd, 5 is the 3rd, 7 is the 4th. Now ask which primes sit at a ' +
    'prime position – the 2nd, the 3rd, the 5th, the 7th, and so on. You get 3, 5, 11, 17, 31, 41, ' +
    '59, 67, 83, 109 and 127 — and they keep going, thirty-nine of them below a thousand. ' +
    'Primes counted by primes, and you can do the whole thing by counting.',
  'goldbach':
    'Every even number bigger than 2 seems to be the sum of two primes. 100 = 3 + 97. 232 = 101 + ' +
    '131. Nobody has ever found an exception, and nobody has ever proved there isn\'t one – it has ' +
    'been open since 1742. Eighteen of the even numbers you can reach here have exactly one answer.',
  'collatz':
    'Take any number. If it is even, halve it. If it is odd, triple it and add one. Repeat. ' +
    'Everything anyone has ever tried falls to 1 eventually, and nobody can prove it always will. ' +
    '871 takes 178 steps to get there, the longest of anything under a thousand.',
  'run':
    'Primes standing next to each other can add up to another prime. 17 = 2+3+5+7. 41 = 11+13+17. ' +
    'And 127 = 3+5+7+11+13+17+19+23+29, a run of nine. There are sixteen of these to find in the ' +
    'grid if you use at least three in a row.',
  'stairs':
    '3, 5 and 7 climb in equal steps of two, and they are the only three primes in a row that ever ' +
    'can be – take any three odd numbers two apart and one of them is always a multiple of 3. ' +
    'Evenly spaced runs of primes do exist at every length, though, and that they go on forever was ' +
    'only proved in 2004.',
  'square-up':
    '2 + 7 = 9. 5 + 11 = 16. 13 + 23 = 36. Ten squares can be reached by adding two primes from ' +
    'this grid, and it is worth looking at which. The odd squares – 9, 25, 49, 81 – can only be ' +
    'reached when one of your two primes is 2, because every other prime is odd and two odd numbers ' +
    'always add to an even one.',
  'nice': 'nice.',
  'dude': 'I\'m hungry, you hungry?',
  'oil': '5318008 was out of scope.',
  'heinz':
    '57 varieties, yes. But 57 is also the Grothendieck prime: one of the greatest mathematicians ' +
    'of the century, asked for an example of a prime number, said 57. It is not one: it is ' +
    '3 x 19.',
  'deck': 'Fifty-two cards: four suits of thirteen.',
  'beast':
    'The number of the beast, from Revelation. It is also the sum of the squares of the first seven ' +
    'primes: 4 + 9 + 25 + 49 + 121 + 169 + 289 = 666.',
  'angel':
    'Repeated digits are read as messages in some numerology. Every one of them is a multiple of ' +
    '111, and 111 is 3 x 37 – so 37 is hiding inside all nine. The five primes you selected are ' +
    'exactly the ones needed to build the whole set: 5 appears only in 555, and 7 only in 777.',
  'unlucky':
    'Fear of thirteen is common enough to have a name – triskaidekaphobia – and common enough ' +
    'that plenty of buildings label the floor above twelve as fourteen.',
  'other-beast':
    'The oldest surviving fragment of Revelation gives the number as 616, not 666. Both readings ' +
    'circulated in antiquity.',
  'rest': 'Rest on the seventh day.',
  'eightfold':
    'The Noble Eightfold Path sets out eight practices, traditionally gathered into three ' +
    'divisions: wisdom, conduct and discipline. Eight is also the luckiest number in Chinese ' +
    'tradition, because the word for it sounds like the word for prosperity.',
  'sator':
    'SATOR AREPO TENET OPERA ROTAS – a five-by-five Latin word square that reads the same left to ' +
    'right, right to left, top to bottom and bottom to top. One was scratched into a wall at ' +
    'Pompeii before AD 79, and they kept turning up across Europe for the next thousand years, ' +
    'carved on churches and carried as charms. Twenty-five letters, five by five, so the number ' +
    'is the shape. A number that reads the same in both directions is a palindrome, and there are ' +
    'a hundred and eight of them below a thousand.',
  'choirs':
    'Pseudo-Dionysius sorted the angels into nine choirs in the sixth century: seraphim, cherubim, ' +
    'thrones, dominions, virtues, powers, principalities, archangels, angels.',
  'not-found':
    '404 is the code a server sends when the thing you asked for is not there. It is also the area ' +
    'code for Atlanta.',
  'teapot':
    'HTTP 418 is a real, published status code meaning \'I\'m a teapot\'. It was written as an ' +
    'April Fool\'s joke in 1998 and people have been refusing to remove it ever since.',
  'bradbury':
    'The temperature at which paper catches fire, and the title of Bradbury\'s novel about burning ' +
    'books. HTTP 451 borrows it for content blocked for legal reasons.',
  'trek':
    'A writer on Star Trek had been at a college with a running joke that 47 turns up more often ' +
    'than chance allows. He started putting it in scripts.',
  'localhost':
    '127 is the biggest number a computer can hold in one byte if it also needs room for a minus ' +
    'sign. It is also the address a computer uses to talk to itself.',
  'rawr':
    'Ask people to pick a random number from 1 to 20 and more of them say 17 than anything else. ' +
    'Ask for 1 to 100 and they say 37.',
  'best':
    '73 is the 21st prime. 21 is 7 times 3. Flip 73 around and you get 37, which is the 12th prime ' +
    '-- and 12 is 21 flipped around.',
  'concert-a':
    'The A above middle C, at 440 hertz, is what an orchestra tunes to. It was only fixed by ' +
    'international agreement in 1955.',
  'lightspeed':
    'Light travels 299,792,458 metres every second, and that number is exact – since 1983 the ' +
    'metre has been defined by it rather than the other way round.',
  'memory':
    '"640K ought to be enough for anybody" is the most famous thing Bill Gates never said. He has ' +
    'denied it for forty years – "I\'ve said some stupid things and some wrong things, but not ' +
    'that" – and nobody has ever produced a contemporaneous source. It survives because it is ' +
    'exactly what someone in 1981 might plausibly have said.',
  'skeleton':
    'An adult has 206 bones. A newborn has closer to 270 – more, not fewer – and loses the ' +
    'difference as separate bones fuse together on the way up.',
  'inherited': 'Twenty-three pairs. One of each pair from each parent.',
  'elements':
    '118 elements have been named. Everything past uranium at 92 is made rather than found, and the ' +
    'last of them, oganesson, has been produced a few atoms at a time.',
  'freezing':
    'Water freezes at 273 kelvin and boils at 373 – exactly one hundred apart, which is the whole ' +
    'definition of the Celsius degree. The same digits turn up as -273 on the Celsius scale, ' +
    'because that is where the kelvin scale starts and nothing can go below it.',
  'body-heat':
    '37 degrees Celsius. The famous 98.6 in Fahrenheit is a conversion of it, and its false ' +
    'precision comes from converting a rounded number: the original nineteenth-century figure was ' +
    'simply 37.',
  'boiling': 'Water boils at 212 Fahrenheit. 212 is also Manhattan\'s area code. Almost certainly unrelated.',
  'year':
    '365 days is one trip around the Sun – near enough. The real figure is about a quarter of a ' +
    'day longer, and every calendar humans have built is an argument about what to do with that ' +
    'quarter.',
  'leap':
    'The quarter-day, collected up and spent every fourth year. Not quite every fourth: century ' +
    'years are skipped unless they divide by 400, which is why 1900 was an ordinary year and 2000 ' +
    'was not.',
  'months':
    'Twelve months, because twelve lunar cycles very nearly fill a solar year. They do not fill it ' +
    'exactly, and the eleven-day shortfall is the reason the months drifted loose from the moon.',
  'moon':
    'New moon to new moon is 29 and a half days. The half is why lunar calendars alternate 29-day ' +
    'and 30-day months rather than picking one.',
  'metonic':
    'Nineteen years is almost exactly 235 lunar months – out by about two hours. Meton of Athens ' +
    'noticed in 432 BC, and the cycle is still load-bearing: it is why Easter moves on a ' +
    'nineteen-year pattern and why the Hebrew calendar inserts a leap month seven times in nineteen ' +
    'years.',
  'quarter':
    'Ninety-one days, which is thirteen weeks exactly. Four of them come to 364 – one day short of ' +
    'a year, which is why no quarter ever starts on the same weekday twice running.',
  'shortest':
    'February is short because Roman calendars ran on twelve months of irregular length and ' +
    'February was the one left holding the shortfall.',
  'longest':
    'Seven months have 31 days. The pattern looks arbitrary because it is – it survives from Roman ' +
    'reforms that were about politics more than astronomy.',
  'help':
    '911 has been the emergency number across North America since 1968. Before that every town had ' +
    'its own, and you had to know which.',
  'central':
    'North American numbers beginning 555 are reserved, which is why every telephone number in a ' +
    'film or on television starts that way.',
  'ny': '212 is Manhattan below 96th Street, and the most sought-after area code in America.',
  'space-city': '713 is Houston, home of mission control.',
  'graceland': '901 is Memphis.',
  'motor-city': '313 is Detroit – Motown, techno, and the city that put the world on wheels.',
  'vice': '305 is Miami, and it covered the whole of south Florida until 1995.',
  'bay': '415 is San Francisco.',
  'aloha':
    '808 is the whole of Hawaii on a single area code. It is also the Roland TR-808, the drum ' +
    'machine that built hip-hop.',
  'nola': '504 is New Orleans.',
  'phi':
    'The golden angle is what you get when you divide a full turn in the golden ratio: about 137.5 ' +
    'degrees. It is the angle a sunflower uses, because it is the angle least well approximated by ' +
    'any simple fraction – so consecutive seeds never fall into a small number of spokes, at any ' +
    'scale. This whole figure is built on it. 1.618 is the golden ratio itself.',
  'pi':
    'Set the divergence to half a turn and the figure collapses into two arms, because every second ' +
    'node lands in the same place. That is what a rational angle does, and it is exactly what the ' +
    'golden angle avoids.',
  'tau':
    'Tau is two pi – one whole turn. Set the divergence there and every node lands on top of the ' +
    'last one, collapsing the figure to a single spoke. Some argue tau should have been the circle ' +
    'constant all along, since a turn is the thing you actually measure.',
  'unity':
    '1 is not prime, and it is not built out of primes either. It is called the unit – the thing ' +
    'you count with. You get it last because you have to get everything else first, and when you ' +
    'do, every gilded prime finally gets its line and all of its multiples.',
};


// ============================================================
// LINKS
// ============================================================
// A reference for anyone the joke or the mathematics passed by. Shown on an
// EARNED row underneath the blurb, never on a locked one — a link is as much a
// giveaway as a blurb is.
//
// WHY A FIELD RATHER THAN MARKUP IN THE BLURB: blurbs are shared with the Play
// Console paste through tools/achievements-table.mjs, and an anchor written
// into blurb text would leak straight into that column.
//
// Most of the 101 carry one. The rest are jokes that a footnote would only
// flatten — ORBS!, TRIPPY!, MEME! and the like. The ones that need it MOST are
// the twelve with no blurb at all, where the link is not a footnote but the
// entire explanation.
//
// The exact count is NOT written here. It was, and it went stale within a day
// when two links were dropped for content rating. check-achievements.mjs
// asserts it instead, which is the only place a number like that stays true.
//
// CONTENT RATING. A link is a MACHINE-READABLE ASSERTION in a way a number is
// not. 420 on its own, under the clue "-what was I saying?-", is a number; a
// link to "420 (cannabis culture)" is documentary evidence of a drug reference
// sitting in the shipped bundle, and the IARC questionnaire asks about exactly
// that. Six links were retargeted to the neutral number article and two were
// dropped, so the jokes stay for whoever gets them and nothing in the app
// asserts what they are about:
//
//   DUDE! 420, JACKPOT! 777, CARDS! 21   — drugs and gambling
//   ENIGMA! 23, MASONIC! 33              — occult and fraternal
//   NICE! 69, OIL! 710                   — dropped; both keep their blurb
//
// SATOR! moved to the palindrome article for a different reason: since v7 it
// gilds every palindrome, so that is genuinely what its payoff is about.
//
// What was deliberately KEPT, because an encyclopedia article on it is not a
// content rating: SEXY! -> Sexy primes (a real mathematical term), BEAST! and
// OTHER BEAST! -> Number of the beast (biblical scholarship), REST! -> Sabbath,
// SIT! -> Noble Eightfold Path, CHOIRS! -> Hierarchy of angels, SPARTA! ->
// Battle of Thermopylae. §3's line holds here too: the app reports what
// communities believe about numbers and asserts nothing.
//
// check-achievements.mjs scans every link against a denylist so this cannot
// quietly come back.
//
// Every title was checked against the Wikipedia API: all resolve directly, and
// none is a redirect or a disambiguation page. Eleven were wrong on the first
// pass — CENTRAL! pointed at a disambiguation page, and every area-code article
// has been renamed at some point. Re-check with two API calls if they rot.
const LINKS = {
  'all-prime': 'https://en.wikipedia.org/wiki/Decimal',
  'aloha': 'https://en.wikipedia.org/wiki/Area_code_808',
  'angel': 'https://en.wikipedia.org/wiki/Repdigit',
  'balanced': 'https://en.wikipedia.org/wiki/Balanced_prime',
  'bay': 'https://en.wikipedia.org/wiki/Area_codes_415_and_628',
  'beast': 'https://en.wikipedia.org/wiki/Number_of_the_beast',
  'best': 'https://en.wikipedia.org/wiki/73_%28number%29',
  'body-heat': 'https://en.wikipedia.org/wiki/Human_body_temperature',
  'boiling': 'https://en.wikipedia.org/wiki/Fahrenheit',
  'bradbury': 'https://en.wikipedia.org/wiki/Fahrenheit_451',
  'cards': 'https://en.wikipedia.org/wiki/21_%28number%29',
  'catch': 'https://en.wikipedia.org/wiki/Catch-22_%28logic%29',
  'central': 'https://en.wikipedia.org/wiki/Fictitious_telephone_number',
  'choirs': 'https://en.wikipedia.org/wiki/Hierarchy_of_angels',
  'collatz': 'https://en.wikipedia.org/wiki/Collatz_conjecture',
  'concert-a': 'https://en.wikipedia.org/wiki/A440_%28pitch_standard%29',
  'cousins': 'https://en.wikipedia.org/wiki/Cousin_prime',
  'deck': 'https://en.wikipedia.org/wiki/Standard_52-card_deck',
  'decompose': 'https://en.wikipedia.org/wiki/Fundamental_theorem_of_arithmetic',
  'dude': 'https://en.wikipedia.org/wiki/420_%28number%29',
  'eightfold': 'https://en.wikipedia.org/wiki/Noble_Eightfold_Path',
  'elements': 'https://en.wikipedia.org/wiki/Periodic_table',
  'emirp': 'https://en.wikipedia.org/wiki/Emirp',
  'empty-set': 'https://en.wikipedia.org/wiki/Empty_set',
  'enigma': 'https://en.wikipedia.org/wiki/23_%28number%29',
  'exhaustive': 'https://en.wikipedia.org/wiki/Natural_number',
  'fermat': 'https://en.wikipedia.org/wiki/Fermat_number',
  'fibonacci': 'https://en.wikipedia.org/wiki/Fibonacci_sequence',
  'freezing': 'https://en.wikipedia.org/wiki/Kelvin',
  'germain': 'https://en.wikipedia.org/wiki/Safe_and_Sophie_Germain_primes',
  'goldbach': 'https://en.wikipedia.org/wiki/Goldbach%27s_conjecture',
  'graceland': 'https://en.wikipedia.org/wiki/Area_code_901',
  'heinz': 'https://en.wikipedia.org/wiki/57_%28number%29',
  'help': 'https://en.wikipedia.org/wiki/911_%28emergency_telephone_number%29',
  'inherited': 'https://en.wikipedia.org/wiki/Chromosome',
  'jackpot': 'https://en.wikipedia.org/wiki/777_%28number%29',
  'jumbo': 'https://en.wikipedia.org/wiki/Boeing_747',
  'leap': 'https://en.wikipedia.org/wiki/Leap_year',
  'lightspeed': 'https://en.wikipedia.org/wiki/Speed_of_light',
  'localhost': 'https://en.wikipedia.org/wiki/Localhost',
  'longest': 'https://en.wikipedia.org/wiki/Gregorian_calendar',
  'louder': 'https://en.wikipedia.org/wiki/Up_to_eleven',
  'lucas': 'https://en.wikipedia.org/wiki/Lucas_number',
  'lucky': 'https://en.wikipedia.org/wiki/7',
  'masonic': 'https://en.wikipedia.org/wiki/33_%28number%29',
  'memory': 'https://en.wikipedia.org/wiki/Conventional_memory',
  'metonic': 'https://en.wikipedia.org/wiki/Metonic_cycle',
  'months': 'https://en.wikipedia.org/wiki/Month',
  'moon': 'https://en.wikipedia.org/wiki/Lunar_month',
  'motor-city': 'https://en.wikipedia.org/wiki/Area_codes_313_and_679',
  'neat': 'https://en.wikipedia.org/wiki/Golden_angle',
  'nola': 'https://en.wikipedia.org/wiki/Area_code_504',
  'not-found': 'https://en.wikipedia.org/wiki/HTTP_404',
  'ny': 'https://en.wikipedia.org/wiki/Area_codes_212%2C_646%2C_and_332',
  'other-beast': 'https://en.wikipedia.org/wiki/Number_of_the_beast',
  'parawhat': 'https://en.wikipedia.org/wiki/Phyllotaxis',
  'perfect': 'https://en.wikipedia.org/wiki/Perfect_number',
  'phi': 'https://en.wikipedia.org/wiki/Golden_angle',
  'pi': 'https://en.wikipedia.org/wiki/Pi',
  'quarter': 'https://en.wikipedia.org/wiki/Week',
  'rawr': 'https://en.wikipedia.org/wiki/17_%28number%29',
  'rest': 'https://en.wikipedia.org/wiki/Sabbath',
  'route': 'https://en.wikipedia.org/wiki/U.S._Route_66',
  'run': 'https://en.wikipedia.org/wiki/Prime_number',
  'sator': 'https://en.wikipedia.org/wiki/Palindromic_number',
  'sexy': 'https://en.wikipedia.org/wiki/Sexy_primes',
  'shortest': 'https://en.wikipedia.org/wiki/February',
  'skeleton': 'https://en.wikipedia.org/wiki/Human_skeleton',
  'slurpee': 'https://en.wikipedia.org/wiki/Slurpee',
  'smart': 'https://en.wikipedia.org/wiki/101_%28number%29',
  'space-city': 'https://en.wikipedia.org/wiki/Area_codes_713%2C_281%2C_832%2C_346%2C_and_621',
  'sparta': 'https://en.wikipedia.org/wiki/Battle_of_Thermopylae',
  'square-up': 'https://en.wikipedia.org/wiki/Square_number',
  'stairs': 'https://en.wikipedia.org/wiki/Primes_in_arithmetic_progression',
  'stride': 'https://en.wikipedia.org/wiki/Prime_gap',
  'super-prime': 'https://en.wikipedia.org/wiki/Super-prime',
  'tau': 'https://en.wikipedia.org/wiki/Tau_%28mathematics%29',
  'teapot': 'https://en.wikipedia.org/wiki/Hyper_Text_Coffee_Pot_Control_Protocol',
  'trek': 'https://en.wikipedia.org/wiki/47_%28number%29',
  'twinning': 'https://en.wikipedia.org/wiki/Twin_prime',
  'unity': 'https://en.wikipedia.org/wiki/1',
  'unlucky': 'https://en.wikipedia.org/wiki/Triskaidekaphobia',
  'vice': 'https://en.wikipedia.org/wiki/Area_codes_305%2C_786%2C_and_645',
  'void': 'https://en.wikipedia.org/wiki/1',
  'year': 'https://en.wikipedia.org/wiki/Tropical_year',
};

// DEV: the en-dash pass happens HERE rather than in the strings above, because
// a long blurb is wrapped across several literals and a " -- " that straddles
// the join never appears contiguously in the source. BEST! was the one that got
// away when this was done with a search and replace.
for (const a of ACHIEVEMENT_DEFS) {
  a.blurb = (BLURBS[a.id] || '').replace(/ -- /g, ' – ');
  a.link = LINKS[a.id] || '';
}

// ============================================================
// THE GILDING RULE
// ============================================================
// **A node is gold if an EARNED achievement names it.** That is the whole rule,
// and it is the biggest change from v1.
//
// v1 also derived: owning every prime in a number's factorisation lit the
// number. That needed a conjunction to stop it running away — measured, three
// easy achievements once lit 715 of 726 gold nodes in six taps. v2 solves the
// same problem more directly by not deriving at all until the very end.
//
// **UNITY! is the flood.** Earn the capstone and every gilded prime gets its
// parastichy line and all of its multiples at once. It is the last thing you
// earn and it is meant to feel like the board catching fire.
//
// One exception, deliberate: NEAT! draws 89's line without UNITY!, because the
// near-straight spoke IS the achievement. Its multiples stay dark — the line is
// the point, not the numbers sitting on it.
export function computeGild(enabledIds, list = ACHIEVEMENT_DEFS) {
  const en = enabledIds instanceof Set ? enabledIds : new Set(enabledIds);
  const litNodes = new Set();
  const litLines = new Set();
  for (const a of list) {
    if (!en.has(a.id)) continue;
    for (const n of a.gildNodes) litNodes.add(n);
    for (const p of a.gildLines) litLines.add(p);
  }
  const unity = en.has('unity');
  if (unity) {
    // Every gilded prime gets its line. Multiples come from isNodeGilded().
    for (const n of litNodes) if (PSET.has(n)) litLines.add(n);
  }
  return { litNodes, litLines, unity };
}

export function isNodeGilded(n, gild) {
  if (n === 0) return false;              // the Sun is its own thing
  if (gild.litNodes.has(n)) return true;
  if (n === 1) return false;              // the unit: UNITY! names it or nothing
  if (!gild.unity) return false;          // nothing derives before the capstone
  const f = primeFactorsOf(n);
  return f.length > 0 && f.every(p => gild.litNodes.has(p));
}

export function isLineGilded(p, gild) {
  return gild.litLines.has(p);
}

// Every node reachable with the whole list earned and switched on.
export function gildForAll(list = ACHIEVEMENT_DEFS) {
  return computeGild(list.map(a => a.id), list);
}

// Nodes no achievement names and no derivation can reach. The design's headroom.
export function darkNodes(limit = TROPHY_N, list = ACHIEVEMENT_DEFS) {
  const g = gildForAll(list);
  const out = [];
  for (let n = 2; n <= limit; n++) if (!isNodeGilded(n, g)) out.push(n);
  return out;
}

// ============================================================
// PREDICATE SUPPORT
// ============================================================
// RUN! asks whether a set of primes is a run of consecutive primes. That is a
// fact about the integers, not about the app, so it lives here where the
// headless checker can reach it.
export function isConsecutivePrimeRun(arr) {
  if (arr.length < 2) return false;
  const start = P1000.indexOf(arr[0]);
  if (start < 0) return false;
  return arr.every((v, i) => P1000[start + i] === v);
}

// ============================================================
// LOOKUPS
// ============================================================
export const BY_CLUSTER = (() => {
  const m = new Map();
  for (const a of ACHIEVEMENT_DEFS) {
    if (!m.has(a.cluster)) m.set(a.cluster, []);
    m.get(a.cluster).push(a);
  }
  return m;
})();

export const CLUSTER_ORDER = ['Tutorial', 'Series', 'Primes', 'Puzzles', 'Meme',
                              'Lore', 'Geek', 'Calendar', 'Dial', 'Greeks', 'Capstone'];

export function totalXP(list = ACHIEVEMENT_DEFS) {
  return list.reduce((s, a) => s + a.xp, 0);
}
