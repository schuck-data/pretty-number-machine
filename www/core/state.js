// PNM — State + Event Bus + Module Registry

// DEV: the one import this module has, and it is a value not a behaviour.
// math.js depends on nothing, so this cannot create a cycle. The alternative
// was writing 2.39996... into DEFAULT_CONFIG as a literal, which would have put
// a second, silently-drifting copy of the golden angle in the codebase.
import { GOLDEN_ANGLE } from './math.js';

// ============================================================
// EVENT BUS
// ============================================================
const listeners = {};

export function on(event, fn) {
  (listeners[event] ??= []).push(fn);
}

export function off(event, fn) {
  listeners[event] = (listeners[event] || []).filter(f => f !== fn);
}

export function emit(event, data) {
  for (const fn of listeners[event] || []) {
    try { fn(data); } catch (e) { console.error(`[PNM] Event "${event}" handler error:`, e); }
  }
}

// ============================================================
// MODULE REGISTRY
// ============================================================
const modules = new Map();

export function registerModule(name, mod) {
  mod._crashed = false;
  modules.set(name, mod);
}

export function getModules() {
  return modules;
}

// ============================================================
// STATE
// ============================================================
// N ceilings. Single source of truth — these used to be three unrelated
// literals in two files plus a dead `maxN: 50000` in DEFAULT_CONFIG that
// nothing ever read.
//
// MAX_N and SLIDER_MAX_N differ on purpose: a slider spanning 1..10000 has
// useless precision down where the interesting structure is, so the slider
// covers the common range and the number field goes further.
export const MAX_N = 10000;        // hard ceiling, the number field
export const SLIDER_MAX_N = 2500;  // slider range
export const AUTO_N_MAX = 500;     // cap when N is derived from the primes

