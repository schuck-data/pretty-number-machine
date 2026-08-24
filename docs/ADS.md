# The Ads — design and implementation

**Written:** 2026-08-23. Built and shaken out on a Pixel 7 the same day.

> **Read this first.**
>
> The in-app purchase is **advertising as the product**. You pay to be shown
> commercials for mathematical operators. Nothing is advertised to a player who
> has not bought the advertising, there is no ad SDK, no network request and no
> consent framework — the entire deck is nine slides of markup in the bundle.
>
> **The pitch must never explain the joke.** "Addition Ads" reads before the
> purchase as *advertising will be added* and after it as *the advertising is
> for addition*. Both are true, both are delivered, and finding that out is the
> payload. §1a is the rule; `check-ads.mjs` greps the pitch for tells.
>
> **Two products**, replacing the single $0.99 unlock the older documents
> describe: `ads-addition` at $0.99 and `ads-multiplication` at $4.95. The
> second button does not exist until the first is owned. The paywall says
> exactly one thing: *"Add Ads for a one-time payment of $0.99."*
>
> **Billing is not wired.** No Capacitor billing plugin has been chosen — that
> is `ANDROID-BUILD.md` §4 and it is Dakota's decision — so every purchase
> honestly fails as "the store is not available right now". Everything else
> works. See §5 for how to look at the slideshow anyway.

---

## 1. The joke, stated plainly

The register is fixed, and anyone adding a slide has to hold it:

> **Somewhere between Cyberpunk 2077 and Sesame Street.**

Megacorp gloss — trademark symbols, product tiers, legal small print,
testimonials from satisfied customers — wrapped around content pitched at a
five-year-old. A colossal `+` on a magenta gradient, chrome-bevelled, over the
words ADDITION, PERFECTED.™

**The tone never winks.** No slide acknowledges that selling the plus sign is
absurd. That is what makes it funny; a slide that nudges the reader has given
up. The rules that keep it in register:

- **The product is the SYMBOL, never the mathematics.** `+` is for sale.
  Addition is not.
- **Testimonials come from numbers**, and numbers are earnest. "I used to carry.
  Now I just add." — a satisfied integer.
- **Small print is real-sounding and slightly wrong.** "Bounds sold separately.
  Sigma is not liable for divergent series."
- **The headline is the gag; the legal line is the punchline.** A slide without
  small print is a slide that has been written but not finished, and
  `check-ads.mjs` fails on one.

**Density is a tool and every slide uses a different amount of it.** The first
pass gave all ten the same five-part anatomy — wordmark, glyph, headline,
testimonial, small print — and they read as one slide printed ten times. Real
advertising varies hard: a full page for a luxury good is a picture and four
words. So every field below the headline is optional. `plus` is the product and
the claim and nothing else; `proximity` has no product at all.

A testimonial is a mid-market device. **The more expensive the pitch, the less
it wants one** — which is why `times`, `bigpi` and `plus` do without.

## 1a. The reveal, and why the shop must lie by omission

The paywall sells one reading and one reading only: *you are paying to have
advertisements added to the app.* That is a complete, honest description of the
product, and it is funny on its own — you are buying ads.

The second reading arrives only after the money does: they are advertisements
**for addition**. Same for the premium tier — *your advertisements, multiplied*
becomes *advertisements for multiplication*. We said exactly what we were
selling, on both levels, and delivered both. **Finding out we double-delivered
is the joke**, and a pitch that names an operator gives it away for free.

`check-ads.mjs` greps both pitches for tells — "operator", "plus", "sigma",
"SUM()", "asterisk", "times", "commercial" — because this is precisely the copy
a well-meaning later edit would make *clearer*.

---

## 2. What the money buys

| Product | Price | Deck | Unlocks |
|---|---|---|---|
| `ads-addition` | $0.99 | `+`, `Σ`, `SUM()`, `⊕` | The plus button in the corner stack |
| `ads-multiplication` | $4.95 | `×`, `*`, `·`, `∏`, and `proximity` | A second button, which does not exist until addition is owned |

`proximity` is the last slide and the only one selling nothing: implicit
multiplication — `ab` — has no symbol, so its ad space is an empty lit frame on
a gallery wall and the copy sells the absence as exclusivity. It is the only
light palette in the deck, because an empty space reads as a mistake when it is
dark and as a luxury when it is lit.

The growing shop is a merchandising joke as much as a UI decision: the stack
gains a door after you have used the first one, rather than opening with two
doors a player cannot go through.

**Purchases grant no achievements.** Decided 2026-08-23, and the reason is
arithmetic: UNITY!'s predicate is `countUnlocked() >= ACHIEVEMENT_DEFS.length - 1`,
where the `-1` is UNITY! itself. Adding even one purchase-granted achievement
puts a non-paying player permanently one short of the capstone and its 500 XP.
All 101 stay earnable by playing. See `ACHIEVEMENTS.md` §12.

---

## 3. Slideshow, and the intrusion setting

