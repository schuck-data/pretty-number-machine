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
//  1. CHALKBOARD is a DOM layer BEHIND the canvas. The canvas renders with
//     alpha and #viewport paints the page colour, so the board slots between
//     the two and the figure is drawn on top of it. Still zero involvement from
//     the renderer per frame: nothing is re-rendered, the morph keeps running,
//     and only a clip-path moves as the handle is dragged.
//
//     It was a layer OVER the canvas using mix-blend-mode: lighten until
//     v0.14.3. That worked without touching the renderer at all, which is why
//     it was chosen, but lighten is a per-channel max: a slate of #1a2620
//     raised the green and blue of every node darker than itself, so deep reds
//     came out muddy teal and the figure changed colour whenever the lens was
//     open. In an app whose entire claim is that a number's colour IS its
//     factorisation, that was not a cosmetic compromise. Putting the board
//     behind the figure costs a transparent canvas and buys back the colours.
//
//  2. LABELS are HTML, positioned by projecting each node to screen space each
//     frame. The renderer used to have its own 3D sprite labels behind a
//     showLabels toggle; that toggle was not in HOT_KEYS, so using it rebuilt
//     the entire scene — precisely the disturbance being avoided — and both it
//     and the sprite path were removed in v0.14.0 once this replaced them.
//     Projection also makes clipping at the lens edge trivial and keeps the
//     text crisp instead of resampled 3D sprites.
//
//  3. TAP-FOR-INFO calls info.js's exported showInfoAt() rather than
//     reimplementing hit-testing or tooltip content. That module already
//     raycasts nodes and curves; it was simply unreachable on a phone, being
//     bound to right-click.

import * as THREE from 'three';
import { registerModule, state, on } from '../core/state.js';
import { showInfoAt, hideInfo } from './info.js';
import { primeFactorsOf, getPrimeRGB } from '../core/math.js';
import { buildRunShapes, lerpRunShapes, resolveN } from '../core/renderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// Labels used to be all-or-nothing: above 150 nodes every one of them vanished
// and the lens degraded to bare chalkboard. That cliff is gone. Labels now show
// at every N, and what keeps them readable is decluttering rather than a count.
//
// Each candidate claims a cell in a screen-space grid, and a label whose cell
// is already taken is skipped. The cell is wide and short because that is the
// shape of a number — four digits is roughly 46x14 px — so this thins out
// horizontally crowded labels hard and vertically stacked ones gently, which is
// how they actually collide. Single-cell occupancy rather than a true radius
// check: it is one Set lookup per node instead of a scan over everything
// already placed, and at N=10000 that difference is the whole frame budget.
const CELL_W = 46;
const CELL_H = 14;

// A ceiling on live label elements, not on N. The grid already bounds the count
// by screen area, so this only bites on a very large display; it exists so a
// pathological case cannot grow the DOM without limit.
const LABEL_BUDGET = 400;

// Fraction of viewport width. 0 parks the handle at the left edge, closed.
const CLOSED = 0;
let openFraction = CLOSED;

let boardEl = null;
let labelsEl = null;
let handleEl = null;
let labelPool = [];

let cameraRef = null;
let rendererEl = null;   // the canvas — event target only
let hostEl = null;       // #viewport — the box everything is measured against
let nodesRef = [];

const projected = new THREE.Vector3();

// Screen-space cells claimed by a label this frame. Reused rather than
// reallocated — this is touched every frame the lens is open.
const occupied = new Set();

const clamp01 = v => Math.min(1, Math.max(0, v));

// THE HANDLE MUST NOT REACH THE RIGHT EDGE — but the CURTAIN must.
//
// These are two different things and conflating them was the first fix's
// mistake. The board should cover the whole screen at full open; it is a
// classroom layer and half a centimetre of bare scene down one side is just a
// gap. What must stay inland is the handle, because at the edge its own width
// is the only thing left to grab, and on a phone that edge is where the
// system's back gesture lives — so the swipe meant to drag the lens shut went
// to Android instead and the lens could not be closed.
//
// So openFraction still runs the whole way to 1 and the clip-path with it. Only
// the handle's own position is held back, by a full touch target, which leaves
// a thumb's worth of it over the board with room on both sides.
const EDGE_RESERVE_PX = 48;
const isOpen = () => openFraction > 0.001;

