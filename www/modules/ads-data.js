// PNM — The Ads: products and slide copy
//
// Split out from ads.js for the same reason achievements-data.js is split out
// from achievements.js: **no Three.js, no renderer, no DOM**. It can be
// imported and checked by `node tools/check-ads.mjs` without a browser, which
// matters here because this file is almost entirely COPY, and copy is the one
// thing a rendering test cannot check. A slide with a missing headline still
// draws; it just draws wrong.
//
// ============================================================
// WHAT THIS IS
// ============================================================
// The in-app purchase is advertising. Not advertising that funds the app —
// advertising AS the product. You pay to be shown commercials for mathematical
// operators, and the operators are pitched with the full apparatus of a brand
// that believes in itself completely.
//
// The register is fixed and it is the whole joke, so it is worth stating
// plainly for anyone adding a slide: **somewhere between Cyberpunk 2077 and
// Sesame Street.** Megacorp gloss — trademark symbols, product tiers, legal
// small print, testimonials from satisfied customers — wrapped around content
// aimed at a five-year-old. The tone is never winking. Nothing in a slide
// acknowledges that selling the plus sign is absurd. That is what makes it
// funny; a slide that nudges the reader is a slide that has given up.
//
// Rules that keep it in register:
//   - The product is always the SYMBOL, never the mathematics. "+" is for sale.
//     Addition is not.
//   - Testimonials come from numbers, and numbers are earnest.
//   - Legal small print is real-sounding and slightly wrong.
//   - No slide is self-aware. The one about the price is the exception that
//     proves it, and it stays in character while being about money.
//
// DESIGN RECORD: docs/ADS.md.

// ============================================================
// PRODUCTS
// ============================================================
// Two non-consumables. Multiplication is deliberately five times the price of
// addition, and the slide deck says why in the only line that comes close to
// breaking character — which is the correct place to put that gag, because a
// player who has just paid $4.99 is already thinking it.
//
// `order` is the sequence they unlock in: multiplication's button does not
// exist until addition is owned. That is a merchandising joke as much as a UI
// one, and it means the corner stack grows by one button rather than starting
// with two doors the player cannot open.
export const PRODUCTS = [
  {
    id: 'ads-addition',
    order: 1,
    name: 'Addition Ads',
    price: '$0.99',
    priceMicros: 990000,
    // THE PITCH MUST NOT GIVE THE JOKE AWAY. Read it before buying and it says
    // one thing: you are paying to have advertisements ADDED to the app. That
    // is the surface gag and it is a complete, honest product description.
    //
    // The real joke only lands after the transaction, when the ads turn out to
    // be advertisements FOR ADDITION. "Addition Ads" is true both ways and we
    // deliver both — that double delivery is the payload, and it is destroyed
    // by a pitch that explains it. So: no operators named here, no wink, no
    // "commercials for the addition operators". Just a shop selling ads.
    pitch: 'Advertisements, added to Pretty Number Machine. ' +
           'One payment. Yours forever.',
    button: 'ads-btn',
    requires: null,
  },
  {
    id: 'ads-multiplication',
    order: 2,
    name: 'Multiplication Ads',
    price: '$4.95',
    priceMicros: 4950000,
    // Same construction, same restraint. Before: your advertisements will be
    // multiplied. After: they are advertisements for multiplication.
    pitch: 'Your advertisements, multiplied. ' +
           'A premium tier, priced accordingly.',
    button: 'ads-mul-btn',
    requires: 'ads-addition',
  },
];

export const PRODUCT_BY_ID = new Map(PRODUCTS.map(p => [p.id, p]));

