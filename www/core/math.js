// PNM — Pure Math (no Three.js dependency)
//
// DEV: the no-Three.js rule is load-bearing. Everything here is a pure function
// of numbers, which means it can be reasoned about, tested and read without a
// renderer, a canvas or a browser. Importing Three.js here would end that.
//
// See docs/CODE-NOTES.md for what the EDU: notes below are for.

export const FIRST_PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137];

// The primes the panel actually offers, and therefore the only ones any feature
// can assume a user is able to switch on. 137 is omitted so the fully expanded
// grid ends exactly on All / None / Less instead of spilling one lone button
// onto a sixth row. FIRST_PRIMES itself stays intact — info.js derives prime
// ordinals from it by index, and truncating it would silently break the readout
// for 137.
//
// DEV: this lives here rather than in panel.js because it is no longer only the
// panel's business. modules/achievements.js reasons about which primes are
// reachable, and a second copy of `slice(0, 32)` in another file is precisely
// the kind of silently-drifting duplicate this project has been bitten by
// before. One definition, two importers.
export const SELECTABLE_PRIMES = FIRST_PRIMES.slice(0, 32);

// EDU: the golden angle, in radians. Written as π(3 − √5) rather than as a
// decimal because it is an exact algebraic expression and a decimal would be a
// rounded copy of it. The identity is worth seeing:
//
//   φ = (1 + √5)/2, the golden ratio, so φ² = φ + 1
//   dividing a full turn 2π in the ratio φ leaves a smaller arc of 2π/φ²
//   and 2π/φ² simplifies to π(3 − √5) ≈ 2.39996 rad ≈ 137.50776°
//
// Why THIS angle is the one nature converges on is explained at length in
// core/positions.js, where it is used. The short version: it is the angle least
// well approximated by any simple fraction, so consecutive nodes never fall
// into a small number of spokes, at any scale.
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.508°

// EDU: SPACING_2D is the constant c in r = c·√n, the radial law of the disk.
// The square root is not a stylistic choice — it is forced by wanting equal
// area per node. A disk of radius r has area πr², so if node n is to sit at the
// edge of a region holding n nodes of equal area, then n ∝ r², i.e. r ∝ √n.
// Any other exponent crowds the middle or the rim.
export const SPACING_2D = 0.8;
export const SPHERE_R = 5;
export const SAMPLES_PER_SEG = 40;

const HUE_SATURATION = 0.85;
const HUE_VALUE = 0.9;

export function smoothstep(t) { return t * t * (3 - 2 * t); }

