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
// There are now two KINDS of build in this repo and they need different
// guards, so the checks below come in two halves:
//
//   * The WEB builds (`.` and `v1/`) are served from schuckdata.com and keep
//     the service worker, so they keep checks 1-3 above.
//
//   * The APP build (`www/`) is bundled into the Android shell. It has no
//     worker and nothing to precache, so cache-version discipline is replaced
//     by VERSION AGREEMENT: the label in www/index.html, the version in
//     package.json and versionName in android/app/build.gradle must be the
//     same string. Play orders releases by versionCode and rejects a bundle
//     whose code did not increase, and the only warning you get is a rejected
//     upload — so the numbers are checked here instead.
//
//     The app build also gets an ABSENCE check. sw.js and manifest.webmanifest
//     must NOT exist under www/. Four separate bugs in this project came from a
//     service worker serving stale code (docs/HANDOFF.md §4), and a `cap copy`
//     bundles whatever it finds. If one is ever recreated there by habit or by
//     a copy from v1/, this is what says so.
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

// ============================================================
// THE APP BUILD — www/
// ============================================================
// Everything above guards a service worker. None of it applies here; these
// guard the things Play cares about instead.
{
  const app = 'app';
  const wwwDir = join(root, 'www');
  const idxPath = join(wwwDir, 'index.html');
  const pkgPath = join(root, 'package.json');
  const gradlePath = join(root, 'android', 'app', 'build.gradle');

  if (!existsSync(idxPath)) {
    fail(app, 'www/index.html missing — is webDir still pointing at www?');
  } else {
    const idx = readFileSync(idxPath, 'utf8');

    // --- the worker must stay gone ---------------------------------------
    const banned = ['sw.js', 'manifest.webmanifest'];
    const present = banned.filter(f => existsSync(join(wwwDir, f)));
    if (present.length) {
      fail(app, `www/ contains ${present.join(' and ')} — the app build must not have `
        + `either; see docs/ANDROID-BUILD.md §2`);
    } else {
      pass(app, 'no service worker or web manifest in www/');
    }

    if (/navigator\.serviceWorker\s*\.\s*register/.test(idx)) {
      fail(app, 'www/index.html registers a service worker');
    } else {
      pass(app, 'www/index.html registers no service worker');
    }

    // --- version agreement, three ways -----------------------------------
    // The UI label is the only version a user can read, package.json is what
    // npm and Capacitor see, and versionName is what Play displays. A bug
    // report quoting one of the three has to be able to find the other two.
    const label = (idx.match(/(\d+\.\d+\.\d+[\w.-]*) &middot;/) || [])[1];
    const pkgVersion = existsSync(pkgPath)
      ? (JSON.parse(readFileSync(pkgPath, 'utf8')).version || null) : null;
    const gradle = existsSync(gradlePath) ? readFileSync(gradlePath, 'utf8') : '';
    const versionName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
    const versionCode = (gradle.match(/versionCode\s+(\d+)/) || [])[1];

    if (!label) fail(app, 'no version label found in www/index.html');
    if (!pkgVersion) fail(app, 'no version found in package.json');
    if (!versionName) fail(app, 'no versionName found in android/app/build.gradle');

    if (label && pkgVersion && versionName) {
      const all = new Set([label, pkgVersion, versionName]);
      if (all.size === 1) {
        pass(app, `version '${label}' agrees across index.html, package.json and build.gradle`);
      } else {
        fail(app, `version disagreement — index.html '${label}', package.json `
          + `'${pkgVersion}', build.gradle versionName '${versionName}'`);
      }
    }

    // versionCode monotonicity across releases cannot be checked from a single
    // working tree — it is a fact about history, and the authority is Play
    // Console, which refuses a repeat. What IS checkable is that the field is a
    // sane positive integer, which catches the quoted-string and zero mistakes.
    if (!versionCode) {
      fail(app, 'no versionCode found in android/app/build.gradle');
    } else if (!(Number(versionCode) >= 1)) {
      fail(app, `versionCode '${versionCode}' is not a positive integer`);
    } else {
      pass(app, `versionCode ${versionCode} is a positive integer (Play enforces the increase)`);
    }

    // --- no reintroduced frame-step --------------------------------------
    const rendererPath = join(wwwDir, 'core', 'renderer.js');
    if (existsSync(rendererPath)) {
      const live = readFileSync(rendererPath, 'utf8')
        .split('\n')
        .filter(l => !l.trim().startsWith('//'))
        .filter(l => /\bdt\s*=\s*1\s*\/\s*60\b/.test(l));
      if (live.length) fail(app, `hardcoded frame step reintroduced in renderer.js: ${live[0].trim()}`);
      else pass(app, 'no hardcoded 1/60 frame step in live code');
    }
  }
}

console.log('');
if (failures) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All checks passed.');
