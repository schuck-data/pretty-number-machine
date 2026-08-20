// PNM — Achievement Number Sets
//
// Every integer set the achievement design depends on, and the gilding rule
// itself. Split out from achievements.js for the same reason core/math.js is
// split out from everything else: **this file has no Three.js dependency and no
// renderer dependency**, so it can be imported, reasoned about and tested
// without a browser. `node tools/check-achievements.mjs` does exactly that.
//
// That matters more here than it looks. These lists are long, several of them
// are easy to get subtly wrong by hand, and a wrong one would be invisible in
// the app — an achievement that simply never fires, or a node quietly gilded
// that should not be. They are computed rather than written out as literals for
// the same reason the golden angle is computed in math.js: a hand-copied list
// is a second source of truth that drifts in silence.

import { SELECTABLE_PRIMES, isPrimeNumber, primeFactorsOf } from '../core/math.js';

// The range the gilding design is specified against, and the trophy room's
// pinned N. See docs/achievements-design.xlsx, "Trophy room" tab.
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

export function divisorCount(n) {
  let c = 0;
  for (let d = 1; d * d <= n; d++) {
    if (n % d !== 0) continue;
    c += (d * d === n) ? 1 : 2;
  }
  return c;
}

// EDU: a highly composite number has strictly more divisors than every number
// below it. They are the exact opposite of primes — a prime has no factors at
// all, and these have as many as it is possible to have at their size. 840 has
// thirty-two, more than any number under a thousand. Ramanujan named and
// catalogued them in 1915.
export function seqHighlyComposite(limit) {
  const out = [];
  let best = 0;
  for (let n = 2; n <= limit; n++) {
    const d = divisorCount(n);
    if (d > best) { best = d; out.push(n); }
  }
  return out;
}

// EDU: a perfect number equals the sum of its proper divisors — 6 = 1+2+3.
// Euclid showed 2^(p-1)(2^p - 1) is perfect whenever 2^p - 1 is prime, and
// Euler showed every even perfect number has that shape, so each one carries a
// Mersenne prime inside it: 6 = 2x3, 28 = 4x7, 496 = 16x31. Only three exist
// below 1000. Whether an ODD perfect number exists is still open after two
// thousand years.
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

// EDU: node n is placed at a distance proportional to the square root of n —
// see SPACING_2D in core/math.js for why that exponent is forced. So the square
// numbers land at distances 2, 3, 4, 5: evenly spaced, marching straight
// outward, while everything around them crowds together. That regularity is a
// property of THIS arrangement, not of the squares.
export function seqSquares(limit) {
  const out = [];
  for (let k = 2; k * k <= limit; k++) out.push(k * k);
  return out;
}

export function multiplesOf(p, limit) {
  const out = [];
  for (let k = 1; k * p <= limit; k++) out.push(k * p);
  return out;
}

// EDU: square each digit, add them up, repeat. Land on 1 and the number is
// "happy". Fail and you fall into a cycle that always passes through 89 and
// never leaves. Every number does one or the other, and the reason is a size
// argument: above 1000 the map strictly decreases, so no trajectory can escape
// upward forever and all of them must eventually repeat.
export function isHappy(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = String(n).split('').reduce((s, d) => s + (+d) * (+d), 0);
  }
  return n === 1;
}

export const reverseNum = n => +String(n).split('').reverse().join('');

export const FIB_NODES     = seqFib(TROPHY_N);
export const LUCAS_NODES   = seqLucas(TROPHY_N);
export const HCN_NODES     = seqHighlyComposite(TROPHY_N);
export const PERFECT_NODES = seqPerfect(TROPHY_N);
export const SQUARE_NODES  = seqSquares(TROPHY_N);
export const NEAT_NODES    = multiplesOf(89, TROPHY_N);

