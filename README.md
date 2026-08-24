<img src="icons/icon-192.png" width="96" alt="">

# Pretty Number Machine

An interactive visualisation of prime factorisation, where **a number's colour
is its factorisation**.

2 is red. 3 is green. 5 is blue. So 6 is yellow, because 6 = 2 × 3 and red plus
green is yellow. 30 = 2 × 3 × 5 goes white. Nothing is looked up or assigned —
the colour is computed from the factors, so numbers that are mathematically
related look related.

That is the whole idea, and it is why the app icon is three overlapping discs:
it *is* 30.

## Running it

No build step, no package manager, no dependencies to install. Native ES
modules and a locally vendored Three.js. Serve the directory over HTTP:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` for the published build, or
`http://localhost:8000/www/` for the living one. Opening `index.html` directly
off disk will not work — ES modules require a real origin.

**A warning that has cost hours twice.** Serving the repository root registers
the *published* build's service worker at scope `/`, and it then answers
requests for `/www/` with the root build's cached files. The tell is the version
label in the footer: the published build and the `www/` build carry different
ones. Unregister the worker and clear caches after every server restart, or work
from `www/` as its own root. `docs/ACHIEVEMENTS.md` §8 has the full account.

It also installs as an app and runs with no network connection.

## Layout

**There are two copies of the web app, and only one of them is alive.**
`www/` is the living codebase and everything is built there. The tree at the
repository root — `index.html`, `core/`, `modules/`, `lib/`, `sw.js` — is the
*published website*, frozen, and receives no further work. They were split
rather than moved so the live site keeps working; the cost is that editing the
wrong one looks like nothing happening, so check which tree you are in first.

| Path | What it is |
|---|---|
| **`www/`** | **The living codebase.** Same shape as the root — `core/`, `modules/`, `lib/` — and the source for the Android app |
| `android/` | The Capacitor 8 shell. `webDir` points at `www/` |
| `tools/` | Dependency-free checkers and the achievement table exporter. `npm run check` |
| `index.html`, `core/`, `modules/`, `lib/`, `sw.js` | The **frozen** published website. **Bump `CACHE_VERSION` on any deploy of it.** |
| `v1/` | An earlier frozen web build, kept for the Capacitor spike's history |
| `docs/HANDOFF.md` | **Start here.** Where things stand, decisions, traps, codebase directory |
| `docs/ANDROID-BUILD.md` | The plan for the Google Play build (Capacitor, achievements, in-app product) |
| `docs/ACHIEVEMENTS.md` | The achievement layer: the gilding and payoff rules, clue craft, and the traps |
| `docs/ADS.md` | The satirical ads layer: two products, the paywall, the register the copy holds |
| `docs/PLAN.md`, `docs/V1-PLAN.md` | Charter and history of the web app |
| `docs/archive/` | Superseded documents, kept for history |

## Licence

Copyright © 2026 Dakota Schuck. All rights reserved — see [LICENSE](LICENSE).
The source is published so it can be read and evaluated, not reused. Bundled
third-party components under `lib/` keep their own licences.
