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
import { registerModule, state, on, emit, MAX_N } from '../core/state.js';
import { resolveN } from '../core/renderer.js';
import { interpolatedPos } from '../core/positions.js';
import { platform } from '../platform/index.js';
// The number sets and the gilding rule. Kept in a separate, Three-free file so
// they can be checked headlessly — see tools/check-achievements.mjs.
import {
  ACHIEVEMENT_DEFS, FAM, reverseNum, isNodeGilded as gildedByRule,
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

let ledger = { unlocked: {}, counters: {} };
let ready = false;

function countUnlocked() { return Object.keys(ledger.unlocked).length; }

export function isUnlocked(id) { return !!ledger.unlocked[id]; }
export function getLedger() { return { unlocked: { ...ledger.unlocked }, counters: { ...ledger.counters } }; }

function readLocal() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return (v && typeof v === 'object') ? { unlocked: v.unlocked || {}, counters: v.counters || {} } : null;
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
  const out = { unlocked: { ...a.unlocked }, counters: { ...a.counters } };
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
  emit('achievement:unlocked', { id, name: a.name, subtitle: a.subtitle, xp: a.xp });
  invalidateGild();

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

function computeGild() {
  const ownedPrimes = new Set();
  const explicitNodes = new Set();
  const multiplePrimes = new Set();
  for (const a of ACHIEVEMENTS) {
    if (!ledger.unlocked[a.id]) continue;
    for (const p of a.gildPrimes) ownedPrimes.add(p);
    for (const n of a.gildNodes) explicitNodes.add(n);
    if (a.gildRule === 'multiples') for (const p of a.gildPrimes) multiplePrimes.add(p);
  }
  return { ownedPrimes, explicitNodes, multiplePrimes };
}

export function getGild() { return (gildCache ??= computeGild()); }
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
  if (!ready) return;
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
// MODULE
// ============================================================
const mod = {
  name: 'achievements',
  label: 'Achievements',
  enabled: true,
  // No panel controls yet. The achievements tab, the gilding toggle and the
  // trophy-room preset are a separate piece of work; this module is the ledger
  // they will read from. FIRST! is wired to #achievements-toggle and simply
  // never fires until that control exists.
  controls: [],

  animate(ctx) {
    if (!ready) return;
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

  // ---- bus-event predicates ----
  for (const a of ACHIEVEMENTS) {
    if (a.trigger !== 'event' || !a.busEvent) continue;
    on(a.busEvent, (d) => {
      if (!ready || ledger.unlocked[a.id]) return;
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
    for (const a of ACHIEVEMENTS) {
      if (a.trigger !== 'dom' || !a.dom) continue;
      onTrusted(a.dom.selector, a.dom.event, (el) => {
        if (!ready || ledger.unlocked[a.id]) return;
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
  ledger = readLocal() || { unlocked: {}, counters: {} };

  try {
    const snapshot = await platform.saves.read();
    if (snapshot) ledger = mergeLedgers(ledger, snapshot);
  } catch (e) { console.warn('[PNM] Saved-game read failed:', e); }

  try {
    const remote = await platform.achievements.loadUnlocked();
    if (remote && remote.size) {
      const asLedger = { unlocked: {}, counters: {} };
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
  ledger = { unlocked: {}, counters: {} };
  writeLocal();
  invalidateGild();
  emit('achievements:ready', { unlocked: 0, total: ACHIEVEMENTS.length, native: platform.isNative });
}
