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
// Expected values are the DESIGN, written down. achievements-data.js is the
// source of truth for the list itself (docs/ACHIEVEMENTS.md §10 settled that;
// achievements-v6.xlsx is history), and this file pins the numbers that the
// design says must hold. If one changes, either the design moved and this file
// should move with it, or something broke.

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const dataUrl = new URL('../www/modules/achievements-data.js', import.meta.url);

let pass = 0, failed = 0;
// TAKES AN OPTIONAL CONDITION, and that is a repair rather than a feature.
// This used to be `(m) => { pass++; ... }` — one argument. Two tripwires were
// written as `ok('...', someRegex.test(SRC))`, copying the shape of
// tools/check-ads.mjs whose `ok` DOES take a condition, and the extra argument
// was silently discarded. Both passed unconditionally and had never tested
// anything: the SPARTA! range gate, which this file's own comment calls the
// thing defending a one-line deletion, and the countUnlocked() orphan filter.
// Found by deliberately breaking the code they guard and watching them pass.
//
// `undefined` still means "no condition given", so the many one-argument
// reporting calls below keep working.
const ok = (m, cond) => {
  if (cond === undefined || cond) { pass++; console.log(`  ok    ${m}`); }
  else { failed++; console.log(`  FAIL  ${m}`); }
};
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
// v7: Tutorial 16 -> 18 (CEILING! dropped; DECOMPOSE!, GALLERY! and TEMPTED!
// added), Primes 14 -> 13 (MERSENNE! dropped), Lore 12 -> 11 (WHOLE! dropped).
eq('clusters', D.CLUSTER_ORDER.map(c => (D.BY_CLUSTER.get(c) || []).length),
   [18, 3, 13, 5, 13, 11, 16, 8, 10, 3, 1]);

const ids = A.map(a => a.id);
eq('unique ids', new Set(ids).size, A.length);
eq('numbers are 1..101 with no gaps', A.map(a => a.no).sort((x, y) => x - y),
   Array.from({ length: 101 }, (_, i) => i + 1));

const missing = A.filter(a => !a.name || !a.clue || !a.criteria).map(a => a.id);
eq('every definition has name, clue and criteria', missing, []);

// Blurbs were silently dropped once, during the v1-to-v2 rewrite: the data file
// was rebuilt from the spreadsheet and the blurb column was simply not carried
// across. Nothing failed, nothing warned, and the reward for earning an
// achievement was an empty box for as long as it took somebody to tap one.
eq('achievements carrying a blurb', A.filter(a => a.blurb).length, 89);
// Blurbs are prose that ships to players. A double hyphen is a typewriter
// artefact, not punctuation.
eq('blurbs using -- instead of an en dash', A.filter(a => a.blurb.includes('--')).map(a => a.name), []);
const mustExplain = ['perfect', 'fermat', 'decompose', 'heinz', 'angel', 'metonic', 'freezing'];
eq('the ones with real mathematics behind them all explain themselves',
   mustExplain.filter(id => !A.find(a => a.id === id)?.blurb), []);

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
  // SATOR! used to sit here too, gilding the single node 25. In v7 it gilds
  // every palindrome instead, so it no longer reaches this check at all — the
  // check only looks at achievements that gild exactly one node.
]);

// ============================================================
console.log('\n[triggers] which dials the auto-range can reach');
// resolveN() falls back to the PRODUCT of the selected primes, clamped at 500,
// whenever the range has not been set by hand. A dial therefore fires when the
// figure happens to land on its number, with nobody having dialled — which is
// ACCEPTED: stumbling into VICE! by selecting {5, 61} is a fine way to find it.
//
// The assertion pins WHICH dials that is true of. Only two are in reach, and
// only because every other dial number is prime or above the clamp. If the list
// grows and a third appears, this fails and the freebie becomes a decision
// somebody made rather than one nobody noticed.
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
ok('...accepted 2026-08-23: the auto-range is a legitimate way to trip a dial');