// EDU: trial division, with two standard economies.
//
// First: it is enough to test divisors up to √n. If n = a·b with both factors
// above √n then a·b > n, a contradiction — so any composite must have a factor
// at or below its square root. That turns an O(n) search into O(√n).
//
// Second, the `i += 6` step. Every integer is one of 6k, 6k±1, 6k+2, 6k+3,
// 6k+4. Of those, 6k, 6k+2 and 6k+4 are even and 6k+3 is divisible by three —
// so once 2 and 3 have been ruled out by hand, every remaining candidate is of
// the form 6k±1. Stepping by six and testing i and i+2 visits exactly those and
// skips two thirds of the numbers for free.
//
// EDU: this is not a fast primality test in the research sense — Miller-Rabin
// and friends are far better for large n. It is the right one HERE because n is
// bounded by MAX_N = 10000, where √n < 100 and the loop runs at most a handful
// of times.
export function isPrimeNumber(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function isPrimePower(n) {
  if (n < 4) return false;
  for (let p = 2; p * p <= n; p++) {
    if (n % p === 0) {
      let v = n;
      while (v % p === 0) v /= p;
      return v === 1;
    }
  }
  return false;
}

// EDU: returns the DISTINCT primes dividing n — the set {2,3} for 12, not the
// multiset {2,2,3}. That is the right notion for this app: a node's colour is
// mixed from the primes that divide it, and 12 being divisible by 2 twice does
// not make it twice as red.
//
// EDU: the algorithm rests on the fundamental theorem of arithmetic — every
// integer above 1 factors into primes in exactly one way. Two consequences are
// used here without further checking. First, dividing out every copy of p
// before moving on means the next divisor found is necessarily prime: all its
// smaller prime factors have already been removed. So no primality test is
// needed inside the loop. Second, the `n > 1` at the end catches the case where
// what remains after dividing out everything below √n is itself a prime — there
// can be at most one such factor, since two of them would multiply to more
// than n.
export function primeFactorsOf(n) {
  const factors = [];
  if (n < 2) return factors;
  for (let p = 2; p * p <= n; p++) {
    if (n % p === 0) {
      factors.push(p);
      while (n % p === 0) n /= p;
    }
  }
  if (n > 1) factors.push(n);
  return factors;
}

export function shouldShowNode(n, state) {
  if (n <= 1) return true;
  if (isPrimeNumber(n)) return state.showPrimes;
  if (isPrimePower(n)) return state.showPowers;
  return state.showComposites;
}

// EDU: the visible set is the UNION of the multiples of each selected prime,
// plus 0 and 1. Choosing {2,3,5} shows every number divisible by at least one
// of them, and hides everything coprime to all three — so 7, 11, 49 and 77
// vanish while 6, 10 and 15 stay.
//
// EDU: what is left behind is worth noticing. Sieve out the multiples of the
// first k primes and the survivors are precisely the numbers the sieve of
// Eratosthenes has not yet struck out — so the gaps in this figure are, quite
// literally, where the next primes live. Adding a prime to the selection is one
// step of the sieve, watched from the outside.
//
// DEV: a Set, then sorted, because the multiples of different primes overlap —
// 6 is a multiple of both 2 and 3 and must appear once. Insertion order is
// per-prime, hence the sort.
export function getVisibleNodes(N, selectedPrimes) {
  const vis = new Set([0, 1]);
  for (const p of selectedPrimes) for (let k = 1; k * p <= N; k++) vis.add(k * p);
  return [...vis].sort((a, b) => a - b);
}

// ============================================================
// COLORS
// ============================================================
export function hueToRGB(h) {
  const s = HUE_SATURATION, v = HUE_VALUE;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v,t,p]; case 1: return [q,v,p]; case 2: return [p,v,t];
    case 3: return [p,q,v]; case 4: return [t,p,v]; case 5: return [v,p,q];
  }
}

export function getPrimeRGB(selectedPrimes, colorScheme) {
  const colors = {};
  if (colorScheme === 'none') {
    selectedPrimes.forEach(p => { colors[p] = [0.18, 0.18, 0.21]; });
  } else if (colorScheme === 'rgb') {
    const channels = [
      [1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],
      [1,0.5,0],[0.5,0,1],[0,1,0.5],
    ];
    selectedPrimes.forEach((p, i) => {
      const c = channels[i % channels.length];
      colors[p] = [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9];
    });
  } else if (colorScheme === 'spectrum' || colorScheme === 'spectrum-rev') {
    const rev = colorScheme === 'spectrum-rev';
    selectedPrimes.forEach((p, i) => {
      let t = selectedPrimes.length > 1 ? i / (selectedPrimes.length - 1) : 0.5;
      if (rev) t = 1 - t;
      colors[p] = hueToRGB(t * 0.65);
    });
  } else {
    selectedPrimes.forEach((p, i) => {
      colors[p] = hueToRGB(i / Math.max(selectedPrimes.length, 1));
    });
  }
  return colors;
}

// EDU: this is the idea the whole app is named for — a number's COLOUR IS ITS
// FACTORISATION. Each selected prime is assigned a colour, and a node's colour
// is the sum of the colours of the primes that divide it. With 2 red, 3 green
// and 5 blue: 6 = 2·3 is red + green = yellow; 10 = 2·5 is magenta; 30 is white.
//
// EDU: the mixing is ADDITIVE, like light rather than paint, and that is what
// makes the display honest. Addition is commutative and associative, exactly as
// multiplication of primes is, so the colour of a product is the combination of
// the colours of its factors regardless of the order you take them in. A
// subtractive model would not have that property, and the picture would stop
// meaning anything.
//
// EDU: the clamp to 1 is where the metaphor gives out. A number divisible by
// many selected primes saturates to white and stops distinguishing itself from
// its neighbours — the display cannot represent an arbitrary number of
// simultaneous contributions in three channels. That is a genuine limit of the
// visualisation, not a bug in it.
export function nodeColor(n, primeRGB, selectedPrimes) {
  if (n === 0) return [0, 0, 0];
  if (n === 1) return [0.25, 0.25, 0.25];
  let r = 0, g = 0, b = 0, count = 0;
  for (const p of selectedPrimes) {
    if (n % p === 0) { r += primeRGB[p][0]; g += primeRGB[p][1]; b += primeRGB[p][2]; count++; }
  }
  if (count === 0) return [0.25, 0.25, 0.25];
  return [Math.min(1, r), Math.min(1, g), Math.min(1, b)];
}

