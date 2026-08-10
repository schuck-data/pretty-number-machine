# Play Store Handoff — Pretty Number Machine

**For:** whoever runs the Google Play submission.
**Read `PLAN.md` (alongside this file) first** for the charter and history. This
document covers publishing only.

**Status when written:** 2026-08-10, **v0.14.2**. Nothing in §§3–8 has been
executed. No Play Console account exists. No TWA has been built. This is a
briefing, not a progress report.

*Supersedes the 2026-08-06 / v0.13.0 revision; git history has that version. The
route and the trap are unchanged. What moved: two open questions are now
answered with dates, one hazard was factually wrong, the store copy and
screenshot plan changed with the Dazzle feature, and there is a new performance
risk and a new pre-submission item.*

---

## 0. What is already true

Verified against the live origin on **2026-08-10**, not assumed:

| Fact | Evidence |
|---|---|
| Live at `https://schuckdata.com/pretty-number-machine/` | HTTP 200 |
| Manifest served correctly | `application/manifest+json; charset=utf-8` |
| Icons: 192, 512, 512-maskable (all confirmed square at size), 180 apple-touch | In `icons/`, referenced from the manifest |
| Service worker active, scoped to `/pretty-number-machine/` | 25 precache entries (24 distinct files — `./` and `./index.html` are the same document) |
| Works with no network at all | Server killed, network confirmed unreachable by an uncached probe, app loaded complete with WebGL live |
| Zero third-party requests at runtime | Three.js and the font vendored under `lib/`. The only external URL in source is the `http://www.w3.org` SVG namespace, which is a declaration, not a fetch |
| **No data collection of any kind** | No analytics, no accounts, no telemetry, no cookies. Only a service-worker cache and one CSS custom property |
| Repo public | `github.com/schuck-data/pretty-number-machine`, all rights reserved |

That data-collection row matters more than it looks: it makes the Data Safety
form and the privacy policy trivially honest. **Keep it that way.** Adding any
analytics turns a two-line privacy policy into a compliance surface.

Note the surrounding site is not the app: `schuckdata.com` itself loads Google
Fonts. The app does not. If the privacy policy is hosted under the app's path,
that distinction is worth keeping straight.

---

## 1. The route: a Trusted Web Activity

A TWA is an Android app that is a thin, chromeless shell around a live HTTPS
URL. No native code, no rewrite, no second codebase.

- **Google accepts this.** A correctly configured TWA is a normal Play listing.
- **Apple does not.** App Store guideline 4.2 rejects thin web wrappers. That
  is why this project is Android-first. Do not spend effort on iOS here.

Two tools do the wrapping:

- **PWABuilder** (`pwabuilder.com`) — web UI, paste the URL, download a signed
  Android App Bundle.
- **Bubblewrap** (`@bubblewrap/cli`) — command line, needs Node, a JDK, and the
  Android SDK. More control, more setup.

**Recommendation: PWABuilder**, but see §4 — the target API requirement may
decide this for you.

---

## 2. THE TRAP — read this before anything else

Still the single most likely way to lose an afternoon. **Re-confirmed
2026-08-10: entirely outstanding.**

A TWA only loses the browser address bar if the site proves it authorises the
app, via **Digital Asset Links**: a file at

```
https://schuckdata.com/.well-known/assetlinks.json
```

Two things about that path are project-specific and easy to get wrong.

### 2a. It is not in this repository

Asset links are verified at the **domain root**, not at the app's path. The app
lives at `schuckdata.com/pretty-number-machine/`, but the file must sit at
`schuckdata.com/.well-known/`, and that root is served by a **different repo**:

```
schuck-data/schuck-data.github.io      ← the file goes HERE
schuck-data/pretty-number-machine      ← NOT here
```

Putting it in this repo publishes it at
`schuckdata.com/pretty-number-machine/.well-known/assetlinks.json`, which
Android never looks at. The app will install and run but always show a URL bar.

### 2b. Jekyll will silently drop it