// The lens lives inside the viewport box, not the window. On desktop the
// viewport starts at the sidebar's right edge, so a window-relative handle
// would be parked underneath the panel and ungrabbable.
//
// Measured from the viewport element, NOT from the canvas. The canvas is
// sized by the renderer and can lag its own box — it reports 0x0 until the
// first resize callback lands — and a zero width collapses every calculation
// here: the handle pins to 0 while the lens reports itself fully open.
const viewportRect = () => (hostEl || rendererEl).getBoundingClientRect();
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
  hostEl.appendChild(boardEl);
  hostEl.appendChild(labelsEl);
  hostEl.appendChild(handleEl);
  applyOpen();
}

function applyOpen() {
  const pct = openFraction * 100;
  // clip-path rather than width: the board's texture stays put while the edge
  // moves, so it reads as a curtain being drawn rather than a stretching box.
  boardEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  boardEl.classList.toggle('open', isOpen());
  labelsEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;

  // Positioned in pixels and clamped, not as a bare percentage. Centring the
  // handle on the boundary put half of it outside the viewport at 0% — a
  // 13px sliver hanging off the left edge, which is not a grabbable control.
  // It now sits just inside the boundary and stays wholly on screen at both
  // extremes.
  const w = viewportRect().width;
  const hw = handleEl.offsetWidth || 26;
  // The handle stops EDGE_RESERVE_PX short of the right edge while the curtain
  // behind it carries on to the end — see the note on EDGE_RESERVE_PX. At full
  // open the handle is therefore no longer sitting exactly on the boundary,
  // and that is the intended trade: a boundary you can see against a handle you
  // can actually grab.
  const limit = Math.max(0, w - hw - EDGE_RESERVE_PX);
  const x = Math.min(Math.max(openFraction * w, 0), limit);
  handleEl.style.left = `${x}px`;
  handleEl.classList.toggle('open', isOpen());

  // Published on state rather than reached for directly, so physics can stand
  // itself down without this module knowing physics exists. Under the
  // classroom layer a tap means "explain this number", and flinging nodes out
  // of position would contradict the labels pinned beside them.
  state.lensOpen = isOpen();

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
  let used = 0;

  occupied.clear();

  for (const nd of nodesRef) {
    if (!nd.mesh || !nd.mesh.visible) continue;

    // A decomposition silences every other label. The whole point of that mode
    // is to reduce the figure to one argument, and leaving sixty numbers
    // labelled around it puts the noise straight back — the dimming says "not
    // these" while the labels keep insisting "all of these". Only the terms of
    // the argument keep their names: the number being explained and the primes
    // that explain it, or the prime whose line is lit.
    if (labelWhitelist && !labelWhitelist.has(nd.n)) continue;

    // mesh.position, not getWorldPosition(). Nodes are added straight to the
    // scene with no parent transform, so the two are identical — but the
    // getter forces a matrix update per node, and at high N that is thousands
    // of them every frame for a value already sitting there.
    projected.copy(nd.mesh.position);
    projected.project(cameraRef);
    if (projected.z > 1) continue;                    // behind the camera

    // Local to the viewport box, because the labels live inside it.
    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;
    if (x > edge) continue;                           // right of the lens
    if (y < 0 || y > rect.height) continue;

    // Declutter: first label into a cell wins. Iteration runs in ascending n,
    // so where numbers crowd together it is the smaller one that survives —
    // which is the one a reader is more likely to be looking for.
    const cell = (Math.floor(x / CELL_W) << 16) ^ Math.floor(y / CELL_H);
    if (occupied.has(cell)) continue;
    occupied.add(cell);

    const el = labelAt(used++);
    el.textContent = nd.n;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.style.display = '';
    if (used >= LABEL_BUDGET) break;
  }

  for (let i = used; i < labelPool.length; i++) labelPool[i].style.display = 'none';
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
    hostEl = rendererEl.parentNode;
    buildDom();
    rendererEl.removeEventListener('pointerdown', onCanvasDown, { capture: true });
    rendererEl.addEventListener('pointerdown', onCanvasDown, { capture: true });
  },

  build(ctx) {
    nodesRef = ctx.nodes;
    sceneRef = ctx.scene;
    // Whatever this held was disposed with the old scene.
    clearDecomposition();
    hideInfo();
  },

  animate() {
    updateLabels();
    paintDecomposition();
  },

  // NOT a teardown hook. cleanup() calls destroy() on every module before
  // every scene rebuild, so this runs constantly during normal use. It must
  // release per-scene state only — removing the lens DOM here deleted the
  // entire feature on the first rebuild after boot.
  destroy() {
    hideInfo();
    clearDecomposition();
    nodesRef = [];
    sceneRef = null;
    for (const el of labelPool) el.style.display = 'none';
  },

  enable() { applyOpen(); },

  disable() {
    hideInfo();
    for (const el of labelPool) el.style.display = 'none';
  },
};

