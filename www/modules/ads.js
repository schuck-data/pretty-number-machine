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
//     store, and today there is no store: no billing plugin is wired, so every
//     purchase honestly fails as "unavailable". See §4 of docs/ANDROID-BUILD.md
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
import { PRODUCTS, PRODUCT_BY_ID, PALETTES, slidesFor } from './ads-data.js';

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
// adapter says so with `available`. Everything else leaves the cache alone.
//
// This is the whole subtlety of the function and it was got wrong first time.
// "There is no store here" and "the store says you own nothing" arrive looking
// identical — both are an empty entitlement list — but treating the first as
// the second un-buys the product. It did exactly that on a Pixel 7: no billing
// plugin is wired, restore() answered `{entitled: []}`, and a seeded
// entitlement vanished on every launch. Offline is the same shape of failure
// and would have shipped, because a player on a plane gets no store either.
//
// So: only `available: true` may take something away. Anything else — no
// plugin, no network, a plugin that threw — keeps what is cached.
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

function ensureMulButton() {
  if (!isOwned('ads-addition')) {
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
  after.insertAdjacentElement('afterend', btn);
}

// Owned products light their button, the same signal the achievements cup uses
// for progress. It is the only way to tell, from the stack alone, that there is
// something behind a door rather than a paywall.
function paintButtons() {
  ensureMulButton();
  for (const p of PRODUCTS) {
    const el = document.getElementById(p.button);
    if (el) el.classList.toggle('owned', isOwned(p.id));
  }
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
  escHandler = (e) => { if (e.key === 'Escape') closeOverlay(); };
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
      <button class="ads-x" type="button" data-close aria-label="Close">&times;</button>
      <p class="ads-eyebrow">AN OFFER</p>
      <h2 class="ads-title">${esc(p.name)}</h2>
      <p class="ads-pitch">${esc(p.pitch)}</p>
      <button class="ads-buy" type="button" data-buy="${esc(p.id)}">
        Buy for ${esc(p.price)}
      </button>
      <p class="ads-fine">One payment. Yours forever. No subscription, no
        network, no tracking — the whole thing is already on your phone.</p>
      <div class="ads-status" role="status" aria-live="polite"></div>
    </div>`;
}

function openPaywall(p) {
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
// Manual by default. An advert you paid for should not be able to end before
// you have read it, and the copy is the product — the whole joke is in the
// small print, so a slide that advances itself is a slide that eats the gag.
// Play is offered, and it is slow.
const DWELL_MS = 6500;
let showTimer = null;
let showIndex = 0;
let showSlides = [];
let playing = false;

function stopShow() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  playing = false;
}

function slideHTML(s) {
  const pal = PALETTES[s.palette];
  return `
    <div class="ads-slide ads-t-${esc(s.treatment)}"
         style="--from:${pal.from};--to:${pal.to};--ink:${pal.ink};--accent:${pal.accent}">
      <div class="ads-slide-inner">
        <p class="ads-wordmark">${esc(s.wordmark)}</p>
        <p class="ads-glyph">${esc(s.glyph)}</p>
        ${s.glyphNote ? `<p class="ads-glyphnote">${esc(s.glyphNote)}</p>` : ''}
        <h3 class="ads-headline">${esc(s.headline)}${s.tm ? '<sup>™</sup>' : ''}</h3>
        <blockquote class="ads-quote">
          <p>&ldquo;${esc(s.quote)}&rdquo;</p>
          <cite>&mdash; ${esc(s.who)}</cite>
        </blockquote>
        <p class="ads-legal">${esc(s.legal)}</p>
      </div>
    </div>`;
}

function showHTML() {
  return `
    <div class="ads-show" data-kind="show">
      <button class="ads-x" type="button" data-close aria-label="Close">&times;</button>
      <div class="ads-stage"></div>
      <div class="ads-controls">
        <button type="button" data-prev aria-label="Previous">&lsaquo;</button>
        <button type="button" data-play aria-label="Play">Play</button>
        <span class="ads-count" role="status" aria-live="polite"></span>
        <button type="button" data-next aria-label="Next">&rsaquo;</button>
      </div>
      <label class="ads-intrude">
        <input type="checkbox" data-intrude ${state.adsIntrude ? 'checked' : ''}>
        Let them interrupt me
        <span>The real experience. They will appear over the figure now and then.</span>
      </label>
    </div>`;
}

function renderSlide() {
  const stage = overlay?.querySelector('.ads-stage');
  if (!stage) return;
  stage.innerHTML = slideHTML(showSlides[showIndex]);
  const count = overlay.querySelector('.ads-count');
  if (count) count.textContent = `${showIndex + 1} / ${showSlides.length}`;
  if (playing) {
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => step(1), DWELL_MS);
  }
}

// Wraps rather than stopping. The deck is short and modal, and a slideshow that
// dead-ends on its last slide leaves the player looking at a disabled arrow
// wondering whether it broke.
function step(d) {
  showIndex = (showIndex + d + showSlides.length) % showSlides.length;
  renderSlide();
}

function openShow(productId) {
  showSlides = slidesFor(productId);
  if (!showSlides.length) return;                 // checked headlessly; belt and braces
  showIndex = 0;
  playing = false;
  openOverlay(showHTML());
  overlay.querySelector('[data-prev]')?.addEventListener('click', () => { stopShow(); syncPlay(); step(-1); });
  overlay.querySelector('[data-next]')?.addEventListener('click', () => { stopShow(); syncPlay(); step(1); });
  overlay.querySelector('[data-play]')?.addEventListener('click', () => {
    playing = !playing;
    syncPlay();
    if (playing) renderSlide(); else stopShow();
  });
  overlay.querySelector('[data-intrude]')?.addEventListener('change', (e) => {
    update({ adsIntrude: e.target.checked });
  });
  renderSlide();
  emit('ads:opened', { id: productId });
}

function syncPlay() {
  const b = overlay?.querySelector('[data-play]');
  if (b) b.textContent = playing ? 'Pause' : 'Play';
}

// The door. Owned goes to the slideshow, unowned to the paywall.
function openFor(productId) {
  const p = PRODUCT_BY_ID.get(productId);
  if (!p) return;
  if (p.requires && !isOwned(p.requires)) return;   // its button should not exist
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
const INTRUDE_MS = 90000;
let intrudeTimer = null;
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
  if (!state.adsIntrude) { hideBanner(); return; }
  intrudeTimer = setInterval(showBanner, INTRUDE_MS);
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
    reconcile();
    on('stateChange', ({ key }) => { if (key === 'adsIntrude') scheduleIntrusion(); });
    // Clear view means the figure alone. An advert is an interface.
    on('clearView', ({ on: clearing }) => { if (clearing) { hideBanner(); closeOverlay(); } });
    scheduleIntrusion();
  },

  destroy() {
    stopShow();
    hideBanner();
    if (intrudeTimer) clearInterval(intrudeTimer);
    closeOverlay();
  },
};

export function register() { registerModule('ads', mod); }

// Exported for the headless checker and for seeding an entitlement by hand.
export const _internals = { isOwned, openFor, eligibleSlides };
