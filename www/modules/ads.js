// PNM — The Ads
//
// A feature module, so it is dynamically imported and crash-isolated: if this
// file throws, the app disables it and carries on. That is the right posture
// for the one module that touches money.
//
// WHAT IT OWNS
//   - the entitlement record (which products are owned)
//   - the paywall
//   - the slideshow
//   - the multiplication button, which does not exist until addition is owned
//   - the intrusion setting, and the banner it enables
//
// WHAT IT DOES NOT OWN
//   - the plus button in the corner stack. index.html has it; this only binds it
//   - prices and copy. modules/ads-data.js has those, and it is checkable
//     without a browser, which is where a missing headline gets caught
//   - the purchase itself. platform/index.js is the only thing that talks to a
//     store. Since 2026-08-25 that is cordova-plugin-purchase talking to
//     Play Billing 9. A browser still gets the stub, and a purchase there
//     still honestly fails as "unavailable" -- by design. See §4 of docs/ANDROID-BUILD.md
//
// THE ENTITLEMENT RULE, which is the part worth getting right:
//
//   **The store is the source of truth. The local record is a cache.**
//
// Same shape as the achievement ledger and for the same reason — the app has to
// work offline and signed out — but with the opposite bias. A cached
// achievement that the platform has not heard of is pushed TO the platform,
// because the player earned it and the app is the authority on that. A cached
// entitlement is not: the player did not earn it, they bought it, and only the
// store knows whether that happened. So local entitlement is trusted for
// SHOWING things and never treated as proof; restore() overwrites it whenever a
// store answers.
//
// There is deliberately no development bypass. A flag that entitles a player
// for testing is a flag that ships. To look at the slideshow before billing is
// wired, seed the local record — docs/ADS.md has the one-liner.

import { registerModule, state, on, emit } from '../core/state.js';
import { update } from '../core/renderer.js';
import { platform } from '../platform/index.js';
import { PRODUCTS, PRODUCT_BY_ID, PALETTES, slidesFor, isSellable } from './ads-data.js';

const STORE_KEY = 'pnm-entitlements-v1';

// ============================================================
// ENTITLEMENT
// ============================================================
let owned = new Set();
let ready = false;

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return new Set(Array.isArray(parsed?.owned) ? parsed.owned : []);
  } catch { return new Set(); }
}

function saveLocal() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ owned: [...owned] }));
  } catch { /* private mode, a full disk — not worth failing the module over */ }
}

export function isOwned(id) { return owned.has(id); }

// DEV: restore() is authoritative ONLY when a real store answered, and the
// adapter says so with `available`.
//
// This is NOT a workaround for something Play fails to do — Play solves it, and
// `available` is how its solution reaches this file. Play Billing's
// queryPurchasesAsync() reads the Play Store app's own local cache of
// entitlements, so it answers correctly without a network round-trip, and it
// reports whether it answered at all through BillingResult.responseCode: OK
// versus SERVICE_DISCONNECTED, SERVICE_UNAVAILABLE, BILLING_UNAVAILABLE. The
// adapter collapses that into one boolean so nothing above platform/index.js
// has to know Play's constants.
//
// What goes wrong without it is a build where the service never answers at
// all. That was every build before 2026-08-25, when no billing plugin was
// wired: restore() returned an empty list, this function read it as "you own
// nothing", and a seeded entitlement vanished on every launch. Found on a
// Pixel 7.
//
// A plugin is wired now, so that particular cause is gone. THE GUARD IS NOT
// REDUNDANT: the same thing happens on a real device whenever the billing
// service is disconnected, and that is not a state you can rehearse.
//
// So: only `available: true` may take something away. Anything else — no
// plugin, a disconnected service, a plugin that threw — keeps what is cached.
async function reconcile() {
  owned = loadLocal();
  paintButtons();
  try {
    const res = await platform.billing.restore();
    if (res?.available === true && Array.isArray(res.entitled)) {
      owned = new Set(res.entitled);
      saveLocal();
    }
  } catch (e) {
    console.warn('[PNM] Entitlement restore failed; keeping the local record.', e);
  }
  ready = true;
  paintButtons();
  scheduleShimmer();
}

// ============================================================
// THE BUTTONS
// ============================================================
// The plus button is in index.html. The multiplication button is not: it is
// created here and inserted after the plus, and only once addition is owned.
// That is a merchandising joke — the shop grows a second door after you use the
// first one — and it keeps the corner stack from opening with two controls the
// player cannot do anything with.
const MUL = PRODUCTS.find(p => p.id === 'ads-multiplication');
const EXP = PRODUCTS.find(p => p.id === 'ads-exponential');

