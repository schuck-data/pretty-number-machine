#!/usr/bin/env node
// Static checks for Pretty Number Machine.
//
// Dependency-free and run with plain `node tools/check.mjs`. That is a
// requirement, not a flourish: this project has no build step and no
// node_modules, and a checker that needed either would rot the first time
// nobody felt like running npm install.
//
// These do not test behaviour. They test the invariants that actually broke
// during development, each of which fails silently in production:
//
//   1. A file listed in PRECACHE that does not exist. cache.addAll() is
//      atomic, so ONE bad path aborts the whole install and offline support
//      never happens — with nothing visibly wrong until someone is on a plane.
//
//   2. CACHE_VERSION not starting with CACHE_PREFIX. Two builds share one
//      Cache Storage; the prefix is how each worker knows which caches are its
//      own. A mismatch means a worker cannot recognise its own generation.
//
//   3. The version label shown in the UI disagreeing with CACHE_VERSION. Every
//      bug report starts with "what version are you on", and this is the only
//      place a user can read it.
//
//   4. A live `1 / 60` frame-step. Wall-clock timing was item 2 of the v1
//      plan; reintroducing a hardcoded frame step would silently restore
//      frame-rate-dependent durations, which nothing else would catch.
//
// Exit code is what CI reads. Output is meant to be read by a person.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Each build is checked independently. They have separate workers, separate
// cache namespaces and separate version labels, and mixing them up is exactly
// the failure mode these checks exist for.
// `wallClock` marks builds that have adopted item 2 of the v1 plan. The shipped
// build legitimately still advances the morph by a hardcoded frame step: it
// predates the fix and is frozen until v1 is promoted over it. Flagging that
// forever would be a check that is always red, and a check that is always red
// is a check nobody reads. Set this true when a build adopts wall-clock timing.
const BUILDS = [
  { name: 'shipped', dir: '.',   labelRe: /(v\d+\.\d+\.\d+[\w.-]*) &middot;/, wallClock: false },
  { name: 'v1',      dir: 'v1',  labelRe: /(v\d+\.\d+\.\d+[\w.-]*) &middot;/, wallClock: true },
];

let failures = 0;
const fail = (build, msg) => { failures++; console.error(`  FAIL  [${build}] ${msg}`); };
const pass = (build, msg) => console.log(`  ok    [${build}] ${msg}`);

for (const build of BUILDS) {
  const base = join(root, build.dir);
  const swPath = join(base, 'sw.js');
  const idxPath = join(base, 'index.html');

  if (!existsSync(swPath)) { fail(build.name, 'sw.js missing'); continue; }
  if (!existsSync(idxPath)) { fail(build.name, 'index.html missing'); continue; }

  const sw = readFileSync(swPath, 'utf8');
  const idx = readFileSync(idxPath, 'utf8');

  // --- 2. version / prefix agreement -----------------------------------
  const version = (sw.match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1];
  const prefix = (sw.match(/CACHE_PREFIX\s*=\s*'([^']+)'/) || [])[1];

  if (!version) fail(build.name, 'no CACHE_VERSION found in sw.js');
  if (!prefix) fail(build.name, 'no CACHE_PREFIX found in sw.js');
  if (version && prefix) {
    if (version.startsWith(prefix)) pass(build.name, `CACHE_VERSION '${version}' matches prefix '${prefix}'`);
    else fail(build.name, `CACHE_VERSION '${version}' does not start with CACHE_PREFIX '${prefix}'`);
  }

  // --- 3. UI label agrees with the cache version -----------------------
  const label = (idx.match(build.labelRe) || [])[1];
  if (!label) {
    fail(build.name, 'no version label found in index.html');
  } else if (version && !version.endsWith(label)) {
    fail(build.name, `index.html shows '${label}' but CACHE_VERSION is '${version}'`);
  } else {
    pass(build.name, `version label '${label}' agrees with CACHE_VERSION`);
  }

  // --- 1. every precached path exists ----------------------------------
  const block = (sw.match(/const PRECACHE\s*=\s*\[([\s\S]*?)\];/) || [])[1] || '';
  const entries = [...block.matchAll(/'([^']+)'/g)].map(m => m[1]);
  if (entries.length === 0) {
    fail(build.name, 'PRECACHE list is empty or unparseable');
  } else {
    const missing = entries.filter((rel) => {
      // './' means the directory index, which index.html satisfies.
      const target = rel === './' ? './index.html' : rel;
      return !existsSync(join(base, target));
    });
    if (missing.length) fail(build.name, `PRECACHE lists ${missing.length} missing file(s): ${missing.join(', ')}`);
    else pass(build.name, `all ${entries.length} precached files exist`);
  }

  // --- 4. no reintroduced frame-step -----------------------------------
  const rendererPath = join(base, 'core', 'renderer.js');
  if (!build.wallClock) {
    console.log(`  skip  [${build.name}] frame-step check (build predates wall-clock timing)`);
  } else if (existsSync(rendererPath)) {
    const live = readFileSync(rendererPath, 'utf8')
      .split('\n')
      .filter(l => !l.trim().startsWith('//'))
      .filter(l => /\bdt\s*=\s*1\s*\/\s*60\b/.test(l));
    if (live.length) fail(build.name, `hardcoded frame step reintroduced in renderer.js: ${live[0].trim()}`);
    else pass(build.name, 'no hardcoded 1/60 frame step in live code');
  }
}

console.log('');
if (failures) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All checks passed.');
