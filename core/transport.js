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

const PLAY_GLYPH = '▶';
const PAUSE_GLYPH = '⏸';

// Pointer slop below which a press counts as a tap rather than a drag. Without
// it, the tremor in a real thumb-press turns every play/pause tap into a scrub.
const TAP_SLOP_PX = 4;

let track = null;
let button = null;
let lastPaused = null;

const clamp01 = v => Math.min(1, Math.max(0, v));

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
  button.textContent = paused ? PLAY_GLYPH : PAUSE_GLYPH;
  button.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  button.title = paused ? 'Play — drag to scrub the shape'
                        : 'Pause — drag to scrub the shape';
  button.classList.toggle('paused', paused);
  lastPaused = paused;
}

function renderPosition() {
  button.style.left = `${fractionFromDimension(state.dimension) * 100}%`;
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
  let moved = false;

  button.classList.add('dragging');

  // Listen on window rather than the button: pointer capture can fail (and
  // does for synthetic events), and a drag that outruns the handle must keep
  // scrubbing rather than silently stop.
  const onMove = (ev) => {
    if (!moved && Math.abs(ev.clientX - startX) < TAP_SLOP_PX) return;
    moved = true;
    if (!state.paused) update({ paused: true });   // scrubbing implies holding
    scrubTo(ev.clientX);
  };

  const onEnd = () => {
    if (!moved) update({ paused: !state.paused });  // a tap, not a drag
    button.classList.remove('dragging');
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

  track.appendChild(button);
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