// ============================================================
// THE TRAY
// ============================================================
// `+s` is the door and it is the only ads control normally on screen. The
// operator buttons — +, x, ^ — live behind it and appear when it is tapped.
//
// WHY: three permanent buttons in the corner column is three buttons' worth of
// figure you cannot see, and the figure is the product. One door costs one.
//
// The pun is the point of the label. `+` is add; `+s` is adds; adds is ads. It
// is also exactly the register §1 asks for — the product is the SYMBOL, and a
// brand that spells its own name out of an operator never has to wink.
//
// EVERY BUTTON DOES ONE JOB. `+s` opens and closes and nothing else; each
// operator opens its own thing. Nothing changes meaning depending on state,
// which was the flaw in doing this with `+` as both door and product.
const TRAY_OPEN = 'ads-tray-open';

function trayIsOpen() {
  return document.body.classList.contains(TRAY_OPEN);
}

export function closeTray() {
  document.body.classList.remove(TRAY_OPEN);
  document.getElementById('ads-menu-btn')?.setAttribute('aria-expanded', 'false');
}

function toggleTray() {
  const open = !trayIsOpen();
  document.body.classList.toggle(TRAY_OPEN, open);
  document.getElementById('ads-menu-btn')?.setAttribute('aria-expanded', String(open));
}

// ANYTHING ELSE CLOSES IT. Rather than enumerating the things that should —
// which is the list that goes stale the next time a control is added — this
// closes on any pointer that lands outside the tray. Tapping the figure, another
// corner control, the panel, the transport: all of them are "something else".
//
// Capture phase so it runs before the thing that was tapped, and it never
// swallows the event — the tap still does whatever it was going to do.
//
// The sheet moving and the figure auto-rotating are deliberately NOT triggers.
// Those are not the player doing something.
function watchForDismissal() {
  document.addEventListener('pointerdown', (e) => {
    if (!trayIsOpen()) return;
    if (e.target.closest?.('#ads-menu-btn, .ads-tray-member')) return;
    closeTray();
  }, { capture: true });
}

function ensureMulButton() {
  // Gate read from the product, not written here — see the ladder note in
  // ads-data.js. Hardcoding it in two places is how the chain and the buttons
  // would come to disagree.
  if (MUL.requires && !isOwned(MUL.requires)) {
    document.getElementById(MUL.button)?.remove();
    return;
  }
  if (document.getElementById(MUL.button)) return;
  const stack = document.getElementById('corner-stack');
  const after = document.getElementById('ads-btn');
  if (!stack || !after) return;

  const btn = document.createElement('button');
  btn.id = MUL.button;
  btn.type = 'button';
  btn.title = 'More ads';
  btn.setAttribute('aria-label', 'Multiplication ads');
  // A multiplication cross, drawn rather than typed, for the reason index.html
  // gives about every other icon in this stack: a typed x is a letter and the
  // multiplication character is not reliably present in a system UI font.
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <path d="M7 7l10 10"/><path d="M17 7L7 17"/>
    </svg>`;
  btn.addEventListener('click', () => openFor(MUL.id));
  btn.classList.add('ads-tray-member');
  after.insertAdjacentElement('afterend', btn);
}

// The announced tier, one rung further up: it appears once MULTIPLICATION is
// owned. A shop that advertises its third product to somebody who has bought
// nothing is pushing rather than merchandising — and a tier you cannot buy is
// the last thing to wave at a player who has not bought the ones you can.
function ensureExpButton() {
  if (EXP.requires && !isOwned(EXP.requires)) {
    document.getElementById(EXP.button)?.remove();
    return;
  }
  if (document.getElementById(EXP.button)) return;
  const after = document.getElementById(MUL.button);
  if (!after) return;                       // sits after x, which builds first

  const btn = document.createElement('button');
  btn.id = EXP.button;
  btn.type = 'button';
  btn.title = 'More ads';
  btn.setAttribute('aria-label', 'Exponential ads');
  // A caret, drawn for the same reason as the cross above: a typed ^ is a
  // modifier character and renders inconsistently in a system UI font.
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 15l6-7 6 7"/>
    </svg>`;
  btn.classList.add('ads-tray-member');
  btn.addEventListener('click', () => openFor(EXP.id));
  after.insertAdjacentElement('afterend', btn);
}

