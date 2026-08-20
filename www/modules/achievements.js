// PNM — Achievements Ledger
//
// The local ledger is the SOURCE OF TRUTH. Play Games is a public copy and a
// cross-device backup, never the authority. That ordering is what lets the
// whole system work offline and signed out, which is a stated design constraint
// (docs/HANDOFF.md §2) and not a nicety.
//
// Nothing else in the app knows an achievement exists. This module listens to
// the signals core/ and the other modules already produce, and to a small
// number it asked them to add. See docs/achievements-design.xlsx for the agreed
// design — that spreadsheet is the design record, this file is the truth.
//
// DEV: three kinds of signal, because the app has three kinds of thing to
// notice, and they are NOT interchangeable:
//
//   state    — a config key reached a value. Driven by the `stateChange` event,
//              which core/renderer.js update() emits for every key it changes.
//   dom      — a real human moved a real control. Driven by listeners on the
//              panel's own elements, and guarded by event.isTrusted. This is
//              what makes "manually" mean something: Dazzle and the Reset
//              button assign .value and .checked directly, and a programmatic
//              assignment does not fire input or change at all. See the note on
//              onTrusted() below, which is the load-bearing part of this file.
//   sampled  — something continuous. The morph writes state.dimension straight
//              into the singleton without going through update(), so no event
//              ever fires for it and polling in animate() is the only option.

import * as THREE from 'three';
import { registerModule, state, on, emit, MAX_N, prefersReducedMotion } from '../core/state.js';
import { resolveN, update } from '../core/renderer.js';
import { interpolatedPos } from '../core/positions.js';
import { platform } from '../platform/index.js';
// The number sets and the gilding rule. Kept in a separate, Three-free file so
// they can be checked headlessly — see tools/check-achievements.mjs.
import {
  ACHIEVEMENT_DEFS, FAM, reverseNum, TROPHY_N,
  computeGild as gildFor, isNodeGilded as gildedByRule,
} from './achievements-data.js';

// ============================================================
// PREDICATE HELPERS
// ============================================================
const sel = () => [...(state.primes || [])].sort((a, b) => a - b);

function isExactly(...want) {
  const w = [...new Set(want.flat())].sort((a, b) => a - b);
  const s = sel();
  return s.length === w.length && s.every((v, i) => v === w[i]);
}

// Exactly two primes selected, satisfying a relation. Returns false for any
// other count, which is what makes these two-tap achievements rather than
// something you trip over with a large selection.
function pairWhere(fn) {
  const s = sel();
  if (s.length !== 2) return false;
  const [a, b] = s;
  return fn(a, b);
}

// ============================================================
// THE PREDICATES
// ============================================================
// One test per id, and nothing else. Everything else about an achievement —
// its name, its XP, what it gilds — is data and lives in achievements-data.js
// so that the design can be checked without a browser. This is the half that
// never could be: every one of these reads the live `state` singleton, the
// resolved N, or a DOM element.
//
// Signature by trigger:
//   state / derived  → ()      no argument
//   dom              → (el)    the element the gesture landed on
//   sampled          → (ctx)   the animate context
//   event            → (data)  the bus event payload
const PREDICATES = {
  fibonacci:  () => isExactly(FAM.fibPrimes),
  perfect:    () => isExactly(FAM.perfectPrimes),
  ramanujan:  () => resolveN() === 840,
  lucas:      () => isExactly(FAM.lucasPrimes),
  squares:    () => resolveN() === 961,
  emirp:      () => pairWhere((a, b) => reverseNum(a) === b),
  twinning:   () => pairWhere((a, b) => b - a === 2),
  cousins:    () => pairWhere((a, b) => b - a === 4),
  sexy:       () => pairWhere((a, b) => b - a === 6),
  germain:    () => pairWhere((a, b) => b === 2 * a + 1),
  happy:      () => isExactly(FAM.happy),
  euler:      () => isExactly(FAM.euler),

  // The only predicate whose input is the ledger rather than the app, which is
  // why it is re-tested after every unlock instead of on an app signal.
  unity:      () => countUnlocked() >= ACHIEVEMENT_DEFS.length - 1,

  first:      (el) => el.checked === true,
  louder:     () => isExactly([11]),
  rawr:       () => isExactly([17]),
  best:       () => isExactly([37, 73]),
  neat:       () => sel().length === 2 && sel().includes(89) && resolveN() >= 178,
  trek:       () => isExactly([47]),
  sixseven:   (el) => +el.dataset.prime === 67 && el.classList.contains('active'),
  smart:      () => isExactly([101]) && state.lensOpen === true,
  localhost:  () => isExactly([127]) && resolveN() === 127,

  ouch:       (d) => d?.n === 0,
  void:       () => sel().length === 0,
  'empty-set': () => sel().length === 0 && state.showZero === false && state.showOne === false,
  night:      () => state.showZero === false,
  boing:      (ctx) => Math.abs(ctx.dim - 0.0) <= 0.01,
  trippy:     () => true,
  oops:       (ctx) => countDisplaced(ctx) >= 20,
  zoomies:    () => state.shapeDriftSpeed >= 2.0,
  maximalist: (el) => +el.value >= 2500,
  ceiling:    () => resolveN() >= MAX_N,
  exhaustive: (el) => el.checked === true,
  parawhat:   () => true,
  nerd:       () => state.lensOpen === true,
  art:        () => true,
  bophades:   (el) => +el.value >= 2.0,
  nice:       () => isExactly([3, 23]),
  dude:       () => isExactly([2, 3, 5, 7]),
  // Your original criteria was "select exactly 67 and 69". 69 is not prime
  // (3 x 23), so it is not in the grid and that state is unreachable — the
  // achievement would have been unobtainable, which also breaks the hunter
  // convention the whole design is built to respect. {3, 23, 67} reaches the
  // same two nodes: 67 directly, and 69 as 3 x 23.
  meme:       () => isExactly([3, 23, 67]),
};