// ============================================================
// DECOMPOSITION — what a number is made of
// ============================================================
// Tap a node with the lens open and the figure answers the question the lens
// exists to ask: **what is this number built from?** The node lifts, every
// prime in its factorisation lifts with it, a run climbs from each prime to it
// along that prime's own parastichy family — and everything else in the scene
// steps back.
//
// The runs are the point. A prime's parastichy curve is the sequence of its
// multiples — p, 2p, 3p, … — so the stretch from p up to n IS the repeated
// addition that builds n out of p. Drawing only that stretch, rather than the
// whole family, is the difference between "here is where 7 lives" and "here is
// how 7 gets to 42".
//
// Geometry comes from renderer.js's buildRunShapes(), the same machinery the
// real curves use. The note there says why that matters.
//
// ---- WHY IT BRIGHTENS AND DIMS RATHER THAN RECOLOURING ----
//
// The first version painted the whole decomposition silver, and it threw away
// the one thing this app is FOR. Colour here is not decoration: a node's colour
// IS its factorisation, so a silver 42 has been stripped of the very fact the
// decomposition is trying to explain. Worse, it made 42 look like every other
// highlighted thing rather than like itself.
//
// So nothing is recoloured. What is in the decomposition keeps its own colour
// and gains light — pulled toward white and given a silver emissive glow — and
// everything else keeps its colour and loses light. The reading stays the same,
// the emphasis changes, and the answer to "why is 42 yellow" is still visible
// while you are being shown why.
//
// DEV: this drives node colour every frame from a stash taken on the tap, which
// means COLOUR DRIFT IS SUSPENDED while a decomposition is up. That is a real
// behaviour change and it is deliberate: drift is ambient movement, and having
// the emphasis breathe underneath a fixed explanation reads as a fault. Ends
// the moment the decomposition is cleared.
const DECOMP_LINE_WIDTH = 3.6;
const DECOMP_GLOW = 0.85;
const LIFT_TARGET = 1.75;      // scale multiplier for the tapped node
const LIFT_FACTOR = 1.4;       // ...and for each of its primes
const BRIGHTEN = 0.42;         // how far a participant is pulled toward white
const DIM = 0.22;              // what everything else is multiplied down to

let sceneRef = null;
let decompN = null;
let decompRuns = [];           // { line, run, buf }
let decompSet = null;          // every node ON the runs, endpoints included
let decompFactors = null;      // just the primes, for the extra lift
// Which numbers keep their labels while a decomposition is up. Null means "all
// of them", which is the normal state of the lens.
let labelWhitelist = null;
let nodeStash = null;          // n -> { color, emissive, intensity, scale }

function clearDecomposition() {
  for (const r of decompRuns) {
    r.line.parent?.remove(r.line);
    r.line.geometry?.dispose();
    r.line.material?.dispose();
  }
  decompRuns = [];

  // Give everything back. The renderer owns these meshes and materials; this
  // module only ever borrows their appearance and must hand it back exactly.
  if (nodeStash) {
    for (const nd of nodesRef) {
      const st = nodeStash.get(nd.n);
      const m = nd.mesh;
      if (!st || !m) continue;
      m.material?.color?.copy(st.color);
      nd.baseColor?.copy(st.color);
      if (m.material?.emissive) {
        m.material.emissive.copy(st.emissive);
        m.material.emissiveIntensity = st.intensity;
      }
      m.scale.setScalar(st.scale);
    }
  }
  nodeStash = null;
  decompSet = null;
  decompFactors = null;
  labelWhitelist = null;
  decompN = null;
}

