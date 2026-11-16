// Gate for the wired UXML supports stage (uxml/v2/supports/SupportsStage.js): one call from the stage's input XML
// must give today's support table after every sub-stage, exactly: compare-tables WITHOUT --allow-topology exits 0
// (every node present on both sides, same number and name, no support value or restraint differs). Stricter than the
// step-3 GATES.json, which allowed the split-renumbering topology gap that the stage now closes.
//   node scripts/uxml-v2-supports-stage-gate.mjs [identity] [--oracle <dir>] [--xml <dir>] [--calls <dir>] [--json report.json]
//   identity: control that returns its input at every sub-stage (must FAIL). --xml: folder of <B>/xml/ (default --oracle).
//   --rerun / --lengths: the checks below; today-lengths: their control, the stage with today's length labels (must FAIL).
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
import { plainSupportTable, supportProvenance } from '../uxml/v2/supports/SupportProvenance.js';
import { elementKids, parsePlainXml, textContent } from '../uxml/v2/supports/PlainDom.js';

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
// Owner 16 Nov. --rerun: the stage run again on its own output must give the same XML, byte for byte, and the same support
// table. --lengths: every numbered node's ElementLengthMm must equal its CII element length, the straight distance from
// the previous numbered node in its branch (today's CII writer takes DX/DY/DZ from those two positions). Physical check,
// not today's output: today's labels fail it after split-condensed renumbering (control today-lengths).
const rerun = argv.includes('--rerun');
const lengths = argv.includes('--lengths');
const todayLengths = argv[0] === 'today-lengths';
// Owner 16 Nov. --provenance: where each support value came from (SupportProvenance.js). Per model: the stage's final
// table is today's 04 table; every support value and restraint has a record; none is unexplained; and every value or
// restraint that today's branch-pass output (parent-support-loop-start.xml) does not hold at that node is not called input.
// Controls (must FAIL): flat-provenance (every record says input), no-evidence (provenance without the diagnostics).
const provenance = argv.includes('--provenance');
const flatProvenance = argv[0] === 'flat-provenance', noEvidence = argv[0] === 'no-evidence';
// Owner 16 Nov (CII check, 'port both'). --fields: every value in today's XML after 01 and 02 (every leaf: process block,
// node facts, supports) equals the stage's, except ElementLengthMm (measured from the final numbering on purpose).
// Control (must FAIL): no-preview-parity, the stage without today's preview run parity rows.
const fields = argv.includes('--fields'), noPreviewParity = argv[0] === 'no-preview-parity';
const FIELD_SUBS = ['01-parent-enrichment', '02-dtxr-enrichment'];
const CONTROL_OF = { 'today-lengths': 'today-lengths', identity: 'identity', 'flat-provenance': 'flat-provenance', 'no-evidence': 'no-evidence',
  'no-preview-parity': 'no-preview-parity' };
