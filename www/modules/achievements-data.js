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
// THE GILDING RULE
// ============================================================
// A node is gold iff EVERY prime in its factorisation is owned. Not "any":
// owning 2 lights 2, 4, 8 and 16, but not 6, which also needs 3, and not 10,
// which also needs 5. A number is yours when you own everything it is built
// from — the same claim the app already makes about colour.
//
// Three deliberate exceptions:
//
//   explicit  — the node is lit outright, whatever its factors. This is the
//               only way to reach a node with a prime factor above 131, since
//               no amount of prime-gilding can touch those. Exactly four exist
//               under 1000: 199, 233, 521 and 843.
//   multiples — every multiple of an owned prime, regardless of its other
//               factors. Reserved for an achievement whose claim is ABOUT the
//               multiples. NEAT! alone uses it.
//   node 1    — the unit has an empty factorisation, so the rule above would
//               light it for free. It is reachable only by an explicit gild.
//
// `gild` is { ownedPrimes:Set, explicitNodes:Set, multiplePrimes:Set }.
export function isNodeGilded(n, gild) {
  if (n === 0) return false;                       // the Sun is its own thing
  if (gild.explicitNodes.has(n)) return true;
  if (n === 1) return false;                       // unit: explicit only
  for (const p of gild.multiplePrimes) if (n % p === 0) return true;
  if (gild.ownedPrimes.size === 0) return false;
  const f = primeFactorsOf(n);
  return f.length > 0 && f.every(p => gild.ownedPrimes.has(p));
}

// Nodes no prime-gilding can ever reach: they carry a prime factor outside the
// grid, so only an explicit gild lights them. Used by the checker to assert the
// design's headline claim.
export function unreachableByPrimes(limit = TROPHY_N) {
  const out = [];
  for (let n = 2; n <= limit; n++) {
    if (primeFactorsOf(n).some(p => !PSET.has(p))) out.push(n);
  }
  return out;
}

// ============================================================
// THE DEFINITIONS
// ============================================================
// Data only — no predicates, because a predicate needs the live `state` and
// that would drag the renderer back in here. modules/achievements.js supplies
// one test function per id and merges the two halves.
//
// gildPrimes  — primes added to the player's owned set. Drives the
//               factorisation derivation AND gilds that prime's parastichy
//               curve.
// gildNodes   — exact integer nodes lit directly. Does NOT add anything to the
//               owned-prime set, so nothing derives from it. This is the
//               distinction that stops FIBONACCI! lighting node 2 and thereby
//               silently handing over every power of two.
//
// XP: 45 each across 40 achievements is 1,800 of the 2,000 Play Games allows,
// holding 200 back. Deliberately not 50: achievements can be added after
// publication but almost certainly not removed, so a list that spends the whole
// budget is the one shape that cannot be corrected later.
export const XP = 45;

const d = (id, name, subtitle, trigger, extra = {}) => ({
  id, name, subtitle, trigger,
  xp: XP, kind: 'standard',
  gildPrimes: [], gildNodes: [], gildRule: 'none',
  ...extra,
});

