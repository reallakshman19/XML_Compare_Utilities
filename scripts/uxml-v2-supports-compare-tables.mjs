// Compares two "support tables" (the oracle format) and lists every difference.
//   node compare-support-tables.mjs <expected.json> <actual.json> [--allow-topology] [--json out.json]
// A support table is [{branch, nodeIndex, NodeNumber, NodeName, ComponentType, support:{tag:text}, restraints:[{tag:text}]}].
// Nodes are matched by branch + NodeNumber + NodeName + occurrence (not by position in the list).
// Exit 0 only when no matched node differs and (unless --allow-topology) no node is missing on either side.
import fs from 'fs';
const args = process.argv.slice(2);
const [expPath, actPath] = args.filter((a) => !a.startsWith('--') && !a.endsWith('.out.json'));
const allowTopology = args.includes('--allow-topology');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function keyed(rows) {
  const seen = new Map(); const out = new Map();
  for (const r of rows) {
    const base = [r.branch, r.NodeNumber, r.NodeName].join('|');
    const n = (seen.get(base) || 0) + 1; seen.set(base, n);
    out.set(base + '|#' + n, r);
  }
  return out;
}
const norm = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, String(o[k])]));
const exp = keyed(load(expPath)); const act = keyed(load(actPath));
const report = { expected: expPath, actual: actPath, matchedNodes: 0, nodesDiffering: 0, onlyExpected: [], onlyActual: [], diffs: [] };
for (const [k, e] of exp) {
  const a = act.get(k);
  if (!a) { report.onlyExpected.push(k); continue; }
  report.matchedNodes += 1;
  const d = { node: k, support: [], restraints: null };
  for (const f of new Set([...Object.keys(e.support || {}), ...Object.keys(a.support || {})])) {
    const ev = e.support?.[f] ?? null; const av = a.support?.[f] ?? null;
    if (ev !== null && av !== null ? String(ev) !== String(av) : ev !== av) d.support.push({ field: f, expected: ev, actual: av });
  }
  const er = (e.restraints || []).map(norm); const ar = (a.restraints || []).map(norm);
  if (JSON.stringify(er) !== JSON.stringify(ar)) d.restraints = { expected: e.restraints, actual: a.restraints };
  if (d.support.length || d.restraints) { report.nodesDiffering += 1; report.diffs.push(d); }
}
for (const k of act.keys()) if (!exp.has(k)) report.onlyActual.push(k);
const ok = report.nodesDiffering === 0 && (allowTopology || (!report.onlyExpected.length && !report.onlyActual.length));
report.result = ok ? 'PASS' : 'FAIL';
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(`${report.result} matched=${report.matchedNodes} differing=${report.nodesDiffering} onlyExpected=${report.onlyExpected.length} onlyActual=${report.onlyActual.length}`);
for (const d of report.diffs.slice(0, 10)) console.log('  DIFF', d.node, d.support.map((s) => `${s.field}: ${s.expected} -> ${s.actual}`).join('; '), d.restraints ? `restraints ${d.restraints.expected.length} -> ${d.restraints.actual.length}` : '');
process.exit(ok ? 0 : 1);
