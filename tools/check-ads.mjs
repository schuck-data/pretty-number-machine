// PNM — checks for the ads layer
//
// Dependency-free, same shape as check-achievements.mjs, and here for the same
// reason: `www/modules/ads-data.js` imports nothing a browser owns, so the
// products and every word of the slide copy can be checked without one.
//
// What this is really defending. The ads are almost entirely COPY, and copy is
// the one thing a rendering test cannot judge — a slide with no headline still
// draws, it just draws wrong, and ten slides is more than anyone will re-read
// after each change. So the assertions here are mostly about presence, shape
// and the things that would look like a bug rather than a joke: a palette that
// does not exist, a product with no deck, a price that disagrees with itself.
//
//   node tools/check-ads.mjs

import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (label, cond) => {
  if (cond) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}`); }
};
const eq = (label, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log(`  ok    ${label} = ${a}`); }
  else { fail++; console.log(`  FAIL  ${label}\n        got  ${a}\n        want ${b}`); }
};

const D = await import(new URL('../www/modules/ads-data.js', import.meta.url));

// ============================================================
console.log('\n[products] the shop');
eq('product ids', D.PRODUCTS.map(p => p.id), ['ads-addition', 'ads-multiplication']);

// The unlock chain is the merchandising joke: the multiplication button does
// not exist until addition is owned. If `requires` ever came loose, the second
// button would appear on a fresh install beside a first one nobody had used.
eq('multiplication requires addition',
   D.PRODUCT_BY_ID.get('ads-multiplication').requires, 'ads-addition');
eq('addition requires nothing', D.PRODUCT_BY_ID.get('ads-addition').requires, null);

// The 5x price gap is deliberate and one slide is ABOUT it. If the prices ever
// change, that slide stops making sense — so the ratio is pinned, not the
// numbers, and this fails loudly if somebody edits one and not the other.
const micros = Object.fromEntries(D.PRODUCTS.map(p => [p.id, p.priceMicros]));
const ratio = micros['ads-multiplication'] / micros['ads-addition'];
eq('multiplication is about five times addition (the WHY-FIVE slide says so)',
   Math.round(ratio), 5);

// It is not EXACTLY five, and that is load-bearing. $4.99 is 5.04 times $0.99,
// and the WHY-FIVE slide's small print accounts for the four cents by name. If
// the prices ever move, that line becomes wrong in a way nobody would notice by
// looking at it — so the discrepancy itself is pinned.
const gapCents = micros['ads-multiplication'] / 1e4 - 5 * (micros['ads-addition'] / 1e4);
eq('the gap the WHY-FIVE small print names, in cents', gapCents, 4);
ok('...and the slide still says "four cents"',
   D.SLIDES.find(s => s.id === 'why-five').legal.includes('four cents'));

// A price string that disagrees with the micros is the kind of thing that
// reaches a store listing and becomes a refund.
for (const p of D.PRODUCTS) {
  ok(`${p.id}: "${p.price}" matches ${p.priceMicros} micros`,
     Number(p.price.replace(/[^0-9.]/g, '')) * 1e6 === p.priceMicros);
}

// ============================================================
console.log('\n[slides] every deck is whole');
eq('products with no slides at all', D.productsWithoutSlides(), []);
eq('slides naming a palette that does not exist', D.slidesWithBadPalette(), []);
eq('slides with an unknown treatment', D.slidesWithBadTreatment(), []);

eq('addition deck size', D.slidesFor('ads-addition').length, 5);
eq('multiplication deck size', D.slidesFor('ads-multiplication').length, 5);

// Every slide belongs to a real product. A typo here yields a slide that exists
// and is unreachable, which nothing else would ever surface.
eq('slides whose product is not in the catalogue',
   D.SLIDES.filter(s => !D.PRODUCT_BY_ID.has(s.product)).map(s => s.id), []);

eq('duplicate slide ids',
   D.SLIDES.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i), []);

// Presence. Each of these is a field that renders as a blank line if missing —
// visible only if somebody re-reads all ten slides on a phone.
const REQUIRED = ['glyph', 'wordmark', 'headline', 'quote', 'who', 'legal'];
for (const f of REQUIRED) {
  eq(`slides missing "${f}"`,
     D.SLIDES.filter(s => !s[f] || !String(s[f]).trim()).map(s => s.id), []);
}

// ============================================================
console.log('\n[copy] the register');
// Not a joke-quality test — nothing can check that. These catch the two ways
// the copy has actually gone wrong while being written: a headline long enough
// to overflow the slide on a narrow phone, and a testimonial that reads as
// coming from a person rather than a number or an institution.
const LONG = D.SLIDES.filter(s => s.headline.length > 46).map(s => `${s.id} (${s.headline.length})`);
eq('headlines too long for a 411px slide', LONG, []);

const GLYPH_MAX = 5;   // SUM() is the longest and sets the ceiling
eq('glyphs too wide to set at display size',
   D.SLIDES.filter(s => s.glyph.length > GLYPH_MAX).map(s => `${s.id} "${s.glyph}"`), []);

// Every slide carries small print. It is the load-bearing half of the joke —
// the headline is the gag and the legal line is the punchline — so a slide
// without one is a slide that has been written but not finished.
ok('every slide has small print', D.SLIDES.every(s => s.legal.length > 12));

// ============================================================
console.log('\n[wiring] the module and the adapter agree');
// Source checks, for the same reason check-achievements.mjs uses them: ads.js
// imports core/renderer.js, which imports three.js, so it cannot load here.
const ADS = readFileSync(new URL('../www/modules/ads.js', import.meta.url), 'utf8');
const PLAT = readFileSync(new URL('../www/platform/index.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

// Every product needs a store id or it cannot be sold, and every product needs
// a button or it cannot be reached.
for (const p of D.PRODUCTS) {
  ok(`${p.id} has a Play product id`, PLAT.includes(`'${p.id}':`));
  ok(`${p.id}'s button "${p.button}" exists`,
     HTML.includes(`id="${p.button}"`) || ADS.includes(`btn.id = MUL.button`));
}