// ============================================================
// PRIME FAMILIES
// ============================================================
// All derived from SELECTABLE_PRIMES, so widening or narrowing the panel's grid
// changes every one of these with it rather than leaving them stale.
export const FAM = {
  twins:   P.filter(p => PSET.has(p - 2) || PSET.has(p + 2)),
  cousins: P.filter(p => PSET.has(p - 4) || PSET.has(p + 4)),
  sexy:    P.filter(p => PSET.has(p - 6) || PSET.has(p + 6)),
  // EDU: p is a Sophie Germain prime when 2p+1 is also prime. The partner need
  // not be inside the grid — 131 qualifies because 263 is prime, even though
  // 263 is not selectable. The family is defined by the property, not by what
  // the panel happens to offer.
  germain: P.filter(p => isPrimeNumber(2 * p + 1)),
  happy:   P.filter(isHappy),
  // EDU: an emirp is a prime whose digits reversed give a DIFFERENT prime.
  // "Emirp" is "prime" spelled backwards.
  emirp:   P.filter(p => reverseNum(p) !== p && isPrimeNumber(reverseNum(p)) && PSET.has(reverseNum(p))),
  // EDU: Euler's polynomial n^2 + n + 41 is prime for every n from 0 to 39.
  // Feeding it 0..9 lands exactly ten primes, and n = 10 gives 151, which falls
  // off the end of the grid — the run terminates on its own.
  euler:   Array.from({ length: 10 }, (_, n) => n * n + n + 41),
  fibPrimes:     FIB_NODES.filter(n => PSET.has(n) && isPrimeNumber(n)),
  lucasPrimes:   LUCAS_NODES.filter(n => PSET.has(n) && isPrimeNumber(n)),
  perfectPrimes: [...new Set(PERFECT_NODES.flatMap(primeFactorsOf))].sort((a, b) => a - b),
};

// ============================================================
// THE DEFINITIONS
// ============================================================
// Data only — no predicates, because a predicate needs the live `state` and
// that would drag the renderer back in here. modules/achievements.js supplies
// one test function per id and merges the two halves.
//
// EVERY achievement gilds NODES, and nothing gilds a prime directly. That is
// the whole design and it is worth understanding before changing anything here,
// because the obvious alternative was tried and measured and it collapsed.
//
// The first version let a family "own" its primes outright, so that owning a
// prime lit every composite built from it. Measured in a browser: TWINNING!,
// SEXY! and GERMAIN! — three achievements, six taps — owned 31 of the 32
// primes and lit 715 of the 726 gold nodes. Ninety-eight per cent of the
// finished trophy room, from three of forty achievements, and the remaining
// thirty-seven were worth eleven nodes between them.
//
// So ownership is now a CONJUNCTION rather than a disjunction: see the gilding
// rule below. Under it those same three achievements light 31 nodes.
//
// XP: 45 each across 40 achievements is 1,800 of the 2,000 Play Games allows,
// holding 200 back. Deliberately not 50: achievements can be added after
// publication but almost certainly not removed, so a list that spends the whole
// budget is the one shape that cannot be corrected later.
export const XP = 45;

const d = (id, name, subtitle, trigger, gildNodes = [], extra = {}) => ({
  id, name, subtitle, trigger,
  xp: XP, kind: 'standard',
  gildNodes,
  ...extra,
});

