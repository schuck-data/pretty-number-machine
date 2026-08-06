# Third-party components

Everything under `lib/` is somebody else's work, bundled unmodified. It is not
covered by this project's LICENSE, and their terms are not optional — both
licenses below require that these notices travel with the code.

## Three.js

- **Location:** `lib/three/`
- **Version:** 0.170.0, unmodified
- **Copyright:** Copyright © 2010-2024 Three.js Authors
- **License:** MIT
- **Source:** https://github.com/mrdoob/three.js

MIT requires that the copyright notice and permission notice be included in
all copies. The notice is retained in the header of `three.module.js`; the
full text follows.

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Files bundled: `three.module.js`, plus `addons/controls/OrbitControls.js` and
`addons/lines/{Line2, LineMaterial, LineGeometry, LineSegments2,
LineSegmentsGeometry}.js`.

## Space Grotesk

- **Location:** `lib/fonts/`
- **Copyright:** Copyright © 2020 The Space Grotesk Project Authors
- **License:** SIL Open Font License 1.1 — full text in `lib/fonts/OFL.txt`
- **Source:** https://github.com/floriankarsten/space-grotesk

The OFL permits bundling and self-hosting. It requires the copyright notice
and license to ship alongside the font, which `lib/fonts/OFL.txt` satisfies.
The font is unmodified and is not sold on its own.
