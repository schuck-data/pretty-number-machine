# Play Store Handoff — Pretty Number Machine

**For:** whoever picks up Burst 6 (Google Play submission).
**Read `PLAN.md` first** for the charter and history. This document covers
publishing only.

**Status when written:** 2026-08-06, v0.13.0. Nothing below has been executed.
No Play Console account exists. No TWA has been built. This is a briefing, not
a progress report.

---

## 0. What is already true

Verified, not assumed:

| Fact | Evidence |
|---|---|
| Live at `https://schuckdata.com/pretty-number-machine/` | HTTP 200, `http` 301s to `https` |
| Valid web app manifest | Served as `application/manifest+json`; name, `short_name` "PNM", `display: standalone`, `background_color`/`theme_color` `#0c0c0f` |
| Icons: 192, 512, 512-maskable, 180 apple-touch | In `icons/`, referenced from the manifest |
| Service worker active, correctly scoped | Scope `/pretty-number-machine/`, 24 files precached |
| Works with no network at all | Verified by killing the server and reloading |
| Zero third-party requests at runtime | Three.js and the font are vendored under `lib/` |
| **No data collection of any kind** | No analytics, no accounts, no telemetry, no cookies. Only a service-worker cache and one CSS custom property |
| Repo public | `github.com/schuck-data/pretty-number-machine`, all rights reserved |

That last row matters more than it looks: it makes the Data Safety form and
the privacy policy trivially honest. **Keep it that way.** Adding any analytics
turns a two-line privacy policy into a compliance surface.

---

## 1. The route: a Trusted Web Activity

A TWA is an Android app that is a thin, chromeless shell around a live HTTPS
URL. No native code, no rewrite, no second codebase.

- **Google accepts this.** A correctly configured TWA is a normal Play listing.
- **Apple does not.** App Store guideline 4.2 rejects thin web wrappers. That
  is why this project is Android-first. Do not spend effort on iOS here.

Two tools do the wrapping:

- **PWABuilder** (`pwabuilder.com`) — web UI, paste the URL, download a signed
  Android App Bundle. Easiest, and enough for this project.
- **Bubblewrap** (`@bubblewrap/cli`) — command line, needs Node, a JDK, and the
  Android SDK. More control, more setup.

**Recommendation: PWABuilder.** This app has no native requirements at all, and
Bubblewrap's toolchain setup is the larger share of the work.

---

## 2. THE TRAP — read this before anything else

This is the single most likely way to lose an afternoon.

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

The correct fix is to add an `include:` directive to that repo's `_config.yml`:

```yaml
include:
  - .well-known
```

Confirmed as of 2026-08-06: that repo has **no** `.nojekyll` and **no**
`include:` directive, and `https://schuckdata.com/.well-known/assetlinks.json`
returns **404**. So this work is entirely outstanding.

### 2c. Verify it before building anything

```bash
curl -i https://schuckdata.com/.well-known/assetlinks.json
```

Must return **200** with `content-type: application/json`. Google also has a
tester at
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://schuckdata.com&relation=delegate_permission/common.handle_all_urls`

---

## 3. Sequence

Order matters — later steps consume outputs from earlier ones.

1. **Play Console account.** $25 one time, plus identity verification. See §4
   for the schedule risk hiding in this step.
2. **Decide the package name**, e.g. `com.schuckdata.pnm`. **This is permanent.**
   It cannot be changed after publishing, ever.
3. **Generate the bundle** with PWABuilder from the live URL. Start URL should
   be `https://schuckdata.com/pretty-number-machine/`.
4. **Enrol in Play App Signing** (the default). Google holds the app signing
   key; you hold an upload key. Losing the upload key is recoverable; note it
   is not the same key as the one whose fingerprint goes in step 5.
5. **Write `assetlinks.json`** using the **SHA-256 fingerprint of the app
   signing certificate that Play Console shows you** — not the local upload
   key, unless you deliberately chose not to use Play App Signing. This is the
   second most common failure after §2. Include both if unsure; the file takes
   an array.
6. **Publish that file** to the user-site repo per §2, and verify with curl.
7. **Store listing** — assets and copy, §5.
8. **Data Safety form** — declare no collection, no sharing. True today.
9. **Content rating questionnaire** — a mathematics visualiser; expect the
   lowest rating everywhere.
