// PNM — Achievement design checks
//
// Dependency-free, like tools/check.mjs. Imports www/modules/achievements-data.js
// directly, which is possible only because that file has no Three.js and no
// renderer dependency — see the note at the top of it.
//
// What this is for: the number sets and the gilding rule are the part of the
// achievement design that can be WRONG WITHOUT LOOKING WRONG. A mis-derived
// family means an achievement that silently never fires. A gilding rule that
// leaks means the whole board is given away. Neither shows up as an error in a
// browser, and neither is something you would notice by looking at the figure.
//
// THE ONE THAT MATTERS MOST is trigger uniqueness. Two achievements declaring
// the same exact prime selection both fire on one tap, which makes both their
// clues meaningless and breaks the locked-row preview — two rows would show
// different nodes reachable by an identical action. v1 could not have caught
// this because every trigger was a hand-written predicate; v2 declares them,
// so it can be checked.
//
// Expected values come from docs/achievements-v6.xlsx by way of
// docs/ACHIEVEMENTS.md. If a number here changes, either the design moved and
// this file should move with it, or something broke.

import { fileURLToPath } from 'node:url';

const dataUrl = new URL('../www/modules/achievements-data.js', import.meta.url);

let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log(`  ok    ${m}`); };
const fail = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  g === w ? ok(`${label} = ${w}`) : fail(`${label}\n          got  ${g}\n          want ${w}`);
};
const yes = (cond, m, why) => cond ? ok(m) : fail(why || m);

const D = await import(dataUrl);
const { SELECTABLE_PRIMES, primeFactorsOf, isPrimeNumber } = await import(new URL('../www/core/math.js', import.meta.url));
const A = D.ACHIEVEMENT_DEFS;
const GRID = new Set(SELECTABLE_PRIMES);

// ============================================================
console.log('\n[shape] the list');
eq('achievements', A.length, 101);
eq('clusters', D.CLUSTER_ORDER.map(c => (D.BY_CLUSTER.get(c) || []).length),
   [16, 3, 14, 5, 13, 12, 16, 8, 10, 3, 1]);

const ids = A.map(a => a.id);
eq('unique ids', new Set(ids).size, A.length);
eq('numbers are 1..101 with no gaps', A.map(a => a.no).sort((x, y) => x - y),
   Array.from({ length: 101 }, (_, i) => i + 1));

const missing = A.filter(a => !a.name || !a.clue || !a.criteria).map(a => a.id);
eq('every definition has name, clue and criteria', missing, []);

// The clue is what a locked row shows. The criteria is the PUBLIC Play Console
// description. They are different strings and neither may be blank.
const badClue = A.filter(a => !/^-.*-$/.test(a.clue)).map(a => a.id);
eq('every clue is delimited -like this-', badClue, []);

// ============================================================
console.log('\n[xp] the budget');
eq('total XP', D.totalXP(), 2000);
eq('Play Games cap', 2000, 2000);
eq('ordinary achievements at 15', new Set(A.filter(a => a.id !== 'unity').map(a => a.xp)), new Set([15]));
eq('UNITY! holds the remainder', A.find(a => a.id === 'unity').xp, 500);

// ============================================================
console.log('\n[triggers] no two achievements may share a selection');
// This is the assertion that replaced v1's conjunction guard. See the header.
const bySel = new Map();
const clashes = [];
for (const a of A) {
  if (!a.sel) continue;
  const key = a.sel.join(',');
  if (bySel.has(key)) clashes.push(`${a.name} and ${bySel.get(key)} both fire on {${key}}`);
  else bySel.set(key, a.name);
}
eq('selection clashes', clashes, []);
ok(`${bySel.size} distinct exact selections declared`);

const byRange = new Map();
const rangeClashes = [];
for (const a of A) {
  if (a.range == null) continue;
  if (byRange.has(a.range)) rangeClashes.push(`${a.name} and ${byRange.get(a.range)} both fire at N=${a.range}`);
  else byRange.set(a.range, a.name);
}
eq('range clashes', rangeClashes, []);
ok(`${byRange.size} distinct dials declared`);

const offGrid = A.filter(a => a.sel && a.sel.some(p => !GRID.has(p)))
                 .map(a => `${a.name} wants ${a.sel.filter(p => !GRID.has(p))}`);
eq('every declared selection is reachable in the panel', offGrid, []);

