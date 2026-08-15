# Android build — Pretty Number Machine

**Written:** 2026-08-15. **Status:** §5 step 1 executed 2026-08-15; everything
else is still plan. It is the handoff for the build that turns PNM into a Play
Store game with achievements and a single in-app product.

**The scaffold spike succeeded.** Capacitor 8.5.0 wraps the v1 code unchanged
and runs on the Pixel 9. What that proved, and what it did not, is in §5 step 1.

**Supersedes** the TWA / Bubblewrap / paid-app plan in `HANDOFF.md` §1–3 and
`PLAY-STORE-HANDOFF.md`. Where those disagree with this document, this document
is newer. The codebase directory in `HANDOFF.md` Appendix A is still accurate.

---

## 0. The shape in one paragraph

PNM becomes a **Capacitor** app: the existing web code, unchanged, bundled inside
a native Android shell that the repo owns. Updates ship through the Play Store.
The service worker, web manifest, update prompt and cache-version discipline all
go away. Two native services are reached through Capacitor plugins — **Play
Games Services v2** (achievements, saved games) and **Play Billing** (one $0.99
non-consumable). No server, no accounts, no network of our own. Free app;
listing category **Games → Educational**. The web copy at schuckdata.com is not
involved in any of this. iOS is a later, second shell on the same code and is
out of scope here except where a choice now would foreclose it.

## 1. Goals, and the constraints that follow

| Goal | Constraint it imposes |
|---|---|
| Achievements visible on the Play Store / Play Games profile | Play Games Services v2, which only exists as an Android SDK → a native shell with a bridge to JS |
| Works offline, signed out, forever | The ledger of unlocks lives on-device and is the source of truth; PGS is a projection of it |
| $1 one-time purchase that turns the fake ads **on** | Play Billing, non-consumable, restored from Play on every launch; the purchase also grants an achievement |
| No server, no database, no accounts | Play holds purchases; PGS holds achievements and the saved-game copy of the ledger. Nothing else holds anything |
| No external requests at runtime | Still true. Plugins talk to Google Play services on-device; the app makes no HTTP calls |
| iOS possible later | Every native call goes through one adapter with a per-platform ID map; nothing in `core/` or `modules/` mentions PGS or Play |
| Publishable after 2026-08-31 | Target API 36 (Capacitor 8 does this) and Play Billing Library **8+** (the billing plugin must bundle it) |

## 2. Repository changes

### Stays

`index.html`, `core/`, `modules/`, `lib/` (vendored three.js), `icons/`,
`privacy.html`, `LICENSE`, `THIRD-PARTY.md`. The app does not know it is in a
shell.

### Goes

| File | Why |
|---|---|
| `sw.js` | No offline caching needed — the bundle *is* the offline copy |
| `manifest.webmanifest` | Not read by a native shell |
| `core/notices.js` — the update-prompt half | Updates come from the store. **Keep the error boundary** |
| `tools/check.mjs` — precache and `CACHE_VERSION` guards | Nothing to guard. See §2 "Arrives" for what replaces them |
| `v1/` and the shipped `v0.14.5` root build | Whatever remains at schuckdata.com is a separate decision (§7). In this repo there is one app |

### Arrives

| Thing | Notes |
|---|---|
| `package.json` | Capacitor is the first dependency this project has had. Node 22+ |
| `capacitor.config.ts` | `appId: com.schuckdata.pnm`, `webDir` pointing at the web files |
| `www/` (or the web files at a folder Capacitor is told about) | Capacitor copies this folder into the shell verbatim. **No bundler is required** — plain static files work |
| `android/` | The Android Studio project. **Committed and owned**; plugin config and Gradle live here |
| `modules/achievements.js` | The ledger. See §3 |
| `modules/fake-ads.js` | Renders the bundled satirical ads when the entitlement is present. Off by default |
| `platform/` | The adapter. See §3 |
| `tools/check.mjs` — new guards | UI version label ↔ `package.json` `version` ↔ `android/app/build.gradle` `versionName` agree; `versionCode` monotonic; parse check of every module (existing) |
| CI | Parse checks and version guards on push. Optionally build the AAB |

### CSP

