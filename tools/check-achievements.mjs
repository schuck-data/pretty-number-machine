// PNM — Achievement design checks
//
// Dependency-free, like tools/check.mjs. Imports www/modules/achievements-data.js
// directly, which is possible only because that file has no Three.js and no
// renderer dependency — see the note at the top of it.
//
// What this is for: the number sets and the gilding rule are the part of the
// achievement design that can be WRONG WITHOUT LOOKING WRONG. A mis-derived
// family means an achievement that silently never fires. A gilding rule that
// says "any factor" instead of "every factor" still runs, still lights nodes,
// and quietly gives away the whole board. Neither shows up as an error in a
// browser, and neither is something you would notice by looking at the figure.
//
// The expected values come from docs/achievements-design.xlsx, which is the
// agreed design record. If a number here changes, either the design moved and
// this file should move with it, or something broke.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataUrl = new URL('../www/modules/achievements-data.js', import.meta.url);

let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log(`  ok    ${m}`); };
const fail = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  g === w ? ok(`${label} = ${w}`) : fail(`${label}\n          got  ${g}\n          want ${w}`);
};

const D = await import(dataUrl);
const { SELECTABLE_PRIMES } = await import(new URL('../www/core/math.js', import.meta.url));

console.log('\n[sets] the sequences');
eq('Fibonacci nodes', D.FIB_NODES, [2,3,5,8,13,21,34,55,89,144,233,377,610,987]);
eq('Lucas nodes', D.LUCAS_NODES, [2,3,4,7,11,18,29,47,76,123,199,322,521,843]);
eq('highly composite', D.HCN_NODES, [2,4,6,12,24,36,48,60,120,180,240,360,720,840]);
eq('perfect', D.PERFECT_NODES, [6,28,496]);
eq('squares count', D.SQUARE_NODES.length, 30);
eq('89 multiples', D.NEAT_NODES.length, 11);
eq('840 divisor count', D.divisorCount(840), 32);

console.log('\n[sets] the prime families');
eq('twins', D.FAM.twins.length, 19);
eq('cousins', D.FAM.cousins.length, 23);
eq('sexy', D.FAM.sexy.length, 27);
eq('Sophie Germain', D.FAM.germain, [2,3,5,11,23,29,41,53,83,89,113,131]);
eq('happy', D.FAM.happy, [7,13,19,23,31,79,97,103,109]);
eq('emirp', D.FAM.emirp, [13,17,31,37,71,73,79,97]);
eq('Euler n^2+n+41', D.FAM.euler, [41,43,47,53,61,71,83,97,113,131]);
eq('Fibonacci primes', D.FAM.fibPrimes, [2,3,5,13,89]);
eq('Lucas primes', D.FAM.lucasPrimes, [2,3,7,11,29,47]);
// The primes building every perfect number below 1000 are 2 plus the Mersenne
// primes. This is what lets PERFECT! carry the mathematics MERSENNE! used to.
eq('perfect-number primes', D.FAM.perfectPrimes, [2,3,7,31]);

console.log('\n[design] the list');
eq('achievement count', D.ACHIEVEMENT_DEFS.length, 40);
eq('XP total', D.ACHIEVEMENT_DEFS.reduce((s, a) => s + a.xp, 0), 1800);
const overCap = D.ACHIEVEMENT_DEFS.filter(a => a.xp > 200);
overCap.length ? fail(`XP over the 200 cap: ${overCap.map(a => a.id)}`) : ok('no achievement exceeds the 200 XP cap');
const badStep = D.ACHIEVEMENT_DEFS.filter(a => a.xp % 5 !== 0);
badStep.length ? fail(`XP not a multiple of 5: ${badStep.map(a => a.id)}`) : ok('every XP value is a multiple of 5');
const ids = D.ACHIEVEMENT_DEFS.map(a => a.id);
new Set(ids).size === ids.length ? ok('all ids unique') : fail('duplicate id');
const badRule = D.ACHIEVEMENT_DEFS.filter(a => !['factorisation','multiples','explicit','none'].includes(a.gildRule));
badRule.length ? fail(`unknown gildRule: ${badRule.map(a => a.id)}`) : ok('every gildRule is known');