**The slideshow plays itself, ten seconds a slide, and there is no way to stop
it.** No play, no pause, no arrows. **You are subjected to these.** A deck you
can scrub is a gallery; the thing being parodied does not let you leave, and the
entire point of having paid for advertising is that it behaves like advertising.
It plays one round and then closes itself — a commercial break ends, and a deck
that looped forever would make the close button the only way out, which is quite
enough work for one small grey mark.

Ten seconds is long on purpose: the copy *is* the product and the punchline is
usually the small print, so the dwell has to cover reading the slide rather than
glancing at it.

**The close button is the joke's sharpest edge.** It does not exist for three
seconds. Then it exists and does nothing for two more. Then it works. It is
small, uncircled and dim against whatever the slide is doing — findable if you
are looking for it, invisible if you are not. A click during the dead window is
swallowed with no feedback at all, because feedback is a courtesy the thing
being parodied does not extend. Escape is gated identically, or the joke has a
keyboard-shaped hole in it.

Verified on a Pixel 7: no button at 2.9s, present at 3.2s, clicks dead at 3.2s
and 4.8s, closes at 5.5s.

Two limits on the cruelty, both deliberate. Five seconds is the honest end of
the real range — nobody is genuinely trapped. And the mark shrank, not the tap
target: it still meets the 44px minimum the accessibility pass established,
because being hard to *see* is the joke and being hard to *hit* is just bad.

The **paywall** keeps a normal, obvious, immediately-available close. A shop you
cannot leave is not a joke, it is a complaint.

Slides cross-fade with a direction-aware slide: the incoming one enters from the
side the deck moved. The first slide of a session gets a plain fade, because one
that flies in from nowhere reads as a glitch rather than a transition. Reduced
motion keeps the fade and drops the movement.

**Intrusion is off by default and must stay that way.** The funnier version of
this joke is the one where the adverts behave like adverts — a banner over the
figure every ninety seconds — but imposing that degrades the thing people came
for. So it is a setting, and it lives **at the foot of the slideshow** rather
than in the panel. Two reasons, and the second is the real one:

1. The panel's control schema has no notion of a control that only exists
   sometimes. (`type`, `key`, `label`, `default`, `hot`, `onChange` — that is
   all of it. `visible` and `hint` were invented, then removed.)
2. "Let the ads interrupt me", shown to somebody who owns nothing, gives away a
   joke they have not bought. Putting it inside the thing you paid for means it
   can only be found by someone it applies to.

The banner only ever draws slides from **owned** products, so it cannot
advertise something the player has not bought — which would be a genuine
advert, and the one thing this feature must never accidentally become.

---

## 3a. RESOLVED — the corner column and the transport

The controls went to the left edge for a while to escape the sheet's menu
button, which sat bottom-right and rose with the sheet until it met the bottom
of the column. **That moved the collision rather than ending it**: on the left,
the transport's own scrub bar ran underneath the column instead. Measured with
the sheet open, both products owned, the transport at 324-368 crossed the
multiplication button at 332-376.

Fixed at the source on 2026-08-23. **The menu button moved to the LEFT of the
transport**, and the controls came back to the right where a thumb reaches
them. The transport now takes a right inset *only while the sheet is open* —
12 inset + the 44 button + an 8 gap — because that is the only time it rides
high enough to reach the column. With the sheet away it sits at the bottom of
the screen and takes the full width, and insetting it there would shorten the
scrub bar to avoid a collision that cannot happen.

Verified on a Pixel 7: sheet open, transport 100..347 against a column at
355-399, zero overlaps across all seven slots. Sheet closed, transport
100..407, full width.

## 3b. Motion

Three slides animate, and each one demonstrates the product rather than
decorating it — which is the only thing that earns the frames.

- **TIMES** enters rotated a quarter-turn back, which draws the cross as a
  **plus**, then rolls into place and becomes a times. That is the headline —
  "addition, but ambitious" — performed instead of asserted. Runs once; an
  operator that kept spinning would be a logo, not a demonstration
- **ASTERISK** turns forever and breathes. The claim is that it works
  everywhere, so it never settles into one orientation — there is no canonical
  way up for an asterisk.

  **It must turn on its own centre, and 50% is not its own centre.** An
  asterisk is a high glyph: its ink sits near the cap line with nothing below
  it, so the middle of the line box is well beneath the middle of the mark, and
  rotating about 50% makes it visibly ORBIT rather than spin. The origin is
  `50% 34.2%`, measured rather than guessed — on a Pixel 7, canvas TextMetrics
  for this font and weight gave font ascent 120, descent 37, ink ascent 87, ink
  descent −31 in a 111px line box, putting the baseline 97 from the top and the
  ink centre 38 from the top. Every one of those scales with font-size, so the
  percentage holds across the clamp range. Re-measure if the font stack changes:

  ```js
  const cs = getComputedStyle(el), box = el.getBoundingClientRect();
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = c.measureText('*');
  const baseline = (box.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2
                   + m.fontBoundingBoxAscent;
  const inkCentre = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  console.log(100 * inkCentre / box.height);   // -> 34.2
  ```
