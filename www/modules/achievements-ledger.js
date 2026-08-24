// PNM — the achievement ledger, as pure functions.
//
// WHY THIS FILE EXISTS. `achievements.js` imports three.js, so it cannot be
// loaded in Node, so nothing in it could ever be tested headlessly. That is not
// a theoretical cost: three real bugs have come out of that file, and every one
// of them was found by opening the app rather than by a check —
// `achievement:unlocked` shipping without `criteria` so the toast printed
// "undefined", the capstone counting orphaned ids, and the display set going
// stale the first time anything touched a checkbox.
//
// The LEDGER is the part with a real contract and no rendering in it, so it
// comes out here where it can be checked. Same reasoning that made
// `achievements-data.js` a separate file for the number sets.
//
// THE RULES OF THIS FILE, and they are what keep it testable:
//   - no three.js, no DOM, no localStorage, no bus
//   - every function is pure: a ledger goes in, a NEW ledger comes out
//   - nothing here knows what an achievement IS, only that ids have timestamps
//
// The I/O stays in achievements.js, which is a thin wrapper around these:
// localStorage is a browser thing and dragging it in here would put the file
// straight back on the wrong side of the line.

export const LEDGER_KEY = 'pnm-achievements-v1';

// `on` is the master switch. Achievements are OPT-IN: nothing is recorded until
// the player turns them on, and turning them on is itself the first
// achievement. A deliberate design choice rather than a privacy hedge — FIRST!
// has to be earnable, and it cannot be if tracking was already running.
export function emptyLedger() {
  return { unlocked: {}, counters: {}, on: false };
}

// Parse whatever was in storage. Returns null for anything unusable rather than
// throwing, because a corrupt ledger must degrade to "no progress yet" and not
// to a white screen — this runs during boot.
//
// The field-by-field rebuild is deliberate: it means a ledger written by a
// future version with extra keys loses those keys rather than carrying unknown
// state forward, and a ledger written by a hostile hand cannot inject anything.
export function parseLedger(raw) {
  if (!raw) return null;
  let v;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return {
    unlocked: (v.unlocked && typeof v.unlocked === 'object' && !Array.isArray(v.unlocked)) ? { ...v.unlocked } : {},
    counters: (v.counters && typeof v.counters === 'object' && !Array.isArray(v.counters)) ? { ...v.counters } : {},
    on: !!v.on,
  };
}

export function serialiseLedger(ledger) {
  return JSON.stringify(ledger);
}

// UNION of unlocks, MAX of counters, OR of the switch.
//
// The rule has to be COMMUTATIVE and IDEMPOTENT, because it runs on every start
// against both the PGS list and the saved-game snapshot, in whatever order
// those two happen to resolve. Both properties are asserted in
// tools/check-achievements.mjs — they were claimed in a comment here for a long
// time and never checked.
//
// AN UNLOCK IS NEVER WITHDRAWN BY A MERGE. Losing an achievement because a
// device was offline is the single worst failure this system could have, and it
// is the reason this is a union rather than a replace.
//
// The EARLIER timestamp wins, so the record says when the player first earned
// it rather than when some device last noticed. That is also what makes the
// merge commutative — min and max both are, a "last writer" rule would not be.
export function mergeLedgers(a, b) {
  // `on` is sticky across a merge: a device that had tracking switched on is
  // the one carrying the intent, and a fresh install should inherit it.
  const out = { unlocked: { ...a.unlocked }, counters: { ...a.counters }, on: !!(a.on || b.on) };
  for (const [id, at] of Object.entries(b.unlocked || {})) {
    if (!out.unlocked[id] || at < out.unlocked[id]) out.unlocked[id] = at;
  }
  for (const [id, n] of Object.entries(b.counters || {})) {
    out.counters[id] = Math.max(out.counters[id] || 0, n);
  }
  return out;
}

// COUNT ONLY IDS THAT STILL EXIST, which is why this takes a predicate rather
// than reading the length.
//
// The ledger never withdraws an unlock, so an achievement DROPPED from the
// design leaves its entry behind forever — v7 dropped three, and anyone who had
// earned them still carries `ceiling`, `mersenne` or `thelema`.
//
// Counting those was a real bug and the worst kind. UNITY! fires on
// `countKnown(...) >= ACHIEVEMENT_DEFS.length - 1`, so three orphans meant the
// capstone — the flood, the finale, the whole board catching fire — could be
// awarded three achievements EARLY, to the players who had played longest. The
// same count drives the panel's progress line, which would have read "101 of
// 101" with rows still locked underneath.
//
// The fix belongs in the COUNT and never in a prune: a dropped achievement
// might come back, and discarding an unlock is the one thing this system must
// not do.
export function countKnown(ledger, isKnownId) {
  let n = 0;
  for (const id in ledger.unlocked) if (isKnownId(id)) n++;
  return n;
}

// Which achievements are currently SHOWING their gold. Defaults to everything
// earned; an override is the player's mix-and-match selection.
//
// DEV: the override must be a snapshot the caller can add to, not a filter
// recomputed from the ledger — that distinction was a bug. `getEnabled()`
// returned `override ?? all unlocked`, and the moment anything touched the
// selection the override froze and never grew, so every achievement earned
// afterwards was invisible. It presented as "I just unlocked TWINNING! and
// still no lines." Whoever holds the override is responsible for adding new
// unlocks to it; see unlock() in achievements.js.
export function enabledIds(ledger, override) {
  return override ?? new Set(Object.keys(ledger.unlocked));
}
