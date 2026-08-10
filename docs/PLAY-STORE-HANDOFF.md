# Play Store Handoff — Pretty Number Machine

**For:** whoever runs the Google Play submission.
**Read `PLAN.md` (alongside this file) first** for the charter and history. This
document covers publishing only.

**Status:** 2026-08-10, **v0.14.2**. **Execution has started.** §4 steps 1–2 are
done: the address is decided, and the D-U-N-S number was requested and **issued
the same day** — it was expected to take up to 30 business days and did not
(§3a). **Step 3 is done: the Play Console organisation account exists and its
identity verification is in progress**, expected to take a few days. Everything
from step 4 onward is still a briefing. No TWA has been built.

*Third revision of 2026-08-10; git history has the earlier two. The route (§1)
and the trap (§2) are otherwise unchanged. What moved in this one: §4 steps 1–2
are done and step 3 is unblocked and next. Two things were learned the hard way
and are recorded at their steps rather than here: organisation signup takes the
D-U-N-S number as a required input, so the steps cannot be overlapped; and the
published "up to 30 business days" for that number was a worst case, not a
forecast — it arrived the same day. The trade-style
item slipped to later and is tracked in §10 so it does not vanish. The home
address is recorded as knowingly public (§3c). And the build tool flipped from
PWABuilder to Bubblewrap on evidence (§1, §5b) — that was an open question in
the previous revision and is the one change here that alters real work.*

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
| **Manifest declares `"orientation": "any"`** | Read from `manifest.webmanifest` 2026-08-10. Matters because API 36 stops apps locking orientation or aspect ratio on screens ≥600dp — a real migration hazard for other apps, and a non-issue for this one. Do not let a build tool substitute a fixed orientation |

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

**Recommendation: Bubblewrap.** *Reversed 2026-08-10 — previous revisions said
PWABuilder.* PWABuilder is by far the friendlier tool, and it drives Bubblewrap
under the hood anyway, but it does not expose the one setting that has a
deadline attached to it. See §5b for the evidence.

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

## 3. The account: organisation, the DBA, and the paid-app trap

**Decided 2026-08-10.** This section is new. It changes the order of work in
§4 and it contains a one-way door. Read it before opening Play Console.

### 3a. Organisation account, not personal

The account will be an **organisation** account for Schuck Data, created under
`dakota@schuckdata.com` — a Google Workspace identity on the `schuckdata.com`
domain, administered from `ds89holdco@gmail.com`.

The previous revision recommended a personal account, on the grounds that
D-U-N-S paperwork costs more time than the testing route. That trade was
reweighed and reversed: an organisation account is **exempt from the
12-tester / 14-day rule** (§5a), and it is the correct long-term home for
anything Schuck Data publishes.

**Consequence: a D-U-N-S number is required.** It was expected to be the long
pole — free requests are published as taking up to **30 business days**, with
expedited at about eight for a fee.

**It was not. Requested and issued the same day, 2026-08-10.** Recorded because
the whole schedule was planned around that 30-day figure and it turned out to be
a worst case rather than a forecast. If any future step quotes a similar range,
test it before building a plan on it.

**The legal name and address in the Google payments profile must match the Dun
& Bradstreet record.** Mismatch is the standard verification rejection. Decide
the address once and use it identically in both places.

### 3b. The DBA is the developer name, the legal name is not

The business trades under a **Pennsylvania fictitious name (DBA)** that differs
from its registered legal name. The store should show the DBA. That is
supported, and it needs no workaround — these are four separate fields:

| Field | Value | Public? |
|---|---|---|
| Play Console **developer name** | the DBA | **Yes** — shown under the app title |
| Payments profile **legal name + address** | registered legal name | Address yes, see §3c |
| D&B record **legal name** | registered legal name | No |
| D&B record **trade style** | the DBA | No |

Google's documentation states the developer name "can differ from legal
organization name." The D-U-N-S ↔ legal-name match therefore happens entirely
inside verification and never reaches the store page.