// DEV: a missing predicate returns false rather than throwing, so a definition
// added to the data file without a test here is inert rather than fatal. The
// headless checker fails on it, which is where that mistake should surface.
export const ACHIEVEMENTS = ACHIEVEMENT_DEFS.map(def => ({
  ...def,
  test: PREDICATES[def.id] || (() => false),
}));

export function missingPredicates() {
  return ACHIEVEMENT_DEFS.filter(d => !PREDICATES[d.id]).map(d => d.id);
}

const BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

// ============================================================
// THE LEDGER
// ============================================================
const LEDGER_KEY = 'pnm-achievements-v1';

// `on` is the master switch. Achievements are OPT-IN: nothing is recorded until
// the player turns them on, and turning them on is itself the first achievement.
// That is a deliberate design choice, not a privacy hedge — FIRST! has to be
// earnable, and it cannot be if tracking was already running.
let ledger = { unlocked: {}, counters: {}, on: false };
let ready = false;

function countUnlocked() { return Object.keys(ledger.unlocked).length; }

export function isUnlocked(id) { return !!ledger.unlocked[id]; }
export function isTracking() { return !!ledger.on; }
export function getLedger() { return { unlocked: { ...ledger.unlocked }, counters: { ...ledger.counters } }; }

function readLocal() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return (v && typeof v === 'object') ? { unlocked: v.unlocked || {}, counters: v.counters || {}, on: !!v.on } : null;
  } catch { return null; }
}

function writeLocal() {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger)); } catch {}
}

// DEV: union of unlocks, max of counters. The rule has to be commutative and
// idempotent, because it runs on every start against both the PGS list and the
// saved-game snapshot, in whatever order they resolve. An unlock is never
// withdrawn by a merge — losing an achievement because a device was offline is
// the single worst failure this system could have.
function mergeLedgers(a, b) {
  // `on` is sticky across a merge: a device that had tracking switched on is
  // the one carrying the intent, and a fresh install should inherit it.
  const out = { unlocked: { ...a.unlocked }, counters: { ...a.counters }, on: !!(a.on || b.on) };
  for (const [id, at] of Object.entries(b.unlocked || {})) {
    if (!out.unlocked[id] || at < out.unlocked[id]) out.unlocked[id] = at;
  }
  for (const [id, n] of Object.entries(b.counters || {})) {
    out.counters[id] = Math.max(out.counters[id] || 0, n);
  }
  return out;
}