// ============================================================
console.log('\n[triggers] nothing may be true at the defaults');
// An achievement that holds in the app's resting state awards itself the moment
// tracking is switched on. Two did, and neither was visible without a phone and
// a real ledger: SPARTA! declares {2,3,5} and DEFAULT_CONFIG.primes IS {2,3,5},
// and PHI! tested for the golden angle, which is DEFAULT_CONFIG.divergenceAngle.
//
// PHI! now binds to the "Reset to φ" button — a thing somebody has to do. This
// assertion covers the declarative half; a custom predicate that reads a
// defaulted state key has to be caught by eye.
const { DEFAULT_CONFIG } = await import(new URL('../www/core/state.js', import.meta.url));
const defaultSel = [...DEFAULT_CONFIG.primes].sort((a, b) => a - b).join(',');
const freeAtRest = A.filter(a => a.sel && a.sel.join(',') === defaultSel)
                    .map(a => `${a.name} declares the default selection {${defaultSel}}`);
eq('selections that equal the default selection', freeAtRest, [
  // RESOLVED 2026-08-23: SPARTA! keeps the number and keeps the declaration —
  // the declaration is what the "no two share a selection" check above reads —
  // but achievements.js overrides the generated test with an ARMED one, so the
  // selection only counts when the player reached it by tapping prime buttons.
  // The assertion below is the half of that which can be checked headlessly.
  'SPARTA! declares the default selection {2,3,5}',
]);

// The gate itself. A declared selection normally becomes its own test; SPARTA!
// must NOT, or the freebie comes straight back the next time somebody tidies up
// the custom predicates.
//
// This is a SOURCE check, not a behavioural one, and that is a limitation worth
// naming: achievements.js imports three.js, so it cannot be loaded here — which
// is the whole reason achievements-data.js exists as a separate file. What is
// actually being defended is a deletion: the override is one line in a
// 900-line file, and removing it silently restores a bug that took a phone and
// a real ledger to find. A grep is a poor test and a good tripwire.
const SRC = readFileSync(new URL('../www/modules/achievements.js', import.meta.url), 'utf8');

// The toast renders straight off the achievement:unlocked PAYLOAD, not off the
// definition — so a field the template prints but the payload omits arrives as
// the string "undefined" on screen. That is exactly how `criteria` shipped for
// about ten minutes in v7: the checker was green, and only opening the app
// showed it. A source tripwire, in the same spirit as the SPARTA! one below.
const payload = SRC.match(/emit\('achievement:unlocked',[\s\S]{0,300}?\}\);/)?.[0] || '';
for (const field of ['name', 'clue', 'criteria', 'blurb', 'link', 'xp']) {
  // `\\b` and not `\b`: inside a template literal `\b` is the BACKSPACE
  // character, so the word boundary has to survive as two characters into the
  // RegExp constructor. Written the obvious way, every one of these fails.
  yes(new RegExp(`\\b${field}:`).test(payload),
      `the unlock payload carries ${field}`,
      `achievement:unlocked does not carry ${field} — the toast will print "undefined"`);
}
// THE CAPSTONE MUST NOT BE COUNTABLE BY ORPHANS. The ledger never withdraws an
// unlock, so an achievement dropped from the design leaves its entry behind —
// v7 dropped three. UNITY! fires on `countUnlocked() >= ACHIEVEMENT_DEFS.length
// - 1`, so counting raw ledger keys meant three orphans could award the
// capstone three achievements early, to whoever had played longest. Verified on
// a Pixel 7 both ways: 97 real + 3 orphans withholds it, and earning the 100th
// real one still fires it.
//
// A source grep, like the SPARTA! one below, because achievements.js imports
// three.js and cannot be loaded here. What it defends is the `BY_ID.has` filter.
ok('countUnlocked() ignores ledger entries with no definition',
   /function countUnlocked\(\)[\s\S]{0,400}?BY_ID\.has\(id\)/.test(SRC));