Adding the DBA as a **trade style** on the D&B record is free for US non-public
companies through D-U-N-S Manager. Google does not require it. Do it anyway —
it puts the DBA and the legal entity on one record, which is cheap insurance if
a reviewer ever asks why the store name differs from the verified name.

**Deferred 2026-08-10.** The D-U-N-S request was filed and the form never asked
for a trade style, so this is outstanding. It is exactly the kind of item that
gets forgotten, because nothing blocks on it and no error will ever mention it.
Once the number is issued, add the DBA through D-U-N-S Manager. Tracked in §10.

Before committing to the name: **developer names cannot be identical across
accounts.** Search Google Play for the DBA first.

### 3c. Charging 99¢ — and the door that only opens one way

**Decided: the app ships paid at $0.99. The web version at
`schuckdata.com/pretty-number-machine/` stays free and public.**

> ⚠️ **Once an app has been offered for free, it can never be changed to paid.**
> Paid → free works. Free → paid does not. The only remedy is a new listing with
> a **new package name** — and the package name is permanent (§8). A mistake
> here does not cost a setting, it costs the listing.

So the price must be set **before the first production release**, and a price
cannot be set at all until a **merchant account exists**. Merchant setup is
therefore on the critical path, not a late detail — this is the main reason §4
was reordered. Test tracks distribute free to testers regardless of price, so
internal and closed testing do not trip the lock; set the price early anyway,
because there is no upside to waiting.

Three further consequences of charging:

- **The legal address becomes public, and here it is a home address.** Merchant
  accounts selling paid apps display the legal address on the store listing;
  free apps do not. This entity's business address *is* the owner's home
  address, and the D-U-N-S request was filed with it on 2026-08-10. **That was
  known and accepted, not overlooked** — the home address will appear on the
  public Play listing. Changing it later is a re-verification across both D&B
  and the payments profile, not an edit, so if it is ever revisited, revisit it
  deliberately rather than mid-submission.
- **A tax interview is required** before payouts release: a W-9 against the
  entity's EIN, plus a payout bank account.
- **The economics.** Google's fee structure changed on **2026-06-30**; service
  fee and billing fee are now charged separately in the US, UK and EEA.

  | | |
  |---|---|
  | List price | $0.99 |
  | Service fee, first $1M/year | 10% |
  | Billing fee, Google Play billing | 5% |
  | **Net per sale** | **~$0.84** |

  Sales tax and VAT are collected and remitted by Google in most jurisdictions.

**The accepted trade, recorded so nobody re-litigates it.** A buyer can reach
the identical app free in a browser, and Play's two-hour automatic refund makes
acting on that discovery frictionless. This is a refund-rate and review-score
risk, not a policy violation — paid wrappers are permitted. It was weighed on
2026-08-10 and accepted, deliberately: **the free web version stays up.** Do not
quietly take it down, gate it, or degrade it to protect the paid listing. That
was not the decision.

### 3d. Do not lock yourself out

Play Console binds permanently to the account that creates it, and owner
transfer is a Google support process rather than a settings change. Create it as
`dakota@schuckdata.com`, then **immediately add a second user with Admin
permissions** as a recovery path, so a Workspace lapse or a domain problem does
not take the listing with it.

---

## 4. Sequence

Order matters — later steps consume outputs from earlier ones. Steps 1–7 are
new or reordered in this revision; they exist because of §3.

1. ✅ **Decide the public-facing address** (§3c). **Done 2026-08-10** — the
   business address is the owner's home address, accepted as public.
2. ✅ **Request the D-U-N-S number** (§3a). **Issued 2026-08-10, same day.**
   The request form never offered a trade style, so the DBA still has to be
   added afterwards through D-U-N-S Manager (§3b).