export const DEFAULT_CONFIG = {
  primes: [2, 3, 5],
  N: null,
  // 0.5 is 'String' — a vertical line of nodes at the centre. See the morph
  // order at the bottom of core/positions.js, which is the only place these
  // values are decided.
  //
  // It opens here rather than at the end of the travel on purpose: String sits
  // one step in from the bottom, so the first movement climbs through Chord and
  // Sphere to Disk, and a viewer sees a line open into a tube, close into a
  // sphere, and flatten into the spiral. Starting at either extreme would spend
  // the first half of the cycle travelling away from that.
  //
  // DEV: a literal, and it has to be — importing positions.js here to ask the
  // registry would pull Three.js into a module that is deliberately free of it.
  // If the order at the bottom of positions.js changes, this changes with it.
  dimension: 0.5,
  // Cyberpunk, chosen as the DEFAULT on 2026-08-25 -- and it is colourblind-safe
  // by measurement, not by intention: tools/check.mjs holds it to 16.9 dE under
  // simulated protanopia, deuteranopia and tritanopia, with 34 degrees between
  // its closest hues. Okabe-Ito, the published reference, is one option away. Additive RGB is still the scheme that makes the app's central
  // claim literally true -- 2 red plus 3 green really is 6 yellow -- and it is
  // one option away. But the first thing a new player sees should be legible to
  // the most people, and this palette is designed for exactly that. The three
  // markup places that must agree are DEFAULT_CONFIG here, the `selected`
  // attribute in index.html, and Reset in panel.js.
  colorScheme: 'cyberpunk',
  nodeSize: 1.0,
  lineWidth: 2,
  showNodes: true,
  showCurves: true,
  showAllIntegers: false,
  showZero: true,
  showOne: true,
  showPrimes: true,
  showPowers: true,
  showComposites: true,
  primeGlow: true,
  primeGlowIntensity: 0.3,
  zeroGlow: true,
  // 25% down from the original 1.5, snapped to the slider's 0.1 step. The sun
  // was washing out the low-numbered nodes sitting nearest to it.
  zeroGlowIntensity: 1.1,
  pulse: false,
  linePulse: false,
  pulseSpeed: 1.0,
  // Morphing is now the app's resting state rather than an opt-in toggle —
  // the transport's play/pause governs motion via `paused`. Kept as a key
  // because the render loop still gates on it.
  shapeDrift: true,
  // 0.1 originally, then 0.12, now 15% above that again. The dwell at each
  // keyframe is a fixed timer in the render loop (`DWELL_SECONDS`, currently
  // 3s), independent of this, so the morph travels faster between shapes while
  // still lingering on each one for the same beat. The two knobs are separate
  // on purpose: speed is how it moves, dwell is how long you get to read it.
  // `SPEED_DEFAULT` in core/transport.js must match — it is the hinge the
  // handle's speed mapping is centred on, so a mismatch puts the handle at the
  // wrong height for the speed actually in force.
  shapeDriftSpeed: 0.138,
  colorDrift: false,
  colorDriftSpeed: 1.0,

  // ---- Constants ----
  // EDU: the divergence angle — the angle between consecutive nodes as the
  // spiral is laid out. See the long note at the top of core/positions.js for
  // why the golden angle is the special value and not merely a pretty one.
  //
  // DEV: stored in RADIANS, because every consumer feeds it straight to
  // Math.cos/Math.sin. The panel converts to degrees for display only —
  // 137.5° is a number a person can hold, 2.39996 is not.
  //
  // DEV: this defaults to GOLDEN_ANGLE and does NOT drift. That is deliberate
  // and is the whole design of the Constants section: the figure you see on
  // load is the correct one, and every other angle is something the user chose
  // to go and look at. Contrast shapeDrift, which is on by default.
  divergenceAngle: GOLDEN_ANGLE,
  // Sweeps the angle automatically. Off by default: see above, and see the
  // reduced-motion note below — this is a large continuous movement and it is
  // stood down along with the others when the OS asks.
  angleDrift: false,
  angleDriftSpeed: 1.0,

  // Gilding: whether earned achievements paint their numbers gold. Off by
  // default — it is a lens over the figure, not the figure.
  _gildView: false,

  // Whether the purchased ads are allowed to interrupt. Off by default and it
  // must stay that way: the ads are a thing you go and look at, and a toy that
  // interrupts you without being asked is a worse toy. modules/ads.js owns it,
  // and it is only reachable from inside a slideshow you have paid for.
  adsIntrude: false,

  autoRotate: true,
  driftSpeed: 0.3,
  sceneBackground: 0x0c0c0f,
  // Only read when backgroundStyle === 'custom'. Kept as a CSS hex string
  // because that is what the <input type=color> gives and what the viewport
  // wants -- converting twice would be the only reason to store a number.
  backgroundColor: '#0c0c0f',
  // Navy, paired with the cyberpunk default: the palette is built of neons and
  // neon wants a ground with some colour in it. Black is one option away.
  backgroundStyle: 'navy',
  onStateChange: null,
};

// ============================================================
// REDUCED MOTION
// ============================================================
// This app is motion from the moment it loads: the figure morphs continuously
// between six arrangements and the camera orbits the whole time. For someone
// with a vestibular disorder that is not a stylistic flourish, it is a reason
// to close the app — and on an app store listing, an accessibility complaint.
//
// So the OS-level preference changes what the app does, rather than being
// detected and ignored. Two settings are stood down:
//
//   shapeDrift — the continuous morph, the largest movement on screen
//   autoRotate — the constant camera orbit
//   angleDrift — the divergence sweep, which moves every node at once
//
// The pulses and colour drift already default to off, so they need no help.
// Nothing is removed: every control stays exactly where it was, and a person
// who wants the motion can switch it on. This changes the default, not the
// capability.
//
// Applied to DEFAULT_CONFIG rather than to `state`, so that Reset honours the
// preference too. A Reset that switched the morph back on would hand the motion
// straight back to the person who asked the operating system not to have it.
//
// Guarded because matchMedia is absent in some non-browser contexts, and this
// module is otherwise environment-free.
export const prefersReducedMotion =
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  DEFAULT_CONFIG.shapeDrift = false;
  DEFAULT_CONFIG.autoRotate = false;
  // Already false, and set again anyway. If the default ever changes, this line
  // is what keeps the preference honoured; relying on the two agreeing is
  // exactly how the other two settings got missed the first time.
  DEFAULT_CONFIG.angleDrift = false;
}