// ============================================================
// CATMULL-ROM SPLINE
// ============================================================
// ============================================================
// PARASTICHY CURVE BUILDING
// ============================================================
// EDU: a PARASTICHY is one of the spiral arms your eye picks out of a
// phyllotactic pattern — the curving rows of seeds in a sunflower head. In a
// natural spiral they are an illusion of proximity: no seed is "on" an arm, the
// arms are just the directions in which neighbours happen to line up. The
// number of them is always a Fibonacci number, and that follows directly from
// the golden angle (see core/positions.js).
//
// EDU: here they are made literal and given a different meaning. This function
// draws the curve through the multiples of one prime p — nodes p, 2p, 3p, … —
// so the visible arms are not an artefact of the eye but the actual arithmetic
// progression, laid on top of the phyllotactic arrangement. Where a natural
// parastichy count tells you about φ, these tell you about divisibility.
//
// DEV: `posFunc` returns POLAR coordinates [radius, angle], not Cartesian, and
// the interpolation below happens in that space. That matters: interpolating a
// spiral in Cartesian x/y cuts corners across the curve, while interpolating in
// (r, θ) follows the winding.
export function buildParastichy(p, N, posFunc, samplesPerSeg = 20) {
  const lastMult = Math.floor(N / p);
  if (lastMult < 1) return [];
  const extMax = lastMult + 3;
  const indices = [];
  for (let k = 1; k <= extMax; k++) indices.push(k * p);
  const knots = indices.map(n => posFunc(n));
  // EDU: angle unwrapping. An angle is only defined up to whole turns, so a
  // curve that passes from 359° to 1° has moved two degrees, not minus 358. Left
  // alone, the interpolator would see a huge jump and swing the curve all the
  // way back around the circle to get there.
  //
  // The fix is to choose, for each knot, the representative of its angle that is
  // nearest the previous one — which is what shifting by whole turns until the
  // gap is under half a turn (π) achieves. Half a turn is the right threshold
  // because it is the point where going the other way round becomes shorter.
  //
  // This is why the angles here are allowed to run far outside 0..2π. They are
  // a continuous, cumulative angle rather than a compass bearing, and nothing
  // downstream needs them normalised — sin and cos do not care.
  for (let i = 1; i < knots.length; i++) {
    while (knots[i][1] - knots[i - 1][1] > Math.PI) knots[i][1] -= 2 * Math.PI;
    while (knots[i][1] - knots[i - 1][1] < -Math.PI) knots[i][1] += 2 * Math.PI;
  }
  const curve = catmullRom(knots, samplesPerSeg);
  let totalPts = (lastMult - 1) * samplesPerSeg + 1;
  const lastMultN = lastMult * p;
  if (lastMultN < N) {
    const extraFrac = (N - lastMultN) / p;
    totalPts += Math.ceil(extraFrac * samplesPerSeg);
  }
  const EXTEND_FRAC = 0.5;
  totalPts += Math.ceil(EXTEND_FRAC * samplesPerSeg);
  const maxPts = Math.min(totalPts, curve.length);
  const maxR = posFunc(N)[0];
  let clipped = maxPts;
  for (let i = 0; i < maxPts; i++) {
    if (curve[i][0] > maxR) { clipped = i; break; }
  }
  return curve.slice(0, clipped);
}