3. 🕐 **Play Console organisation account.** $25 one time, plus identity and
   business verification against the D-U-N-S record. **Created 2026-08-10;
   identity verification in progress.** The console shows an amber "Verify your
   identity — your identity verification is in progress, please allow a few
   days" alert. Verification required **uploading supporting documents**, not
   just typing the D-U-N-S number, so have entity paperwork to hand before
   starting rather than mid-form.
   *Recorded because it cost a wrong turn: the organisation signup form takes
   the D-U-N-S number as a required input, so this genuinely cannot be started
   before step 2 completes — tested, not assumed. An earlier draft claimed the
   two could overlap, citing a Google help page about self-chosen, extendable
   verification deadlines. That page covers accounts that **already exist** —
   the pre-September-2023 cohort being retro-verified — not new organisation
   signup.*
   Sign in as `dakota@schuckdata.com` *before* starting — the account binds
   permanently to whichever identity creates it, and the Workspace admin
   identity (`ds89holdco@gmail.com`) is the wrong one (§3d).
4. **Add a second Admin user** (§3d).
5. **Merchant / payments profile**, tax interview, payout bank account (§3c).
6. **Decide the package name**, e.g. `com.schuckdata.pnm`. **This is permanent.**
   It cannot be changed after publishing, ever.
7. **Set the app to Paid at $0.99 — before any production release** (§3c).
8. **Build the update prompt** (§7). Small, self-contained, and much easier
   before submission than after.
9. **Low-end device check** (§8). Also easier before than after.
10. **Generate the bundle** targeting **API 36** — see §5b. Start URL
    `https://schuckdata.com/pretty-number-machine/`.
11. **Enrol in Play App Signing** (the default). Google holds the app signing
    key; you hold an upload key.
12. **Write `assetlinks.json`** using the **SHA-256 fingerprint of the app
    signing certificate that Play Console shows you** — not the local upload
    key, unless you deliberately declined Play App Signing. This is the second
    most common failure after §2. Include both if unsure; the file takes an array.
13. **Publish that file** to the user-site repo per §2, and verify with curl.
14. **Store listing** — assets and copy, §6.
15. **Data Safety form** — declare no collection, no sharing. True today.
16. **Content rating questionnaire** — a mathematics visualiser; expect the
    lowest rating everywhere.
17. **Internal test → closed test → production**, subject to §5.

---

## 5. Two dated deadlines — both verified 2026-08-10

### 5a. The tester requirement — does not apply, but know why

**Confirmed still current.** New **personal** developer accounts created after
**2023-11-13** must run a closed test with at least **12 testers who stay opted
in for 14 continuous days** before applying for production access.

**Organisation accounts are exempt**, and §3a chose an organisation account
partly for this reason. The two-weeks-plus-twelve-humans gap therefore does
*not* apply here.

It applies again the moment the organisation route fails. If verification
cannot be completed — no D-U-N-S, a name mismatch, an entity problem — and the
account falls back to personal, this requirement returns and becomes the long
pole. Do not plan as though it is impossible; plan as though it is contingent.

### 5b. Target API level — this one has a date on it

From **2026-08-31**, new submissions must target **Android 16 (API 36)**. An
extension to 2026-11-01 can be requested via a form in Play Console.

**This almost certainly binds you.** Work the timeline backwards: the D-U-N-S
request alone can take up to 30 business days (§3a), then account verification,
then merchant setup, then production review. A submission begun on 2026-08-10
lands well *after* 31 August. **Target API 36 from the very first upload**
rather than shipping 35 and re-cutting. The 2026-11-01 extension is the
realistic fallback if the D-U-N-S wait runs long.

**This decided the tool.** *Investigated 2026-08-10; this was an open question
in the previous revision and is now answered against PWABuilder.*