// Hot properties: can be changed without full rebuild
export const HOT_KEYS = new Set([
  'dimension', 'shapeDrift', 'shapeDriftSpeed', 'autoRotate', 'driftSpeed', 'lineWidth', 'pulse', 'linePulse', 'pulseSpeed', 'colorDrift', 'colorDriftSpeed',
  // The Constants section. `divergenceAngle` is hot in the sense that matters
  // here — it must not trigger buildScene(), which disposes and recreates every
  // mesh in the scene and would make the slider unusable at any N worth looking
  // at. It is NOT free, though: it invalidates the precomputed parastichy curve
  // arrays. renderer.js watches the value each frame and refreshes what needs
  // refreshing. See refreshDivergence() there — and note that putting this key
  // in the cold set instead would not be *wrong*, merely unusably slow.
  'divergenceAngle', 'angleDrift', 'angleDriftSpeed',
  // Physics' inertia slider. A module-private key, which is unusual company for
  // this set, but the alternative is worse: update() calls buildScene()
  // synchronously for any key it does not find here, so a slider dragged across
  // its range would rebuild every mesh in the scene on every input event. This
  // value only ever reaches OrbitControls.dampingFactor — no geometry depends
  // on it — so a rebuild would be pure waste even if it were affordable.
  '_physicsInertia',
  // Physics' Touch and Collision toggles. Both declare `hot: true` on the
  // control, which routes them through update() — but update() rebuilds the
  // scene for any key it does not find in THIS set, so declaring hot on the
  // control and omitting it here meant every flick of either checkbox
  // disposed and recreated every mesh in the scene. 312 ms at N=1000, on a
  // toggle you are meant to flick back and forth.
  //
  // Worse than the cost: it silently wiped physics' offsets and velocities,
  // so toggling Collision appeared to "fix" a stuck drag. It fixed nothing;
  // it rebuilt the scene. That sent a real diagnosis down a blind alley on
  // 2026-08-25. Neither toggle needs any geometry rebuilt — each sets one
  // module-local boolean in physics.js and nothing else reads it.
  '_physicsTouch', '_physicsCollision',
  // The achievements module's gilding view. Same unusual company and the same
  // reasoning as _physicsInertia above: it changes only node COLOUR, no
  // geometry depends on it, and modules/achievements.js repaints the affected
  // meshes itself when it sees the change. Routing it through buildScene()
  // would dispose and recreate every mesh in the scene to alter a tint — and
  // that is measured, not guessed: a rebuild at N=1000 costs 312 ms on a
  // Pixel 7, which is a visible stutter on a toggle you are meant to flick
  // back and forth.
  '_gildView',
  // modules/ads.js's intrusion setting. Same company and the same reasoning as
  // the two above: no geometry depends on it, the module reacts to the change
  // itself, and routing it through buildScene() would dispose and recreate a
  // thousand meshes to start a timer.
  'adsIntrude',
  // The transport's play/pause. The render loop reads it every frame; nothing
  // about the geometry changes, so rebuilding the scene on it would be an
  // expensive no-op.
  'paused',
  // The scene background. It is a CSS property on #viewport -- the scene itself
  // clears to nothing -- so no geometry depends on either of these. renderer.js
  // watches them per frame and repaints. Cold, a colour PICKER would have run
  // buildScene() on every pixel of a drag.
  'backgroundStyle', 'backgroundColor',
]);

// `paused` and `lensOpen` are runtime flags rather than saved config: both are
// published here so unrelated modules can react without importing each other.
export const state = { ...DEFAULT_CONFIG, paused: false, lensOpen: false };