Capacitor serves the app from `https://localhost` on Android (and
`capacitor://localhost` on iOS). The meta CSP in `index.html` needs those
origins. The `'unsafe-inline'` requirement for the importmap is unchanged.

## 3. Web-side design

### `platform/` — the adapter

One module the rest of the app imports. It exposes:

```
platform.achievements.unlock(id)        // id = PNM's own name, e.g. 'first-prime'
platform.achievements.reveal(id)
platform.achievements.increment(id, n)
platform.achievements.loadUnlocked()    // → Set of PNM ids
platform.achievements.showUI()
platform.saves.write(blob) / read()
platform.billing.getProduct() / purchase() / restore()
platform.isNative
```

Behind it: `Capacitor.isNativePlatform()` chooses the plugin-backed
implementation or a **no-op / in-memory fallback**, so the app runs unchanged
on the dev server in a browser with achievements and billing stubbed. Nothing
in `core/` or `modules/` imports a plugin directly.

A single map translates PNM ids to store ids:

```
{ 'first-prime': { pgs: 'CgkI…', gamecenter: 'com.schuckdata.pnm.first_prime' }, … }
```

Store IDs are opaque strings assigned by Play Console. They go **only** in this
map.

### `modules/achievements.js` — the ledger

A crash-isolated module in the existing pattern (`registerModule`, `init(ctx)`,
listens on the event bus). It owns:

- The definition list: id, title, description, XP, kind (standard / incremental /
  hidden), and the predicate or counter that earns it
- The ledger: `{ id → unlockedAt }` plus incremental counters, in localStorage
  (or the Capacitor Preferences plugin — same thing, slightly more durable)
- Emitting `achievement:unlocked` on the bus, and calling `platform.achievements.unlock`
- Reconciliation on start: read PGS's list via `loadUnlocked()`, union with the
  local ledger, push anything local that PGS lacks. Unlocks are idempotent, so
  replaying the whole ledger is always safe. Cheap, and it makes every
  cross-device and reinstall case fall out for free
- Writing the ledger to `platform.saves` after each change, and reading it on
  start if local storage is empty (fresh install on a second device)

Nothing else in the app knows an achievement exists. Other modules and `core/`
just emit the events they already emit; the ledger's predicates listen.

### `modules/fake-ads.js`

Bundled, self-authored ads for numbers. Renders only when
`platform.billing.restore()` reports the entitlement. **No ad SDK, no network,
no consent framework** — this must stay true or the Data Safety and ads
declarations change. Purchase flow: `purchase()` → on success, emit
`billing:entitled` → ledger unlocks its achievement, ads module turns on.

### Achievement design constraints (PGS, verified 2026-08-15)

- 2,000 XP total across the game; ≤200 per achievement; multiples of 5.
  **Reserve balance** for later additions
- Google's quality checklist wants **ten** achievements minimum. The console
  may let a PGS configuration publish with fewer — check the actual gate when
  you get there, but design for ten
- Kinds: standard, incremental (progress bar), hidden (placeholder until earned;
  use sparingly)
- Max 400 lifetime; irrelevant
- Hunter conventions worth honouring: nothing unobtainable, nothing time-limited,
  nothing requiring another player, everything 100%-able offline. The purchase
  achievement is the one deliberate exception and the joke — decide whether it
  is part of "100%"

**The achievement list itself is not designed.** That is a design task with a
dependency on nothing; it can happen any time before §5 step 3.

## 4. Native side

### Plugins to evaluate — first task of the build

Community plugins carry the native code. Both areas have several; **evaluate
before depending**, on: last release date, PGS v2 (not v1) / Play Billing
Library 8+, Capacitor 8 support, and whether an iOS side exists.

| Need | Candidates seen 2026-08-15 | Notes |
|---|---|---|
| PGS achievements + saved games | `openforge/capacitor-game-connect` (also Game Center), `scottcl88/capacitor-google-game-services` (Android only, claims saved games), `gammafp/capacitor-play-games-services` | Cross-platform one is attractive for iOS later; verify it is v2 |
| Play Billing | RevenueCat `@revenuecat/purchases-capacitor`; `cordova-plugin-purchase` (works under Capacitor) | RevenueCat = a third-party service in the loop, least code, they track BL versions. `cordova-plugin-purchase` = no third party, more code, **verify it bundles BL 8+**. **Decision pending — Dakota's** |