// ============================================================
// PALETTES
// ============================================================
// Named rather than inlined per slide, so the whole deck can be re-graded by
// editing this block. Each is [from, to, ink, accent] — the gradient's two
// stops, the colour text sits in, and the one bright colour used for rules,
// badges and the trademark.
//
// They are loud on purpose and they are the only loud thing in this app. PNM's
// own palette is near-black with a few saturated nodes; an advert that respected
// that would not read as an advert. The slideshow is full-bleed and modal, so
// it never has to sit next to the figure.
export const PALETTES = {
  neonDusk:   { from: '#2b0b3f', to: '#0d1b4c', ink: '#ffffff', accent: '#ff2e88' },
  chromeCyan: { from: '#05323d', to: '#01151c', ink: '#eafcff', accent: '#22e0ff' },
  sesame:     { from: '#ffd23f', to: '#ff8c1a', ink: '#2a1600', accent: '#e02020' },
  corporate:  { from: '#101418', to: '#1e2933', ink: '#e8eef4', accent: '#7cf6b0' },
  vhs:        { from: '#3d0a2a', to: '#120a2e', ink: '#ffe9f6', accent: '#ffcc00' },
  playroom:   { from: '#1b7fd4', to: '#0a3f7a', ink: '#ffffff', accent: '#ffd23f' },
  // For `proximity`, whose product is nothing. A gallery wall rather than a
  // gradient: the only light palette in the deck, because an empty space reads
  // as a mistake when it is dark and as a luxury when it is lit.
  lightbox:   { from: '#f4f1ea', to: '#dcd7cc', ink: '#1a1815', accent: '#8a7a52' },
};

// ============================================================
// SLIDES
// ============================================================
// Each slide is data, not markup. ads.js turns it into a DOM node, so the look
// can be changed in one place for the whole deck and a slide can never carry a
// stray style of its own.
//
// Fields:
//   glyph       the product. Enormous, centred, the reason the slide exists
//   glyphNote   optional caption under the glyph, set small — a spec line
//   wordmark    the brand name, letterspaced
//   headline    the claim
//   tm          whether to hang a trademark on the headline
//   quote       a testimonial
//   who         who said it. Always a number, or something that is not a person
//   legal       small print. Real-sounding, slightly wrong
//   palette     a key of PALETTES
//   treatment   'chrome' | 'flat' | 'scan' — how ads.js finishes it
//
// DEV: `glyph` is TEXT and must stay text. It is set in the app's own font
// stack at a size where a drawn path would be the obvious choice — but these
// are real mathematical characters and the joke depends on them being the
// actual symbols, not pictures of them. The one place that matters in practice
// is SUM(), which is a word, and the Greek capitals, which need a font that
// has them. Both are covered by the stack in index.html.
//
// EVERY FIELD BELOW `headline` IS OPTIONAL, and that is a design decision
// rather than laziness. The first pass gave all ten slides the same five-part
// anatomy — wordmark, glyph, headline, testimonial, small print — and they read
// as one slide printed ten times. Real advertising varies its density hard: a
// full page for a luxury good is a picture and four words. So a slide takes
// only the parts it needs, and the sparse ones are the strong ones.
//
//   glyph      may be EMPTY. `proximity` sells implicit multiplication, whose
//              symbol is the absence of a symbol, so its ad space is empty
//   quote/who  drop together. A testimonial is a mid-market device; the more
//              expensive the pitch, the less it wants one
//   legal      small print. Still the punchline where a slide has one
//   cta        a closing instruction, set apart. Rare on purpose
const slide = (product, s) => ({ product, ...s });