export const ACHIEVEMENT_DEFS = [
  // ---- families: named number sets, marked on the figure ----
  d('fibonacci', 'FIBONACCI!', 'How nature counts.', 'state', FIB_NODES),
  d('perfect', 'PERFECT!', 'Equal to the sum of its own parts.', 'state',
    [...FAM.perfectPrimes, ...PERFECT_NODES]),
  d('ramanujan', 'RAMANUJAN!', 'More factors than anything smaller.', 'state', HCN_NODES),
  d('lucas', 'LUCAS!', 'Same rule, different start.', 'state', LUCAS_NODES),
  d('squares', 'SQUARES!', 'Evenly spaced, all the way out.', 'state', SQUARE_NODES),
  d('emirp', 'EMIRP!', 'Prime, backwards.', 'state', FAM.emirp),
  d('twinning', 'TWINNING!', 'Two apart, forever.', 'state', FAM.twins),
  d('cousins', 'COUSINS!', 'Close, but not that close.', 'state', FAM.cousins),
  d('sexy', 'SEXY!', "It's Latin. Honestly.", 'state', FAM.sexy),
  d('germain', 'GERMAIN!', 'p, and twice p plus one.', 'state', FAM.germain),
  d('happy', 'HAPPY!', 'Square the digits. Repeat.', 'state', FAM.happy),
  d('euler', 'EULER!', "He's everywhere!", 'state', FAM.euler),

  // ---- the capstone ----
  // DEV: node 1 has an empty factorisation, so the derivation rule would light
  // it for free. It is reachable only here. UNITY! is also the master switch —
  // see applyUnityOverride() in the rule below.
  d('unity', 'UNITY!', 'Everything else, first.', 'derived', [1]),

  // ---- individual numbers ----
  d('first', 'FIRST!', 'The game begins.', 'dom', [2],
    { dom: { selector: '#achievements-toggle', event: 'change' } }),
  d('louder', 'LOUDER!', 'These go to eleven.', 'state', [11]),
  d('rawr', 'RAWR!', 'U R so random!', 'state', [17]),
  d('best', 'BEST!', 'The best number.', 'state', [37, 73]),
  // The claim is about the multiples of 89 stacking into a spoke, so it marks
  // all eleven of them rather than 89 alone.
  d('neat', 'NEAT!', '89 is oddly tidy.', 'state', NEAT_NODES),
  d('trek', '1701!', 'Deck 47, Sector 47, 47 casualties.', 'state', [47]),
  d('sixseven', 'SIXSEVEN!', 'Kids these days.', 'dom', [67],
    { dom: { selector: '.prime-btn[data-prime="67"]', event: 'click' } }),
  d('smart', 'SMART!', 'Prime 101.', 'state', [101]),
  d('localhost', 'LOCALHOST!', "There's no place like it.", 'state', [127]),

  // ---- general ----
  // Every gild here was chosen for the number's meaning. The ones marked
  // RESCUE are primes above 131, which no amount of prime-ownership can ever
  // reach — an explicit gild is their only route, so they are the only entries
  // in this block that change the FINISHED picture rather than merely lighting
  // something sooner.
  d('ouch', 'OUCH!', 'You touched the Sun!', 'event', [149],   // RESCUE. 1 AU: 149.6 million km.
    { busEvent: 'physics:dragStart' }),
  // VOID! and EMPTY SET! gild nothing, on purpose. An achievement called
  // EMPTY SET! that gilds the empty set is correct, not an oversight.
  d('void', 'VOID!', 'Behold the nothing!', 'state', []),
  d('empty-set', 'EMPTY SET!', 'The empty set.', 'state', []),
  d('night', 'NIGHT!', 'Who turned out the Sun?!', 'state', [354]),  // lunar year: 12 lunar months vs 365 solar.
  d('boing', 'BOING!', 'You saw the spring!', 'sampled', [314]),     // RESCUE (2 x 157). pi — a spring's period is 2*pi*sqrt(m/k).
  d('trippy', 'TRIPPY!', 'Woah man, check it out!', 'dom', [419],    // RESCUE. Bicycle Day, 19 April 1943.
    { dom: { selector: '#dazzle-btn', event: 'click' } }),
  d('oops', 'OOPS!', 'Is it supposed to do that?', 'sampled', [641]), // RESCUE. 641 divides 2^32+1, which Fermat said was prime.
  d('zoomies', 'ZOOMIES!', "Look at 'em go!", 'state', [88, 121]),   // 88 mph, 1.21 gigawatts.
  d('maximalist', 'MAXIMALIST!', 'It just keeps going!', 'dom', [999],
    { dom: { selector: '#n-slider', event: 'input' } }),
  d('ceiling', 'CEILING!', "That's the lot.", 'state', [997]),        // RESCUE. Largest prime under 1000.
  d('exhaustive', 'EXHAUSTIVE!', "Yep, that's all of 'em!", 'dom', [1000],
    { dom: { selector: '#show-all-integers', event: 'change' } }),
  d('parawhat', 'PARAWHAT?!', 'pe-RAS-te-kee', 'dom', [137],          // RESCUE. The golden angle is 137.5 degrees — the reason parastichies exist. Also the one prime the panel refuses to offer.
    { dom: { selector: '#show-curves, #line-width', event: 'input change' } }),
  d('nerd', 'NERD!', 'Great minds think!', 'state', [42]),
  d('art', 'ART!', 'Beauty is in the eye of the beholder!', 'dom', [433],  // RESCUE. John Cage, 4'33".
    { dom: { selector: '#section-appearance input, #section-appearance select',
             event: 'input change' } }),
  d('bophades', 'BOPHADES!', 'Yup, pretty big!', 'dom', [2],
    { dom: { selector: '#node-size', event: 'input' } }),

  d('nice', 'NICE!', 'Nice.', 'state', [69]),
  d('dude', 'DUDE!', 'Heh.', 'state', [420]),
  d('meme', 'MEME!', 'Two numbers, both alike in dignity.', 'state', [67, 69]),
];