PWABuilder generates its Android package **through Bubblewrap**, pinned to
`targetSdkVersion 35` while `compileSdkVersion` is already 36. Three issues were
filed about exactly this — [#6159](https://github.com/pwa-builder/PWABuilder/issues/6159)
(2026-07-21), [#6160](https://github.com/pwa-builder/PWABuilder/issues/6160),
[#6167](https://github.com/pwa-builder/PWABuilder/issues/6167) — with #6160 and
#6167 both closed as duplicates of #6159. **Honest limit: all three read as
closed, and the comment threads were not retrievable, so whether a fix has
shipped is unconfirmed.** The last direct report of the generated output, in
July 2026, was API 35.

Use **Bubblewrap directly**. It takes an explicit `targetSdkVersion` in
`twa-manifest.json`, which is the same pipeline PWABuilder would have used
without the dependency on someone else's release cycle for a dated requirement.
The cost is setup: Node, a JDK, and the Android SDK. That is a one-afternoon
cost against a deadline that removes the app from sale.

If PWABuilder is used anyway, **verify the emitted `targetSdkVersion` in the
generated `build.gradle` before uploading** — do not trust the tool's own
description of what it produced.

---

## 6. Assets and copy

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
- ✅ **Privacy policy at a public URL.** **Written 2026-08-10** as `privacy.html`
  in this repo, giving
  `https://schuckdata.com/pretty-number-machine/privacy.html`. Styled to match
  the app — same self-hosted Space Grotesk, same `#0c0c0f` — and verified to
  make **zero external requests**, which matters because it is the document
  asserting the app contacts nobody. Shipping it required a service-worker fix;
  see §8. The text below is what it says.

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

Unaffected by the move to a paid app: purchases are handled entirely by Google
Play, and the app itself never sees a transaction.

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

## 7. Build the update prompt before submitting

This is the one code change worth making before the store.

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

## 8. Hazards specific to this app

- **Dazzle is a one-tap path to the heaviest scene the app can draw.** 1001
  individual meshes at node size 2, with node pulse, line pulse, and colour
  drift recolouring every node every frame. Before Dazzle, reaching that load
  took deliberate slider work; now it is the second button a curious person
  presses — including a reviewer on whatever device they have. `PLAN.md` §6
  item 3 records that low-end Android performance is still unknown and that the
  Pixel 9 flatters the app. **Test Dazzle on something slow before submitting.**
  If it struggles, the cheap levers are a lower N or gating colour drift above
  a node count. Charging money raises the stakes: a paying buyer who sees it
  stutter has a refund button two taps away (§3c).

- **The service worker answers navigations for the entire scope, so any new
  standalone page is invisible until it is explicitly excluded.** *Found and
  fixed 2026-08-10 while adding `privacy.html`.* `sw.js` served the cached app
  shell for every same-origin navigation in scope — correct while the app was
  the only document in it. `privacy.html` broke that: anyone who had ever opened
  the app and then followed the privacy link was handed the app instead of the
  policy. **The dangerous part is the asymmetry.** A first-time visitor has no
  worker, gets the real page from the network, and sees nothing wrong — so this
  would have passed Play review and failed only for the people who actually use
  the app. Reproduced on localhost with a live worker, fixed with an explicit
  exclusion, and re-verified. **Any future standalone page needs the same
  exclusion, and nothing in the tooling will remind you.**

- **The TWA points at the live site.** Publishing the app does not freeze the
  web app. There is no staging environment. Treat `main` as production from the
  day the app ships.

- **A bad deploy no longer breaks installed copies instantly — but only by
  about one relaunch.** Since v0.14.2 an installed copy keeps running its cached
  generation until the new worker activates, which needs every copy closed. So a
  bad push reaches users roughly one app-lifecycle later. That is a small revert
  window you did not previously have. The inverse also holds: **a fix does not
  reach them immediately either.**

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

- **Two permanent decisions, neither reversible.** The package name, and
  free-versus-paid (§3c). Both are decided once and live with the listing.

- **The free web version is deliberate, not an oversight.** §3c records the
  reasoning. If a future reader wonders why a paid app is also free on the web,
  the answer is that it was weighed and accepted — do not "fix" it.

- **Do not add analytics to satisfy a curiosity about usage.** It converts the
  privacy policy and Data Safety form from "we collect nothing" into a
  maintained claim. `PLAN.md` §6 item 8 records this tension honestly — the
  reach gate has no instrument, and that is a known, accepted trade. Sales
  figures in Play Console are now a partial instrument, and they arrive without
  costing anything on the privacy side. Use those instead.

---

## 9. What only Dakota can do

Do not attempt these on his behalf:

- Requesting the D-U-N-S number and anything else involving Dun & Bradstreet
- Creating and paying for the Play Console account
- Identity and business verification
- The merchant/payments profile, the tax interview (W-9), and the payout bank
  account
- Setting the price
- Accepting Play policies and the developer agreement
- Anything involving credentials, keys, or payment details
- Taking device screenshots
- Recruiting testers, in the contingency where §5a comes back into play

---

## 10. Definition of done

**Account and money**

- [x] D-U-N-S number issued *(requested and issued 2026-08-10)*
- [ ] DBA added as a trade style through D-U-N-S Manager — **deferred from the
      initial request; nothing blocks on it and no error will ever mention it,
      which is exactly why it will be forgotten** (§3b)
- [ ] Payments profile legal name and address match the D&B record exactly
- [ ] Organisation account verified — not fallen back to personal (§5a)
- [ ] Second user added with Admin permissions (§3d)
- [ ] Merchant account live, tax interview complete, payout bank account attached
- [ ] **App set to Paid at $0.99 before any production release** (§3c)
- [ ] Developer name on the listing shows the DBA, not the legal name

**Build and listing**

- [ ] `https://schuckdata.com/.well-known/assetlinks.json` returns 200 with the
      correct package name and SHA-256 fingerprint
- [ ] Bundle targets API 36 (§5b)
- [ ] Update prompt shipped (§7)
- [ ] Dazzle checked on a low-end device (§8)
- [ ] App installs from an internal test track
- [ ] App launches **with no address bar** — this is the proof §2 worked
- [ ] App works in airplane mode after first launch
- [ ] Store listing complete: icon, feature graphic, ≥2 screenshots, both
      descriptions, privacy policy URL
- [ ] Data Safety form submitted declaring no collection
- [ ] Content rating received
- [ ] Production release live

---

## 11. Things this document is not sure about

Stated plainly so nobody inherits a false certainty:

- **Whether PWABuilder has since shipped API 36.** The three tracking issues all
  read as closed but their comment threads could not be retrieved (§5b). This
  no longer blocks anything — Bubblewrap is the choice regardless — but the
  claim "PWABuilder cannot do 36" should be stated as "was not confirmed to",
  not as settled fact.
- **Whether the generated Android manifest matches ours.** Whichever tool is
  used, confirm `start_url` and `scope` survive into the Android manifest before
  publishing. Orientation is no longer a worry — see §0.
- **Whether a paid TWA behaves identically to a free one.** No reason to expect
  otherwise — the purchase gates the install, not the content — but it has not
  been observed. Confirm on the internal test track before production.
- **How long the D-U-N-S request actually takes for this entity.** "Up to 30
  business days" is the published range, not a prediction. It may be instant.
  The whole schedule hangs off this number, so find out early (§4 step 2).
- **Low-end device performance**, for the app generally and Dazzle in
  particular. Never measured on anything but a Pixel 9.
- **Only §4 steps 1–3 have been executed**, and step 3 only as far as
  submission — verification has not yet come back. Everything from step 4 onward
  is written from knowledge, not from having done it. Expect the console UI to
  have moved.
- **What can be done while verification is pending.** Unknown. Whether the
  merchant/payments profile (step 5) or the price (step 7) can be set before
  identity verification clears has not been tested. Do not assume it
  parallelises — that assumption was already wrong once, at step 3. Look in the
  console and record the answer here.

Resolved since the previous revision, all verified 2026-08-10 and now stated as
fact above: the 12-tester rule and why it does not bind (§5a); the target API
level requirement (§5b); that the developer name may differ from the verified
legal name (§3b); that free → paid is a one-way door (§3c); that organisation
signup is hard-blocked on the D-U-N-S number and cannot be started in parallel,
tested rather than assumed (§4 step 3); that the manifest declares
`orientation: any`
and is therefore unaffected by the API 36 orientation change (§0); and that the
build tool is Bubblewrap rather than PWABuilder (§1, §5b).