async function unlock(id) {
  const a = BY_ID.get(id);
  if (!a || ledger.unlocked[id]) return false;

  ledger.unlocked[id] = new Date().toISOString();
  writeLocal();
  // Invalidate BEFORE announcing. Listeners on achievement:unlocked repaint the
  // figure and redraw the trophy list, and both ask getGild() — so emitting
  // first hands every one of them the cache computed a moment ago, without the
  // achievement that just fired. It showed up as "1 of 40 earned, 0 numbers
  // gilded" and would have shown up on the figure as gilding that lagged one
  // unlock behind.
  invalidateGild();
  emit('achievement:unlocked', { id, name: a.name, subtitle: a.subtitle, xp: a.xp });

  // Fire and forget. A failure to reach Play Games must not roll back the local
  // ledger — reconciliation on the next start will push it again, and unlocks
  // are idempotent, so replaying costs nothing.
  platform.achievements.unlock(id).catch(() => {});
  platform.saves.write(ledger).catch(() => {});

  // UNITY! is the only achievement whose input is the ledger, so it is the only
  // one that has to be re-tested here rather than on an app signal.
  const u = BY_ID.get('unity');
  if (u && id !== 'unity' && !ledger.unlocked.unity && u.test()) await unlock('unity');
  return true;
}

// ============================================================
// GILDING
// ============================================================
// The rule itself lives in achievements-data.js and is pure. This half owns
// only the part that depends on the ledger: which primes and nodes the player
// currently owns, and a cache so a render pass can ask about a thousand nodes
// without recomputing that set a thousand times.
let gildCache = null;
function invalidateGild() { gildCache = null; }

// Which achievements are switched ON for display. Defaults to everything the
// player has unlocked; the trophy room narrows it so the player can mix and
// match, which is why the rule takes an enabled set rather than reading the
// ledger itself. Passing null restores the default.
let enabledOverride = null;

export function setEnabled(ids) {
  enabledOverride = ids ? new Set(ids) : null;
  invalidateGild();
  emit('achievements:gildChanged', { enabled: [...getEnabled()] });
}

export function getEnabled() {
  return enabledOverride ?? new Set(Object.keys(ledger.unlocked));
}

export function getGild() { return (gildCache ??= gildFor(getEnabled())); }
export function isPrimeGilded(p) { return getGild().ownedPrimes.has(p); }
export function isNodeGilded(n) { return gildedByRule(n, getGild()); }

// ============================================================
// TRIGGERS
// ============================================================
// DEV: THE MOST IMPORTANT FUNCTION IN THIS FILE.
//
// event.isTrusted is true only for events the browser generated from a real
// user gesture. Anything produced by dispatchEvent() is false. That single
// property is what makes the "manually" achievements mean what they say:
//
//   - Dazzle sets about forty control values by direct assignment, and a
//     programmatic .value or .checked assignment fires nothing at all, so those
//     are invisible here for free.
//   - The module-cap machinery in core/panel.js (lines ~469, ~489, ~494) DOES
//     synthesise change and input events when physics is disabled above
//     N = 1000. Those are the only synthetic events in the codebase, and
//     without this guard the app would hand out achievements to itself every
//     time someone dragged N past a thousand.
//
// If a future control ever needs to fire a synthetic event that SHOULD count,
// it has to call the ledger directly rather than dispatching.
function onTrusted(selector, events, fn) {
  for (const ev of events.split(' ')) {
    document.addEventListener(ev, (e) => {
      if (!e.isTrusted) return;
      const el = e.target?.closest?.(selector);
      if (!el) return;
      fn(el, e);
    }, true);
  }
}

// DEV: THE SECOND TRAP, and it cost a test run to find.
//
// `stateChange` is NOT a reliable signal that state changed. core/renderer.js
// update() emits it, but core/panel.js does not go through update(): its
// scheduleRebuild() assigns about fifteen keys onto the `state` singleton
// directly and then calls buildScene() itself. So selecting primes, moving N,
// flipping any filter — the source of nearly every achievement condition in
// this file — fires NO event at all. Verified in a browser: choosing exactly
// {11} produced state.primes === [11], one `build` event, and zero
// `stateChange` events.
//
// docs/ANDROID-BUILD.md §3 says the ledger can just listen to the events the
// app already emits. That is not true, and this is the deeper half of why.
//
// So the sweep runs from three places, and the third is the one that actually
// matters:
//   stateChange — the hot paths that DO go through update(): the transport's
//                 speed, the divergence angle, paused.
//   build       — every panel-driven change, since scheduleRebuild() always
//                 ends in buildScene().
//   the sampler — a 5 Hz backstop in animate(). This is what makes the ledger
//                 robust against any future code path that writes state
//                 directly, rather than needing every writer to remember to
//                 announce itself. Forty cheap predicates five times a second
//                 is nothing next to a render frame.
function sweepState() {
  if (!ready || !ledger.on) return;
  for (const a of ACHIEVEMENTS) {
    if (a.trigger !== 'state' || ledger.unlocked[a.id]) continue;
    let hit = false;
    try { hit = !!a.test(); } catch (e) { console.error(`[PNM] Achievement "${a.id}" predicate threw:`, e); }
    if (hit) unlock(a.id);
  }
}