// THE ONE THAT MATTERS. There is deliberately no development bypass that
// entitles a player without a purchase, because a flag like that ships. This
// greps for the shapes such a thing takes.
const BYPASS = /(DEV_UNLOCK|FORCE_OWNED|__unlock|owned\.add\((?!p\.id))/;
ok('no development bypass that entitles without a purchase', !BYPASS.test(ADS));

// THE OTHER ONE THAT MATTERS, and it cost a device run to find. An empty
// entitlement list from a store that does not exist must not be mistaken for a
// store saying the player owns nothing — the first is "no answer", the second
// is proof, and conflating them un-buys the product on every launch. The
// adapter marks a real answer with `available: true` and ads.js requires it.
ok('the billing stub reports that it is not a real store',
   /available:\s*false/.test(PLAT));
ok('reconcile() only trusts an entitlement list when a store actually answered',
   /res\?\.available === true/.test(ADS));

// The intrusion default. Off, and in HOT_KEYS so toggling it does not dispose
// and rebuild a thousand meshes to start a timer.
const STATE = readFileSync(new URL('../www/core/state.js', import.meta.url), 'utf8');
ok('adsIntrude defaults to false', /adsIntrude:\s*false/.test(STATE));
ok('adsIntrude is a HOT key', /'adsIntrude'/.test(STATE));

// The module has to actually be loaded, or all of the above is inert.
ok('ads.js is in the module load list', HTML.includes("'./modules/ads.js'"));

// ============================================================
console.log(`\n${fail ? 'ADS CHECKS FAILED.' : 'All ads checks passed.'}  (${pass} passed, ${fail} failed)`);
process.exit(fail ? 1 : 0);
