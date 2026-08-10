// PNM V5 — Position Functions + Shape Registry
import * as THREE from 'three';
import { GOLDEN_ANGLE, SPACING_2D, SPHERE_R } from './math.js';

const PHI = GOLDEN_ANGLE;

// ============================================================
// SHAPE REGISTRY
// ============================================================
const shapes = new Map();

// getShapes() used to rebuild AND re-sort this array on every call, and
// interpolatedPos() calls it once per node per frame — a thousand throwaway
// arrays and a thousand sorts per frame at N=1000, to produce an identical
// six-entry list every time. Shapes are registered once at module load and
// never change afterwards, so the work was pure waste.
//
// Cached instead, invalidated by registerShape(). This is almost certainly a
// larger saving than the Vector3 churn everyone notices first, because a sort
// allocates and compares where a Vector3 merely allocates.
//
// The cached array is returned by reference. No caller mutates it today
// (panel.js only maps over it); if one ever needs to, it must copy first.
let shapesSorted = null;

export function registerShape(dimValue, name, posFunc) {
  shapes.set(dimValue, { name, pos: posFunc });
  shapesSorted = null;
}

export function getShapes() {
  return (shapesSorted ??= [...shapes.entries()].sort((a, b) => a[0] - b[0]));
}

export function getMaxDim() {
  const sorted = getShapes();
  return sorted.length > 0 ? sorted[sorted.length - 1][0] : 1.0;
}

export function getMinDim() {
  const sorted = getShapes();
  return sorted.length > 0 ? sorted[0][0] : 0;
}

// Compute interpolated position for a node at a given dimension value.
//
// `out` is optional. Pass a Vector3 and the result is written into it instead of
// allocating; omit it and you get a fresh vector, exactly as before.
//
// It is OPT-IN rather than a shared module-level scratch, and that is not
// timidity. Several callers legitimately hold two results at once —
// physics.js compares posA against posB, restA against restB, and does
// `rest.distanceTo(interpolatedPos(...))`. A single shared scratch would make
// both sides the same object, so every one of those comparisons would silently
// become a distance from a point to itself: zero, with no error anywhere.
//
// So the hot per-node morph loop in renderer.js opts in, and everything that
// needs an independent vector simply does not.
export function interpolatedPos(n, N, dim, out) {
  const set = (v) => (out ? out.copy(v) : v);

  const sorted = getShapes();
  if (sorted.length === 0) return out ? out.set(0, 0, 0) : new THREE.Vector3();
  if (sorted.length === 1) return set(sorted[0][1].pos(n, N));

  // Clamp to registered range
  if (dim <= sorted[0][0]) return set(sorted[0][1].pos(n, N));
  if (dim >= sorted[sorted.length - 1][0]) return set(sorted[sorted.length - 1][1].pos(n, N));

  // Find bracketing shapes
  let lower = sorted[0], upper = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (dim >= sorted[i][0] && dim <= sorted[i + 1][0]) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  const t = (dim - lower[0]) / (upper[0] - lower[0]);
  const posA = lower[1].pos(n, N);
  const posB = upper[1].pos(n, N);
  // posA and posB are still allocated by the shape functions themselves. Fixing
  // that means changing the registerShape() contract, which math.js also builds
  // curves against — out of scope here, and noted in docs/V1-PLAN.md item 9.
  return out
    ? out.lerpVectors(posA, posB, t)
    : new THREE.Vector3().lerpVectors(posA, posB, t);
}



// ============================================================
// CORE SHAPES — Line, Disk, Sphere
// ============================================================
export function lineNodePos(n, N) {
  return new THREE.Vector3(SPHERE_R * (2 * n / N - 1), 0, 0);
}

export function flatPos(n) {
  if (n === 0) return new THREE.Vector3(0, 0, 0);
  const r = SPACING_2D * Math.sqrt(n);
  const theta = n * PHI;
  return new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta));
}

