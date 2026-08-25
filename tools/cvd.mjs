// Colour-vision-deficiency simulation and perceptual distance.
//
// Used to CHECK the palettes that claim to be colourblind-safe, so the claim is
// a measurement rather than an intention. Viénot-Brettel-Mollon (1999): take
// sRGB to linear, to LMS, project onto the dichromat's plane, and come back.
// Distances are CIE76 dE in Lab, which is crude for fine shade work and ample
// for "can these two be told apart at a glance".
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = v => Math.max(0, Math.min(1, v));

const RGB2LMS = [[0.31399022,0.63951294,0.04649755],[0.15537241,0.75789446,0.08670142],[0.01775239,0.10944209,0.87256922]];
const LMS2RGB = [[5.47221206,-4.6419601,0.16963708],[-1.1252419,2.29317094,-0.1678952],[0.02980165,-0.19318073,1.16364789]];
const SIM = {
  protan: [[0,1.05118294,-0.05116099],[0,1,0],[0,0,1]],
  deutan: [[1,0,0],[0.9513092,0,0.04866992],[0,0,1]],
  tritan: [[1,0,0],[0,1,0],[-0.86744736,1.86727089,0]],
};
const mul = (m, v) => m.map(r => r[0]*v[0] + r[1]*v[1] + r[2]*v[2]);

export function simulate(rgb255, kind) {
  if (kind === 'normal') return rgb255;
  const l = rgb255.map(c => lin(c / 255));
  const out = mul(LMS2RGB, mul(SIM[kind], mul(RGB2LMS, l)));
  return out.map(c => Math.round(clamp01(gam(clamp01(c))) * 255));
}

export function toLab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(c => lin(c / 255));
  let x = (0.4124*R + 0.3576*G + 0.1805*B) / 0.95047;
  let y = (0.2126*R + 0.7152*G + 0.0722*B);
  let z = (0.0193*R + 0.1192*G + 0.9505*B) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export const dE = (a, b) => {
  const [l1,a1,b1] = toLab(a), [l2,a2,b2] = toLab(b);
  return Math.hypot(l1-l2, a1-a2, b1-b2);
};

// Smallest separation between any two entries, under every vision type.
export function worstPairwise(palette255, kinds = ['normal','protan','deutan','tritan']) {
  let worst = Infinity, where = null;
  for (const kind of kinds) {
    const sim = palette255.map(c => simulate(c, kind));
    for (let i = 0; i < sim.length; i++) for (let j = i + 1; j < sim.length; j++) {
      const d = dE(sim[i], sim[j]);
      if (d < worst) { worst = d; where = `${kind} ${i}/${j}`; }
    }
  }
  return { worst, where };
}

// Smallest HUE separation in the palette, in degrees. dE alone is not enough:
// two shades of one hue are far apart in dE and read as one colour.
export function minHueGap(palette255) {
  const hue = c => { const [, a, b] = toLab(c); return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360; };
  let m = 360, where = null;
  for (let i = 0; i < palette255.length; i++) for (let j = i + 1; j < palette255.length; j++) {
    let d = Math.abs(hue(palette255[i]) - hue(palette255[j]));
    if (d > 180) d = 360 - d;
    if (d < m) { m = d; where = `${i}/${j}`; }
  }
  return { gap: m, where };
}
