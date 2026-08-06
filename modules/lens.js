// PNM V5 — Lens Module
//
// A classroom layer you physically drag across the figure. Everything left of
// the handle is chalkboard: numbers labelled, nodes tappable for their maths.
// Everything right of it is the plain gallery view. Both at once, hard edge
// between them.
//
// The governing constraint is that the figure must never be disturbed —
// no rebuild, no pause, no flicker, smooth and visible the whole time. That
// rules out the obvious implementations and dictates these three:
//
//  1. CHALKBOARD is a DOM layer over the canvas using mix-blend-mode: lighten.
//     The app's background is near-black and its content is bright, so
//     `lighten` takes the chalkboard wherever the scene is darker than it and
//     the scene wherever it is brighter. The board replaces the background and
//     leaves every node and curve untouched, with zero involvement from the
//     renderer. Nothing is re-rendered; the morph keeps running underneath.
//
//  2. LABELS are HTML, positioned by projecting each node to screen space each
//     frame. The existing showLabels flag is not in HOT_KEYS, so toggling it
//     would rebuild the entire scene — precisely the disturbance being avoided.
//     Projection also makes clipping at the lens edge trivial and keeps the
//     text crisp instead of resampled 3D sprites.
//
//  3. TAP-FOR-INFO calls info.js's exported showInfoAt() rather than
//     reimplementing hit-testing or tooltip content. That module already
//     raycasts nodes and curves; it was simply unreachable on a phone, being
//     bound to right-click.

import * as THREE from 'three';
import { registerModule, state } from '../core/state.js';
import { showInfoAt, hideInfo } from './info.js';

// Above this many labels the view is unreadable mush and the DOM cost stops
// being worth paying. The lens degrades to chalkboard + tap-for-info, which is
// still the useful part at high N.
const MAX_LABELS = 150;

// Fraction of viewport width. 0 parks the handle at the left edge, closed.
const CLOSED = 0;
let openFraction = CLOSED;

let boardEl = null;
let labelsEl = null;
let handleEl = null;
let labelPool = [];

let cameraRef = null;
let rendererEl = null;
let nodesRef = [];

const projected = new THREE.Vector3();

const clamp01 = v => Math.min(1, Math.max(0, v));
const isOpen = () => openFraction > 0.001;

// The lens lives inside the viewport box, not the window. On desktop the
// viewport starts at the sidebar's right edge, so a window-relative handle
// would be parked underneath the panel and ungrabbable.
const viewportRect = () => rendererEl.getBoundingClientRect();
const edgeLocalPx = () => openFraction * viewportRect().width;

// === DOM ===

function buildDom() {
  // Idempotent: init() has been observed running more than once, and a second
  // pass would orphan the first set of elements under duplicate ids.
  if (boardEl && boardEl.isConnected) return;

  boardEl = document.createElement('div');
  boardEl.id = 'lens-board';

  labelsEl = document.createElement('div');
  labelsEl.id = 'lens-labels';

  handleEl = document.createElement('div');
  handleEl.id = 'lens-handle';
  handleEl.setAttribute('role', 'separator');
  handleEl.setAttribute('aria-label', 'Drag to reveal the classroom layer');
  handleEl.setAttribute('title', 'Drag right for labels and tap-for-info');
  handleEl.innerHTML = '<span id="lens-handle-grip"></span>';
  handleEl.addEventListener('pointerdown', onHandleDown);

  // Inside the viewport so all three inherit its box automatically and stay
  // correct whether the panel is a sidebar, a sheet, or dismissed.
  const host = rendererEl.parentNode;
  host.appendChild(boardEl);
  host.appendChild(labelsEl);
  host.appendChild(handleEl);
  applyOpen();
}

function applyOpen() {
  const pct = openFraction * 100;
  // clip-path rather than width: the board's texture stays put while the edge
  // moves, so it reads as a curtain being drawn rather than a stretching box.
  boardEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  boardEl.classList.toggle('open', isOpen());
  labelsEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  handleEl.style.left = `${pct}%`;
  handleEl.classList.toggle('open', isOpen());
  if (!isOpen()) hideInfo();
}

