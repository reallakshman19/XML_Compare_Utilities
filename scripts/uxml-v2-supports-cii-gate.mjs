// CII gate for the UXML supports stage (Owner 16 Nov, 'port all': the CII check becomes the stage's gate). Per model, today's
// CII writer (3D_Converters xml_to_cii2019_runtime_custody.py, called with the app's own arguments) runs on today's XML
// after the supports stage and on the stage's output; the two CII files must be equal line for line.
//   node scripts/uxml-v2-supports-cii-gate.mjs [control] --writer <xml_to_cii2019_runtime_custody.py> [--python <exe>]
//        [--oracle <dir>] [--xml <dir>] [--calls <dir>] [--json report.json]
// --xml: folder of <B>/xml/ (default --oracle), as in the stage gate.
// Today's XML: <oracle>/<B>/final-enriched.xml where given, else <oracle>/<B>/xml/04-mds-closure.xml.
// Stage input: <oracle>/<B>/xml/engineering-pass-start.xml with the recorded job config (as in the stage gate).
// Controls (must FAIL): no-process-parity, no-preview-parity (the stage without today's process parity / preview rows).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCalls, revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name) => { const at = argv.indexOf(name); return at >= 0 ? argv.splice(at, 2)[1] : null; };
const writer = opt('--writer');
const python = opt('--python') || process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
const oracle = opt('--oracle') || path.join(ROOT, 'fixtures/uxml-v2-supports/oracle');
const calls = opt('--calls') || path.join(ROOT, 'fixtures/uxml-v2-supports/core-calls');
const xmlRoot = opt('--xml');
const reportPath = opt('--json');
const CONTROLS = { 'no-process-parity': { processParity: false }, 'no-preview-parity': { previewRunParity: false } };
const control = CONTROLS[argv[0]] ? argv[0] : null;
if (!writer || !fs.existsSync(writer)) throw new Error('UXML_CII_GATE_WRITER_MISSING: pass --writer <path to xml_to_cii2019_runtime_custody.py>');

const xmlDir = (b) => path.join(xmlRoot || oracle, b, 'xml');
const todayXmlOf = (b) => [path.join(oracle, b, 'final-enriched.xml'), path.join(xmlDir(b), '04-mds-closure.xml')].find((f) => fs.existsSync(f));
const benches = fs.readdirSync(oracle).filter((b) => fs.statSync(path.join(oracle, b)).isDirectory()).filter((b) => fs.existsSync(path.join(xmlDir(b), 'engineering-pass-start.xml')) && todayXmlOf(b)).sort();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uxml-v2-cii-'));

/** Today's app arguments (converters/xml-cii-2019-standalone/invocation-builder.js). Returns the CII lines. */
function writeCii(dir, name, configText, stagedPath) {
  const output = path.join(dir, `${name}.cii`);
  const args = [writer, '--input', path.join(dir, `${name}.xml`), '--output', output, '--coords-mode', 'first', '--weight-scale', '10'];
  if (configText.trim() && configText.trim() !== '{}') args.push('--support-config-json', configText);
  if (stagedPath) args.push('--staged-json', stagedPath);
  args.push('--use-restraint-type-based-on-json');
  const r = spawnSync(python, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`UXML_CII_GATE_WRITER_FAILED ${name}: exit ${r.status}: ${`${r.stderr}`.slice(-300)}`);
  return fs.readFileSync(output, 'utf8').split(/\r?\n/);
}
/** Lines that differ, counted per CII section (#$ header). */
function sectionDiffs(a, b) {
  const per = {};
  let section = '(head)';
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const line = a[i] ?? b[i];
    if (line.startsWith('#$')) section = line.split(/\s+/)[1] || line;
    if (a[i] !== b[i]) per[section] = (per[section] || 0) + 1;
  }
  return per;
}

function check(bench, dir) {
  const xmlText = fs.readFileSync(path.join(xmlDir(bench), 'engineering-pass-start.xml'), 'utf8');
  const snap = revive(JSON.parse(fs.readFileSync(path.join(xmlDir(bench), 'engineering-pass-start.json'), 'utf8')));
  const dtxrCall = loadCalls([path.join(calls, `${bench}.substep-calls.json`)]).find((c) => c.name === 'enrichStandaloneDtxrAnnotations');
  const [, stagedJsonText, supportConfig] = revive(dtxrCall.args);
  const out = runSupportsStage({ xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows }, ...(CONTROLS[control] || {}) });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stage.xml'), out.xmlText);
  fs.copyFileSync(todayXmlOf(bench), path.join(dir, 'today.xml'));
  const stagedPath = stagedJsonText ? path.join(dir, 'staged.json') : '';
  if (stagedPath) fs.writeFileSync(stagedPath, stagedJsonText);
  const configText = JSON.stringify(supportConfig || {});
  const today = writeCii(dir, 'today', configText, stagedPath), stage = writeCii(dir, 'stage', configText, stagedPath);
  const differ = sectionDiffs(today, stage);
  return { equal: !Object.keys(differ).length, ciiLines: today.length, linesDifferBySection: differ };
}

const perBench = {};
try {
  benches.forEach((bench, i) => {
    try { perBench[bench] = check(bench, path.join(tmp, `m${i + 1}`)); } catch (e) { perBench[bench] = { equal: false, error: String(e?.message || e).slice(0, 400) }; }
  });
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
const failing = Object.entries(perBench).filter(([, r]) => !r.equal).map(([b]) => b);
const report = { impl: control || 'uxml/v2/supports/SupportsStage.js', writer: path.basename(writer), verdict: failing.length || !benches.length ? 'FAIL' : 'PASS',
  benches: benches.length, failing, perBench };
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 4000));
process.exitCode = report.verdict === 'PASS' ? 0 : 1;
