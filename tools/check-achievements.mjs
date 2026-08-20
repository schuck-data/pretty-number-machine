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

console.log('\n[design] store-id map agrees with the list');
const platformSrc = readFileSync(join(root, 'www/platform/index.js'), 'utf8');
const mapped = [...platformSrc.matchAll(/'([a-z0-9-]+)',?\s*(?=\/\/|')/g)].map(m => m[1]);
const missingFromMap = ids.filter(id => !platformSrc.includes(`'${id}'`));
missingFromMap.length
  ? fail(`ids absent from the platform store-id map: ${missingFromMap}`)
  : ok(`all ${ids.length} ids appear in the platform store-id map`);

const noNodes = D.ACHIEVEMENT_DEFS.filter(a => !Array.isArray(a.gildNodes));
noNodes.length ? fail(`gildNodes missing: ${noNodes.map(a => a.id)}`) : ok('every definition has a gildNodes array');
const outOfRange = D.ACHIEVEMENT_DEFS.flatMap(a => a.gildNodes.filter(n => n < 1 || n > D.TROPHY_N));
outOfRange.length
  ? fail(`gilded nodes outside 1..${D.TROPHY_N}: ${[...new Set(outOfRange)]}`)
  : ok(`every gilded node lies inside 1..${D.TROPHY_N}`);

console.log('\n[design] every selectable prime is reachable');
const ROUTES = D.primeRoutes();
const noRoute = SELECTABLE_PRIMES.filter(p => !(ROUTES.get(p) || []).length);
noRoute.length
  ? fail(`primes no achievement gilds: ${noRoute}`)
  : ok(`all ${SELECTABLE_PRIMES.length} selectable primes have at least one route`);
const routeCounts = SELECTABLE_PRIMES.map(p => ROUTES.get(p).length);
eq('route counts run from', [Math.min(...routeCounts), Math.max(...routeCounts)], [2, 7]);

console.log('\n[gilding] the finished picture at N = 1000');
const PSET = new Set(SELECTABLE_PRIMES);
const outsideGrid = (n) => {
  let m = n;
  for (let dd = 2; dd * dd <= m; dd++) while (m % dd === 0) { if (!PSET.has(dd)) return true; m /= dd; }
  return m > 1 && !PSET.has(m);
};
const gild = D.gildForAll();
let gold = 0, dark = 0;
const rescued = [];
for (let n = 2; n <= D.TROPHY_N; n++) {
  const lit = D.isNodeGilded(n, gild);
  if (lit) gold++; else dark++;
  if (lit && outsideGrid(n)) rescued.push(n);
}
eq('gold nodes (2..1000)', gold, 733);
eq('dark nodes (2..1000)', dark, 266);
// Nodes carrying a prime factor above 131. No amount of prime-ownership can
// reach these, so a direct gild is their only route and each one is a
// deliberate choice — see the RESCUE comments in achievements-data.js.
eq('rescued from the dark', rescued, [137, 149, 199, 233, 314, 419, 433, 521, 641, 843, 997]);

console.log('\n[gilding] ownership is a CONJUNCTION, not a disjunction');
// THE assertion this file exists for. Under the first design these three
// achievements owned 31 of the 32 primes and lit 715 of 726 nodes — 98% of the
// finished board from three of forty, with the other thirty-seven worth eleven
// nodes between them. Measured in a browser, not predicted. If this number ever
// climbs back into the hundreds, that regression has returned.
const three = D.computeGild(['twinning', 'sexy', 'germain']);
let goldThree = 0;
for (let n = 2; n <= D.TROPHY_N; n++) if (D.isNodeGilded(n, three)) goldThree++;
eq('twinning + sexy + germain light only', goldThree, 31);
eq('...and own this many primes', three.ownedPrimes.size, 1);

const soloLouder = D.computeGild(['louder']);
soloLouder.ownedPrimes.has(11)
  ? fail('LOUDER! alone must NOT own prime 11 — it is one of six routes')
  : ok('LOUDER! alone lights node 11 without owning prime 11');
soloLouder.litNodes.has(11)
  ? ok('...but node 11 is lit')
  : fail('LOUDER! must at least light node 11');
const allRoutes11 = D.computeGild(ROUTES.get(11));
allRoutes11.ownedPrimes.has(11)
  ? ok(`prime 11 needs all ${ROUTES.get(11).length} routes, and they suffice`)
  : fail('the full route set for prime 11 must own it');
// Derivation still means EVERY factor, not any. Tested against a synthetic
// gild rather than a real achievement set: the seven routes to prime 2 also
// light plenty of other nodes DIRECTLY (PERFECT! and RAMANUJAN! both gild 6),
// so a real set cannot isolate the derivation. That is a fact about the design,
// not a limitation — and the first version of this check got it wrong.
const only2 = { litNodes: new Set(), ownedPrimes: new Set([2]) };
for (const n of [2, 4, 8, 16, 32, 64, 128, 256, 512]) {
  D.isNodeGilded(n, only2) ? ok(`owning only 2 lights ${n}`) : fail(`owning 2 should light ${n}`);
}
for (const n of [6, 10, 12, 14, 18, 20, 22]) {
  D.isNodeGilded(n, only2)
    ? fail(`owning only 2 must NOT light ${n} — it needs another prime`)
    : ok(`owning only 2 does not light ${n}`);
}
// And the real route set does own the prime.
D.computeGild(ROUTES.get(2)).ownedPrimes.has(2)
  ? ok(`prime 2 needs all ${ROUTES.get(2).length} routes, and they suffice`)
  : fail('the full route set for prime 2 must own it');

console.log('\n[gilding] the UNITY! override stabilises the trophy-room toggles');
const allIds = D.ACHIEVEMENT_DEFS.map(a => a.id);
const offNoUnity = D.computeGild(allIds.filter(i => i !== 'sexy' && i !== 'unity'));
const offWithUnity = D.computeGild(allIds.filter(i => i !== 'sexy'));
let a1 = 0, a2 = 0;
for (let n = 2; n <= D.TROPHY_N; n++) {
  if (D.isNodeGilded(n, offNoUnity)) a1++;
  if (D.isNodeGilded(n, offWithUnity)) a2++;
}
a2 > a1
  ? ok(`switching a family off costs ${a2 - a1} fewer nodes with UNITY! on (${a2} vs ${a1})`)
  : fail('the UNITY! override should keep derivation alive when a route is disabled');

console.log('\n[gilding] node 0 and node 1');
const none = D.computeGild([]);
D.isNodeGilded(0, none) ? fail('node 0 must never gild — it is the Sun') : ok('node 0 never gilds');
D.isNodeGilded(1, none) ? fail('node 1 must not gild by rule') : ok('node 1 does not gild by rule (empty factorisation)');
D.isNodeGilded(1, D.computeGild(['unity'])) ? ok('node 1 gilds via UNITY! alone') : fail('UNITY! must light node 1');

console.log(`\n${failed ? 'FAILED' : 'All achievement checks passed.'}  (${pass} passed, ${failed} failed)\n`);
process.exit(failed ? 1 : 0);