// Owned products light their button, the same signal the achievements cup uses
// for progress. It is the only way to tell, from the stack alone, that there is
// something behind a door rather than a paywall.
function paintButtons() {
  ensureMulButton();
  ensureExpButton();
  document.getElementById('ads-btn')?.classList.add('ads-tray-member');
  for (const p of PRODUCTS) {
    const el = document.getElementById(p.button);
    if (el) el.classList.toggle('owned', isOwned(p.id));
  }
}

// ============================================================
// THE SHIMMER
// ============================================================
// The plus button is a door with nothing on it saying so. It looks exactly like
// Reset and Dazzle and the trophy, and a player can use this app for a long time
// without ever pressing it — which would be fine if there were nothing behind
// it, and there is.
//
// So it catches the light occasionally, and then it stops for good:
//
//   Never opened — every 5 minutes. This player does not know the door is
//                  there. Telling them is the ENTIRE job.
//   Opened       — never again. The invitation was accepted; it worked.
//   Owned        — never. Nothing left to say, and the button already carries
//                  the gold `owned` ring.
//
// REVISED 2026-08-26, and the earlier design is worth recording because it was
// not wrong so much as overtaken. There used to be a second cadence: seen but
// not sold dropped to every 20 minutes rather than stopping. That made sense
// when the shimmer was pointing at a single $0.99 product. It stopped making
// sense when the shop became a three-rung ladder, because a player who opened
// the shop and declined was then reminded every 20 minutes indefinitely --
// which is advertising, not a hint, and it fails this file's own rule that an
// invitation which keeps pestering after it has been accepted is a nag. The
// audience declared to Play starts at 13, and Families policy reads purchase
// pressure aimed at that age more strictly than the same thing aimed at
// adults. So: one cadence, and one chance.
//
// THE STOP TEST IS TWO CONDITIONS, NOT ONE. `paywallSeen()` is the main one,
// but ownership is checked as well and is NOT redundant: an entitlement can be
// restored onto a fresh install where the paywall has never been opened on
// THIS device, and a player who already owns the ads should not be invited to
// go and find the shop.
//
// One wave, not a pulse. This button sits permanently over the figure, and a
// control that glowed continuously in the corner of a toy would be intolerable
// — which is exactly why the achievements switch, which lives inside a
// collapsed panel section and can only be seen on purpose, is allowed a steady
// glow and this is not.
const SHIMMER_UNSEEN_MS = 300000;      // 5 minutes, and the only cadence
const SEEN_KEY = 'pnm-ads-seen-v1';
let shimmerTimer = null;

// Whether the paywall has ever been opened. Persisted, because "have you seen
// this yet" is a fact about the player rather than about this launch — a
// five-minute reminder on every cold start would be the nagging the two
// cadences exist to avoid.
function paywallSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markPaywallSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
  scheduleShimmer();                    // which now cancels the timer outright
}

function shimmerOnce() {
  // THE DOOR, not the product behind it. This read `ads-btn` until 2026-08-26,
  // which was the corner's ads control when the shimmer was written. The tray
  // made `ads-btn` the ADDITION PRODUCT button and put it behind the `+s` door,
  // where index.html gives it `display: none` unless `body.ads-tray-open` -- so
  // the invitation was animating an element the player could not see, except in
  // the one state where they had plainly already found the shop.
  const el = document.getElementById('ads-menu-btn');
  // Not while something is open over the figure, not in clear view, and not
  // while the tray itself is open. A shimmer is an invitation, and all three
  // states mean the player is already busy with the thing it invites them to.
  if (!el || paywallSeen() || isOwned('ads-addition')) return;
  if (document.body.classList.contains('ads-open')) return;
  if (document.body.classList.contains('ads-tray-open')) return;
  if (document.body.classList.contains('clear-view')) return;
  el.classList.remove('shimmer');
  void el.offsetWidth;                  // restart the animation
  el.classList.add('shimmer');
  setTimeout(() => el.classList.remove('shimmer'), 2400);
}

function scheduleShimmer() {
  if (shimmerTimer) { clearInterval(shimmerTimer); shimmerTimer = null; }
  // Both stop conditions, and see the note above for why ownership is not
  // covered by paywallSeen().
  if (paywallSeen() || isOwned('ads-addition')) return;
  shimmerTimer = setInterval(shimmerOnce, SHIMMER_UNSEEN_MS);
}