// ---- sampled predicates ----
const SAMPLE_HZ = 5;
let sampleAcc = 0;
const _scratch = new THREE.Vector3();

// OOPS!. Counts nodes further than twice their rest distance from the Sun.
// lengthSq throughout, so no square roots: comparing d^2 > 4 * r^2 is the same
// test as d > 2r and costs two multiplications instead of two square roots.
function countDisplaced(ctx) {
  const nodes = ctx?.nodes;
  if (!nodes || !nodes.length) return 0;
  const N = ctx.N, dim = ctx.dim;
  let count = 0;
  for (const nd of nodes) {
    const mesh = nd.mesh;
    if (!mesh) continue;
    interpolatedPos(nd.n, N, dim, _scratch);
    const rest2 = _scratch.lengthSq();
    if (rest2 < 1e-6) continue;                    // the Sun, and anything at the origin
    if (mesh.position.lengthSq() > 4 * rest2) count++;
    if (count >= 20) return count;                 // nothing above the threshold matters
  }
  return count;
}



// ============================================================
// THE DING
// ============================================================
// Synthesised, not sampled. No audio file means no asset, no licence, no bytes
// in the APK, and — the part that matters here — no CSP allowance: Web Audio is
// computation, not a resource load, so it needs nothing added to a policy this
// project is careful about. It also matches how the rest of the codebase
// behaves, computing the golden angle and the number sequences rather than
// shipping literals of them.
//
// EDU: the three notes are tuned 4 : 5 : 6, which is a major chord in JUST
// INTONATION — the tuning where every interval is a ratio of small whole
// numbers. That is not decoration in an app about factorisation: the primes 2,
// 3 and 5 are exactly what those ratios are built from, and tuning that admits
// no prime above 5 has a name, 5-limit. A number's factorisation and a chord
// are the same kind of object. Colour is factorisation here; so is this sound.
let audioCtx = null;
let soundOn = true;

// An AudioContext cannot start without a user gesture, so it is created lazily
// on the first one and reused. The master toggle is itself a tap, which means
// the context is always live by the time any achievement can fire.
function ensureAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    audioCtx = new C();
  } catch { audioCtx = null; }
  return audioCtx;
}

export function setSound(on) { soundOn = !!on; if (on) ensureAudio(); }
export function isSoundOn() { return soundOn; }

function ding() {
  if (!soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const base = 523.25;                      // C5
  const ratios = [1, 5 / 4, 3 / 2];         // 4:5:6 — the just major triad
  const now = ctx.currentTime;
  ratios.forEach((r, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Triangle rather than sine: a sine alone is so pure it reads as a test
    // tone. A triangle has odd harmonics that fall off fast, which is about as
    // close to "bell" as one oscillator gets.
    osc.type = 'triangle';
    osc.frequency.value = base * r;
    const t = now + i * 0.055;              // a quick roll, not a block chord
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.11, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.9);
  });
}

// ============================================================
// THE TOAST
// ============================================================
// A QUEUE, not a single slot, and that is not defensive coding — achievements
// genuinely arrive in batches. Selecting {37, 73} fires BEST! and EMIRP!
// together; {5, 11} fires GERMAIN! and SEXY!. A single element that got
// overwritten would silently drop half of everything the player earned.
const toastQueue = [];
let toastShowing = false;
let toastEl = null;

function ensureToastEl() {
  if (toastEl) return toastEl;
  toastEl = document.createElement('div');
  toastEl.id = 'ach-toast';
  toastEl.setAttribute('role', 'status');       // announced without stealing focus
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  return toastEl;
}

