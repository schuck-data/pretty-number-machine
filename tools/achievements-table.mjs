// PNM — export the achievement copy as a flat table
//
// Reads www/modules/achievements-data.js, which is the source of truth, and
// prints one row per achievement as TSV. Regenerate rather than hand-maintain:
// the design sheet in docs/ is the record of DECISIONS, this is a view of what
// the app actually says, and the two are allowed to differ only while a change
// is in flight.
//
//   node tools/achievements-table.mjs            → TSV on stdout
//   node tools/achievements-table.mjs --json     → JSON, for tooling
//
// The `gild_lines` column needs explaining. An achievement never gilds a line
// on its own: a prime's parastichy curve turns gold only when that prime is
// FULLY OWNED, meaning every achievement that gilds it has been earned. So the
// column lists the primes this achievement is a route TOWARD, with the count of
// routes each one needs in brackets.

const D = await import(new URL('../www/modules/achievements-data.js', import.meta.url));

// DEV: rewritten 2026-08-23 for the v2 data shape. It still read v1's fields —
// primeRoutes(), `hint`, `subtitle` — none of which survived the rebuild, so it
// had been throwing since. v2 declares gildLines explicitly per achievement
// rather than deriving routes, and the gilding rule that used to need
// explaining now lives in achievements-data.js beside computeGild().
const rows = D.ACHIEVEMENT_DEFS.map(a => ({
  no: a.no,
  name: a.name,
  cluster: a.cluster,
  branch: a.branch,
  // The Play Console's "Initial state" field. See the note beside
  // REVEALED_CLUSTERS in achievements-data.js — this column is why that
  // decision lives in code rather than in a document.
  initial_state: a.hidden ? 'Hidden' : 'Revealed',
  // The public string: the Play Console description, visible in the Play Games
  // app for anything Revealed. The in-app clue is the next column and stays
  // cryptic. A typo in `criteria` ships.
  criteria: a.criteria || '',
  clue: a.clue || '',
  blurb: a.blurb || '',
  xp: a.xp,
  gild_nodes: a.gildNodes.length
    ? (a.gildNodes.length > 14
        ? `${a.gildNodes.slice(0, 12).join(', ')} … (${a.gildNodes.length} total)`
        : a.gildNodes.join(', '))
    : '—',
  gild_lines: a.gildLines.length ? a.gildLines.join(', ') : '—',
}));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const cols = ['no', 'name', 'cluster', 'branch', 'initial_state',
                'criteria', 'clue', 'blurb', 'xp', 'gild_nodes', 'gild_lines'];
  console.log(cols.join('	'));
  for (const r of rows) console.log(cols.map(c => String(r[c]).replace(/	/g, ' ')).join('	'));
}