// ============================================================
// THE OVERLAY
// ============================================================
// One element, reused for both the paywall and the slideshow, because they are
// the same surface at different moments: you tap a door and either you are sold
// something or you are shown what you bought.
let overlay = null;
let escHandler = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'ads-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);
  return overlay;
}

function closeOverlay() {
  stopShow();
  if (overlay) { overlay.innerHTML = ''; overlay.classList.remove('open'); }
  document.body.classList.remove('ads-open');
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  emit('ads:closed', {});
}

function openOverlay(html) {
  const el = ensureOverlay();
  el.innerHTML = html;
  el.classList.add('open');
  document.body.classList.add('ads-open');
  // Escape obeys the same clock as the close button — see scheduleClose(). The
  // paywall has no clock, so `closeArmed` is set true when it opens.
  escHandler = (e) => { if (e.key === 'Escape' && closeArmed) closeOverlay(); };
  document.addEventListener('keydown', escHandler);
  el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeOverlay));
}

// ============================================================
// THE PAYWALL
// ============================================================
// In character, but not dishonest. The shop copy is the joke; the button says
// the real price and the real state of the transaction, because a paywall that
// jokes about what it is charging you is a paywall that gets reported.
function paywallHTML(p) {
  return `
    <div class="ads-sheet" data-kind="paywall">
      <button class="ads-close" type="button" data-close aria-label="Close">&times;</button>
      <p class="ads-eyebrow">AN OFFER</p>
      <h2 class="ads-title">${esc(p.name)}</h2>
      <p class="ads-pitch">${esc(p.pitch)}</p>
      <button class="ads-buy" type="button" data-buy="${esc(p.id)}">
        Buy for ${esc(p.price)}
      </button>
      <p class="ads-fine">One Time Payment. No Subscription. No Data Tracking.
        Just a helpful contribution to the Pretty Number Machine Dev Team.</p>
      <div class="ads-status" role="status" aria-live="polite"></div>
    </div>`;
}

function openPaywall(p) {
  closeArmed = true;              // a shop you cannot leave is not a joke
  markPaywallSeen();
  // TEMPTED! listens for this. It fires on the DOOR, never on the transaction:
  // see the note in achievements.js BUS_BINDINGS.
  emit('ads:paywall', { id: p.id });
  openOverlay(paywallHTML(p));
  const buy = overlay.querySelector('[data-buy]');
  const status = overlay.querySelector('.ads-status');
  buy?.addEventListener('click', async () => {
    buy.disabled = true;
    status.textContent = 'Contacting the store…';
    let res = null;
    try {
      res = await platform.billing.purchase(p.id);
    } catch (e) {
      console.error('[PNM] Purchase threw:', e);
    }
    if (res?.ok) {
      owned.add(p.id);
      saveLocal();
      paintButtons();
      scheduleShimmer();          // owned now: the invitation stops
      emit('ads:purchased', { id: p.id });
      openShow(p.id);
      return;
    }
    // Say what actually happened. "unavailable" is the honest answer today —
    // no billing plugin is wired — and inventing a friendlier one would make
    // this look broken rather than unfinished.
    buy.disabled = false;
    status.textContent = res?.reason === 'cancelled'
      ? 'Cancelled. Nothing was charged.'
      : 'The store is not available right now. Nothing was charged.';
  });
}

// ============================================================
// THE SLIDESHOW
// ============================================================
// It plays itself. An advert deck that waits to be advanced is a gallery, and
// this is meant to behave like the thing it is parodying — you open it and it
// starts, the way a commercial break does.
//
// Ten seconds a slide, which is long. The copy IS the product and the punchline
// is usually the small print at the bottom, so the dwell has to cover reading
// the whole slide rather than glancing at it. Pause and the arrows are there
// for anyone who wants longer, and touching either arrow stops the timer —
// somebody steering by hand has stopped watching and started reading.
const DWELL_MS = 10000;
let showTimer = null;
let showIndex = 0;
let showSlides = [];

function stopShow() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  clearCloseTimers();
}