// ============================================================
console.log('\n[triggers] the one deliberate exception');
// ENIGMA! triggers on 5 and gilds 23 — the Law of Fives, 2+3=5. Everything else
// that declares a selection and gilds a single node must select that node's
// distinct prime factors. If a second exception ever appears here it is either
// a new joke that needs recording in docs/ACHIEVEMENTS.md §6, or a typo.
const radical = n => [...new Set(primeFactorsOf(n))].sort((x, y) => x - y);
const exceptions = [];
for (const a of A) {
  if (!a.sel || a.gildNodes.length !== 1) continue;
  const want = radical(a.gildNodes[0]);
  if (want.length && want.join(',') !== a.sel.join(',')) {
    exceptions.push(`${a.name}: gilds ${a.gildNodes[0]} {${want}} but selects {${a.sel}}`);
  }
}
eq('only the recorded exceptions break the factor convention', exceptions, [
  // The Law of Fives: 2+3=5, so 5 opens 23. The discord is the joke.
  'ENIGMA!: gilds 23 {23} but selects {5}',
  // The clue is "reads the same every way", so the trigger is the palindromic
  // primes rather than 25's factors. 25 is what the square LOOKS like: 5x5.
  'SATOR!: gilds 25 {5} but selects {2,3,5,7,11,101,131}',
]);

// ============================================================
console.log('\n[triggers] a dial must actually be dialled');
// resolveN() falls back to the PRODUCT of the selected primes, capped at 500,
// whenever the range has not been set by hand. So a dial tested against
// resolveN() can fire with nobody dialling: {5,61} makes 305 and {5,83} makes
// 415, which handed out VICE! and BAY! for free. The predicate reads state.N
// instead, which is null until a human sets it.
//
// This assertion does not test the predicate — it records which dials are
// within reach of a bare selection, so that if anyone ever swaps state.N back
// for resolveN() the blast radius is written down rather than rediscovered.
const reachable = [];
for (const a of A) {
  if (a.range == null) continue;
  const hits = [];
  const walk = (i, prod, picked) => {
    if (prod > 500) return;                       // the cap, which is luck not design
    if (picked.length && prod === a.range) hits.push(`{${picked}}`);
    for (let j = i; j < SELECTABLE_PRIMES.length; j++)
      walk(j + 1, prod * SELECTABLE_PRIMES[j], [...picked, SELECTABLE_PRIMES[j]]);
  };
  walk(0, 1, []);
  if (hits.length) reachable.push(`${a.name} N=${a.range} <- ${hits.join(' ')}`);
}
eq('dials a bare prime selection could reach', reachable,
   ['VICE! N=305 <- {5,61}', 'BAY! N=415 <- {5,83}']);
ok('...which is why the dial predicate reads state.N, not resolveN()');

// ============================================================
console.log('\n[sets] the computed families');
eq('Fibonacci nodes', D.FIB_NODES, [2,3,5,8,13,21,34,55,89,144,233,377,610,987]);
eq('Lucas nodes', D.LUCAS_NODES, [2,3,4,7,11,18,29,47,76,123,199,322,521,843]);
eq('perfect numbers under 1000', D.PERFECT_NODES, [6,28,496]);
eq('twins / cousins / sexy', [D.SERIES.twins.length, D.SERIES.cousins.length, D.SERIES.sexy.length], [69, 81, 120]);
eq('Sophie Germain', D.SERIES.germain.length, 37);
eq('emirps', D.SERIES.emirp.length, 36);
eq('palindromic primes in the grid', D.PALINDROMIC_PRIMES, [2,3,5,7,11,101,131]);
eq('primes whose digits are prime', D.PRIME_DIGIT_PRIMES, [2,3,5,7,23,37,53,73]);
eq('super-primes in the grid', D.SUPER_PRIMES, [3,5,11,17,31,41,59,67,83,109,127]);
// EDU: super-prime means a prime at a PRIME INDEX. Different from prime digits,
// and the two overlap only at 3 and 5 — worth asserting so a future edit that
// conflates them fails loudly.
eq('the two prime-ish families overlap only at 3 and 5',
   D.SUPER_PRIMES.filter(p => D.PRIME_DIGIT_PRIMES.includes(p)), [3, 5]);
