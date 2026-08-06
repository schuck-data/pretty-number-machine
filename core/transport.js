// Transport bar — the play/pause control that doubles as the shape's playhead.
//
// Replaces the old Morph toggle and speed slider. The button is the slider
// handle: it travels the track as the shape morphs, and dragging it scrubs the
// shape by hand.
//
// Two deliberate pieces of reuse rather than reimplementation:
//
//  - Scrubbing writes to the existing #dimension slider and dispatches its
//    'input' event, so keyframe stickiness, the shape label, and the
//    pause-on-manual-change rule all come from panel.js. There is one
//    implementation of "the dimension changed", not two that can drift apart.
//  - The handle's position is read from state.dimension on a frame loop. While
//    morphing, the renderer mutates state.dimension directly without going
//    through update(), so no event is emitted and there is nothing to listen
//    to. Polling two numbers per frame is cheap and honest.

import { state } from './state.js';
import { update } from './renderer.js';
import { getMinDim, getMaxDim } from './positions.js';

// Pointer slop below which a press counts as a tap rather than a drag. Without
// it, the tremor in a real thumb-press turns every play/pause tap into a scrub.
const TAP_SLOP_PX = 4;

// Morph speed lives on the handle's vertical axis: lift it to go faster. The
// bounds are the old speed slider's, so nothing was lost when that slider was
// removed — it just moved onto the thing it controls.
const SPEED_MIN = 0.05;
const SPEED_MAX = 2.0;
const SPEED_DEFAULT = 0.1;     // must match DEFAULT_CONFIG.shapeDriftSpeed
const SPEED_TRAVEL_PX = 120;   // full range top to bottom
const SPEED_LIFT_PX = 30;      // how far the handle itself visibly moves

let track = null;
let button = null;
let readout = null;
let lastPaused = null;
let lastSpeed = null;

const clamp01 = v => Math.min(1, Math.max(0, v));

// Speed is mapped logarithmically in two halves, hinged on the default so
// that the default sits at fraction 0.5 — dead centre, which is what puts the
// button ON the track line at rest rather than slung below it. A single
// log ramp across 0.05–2.0 placed the 0.1 default at 19%, so the button
// started visibly low and looked misaligned.
function speedToFraction(speed) {
  const s = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
  return s <= SPEED_DEFAULT
    ? 0.5 * (Math.log(s / SPEED_MIN) / Math.log(SPEED_DEFAULT / SPEED_MIN))
    : 0.5 + 0.5 * (Math.log(s / SPEED_DEFAULT) / Math.log(SPEED_MAX / SPEED_DEFAULT));
}

function fractionToSpeed(f) {
  const t = clamp01(f);
  return t <= 0.5
    ? SPEED_MIN * Math.pow(SPEED_DEFAULT / SPEED_MIN, t / 0.5)
    : SPEED_DEFAULT * Math.pow(SPEED_MAX / SPEED_DEFAULT, (t - 0.5) / 0.5);
}

function fractionFromDimension(dim) {
  const lo = getMinDim(), hi = getMaxDim();
  return hi === lo ? 0 : clamp01((dim - lo) / (hi - lo));
}

function dimensionFromClientX(clientX) {
  const r = track.getBoundingClientRect();
  const lo = getMinDim(), hi = getMaxDim();
  return lo + clamp01((clientX - r.left) / r.width) * (hi - lo);
}

function renderButtonState() {
  const paused = !!state.paused;
  // The icon itself is drawn in CSS off the .paused class — see index.html.
  // Characters are not used: U+23F8 and U+25B6 have emoji presentation and
  // Android renders its own orange glyph regardless of `color`.
  button.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  button.title = paused ? 'Play — drag to scrub the shape'
                        : 'Pause — drag to scrub the shape';
  button.classList.toggle('paused', paused);
  lastPaused = paused;
}

function renderPosition() {
  button.style.left = `${fractionFromDimension(state.dimension) * 100}%`;
  // Height encodes speed: centred on the track is mid-speed, lifted is faster.
  const lift = (speedToFraction(state.shapeDriftSpeed) - 0.5) * 2 * SPEED_LIFT_PX;
  button.style.transform = `translate(-50%, calc(-50% - ${lift.toFixed(1)}px))`;
  lastSpeed = state.shapeDriftSpeed;
}

