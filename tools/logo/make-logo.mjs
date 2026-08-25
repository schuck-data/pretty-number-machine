// Pretty Number Machine — the mark, generated from the app's own mathematics.
//
// This imports www/core/math.js directly and asks it the same questions the
// renderer asks: which nodes are visible, what colour is each one, where do the
// parastichy curves run. The logo is therefore not a PICTURE of the figure, it
// IS the figure, computed by the code that draws the product. math.js imports
// nothing, which is what makes this possible and is worth preserving.
//
// Emits SVG. Rasterising is a separate step so this file stays dependency-free
// like everything else in tools/.
import {
  GOLDEN_ANGLE, SPACING_2D, SPHERE_R, getPrimeRGB, nodeColor, getVisibleNodes,
  buildParastichy, buildLineArcs, mixModeFor,
} from '../../www/core/math.js';

const BG = '#0a1226';                    // navy: the app's default background
// The mark follows the app's DEFAULT scheme, so the icon and the first launch
// agree. Under cyberpunk that makes 2 electric cyan and 3 hot magenta.
const SCHEME = 'cyberpunk';
const PRIMES = [2, 3, 5];                // and every blend between

const polar = n => [SPACING_2D * Math.sqrt(n), n * GOLDEN_ANGLE];
const hex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

export function buildLogo({
  N = 30,
  size = 512,
  curves = true,
  nodeScale = 1,
  inset = 0.86,          // fraction of the half-size the figure may occupy
  background = true,
  glow = true,
} = {}) {
  const primeRGB = getPrimeRGB(PRIMES, SCHEME);
  const vis = getVisibleNodes(N, PRIMES).filter(n => n > 1);   // 0 and 1 carry no factorisation

  const maxR = SPACING_2D * Math.sqrt(N);
  const S = (size / 2) * inset / maxR;                          // world -> pixel
  const cx = size / 2, cy = size / 2;
  const P = ([r, a]) => [cx + S * r * Math.cos(a), cy + S * r * Math.sin(a)];

  // node radius: a share of the gap between successive rings, so it scales with N
  const nodeR = (size / 2) * inset * (0.115 / Math.sqrt(N / 30)) * nodeScale;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`);
  if (glow) {
    out.push(`<defs><radialGradient id="g"><stop offset="0" stop-color="#2a2118"/><stop offset="1" stop-color="${BG}"/></radialGradient>`);
    out.push(`<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${size * 0.012}"/></filter></defs>`);
  }
  if (background) out.push(`<rect width="${size}" height="${size}" fill="${glow ? 'url(#g)' : BG}"/>`);

  if (curves) {
    for (const p of PRIMES) {
      const pts = buildParastichy(p, N, polar, 24).map(P);
      if (pts.length < 2) continue;
      const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)).join(' ');
      out.push(`<path d="${d}" fill="none" stroke="${hex(primeRGB[p])}" stroke-width="${size * 0.011}" stroke-linecap="round" opacity="0.55"/>`);
    }
  }

  for (const n of vis) {
    const [x, y] = P(polar(n));
    out.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${nodeR.toFixed(2)}" fill="${hex(nodeColor(n, primeRGB, PRIMES, mixModeFor(SCHEME)))}"/>`);
  }
  out.push('</svg>');
  return out.join('\n');
}

// CLI: node make-logo.mjs <out.svg> [key=value ...]
if (process.argv[1] && process.argv[1].endsWith('make-logo.mjs')) {
  const { writeFileSync } = await import('node:fs');
  const [, , outPath, ...rest] = process.argv;
  const opts = {};
  for (const kv of rest) {
    const [k, v] = kv.split('=');
    opts[k] = v === 'true' ? true : v === 'false' ? false : Number(v);
  }
  const fn = opts.mode === 2 ? buildBraid : buildLogo;
  delete opts.mode;
  writeFileSync(outPath, fn(opts));
  console.log('wrote', outPath, JSON.stringify(opts));
}