export function flatPolar(n) {
  if (n === 0) return [0, 0];
  const r = SPACING_2D * Math.sqrt(n);
  const theta = n * PHI;
  const x = r * Math.cos(theta), z = r * Math.sin(theta);
  return [Math.sqrt(x * x + z * z), Math.atan2(z, x)];
}

export function flatFromPolar(r, a) {
  return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a));
}

export function spherePos(n, N) {
  const z = 1 - 2 * n / N;
  const rxy = Math.sqrt(Math.max(0, 1 - z * z));
  const theta = n * PHI;
  return new THREE.Vector3(SPHERE_R * rxy * Math.cos(theta), SPHERE_R * z, SPHERE_R * rxy * Math.sin(theta));
}

export function spherePolar(n, N) {
  const z = Math.max(-1, Math.min(1, 1 - 2 * n / N));
  return [Math.acos(z), n * PHI];
}

export function sphereFromPolar(colat, lon) {
  const s = Math.sin(colat);
  return new THREE.Vector3(SPHERE_R * s * Math.cos(lon), SPHERE_R * Math.cos(colat), SPHERE_R * s * Math.sin(lon));
}

// Scaled flat position — normalizes disk radius to match SPHERE_R
export function scaledFlatPos(n, N) {
  const maxR = SPACING_2D * Math.sqrt(N);
  const scale = maxR > 0 ? SPHERE_R / maxR : 1;
  return flatPos(n).multiplyScalar(scale);
}

// --- CHORD (cylinder — flat sides, open bottom) ---
// Radius = twice the diameter of node 0 (sunR * 4).
// Node 0 stays at center (0,0,0). All others on the cylinder wall.
export function chordRadius(N) {
  const baseR = Math.max(0.03, Math.min(0.2, 3 / Math.sqrt(N)));
  const sunR = baseR * 2.5;
  return sunR * 2;
}

export function chordPos(n, N) {
  if (n === 0) return new THREE.Vector3(0, SPHERE_R, 0);
  const R = chordRadius(N);
  const theta = n * PHI;
  const y = SPHERE_R * (1 - 2 * n / N);
  return new THREE.Vector3(
    R * Math.cos(theta),
    y,
    R * Math.sin(theta)
  );
}

// Polar parameterization for Chord curves: [distance-from-top, angle]
export function chordPolar(n, N) {
  const dist = SPHERE_R * 2 * n / N;
  return [dist, n * PHI];
}

export function chordFromPolar(dist, lon, N) {
  const R = chordRadius(N);
  const y = SPHERE_R - dist;
  return new THREE.Vector3(
    R * Math.cos(lon),
    y,
    R * Math.sin(lon)
  );
}

// --- SPRING (nodes in a vertical line at chord edge, curves are spring coils) ---
// All nodes at the same angular position (node 1's angle). Same height as Line.
export function springPos(n, N) {
  if (n === 0) return new THREE.Vector3(0, SPHERE_R, 0);
  const R = chordRadius(N);
  const y = SPHERE_R * (1 - 2 * n / N);
  return new THREE.Vector3(R * Math.cos(PHI), y, R * Math.sin(PHI));
}

// --- STRING (vertical line at center — like Line but vertical) ---
export function stringPos(n, N) {
  if (n === 0) return new THREE.Vector3(0, SPHERE_R, 0);
  const y = SPHERE_R * (1 - 2 * n / N);
  return new THREE.Vector3(0, y, 0);
}

// Register core shapes
registerShape(0, 'Line', (n, N) => lineNodePos(n, N));
registerShape(0.5, 'Disk', (n, N) => scaledFlatPos(n, N));
registerShape(1.0, 'Sphere', (n, N) => spherePos(n, N));
registerShape(1.5, 'Chord', (n, N) => chordPos(n, N));
registerShape(2.0, 'Spring', (n, N) => springPos(n, N));
registerShape(2.5, 'String', (n, N) => stringPos(n, N));