- **MERE PROXIMITY** drifts an `i` and a `j` toward each other inside the empty
  frame and stops them side by side: `ij`, the product written with no operator
  at all. They stop a hair apart, because touching would read as one word and
  what is being sold is the proximity

Reduced motion drops all three. Each was arriving at a legible resting state, so
nothing is lost but the arrival.

**Typography rule: no orphans.** An advert never strands a single word on the
last line under its main statement. Headlines and the CTA use `text-wrap:
balance`; the longer runs use `pretty`.

**A word is not a symbol.** The glyph size was chosen for one character, and
`SUM()` ran off both edges of a 411px slide at it. Anything longer than two
characters is sized to fit instead, with *positive* tracking — at negative
tracking the parentheses closed up against the M and the whole thing read as
the word SUMO.

## 4. The entitlement rule

> **The store is the source of truth. The local record is a cache.**

Same shape as the achievement ledger, opposite bias. A cached achievement the
platform has not heard of is pushed *to* the platform, because the player earned
it and the app is the authority. A cached entitlement is not: the player did not
earn it, they bought it, and only the store knows whether that happened.

**`available` is Play's own distinction, not a workaround for a missing one.**
An earlier version of this section claimed offline was the risk. That was wrong,
and worth correcting rather than deleting: Play Billing's `queryPurchasesAsync()`
reads the Play Store app's local cache of entitlements, so it answers correctly
without a network round-trip. Offline is a solved problem and PNM did not need
to solve it again.

What Play *does* need to tell the app is whether it managed to answer at all,
and it does that through `BillingResult.responseCode` — `OK` versus
`SERVICE_DISCONNECTED`, `SERVICE_UNAVAILABLE`, `BILLING_UNAVAILABLE`. A plugin
maps those onto `available`, so nothing above `platform/index.js` handles a Play
constant.

**The trap, found on a Pixel 7.** "There is no store here" and "the store says
you own nothing" arrive looking identical — both are an empty entitlement list.
The first version of `reconcile()` overwrote its cache whenever `restore()`
returned an array, so with no billing plugin wired, a seeded entitlement vanished
on every launch. The same would happen on a real device any time the billing
service is disconnected.

The adapter now marks a real answer with `available: true`, and only a real
answer may take something away. Anything else — no plugin, no network, a plugin
that threw — keeps what is cached. Both halves are pinned in `check-ads.mjs`.

**There is deliberately no development bypass.** A flag that entitles a player
for testing is a flag that ships. The checker greps for the shapes such a thing
takes (`DEV_UNLOCK`, `FORCE_OWNED`, a bare `owned.add`).

---

## 5. Looking at it before billing exists

Seed the local record. On a device over `chrome://inspect`, or in a browser
console:

```js
localStorage.setItem('pnm-entitlements-v1',
  JSON.stringify({ owned: ['ads-addition', 'ads-multiplication'] }));
location.reload();
```

This works *because* of the rule in §4 — a stub store cannot take it away
again. Clear it by removing the key.

**Judge it on a phone.** The slides are full-bleed and sized against a 411px
viewport; the headline-length assertion in the checker exists because a desktop
window hides exactly the overflow that matters.

---

## 6. Where things live

| File | Owns |
|---|---|
| `www/modules/ads-data.js` | Products, palettes and every word of the copy. **No Three.js, no DOM** — checkable headlessly, which is the point, because copy is what rendering tests cannot judge |
| `www/modules/ads.js` | Entitlement, paywall, slideshow, the multiplication button, the banner |
| `www/platform/index.js` | `PRODUCT_IDS` and the billing adapter. The only thing that talks to a store |
| `www/index.html` | The plus button, and all the styling |
| `www/core/state.js` | `adsIntrude` — default false, and a HOT key so toggling it does not rebuild a thousand meshes to start a timer |
| `tools/check-ads.mjs` | 34 assertions, in `npm run check` and CI |

The module is `hidden: true`, so it has no panel section.

---

## 7. Open

- **No billing plugin.** `ANDROID-BUILD.md` §4. Until one is chosen, `purchase()`
  fails honestly and the paywall says so
- **Play product ids become permanent at first upload**, exactly like the
  package name. They are `ads_addition` and `ads_multiplication`
- **Whether bundled satirical self-ads trigger Play's "contains ads"
  declaration** is still unknown, and it was unknown before this reframe. The
  app serves no third-party advertising and makes no network request, but the
  declaration asks about ads, not about ad networks. Worth answering before the
  listing is filled in
- **The intrusion cadence is 90 seconds**, chosen rather than measured. It has
  not been lived with
- **Five slides per product**, and the decks want more before this is worth
  $4.95 — the price slide gets away with the joke once
- **`adsIntrude` does not persist.** It resets each launch, alongside the toast
  and sound settings (`ACHIEVEMENTS.md` §13). Same fix, whenever that happens
- **No restore-purchases button.** `restore()` runs at startup, which covers a
  reinstall, but there is no way for a player to ask for it by hand — and stores
  generally expect one