export const SLIDES = [
  // ---- ADDITION -------------------------------------------------------
  // Nothing but the product and the claim. The most expensive-looking slide in
  // the deck is the one with the least on it.
  slide('ads-addition', {
    id: 'plus',
    glyph: '+',
    wordmark: 'PLUS',
    headline: 'ADDITION, PERFECTED.',
    tm: true,
    palette: 'neonDusk',
    treatment: 'chrome',
  }),
  slide('ads-addition', {
    id: 'sigma',
    glyph: 'Σ',
    glyphNote: 'CAPITAL SIGMA · SUMMATION · SINCE ANTIQUITY',
    wordmark: 'SIGMA',
    headline: 'WHEN ONE PLUS IS NOT ENOUGH.',
    quote: 'It added all of us. At the same time. I have never felt so seen.',
    who: 'Natural Numbers',
    legal: 'Bounds sold separately. Sigma is not liable for divergent series.',
    palette: 'chromeCyan',
    treatment: 'chrome',
  }),
  slide('ads-addition', {
    id: 'sum-fn',
    glyph: 'SUM()',
    glyphNote: 'ENTERPRISE EDITION',
    wordmark: 'SUM()',
    headline: 'ADDITION FOR BUSINESS.',
    tm: true,
    quote: 'Our quarterly totals have never been more total.',
    who: 'The Market',
    legal: 'Parentheses included. Arguments not included. Seat licence required.',
    palette: 'corporate',
    treatment: 'flat',
  }),
  slide('ads-addition', {
    id: 'oplus',
    glyph: '⊕',
    glyphNote: 'LIMITED RUN · NUMBERED · CIRCLED',
    wordmark: 'PLUS PRESTIGE',
    headline: 'THE SAME PLUS. IN A CIRCLE.',
    tm: true,
    quote: 'I did not know I needed the circle. I need the circle.',
    who: 'a vector space, verified owner',
    legal: 'Circle is decorative in most contexts. Direct sums may occur.',
    palette: 'vhs',
    treatment: 'scan',
  }),

  // ---- MULTIPLICATION -------------------------------------------------
  slide('ads-multiplication', {
    id: 'times',
    glyph: '×',
    wordmark: 'TIMES',
    headline: 'ADDITION, BUT AMBITIOUS.',
    tm: true,
    legal: 'Times is not addition. Any resemblance is repeated and intentional.',
    palette: 'neonDusk',
    treatment: 'chrome',
  }),
  slide('ads-multiplication', {
    id: 'asterisk',
    glyph: '*',
    glyphNote: 'WORKS IN EVERY LANGUAGE YOU HAVE HEARD OF*',
    wordmark: 'ASTERISK',
    headline: 'THE OPERATOR THAT GOES ANYWHERE.',
    quote: 'I typed it on a keyboard. It just worked. No one helped me.',
    who: 'a first-year',
    legal: '*Not valid as a footnote in this advert.',
    palette: 'corporate',
    treatment: 'flat',
  }),
  slide('ads-multiplication', {
    id: 'cdot',
    glyph: '·',
    glyphNote: 'ACTUAL SIZE',
    wordmark: 'THE DOT',
    headline: 'MULTIPLICATION FOR PEOPLE WHO KNOW.',
    tm: true,
    quote: 'If you have to ask what it does, it is not for you.',
    who: 'a physicist, declining to elaborate',
    legal: 'Left as an exercise for the reader.',
    palette: 'chromeCyan',
    treatment: 'chrome',
  }),
  slide('ads-multiplication', {
    id: 'bigpi',
    glyph: '∏',
    glyphNote: "CAPITAL PI · PRODUCT · SIGMA'S SIBLING",
    wordmark: 'BIG PI',
    headline: "DON'T SETTLE FOR SIGMA.",
    legal: 'An empty product is 1. An empty sum is 0. We think that says it all.',
    palette: 'playroom',
    treatment: 'flat',
  }),
  // The one with nothing in it. Implicit multiplication — `ab` — has no symbol
  // at all, so the ad space is empty and lit, and the copy sells the absence as
  // exclusivity. It is the last slide and the only one that closes on an
  // instruction.
  //
  // DEV: `glyph` is deliberately the empty string. modules/ads.js draws an
  // empty lit frame where the product would be rather than collapsing the
  // space, because the space IS the product.
  slide('ads-multiplication', {
    id: 'proximity',
    glyph: '',
    wordmark: 'MERE PROXIMITY',
    headline: 'OUR MOST EXCLUSIVE MODEL.',
    quote: 'You simply have to know.',
    cta: 'Multiply with your neighbor today.',
    palette: 'lightbox',
    treatment: 'empty',
  }),
];

export function slidesFor(productId) {
  return SLIDES.filter(s => s.product === productId);
}

// Every product must have a deck, or its button opens onto nothing. Cheap to
// check and impossible to notice by eye once the list is long.
export function productsWithoutSlides() {
  return PRODUCTS.filter(p => slidesFor(p.id).length === 0).map(p => p.id);
}

// A slide whose palette does not exist renders with no colours at all and looks
// like a bug rather than a joke.
export function slidesWithBadPalette() {
  return SLIDES.filter(s => !PALETTES[s.palette]).map(s => s.id);
}

export const TREATMENTS = ['chrome', 'flat', 'scan', 'empty'];

export function slidesWithBadTreatment() {
  return SLIDES.filter(s => !TREATMENTS.includes(s.treatment)).map(s => s.id);
}