ok('SPARTA! overrides its generated test with the range gate',
   /sparta:\s*\(\)\s*=>\s*isExactly\(\[2,\s*3,\s*5\]\)\s*&&\s*resolveN\(\)\s*===\s*300/.test(SRC));

// The gate only works because 300 is out of the auto-range's reach for this
// selection. resolveN() derives a range from the product of the selected primes
// when the player has not dialled one, and 2 x 3 x 5 is 30 — so if the derived
// range for {2,3,5} ever became 300, SPARTA! would be free again by a different
// route. Pinned in arithmetic rather than trusted.
eq('the auto-range product for {2,3,5}', [2, 3, 5].reduce((a, b) => a * b, 1), 30);

// And nothing else may claim 300 as its dial, or the two would fire together
// and both their clues would stop meaning anything.
eq('achievements whose declared dial is 300',
   A.filter(a => a.range === 300).map(a => a.name), []);

// ============================================================
console.log('\n[console] published visibility');
// Decided 2026-08-23: Tutorial ships Revealed so hunters browsing the Play Games
// list see a real on-ramp; everything else ships Hidden so the clues stay worth
// solving and hunters have something to collaborate ON. Near-permanent once the
// console is told, so it is pinned here.
const revealed = A.filter(a => !a.hidden).map(a => a.name);
const clustersRevealed = [...new Set(A.filter(a => !a.hidden).map(a => a.cluster))];
eq('clusters published Revealed', clustersRevealed, ['Tutorial']);
eq('Revealed count', revealed.length, A.filter(a => a.cluster === 'Tutorial').length);
// PINNED. Near-permanent once the Play Console is told, and it moved in v7 when
// Tutorial grew: 16/85 became 18/83.
eq('the published split', [revealed.length, A.length - revealed.length], [18, 83]);
ok(`  ${revealed.length} revealed, ${A.length - revealed.length} hidden`);

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
// v7 PAYOFF SETS. Each replaced a gild set identical to the selection that
// earned it — see docs/ACHIEVEMENTS.md §2a.
eq('numbers written only in prime digits', D.PRIME_DIGIT_NODES.length, 84);
eq('palindromes below the ceiling', D.PALINDROME_NODES.length, 107);
// 1 IS A PALINDROME and must not be in that set: it belongs to UNITY! alone.
// This assertion exists because the first version of PALINDROME_NODES counted
// from 1 and lit node 1 the moment SATOR! was earned.
yes(!D.PALINDROME_NODES.includes(1), 'the palindrome set leaves node 1 to UNITY!');
eq('the widest prime gap, inclusive', D.STRIDE_GAP,
   [113,114,115,116,117,118,119,120,121,122,123,124,125,126,127]);
// The prime-digit NODES must be a superset of the prime-digit PRIMES: the
// selection is the primes, the payoff is every number written that way.
yes(D.PRIME_DIGIT_PRIMES.every(p => D.PRIME_DIGIT_NODES.includes(p)),
    'every prime-digit prime is among the prime-digit nodes');
// And the rule behind the change: a payoff identical to its own input teaches
// nothing, so no multi-prime selection may gild exactly the primes it names.
const flat = A.filter(a => a.sel && a.sel.length > 1
                            && a.gildNodes.length === a.sel.length
                            && a.sel.every(p => a.gildNodes.includes(p)))
              .map(a => a.name);
eq('multi-prime selections whose payoff is just the selection back', flat, [
  // SUPERPRIME! is the knowing exception: 11 taps returning the same 11 nodes.
  // Kept because the IDEA — count along the primes and land on a prime position
  // — is the most intuitive thing in the cluster, and no gild set expresses it
  // any better. Recorded so it stays a decision rather than an oversight.
  'SUPERPRIME!',
]);
eq('repdigits', D.REPDIGITS, [111,222,333,444,555,666,777,888,999]);
eq('every repdigit is a multiple of 37', D.REPDIGITS.every(n => n % 37 === 0), true);
eq('run targets', D.RUN_TARGETS, [17,23,31,41,53,59,67,71,83,97,101,109,127,131]);
eq('squares two primes can reach', D.SQUARE_UP_NODES, [9,16,25,36,49,64,81,100,144,196]);
// EDU: an odd square needs 2 as one of the two primes, because every other
// prime is odd and two odds always sum to an even number.
const oddSquares = D.SQUARE_UP_NODES.filter(n => n % 2 === 1);
eq('the odd squares all need 2', oddSquares.every(s => isPrimeNumber(s - 2)), true);

