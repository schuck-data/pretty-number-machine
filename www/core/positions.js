// PNM — Position Functions + Shape Registry
import * as THREE from 'three';
import { GOLDEN_ANGLE, SPACING_2D, SPHERE_R } from './math.js';

// ============================================================
// THE DIVERGENCE ANGLE
// ============================================================
// EDU: this single number is the whole reason the figure looks the way it does.
//
// Every arrangement here is a phyllotactic spiral: node n is placed at angle
// n·α from the origin, for one fixed angle α — the DIVERGENCE ANGLE. Nature
// uses the same rule for sunflower seeds, pinecone scales and the leaves up a
// stem, which is where the name comes from ("phyllotaxis", leaf-arrangement).
//
// EDU: what makes an α good or bad is how well it AVOIDS being a fraction of a
// full turn. If α were exactly 1/4 of a turn, then n and n+4 would land on the
// same ray, and every node would fall on one of just four spokes — enormous
// gaps between them, wasted space. Any RATIONAL fraction p/q does this: it
// produces exactly q spokes. So the question "what is the best angle" becomes
// "which irrational number is hardest to approximate by a fraction".
//
// EDU: continued fractions answer that. Every real number can be written as
//
//     x = a₀ + 1/(a₁ + 1/(a₂ + 1/(a₃ + …)))
//
// and truncating that expansion gives the best rational approximations there
// are. A LARGE term aₖ means the truncation just before it was already very
// accurate — so numbers with large terms are well approximated by simple
// fractions, and make bad angles. The number that is worst approximated is
// therefore the one whose terms are all as small as they can possibly be:
// all 1s. That number is the golden ratio φ = (1+√5)/2 = 1 + 1/(1 + 1/(1 + …)),
// which is why φ, and nothing else, sits at the centre of this subject.
//
// EDU: the angle below is the golden ratio expressed as a turn. Dividing a
// circle in the golden ratio gives a smaller arc of 2π/φ² ≈ 137.508°, and
//
//     2π/φ²  =  π(3 − √5)
//
// which is the identity used in math.js. Watch what it buys you: it is the
// packing that leaves the fewest gaps at every scale simultaneously, and the
// spiral arms your eye picks out of the result are counted by consecutive
// Fibonacci numbers — because the Fibonacci fractions 1/2, 2/3, 3/5, 5/8, 8/13
// are precisely the truncations of φ's continued fraction. The maths that
// makes the angle optimal is the same maths that makes the arms Fibonacci.
//
// DEV: this used to be `const PHI = GOLDEN_ANGLE`, frozen at module load. It is
// now settable, because the Constants panel exposes it as a slider — the point
// of that control is to let someone break the golden angle deliberately and
// watch the packing fall apart into spokes. Every position function below reads
// this variable rather than the imported constant, so one write here moves the
// entire figure.
//
// DEV: kept as a module-local with a setter rather than read from state.js on
// each call. It is read once per node per frame in the hot morph loop, this
// module has no other reason to know state exists, and a setter is one place to
// put a breakpoint. GOLDEN_ANGLE stays imported as the value to return TO.
let divergence = GOLDEN_ANGLE;

export function setDivergenceAngle(radians) {
  divergence = radians;
}

export function getDivergenceAngle() {
  return divergence;
}

// DEV: the shorthand the position functions below use. Deliberately NOT a
// `const` snapshot — it is a getter call at each use site, so a mid-frame
// change is picked up by the very next node placed.
const PHI = () => divergence;

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