const stageOptions = { lengthsFromFinalNumbering: !todayLengths, previewRunParity: !noPreviewParity };
function leafValues(xml) {
  const out = new Map();
  const walk = (el, at) => {
    const kids = elementKids(el);
    if (!kids.length) { let key = at, n = 1; while (out.has(key)) key = `${at}#${(n += 1)}`; out.set(key, textContent(el).trim()); return; }
    const seen = {};
    for (const k of kids) { seen[k.__el] = (seen[k.__el] || 0) + 1; walk(k, `${at}/${k.__el}[${seen[k.__el]}]`); }
  };
  walk(parsePlainXml(xml).root, '');
  return out;
}
function fieldProblems(bench, out) {
  const problems = [];
  for (const sub of FIELD_SUBS) {
    const today = leafValues(fs.readFileSync(path.join(xmlDir(bench), `${sub}.xml`), 'utf8')), mine = leafValues(out.stages[sub]);
    const tags = {};
    for (const key of new Set([...today.keys(), ...mine.keys()])) {
      if (/\/ElementLengthMm\[\d+\](#\d+)?$/.test(key) || today.get(key) === mine.get(key)) continue;
      const tag = key.replace(/\[\d+\]/g, '').replace(/#\d+$/, '');
      tags[tag] = (tags[tag] || 0) + 1;
    }
    if (Object.keys(tags).length) problems.push({ sub, what: "values differ from today's XML", tags });
  }
  return problems;
}
const tagOf = (block, name) => (block.match(new RegExp(`<${name}>([^<]*)</${name}>`)) || [])[1];
const pointOf = (p) => { const v = (p || '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number); return v && v.length >= 3 ? v : null; };
function lengthProblems(xmlText) {
  let spans = 0, wrong = 0, missing = 0;
  for (const branch of xmlText.matchAll(/<Branch>[\s\S]*?<\/Branch>/g)) {
    let previous = null;
    for (const m of branch[0].matchAll(/<Node>[\s\S]*?<\/Node>/g)) {
      const at = Number(tagOf(m[0], 'NodeNumber')) > 0 ? pointOf(tagOf(m[0], 'Position')) : null;
      if (!at) continue;
      if (previous) {
        spans += 1;
        const want = Math.hypot(at[0] - previous[0], at[1] - previous[1], at[2] - previous[2]), have = tagOf(m[0], 'ElementLengthMm');
        if (have === undefined) missing += 1; else if (!(Math.abs(Number(have) - want) <= 0.0006)) wrong += 1;
      }
      previous = at;
    }
  }
  return wrong || missing || !spans ? [{ what: 'ElementLengthMm differs from the CII element length', spans, wrong, missing }] : [];
}
function provenanceProblems(bench, dir, out) {
  const problems = [];
  const today04 = fs.readFileSync(path.join(dir, '04-mds-closure-table.json'), 'utf8');
  if (JSON.stringify(tableOf(out.xmlText)) !== JSON.stringify(JSON.parse(today04))) problems.push({ what: "final table differs from today's 04 table" });
  const plain = plainSupportTable(out.xmlText).map(({ position, ...row }) => row);
  if (JSON.stringify(plain) !== JSON.stringify(tableOf(out.xmlText))) problems.push({ what: 'PlainDom support table differs from the reader table' });
  let prov = out.provenance || supportProvenance({ stages: out.stages, diagnosticsByStep: {}, parentNumbers: [] });
  if (noEvidence) prov = supportProvenance({ stages: out.stages, diagnosticsByStep: {}, parentNumbers: [] });
  if (flatProvenance) prov = { ...prov, rows: prov.rows.map((r) => ({ ...r, values: Object.fromEntries(Object.keys(r.values).map((t) => [t, { step: 'input', src: 'psi116', rule: 'input' }])),
    restraints: r.restraints.map((x) => ({ type: x.type, step: 'input', src: 'psi116', rule: 'input' })) })) };
  const final = plainSupportTable(out.xmlText), byRow = new Map(prov.rows.map((r) => [r.row, r]));
  const start = plainSupportTable(fs.readFileSync(path.join(xmlDir(bench), 'parent-support-loop-start.xml'), 'utf8'));
  let missing = 0, unexplained = 0, wrongInput = 0;
  final.forEach((row, i) => {
    const rec = byRow.get(i);
    for (const [tag, text] of Object.entries(row.support)) {
      const v = rec?.values[tag];
      if (!v) { missing += 1; continue; }
      if (v.src === 'stage') unexplained += 1;
      if (v.step === 'input' && start[i]?.support[tag] !== text) wrongInput += 1;
    }
    row.restraints.forEach((fields, j) => {
      const x = rec?.restraints[j];
      if (!x) { missing += 1; return; }
      if (x.src === 'stage') unexplained += 1;
      if (x.step === 'input' && !(start[i]?.restraints || []).some((r) => JSON.stringify(r) === JSON.stringify(fields))) wrongInput += 1;
    });
  });
  if (missing || unexplained || wrongInput) problems.push({ what: 'provenance', missing, unexplained, wrongInput });
  report.counts[bench] = { ...prov.counts };
  return problems;
}
const nodeValues = (text) => [...text.matchAll(/<Node>[\s\S]*?<\/Node>/g)].map((m) => m[0].split('\n').map((l) => l.trim()).filter(Boolean).sort().join('\n'));
const benches = fs.readdirSync(oracle).filter((b) => fs.existsSync(path.join(xmlDir(b), 'engineering-pass-start.xml'))
  && (!fields || FIELD_SUBS.every((s) => fs.existsSync(path.join(xmlDir(b), `${s}.xml`)))));
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
  try { out = control ? { xmlText, stages: Object.fromEntries(['branch-pass', ...SUB].map((s) => [s, xmlText])) } : runSupportsStage({ xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows }, ...stageOptions }); }
  catch (e) { return [{ what: 'threw', message: String(e?.stack || e).slice(0, 400) }]; }
  const problems = [];
  if (lengths) return lengthProblems(out.xmlText);
  if (fields) return fieldProblems(bench, out);
  if (provenance) return provenanceProblems(bench, dir, out);
  if (rerun) {
    const second = runSupportsStage({ xmlText: out.xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows }, ...stageOptions });
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
const report = { counts: {} };
for (const bench of benches) perBench[bench] = check(bench);
fs.rmSync(tmp, { recursive: true, force: true });
const failing = Object.entries(perBench).filter(([, p]) => p.length).map(([b]) => b);
Object.assign(report, { impl: CONTROL_OF[argv[0]] || 'uxml/v2/supports/SupportsStage.js', mode: provenance ? 'provenance' : fields ? 'fields' : lengths ? 'lengths' : rerun ? 'rerun' : 'stages',
  verdict: failing.length || !benches.length ? 'FAIL' : 'PASS', benches: benches.length, failing, perBench });
if (!provenance) delete report.counts;
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 4000));
process.exitCode = report.verdict === 'PASS' ? 0 : 1;