export function buildLineArcs(p, N, samplesPerSeg = 20) {
  const lastMult = Math.floor(N / p);
  if (lastMult < 1) return null;
  const lastMultN = lastMult * p;
  const extending = lastMultN < N;
  const extraFrac = extending ? (N - lastMultN) / p : 0;
  const extraSamples = Math.ceil(extraFrac * samplesPerSeg);
  const EXTEND_FRAC = 0.5;
  const extendSamples = Math.ceil(EXTEND_FRAC * samplesPerSeg);
  const pts = [];
  for (let k = 1; k < lastMult; k++) {
    const x1 = SPHERE_R * (2 * k * p / N - 1);
    const x2 = SPHERE_R * (2 * (k + 1) * p / N - 1);
    const cx = (x1 + x2) / 2;
    const r = (x2 - x1) / 2;
    const below = (k % 2 === 1);
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const angle = Math.PI * (1 - t);
      pts.push(cx + r * Math.cos(angle), below ? -r * Math.sin(angle) : r * Math.sin(angle), 0);
    }
  }
  {
    const x1 = SPHERE_R * (2 * lastMultN / N - 1);
    const x2 = SPHERE_R * (2 * (lastMultN + p) / N - 1);
    const cx = (x1 + x2) / 2;
    const r = (x2 - x1) / 2;
    const below = (lastMult % 2 === 1);
    const arcSamples = extending ? extraSamples + extendSamples : extendSamples;
    for (let s = 0; s <= arcSamples; s++) {
      const t = s / samplesPerSeg;
      const angle = Math.PI * (1 - t);
      const x = cx + r * Math.cos(angle);
      if (x > SPHERE_R) break;
      pts.push(x, below ? -r * Math.sin(angle) : r * Math.sin(angle), 0);
    }
  }
  return new Float32Array(pts);
}

// ============================================================
// CATMULL-ROM SPLINE
// ============================================================
// EDU: a Catmull-Rom spline draws a smooth curve that passes THROUGH every one
// of its control points, rather than merely being pulled toward them the way a
// Bézier curve is. That is exactly what is wanted here: the curve for prime p
// must actually touch nodes p, 2p, 3p, … or it is drawing a lie about which
// numbers are multiples of p.
//
// EDU: the trick is that the tangent at each point is estimated from its two
// NEIGHBOURS — the direction from the previous point to the next one. Four
// consecutive points therefore determine each segment, which is why the loop
// below works on (p0, p1, p2, p3) and draws only the middle stretch p1→p2.
//
// EDU: `alpha` is the parameterisation exponent, and 0.5 makes this the
// CENTRIPETAL variant. The choice matters more than it looks. With alpha = 0
// (uniform), segments between widely-spaced knots are traversed at the same
// parameter rate as tight ones, and the curve overshoots — it can loop back on
// itself and even cross through a control point, which here would draw a
// parastichy that visibly bulges past its own node. Centripetal
// parameterisation is the value proven to produce no cusps and no
// self-intersections, whatever the spacing. Since the knots in a spiral get
// steadily further apart as radius grows, uneven spacing is the normal case
// here, not an edge case.
//
// DEV: the endpoints are duplicated when building `pts` so the first and last
// real segments have the neighbour they need. Without it the curve would start
// at the second knot.
export function catmullRom(points, samplesPerSeg = 20, alpha = 0.5) {
  const result = [];
  const pts = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
    const d01 = Math.max(dist(p0, p1) ** alpha, 1e-10);
    const d12 = Math.max(dist(p1, p2) ** alpha, 1e-10);
    const d23 = Math.max(dist(p2, p3) ** alpha, 1e-10);
    const t0 = 0, t1 = d01, t2 = d01 + d12, t3 = d01 + d12 + d23;
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = t1 + (s / samplesPerSeg) * d12;
      const lerp = (pa, pb, ta, tb, tv) => {
        if (Math.abs(tb - ta) < 1e-10) return [pa[0], pa[1]];
        const f = (tv - ta) / (tb - ta);
        return [pa[0] + f * (pb[0] - pa[0]), pa[1] + f * (pb[1] - pa[1])];
      };
      const a1 = lerp(p0, p1, t0, t1, t), a2 = lerp(p1, p2, t1, t2, t), a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t), b2 = lerp(a2, a3, t1, t3, t);
      result.push(lerp(b1, b2, t1, t2, t));
    }
  }
  result.push(points[points.length - 1]);
  return result;
}
