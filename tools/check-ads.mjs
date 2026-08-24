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

// The tiers still stand five apart, but nothing in the copy depends on it any
// more — the slide that used to explain the price was replaced by `proximity`.
// Kept as a sanity check on the shop rather than as a guard on a joke.
eq('multiplication costs five times addition',
   micros['ads-multiplication'] / micros['ads-addition'], 5);

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

eq('addition deck size', D.slidesFor('ads-addition').length, 4);
eq('multiplication deck size', D.slidesFor('ads-multiplication').length, 5);

// Every slide belongs to a real product. A typo here yields a slide that exists
// and is unreachable, which nothing else would ever surface.
eq('slides whose product is not in the catalogue',
   D.SLIDES.filter(s => !D.PRODUCT_BY_ID.has(s.product)).map(s => s.id), []);

eq('duplicate slide ids',
   D.SLIDES.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i), []);

// Presence. Only the parts a slide cannot do without — everything below the
// headline is optional by design, because a deck where every slide has the same
// five parts reads as one slide printed nine times. See the note in ads-data.js.
//
// `glyph` is NOT in this list. `proximity` sells implicit multiplication, whose
// notation is the absence of notation, so its glyph is legitimately empty.
// `headline` left this list when SIGMA dropped its own — its spec line does
// the work instead. A slide still needs a name and a look.
const REQUIRED = ['wordmark', 'palette', 'treatment'];
for (const f of REQUIRED) {
  eq(`slides missing "${f}"`,
     D.SLIDES.filter(s => !s[f] || !String(s[f]).trim()).map(s => s.id), []);
}

// The key must still EXIST even when empty, or the renderer cannot tell
// "deliberately nothing" from "somebody forgot".
eq('slides with no glyph key at all',
   D.SLIDES.filter(s => typeof s.glyph !== 'string').map(s => s.id), []);
eq('slides that deliberately show nothing',
   D.SLIDES.filter(s => s.glyph === '').map(s => s.id), ['proximity']);

// A testimonial without an attribution is a quote from nobody.
eq('slides quoting nobody',
   D.SLIDES.filter(s => s.quote && !s.who).map(s => s.id), ['proximity']);
ok("...and proximity is the deliberate one: that line is the brand speaking, not a customer",
   D.SLIDES.find(s => s.id === 'proximity').quote === 'You simply have to know.');

// ============================================================
console.log('\n[copy] the register');
// Not a joke-quality test — nothing can check that. These catch the two ways
// the copy has actually gone wrong while being written: a headline long enough
// to overflow the slide on a narrow phone, and a testimonial that reads as
// coming from a person rather than a number or an institution.
const LONG = D.SLIDES.filter(s => s.headline && s.headline.length > 46).map(s => `${s.id} (${s.headline.length})`);
eq('headlines too long for a 411px slide', LONG, []);

const GLYPH_MAX = 5;   // SUM() is the longest and sets the ceiling
eq('glyphs too wide to set at display size',
   D.SLIDES.filter(s => s.glyph.length > GLYPH_MAX).map(s => `${s.id} "${s.glyph}"`), []);

// Small print is the punchline WHERE A SLIDE HAS ONE, and it is no longer
// universal: `plus` is deliberately bare and `proximity` closes on an
// instruction instead. What is still checked is that a slide which HAS small
// print carries enough of it to be a joke rather than a stub.
eq('slides whose small print is a stub',
   D.SLIDES.filter(s => s.legal !== undefined && s.legal.trim().length <= 12).map(s => s.id), []);
eq('slides deliberately without small print',
   D.SLIDES.filter(s => !s.legal).map(s => s.id), ['plus', 'proximity']);
eq('slides deliberately without a headline',
   D.SLIDES.filter(s => !s.headline).map(s => s.id), ['sigma']);

// Motion is declared, not hand-rolled per slide, so a typo yields a class no
// stylesheet answers and a glyph that simply sits there.
const ANIMS = ['roll', 'spin', 'proximity'];
eq('slides declaring an animation nothing implements',
   D.SLIDES.filter(s => s.anim && !ANIMS.includes(s.anim)).map(s => s.id), []);
eq('animated slides', D.SLIDES.filter(s => s.anim).map(s => s.id),
   ['times', 'asterisk', 'proximity']);

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

// THE REVEAL. "Addition Ads" means one thing before the purchase (advertising
// will be ADDED) and another after (the advertising is FOR addition). Both are
// true and both get delivered, and finding that out is the whole payload — so
// the pitch a player reads BEFORE paying must not name an operator or explain
// the second reading. A helpful edit to this copy would quietly destroy it.
const TELLS = [/operator/i, /\bplus\b/i, /sigma/i, /SUM\(\)/, /asterisk/i,
               /commercial/i, /\btimes\b/i];
for (const p of D.PRODUCTS) {
  eq(`${p.id}'s pitch keeps the joke back`,
     TELLS.filter(t => t.test(p.pitch)).map(String), []);
}

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