// EDU: the morph. `dim` is a continuous coordinate along which the registered
// shapes sit at fixed stations (0 = Line, 0.5 = Disk, 1.0 = Sphere, …), and a
// position at any intermediate value is the straight-line blend between the two
// shapes bracketing it.
//
// EDU: note what is being interpolated — each node's position is blended
// INDEPENDENTLY, from where it sits in one arrangement to where it sits in the
// other. The figure therefore has no meaningful geometry mid-morph; it is not
// passing through a sequence of valid shapes, it is N separate points each
// travelling its own straight line. What makes it read as a coherent
// transformation rather than a scatter is that neighbouring n have similar
// positions in BOTH shapes, so their paths stay close together.
//
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
// EDU: the number line, and the only shape here with no angle in it at all —
// n maps to a position and nothing rotates. That makes it the control case: the
// parastichy curves are visible as plain arcs joining every pth node, so you can
// read the divisibility structure with no spiral to disentangle it from. Every
// other shape is this same sequence wrapped up in some way.
//
// DEV: consequently the Line arrangement is completely unaffected by the
// Constants slider. That is correct, not a bug — there is no divergence angle
// to change. See refreshDivergenceCurves() in renderer.js.
export function lineNodePos(n, N) {
  return new THREE.Vector3(SPHERE_R * (2 * n / N - 1), 0, 0);
}

// EDU: the disk — the canonical phyllotactic spiral, and the arrangement all
// the others are variations on. Two rules, and that is the entire pattern:
//
//   angle  θ = n·α        turn by the divergence angle for each new node
//   radius r = c·√n       step outward as the square root of the index
//
// The square root is forced by wanting every node to claim the same amount of
// area (see SPACING_2D in math.js). Together the two rules produce Vogel's
// model of the sunflower head, from 1979 — the same three lines of arithmetic
// that a sunflower performs with hormones.
//
// EDU: this is where the Fibonacci numbers become visible. Count the spiral
// arms curving clockwise, then anticlockwise, and you get two consecutive
// Fibonacci numbers — 21 and 34, say. Nobody put them there. They fall out
// because the best rational approximations to the golden ratio are exactly the
// ratios of consecutive Fibonacci numbers, so those are the counts at which
// nodes come nearest to lining up.
export function flatPos(n) {
  if (n === 0) return new THREE.Vector3(0, 0, 0);
  const r = SPACING_2D * Math.sqrt(n);
  const theta = n * PHI();
  return new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta));
}

export function flatPolar(n) {
  if (n === 0) return [0, 0];
  const r = SPACING_2D * Math.sqrt(n);
  const theta = n * PHI();
  const x = r * Math.cos(theta), z = r * Math.sin(theta);
  return [Math.sqrt(x * x + z * z), Math.atan2(z, x)];
}

export function flatFromPolar(r, a) {
  return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a));
}

// EDU: the Fibonacci sphere. The same angular rule as the disk, but the radial
// step is replaced by a march down the axis — and the mapping from n to height
// is the interesting part.
//
//   z = 1 − 2n/N       height, spread LINEARLY from the north pole to the south
//   r = √(1 − z²)      the radius of the circle of latitude at that height
//   θ = n·α            the same divergence angle as everywhere else
//
// EDU: spacing z linearly looks wrong at first — surely the nodes should bunch
// toward the poles where the sphere narrows? They should not, and the reason is
// Archimedes' hat-box theorem: the area of a horizontal slice of a sphere
// depends only on its THICKNESS, not on how high up it is. A band near the pole
// is narrow but steeply slanted; a band at the equator is wide but nearly
// vertical; the two effects cancel exactly. So equal steps in z really are equal
// steps in area, and the nodes come out evenly spread over the surface.
//
// EDU: this is the same design goal as the disk's √n — equal area per node —
// reaching a completely different formula because the surface is different. It
// is worth noticing that the answer here is the SIMPLER one, which is unusual.
export function spherePos(n, N) {
  const z = 1 - 2 * n / N;
  const rxy = Math.sqrt(Math.max(0, 1 - z * z));
  const theta = n * PHI();
  return new THREE.Vector3(SPHERE_R * rxy * Math.cos(theta), SPHERE_R * z, SPHERE_R * rxy * Math.sin(theta));
}

export function spherePolar(n, N) {
  const z = Math.max(-1, Math.min(1, 1 - 2 * n / N));
  return [Math.acos(z), n * PHI()];
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
  const theta = n * PHI();
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
  return [dist, n * PHI()];
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
  return new THREE.Vector3(R * Math.cos(PHI()), y, R * Math.sin(PHI()));
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