// ============================================================
// THE BRAID
// ============================================================
// Found by Dakota on a Pixel 7, 2026-08-25, under the classroom lens: the arc
// chains for two primes weaving around the number line. It says more in less
// space than the sunflower does. Every crossing of the red chain and the green
// one is a number divisible by BOTH, and the colour law paints exactly those
// nodes yellow — so the picture states the rule it is illustrating.
//
// buildLineArcs() is the app's own function, semicircles alternating above and
// below the line, hopping p, 2p, 3p. Two primes braid because their arcs are
// different widths.
export function buildBraid({
  N = 12, primes = [2, 3], size = 512, aspect = 1,
  background = true, vertical = false, inset = 0.84, nodeScale = 1, lineScale = 1,
} = {}) {
  const primeRGB = getPrimeRGB(primes, SCHEME);
  const W = size, H = Math.round(size / aspect);
  const chains = primes.map(p => ({ p, pts: buildLineArcs(p, N, 28) })).filter(c => c.pts);

  // world extent: x spans -SPHERE_R..+SPHERE_R, y is the arc bulge
  let maxY = 0;
  for (const c of chains) for (let i = 1; i < c.pts.length; i += 3) maxY = Math.max(maxY, Math.abs(c.pts[i]));
  const halfX = SPHERE_R, halfY = Math.max(maxY, 0.001);

  const along = vertical ? H : W, across = vertical ? W : H;
  const S = Math.min((along / 2) * inset / halfX, (across / 2) * inset / halfY);
  const map = (x, y) => vertical ? [W / 2 + S * y, H / 2 + S * x] : [W / 2 + S * x, H / 2 - S * y];

  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  if (background) out.push(`<rect width="${W}" height="${H}" fill="${BG}"/>`);

  const lw = size * 0.030 * lineScale;
  for (const { p, pts } of chains) {
    const d = [];
    for (let i = 0; i < pts.length; i += 3) {
      const [x, y] = map(pts[i], pts[i + 1]);
      d.push((i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2));
    }
    out.push(`<path d="${d.join(' ')}" fill="none" stroke="${hex(primeRGB[p])}" stroke-width="${lw}" stroke-linecap="round"/>`);
  }

  const nodeR = size * 0.045 * nodeScale;
  for (const n of getVisibleNodes(N, primes).filter(v => v > 1)) {
    const x = SPHERE_R * (2 * n / N - 1);
    const [px, py] = map(x, 0);
    out.push(`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${nodeR.toFixed(2)}" fill="${hex(nodeColor(n, primeRGB, primes, mixModeFor(SCHEME)))}"/>`);
  }
  out.push('</svg>');
  return out.join('\n');
}

