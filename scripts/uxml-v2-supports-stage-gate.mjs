// Gate for the wired UXML supports stage (uxml/v2/supports/SupportsStage.js): one call from the stage's input XML
// must give today's support table after every sub-stage, exactly: compare-tables WITHOUT --allow-topology exits 0
// (every node present on both sides, same number and name, no support value or restraint differs). Stricter than the
// step-3 GATES.json, which allowed the split-renumbering topology gap that the stage now closes.
//   node scripts/uxml-v2-supports-stage-gate.mjs [identity] [--oracle <dir>] [--xml <dir>] [--calls <dir>] [--json report.json]
//   identity: control that returns its input at every sub-stage (must FAIL). --xml: folder of <B>/xml/ (default --oracle).
//   --rerun: run the stage again on its own output (see below); recompute: its control (must FAIL).
// Inputs per model: oracle/<B>/xml/engineering-pass-start.xml (the XML today's stage receives), the raw job config
// (as today's sub-steps receive it, from the recorded DTXR call) and the material map rows (from the snapshot).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { supportTableOf } from '../uxml/v2/supports/SupportTable.js';
import { loadCalls, revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name) => { const at = argv.indexOf(name); return at >= 0 ? argv.splice(at, 2)[1] : null; };
const reportPath = opt('--json');
const oracle = opt('--oracle') || path.join(ROOT, 'fixtures/uxml-v2-supports/oracle');
const xmlRoot = opt('--xml');
const calls = opt('--calls') || path.join(ROOT, 'fixtures/uxml-v2-supports/core-calls');
const SUB = ['01-parent-enrichment', '02-dtxr-enrichment', '03-atta-default', '04-mds-closure'];
const STAGED = { G30: 'bench/golden-30_staged.json', 'G30-CUSTOM': 'bench/golden-30_staged.json', 'ACTIVE-AUDIT': 'bench/active-audit.json' };
const tableOf = (text) => supportTableOf(readPsi116V2(text, { fileSha256: createHash('sha256').update(text).digest('hex') }));
const xmlDir = (b) => path.join(xmlRoot || oracle, b, 'xml');
const control = argv[0] === 'identity';
// --rerun (Owner 16 Nov): the stage run again on its own output must give the same XML, byte for byte (so every length,
// value and child order) and the same support table. Control 'recompute' drops the lengths before run 2 (today's behaviour).
const rerun = argv.includes('--rerun') || argv[0] === 'recompute';
const recompute = argv[0] === 'recompute';
const nodeValues = (text) => [...text.matchAll(/<Node>[\s\S]*?<\/Node>/g)].map((m) => m[0].split('\n').map((l) => l.trim()).filter(Boolean).sort().join('\n'));
const benches = fs.readdirSync(oracle).filter((b) => fs.existsSync(path.join(xmlDir(b), 'engineering-pass-start.xml')));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uxml-v2-stage-'));

function run(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { encoding: 'utf8', maxBuffer: 16 << 20 });
  return { status: r.status, out: `${r.stdout}${r.stderr}`.trim().slice(-400) };
}

function check(bench) {
  const dir = path.join(oracle, bench);
  const xmlText = fs.readFileSync(path.join(xmlDir(bench), 'engineering-pass-start.xml'), 'utf8');
  const snap = revive(JSON.parse(fs.readFileSync(path.join(xmlDir(bench), 'engineering-pass-start.json'), 'utf8')));
  const dtxrCall = loadCalls([path.join(calls, `${bench}.substep-calls.json`)]).find((c) => c.name === 'enrichStandaloneDtxrAnnotations');
  const [, stagedJsonText, supportConfig] = revive(dtxrCall.args);
  const stagedPath = STAGED[bench] && path.join(ROOT, 'fixtures/uxml-v2-supports', STAGED[bench]);
  if (stagedPath && fs.existsSync(stagedPath) && fs.readFileSync(stagedPath, 'utf8') !== stagedJsonText) return [{ what: 'staged JSON differs from the recording' }];
  let out;
  try { out = control ? { stages: Object.fromEntries(SUB.map((s) => [s, xmlText])) } : runSupportsStage({ xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows } }); }
  catch (e) { return [{ what: 'threw', message: String(e?.stack || e).slice(0, 400) }]; }
  const problems = [];
  if (rerun) {
    const again = recompute ? out.xmlText.replace(/\s*<ElementLengthMm>[^<]*<\/ElementLengthMm>/g, '') : out.xmlText;
    const second = runSupportsStage({ xmlText: again, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows } });
    const a = nodeValues(out.xmlText), b = nodeValues(second.xmlText);
    const changed = a.filter((n, i) => n !== b[i]).length + Math.abs(a.length - b.length);
    if (changed) problems.push({ what: 'second run changed node values', nodes: changed });
    else if (out.xmlText !== second.xmlText) problems.push({ what: 'second run changed the XML (order only)' });
    if (JSON.stringify(tableOf(out.xmlText)) !== JSON.stringify(tableOf(second.xmlText))) problems.push({ what: 'second run changed the support table' });
    return problems;
  }
  for (const sub of SUB) {
    const actual = path.join(tmp, `${bench}.${sub}.json`), cmp = path.join(tmp, `${bench}.${sub}.cmp.json`);
    fs.writeFileSync(actual, JSON.stringify(tableOf(out.stages[sub])));
    const g = run('uxml-v2-supports-compare-tables.mjs', [path.join(dir, `${sub}-table.json`), actual, '--json', cmp]);
    if (g.status !== 0) problems.push({ sub, compare: g.out });
  }
  return problems;
}

const perBench = {};
for (const bench of benches) perBench[bench] = check(bench);
fs.rmSync(tmp, { recursive: true, force: true });
const failing = Object.entries(perBench).filter(([, p]) => p.length).map(([b]) => b);
const report = { impl: recompute ? 'recompute' : control ? 'identity' : 'uxml/v2/supports/SupportsStage.js', mode: rerun ? 'rerun' : 'stages', verdict: failing.length || !benches.length ? 'FAIL' : 'PASS', benches: benches.length, failing, perBench };
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 4000));
process.exitCode = report.verdict === 'PASS' ? 0 : 1;
