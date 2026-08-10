// PNM V5 — Debug HUD.
//
// Off unless asked for: append ?debug to the URL.
//
// This exists because of a gap that has run the whole length of this project.
// PLAY-STORE-HANDOFF.md §8 has said "low-end Android performance is unknown and
// the Pixel 9 flatters the app" since before v1 began, and it is still true —
// there is no slow device to test on. Every performance decision in
// docs/V1-PLAN.md was therefore made on judgement.
//
// The counter does not fix that. What it fixes is what happens the FIRST time
// the app runs on a cheap phone: without it, that produces an impression, and
// impressions cannot be compared or argued with. With it, that produces
// numbers — and in particular a draw-call count, which is the exact figure the
// whole instancing question turns on.
//
// So the useful reading is not "is the FPS good". It is:
//
//   calls   — draw calls per frame. Around a thousand under Dazzle today,
//             because every node is its own mesh with its own material. If
//             instancing ever happens, this is the number that should collapse
//             to single digits, and this is how you would know it worked.
//   tris    — triangles per frame. Geometry cost, as opposed to per-object
//             overhead. If tris are high and calls are low, the fix is a
//             simpler sphere; the reverse means batching.
//   ms      — frame time. More honest than FPS, which is a reciprocal and so
//             compresses exactly the badness you care about: 60→30fps and
//             30→20fps are both "10 fps" but the first is twice the work.
//
// Deliberately dependency-free and self-contained, like notices.js, so it can
// be dropped into a build without pulling anything else in.

let el = null;
let enabled = false;

// Rolling window, so a single hitch does not dominate the reading and a single
// good frame does not hide a bad average.
const WINDOW = 60;
const frames = [];
let last = 0;
let sinceRepaint = 0;

export function isDebugEnabled() {
  try {
    const p = new URLSearchParams(location.search);
    return p.has('debug') || p.has('fps');
  } catch {
    return false;
  }
}

export function initDebugHud() {
  if (!isDebugEnabled() || el) return;
  enabled = true;

  el = document.createElement('div');
  el.id = 'pnm-debug-hud';
  // Top-left is the only free corner: the panel toggle is inset from it, the
  // corner Reset and Dazzle own the top-right, and the transport owns the
  // bottom. Pointer-events off so it can never intercept a drag.
  el.style.cssText = `
    position: fixed; z-index: 250; pointer-events: none;
    top: calc(52px + env(safe-area-inset-top));
    left: calc(12px + env(safe-area-inset-left));
    padding: 6px 9px; border-radius: 6px;
    background: rgba(12, 12, 15, 0.82);
    border: 1px solid rgba(180, 200, 210, 0.15);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px; line-height: 1.5; white-space: pre;
    color: rgba(224, 221, 213, 0.75);
  `;
  el.textContent = 'measuring…';
  document.body.appendChild(el);
  last = performance.now();
}

// Called once per frame from the render loop. Cheap when disabled: one boolean.
export function sampleDebugHud(renderer, extra) {
  if (!enabled || !el) return;

  const now = performance.now();
  const dt = now - last;
  last = now;

  // Skip the first frame after a rebuild or a tab returning to the foreground —
  // it is not a real measurement and it would poison the window.
  if (dt > 0 && dt < 500) {
    frames.push(dt);
    if (frames.length > WINDOW) frames.shift();
  }

  // Repaint at ~5Hz. Writing textContent every frame would itself become part
  // of what is being measured, which is exactly the kind of instrument that
  // lies about the thing it is instrumenting.
  sinceRepaint += dt;
  if (sinceRepaint < 200 || frames.length === 0) return;
  sinceRepaint = 0;

  const sorted = [...frames].sort((a, b) => a - b);
  const mean = frames.reduce((a, b) => a + b, 0) / frames.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];

  const info = renderer ? renderer.info : null;
  const calls = info ? info.render.calls : 0;
  const tris = info ? info.render.triangles : 0;
  const geos = info ? info.memory.geometries : 0;
  const texs = info ? info.memory.textures : 0;

  el.textContent = [
    `${(1000 / mean).toFixed(0).padStart(3)} fps   ${mean.toFixed(1)} ms  p95 ${p95.toFixed(1)}`,
    `calls ${String(calls).padStart(5)}   tris ${tris.toLocaleString()}`,
    `nodes ${String(extra?.nodes ?? 0).padStart(5)}   N ${extra?.N ?? 0}`,
    `geo   ${String(geos).padStart(5)}   tex ${texs}   dpr ${(devicePixelRatio || 1).toFixed(2)}`,
  ].join('\n');
}

export function destroyDebugHud() {
  if (el) el.remove();
  el = null;
  enabled = false;
  frames.length = 0;
}
