// Emits every candidate mark as SVG into a directory. Exploratory, and kept so
// the shortlist can be regenerated rather than remembered.
//   node tools/logo/variants.mjs <outdir>
import { writeFileSync } from 'node:fs';
import { buildLogo, buildBraid } from './make-logo.mjs';

export const VARIANTS = {
  'sun-30-curves': () => buildLogo({ N: 30, curves: true }),
  'sun-30-plain':  () => buildLogo({ N: 30, curves: false }),
  'sun-90':        () => buildLogo({ N: 90, curves: true }),
  'sun-15-bold':   () => buildLogo({ N: 15, curves: true, nodeScale: 1.2 }),
  'braid-12-h':    () => buildBraid({ N: 12, primes: [2, 3] }),
  'braid-12-v':    () => buildBraid({ N: 12, primes: [2, 3], vertical: true }),
  'braid-30-h':    () => buildBraid({ N: 30, primes: [2, 3], nodeScale: 0.7, lineScale: 0.8 }),
  'braid-12-235':  () => buildBraid({ N: 12, primes: [2, 3, 5] }),
  'braid-24-235':  () => buildBraid({ N: 24, primes: [2, 3, 5], nodeScale: 0.75, lineScale: 0.85 }),
  'braid-6-big':   () => buildBraid({ N: 6, primes: [2, 3], nodeScale: 1.2, lineScale: 1.2 }),
};

const out = process.argv[2];
if (out) for (const [name, fn] of Object.entries(VARIANTS)) {
  writeFileSync(`${out}/${name}.svg`, fn());
  console.log('  ' + name);
}