function showNext() {
  if (toastShowing || !toastQueue.length) return;
  const a = toastQueue.shift();
  toastShowing = true;

  const el = ensureToastEl();
  el.innerHTML =
    `<div class="ach-toast-kicker">Achievement</div>` +
    `<div class="ach-toast-name">${a.name}</div>` +
    `<div class="ach-toast-sub">${a.subtitle}</div>`;

  // prefersReducedMotion is already worked out in core/state.js, so honour it
  // rather than asking again. The toast still appears — it just fades instead
  // of travelling, which is what that preference actually asks for.
  el.classList.toggle('no-motion', prefersReducedMotion);
  void el.offsetWidth;                          // restart the transition
  el.classList.add('visible');
  ding();

  const dwell = toastQueue.length ? 1500 : 2600; // hurry up if more are waiting
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => { toastShowing = false; showNext(); }, 260);
  }, dwell);
}

function queueToast(a) {
  toastQueue.push(a);
  showNext();
}

// ============================================================
// GILDING THE FIGURE
// ============================================================
// DEV: this lives here, not in core/renderer.js, and that is the point. The
// architecture claim is that nothing else in the app knows an achievement
// exists, and a `if (isGilded(n))` branch inside buildScene() would end it.
// Instead the module takes the nodes it is handed in build() and repaints the
// ones it cares about. The renderer stays ignorant.
//
// Each node's original colour is stashed on first touch so the view can be
// switched off without a rebuild. `nd.moduleData` exists for exactly this.
const GOLD = { r: 1.0, g: 0.78, b: 0.28 };
const DIM = 0.16;   // what a non-gilded node fades to while the view is on

let nodesRef = [];

function stash(nd) {
  if (nd.moduleData.achStash) return nd.moduleData.achStash;
  const m = nd.mesh?.material;
  nd.moduleData.achStash = {
    color: nd.baseColor ? nd.baseColor.clone() : null,
    emissive: m?.emissive ? m.emissive.clone() : null,
    emissiveIntensity: m?.emissiveIntensity ?? 0,
  };
  return nd.moduleData.achStash;
}

// Dakota's brief: "all gold nodes and lines should be fully overpowering when
// in that mode." So gilded nodes are not merely tinted — they are pushed to a
// flat gold and given emissive of their own, and everything else is dropped
// most of the way to black so the gold is the only thing left in the picture.
function paintGilding(on) {
  for (const nd of nodesRef) {
    const mesh = nd.mesh;
    if (!mesh || !mesh.material) continue;
    const orig = stash(nd);
    if (nd.n === 0) continue;                    // the Sun is never repainted

    if (!on) {
      if (orig.color) { mesh.material.color.copy(orig.color); nd.baseColor?.copy(orig.color); }
      if (orig.emissive) mesh.material.emissive.copy(orig.emissive);
      mesh.material.emissiveIntensity = orig.emissiveIntensity;
      continue;
    }

    if (isNodeGilded(nd.n)) {
      mesh.material.color.setRGB(GOLD.r, GOLD.g, GOLD.b);
      nd.baseColor?.setRGB(GOLD.r, GOLD.g, GOLD.b);
      if (mesh.material.emissive) {
        mesh.material.emissive.setRGB(GOLD.r * 0.55, GOLD.g * 0.42, GOLD.b * 0.12);
        mesh.material.emissiveIntensity = 0.85;
      }
    } else {
      const c = orig.color;
      const r = (c ? c.r : 0.2) * DIM, g = (c ? c.g : 0.2) * DIM, b = (c ? c.b : 0.2) * DIM;
      mesh.material.color.setRGB(r, g, b);
      nd.baseColor?.setRGB(r, g, b);
      if (mesh.material.emissive) {
        mesh.material.emissive.setRGB(0, 0, 0);
        mesh.material.emissiveIntensity = 0;
      }
    }
  }
}

function refreshGilding() {
  paintGilding(state._gildView === true);
}