`schuck-data.github.io` is a Jekyll site, and **Jekyll excludes files and
directories beginning with a dot by default.** `.well-known/` is exactly that.
Commit it and it will simply not appear on the built site — no error, no
warning, a 404.

The usual fix — adding `.nojekyll` — **will break that site**, because its
`_config.yml` depends on the `jekyll-redirect-from` plugin for its legacy
uppercase URLs. Do not disable Jekyll there.

The correct fix is an `include:` directive in that repo's `_config.yml`:

```yaml
include:
  - .well-known
```

**Confirmed 2026-08-10:** that repo has **no** `.nojekyll` (correct — keep it
that way) and **no** `include:` directive, and
`https://schuckdata.com/.well-known/assetlinks.json` returns **404**.

### 2c. Verify it before building anything

```bash
curl -i https://schuckdata.com/.well-known/assetlinks.json
```

Must return **200** with `content-type: application/json`. Google also has a
tester at
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://schuckdata.com&relation=delegate_permission/common.handle_all_urls`

**While you are in that repo**, it also needs a link to the app from
`/artmath/` — PNM is currently reachable only by knowing the URL. Nothing on
`schuckdata.com` links to it. Same repo, same visit.

---

## 3. Sequence

Order matters — later steps consume outputs from earlier ones.

1. **Play Console account.** $25 one time, plus identity verification. See §4
   for the schedule risk hiding in this step.
2. **Decide the package name**, e.g. `com.schuckdata.pnm`. **This is permanent.**
   It cannot be changed after publishing, ever.
3. **Build the update prompt** (§6). Small, self-contained, and much easier
   before submission than after.
4. **Low-end device check** (§7). Also easier before than after.
5. **Generate the bundle** targeting **API 36** — see §4. Start URL
   `https://schuckdata.com/pretty-number-machine/`.
6. **Enrol in Play App Signing** (the default). Google holds the app signing
   key; you hold an upload key.
7. **Write `assetlinks.json`** using the **SHA-256 fingerprint of the app
   signing certificate that Play Console shows you** — not the local upload
   key, unless you deliberately declined Play App Signing. This is the second
   most common failure after §2. Include both if unsure; the file takes an array.
8. **Publish that file** to the user-site repo per §2, and verify with curl.
9. **Store listing** — assets and copy, §5.
10. **Data Safety form** — declare no collection, no sharing. True today.
11. **Content rating questionnaire** — a mathematics visualiser; expect the
    lowest rating everywhere.
12. **Internal test → closed test → production**, subject to §4.

---

## 4. Two dated deadlines — both verified 2026-08-10

### 4a. The tester requirement

**Confirmed still current.** New **personal** developer accounts created after
**2023-11-13** must run a closed test with at least **12 testers who stay opted
in for 14 continuous days** before applying for production access.

So the gap between "app is ready" and "app is public" is **two weeks plus
twelve real humans**, not an afternoon. If it applies, recruiting testers is the
long pole and should start *before* the build work.

Organisation accounts are exempt but need a D-U-N-S number, which costs more in
time and paperwork than the testing route for a project this size.

### 4b. Target API level — this one has a date on it

From **2026-08-31**, new submissions must target **Android 16 (API 36)**. An
extension to 2026-11-01 can be requested via a form in Play Console.

**This almost certainly binds you.** Work the timeline backwards: account
setup takes days, then 14 days of closed testing, then production review. A
submission started now lands *after* 31 August. **Target API 36 from the very
first upload** rather than shipping 35 and re-cutting.

**This may decide the tool.** If PWABuilder's output cannot be set to API 36,
Bubblewrap takes an explicit `targetSdkVersion` in `twa-manifest.json`. Check
before committing to PWABuilder.

---

## 5. Assets and copy

### Have

- App icon 512×512 — `icons/icon-512.png`, confirmed 512×512 (three additive
  discs; it *is* 30 = 2×3×5)
- Maskable icon 512×512 — `icons/icon-512-maskable.png`, content inside the
  safe zone

