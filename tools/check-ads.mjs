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
eq('product ids', D.PRODUCTS.map(p => p.id),
   ['ads-addition', 'ads-multiplication', 'ads-exponential']);

// SELLABLE vs ANNOUNCED. `ads-exponential` is a product tier that exists only
// as a promise: no price, no Play product id, no deck. That is deliberate and
// it is the most megacorp thing in the shop — but it is also exactly the shape
// of a half-finished product, so every difference is asserted rather than left
// to be noticed.
//
// The failure this guards against is shipping the announced tier as BUYABLE.
// A Buy button on something with no transaction behind it is a broken purchase
// flow in a released app, and it would be one line of tidying away.
eq('sellable products', D.SELLABLE.map(p => p.id), ['ads-addition', 'ads-multiplication']);
eq('announced products', D.PRODUCTS.filter(p => !D.isSellable(p)).map(p => p.id),
   ['ads-exponential']);

for (const p of D.PRODUCTS.filter(p => !D.isSellable(p))) {
  ok(`${p.id} names no price`, !p.price && !p.priceMicros);
  ok(`${p.id} still has a button and a pitch`, !!p.button && !!p.pitch);
}
// Content written for something nobody can reach is the other way this goes
// wrong, and it is quieter: a deck that never renders.
eq('announced products carrying a slide deck', D.announcedProductsWithSlides(), []);
// The source-level half — no Play id, no Buy button — is in [wiring] below,
// where the file has already read platform/index.js and ads.js.

// The unlock chain is the merchandising joke: the multiplication button does
// not exist until addition is owned. If `requires` ever came loose, the second
// button would appear on a fresh install beside a first one nobody had used.
eq('multiplication requires addition',
   D.PRODUCT_BY_ID.get('ads-multiplication').requires, 'ads-addition');
eq('addition requires nothing', D.PRODUCT_BY_ID.get('ads-addition').requires, null);
eq('exponential requires multiplication',
   D.PRODUCT_BY_ID.get('ads-exponential').requires, 'ads-multiplication');

// THE LADDER, asserted as a SHAPE rather than as the three lines above, so it
// keeps holding when a fourth tier arrives. Each product is gated on the one
// before it in `order`, and exactly one is the root.
//
// What this catches that a list would not: a new product bolted on as a second
// root (so it appears before anything is bought), or into a cycle (so its
// button can never appear at all, which looks like nothing rather than a bug).
const chain = [...D.PRODUCTS].sort((a, b) => a.order - b.order);
eq('exactly one product requires nothing',
   chain.filter(p => !p.requires).map(p => p.id), ['ads-addition']);
eq('every other product requires the one before it',
   chain.slice(1).filter((p, i) => p.requires !== chain[i].id).map(p => p.id), []);

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
// reaches a store listing and becomes a refund. SELLABLE only — an announced
// tier has neither a price nor micros, and asserting that it did is precisely
// how the announced tier would quietly acquire one.
for (const p of D.SELLABLE) {
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
   D.SLIDES.filter(s => !s.legal).map(s => s.id), ['plus', 'oplus', 'proximity']);
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

// Every SELLABLE product needs a store id, or it cannot be sold.
for (const p of D.SELLABLE) {
  ok(`${p.id} has a Play product id`, PLAT.includes(`'${p.id}':`));
}
// EVERY product needs a button, announced included — being reachable is the
// entire point of announcing one.
//
// The pitch check further down also stays over every product, and deliberately:
// a tier nobody can buy still SHOWS its pitch, so it can give the reveal away
// exactly as easily as a sellable one can.
for (const p of D.PRODUCTS) {
  ok(`${p.id}'s button "${p.button}" exists`,
     HTML.includes(`id="${p.button}"`) || ADS.includes(`btn.id = MUL.button`));
}

// THE ONE THAT MATTERS. There is deliberately no development bypass that
// entitles a player without a purchase, because a flag like that ships. This
// greps for the shapes such a thing takes.
const BYPASS = /(DEV_UNLOCK|FORCE_OWNED|__unlock|owned\.add\((?!p\.id))/;
ok('no development bypass that entitles without a purchase', !BYPASS.test(ADS));

// The gates must READ the chain, never restate it. Two hardcoded product names
// in ads.js is how the buttons and the data would come to disagree — and the
// symptom would be a tier appearing a purchase too early, which nobody
// complains about.
ok('the button gates read `requires` rather than naming a product',
   /MUL\.requires && !isOwned\(MUL\.requires\)/.test(ADS)
   && /EXP\.requires && !isOwned\(EXP\.requires\)/.test(ADS));

// THE ANNOUNCED TIER MUST NOT BECOME BUYABLE. `ads-exponential` has no
// transaction behind it, so a Buy button on it would be a broken purchase flow
// in a released app — and it is one line of well-meant tidying away.
for (const p of D.PRODUCTS.filter(p => !D.isSellable(p))) {
  ok(`${p.id} has no Play product id`, !PLAT.includes(`'${p.id}':`));
}
ok('the coming-soon sheet offers no transaction',
   /data-kind="soon"/.test(ADS)
   && !/data-kind="soon"[\s\S]{0,600}?data-buy/.test(ADS));
ok('...and openFor routes an announced product to it rather than to a paywall',
   /if \(!isSellable\(p\)\)[\s\S]{0,200}?comingSoonHTML/.test(ADS));

// THE TRAY. Every operator button is a tray member, so the CSS that hides them
// behind `+s` reaches all of them — a button that misses the class is one that
// sits on the figure permanently, which is the thing the tray exists to stop.
ok('the door exists in the markup', /id="ads-menu-btn"/.test(HTML));
ok('...and is labelled with the pun, set as text', />\+s</.test(HTML));
// SCOPED THROUGH #corner-stack, and that is the assertion. A bare `#ads-btn`
// is (0,1,0,0) and loses to `#corner-stack button` at (0,1,0,1), so the tray
// never hid anything — found on the device, not here, because a grep proves the
// rule was written rather than that it wins.
ok('the hide rule outranks #corner-stack button',
   /#corner-stack #ads-btn,\s*#corner-stack #ads-mul-btn,\s*#corner-stack #ads-exp-btn \{ display: none; \}/.test(HTML));
ok('...and the show rule outranks the hide rule',
   /body\.ads-tray-open #corner-stack #ads-exp-btn \{ display: flex; \}/.test(HTML));
ok('the door does not hide itself', !/#ads-menu-btn[^{]*\{[^}]*display:\s*none/.test(HTML));

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

// The shimmer has TWO cadences and the gap between them is the whole design:
// five minutes for a player who has never opened the paywall (they do not know
// the door exists), twenty for one who has (they know, and reminding them at
// the same rate is pestering somebody who already answered). Owned means never.
// Easy to "simplify" into one interval by someone who has not read why.
ok('the ads shimmer has a fast cadence for an unseen paywall',
   /SHIMMER_UNSEEN_MS\s*=\s*300000/.test(ADS));
ok('...and a four-times slower one once it has been seen',
   /SHIMMER_SEEN_MS\s*=\s*1200000/.test(ADS));
ok('an owned product stops the shimmer entirely',
   /isOwned\('ads-addition'\)\)\s*return;/.test(ADS));

// The intrusion is on a CLOCK, not an action counter. An action counter
// punishes heavy users and makes the banner feel causal — as though the last
// thing you touched broke something. Pinned because "every Nth adjustment" is
// an obvious-looking idea that somebody will have again.
ok('intrusion is scheduled on a timer, not counted off user actions',
   /INTRUDE_FIRST_MS/.test(ADS) && /INTRUDE_EVERY_MS/.test(ADS));

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