function buildDecomposition(n) {
  // Tapping the same number again puts the figure back. The decomposition is a
  // mode you are in, so it needs a way out that is not "find some empty space".
  if (decompN === n) { clearDecomposition(); return; }

  clearDecomposition();
  if (!sceneRef || !nodesRef.length || !n || n < 2) return;

  const byN = new Map(nodesRef.map(nd => [nd.n, nd]));
  if (!byN.get(n)) return;

  // Node 0 has no factorisation and node 1 has no primes. Both fall out here
  // without a special case, because primeFactorsOf returns nothing for them.
  const factors = primeFactorsOf(n);
  if (!factors.length) return;

  decompN = n;
  decompFactors = new Set(factors);
  // The terms of the argument, and nothing else. The multiples between p and n
  // are lit because they are what the run is made of, but they are not being
  // named — naming them would put back the clutter the dimming just removed.
  labelWhitelist = new Set([n, ...factors]);
  // Every node ON the runs, not merely the endpoints. The multiples between p
  // and n are what the run is made of, so dimming them would leave a bright
  // line threaded through dark beads it is supposed to be joining.
  decompSet = new Set([n, ...factors]);
  for (const p of factors) for (let k = p; k <= n; k += p) decompSet.add(k);

  const W = rendererEl ? rendererEl.width : 800;
  const H = rendererEl ? rendererEl.height : 600;
  const primeRGB = getPrimeRGB(state.primes || [], state.colorScheme);

  for (const p of factors) {
    const run = buildRunShapes(p, n);
    if (!run) continue;
    const buf = new Float32Array(run.numPts * 3);
    lerpRunShapes(run, state.dimension, buf);

    const geo = new LineGeometry();
    geo.setPositions(buf);
    // The prime's OWN colour, brightened — not silver. A run is a statement
    // about one prime, and this figure already has a colour that means that
    // prime. Lit rather than recoloured, same rule as the nodes.
    // getPrimeRGB takes the whole selection and returns a MAP, because the
    // scheme assigns colours by POSITION in that selection — there is no such
    // thing as "the colour of 7" without knowing what else is switched on. A
    // prime that is not selected therefore has no colour in this figure at all,
    // and its run falls back to silver rather than borrowing a hue that already
    // means something else.
    const rgb = primeRGB[p] || [0.85, 0.88, 0.93];
    const col = new THREE.Color(rgb[0], rgb[1], rgb[2]).lerp(new THREE.Color(1, 1, 1), 0.45);
    const mat = new LineMaterial({
      color: col.getHex(),
      linewidth: DECOMP_LINE_WIDTH,
      worldUnits: false,
      resolution: new THREE.Vector2(W, H),
      transparent: true,
      opacity: 0.98,
      // Drawn over the figure rather than through it. The run is an explanation
      // laid on top, not another object in the scene, and one that disappears
      // behind the sphere explains nothing.
      depthTest: false,
    });
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    line.frustumCulled = false;
    line.renderOrder = 3;
    line.userData.decompRun = true;
    sceneRef.add(line);
    decompRuns.push({ line, run, buf });
  }

  // Stash EVERY node, because every node is about to be either lit or dimmed.
  // Done once, here, rather than per frame.
  nodeStash = new Map();
  for (const nd of nodesRef) {
    const m = nd.mesh;
    if (!m) continue;
    nodeStash.set(nd.n, {
      color: m.material?.color?.clone() || new THREE.Color(1, 1, 1),
      emissive: m.material?.emissive?.clone() || new THREE.Color(0, 0, 0),
      intensity: m.material?.emissiveIntensity ?? 0,
      scale: m.scale.x,
    });
  }
}

const _white = new THREE.Color(1, 1, 1);
const _tmp = new THREE.Color();

// Re-asserted every frame, and it has to be: the renderer's pulse, colour-drift
// and gilding passes all write these same properties and would win otherwise.
// Same reasoning as the achievement highlight — see modules/achievements.js.
// Module animate() runs after those passes and before render(), which is the
// one place a value like this survives.
function paintDecomposition() {
  if (!decompSet) return;
  if (!isOpen()) { clearDecomposition(); return; }

  for (const nd of nodesRef) {
    const m = nd.mesh;
    const st = nodeStash?.get(nd.n);
    if (!m || !st) continue;
    const inSet = decompSet.has(nd.n);

    if (inSet) {
      // Its own colour, lit. Never replaced.
      _tmp.copy(st.color).lerp(_white, BRIGHTEN);
      m.material?.color?.copy(_tmp);
      nd.baseColor?.copy(_tmp);
      // The endpoints of the argument — n itself and the primes that make it —
      // are lifted and glow fully. The multiples between them are on the run
      // rather than being the point of it, so they are lit but not raised.
      const isTarget = nd.n === decompN;      // never true in prime-line mode: decompN is -p
      const isFactor = decompFactors.has(nd.n);
      if (m.material?.emissive) {
        m.material.emissive.setRGB(0.72, 0.78, 0.88);   // the silver, as GLOW
        m.material.emissiveIntensity = (isTarget || isFactor) ? DECOMP_GLOW : DECOMP_GLOW * 0.3;
      }
      if (isTarget) m.scale.setScalar(st.scale * LIFT_TARGET);
      else if (isFactor) m.scale.setScalar(st.scale * LIFT_FACTOR);
      else m.scale.setScalar(st.scale);
    } else {
      // Its own colour, dimmed. Still legible, no longer competing.
      _tmp.copy(st.color).multiplyScalar(DIM);
      m.material?.color?.copy(_tmp);
      nd.baseColor?.copy(_tmp);
      if (m.material?.emissive) m.material.emissiveIntensity = st.intensity * DIM;
    }
  }

  // The other parastichy curves step back too, or the runs are lost in a web of
  // equally bright lines. The renderer rewrites every line's colour from its
  // liveColor each frame, so multiplying here cannot compound.
  sceneRef?.traverse((o) => {
    if (!o.isLine2 || o.userData.decompRun) return;
    o.material?.color?.multiplyScalar(DIM);
  });

  // The morph runs underneath this, so the runs travel with it. Only the lerp
  // happens here — the shape arrays were built once, on the tap.
  for (const r of decompRuns) {
    lerpRunShapes(r.run, state.dimension, r.buf);
    r.line.geometry.setPositions(r.buf);
  }
}