eq('multiples of 7', D.REST_NODES.length, 142);
eq('repdigits', D.REPDIGITS, [111,222,333,444,555,666,777,888,999]);
eq('every repdigit is a multiple of 37', D.REPDIGITS.every(n => n % 37 === 0), true);
eq('run targets', D.RUN_TARGETS, [17,23,31,41,53,59,67,71,83,97,101,109,127,131]);
eq('squares two primes can reach', D.SQUARE_UP_NODES, [9,16,25,36,49,64,81,100,144,196]);
// EDU: an odd square needs 2 as one of the two primes, because every other
// prime is odd and two odds always sum to an even number.
const oddSquares = D.SQUARE_UP_NODES.filter(n => n % 2 === 1);
eq('the odd squares all need 2', oddSquares.every(s => isPrimeNumber(s - 2)), true);

// ============================================================
console.log('\n[gilding] nothing derives before the capstone');
const allButUnity = A.filter(a => a.id !== 'unity').map(a => a.id);
const preUnity = D.computeGild(allButUnity);
const full = D.gildForAll();

// Find a composite that NO achievement names but whose primes are all lit. If
// derivation ever leaks, this is the node that shows it first.
// DEV: do not hardcode one. 4 looks like the obvious candidate and is wrong —
// it is a Lucas number, so LUCAS! names it outright.
let witness = 0;
for (let n = 4; n <= D.TROPHY_N && !witness; n++) {
  if (preUnity.litNodes.has(n)) continue;
  const f = primeFactorsOf(n);
  if (f.length > 1 && f.every(p => preUnity.litNodes.has(p))) witness = n;
}
yes(witness > 0, `found an underived witness: ${witness}`, 'no unnamed composite left to test with');
yes(!D.isNodeGilded(witness, preUnity),
    `${witness} stays dark before UNITY! though every prime in it is gilded`,
    'derivation leaked before the capstone — the v1 flood is back');
yes(D.isNodeGilded(witness, full), `UNITY! lights ${witness} by derivation`, 'UNITY! failed to flood');

let before = 0, after = 0;
for (let n = 0; n <= D.TROPHY_N; n++) {
  if (D.isNodeGilded(n, preUnity)) before++;
  if (D.isNodeGilded(n, full)) after++;
}
ok(`the board goes from ${before} gold to ${after} of ${D.TROPHY_N + 1} when UNITY! lands`);
yes(after > before * 1.5, `UNITY! is a genuine flood (x${(after / before).toFixed(1)})`,
    `UNITY! barely changes the picture: ${before} -> ${after}`);

console.log('\n[gilding] node 0 and node 1');
const none = D.computeGild([]);
yes(!D.isNodeGilded(0, none) && !D.isNodeGilded(0, full), 'node 0 never gilds — it is the Sun');
yes(!D.isNodeGilded(1, preUnity), 'node 1 stays dark until the capstone');
yes(D.isNodeGilded(1, D.computeGild(['unity'])), 'UNITY! lights node 1');

console.log('\n[gilding] lines');
const neatOnly = D.computeGild(['neat']);
yes(D.isLineGilded(89, neatOnly), "NEAT! draws 89's line on its own");
yes(!D.isNodeGilded(178, neatOnly), "NEAT!'s multiples stay dark — the line is the point");
yes(D.computeGild(allButUnity).litLines.size === 1,
    'before the capstone, 89 is the only gilded line',
    `expected exactly one line before UNITY!, got ${D.computeGild(allButUnity).litLines.size}`);
yes(full.litLines.size > 20, `UNITY! gilds ${full.litLines.size} lines`);

// ============================================================
console.log('\n[gilding] the ceiling');
// Dropping the conjunction fixed DERIVATION flooding, not DIRECT-GILD flooding.
// A single achievement naming a third of the board would give the picture away
// in one tap. These are the two largest and they were accepted knowingly.
const biggest = [...A].sort((a, b) => b.gildNodes.length - a.gildNodes.length).slice(0, 3);
ok('largest gild sets: ' + biggest.map(a => `${a.name} ${a.gildNodes.length}`).join(', '));
yes(biggest[0].gildNodes.length <= 150,
    `the largest gild set is ${biggest[0].gildNodes.length} nodes`,
    `${biggest[0].name} gilds ${biggest[0].gildNodes.length} nodes — over the 150 ceiling`);

const outOfRange = A.flatMap(a => a.gildNodes.filter(n => n < 0 || n > D.TROPHY_N).map(n => `${a.name}:${n}`));
eq('every gilded node fits the trophy room', outOfRange, []);

const dark = D.darkNodes();
ok(`${dark.length} of ${D.TROPHY_N - 1} nodes stay dark with everything earned`);

console.log(`\n${failed ? 'FAILED' : 'All achievement checks passed.'}  (${pass} passed, ${failed} failed)\n`);
process.exit(failed ? 1 : 0);
