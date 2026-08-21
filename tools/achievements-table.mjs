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

const ROUTES = D.primeRoutes();
const rows = D.ACHIEVEMENT_DEFS.map(a => {
  const primesTouched = a.gildNodes.filter(n => ROUTES.has(n));
  return {
    name: a.name,
    criteria: a.criteria || '',
    hint: a.hint || '',
    subtitle: a.subtitle || '',
    blurb: a.blurb || '',
    gild_nodes: a.gildNodes.length
      ? (a.gildNodes.length > 14
          ? `${a.gildNodes.slice(0, 12).join(', ')} … (${a.gildNodes.length} total)`
          : a.gildNodes.join(', '))
      : '—',
    gild_lines: primesTouched.length
      ? primesTouched.map(p => `${p} (needs ${ROUTES.get(p).length})`).join(', ')
      : '—',
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const cols = ['name', 'criteria', 'hint', 'subtitle', 'blurb', 'gild_nodes', 'gild_lines'];
  console.log(cols.join('\t'));
  for (const r of rows) console.log(cols.map(c => String(r[c]).replace(/\t/g, ' ')).join('\t'));
}