// ---- Selecting a LINE rather than a node ----------------------------------
// Tap a parastichy curve and the question changes from "what is this number
// made of" to "what does this prime touch". So the whole family lights — the
// full curve from p to the end of the figure, and every multiple of p along it
// — and everything else steps back exactly as it does for a node.
//
// The run is rebuilt from p all the way to N rather than reusing the curve that
// was tapped, for the same reason buildDecomposition does: the renderer only
// draws curves for SELECTED primes, and one code path that always works beats
// two that mostly do.
function buildPrimeHighlight(p) {
  if (decompN === -p) { clearDecomposition(); return; }   // tap again to clear
  clearDecomposition();
  if (!sceneRef || !nodesRef.length || !p) return;

  const N = resolveN();
  // Negative marks "this is a prime LINE, not a number". It feeds only the
  // toggle above and the lift test in paintDecomposition, and it keeps one
  // field doing one job rather than adding a mode flag every branch must check.
  decompN = -p;
  decompFactors = new Set([p]);
  decompSet = new Set();
  for (let k = p; k <= N; k += p) decompSet.add(k);
  // Only the prime itself is named. Its multiples are the answer, and labelling
  // all of them would be labelling most of the figure.
  labelWhitelist = new Set([p]);

  const W = rendererEl ? rendererEl.width : 800;
  const H = rendererEl ? rendererEl.height : 600;
  const primeRGB = getPrimeRGB(state.primes || [], state.colorScheme);

  const run = buildRunShapes(p, N);
  if (run) {
    const buf = new Float32Array(run.numPts * 3);
    lerpRunShapes(run, state.dimension, buf);
    const geo = new LineGeometry();
    geo.setPositions(buf);
    const rgb = primeRGB[p] || [0.85, 0.88, 0.93];
    const col = new THREE.Color(rgb[0], rgb[1], rgb[2]).lerp(new THREE.Color(1, 1, 1), 0.45);
    const mat = new LineMaterial({
      color: col.getHex(), linewidth: DECOMP_LINE_WIDTH, worldUnits: false,
      resolution: new THREE.Vector2(W, H), transparent: true, opacity: 0.98,
      depthTest: false,
    });
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    line.frustumCulled = false;
    line.renderOrder = 3;
    line.userData.decompRun = true;
    sceneRef.add(line);
    decompRuns.push({ line, run, buf });
  }

  nodeStash = new Map();
  for (const nd of nodesRef) {
    const m = nd.mesh;
    if (!m) continue;
    nodeStash.set(nd.n, {
      color: m.material?.color?.clone() || new THREE.Color(1, 1, 1),
      emissive: m.material?.emissive?.clone() || new THREE.Color(0, 0, 0),
      intensity: m.material?.emissiveIntensity ?? 0,
      scale: m.scale.x,
    });
  }
}

// The decomposition OUTLIVES THE TOOLTIP, and that separation is the point.
// They answer different questions — the tooltip is a card of arithmetic, the
// decomposition is a state the figure is in — so dismissing one must not take
// the other. You can put the card away and go on turning the figure to look at
// what it told you.
//
// Which leaves three ways out, all deliberate: tap the same node again, close
// the lens, or rebuild the scene. Notably NOT a tap on empty space, because
// that is how an orbit drag begins and losing the decomposition every time you
// went to move the figure would make it unusable.
on('info:node', ({ n }) => { if (isOpen()) buildDecomposition(n); });
on('info:curve', ({ prime }) => { if (isOpen()) buildPrimeHighlight(prime); });

export function register() {
  registerModule('lens', mod);
}