**Escape hatch:** if no plugin is fit, writing a local Capacitor plugin is a
normal, documented thing — one Kotlin class per service, a few dozen lines each
against the PGS v2 and Billing SDKs. It is more work than `npm install` and less
than it sounds. Do not let a stale plugin block the build.

### PGS behaviour to implement

- `PlayGamesSdk.initialize` on launch (the plugin does this); PGS v2 signs the
  player in automatically. Check `isAuthenticated`; if false, show a sign-in
  control somewhere unobtrusive — the quality checklist expects one
- Unlock / increment / reveal on ledger events; `load` on start for reconciliation
- Saved Games: one snapshot named e.g. `ledger`, the ledger JSON, ≤3 MB by a
  mile. Conflict resolution: union of unlocks, max of counters
- Achievements UI: PGS's own overlay via `showUI()`, or the app's own list, or
  both

### Billing behaviour to implement

- One non-consumable product, `$0.99` tier
- On every launch: query purchases → entitlement. This is restore; there is no
  other restore
- Acknowledge purchases (unacknowledged ones refund after three days — plugins
  do this, verify)
- Handle `PENDING` (deferred payment methods) — treat as not entitled until it
  resolves
- Test with licence-tester accounts before any real money

## 5. Build sequence — technical

### Toolchain — what a fresh machine needs

Established 2026-08-15 on Windows 11. None of it costs anything.

| Piece | Where it came from | Note |
|---|---|---|
| Android Studio | `winget install --id Google.AndroidStudio` | The installer is silent; the SDK arrives via the first-run wizard, which you must launch Studio once to get |
| SDK platform **36** | SDK Manager → SDK Platforms → **36.0** | The wizard installs 37.0 only. Not `36.1`, not the `-ext` variants |
| Build-tools 36, platform-tools | first-run wizard | Brings `adb` |
| SDK Command-line Tools | SDK Manager → SDK Tools | Gives `sdkmanager`; without it every SDK change is a GUI trip |
| **Temurin JDK 21** | `winget install --id EclipseAdoptium.Temurin.21.JDK` | **Required.** See §9 — Studio's bundled JDK 25 cannot run Gradle 8.14.3 |
| Android emulator | comes with "Standard" install | Not needed; testing is on the Pixel 9. A couple of GB if you care |

Building from the command line:

```
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
cd android; .\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

`android/local.properties` carries this machine's `sdk.dir` and is gitignored;
opening `android/` in Android Studio once regenerates it.

Device prerequisites: Developer options on, **USB debugging** on, and the phone
plugged **directly into the machine** — a USB-C dock will charge it and never
appear to `adb`. Cost fifteen minutes to work out, 2026-08-15.

### Steps

1. ~~**Scaffold.**~~ **Done 2026-08-15.** `package.json` at the v1 version,
   Capacitor 8.5.0, `cap init` with `com.schuckdata.pnm`, `cap add android`,
   CSP widened, `gradlew assembleDebug`, `adb install`. **No web files were
   moved**: `webDir` points straight at `v1/`, which is self-contained
   (own `lib/three`, all-relative paths), so the spike cost nothing to undo.
   Moving the tree to `www/` remains step 2's business.

   **Proved:** the v1 code runs unmodified inside the shell. Debug APK 4.4 MB.
   Renders correctly on the Pixel 9 — nodes, parastichy lines, transport bar,
   panel. No CSP violation, no console error, no crash. Generated project is
   AGP 8.13.0 / Gradle 8.14.3, `compileSdk` and `targetSdk` both 36, so the
   API-36 deadline is met by the template with nothing to configure.

   **Not proved — still open:** `?debug` was never run, so **no performance
   number has been taken**. §7 of `HANDOFF.md` still stands: the WebView fps
   and draw-call count are unmeasured. The HUD keys off `location.search`, and
   a Capacitor shell has no address bar, so measuring means attaching Chrome
   DevTools over `chrome://inspect` and setting `location.search = '?debug'`
   by hand. Do this before believing anything about performance.

   **Also unproved:** `sw.js` and `manifest.webmanifest` were bundled into the
   APK by the copy, because the spike deliberately stripped nothing. A live
   service worker inside the shell is trap #1 wearing a new coat. If a device
   build ever serves stale assets or raises an update prompt, that is why —
   and step 2 deletes both files anyway