// ============================================================
// THE TROPHY ROOM
// ============================================================
// A preset, in the same shape as Dazzle: it assigns the knobs and does not
// stash what it replaced. That is deliberate and was decided rather than
// defaulted — see docs/achievements-design.xlsx, "Trophy room" tab.
//
// N is pinned to 1000 and not to whatever the player left the slider at. Three
// reasons: it is the only N with a measured frame rate (90.6 fps with all
// integers on, on a Pixel 7); it sits exactly on the physics cap, so the
// module-cap machinery never fires its synthetic DOM events; and everyone's
// trophy room is then the same size, which is what makes two screenshots
// comparable.
function applyTrophyRoom() {
  const $ = id => document.getElementById(id);
  const setEl = (id, val, prop = 'value') => { const el = $(id); if (el) el[prop] = val; };

  setEl('auto-n', false, 'checked');
  const nIn = $('n-input');
  if (nIn) { nIn.disabled = false; nIn.value = TROPHY_N; }
  setEl('n-slider', Math.min(TROPHY_N, +($('n-slider')?.max || TROPHY_N)));
  setEl('show-all-integers', true, 'checked');
  setEl('show-curves', true, 'checked');
  setEl('line-width', 0.5);
  setEl('node-size', 0.7);
  setEl('pulse', false, 'checked');
  setEl('line-pulse', false, 'checked');
  setEl('color-drift', false, 'checked');
  setEl('angle-drift', false, 'checked');
  setEl('auto-rotate', true, 'checked');
  setEl('drift-speed', 0.15);

  // Displays next to the sliders are written by hand, exactly as Dazzle does.
  const disp = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  disp('node-size-display', '0.7');
  disp('line-width-display', '0.5');
  disp('drift-speed-display', '0.15');
  disp('n-display', String(TROPHY_N));

  // Nearly a sphere, nudged toward the disk, and held there rather than
  // morphing: the rotation is the movement in this view.
  update({
    N: TROPHY_N, showAllIntegers: true, showCurves: true, lineWidth: 0.5,
    nodeSize: 0.7, pulse: false, linePulse: false, colorDrift: false,
    angleDrift: false, autoRotate: true, driftSpeed: 0.15,
    dimension: 1.6, shapeDrift: false, _gildView: true,
  });

  const g = $('gilding-toggle'); if (g) g.checked = true;
}

// ============================================================
// THE PANEL SECTION
// ============================================================
// Built by hand rather than through panel.js's `controls` array, because this
// needs real element ids (FIRST! listens on #achievements-toggle) and a list of
// forty rows, and that array renders anonymous toggles and sliders only. The
// module sets `hidden` so panel.js skips it and does not leave an empty header
// behind — which it did, and which is what an empty Achievements tab on the
// phone turned out to be.
let listEl = null;
let progressEl = null;

function buildSection() {
  const anchor = document.getElementById('reset-btn');
  if (!anchor || document.getElementById('ach-list')) return;

  const header = document.createElement('h2');
  header.className = 'section-header';
  header.id = 'section-achievements';
  header.textContent = 'Achievements';
  header.addEventListener('click', () => header.classList.toggle('open'));

  const content = document.createElement('div');
  content.className = 'section-content';

  // Master switch. Achievements are opt-in: nothing is recorded until this is
  // on, and turning it on is itself the first achievement.
  const master = document.createElement('label');
  master.className = 'toggle';
  master.innerHTML = '<input type="checkbox" id="achievements-toggle">' +
                     '<span class="toggle-track"></span>Track achievements';
  content.appendChild(master);

  progressEl = document.createElement('div');
  progressEl.id = 'ach-progress';
  content.appendChild(progressEl);

  const gild = document.createElement('label');
  gild.className = 'toggle';
  gild.innerHTML = '<input type="checkbox" id="gilding-toggle">' +
                   '<span class="toggle-track"></span>Show gilding';
  content.appendChild(gild);

  const snd = document.createElement('label');
  snd.className = 'toggle';
  snd.innerHTML = '<input type="checkbox" id="ach-sound-toggle" checked>' +
                  '<span class="toggle-track"></span>Sound';
  content.appendChild(snd);

  // No "Trophy room" button here: the cup in the corner is that control, and
  // duplicating it in the panel would be two things doing one job.

  listEl = document.createElement('div');
  listEl.id = 'ach-list';
  content.appendChild(listEl);

  anchor.parentNode.insertBefore(header, anchor);
  anchor.parentNode.insertBefore(content, anchor);

  // ---- wiring ----
  const masterCb = master.querySelector('input');
  masterCb.checked = !!ledger.on;
  masterCb.addEventListener('change', () => {
    ledger.on = masterCb.checked;
    writeLocal();
    if (ledger.on) sweepState();
    renderList();
  });

  const sndCb = snd.querySelector('input');
  sndCb.checked = isSoundOn();
  // Reading the checkbox on a real tap also gives the AudioContext the user
  // gesture it needs to start, so switching sound on is itself the unlock.
  sndCb.addEventListener('change', () => setSound(sndCb.checked));

  const gildCb = gild.querySelector('input');
  gildCb.checked = state._gildView === true;
  gildCb.addEventListener('change', () => update({ _gildView: gildCb.checked }));

  renderList();
}