function showSpeedReadout(show) {
  readout.classList.toggle('visible', show);
  if (show) {
    readout.textContent = `${state.shapeDriftSpeed.toFixed(2)}×`;
    readout.style.left = button.style.left;
  }
}

// Route every scrub through the real dimension slider so panel.js stays the
// single owner of what a dimension change means.
function scrubTo(clientX) {
  const slider = document.getElementById('dimension');
  if (!slider) return;
  slider.value = dimensionFromClientX(clientX);
  slider.dispatchEvent(new Event('input', { bubbles: true }));
}

function onPointerDown(e) {
  e.preventDefault();
  e.stopPropagation();          // don't let OrbitControls read this as a drag
  const startX = e.clientX;
  const startY = e.clientY;
  const startSpeedFraction = speedToFraction(state.shapeDriftSpeed);
  let axis = null;   // null until the gesture commits to one, then 'x' or 'y'

  button.classList.add('dragging');

  // Listen on window rather than the button: pointer capture can fail (and
  // does for synthetic events), and a drag that outruns the handle must keep
  // working rather than silently stop.
  const onMove = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    // Lock to whichever axis the gesture commits to first, and stay locked.
    // Letting both run at once means every scrub nudges the speed and every
    // speed change nudges the shape.
    if (!axis) {
      if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) return;
      axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      button.classList.add(axis === 'x' ? 'scrubbing' : 'speeding');
      if (axis === 'y') showSpeedReadout(true);
    }

    if (axis === 'x') {
      if (!state.paused) update({ paused: true });   // scrubbing implies holding
      scrubTo(ev.clientX);
    } else {
      // Vertical only adjusts speed, and deliberately does not pause: the
      // point is to watch the morph change pace while it is still running.
      update({ shapeDriftSpeed: fractionToSpeed(startSpeedFraction - dy / SPEED_TRAVEL_PX) });
      showSpeedReadout(true);
    }
  };

  const onEnd = () => {
    if (!axis) update({ paused: !state.paused });   // a tap, not a drag
    button.classList.remove('dragging', 'scrubbing', 'speeding');
    showSpeedReadout(false);
    renderButtonState();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  window.addEventListener('pointercancel', onEnd);
}

// Pressing the bare track jumps the shape there, the way a video scrubber does.
function onTrackDown(e) {
  if (e.target === button) return;
  e.preventDefault();
  if (!state.paused) update({ paused: true });
  scrubTo(e.clientX);
  renderPosition();
  renderButtonState();
}

export function initTransport() {
  const viewport = document.getElementById('viewport');
  if (!viewport || !viewport.parentNode) return;

  const bar = document.createElement('div');
  bar.id = 'transport';

  track = document.createElement('div');
  track.id = 'transport-track';
  track.addEventListener('pointerdown', onTrackDown);

  button = document.createElement('button');
  button.id = 'transport-btn';
  button.type = 'button';
  button.addEventListener('pointerdown', onPointerDown);
  // The pointer handler owns activation; a synthesised click would double-fire.
  button.addEventListener('click', e => e.preventDefault());

  readout = document.createElement('div');
  readout.id = 'transport-readout';

  track.appendChild(button);
  track.appendChild(readout);
  bar.appendChild(track);
  viewport.parentNode.appendChild(bar);

  renderButtonState();
  renderPosition();

  // One loop covers both directions: the morph moving the handle, and anything
  // else (Reset, the panel's own dimension slider) changing paused underneath
  // us. Cheaper than wiring change events through three files.
  const tick = () => {
    // Position is always driven from state.dimension, including mid-drag:
    // dragging pauses the morph, so nothing is competing for the handle, and
    // routing it through state means keyframe stickiness visibly snaps the
    // handle instead of letting it slide free of the shape it represents.
    renderPosition();
    if (!!state.paused !== lastPaused) renderButtonState();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
