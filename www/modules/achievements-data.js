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
export const SUPER_PRIMES = P1000.filter((p, i) => isPrimeNumber(i + 1)).filter(p => PSET.has(p));

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

const defs = [];
const d = (no, cluster, id, name, clue, criteria, gildNodes, trigger, opts = {}) => {
  defs.push({
    no, id, name, clue, criteria, cluster,
    branch: opts.branch || BRANCH_OF[cluster],
    gildNodes, gildLines: opts.gildLines || [],
    xp: id === 'unity' ? XP_UNITY : XP,
    blurb: opts.blurb || '',
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
d(3,  'Tutorial', 'parawhat',   'PARAWHAT?!',   '-pe-RAS-te-kee-',                     'Turn on or adjust parastichy line visibility.',         [137],  custom('dom'));
d(4,  'Tutorial', 'art',        'ART!',         '-change how it looks, not what it is-','Change any appearance setting.',                       [433],  custom('dom'));
d(5,  'Tutorial', 'bophades',   'ORBS!',        '-so big-',                            'Take node size to its maximum.',                        [8],    custom('dom'));
d(6,  'Tutorial', 'maximalist', 'MAXIMALIST!',  '-push the slider all the way-',       'Take the range slider to its maximum, 2500.',           [999],  custom('dom'));
d(7,  'Tutorial', 'ceiling',    'CEILING!',     '-the slider was lying-',              'Set the range to 10000.',                               [997],  custom());
d(8,  'Tutorial', 'zoomies',    'ZOOMIES!',     '-faster, all the way-',               'Turn morph speed up to maximum.',                       [88, 121], custom());
d(9,  'Tutorial', 'boing',      'BOING!',       '-wait for the bottom-',               'Let the morph reach the Spring form.',                  [6],    custom('sampled'));
d(10, 'Tutorial', 'trippy',     'TRIPPY!',      '-there is a button for this-',        'Press Dazzle.',                                         [815],  custom('dom'));
d(11, 'Tutorial', 'nerd',       'NERD!',        '-drag the classroom across-',         'Open the classroom lens.',                              [42],   custom());
d(12, 'Tutorial', 'ouch',       'OUCH!',        '-take hold of the Sun-',              'With physics on, drag node 0.',                         [149],  custom('event'));
d(13, 'Tutorial', 'oops',       'OOPS!',        '-make the springs disagree-',         'Get 20 or more nodes further than twice their rest distance from the Sun.', [641], custom('sampled'));
d(14, 'Tutorial', 'night',      'NIGHT!',       '-put out the Sun-',                   'Switch off the zero node.',                             [354],  custom());
d(15, 'Tutorial', 'void',       'VOID!',        '-take every prime away-',             'Deselect every prime.',                                 [],     custom());
d(16, 'Tutorial', 'empty-set',  'EMPTY SET!',   '-then take away what was left-',      'Deselect every prime and switch off both 0 and 1.',     [86],   custom());

// ---- MATH · SERIES ------------------------------------------------------
d(17, 'Series', 'fibonacci', 'FIBONACCI!', '-how nature counts-',            'Select exactly the five Fibonacci primes and nothing else.', FIB_NODES,   sel(2, 3, 5, 13, 89));
d(18, 'Series', 'lucas',     'LUCAS!',     '-fibonacci, but different-',     'Select exactly 2, 3, 7, 11, 29 and 47.',                     LUCAS_NODES, sel(2, 3, 7, 11, 29, 47));
d(19, 'Series', 'perfect',   'PERFECT!',   '-equal to the sum of its parts-','Select exactly 2, 3, 7 and 31.',   [...SERIES.perfect, ...PERFECT_NODES], sel(2, 3, 7, 31));

// ---- MATH · PRIMES ------------------------------------------------------
d(20, 'Primes', 'twinning',    'TWINNING!',     '-one even number between them-',        "Select exactly two primes that differ by 2.",                SERIES.twins,   custom());
d(21, 'Primes', 'cousins',     'COUSINS!',      '-four apart-',                          'Select exactly two primes that differ by 4.',                SERIES.cousins, custom());
d(22, 'Primes', 'sexy',        'SEXY!',         '-six apart, and that is the real name-','Select exactly two primes that differ by 6.',                SERIES.sexy,    custom());
d(23, 'Primes', 'germain',     'GERMAIN!',      '-double it, add one-',                  'Select exactly two primes p and q where q = 2p+1.',          SERIES.germain, custom());
d(24, 'Primes', 'emirp',       'EMIRP!',        '-read it the other way-',               "Select exactly two primes that are each other's digit reversal.", SERIES.emirp, custom());
d(25, 'Primes', 'mersenne',    'MERSENNE!',     '-one less than a power of two-',        'Select exactly 3, 7, 31 and 127.',                           [3, 7, 31, 127],        sel(3, 7, 31, 127));
d(26, 'Primes', 'fermat',      'FERMAT!',       '-one more than a power of two-',        'Select exactly 3, 5 and 17.',                                [3, 5, 17, 255, 257],   sel(3, 5, 17));
d(27, 'Primes', 'neat',        'NEAT!',         '-almost a straight line-',              'Two primes selected, one of them 89, with the range at least 178.', [89],             custom(), { gildLines: [89] });
d(28, 'Primes', 'louder',      'LOUDER!',       '-these ones go to-',                    'Select exactly 11.',                                         [11],                   sel(11));
d(29, 'Primes', 'smart',       'SMART!',        '-intro class-',                         'Select exactly 101 and view it through the classroom lens.', [101],                  custom());
d(30, 'Primes', 'balanced',    'BALANCED!',     '-exactly halfway between its neighbours-','Select exactly 5 and 53.',                                 [5, 53],                sel(5, 53));
d(31, 'Primes', 'stride',      'STRIDE!',       '-the widest step-',                     'Select exactly 113 and 127.',                                [113, 127],             sel(113, 127));
d(32, 'Primes', 'all-prime',   'PRIME DIGITS!', '-every digit too-',                     'Select exactly 2, 3, 5, 7, 23, 37, 53 and 73.',              PRIME_DIGIT_PRIMES,     sel(...PRIME_DIGIT_PRIMES));
d(33, 'Primes', 'super-prime', 'SUPERPRIME!',   '-count the primes and land on one-',    'Select exactly 3, 5, 11, 17, 31, 41, 59, 67, 83, 109 and 127.', SUPER_PRIMES,        sel(...SUPER_PRIMES));

// ---- MATH · PUZZLES -----------------------------------------------------
d(34, 'Puzzles', 'goldbach',  'GOLDBACH!',   '-two make an even-',                'With the range set to an even number, select exactly two primes that add up to it.', GOLDBACH_EVENS,  custom());
d(35, 'Puzzles', 'collatz',   'COLLATZ!',    '-the long way down-',               'Select exactly 13 and 67.',                                   [871],            sel(13, 67));
d(36, 'Puzzles', 'run',       'RUN!',        '-a run of them adds up to another-','Select three or more primes in a row together with the prime they add up to.', RUN_TARGETS, custom());
d(37, 'Puzzles', 'stairs',    'STAIRS!',     '-three evenly spaced-',             'Select exactly three primes that are evenly spaced.',         [3, 5, 7],        custom());
d(38, 'Puzzles', 'square-up', 'SQUARE UP!',  '-two that add to a square-',        'Select exactly two primes that add up to a square number.',   SQUARE_UP_NODES,  custom());

// ---- CULTURE · MEME -----------------------------------------------------
d(39, 'Meme', 'nice',    'NICE!',     '-nice-',                'Select exactly 3 and 23.',       [69],  sel(3, 23));
d(40, 'Meme', 'dude',    'DUDE!',     '-what was I saying?-',  'Select exactly 2, 3, 5 and 7.',  [420], sel(2, 3, 5, 7));
d(41, 'Meme', 'meme',    'MEME!',     '-kids these days-',     'Select exactly 67.',             [67],  sel(67));
d(42, 'Meme', 'oil',     'OIL!',      '-upside down-',         'Select exactly 2, 5 and 71.',    [710], sel(2, 5, 71));
d(43, 'Meme', 'catch',   'CATCH!',    '-damned either way-',   'Select exactly 2 and 11.',       [22],  sel(2, 11));
d(44, 'Meme', 'route',   'ROUTE!',    '-get your kicks-',      'Select exactly 2, 3 and 11.',    [66],  sel(2, 3, 11));
d(45, 'Meme', 'cards',   'CARDS!',    '-hit me-',              'Select exactly 3 and 7.',        [21],  sel(3, 7));
d(46, 'Meme', 'jackpot', 'JACKPOT!',  '-three of a kind-',     'Select exactly 3, 7 and 37.',    [777], sel(3, 7, 37));
d(47, 'Meme', 'heinz',   'HEINZ!',    '-varieties-',           'Select exactly 3 and 19.',       [57],  sel(3, 19));
d(48, 'Meme', 'slurpee', 'SLURPEE!',  '-any time-',            'Select exactly 3 and 79.',       [711], sel(3, 79));
d(49, 'Meme', 'sparta',  'SPARTA!',   '-this is-',             'Select exactly 2, 3 and 5.',     [300], sel(2, 3, 5));
d(50, 'Meme', 'jumbo',   'JUMBO!',    '-upper deck-',          'Select exactly 3 and 83.',       [747], sel(3, 83));
d(51, 'Meme', 'deck',    'DECK!',     '-a full one-',          'Select exactly 2 and 13.',       [52],  sel(2, 13));

// ---- CULTURE · LORE -----------------------------------------------------
d(52, 'Lore', 'beast',       'BEAST!',       '-number of a man-',       'Select exactly 2, 3 and 37.',       [666],      sel(2, 3, 37));
d(53, 'Lore', 'angel',       'ANGEL!',       '-a repeating message-',   'Select exactly 2, 3, 5, 7 and 37.', REPDIGITS,  sel(2, 3, 5, 7, 37));
d(54, 'Lore', 'lucky',       'LUCKY!',       '-*th heaven-',            'Select exactly 7.',                 [7],        sel(7));
d(55, 'Lore', 'unlucky',     'UNLUCKY!',     '-fourteenth floor-',      'Select exactly 13.',                [13],       sel(13));
// DELIBERATE: the trigger does NOT match the gilded node's factors. 5 opens 23
// — the Law of Fives, 2+3=5. The only such exception in the design, and the
// discord is the joke. Do not "correct" it. See docs/ACHIEVEMENTS.md §6.
d(56, 'Lore', 'enigma',      'ENIGMA!',      '-fnord-',                 'Select exactly 5.',                 [23],       sel(5));
d(57, 'Lore', 'masonic',     'MASONIC!',     '-the highest degree-',    'Select exactly 3 and 11.',          [33],       sel(3, 11));
d(58, 'Lore', 'thelema',     'WHOLE!',       '-do what thou wilt-',     'Select exactly 3 and 31.',          [93],       sel(3, 31));
d(59, 'Lore', 'other-beast', 'OTHER BEAST!', '-the older manuscript-',  'Select exactly 2, 7 and 11.',       [616],      sel(2, 7, 11));
d(60, 'Lore', 'rest',        'REST!',        '-gotta take breaks-',     'Pause the transport.',              REST_NODES, custom('dom'));
// DELIBERATE: a range trigger outside the Dial cluster. Range 8 leaves a spare
// eight-node figure, which suits the idea.
d(61, 'Lore', 'eightfold',   'SIT!',         '-the middle way-',        'Set the range to 8.',               [8],        range(8));
d(62, 'Lore', 'sator',       'SATOR!',       '-reads the same every way-','Select all palindromic primes.',  [25],       sel(...PALINDROMIC_PRIMES));
d(63, 'Lore', 'choirs',      'CHOIRS!',      '-nine ranks of them-',    'Select exactly 3.',                 [9],        sel(3));

// ---- CULTURE · GEEK -----------------------------------------------------
d(64, 'Geek', 'not-found',  'NOT FOUND!',  '-missing-',                   'Select exactly 2 and 101.',                          [404], sel(2, 101));
d(65, 'Geek', 'teapot',     'TEAPOT!',     '-short and stout-',           'Select exactly 2, 11 and 19.',                       [418], sel(2, 11, 19));
d(66, 'Geek', 'bradbury',   'BRADBURY!',   '-burning point-',             'Select exactly 11 and 41.',                          [451], sel(11, 41));
d(67, 'Geek', 'trek',       '1701!',       '-deck 47, sector 47-',        'Select exactly 47.',                                 [47],  sel(47));
d(68, 'Geek', 'localhost',  'LOCALHOST!',  '-no place like it-',          'Select exactly 127, with the range set to 127.',     [127], custom());
d(69, 'Geek', 'rawr',       'RAWR!',       '-so random-',                 'Select exactly 17.',                                 [17],  sel(17));
d(70, 'Geek', 'best',       'BEST!',       '-the twenty-first, reflected-','Select exactly 37 and 73.',                         [37, 73], sel(37, 73));
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
d(98,  'Greeks', 'phi', 'PHI!', '-the angle nature picks-', 'Set the divergence angle to the golden angle.', [161], custom());
d(99,  'Greeks', 'pi',  'PI!',  '-half a turn-',            'Set the divergence angle to 180 degrees.',      [314], custom());
d(100, 'Greeks', 'tau', 'TAU!', '-the whole turn-',         'Set the divergence angle to a full turn.',      [628], custom());

// ---- CAPSTONE ----------------------------------------------------------
// DEV: node 1 has an empty factorisation, so the derivation rule can never
// reach it. It is reachable only here.
d(101, 'Capstone', 'unity', 'UNITY!', '-everything else, first-', 'Earn every other achievement.', [1], custom('derived'));

export const ACHIEVEMENT_DEFS = defs;

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