### Need

- **Feature graphic, 1024×500.** Does not exist. Can be generated the same way
  the icons were — see `PLAN.md` rev 3.
- **Screenshots, minimum 2, phone aspect.** Take these on the Pixel 9 from the
  live site. **Use Dazzle** (the sparkle button, below the corner Reset) — it
  is a one-tap preset that produces a dense, colourful, overhead disk, and
  crucially it is *reproducible*: the same frame every time, instead of
  hand-tuning sliders and hoping the morph is somewhere flattering when you hit
  the shutter.
  Suggested set: (1) Dazzle, as the hero; (2) the lens half-drawn, chalkboard
  and labels beside the plain view — that one shows the whole idea in a single
  image; (3) the default Line shape with the transport visible, as the honest
  "what you actually open to".
- **Privacy policy at a public URL.** Draft below. Host it in this repo as
  `privacy.html`, giving
  `https://schuckdata.com/pretty-number-machine/privacy.html`. Does not exist yet.

### Draft short description (≤80 characters)

```
A number's colour is its factorisation. 2 red, 3 green, 5 blue, 6 yellow.
```

### Draft full description

```
Pretty Number Machine draws the whole numbers as points in space and colours
each one by what it is made of.

2 is red. 3 is green. 5 is blue. So 6 is yellow, because 6 = 2 x 3 and red
plus green is yellow. 30 goes white, because it is 2 x 3 x 5 and that is all
three colours at once.

Nothing is looked up. The colour is computed from the factors, so numbers that
are mathematically related look related — and patterns in the primes become
patterns you can see.

- Tap Dazzle for the whole thing at once: every prime, a thousand numbers,
  colour drifting across the field
- Morph between six arrangements: line, disk, sphere, chord, spring, string
- Choose which primes to colour by
- Pull the classroom lens across for labelled numbers and tap-for-info
- Works completely offline
- No accounts, no ads, no tracking of any kind
```

### Draft privacy policy

```
Privacy Policy — Pretty Number Machine

Pretty Number Machine collects no data.

There are no accounts, no analytics, no advertising, no cookies, and no
telemetry. Nothing you do in the app is transmitted anywhere, because the app
does not contact any server once it has loaded. It works with no network
connection at all.

The app stores a copy of its own files on your device so that it can run
offline. That cache contains no personal information and is removed when you
uninstall the app or clear its storage.

No information is shared with anyone, because none is gathered.

Contact: dakota@schuckdata.com
Last updated: [DATE]
```

---

## 6. Build the update prompt before submitting

This is new in this revision, and it is the one code change worth making before
the store.

As of v0.14.2 the service worker serves **everything** cache-first, including
the navigation. That was a bug fix, not a preference — navigations used to be
network-first while scripts were cache-first, which let a returning visitor run
new HTML against old JavaScript. On 2026-08-09 that combination took the live
app down: `initPanel()` threw on a slider v0.14.0 had deleted, and every
returning visitor got the menu and buttons with no figure. See `PLAN.md` rev 12.

The fix means a client now runs one generation of the app or another, never a
mixture. The cost is that **an update is invisible until every copy of the app
is closed** — previously true of the JavaScript, now also of the markup.

For a browser tab that is fine. For an installed TWA it is not: someone may
leave the app open for weeks and never see a new version. `PLAN.md` §6 item 6
has long listed an "update available — reload" toast as the answer if this ever
bit. It has bitten, and it is now the *only* way a long-lived client learns
there is something newer.

Do **not** reach for `skipWaiting()` — swapping the worker under a live WebGL
scene is the problem that rule exists to prevent.

---

## 7. Hazards specific to this app

- **Dazzle is a one-tap path to the heaviest scene the app can draw.** 1001
  individual meshes at node size 2, with node pulse, line pulse, and colour
  drift recolouring every node every frame. Before Dazzle, reaching that load
  took deliberate slider work; now it is the second button a curious person
  presses — including a reviewer on whatever device they have. `PLAN.md` §6
  item 3 records that low-end Android performance is still unknown and that the
  Pixel 9 flatters the app. **Test Dazzle on something slow before submitting.**
  If it struggles, the cheap levers are a lower N or gating colour drift above
  a node count.