2. ~~**Strip.**~~ **Done 2026-08-15.** The app got its OWN copy of the web code
   at `www/`, rather than the tree being moved — decided by Dakota so the live
   web builds keep working and §7's "fate of the web copy" stays genuinely open
   instead of being forced by a refactor. `webDir` points at `www/`.

   `www/` is now the LIVING codebase; `v1/` and the shipped root build are
   frozen web artifacts and receive no further work. Removed from `www/`:
   `sw.js`, `manifest.webmanifest`, the `<link rel=manifest>`, the `robots` meta,
   the service-worker registration, and the update-prompt half of `notices.js`
   (the error boundary stays, and matters more here — there is no address bar).

   `tools/check.mjs` now checks two kinds of build. The web builds keep the
   precache and CACHE_VERSION guards. The app build gets version agreement
   across `www/index.html` ↔ `package.json` ↔ `versionName`, a sane
   `versionCode`, and an ABSENCE guard that fails if `sw.js` or a manifest ever
   reappears under `www/` — the cheapest insurance against the bug that has cost
   this project the most
3. **Adapter + ledger.** `platform/` with the no-op fallback, `modules/achievements.js`
   with the designed list. Verify in a browser: unlocks fire, persist, survive
   reload
4. **PGS.** Choose/evaluate the plugin. Wire unlock, load, saved games. Verify on
   device: sign-in happens, an unlock appears in the Play Games app, uninstall →
   reinstall restores the ledger from the snapshot
5. **Billing.** Choose the plugin. Wire purchase, restore, entitlement, fake ads,
   purchase achievement. Verify with a licence tester: buy, restore after
   reinstall, refund path
6. **Assets and release build.** Icons/splash for the shell. Upload keystore
   generated locally, kept out of the repo, backed up. Play App Signing on. Build
   the AAB
7. **Internal test track**, then closed, then production

## 6. Build sequence — administrative (Play Console)

Steps marked ⚠ can only be done by Dakota.

| # | Step | Depends on |
|---|---|---|
| 1 | ⚠ Finish org account: identity verification, phone, **second Admin user** (only recovery path) | in progress as of 2026-08-10 |
| 2 | Create the app: **Game → Educational**, package `com.schuckdata.pnm`, free | 1 |
| 3 | **Play Games Services**: create the game project; Cloud project + OAuth consent screen; Android credential with the **app-signing** SHA-1 (from Play Console, not the upload key); define achievements (names, descriptions, icons, XP); enable Saved Games; add tester accounts; publish the PGS configuration | 2, §5 step 6 for the SHA-1 |
| 4 | ⚠ Merchant/payments profile, tax interview, payout account | 1 |
| 5 | Create the in-app product, `$0.99` | 4 |
| 6 | Add licence-tester Gmail accounts | 2 |
| 7 | Listing: feature graphic 1024×500 (does not exist), ≥2 phone screenshots, description | — |
| 8 | Data Safety: now declares Play Games identifiers (user IDs) shared with Google Play services; payments are Play-processed; no other collection | §4 |
| 9 | Content rating questionnaire (IARC) — a mathematics visualiser, expect the lowest rating | — |
| 10 | Ads declaration: verify whether bundled satirical self-ads count. Almost certainly not — they promote nothing external — but read the form's current text | — |
| 11 | ⚠ Accept policies and developer agreement | — |
| 12 | Internal test → closed test → production | all above |

`assetlinks.json` in the `schuck-data.github.io` repo is no longer used by
anything. Harmless; remove it if tidying that repo.

**Deadlines:** new submissions need target API 36 and Play Billing Library 8+
from **2026-08-31**; an extension to **2026-11-01** can be requested in the
console. Capacitor 8 covers the first; the billing plugin must cover the second.

