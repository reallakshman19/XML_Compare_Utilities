// Gate for the UXML step-4 branch pass: the port must turn today's XML at the start of the branch pass into today's
// XML where the parent support loop starts, on every model, element by element and text by text.
//   node scripts/uxml-v2-branch-pass-gate.mjs <impl|identity|refuse> [--oracle <dir>] [--json report.json]
//   <impl> exports branchEngineeringPass({root, config, tolerance, stats, diagnostics}) and changes root in place.
//   --oracle: a folder of <bench>/xml/{engineering-pass-start,parent-support-loop-start}.{xml,json} (default: the public fixtures).
// Controls: identity (no change) must FAIL wherever today's pass changes the XML; refuse must FAIL everywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parsePlainXml, serializePlainXml } from '../uxml/v2/supports/PlainDom.js';
import { revive } from '../uxml/v2/supports/CoreCallsLib.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name) => { const at = argv.indexOf(name); return at >= 0 ? argv.splice(at, 2)[1] : null; };
const reportPath = opt('--json');
const oracle = opt('--oracle') || path.join(ROOT, 'fixtures/uxml-v2-supports/oracle');
const [impl] = argv;
const port = ['identity', 'refuse'].includes(impl) ? null : await import(pathToFileURL(path.resolve(impl)).href);
const benches = fs.readdirSync(oracle).filter((b) => fs.existsSync(path.join(oracle, b, 'xml/engineering-pass-start.xml')));

function check(bench) {
  const dir = path.join(oracle, bench, 'xml');
  const startText = fs.readFileSync(path.join(dir, 'engineering-pass-start.xml'), 'utf8');
  const snap = revive(JSON.parse(fs.readFileSync(path.join(dir, 'engineering-pass-start.json'), 'utf8')));
  const want = serializePlainXml(parsePlainXml(fs.readFileSync(path.join(dir, 'parent-support-loop-start.xml'), 'utf8')));
  const start = serializePlainXml(parsePlainXml(startText));
  const doc = parsePlainXml(startText);
  try {
    if (impl === 'refuse') throw new Error('REFUSED');
    if (port) {
      if (typeof port.branchEngineeringPass !== 'function') throw new Error('MISSING_EXPORT branchEngineeringPass');
      port.branchEngineeringPass({ root: doc.root, config: snap.config, tolerance: snap.tolerance, stats: {}, diagnostics: [] });
    }
  } catch (e) { return { changedByToday: start !== want, problems: [{ what: 'threw', message: String(e?.message || e).slice(0, 400) }] }; }
  const got = serializePlainXml(doc);
  if (got === want) return { changedByToday: start !== want, problems: [] };
  const g = got.split('\n'), w = want.split('\n');
  let i = 0;
  while (i < Math.min(g.length, w.length) && g[i] === w[i]) i += 1;
  const differing = w.filter((line, k) => g[k] !== line).length;
  return { changedByToday: start !== want, problems: [{ what: 'XML differs', lines: { got: g.length, want: w.length }, differingLines: differing,
    firstAt: i + 1, got: (g[i] || '').trim().slice(0, 200), want: (w[i] || '').trim().slice(0, 200) }] };
}

const perBench = {};
for (const bench of benches) perBench[bench] = check(bench);
const failing = Object.entries(perBench).filter(([, r]) => r.problems.length).map(([b]) => b);
const report = { impl, verdict: failing.length || !benches.length ? 'FAIL' : 'PASS', benches: benches.length, failing, perBench };
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 4000));
process.exitCode = report.verdict === 'PASS' ? 0 : 1;