function slideHTML(s) {
  const pal = PALETTES[s.palette];
  // Only what the slide declares. An absent testimonial leaves no gap, and an
  // absent glyph leaves a lit empty frame rather than collapsing — see the note
  // on `proximity` in ads-data.js, where the empty space IS the product.
  // A word needs a different size from a symbol — SUM() ran off both edges of
  // the slide at the single-glyph display size. `anim` is a per-slide motion
  // hook; index.html owns what each one does.
  const cls = [
    'ads-glyph',
    s.glyph.length > 2 ? 'ads-glyph-word' : '',
    s.anim ? `ads-anim-${s.anim}` : '',
  ].filter(Boolean).join(' ');
  const glyph = s.glyph
    ? `<p class="${cls}">${esc(s.glyph)}</p>`
    // The empty frame. `proximity` fills it with two letters that close the gap
    // between them; every other empty slide would just be an empty frame.
    : `<p class="${cls} ads-glyph-empty" aria-label="an empty advertising space">${
        s.anim === 'proximity'
          ? '<span class="ads-ij"><span>i</span><span>j</span></span>'
          : ''
      }</p>`;
  const note = s.glyphNote ? `<p class="ads-glyphnote">${esc(s.glyphNote)}</p>` : '';
  // A quote may be a string or an ARRAY OF LINES. The array form is how a slide
  // says where it breaks — `cdot` breaks at its comma, because the pause is the
  // delivery. Everything is still escaped; the only markup that reaches the
  // page is the <br> this builds.
  const quoteLines = Array.isArray(s.quote) ? s.quote : (s.quote ? [s.quote] : []);
  const quote = quoteLines.length ? `
        <blockquote class="ads-quote">
          <p>&ldquo;${quoteLines.map(esc).join('<br>')}&rdquo;</p>
          ${s.who ? `<cite>&mdash; ${esc(s.who)}</cite>` : ''}
        </blockquote>` : '';
  const cta = s.cta ? `<p class="ads-cta">${esc(s.cta)}</p>` : '';
  const legal = s.legal ? `<p class="ads-legal">${esc(s.legal)}</p>` : '';
  return `
    <div class="ads-slide ads-t-${esc(s.treatment)}"
         style="--from:${pal.from};--to:${pal.to};--ink:${pal.ink};--accent:${pal.accent}">
      <div class="ads-slide-inner">
        <p class="ads-wordmark">${esc(s.wordmark)}</p>
        ${glyph}
        ${note}
        ${s.headline ? `<h3 class="ads-headline">${esc(s.headline)}${s.tm ? '<sup>&trade;</sup>' : ''}</h3>` : ''}
        ${quote}
        ${cta}
        ${legal}
      </div>
    </div>`;
}

// No play, no pause, no arrows. **You are subjected to these.** A deck you can
// scrub is a gallery; the thing being parodied does not let you leave, and the
// whole point of having paid for advertising is that it behaves like
// advertising. It loops until you close it.
//
// The close button is the only control, and it is the joke's sharpest edge —
// see CLOSE_APPEAR_MS below.
function showHTML() {
  return `
    <div class="ads-show" data-kind="show">
      <div class="ads-stage"></div>
      <label class="ads-intrude">
        <input type="checkbox" data-intrude ${state.adsIntrude ? 'checked' : ''}>
        I want the full advertising experience.
        <span>(Interrupt me at inopportune times)</span>
      </label>
    </div>`;
}

// THE CLOSE BUTTON, and every number here is deliberate.
//
// It does not exist for three seconds. Then it exists but does nothing for two
// more. Then it works. It is small, it has no circle around it, and it sits in
// low contrast against whatever the slide is doing — findable if you are
// looking, invisible if you are not.
//
// This is a faithful reproduction of a real pattern, which is the point: the
// player has PAID for the advertising experience and this is what that
// experience is. Five seconds total is the honest end of the range — real ones
// are worse — and it is short enough that nobody is genuinely trapped.
//
// DEV: the dead window is a real dead window. A click during it is swallowed
// with no feedback at all, because feedback would be a courtesy the thing being
// parodied does not extend. Escape is gated identically, or the joke has a
// keyboard-shaped hole in it.
const CLOSE_APPEAR_MS = 3000;
const CLOSE_ARM_MS = 5000;
let closeArmed = false;
let closeTimers = [];

function clearCloseTimers() {
  for (const t of closeTimers) clearTimeout(t);
  closeTimers = [];
}

