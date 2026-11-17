// Checks one compare report against GATES.json. Do not edit.
//   node check-gate.mjs <GATES.json> <BENCH> <sub-stage> <compare-report.json>
// <sub-stage> is one of 01-parent-enrichment, 02-dtxr-enrichment, 03-atta-default, 04-mds-closure
// (use 04-mds-closure for 99-final-table.json). The report is the --json output of compare-support-tables.mjs.
import fs from 'fs';
const [gatesPath, bench, stage, reportPath] = process.argv.slice(2);
const want = JSON.parse(fs.readFileSync(gatesPath, 'utf8'))?.[bench]?.[stage];
if (!want) { console.log(`FAIL no gate for ${bench} ${stage}`); process.exit(1); }
const r = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const got = { matchedNodes: r.matchedNodes, differing: r.nodesDiffering, onlyExpected: r.onlyExpected.length, onlyActual: r.onlyActual.length };
const exp = { matchedNodes: want.matchedNodes, differing: 0, onlyExpected: want.topologyOnlyInOracle, onlyActual: want.topologyOnlyInUxml };
const bad = Object.keys(exp).filter((k) => got[k] !== exp[k]);
console.log(`${bad.length ? 'FAIL' : 'PASS'} ${bench} ${stage} ` + Object.keys(exp).map((k) => `${k}=${got[k]}${got[k] === exp[k] ? '' : '(want ' + exp[k] + ')'}`).join(' '));
process.exit(bad.length ? 1 : 0);