// ============================================================
// THE RING — the braid with its number line bent into a circle
// ============================================================
// The braid says the right thing but it is a LINE, and a line wastes a square.
// Bending it round closes the form: the arcs for two primes weave around a ring
// and every crossing is still a number divisible by both, still painted by the
// colour law. The app already has a shape that wraps the line this way — Chord
// is the same idea on a cylinder — so this is not a liberty taken with the
// mathematics, it is one of the arrangements the mathematics already has.
export function buildRing({
  N = 12, primes = [2, 3], size = 512, background = true,
  ringFrac = 0.62,      // ring radius as a fraction of the half-size
  bulge = 1.0,          // how far the arcs swing off the ring
  nodeScale = 1, lineScale = 1, rotate = -Math.PI / 2,
} = {}) {
  const primeRGB = getPrimeRGB(primes, SCHEME);
  const chains = primes.map(p => ({ p, pts: buildLineArcs(p, N, 40) })).filter(c => c.pts);
  const cx = size / 2, cy = size / 2;
  const R0 = (size / 2) * ringFrac;

  let maxY = 0;
  for (const c of chains) for (let i = 1; i < c.pts.length; i += 3) maxY = Math.max(maxY, Math.abs(c.pts[i]));
  const radial = ((size / 2) - R0) * 0.92 * bulge / Math.max(maxY, 1e-6);

  // x in [-SPHERE_R, SPHERE_R] -> a full turn; y becomes radial offset
  const map = (x, y) => {
    const th = rotate + Math.PI * (x / SPHERE_R + 1);
    const r = R0 + y * radial;
    return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
  };

  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`];
  if (background) out.push(`<rect width="${size}" height="${size}" fill="${BG}"/>`);

  for (const { p, pts } of chains) {
    const d = [];
    for (let i = 0; i < pts.length; i += 3) {
      const [px, py] = map(pts[i], pts[i + 1]);
      d.push((i ? 'L' : 'M') + px.toFixed(2) + ' ' + py.toFixed(2));
    }
    out.push(`<path d="${d.join(' ')}" fill="none" stroke="${hex(primeRGB[p])}" stroke-width="${size * 0.034 * lineScale}" stroke-linecap="round"/>`);
  }
  const nodeR = size * 0.050 * nodeScale;
  for (const n of getVisibleNodes(N, primes).filter(v => v > 1)) {
    const [px, py] = map(SPHERE_R * (2 * n / N - 1), 0);
    out.push(`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${nodeR.toFixed(2)}" fill="${hex(nodeColor(n, primeRGB, primes, mixModeFor(SCHEME)))}"/>`);
  }
  out.push('</svg>');
  return out.join('\n');
}

