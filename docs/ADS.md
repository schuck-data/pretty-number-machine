# The Ads — design and implementation

**Written:** 2026-08-23. Built and shaken out on a Pixel 7 the same day.

> **Read this first.**
>
> The in-app purchase is **advertising as the product**. You pay to be shown
> commercials for mathematical operators. Nothing is advertised to a player who
> has not bought the advertising, there is no ad SDK, no network request and no
> consent framework — the entire deck is ten slides of markup in the bundle.
>
> **Two products**, replacing the single $0.99 unlock the older documents
> describe: `ads-addition` at $0.99 and `ads-multiplication` at $4.99. The
> second button does not exist until the first is owned.
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

One deliberate exception. `why-five` is about the transaction — it explains the
$4.99 tier — and it stays in character while being about money, because a player
who has just paid five times more is already thinking it.

**That slide's small print came from a failing test.** The checker asserted the
price ratio was 5 and got 5.0404…, because $4.99 is not five times $0.99. Rather
than round the claim, the small print now accounts for the difference: *"Five
times $0.99 is $4.95. The remaining four cents are for the multiplication."*
The discrepancy is pinned in `check-ads.mjs`, so if the prices ever move, the
line that names four cents fails rather than quietly becoming wrong.

---

## 2. What the money buys

| Product | Price | Deck | Unlocks |
|---|---|---|---|
| `ads-addition` | $0.99 | `+`, `Σ`, `SUM()`, `⊕`, and a Sesame-Street plus | The plus button in the corner stack |
| `ads-multiplication` | $4.99 | `×`, `*`, `·`, `∏`, and the price slide | A second button, which does not exist until addition is owned |

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

**The slideshow is manual by default and it does not autoplay.** An advert you
paid for should not be able to end before you have read it, and the copy *is*
the product — the joke is in the small print. Play is offered and it is slow
(6.5 seconds a slide). The deck wraps rather than dead-ending on a disabled
arrow.

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

## 4. The entitlement rule

> **The store is the source of truth. The local record is a cache.**

Same shape as the achievement ledger, opposite bias. A cached achievement the
platform has not heard of is pushed *to* the platform, because the player earned
it and the app is the authority. A cached entitlement is not: the player did not
earn it, they bought it, and only the store knows whether that happened.

**The trap, found on a Pixel 7 and worth the whole section.** "There is no store
here" and "the store says you own nothing" arrive looking identical — both are
an empty entitlement list. The first version of `reconcile()` overwrote its
cache whenever `restore()` returned an array, so with no billing plugin wired,
a seeded entitlement vanished on every launch. **Offline is the same shape of
failure**, and it would have shipped: a player on a plane gets no store either,
and would have watched their purchase disappear.

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
  $4.99 — the price slide gets away with the joke once
- **`adsIntrude` does not persist.** It resets each launch, alongside the toast
  and sound settings (`ACHIEVEMENTS.md` §13). Same fix, whenever that happens
- **No restore-purchases button.** `restore()` runs at startup, which covers a
  reinstall, but there is no way for a player to ask for it by hand — and stores
  generally expect one