function scheduleClose() {
  clearCloseTimers();
  closeArmed = false;
  closeTimers.push(setTimeout(() => {
    const show = overlay?.querySelector('.ads-show');
    if (!show || show.querySelector('.ads-x')) return;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'ads-x';
    x.setAttribute('aria-label', 'Close');
    x.textContent = '×';
    x.addEventListener('click', () => { if (closeArmed) closeOverlay(); });
    show.appendChild(x);
  }, CLOSE_APPEAR_MS));
  closeTimers.push(setTimeout(() => { closeArmed = true; }, CLOSE_ARM_MS));
}

function renderSlide(dir = 0) {
  const stage = overlay?.querySelector('.ads-stage');
  if (!stage) return;
  stage.innerHTML = slideHTML(showSlides[showIndex]);
  const el = stage.firstElementChild;
  if (el) el.classList.add(dir > 0 ? 'ads-enter-next' : dir < 0 ? 'ads-enter-prev' : 'ads-enter');
  if (showTimer) clearTimeout(showTimer);
  showTimer = setTimeout(() => step(1), DWELL_MS);
}

// ONE ROUND, then it lets you go. A commercial break ends; a deck that looped
// forever would make the close button the only way out, and the close button is
// already doing quite enough work.
//
// The player can still leave early once the close arms at five seconds — this
// is the ceiling, not the expectation.
function step(d) {
  const next = showIndex + d;
  if (next >= showSlides.length) { closeOverlay(); return; }
  showIndex = (next + showSlides.length) % showSlides.length;
  renderSlide(d);
}

function openShow(productId) {
  showSlides = slidesFor(productId);
  if (!showSlides.length) return;                 // checked headlessly; belt and braces
  showIndex = 0;
  openOverlay(showHTML());
  overlay.querySelector('[data-intrude]')?.addEventListener('change', (e) => {
    update({ adsIntrude: e.target.checked });
  });
  scheduleClose();
  renderSlide();
  emit('ads:opened', { id: productId });
}

// An announced product's sheet. Deliberately the same furniture as the paywall
// — eyebrow, title, pitch, a button, small print — because the joke is that it
// looks like a real offer right up until you read the button. A third KIND of
// sheet would have been a third thing to keep in register for no gain.
//
// The button is inert and says so. It is not disabled-and-silent: a dead
// control with no explanation is the thing §1's small print rule exists to
// avoid, so the fine line does the work.
function comingSoonHTML(p) {
  return `
    <div class="ads-sheet" data-kind="soon">
      <button class="ads-close" type="button" data-close aria-label="Close">&times;</button>
      <p class="ads-eyebrow">AN OFFER</p>
      <h2 class="ads-title">${esc(p.name)}</h2>
      <p class="ads-pitch">${esc(p.pitch)}</p>
      <button class="ads-buy" type="button" disabled aria-disabled="true">
        Coming soon
      </button>
      <p class="ads-fine">Not Yet Available. Pricing To Be Determined. No Waiting List.
        The Pretty Number Machine Dev Team Thanks You For Your Patience.</p>
    </div>`;
}

// The door. Owned goes to the slideshow, unowned to the paywall, and announced
// to neither — there is no transaction behind it to reach.
function openFor(productId) {
  const p = PRODUCT_BY_ID.get(productId);
  if (!p) return;
  if (p.requires && !isOwned(p.requires)) return;   // its button should not exist
  // Tidy on the way out. Whatever you came back to, the figure has the corner
  // to itself again.
  closeTray();
  if (!isSellable(p)) {
    closeArmed = true;                              // a shop you cannot leave is not a joke
    openOverlay(comingSoonHTML(p));
    return;
  }
  isOwned(productId) ? openShow(productId) : openPaywall(p);
}

// ============================================================
// INTRUSION
// ============================================================
// The other half of the joke, and off by default.
//
// Slideshow-only is the honest product: you paid for adverts and you have to go
// and look at them. But the funnier version is the one where they behave like
// adverts, so it is offered as a setting rather than imposed. Nobody has their
// toy interrupted without having asked for it, and the people who want the full
// bit can have it.
//
// DEV: only ever shows slides from OWNED products, so it cannot advertise
// something the player has not bought — which would be a genuine advert, and
// the one thing this feature must never accidentally become.
// A CLOCK, NOT A COUNTER, and that was a real choice. Tying the interruption to
// activity — every hundredth adjustment, say — punishes the people using the app
// most, and worse, it makes the banner feel CAUSAL: it arrives right after you
// did something, so it reads as though you broke it. A bug, not a joke.
//
// Ninety seconds to the first one, then every four minutes. The first is early
// enough that somebody who just ticked the box sees what they agreed to while
// they still remember agreeing. Four minutes after that is roughly two or three
// in a normal sitting — enough to be the bit, not enough to end the session.
// Ten minutes was the alternative and it is too rare to register as something
// you opted into.
const INTRUDE_FIRST_MS = 90000;
const INTRUDE_EVERY_MS = 240000;
let intrudeTimer = null;
let intrudeFirst = null;
let banner = null;