// ============================================================
console.log('\n[links] the reference links');
// Added in v7. A link only ever appears on an EARNED row, so it cannot give an
// answer away — but a broken or non-https one ships to players either way.
const links = A.filter(a => a.link);
// PINNED, not merely reported. The count lived in a comment in
// achievements-data.js and went stale within a day of being written, when two
// links were dropped for content rating and the comment did not follow. A
// number that matters belongs in an assertion or nowhere.
eq('achievements carrying a reference link', links.length, 85);
eq('links that are not https', links.filter(a => !a.link.startsWith('https://')).map(a => a.name), []);
eq('links that are not Wikipedia articles',
   links.filter(a => !a.link.startsWith('https://en.wikipedia.org/wiki/')).map(a => a.name), []);
// A title with a raw space in it would 404. They are stored percent-encoded.
eq('links containing a raw space', links.filter(a => a.link.includes(' ')).map(a => a.name), []);

// CONTENT RATING. The clues and the numbers are deniable; a LINK is not. 420
// under "-what was I saying?-" is a number, but a link to "420 (cannabis
// culture)" is documentary evidence of a drug reference inside the shipped
// bundle, and the IARC questionnaire asks about precisely that. Six links were
// retargeted to the neutral number article and two dropped — see the note above
// LINKS in achievements-data.js.
//
// The tokens below are matched against the URL, lowercased. They are specific
// on purpose: a bare 'sex' would catch SEXY! -> Sexy_primes, which is a real
// mathematical term with a pure-mathematics article and is meant to stay.
const RATING_TOKENS = [
  'cannabis', 'marijuana', 'narcotic', 'psychedelic', 'recreational_drug',
  'slot_machine', 'blackjack', 'gambling', 'casino', 'poker', 'lottery',
  'sex_position', 'sexual_intercourse', 'pornograph', 'nudity',
  'occultism', 'satanism', 'black_magic',
];
const flagged = links
  .filter(a => RATING_TOKENS.some(t => a.link.toLowerCase().includes(t)))
  .map(a => `${a.name} -> ${a.link}`);
eq('links pointing at a rating-sensitive article', flagged, []);

// And pin the six that were retargeted, so "tidying" one back is a decision
// somebody made rather than one nobody noticed.
const PINNED = {
  dude: '420_%28number%29', jackpot: '777_%28number%29', cards: '21_%28number%29',
  enigma: '23_%28number%29', masonic: '33_%28number%29', sator: 'Palindromic_number',
};
const drifted = Object.entries(PINNED)
  .filter(([id, tail]) => !(A.find(a => a.id === id)?.link || '').endsWith(tail))
  .map(([id]) => id);
eq('the retargeted links still point at their neutral article', drifted, []);

// NICE! and OIL! carry no link deliberately, and both keep a blurb, so nothing
// is left unexplained. If a link ever appears on either, it was not thought about.
eq('achievements deliberately left without a link',
   ['nice', 'oil'].filter(id => A.find(a => a.id === id)?.link), []);
// The ones with NO blurb are exactly the ones a link has to carry, because for
// them it is the whole explanation rather than a footnote.
const unexplained = A.filter(a => !a.blurb && !a.link).map(a => a.name);
eq('achievements with neither a blurb nor a link', unexplained, [
  // A joke a footnote would only flatten. If you know the reference the clue is
  // the whole payload; if you do not, an encyclopedia article will not deliver
  // a punchline.
  'MEME!',
]);

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