console.log('\n[design] store-id map agrees with the list');
const platformSrc = readFileSync(join(root, 'www/platform/index.js'), 'utf8');
const mapped = [...platformSrc.matchAll(/'([a-z0-9-]+)',?\s*(?=\/\/|')/g)].map(m => m[1]);
const missingFromMap = ids.filter(id => !platformSrc.includes(`'${id}'`));
missingFromMap.length
  ? fail(`ids absent from the platform store-id map: ${missingFromMap}`)
  : ok(`all ${ids.length} ids appear in the platform store-id map`);

console.log('\n[design] every selectable prime is reachable');
const owned = new Set();
for (const a of D.ACHIEVEMENT_DEFS) for (const p of a.gildPrimes) owned.add(p);
const unreachablePrimes = SELECTABLE_PRIMES.filter(p => !owned.has(p));
unreachablePrimes.length
  ? fail(`primes no achievement gilds: ${unreachablePrimes}`)
  : ok(`all ${SELECTABLE_PRIMES.length} selectable primes have at least one route`);

console.log('\n[gilding] the finished picture at N = 1000');
const gild = D.gildForAll();
let gold = 0, orphan = 0;
const explicitOnly = [];
const PSET = new Set(SELECTABLE_PRIMES);
for (let n = 2; n <= D.TROPHY_N; n++) {
  const lit = D.isNodeGilded(n, gild);
  if (lit) gold++; else orphan++;
  // A node with a prime factor outside the grid can only ever be reached by an
  // explicit gild. These are the design's headline claim and the reason
  // FIBONACCI! and LUCAS! earn their place.
  const beyondGrid = [...String(n)] && hasFactorOutsideGrid(n);
  if (lit && beyondGrid) explicitOnly.push(n);
}
function hasFactorOutsideGrid(n) {
  let m = n;
  for (let d = 2; d * d <= m; d++) while (m % d === 0) { if (!PSET.has(d)) return true; m /= d; }
  return m > 1 && !PSET.has(m);
}
eq('gold nodes (2..1000)', gold, 726);
eq('dark nodes (2..1000)', orphan, 273);
eq('reachable ONLY by an explicit gild', explicitOnly, [199, 233, 521, 843]);

console.log('\n[gilding] the rule is "every factor", not "any"');
// The single most important assertion in this file. With only prime 2 owned,
// 4, 8 and 16 must light because 2 is their whole factorisation — but 6, 10 and
// 14 must NOT, because each needs a prime the player does not have. If this
// ever inverts, the collection is over on the first unlock and nothing in the
// app will complain.
const only2 = { ownedPrimes: new Set([2]), explicitNodes: new Set(), multiplePrimes: new Set() };
for (const n of [2, 4, 8, 16, 32, 64]) {
  D.isNodeGilded(n, only2) ? ok(`owning 2 lights ${n}`) : fail(`owning 2 should light ${n}`);
}
for (const n of [6, 10, 12, 14, 18, 20]) {
  D.isNodeGilded(n, only2) ? fail(`owning 2 must NOT light ${n}`) : ok(`owning 2 does not light ${n}`);
}

console.log('\n[gilding] the three exceptions');
const noneOwned = { ownedPrimes: new Set(), explicitNodes: new Set(), multiplePrimes: new Set() };
D.isNodeGilded(0, noneOwned) ? fail('node 0 must never gild — it is the Sun') : ok('node 0 never gilds');
D.isNodeGilded(1, noneOwned) ? fail('node 1 must not gild by rule') : ok('node 1 does not gild by rule (empty factorisation)');
const withUnity = { ...noneOwned, explicitNodes: new Set([1]) };
D.isNodeGilded(1, withUnity) ? ok('node 1 gilds when explicitly granted (UNITY!)') : fail('UNITY! must light node 1');
// NEAT! gilds every multiple of 89 outright, including 178 = 2 x 89 whose other
// factor the player does not own.
const neat = { ownedPrimes: new Set([89]), explicitNodes: new Set(), multiplePrimes: new Set([89]) };
D.isNodeGilded(178, neat) ? ok('multiples rule lights 178 = 2 x 89 without owning 2') : fail('multiples rule failed');
const noMult = { ownedPrimes: new Set([89]), explicitNodes: new Set(), multiplePrimes: new Set() };
D.isNodeGilded(178, noMult) ? fail('178 must stay dark under the factorisation rule') : ok('178 stays dark under the factorisation rule');

console.log(`\n${failed ? 'FAILED' : 'All achievement checks passed.'}  (${pass} passed, ${failed} failed)\n`);
process.exit(failed ? 1 : 0);