// ============================================================
// THE GILDING RULE
// ============================================================
// Two things can make a node gold, and they are not the same thing.
//
//  1. It was gilded DIRECTLY. Some achievement lists it in gildNodes. This is
//     the only way to reach a node carrying a prime factor above 131, since no
//     amount of prime-ownership can touch those.
//
//  2. It DERIVED. Every prime in its factorisation is owned — not any, every.
//     Owning 2 lights 2, 4, 8 and 16, but not 6, which also needs 3, and not
//     10, which also needs 5. A number is yours when you own everything it is
//     built from, which is the same claim the app already makes about colour.
//
// And owning a prime is a CONJUNCTION. A prime becomes owned only when EVERY
// achievement that gilds it has been earned. Prime 11 is gilded by LUCAS!,
// TWINNING!, COUSINS!, SEXY!, GERMAIN! and LOUDER!, so all six are needed —
// each one on its own merely lights node 11 as a node, and nothing derives.
//
// That inversion is the load-bearing idea. The many routes to a prime used to
// be alternatives, and three easy achievements consequently handed over 98% of
// the board. Now they are requirements, and the same three light 31 nodes.
//
// A pleasant consequence nobody designed: the number of routes varies from two
// to six, and it is the SMALL primes that need the most. So the thin primes
// (59 and 127, two routes each) fall early, and 2, 3, 7, 11 and 13 — the ones
// that build most of the number line — come last. The board floods near the
// end, when a long conjunction finally closes.

// Which achievements gild each selectable prime. Computed over the FULL design,
// never over the enabled subset — these are the requirements, not the progress.
export function primeRoutes(defs = ACHIEVEMENT_DEFS) {
  const routes = new Map();
  for (const p of SELECTABLE_PRIMES) {
    routes.set(p, defs.filter(a => a.gildNodes.includes(p)).map(a => a.id));
  }
  return routes;
}

const ROUTES = primeRoutes();

// `enabledIds` is what the player has earned AND left switched on in the trophy
// room. The two are deliberately the same input: the room lets you mix and
// match, so "what is gilded" is a question about the current view, not about
// the ledger. Pass the unlocked set for the plain answer.
export function computeGild(enabledIds, defs = ACHIEVEMENT_DEFS) {
  const en = enabledIds instanceof Set ? enabledIds : new Set(enabledIds);
  const litNodes = new Set();
  for (const a of defs) {
    if (!en.has(a.id)) continue;
    for (const n of a.gildNodes) litNodes.add(n);
  }

  const ownedPrimes = new Set();
  for (const p of SELECTABLE_PRIMES) {
    const r = ROUTES.get(p);
    if (r && r.length && r.every(id => en.has(id))) ownedPrimes.add(p);
  }

  // The UNITY! override. Once the capstone is earned and switched on, every
  // prime currently lit becomes owned outright, whatever its conjunction says.
  //
  // DEV: this is what makes the trophy room's per-achievement toggles usable.
  // Without it the dial is violently non-linear — switching off any single
  // route to prime 2 un-owns 2 and takes most of the composites with it, which
  // measured as 726 gold dropping to 137 from one toggle. With UNITY! on, a
  // toggle only removes that achievement's own nodes and the derivation holds
  // steady. Two modes, both wanted: UNITY! off is the exploratory dial, UNITY!
  // on is the stable showcase.
  if (en.has('unity')) {
    for (const n of litNodes) if (PSET.has(n) && isPrimeNumber(n)) ownedPrimes.add(n);
  }

  return { litNodes, ownedPrimes };
}

export function isNodeGilded(n, gild) {
  if (n === 0) return false;              // the Sun is its own thing
  if (gild.litNodes.has(n)) return true;
  if (n === 1) return false;              // the unit: UNITY! or nothing
  if (gild.ownedPrimes.size === 0) return false;
  const f = primeFactorsOf(n);
  return f.length > 0 && f.every(p => gild.ownedPrimes.has(p));
}

// Nodes no prime-ownership can ever reach: they carry a prime factor outside
// the grid, so a direct gild is their only route. The design's headline claim.
export function unreachableByPrimes(limit = TROPHY_N) {
  const out = [];
  for (let n = 2; n <= limit; n++) {
    if (primeFactorsOf(n).some(p => !PSET.has(p))) out.push(n);
  }
  return out;
}

// Every node reachable with the whole list earned and switched on.
export function gildForAll(defs = ACHIEVEMENT_DEFS) {
  return computeGild(defs.map(a => a.id), defs);
}