export const ACHIEVEMENT_DEFS = [
  d('fibonacci', 'FIBONACCI!', 'How nature counts.', 'state',
    { gildNodes: FIB_NODES, gildRule: 'explicit' }),
  d('perfect', 'PERFECT!', 'Equal to the sum of its own parts.', 'state',
    { gildPrimes: FAM.perfectPrimes, gildNodes: PERFECT_NODES, gildRule: 'factorisation' }),
  d('ramanujan', 'RAMANUJAN!', 'More factors than anything smaller.', 'state',
    { gildNodes: HCN_NODES, gildRule: 'explicit' }),
  d('lucas', 'LUCAS!', 'Same rule, different start.', 'state',
    { gildNodes: LUCAS_NODES, gildRule: 'explicit' }),
  d('squares', 'SQUARES!', 'Evenly spaced, all the way out.', 'state',
    { gildNodes: SQUARE_NODES, gildRule: 'explicit' }),
  d('emirp', 'EMIRP!', 'Prime, backwards.', 'state',
    { gildPrimes: FAM.emirp, gildRule: 'factorisation' }),
  d('twinning', 'TWINNING!', 'Two apart, forever.', 'state',
    { gildPrimes: FAM.twins, gildRule: 'factorisation' }),
  d('cousins', 'COUSINS!', 'Close, but not that close.', 'state',
    { gildPrimes: FAM.cousins, gildRule: 'factorisation' }),
  d('sexy', 'SEXY!', "It's Latin. Honestly.", 'state',
    { gildPrimes: FAM.sexy, gildRule: 'factorisation' }),
  d('germain', 'GERMAIN!', 'p, and twice p plus one.', 'state',
    { gildPrimes: FAM.germain, gildRule: 'factorisation' }),
  d('happy', 'HAPPY!', 'Square the digits. Repeat.', 'state',
    { gildPrimes: FAM.happy, gildRule: 'factorisation' }),
  d('euler', 'EULER!', "He's everywhere!", 'state',
    { gildPrimes: FAM.euler, gildRule: 'factorisation' }),

  d('unity', 'UNITY!', 'Everything else, first.', 'derived',
    { gildNodes: [1], gildRule: 'explicit' }),
  d('first', 'FIRST!', 'The game begins.', 'dom',
    { gildPrimes: [2], gildRule: 'factorisation',
      dom: { selector: '#achievements-toggle', event: 'change' } }),
  d('louder', 'LOUDER!', 'These go to eleven.', 'state',
    { gildPrimes: [11], gildRule: 'factorisation' }),
  d('rawr', 'RAWR!', 'U R so random!', 'state',
    { gildPrimes: [17], gildRule: 'factorisation' }),
  d('best', 'BEST!', 'The best number.', 'state',
    { gildPrimes: [37, 73], gildRule: 'factorisation' }),
  d('neat', 'NEAT!', '89 is oddly tidy.', 'state',
    { gildPrimes: [89], gildNodes: NEAT_NODES, gildRule: 'multiples' }),
  d('trek', '1701!', 'Deck 47, Sector 47, 47 casualties.', 'state',
    { gildPrimes: [47], gildRule: 'factorisation' }),
  d('sixseven', 'SIXSEVEN!', 'Kids these days.', 'dom',
    { gildPrimes: [67], gildRule: 'factorisation',
      dom: { selector: '.prime-btn[data-prime="67"]', event: 'click' } }),
  d('smart', 'SMART!', 'Prime 101.', 'state',
    { gildPrimes: [101], gildRule: 'factorisation' }),
  d('localhost', 'LOCALHOST!', "There's no place like it.", 'state',
    { gildPrimes: [127], gildRule: 'factorisation' }),

  d('ouch', 'OUCH!', 'You touched the Sun!', 'event',
    { busEvent: 'physics:dragStart' }),
  d('void', 'VOID!', 'Behold the nothing!', 'state'),
  d('empty-set', 'EMPTY SET!', 'The empty set.', 'state'),
  d('night', 'NIGHT!', 'Who turned out the Sun?!', 'state'),
  d('boing', 'BOING!', 'You saw the spring!', 'sampled'),
  d('trippy', 'TRIPPY!', 'Woah man, check it out!', 'dom',
    { dom: { selector: '#dazzle-btn', event: 'click' } }),
  d('oops', 'OOPS!', 'Is it supposed to do that?', 'sampled'),
  d('zoomies', 'ZOOMIES!', "Look at 'em go!", 'state'),
  d('maximalist', 'MAXIMALIST!', 'It just keeps going!', 'dom',
    { dom: { selector: '#n-slider', event: 'input' } }),
  d('ceiling', 'CEILING!', "That's the lot.", 'state'),
  d('exhaustive', 'EXHAUSTIVE!', "Yep, that's all of 'em!", 'dom',
    { dom: { selector: '#show-all-integers', event: 'change' } }),
  d('parawhat', 'PARAWHAT?!', 'pe-RAS-te-kee', 'dom',
    { dom: { selector: '#show-curves, #line-width', event: 'input change' } }),
  d('nerd', 'NERD!', 'Great minds think!', 'state'),
  d('art', 'ART!', 'Beauty is in the eye of the beholder!', 'dom',
    { dom: { selector: '#section-appearance input, #section-appearance select',
             event: 'input change' } }),
  d('bophades', 'BOPHADES!', 'Yup, pretty big!', 'dom',
    { dom: { selector: '#node-size', event: 'input' } }),
  d('nice', 'NICE!', 'Nice.', 'state',
    { gildNodes: [69], gildRule: 'explicit' }),
  d('dude', 'DUDE!', 'Heh.', 'state',
    { gildNodes: [420], gildRule: 'explicit' }),
  d('meme', 'MEME!', 'Two numbers, both alike in dignity.', 'state',
    { gildNodes: [67, 69], gildRule: 'explicit' }),
];

// The gilding a player holds with everything unlocked. Used by the checker to
// assert the finished picture, and available to the trophy room for a preview.
export function gildForAll(defs = ACHIEVEMENT_DEFS) {
  const ownedPrimes = new Set(), explicitNodes = new Set(), multiplePrimes = new Set();
  for (const a of defs) {
    for (const p of a.gildPrimes) ownedPrimes.add(p);
    for (const n of a.gildNodes) explicitNodes.add(n);
    if (a.gildRule === 'multiples') for (const p of a.gildPrimes) multiplePrimes.add(p);
  }
  return { ownedPrimes, explicitNodes, multiplePrimes };
}