## 7. Decisions still open

| Decision | Options | Owner |
|---|---|---|
| Billing plugin | RevenueCat (service, easiest) vs `cordova-plugin-purchase` (no third party) vs own plugin | Dakota |
| Web copy at schuckdata.com | Leave frozen as a free demo; or retire | Dakota |
| The achievement list | Design task; ten-plus, XP budget 2000 | together |
| Achievements UI | PGS overlay only, or an in-app list too | later, cheap either way |

## 8. Things that would foreclose iOS

Avoid these now so the second shell is only paperwork:

- Store IDs anywhere except the platform map
- Importing a plugin from anything other than `platform/`
- Choosing an Android-only game-services plugin without noting that iOS will
  need a second one behind the same adapter (acceptable, just know it)
- Anything in the web code depending on `https://localhost` specifically

## 9. Traps carried forward

- **Android Studio's bundled JDK is too new for its own Gradle.** Studio
  2026.1.3.7 ships JBR **25**; Gradle 8.14.3 supports at most Java 24 and dies
  with `Unsupported class file major version 69` while compiling its own build
  scripts — a message that says nothing about JDKs. Fix: install Temurin **21**
  (`winget install --id EclipseAdoptium.Temurin.21.JDK`) and point `JAVA_HOME`
  at it for command-line builds. Studio keeps using its own runtime for the IDE;
  the two coexist. Cost one build to find, 2026-08-15
- **The SDK wizard does not install the platform you need.** Its "Standard"
  install took platform **37.0** only. `compileSdk 36` needs `android-36`,
  installed by hand from the SDK Manager. Tick **Android SDK Command-line
  Tools** in the same pass or every later SDK change is another GUI trip
- **`adb install -r` does not clear the WebView's HTTP cache, and the WebView
  caches `https://localhost/`.** This one cost an hour on 2026-08-15 and looked
  exactly like a build failure: the APK provably contained the new `index.html`
  (verified by extracting it from the archive), `cap sync` had run, Gradle had
  rebuilt — and the running app showed the *previous* build's page. The tell is
  `document.title`, visible without any tooling in the DevTools page list.
  **Fix: `adb shell pm clear com.schuckdata.pnm` before relaunching**, or accept
  that any web-asset change may not appear. Note the irony and the lesson: the
  service worker was removed to end exactly this class of bug, and the platform
  has a second cache underneath it that behaves the same way
- **`?debug` has no address bar in a shell.** The HUD reads `location.search`.
  On device, measuring means Chrome DevTools over `chrome://inspect`. Any plan
  that says "append `?debug`" is written for the web build, not this one.
  Attaching from the command line works and is worth knowing:
  `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`, then the
  page list at `http://localhost:9222/json`. Caveat found the same day: Node's
  `fetch` is refused by that endpoint's DNS-rebinding guard while PowerShell's
  `Invoke-RestMethod` is accepted, and a forward that has been hit by a refused
  request tends to wedge — restart the adb server and use a fresh port
- **Do not pipe `adb exec-out screencap -p` through PowerShell.** Redirection
  mangles the binary. `adb shell screencap -p /sdcard/x.png` then `adb pull`
- **App-signing certificate, not upload key**, for the PGS Android credential —
  the same class of mistake as the old asset-links fingerprint
- **`?debug` on real hardware** before believing any performance claim. The
  Cowork browser pane never runs the render loop
- **Reset writes ~40 DOM values by hand** in `panel.js`; new controls for
  achievements or ads are each a chance to forget one
- **`state` is a mutable singleton and `HOT_KEYS` is unenforced.** New config
  keys for the ads/achievements modules must go in the right set
- **Version agreement** moves from `CACHE_VERSION` to `versionName`/`versionCode`.
  Play rejects a bundle whose `versionCode` did not increase; the guard should
  catch it before upload

## 10. What only Dakota can do

- Everything marked ⚠ in §6, plus D-U-N-S (the DBA trade style is still
  outstanding and nothing will remind you)
- The two decisions in §7 that are yours
- Generating and safeguarding the upload keystore; anything with credentials or
  payment details
- Device testing and judging how anything looks