function eligibleSlides() {
  return PRODUCTS.filter(p => isOwned(p.id)).flatMap(p => slidesFor(p.id));
}

function hideBanner() { banner?.remove(); banner = null; }

function showBanner() {
  const pool = eligibleSlides();
  if (!pool.length || !state.adsIntrude || document.body.classList.contains('ads-open')) return;
  const s = pool[Math.floor(Math.random() * pool.length)];
  const pal = PALETTES[s.palette];
  hideBanner();
  banner = document.createElement('div');
  banner.id = 'ads-banner';
  banner.style.setProperty('--from', pal.from);
  banner.style.setProperty('--to', pal.to);
  banner.style.setProperty('--ink', pal.ink);
  banner.style.setProperty('--accent', pal.accent);
  banner.innerHTML = `
    <span class="ads-banner-glyph">${esc(s.glyph)}</span>
    <span class="ads-banner-copy">${esc(s.headline)}</span>
    <button type="button" class="ads-banner-x" aria-label="Dismiss">&times;</button>`;
  banner.querySelector('.ads-banner-x').addEventListener('click', hideBanner);
  banner.addEventListener('click', (e) => {
    if (e.target.closest('.ads-banner-x')) return;
    hideBanner();
    openShow(s.product);
  });
  document.body.appendChild(banner);
}

function scheduleIntrusion() {
  if (intrudeTimer) { clearInterval(intrudeTimer); intrudeTimer = null; }
  if (intrudeFirst) { clearTimeout(intrudeFirst); intrudeFirst = null; }
  if (!state.adsIntrude) { hideBanner(); return; }
  // The clock restarts whenever the setting is switched on, so the first banner
  // is ninety seconds from THAT moment rather than from launch.
  intrudeFirst = setTimeout(() => {
    showBanner();
    intrudeTimer = setInterval(showBanner, INTRUDE_EVERY_MS);
  }, INTRUDE_FIRST_MS);
}

// ============================================================
// PLUMBING
// ============================================================
// Escaped because every string here is authored copy that goes into innerHTML.
// It is all ours today, which is exactly the assumption that stops being true
// later, and a trademark or an ampersand in a headline should not be able to
// break the slide.
function esc(v) {
  return String(v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const mod = {
  enabled: true,
  // No panel section. The one setting this module has lives at the foot of the
  // slideshow instead, and that is deliberate rather than lazy: the panel's
  // control schema has no notion of a control that only exists sometimes, and
  // "Let the ads interrupt me" shown to somebody who owns nothing gives away a
  // joke they have not bought yet. Putting it inside the thing you paid for
  // means it can only be found by someone it applies to.
  hidden: true,

  init() {
    document.getElementById('ads-btn')?.addEventListener('click', () => openFor('ads-addition'));
    // `+s` — the door. See THE TRAY above for why this is a separate control
    // rather than `+` doing two jobs.
    document.getElementById('ads-menu-btn')?.addEventListener('click', toggleTray);
    watchForDismissal();
    // Clear view hides everything; a tray left open behind it would come back
    // with the interface, which is not what "clear" promised.
    on('clearView', ({ on: clearing }) => { if (clearing) closeTray(); });
    reconcile();
    on('stateChange', ({ key }) => { if (key === 'adsIntrude') scheduleIntrusion(); });
    // Clear view means the figure alone. An advert is an interface.
    on('clearView', ({ on: clearing }) => { if (clearing) { hideBanner(); closeOverlay(); } });
    scheduleIntrusion();
    scheduleShimmer();
  },

  destroy() {
    stopShow();
    hideBanner();
    if (intrudeTimer) clearInterval(intrudeTimer);
    if (intrudeFirst) clearTimeout(intrudeFirst);
    if (shimmerTimer) clearInterval(shimmerTimer);
    closeOverlay();
  },
};

export function register() { registerModule('ads', mod); }

// Exported for the headless checker and for seeding an entitlement by hand.
export const _internals = { isOwned, openFor, eligibleSlides };