- **The TWA points at the live site.** Publishing the app does not freeze the
  web app. There is no staging environment. Treat `main` as production from the
  day the app ships.

- **A bad deploy no longer breaks installed copies instantly — but only by
  about one relaunch.** *(Corrected in this revision; the previous draft said
  "immediately", which was true only while navigations were network-first.)*
  Since v0.14.2 an installed copy keeps running its cached generation until the
  new worker activates, which needs every copy closed. So a bad push reaches
  users roughly one app-lifecycle later. That is a small revert window you did
  not previously have. The inverse also holds: **a fix does not reach them
  immediately either.**

- **`CACHE_VERSION` matters more after launch, not less.** Bump it in `sw.js`
  on every deploy that changes any precached file. Skipping it does not merely
  leave users stale — before v0.14.2 it could leave them broken, and it will
  still strand them on old code indefinitely.

- **A waiting service worker activates on relaunch, not on reload.** Do not
  conclude the update path is broken because a refresh did nothing. Close every
  copy and reopen.

- **A LAN-served build cannot reproduce a service-worker bug.** Plain HTTP to
  an IP is not a secure context, so no worker registers and every load is
  coherent by construction. Excellent for testing app code, useless for testing
  the update path. This is exactly how the v0.14.0 breakage slipped through.
  Anything about caching or versions must be checked against the real HTTPS
  origin.

- **GitHub Pages is the deploy path and it is not always fast.** During this
  project it suffered a multi-hour Actions/Pages outage: builds queued for 10+
  minutes, were cancelled, and errored, with nothing wrong in the repo. Check
  `githubstatus.com` before debugging a deploy.

- **Package name is permanent.** Decide deliberately.

- **Do not add analytics to satisfy a curiosity about usage.** It converts the
  privacy policy and Data Safety form from "we collect nothing" into a
  maintained claim. `PLAN.md` §6 item 8 records this tension honestly — the
  reach gate has no instrument, and that is a known, accepted trade.

---

## 8. What only Dakota can do

Do not attempt these on his behalf:

- Creating and paying for the Play Console account
- Identity verification
- Accepting Play policies and the developer agreement
- Anything involving credentials, keys, or payment details
- Taking device screenshots
- Recruiting testers if §4a applies

---

## 9. Definition of done

- [ ] `https://schuckdata.com/.well-known/assetlinks.json` returns 200 with the
      correct package name and SHA-256 fingerprint
- [ ] Bundle targets API 36 (§4b)
- [ ] Update prompt shipped (§6)
- [ ] Dazzle checked on a low-end device (§7)
- [ ] App installs from an internal test track
- [ ] App launches **with no address bar** — this is the proof §2 worked
- [ ] App works in airplane mode after first launch
- [ ] Store listing complete: icon, feature graphic, ≥2 screenshots, both
      descriptions, privacy policy URL
- [ ] Data Safety form submitted declaring no collection
- [ ] Content rating received
- [ ] Production release live, or closed testing under way per §4a

---

## 10. Things this document is not sure about

Stated plainly so nobody inherits a false certainty:

- **Whether PWABuilder can target API 36.** Not tested. If it cannot,
  Bubblewrap can. Verify before choosing the tool (§4b).
- **Whether PWABuilder's generated manifest matches ours.** It reads the live
  manifest, but confirm `start_url`, `scope` and orientation survive into the
  Android manifest before publishing.
- **Low-end device performance**, for the app generally and Dazzle in
  particular. Never measured on anything but a Pixel 9.
- **Nothing in §§3–9 has been executed.** Every step is written from knowledge,
  not from having done it. Expect the console UI to have moved.

Resolved since the previous revision, both verified 2026-08-10 and now stated
as fact in §4: the 12-tester rule, and the target API level requirement.
