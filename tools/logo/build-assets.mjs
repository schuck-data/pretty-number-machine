// Emits every icon the project ships, as SVG, from ONE mark definition.
//   node tools/logo/build-assets.mjs <outdir>
// Rasterising is done by tools/logo/raster.sh so this stays dependency-free.
//
// THE MARK, decided 2026-08-25 and worth recording because every part of it is
// a decision rather than a default:
//
//   N=12, primes 2 and 3, with the first two arcs of the 2-chain and the first
//   of the 3-chain trimmed off. What survives is three red semicircles and two
//   green ones, and both chains now BEGIN at 6 and END at 12 — exactly one
//   lowest-common-multiple span of the weave. The crop is therefore a statement
//   rather than a framing choice.
//
//   The accent sits at 7. Not a node: 7 is coprime to both primes, so neither
//   chain touches it, and it floats in the gap the two of them leave. That is
//   the sieve, drawn — math.js says it above getVisibleNodes, "the gaps in this
//   figure are, quite literally, where the next primes live". Yellow is a free
//   choice, not a false one: an unselected prime has no colour in this scheme
//   (getPrimeRGB assigns by position in the SELECTED list), so nodeColor would
//   return plain grey and nothing is being misreported.
//
//   Red's MIDDLE arc is painted last so it passes over green while its outer
//   arcs pass under. Drawn as two whole polylines, green sat on top along its
//   entire length, which reads as one ribbon laid on another rather than a
//   braid.
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildMark, buildBraid } from './make-logo.mjs';
import { getPrimeRGB } from '../../www/core/math.js';

// THE ACCENT IS NO LONGER A CHOICE. It used to be a yellow picked to look
// right, with a note admitting that an unselected prime has no colour so
// yellow was free rather than false. Under the cyberpunk default it can be
// derived instead: ask getPrimeRGB what 7 WOULD be if it were selected
// alongside 2 and 3, and it answers acid lime. The dot is now the app's own
// answer to the question the dot is about.
const SEVEN = (() => {
  const c = getPrimeRGB([2, 3, 7], 'cyberpunk')[7];
  return '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
})();

export const MARK = {
  N: 12, primes: [2, 3], trim: { 2: 2, 3: 1 },
  nodes: false, dot: { n: 7 }, dotColor: SEVEN, dotScale: 0.78,
  // Red's -- now cyan's -- MIDDLE arc is painted last, so it passes over the
  // other chain while its outer arcs pass under. Drawn as two whole polylines,
  // one colour sat on top along its entire length, which reads as one ribbon
  // laid on another rather than a braid.
  //
  // An S was tried at the top crossing on 2026-08-25 and reverted: the overlap
  // there is only the first 13% of the arc, too short a stretch for a handover
  // to read as anything but a nick in the line. The machinery for a partial
  // crossing went with it; git has both if the idea comes back.
  over: { 2: [1] },
};

// Adaptive icons draw on a 108dp canvas but only the middle 72dp is guaranteed
// visible — the launcher masks the rest into whatever shape it likes. 72/108 is
// two thirds, so the mark's own inset is scaled by that to keep it clear of the
// crop no matter how aggressive the mask.
const SAFE = 72 / 108;

export const ASSETS = {
  // Android adaptive foreground: transparent, inset into the safe zone
  'and-foreground-mdpi':   { px: 108, o: { background: false, inset: 0.82 * SAFE } },
  'and-foreground-hdpi':   { px: 162, o: { background: false, inset: 0.82 * SAFE } },
  'and-foreground-xhdpi':  { px: 216, o: { background: false, inset: 0.82 * SAFE } },
  'and-foreground-xxhdpi': { px: 324, o: { background: false, inset: 0.82 * SAFE } },
  'and-foreground-xxxhdpi':{ px: 432, o: { background: false, inset: 0.82 * SAFE } },
  // Legacy square + round launcher icons, for pre-adaptive launchers
  'and-legacy-mdpi':    { px: 48,  o: {} },
  'and-legacy-hdpi':    { px: 72,  o: {} },
  'and-legacy-xhdpi':   { px: 96,  o: {} },
  'and-legacy-xxhdpi':  { px: 144, o: {} },
  'and-legacy-xxxhdpi': { px: 192, o: {} },
  'and-round-mdpi':    { px: 48,  o: { clipCircle: true } },
  'and-round-hdpi':    { px: 72,  o: { clipCircle: true } },
  'and-round-xhdpi':   { px: 96,  o: { clipCircle: true } },
  'and-round-xxhdpi':  { px: 144, o: { clipCircle: true } },
  'and-round-xxxhdpi': { px: 192, o: { clipCircle: true } },
  // Play store listing icon
  'play-icon-512': { px: 512, o: {} },
  // Web / PWA. The maskable one is inset harder: the spec's safe area is a
  // circle of 80% diameter, and anything outside it may be cropped away.
  'web-192':           { px: 192, o: {} },
  'web-512':           { px: 512, o: {} },
  'web-512-maskable':  { px: 512, o: { inset: 0.82 * 0.6 } },
  'web-apple-touch':   { px: 180, o: {} },
};

const out = process.argv[2];
if (out) {
  mkdirSync(out, { recursive: true });
  for (const [name, { px, o }] of Object.entries(ASSETS)) {
    writeFileSync(`${out}/${name}.svg`, buildMark({ ...MARK, size: px, ...o }));
  }
  // The feature graphic is 1024x500 and the TRIMMED mark is vertical, so it
  // would sit marooned in the middle of a very wide rectangle. The untrimmed
  // linear braid is the right shape for it, and using both forms makes the two
  // read as a family rather than as the same picture twice.
  // N=24 rather than 12: the wide format wants a RHYTHM across its width, not
  // one motif marooned in the middle. Nodes are dialled right down -- at the
  // icon's weight they were 40% of the braid's height and read as blobs. The
  // 5-chain was tried and dropped: its arcs are so much wider than 2's and 3's
  // that blue swamps the weave instead of joining it.
  // TRIMMED, 2026-08-25. Both chains now begin at 6 and end at 24 -- three whole
  // lowest-common-multiple spans, which is the mark's own argument applied to the
  // wide format. Untrimmed, the 2-chain started at 2 and the 3-chain at 3, which
  // left a ragged stub on the left; and buildBraid centred on the NUMBER LINE
  // rather than on the figure, so the trimmed form sat off to one side until it
  // learned to fit itself.
  //
  // The weave and the node size are buildBraid's defaults now, not overrides:
  // arcs alternate over and under (it drew two flat ribbons before), and nodes
  // are sized off the STROKE rather than off the canvas, so they sit in the line
  // instead of bulging past it. nodeScale: 0.28 against a canvas-relative radius
  // was what made the braid look bumpy.
  writeFileSync(`${out}/play-feature-1024x500.svg`,
    buildBraid({ N: 24, primes: [2, 3], trim: { 2: 2, 3: 1 }, size: 1024, aspect: 1024 / 500, inset: 0.92, lineScale: 0.7 }));
  console.log(Object.keys(ASSETS).length + 1 + ' svgs -> ' + out);
}