function renderList() {
  if (!listEl) return;
  const enabled = getEnabled();
  const earned = countUnlocked();
  const gilt = getGild().litNodes.size;
  if (progressEl) {
    progressEl.textContent = ledger.on
      ? `${earned} of ${ACHIEVEMENTS.length} earned · ${gilt} ${gilt === 1 ? 'number' : 'numbers'} gilded`
      : 'Not tracking. Switch on to start.';
  }

  listEl.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const got = !!ledger.unlocked[a.id];
    const row = document.createElement('div');
    row.className = 'ach-row ' + (got ? 'earned' : 'locked');

    // The checkbox is the mix-and-match control: it decides whether this
    // achievement's gilding is SHOWN, not whether it is earned. Locked rows
    // have nothing to show, so theirs is disabled.
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = got && enabled.has(a.id);
    cb.disabled = !got;
    cb.addEventListener('change', () => {
      const next = new Set(getEnabled());
      cb.checked ? next.add(a.id) : next.delete(a.id);
      setEnabled(next);
      refreshGilding();
      renderList();
    });

    const text = document.createElement('div');
    text.className = 'ach-text';
    // Two layers per row. What shows by DEFAULT: the subtitle once earned, the
    // hint while locked. What shows when TAPPED: the blurb, and only once
    // earned — the explanation is part of the reward.
    //
    // DEV: `criteria` is never rendered anywhere in this list. It is the exact
    // instruction, and the mystery is the point. It stays on the definitions
    // because the Play Console requires a description per achievement; do not
    // tidy it away on the grounds that nothing displays it.
    text.innerHTML =
      `<div class="ach-name">${a.name}</div>` +
      (got ? `<div class="ach-sub">${a.subtitle}</div>`
           : `<div class="ach-hint">${a.hint}</div>`) +
      (got && a.blurb ? `<div class="ach-blurb">${a.blurb}</div>` : '');

    if (got && a.blurb) {
      row.classList.add('expandable');
      row.addEventListener('click', (e) => {
        // The checkbox is a control in its own right and must not double as a
        // disclosure toggle.
        if (e.target.tagName === 'INPUT') return;
        row.classList.toggle('open');
      });
    }

    row.appendChild(cb);
    row.appendChild(text);
    listEl.appendChild(row);
  }

  const btn = document.getElementById('achievements-btn');
  if (btn) btn.classList.toggle('has-progress', earned > 0);
}

// ============================================================
// MODULE
// ============================================================
const mod = {
  name: 'achievements',
  label: 'Achievements',
  enabled: true,
  // panel.js builds a section for every registered module unless it opts out,
  // and it renders `controls` only. This module needs real element ids and a
  // forty-row list, so it builds its own section in buildSection() and opts out
  // here. Without the opt-out panel.js produced an "Achievements" header with
  // nothing underneath it — which is exactly what an empty tab on the phone was.
  hidden: true,
  controls: [],

  // Every rebuild hands over a fresh set of meshes, so the gilding has to be
  // repainted onto them. Cheap: one material touch per node, only when the view
  // is on.
  build(ctx) {
    nodesRef = ctx.nodes || [];
    refreshGilding();
  },

  animate(ctx) {
    if (!ready || !ledger.on) return;
    sampleAcc += ctx.dt || 0;
    if (sampleAcc < 1 / SAMPLE_HZ) return;
    sampleAcc = 0;

    // The backstop. See the long note on sweepState(): the panel writes state
    // without emitting anything, so polling is the only signal that cannot be
    // forgotten by a future writer.
    sweepState();

    for (const a of ACHIEVEMENTS) {
      if (a.trigger !== 'sampled' || ledger.unlocked[a.id]) continue;
      let hit = false;
      try { hit = !!a.test(ctx); } catch (e) { console.error(`[PNM] Achievement "${a.id}" sampler threw:`, e); }
      if (hit) unlock(a.id);
    }
  },
};