// ============================================================
// THE MARK — the braid, trimmed to its first common multiple
// ============================================================
// Dakota's refinement, 2026-08-25, from the vertical braid: drop the first two
// arcs of the 2-chain and the first arc of the 3-chain. Three red semicircles
// and two green ones remain — and both survivors now BEGIN at 6, the first
// number divisible by both primes, and end at 12, the next one. The mark is
// therefore exactly one lowest-common-multiple span of the weave, which is why
// the crop reads as deliberate rather than as a cropped screenshot.
//
// `trim` counts whole arcs off the low-number end. buildLineArcs emits
// samplesPerSeg points per arc in order, so dropping the first k arcs is a
// slice — the geometry is still the app's, not a redrawing of it.
export function buildMark({
  N = 12, primes = [2, 3], trim = { 2: 2, 3: 1 }, size = 512,
  samples = 48, nodes = true, nodeScale = 0.62, lineScale = 1,
  background = true, inset = 0.82, vertical = true,
  over = { 2: [1] },     // arc indices painted LAST, i.e. passing over
  clipCircle = false,    // for the round launcher icon
  dot = null,            // { n } or { n, off } -- a single accent node
  dotColor = null,       // override; null keeps the colour law honest
  dotScale = 0.62,
} = {}) {
  const primeRGB = getPrimeRGB(primes, SCHEME);
  // Each chain is kept as a list of ARCS rather than one polyline, because the
  // weave needs individual arcs re-ordered in the paint list. Every arc carries
  // one extra point from the next one so the joins stay seamless when they are
  // drawn as separate paths.
  const chains = [];
  for (const p of primes) {
    const raw = buildLineArcs(p, N, samples);
    if (!raw) continue;
    const all = [];
    for (let i = 0; i < raw.length; i += 3) all.push([raw[i], raw[i + 1]]);
    const arcs = [];
    for (let a = (trim[p] || 0); a * samples < all.length; a++) {
      const seg = all.slice(a * samples, Math.min((a + 1) * samples + 1, all.length));
      if (seg.length > 1) arcs.push(seg);
    }
    if (arcs.length) chains.push({ p, arcs, pts: arcs.flat() });
  }

  // Fit whatever survived the trim, so the mark is centred on ITSELF rather
  // than on the number line it was cut from.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of chains) for (const [x, y] of c.pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const spanX = maxX - minX, spanY = maxY - minY;
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;

  // along = the number-line axis; across = the arc bulge
  const along = vertical ? spanX : spanX, across = vertical ? spanY : spanY;
  const S = Math.min((size * inset) / (vertical ? across : along) , (size * inset) / (vertical ? along : across));
  const cx = size / 2, cy = size / 2;
  const map = (x, y) => vertical
    ? [cx + S * (y - midY), cy + S * (x - midX)]
    : [cx + S * (x - midX), cy - S * (y - midY)];

  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`];
  if (clipCircle) {
    out.push(`<defs><clipPath id="c"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath></defs>`);
    out.push(`<g clip-path="url(#c)">`);
  }
  if (background) out.push(clipCircle
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${BG}"/>`
    : `<rect width="${size}" height="${size}" fill="${BG}"/>`);

  const lw = size * 0.052 * lineScale;
  const pathFor = (p, seg) => {
    const d = seg.map(([x, y], i) => {
      const [px, py] = map(x, y);
      return (i ? 'L' : 'M') + px.toFixed(2) + ' ' + py.toFixed(2);
    }).join(' ');
    return `<path d="${d}" fill="none" stroke="${hex(primeRGB[p])}" stroke-width="${lw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  // THE WEAVE. Painted in two passes: everything that goes UNDER, then the arcs
  // named in `over`, which come back on top. Drawing each chain as one polyline
  // put green above red along its whole length, which reads as one ribbon laid
  // on another. A braid has to alternate, and the arc is the natural unit to
  // alternate on -- it runs node to node, so the crossing always falls inside
  // it rather than at a seam.
  // An `over` entry is either an arc INDEX (that whole arc passes over) or
  // { arc, from, to } as fractions along it, which lets one crossing inside a
  // single arc go over while the other goes under. That is what turns the top
  // loop from a D -- one strand simply laid on the other -- into an S, where
  // the strands trade places the way a braid actually does.
  //
  // A partially-over arc is drawn WHOLE underneath first and its slice repainted
  // on top, so there is no seam where the two meet.
  const entries = (p) => over[p] || [];
  const wholeOver = (p, i) => entries(p).some(e => e === i);
  const slices = (p, i) => entries(p).filter(e => typeof e === 'object' && e.arc === i);

  for (const { p, arcs } of chains)
    arcs.forEach((seg, i) => { if (!wholeOver(p, i)) out.push(pathFor(p, seg)); });
  for (const { p, arcs } of chains) arcs.forEach((seg, i) => {
    if (wholeOver(p, i)) out.push(pathFor(p, seg));
    for (const sl of slices(p, i)) {
      const a = Math.max(0, Math.floor((sl.from ?? 0) * (seg.length - 1)));
      const b = Math.min(seg.length, Math.ceil((sl.to ?? 1) * (seg.length - 1)) + 1);
      if (b - a > 1) out.push(pathFor(p, seg.slice(a, b)));
    }
  });

  if (nodes) {
    const r = size * 0.050 * nodeScale;
    for (const n of getVisibleNodes(N, primes).filter(v => v > 1)) {
      const x = SPHERE_R * (2 * n / N - 1);
      if (x < minX - 1e-6 || x > maxX + 1e-6) continue;      // only what the trim kept
      const [px, py] = map(x, 0);
      out.push(`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${r.toFixed(2)}" fill="${hex(nodeColor(n, primeRGB, primes, mixModeFor(SCHEME)))}"/>`);
    }
  }

  // A single accent node. `off` displaces it off the number line into open
  // space, which is a COMPOSITIONAL placement rather than a factual one -- see
  // the note where this is called.
  if (dot) {
    const x = SPHERE_R * (2 * dot.n / N - 1);
    const [px, py] = map(x, dot.off || 0);
    const fill = dotColor || hex(nodeColor(dot.n, primeRGB, primes, mixModeFor(SCHEME)));
    out.push(`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(size * 0.050 * dotScale).toFixed(2)}" fill="${fill}"/>`);
  }
  if (clipCircle) out.push('</g>');
  out.push('</svg>');
  return out.join('\n');
}
