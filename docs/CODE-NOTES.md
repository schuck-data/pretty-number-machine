# The two kinds of comment

**Written:** 2026-08-15. Applies to `www/` — the app build, which is the living
copy of the code. `v1/` and the shipped root build are frozen web artifacts and
are not being annotated.

This codebase carries **two** layers of commentary, for two different readers,
and they are marked so neither has to wade through the other.

---

## `DEV:` — why the code is like this

The ordinary kind. Implementation decisions, trade-offs, things that look wrong
and are not, and traps that have already cost someone a day. Most of the
existing comments in this project are this kind and predate the marker; they are
not being retrofitted with a prefix, because a prefix on every one of them would
be noise. **`DEV:` is used where a comment sits next to an `EDU:` note and the
distinction would otherwise be unclear**, or where a comment is specifically a
warning to a future implementer.

The test for a DEV note: *would this still be true if the project were rewritten
in another language?* If no — if it is about this code, this structure, this
mistake — it is DEV.

## `EDU:` — what the mathematics is doing

The mathematics that lives *behind* the syntax. Why the golden angle and not
some other angle. Why radius grows as √n. Why Fibonacci numbers appear without
anyone putting them there. Why a colour is a sum. These notes describe concepts,
not code: they should survive translation into any language, and they should be
readable by someone who cannot read the surrounding syntax at all.

The test for an EDU note: *is this a fact about mathematics, or a fact about
this program?* Only the first is EDU.

An EDU note should assume curiosity, not training. It may name a concept
(continued fractions, centripetal parameterisation) and then explain it in
plain words rather than assuming it. It should say what would go wrong if the
maths were different, because that is usually what makes the point land.

---

## Rules

1. **EDU notes never explain syntax.** "This loop iterates over the array" is
   neither kind of note; it is noise. If it is about JavaScript, it does not
   belong in an EDU note.
2. **Neither kind replaces the other.** A function can want both: what the
   mathematics is, and why the implementation of it looks odd.
3. **EDU notes go where the maths is**, not in a lump at the top of the file.
   The point is that a reader scrolling through the code meets the explanation
   at the moment they need it.
4. **Do not add an EDU note where there is no mathematics.** Most of
   `core/panel.js` and all of `core/sheet.js` are user-interface plumbing and
   should stay unannotated. Padding the layer out until every file has some
   would devalue the marker everywhere else.

## Where the mathematics actually lives

| File | What an EDU reader will find |
|---|---|
| `core/positions.js` | The divergence angle, continued fractions and why φ is optimal; each shape's parameterisation |
| `core/math.js` | Primality and factorisation; factorisation-as-colour; parastichy curves; Catmull-Rom splines |
| `core/renderer.js` | What an angle change invalidates and why; shape interpolation |
| `modules/physics.js` | Spring–damper dynamics and why the integrator is written the way it is |
| `core/state.js` | Only where a default encodes a mathematical fact |