10. **Internal test → closed test → production**, subject to §4.

---

## 4. The schedule risk — verify this first

Google has required that **new personal developer accounts run a closed test
with at least 12 testers for 14 continuous days** before they can apply for
production access. If that still applies, the gap between "app is ready" and
"app is public" is **two weeks plus twelve real humans**, not an afternoon.

**Do not take my word for this.** Policies change and this briefing has a date
on it. Confirm the current rule in Play Console before promising anyone a
timeline. If it applies, recruiting testers should start *before* the build
work, since it is the long pole.

An organisation account is exempt but requires a D-U-N-S number and costs more
in time and paperwork than the testing route for a project this size.

---

## 5. Assets and copy

### Have

- App icon 512×512 — `icons/icon-512.png` (three additive discs; it *is* 30 = 2×3×5)
- Maskable icon 512×512 — `icons/icon-512-maskable.png`, content inside the safe zone

### Need

- **Feature graphic, 1024×500.** Does not exist. Can be generated the same way
  the icons were — see `PLAN.md` rev 3; the generator script pattern is in the
  history.
- **Screenshots, minimum 2, phone aspect.** Take these on the Pixel 9 from the
  live site. Suggested set: (1) the default `Line` shape with the transport
  visible, (2) the lens half-drawn showing chalkboard and labels side by side —
  that one shows the whole idea in a single image, (3) a dense high-N sphere.
- **Privacy policy at a public URL.** Draft below. Host it in this repo, e.g.
  `privacy.html`, giving `https://schuckdata.com/pretty-number-machine/privacy.html`.

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

## 6. What only Dakota can do

Do not attempt these on his behalf:

- Creating and paying for the Play Console account
- Identity verification
- Accepting Play policies and the developer agreement
- Anything involving credentials, keys, or payment details
- Taking device screenshots
- Recruiting testers if §4 applies

---

## 7. Hazards specific to this app

- **The TWA points at the live site.** Publishing the app does not freeze the
  web app. A bad deploy to `main` breaks every installed copy immediately.
  There is no staging environment. Treat `main` as production from the day the
  app ships.
- **`CACHE_VERSION` matters more after launch, not less.** Installed users get
  the service worker's cached copy. Bump `CACHE_VERSION` in `sw.js` on every
  deploy that changes any precached file, or they sit on old code indefinitely.
- **A waiting service worker activates on relaunch, not on reload.** Do not
  conclude the update path is broken because a refresh did nothing. Close every
  copy and reopen. See `PLAN.md` §8.
- **GitHub Pages is the deploy path and it is not always fast.** During this
  project it suffered a multi-hour Actions/Pages outage: builds queued for 10+
  minutes, were cancelled, and errored, with nothing wrong in the repo. Check
  `githubstatus.com` before debugging a deploy.
- **Package name is permanent.** Decide deliberately.
- **Do not add analytics to satisfy a curiosity about usage.** It converts the
  privacy policy and Data Safety form from "we collect nothing" to a
  maintained claim. `PLAN.md` §6 item 8 records this tension honestly — the
  reach gate has no instrument, and that is a known, accepted trade.

---

## 8. Definition of done

- [ ] `https://schuckdata.com/.well-known/assetlinks.json` returns 200 with the
      correct package name and SHA-256 fingerprint
- [ ] App installs from an internal test track
- [ ] App launches **with no address bar** — this is the proof §2 worked
- [ ] App works in airplane mode after first launch
- [ ] Store listing complete: icon, feature graphic, ≥2 screenshots, both
      descriptions, privacy policy URL
- [ ] Data Safety form submitted declaring no collection
- [ ] Content rating received
- [ ] Production release live, or closed testing under way per §4

---

## 9. Things this document is not sure about

Stated plainly so nobody inherits a false certainty:

- **The 12-tester / 14-day rule** (§4). Believed current; must be re-checked.
- **Target API level requirements.** Play enforces a minimum that rises
  annually. PWABuilder's output is usually current, but verify at submission.
- **Whether PWABuilder's generated manifest matches ours exactly.** It reads
  the live manifest, but confirm `start_url`, `scope`, and orientation survive
  into the Android manifest before publishing.
- **Nothing in §§3–8 has been executed.** Every step is written from knowledge,
  not from having done it in this repo. Expect the console UI to have moved.