export function register() {
  registerModule('achievements', mod);

  // ---- state predicates ----
  // Both events, for responsiveness; the 5 Hz sampler in animate() is what
  // makes this correct rather than merely prompt.
  on('stateChange', sweepState);
  on('build', sweepState);

  // The gilding view is a HOT key, so it never reaches buildScene(). Repainting
  // is this module's job — see the note beside _gildView in core/state.js.
  on('stateChange', ({ key }) => { if (key === '_gildView') refreshGilding(); });
  on('achievement:unlocked', (a) => { queueToast(a); refreshGilding(); renderList(); });

  // ---- bus-event predicates ----
  for (const a of ACHIEVEMENTS) {
    if (a.trigger !== 'event' || !a.busEvent) continue;
    on(a.busEvent, (d) => {
      if (!ready || !ledger.on || ledger.unlocked[a.id]) return;
      let hit = false;
      try { hit = !!a.test(d); } catch (e) { console.error(`[PNM] Achievement "${a.id}" handler threw:`, e); }
      if (hit) unlock(a.id);
    });
  }

  // ---- DOM predicates ----
  // Deferred to panelReady: the panel builds its controls at init, so binding
  // before then would find nothing. Bound on document with capture, so the
  // handlers survive the panel rebuilding a control.
  on('panelReady', () => {
    buildSection();

    // The corner button IS the trophy room, in the same sense that #dazzle-btn
    // is Dazzle: one tap, the whole figure changes. It sits beside Reset and
    // Dazzle because it is the same kind of control, and it is destructive in
    // the same way — it assigns the knobs and does not stash what it replaced.
    //
    // It also opens the panel onto the achievements section, because the list
    // is the other half of the view: the per-achievement checkboxes are what
    // let you mix and match what the gold is showing. The section stays
    // reachable by scrolling the panel normally, so checking progress without
    // disturbing your figure is still possible — you just do not use the cup.
    const btn = document.getElementById('achievements-btn');
    btn?.addEventListener('click', () => {
      applyTrophyRoom();
      renderList();
      document.getElementById('panel')?.classList.remove('collapsed');
      const h = document.getElementById('section-achievements');
      h?.classList.add('open');
      h?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    for (const a of ACHIEVEMENTS) {
      if (a.trigger !== 'dom' || !a.dom) continue;
      onTrusted(a.dom.selector, a.dom.event, (el) => {
        // FIRST! is the exception, and has to be: its trigger IS the master
        // switch, so gating it on the switch would make it unearnable.
        if (!ready || ledger.unlocked[a.id]) return;
        if (!ledger.on && a.id !== 'first') return;
        let hit = false;
        try { hit = !!a.test(el); } catch (e) { console.error(`[PNM] Achievement "${a.id}" DOM predicate threw:`, e); }
        if (hit) unlock(a.id);
      });
    }
  });

  // ---- start ----
  bootstrap();
}

// Reconciliation. Local ledger first, then the saved-game snapshot (which is
// how a fresh install on a second device recovers), then the platform's own
// unlocked list. Everything is merged rather than chosen between, and anything
// the platform lacks is pushed back to it. Unlocks are idempotent, so replaying
// the whole ledger every start is both safe and the cheapest way to make every
// reinstall and cross-device case fall out for nothing.
async function bootstrap() {
  ledger = readLocal() || { unlocked: {}, counters: {}, on: false };

  try {
    const snapshot = await platform.saves.read();
    if (snapshot) ledger = mergeLedgers(ledger, snapshot);
  } catch (e) { console.warn('[PNM] Saved-game read failed:', e); }

  try {
    const remote = await platform.achievements.loadUnlocked();
    if (remote && remote.size) {
      const asLedger = { unlocked: {}, counters: {}, on: true };
      const now = new Date().toISOString();
      for (const id of remote) if (BY_ID.has(id)) asLedger.unlocked[id] = now;
      ledger = mergeLedgers(ledger, asLedger);
    }
    for (const id of Object.keys(ledger.unlocked)) {
      if (!remote || !remote.has(id)) platform.achievements.unlock(id).catch(() => {});
    }
  } catch (e) { console.warn('[PNM] Achievement reconciliation failed:', e); }

  writeLocal();
  invalidateGild();
  ready = true;

  emit('achievements:ready', {
    unlocked: countUnlocked(),
    total: ACHIEVEMENTS.length,
    native: platform.isNative,
  });

  // The app has been running while this resolved, so anything already true —
  // a restored config, reduced motion having switched the morph off — is
  // caught now rather than waiting for the next state change.
  sweepState();
}

// DEV: development helper, deliberately exported rather than left on window.
// The trophy room will need a reset; until it exists this is how you test that
// unlocks actually persist and survive a reload.
export function resetLedger() {
  ledger = { unlocked: {}, counters: {}, on: ledger.on };
  writeLocal();
  invalidateGild();
  emit('achievements:ready', { unlocked: 0, total: ACHIEVEMENTS.length, native: platform.isNative });
}