// === DRAG ===

function onHandleDown(e) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const startFraction = openFraction;
  handleEl.classList.add('dragging');

  const onMove = (ev) => {
    openFraction = clamp01(startFraction + (ev.clientX - startX) / viewportRect().width);
    applyOpen();
  };
  const onEnd = () => {
    handleEl.classList.remove('dragging');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  window.addEventListener('pointercancel', onEnd);
}

// === TAP FOR INFO (inside the lens only) ===

function onCanvasDown(e) {
  if (!mod.enabled) return;
  if (e.target !== rendererEl) return;
  if (e.button !== 0) return;             // left/primary only

  // Dismiss first, unconditionally. A sticky tooltip opts out of info.js's
  // own release-to-hide, so without this it survives every subsequent tap and
  // sits on screen forever.
  hideInfo();

  if (!isOpen()) return;
  const local = e.clientX - viewportRect().left;
  if (local > edgeLocalPx()) return;      // outside the classroom layer

  // Only swallow the event when something was actually hit, so a tap on empty
  // chalkboard still reaches OrbitControls and rotates the view as usual.
  if (showInfoAt(e.clientX, e.clientY)) e.stopPropagation();
}

// === LABELS ===

function labelAt(i) {
  if (!labelPool[i]) {
    const el = document.createElement('span');
    el.className = 'lens-label';
    labelsEl.appendChild(el);
    labelPool[i] = el;
  }
  return labelPool[i];
}

function updateLabels() {
  if (!isOpen() || !cameraRef || nodesRef.length === 0) {
    for (const el of labelPool) el.style.display = 'none';
    return;
  }

  const rect = viewportRect();
  const edge = edgeLocalPx();
  const tooMany = nodesRef.length > MAX_LABELS;
  let used = 0;

  if (!tooMany) {
    for (const nd of nodesRef) {
      if (!nd.mesh || !nd.mesh.visible) continue;
      nd.mesh.getWorldPosition(projected);
      projected.project(cameraRef);
      if (projected.z > 1) continue;                    // behind the camera
      // Local to the viewport box, because the labels live inside it.
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;
      if (x > edge) continue;                           // right of the lens
      if (y < 0 || y > rect.height) continue;

      const el = labelAt(used++);
      el.textContent = nd.n;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.display = '';
      if (used >= MAX_LABELS) break;
    }
  }

  for (let i = used; i < labelPool.length; i++) labelPool[i].style.display = 'none';
  labelsEl.classList.toggle('suppressed', tooMany);
}

// === MODULE DEFINITION ===

const mod = {
  name: 'lens',
  label: 'Lens',
  enabled: true,
  insertBefore: 'section-appearance',
  hint: 'Drag the tab on the left edge across the figure for labels and tap-for-info',
  controls: [],

  init(ctx) {
    cameraRef = ctx.camera;
    rendererEl = ctx.renderer.domElement;
    buildDom();
    rendererEl.removeEventListener('pointerdown', onCanvasDown, { capture: true });
    rendererEl.addEventListener('pointerdown', onCanvasDown, { capture: true });
  },

  build(ctx) {
    nodesRef = ctx.nodes;
    hideInfo();
  },

  animate() {
    updateLabels();
  },

  // NOT a teardown hook. cleanup() calls destroy() on every module before
  // every scene rebuild, so this runs constantly during normal use. It must
  // release per-scene state only — removing the lens DOM here deleted the
  // entire feature on the first rebuild after boot.
  destroy() {
    hideInfo();
    nodesRef = [];
    for (const el of labelPool) el.style.display = 'none';
  },

  enable() { applyOpen(); },

  disable() {
    hideInfo();
    for (const el of labelPool) el.style.display = 'none';
  },
};

export function register() {
  registerModule('lens', mod);
}
