#!/usr/bin/env node
// Weight gate (UXML step 4, Owner 16 Nov "close step 4"): the supports stage, given the rigid weights chosen in today's
// Run popup ("Rigid Weights Need Review"), writes exactly the weights today's Run writes, and changes nothing else.
//   node scripts/uxml-v2-weights-gate.mjs [no-choices] [--root <dir>] [--oracle <dir>] [--names-hidden] [--json <report>]
// Data per model, <root>/<B>/ (default fixtures/uxml-v2-supports/weights):
//   choices.json          today's job config with overrides.rigidWeight as the popup saved it (GOLDEN-30: Use All Best;
//                         RMS-BLOW-1: 10 kg typed in each row, the model has no rating so the popup suggests none);
//   expected-weights.json leaf path -> Weight in today's final XML with those choices, where it differs from the base;
//   start.xml/start.json  the stage input (else <oracle>/<B>/xml/engineering-pass-start.xml/.json);
//   base.xml              today's final XML without choices (else <oracle>/<B>/xml/04-mds-closure.xml).
// Pass: every leaf of the stage's final XML equals base + expected weights (ElementLengthMm aside, as in the stage gate).
// Control no-choices (must FAIL): the same run without overrides.rigidWeight.
// --names-hidden: models reported as model-1, model-2, ... (private benchmarks); counts only, never values.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { elementKids, parsePlainXml, textContent } from '../uxml/v2/supports/PlainDom.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name) => { const at = argv.indexOf(name); return at >= 0 ? argv.splice(at, 2)[1] : null; };
const root = opt('--root') || path.join(ROOT, 'fixtures/uxml-v2-supports/weights');
const oracle = opt('--oracle') || path.join(ROOT, 'fixtures/uxml-v2-supports/oracle');
const bench = path.join(ROOT, 'fixtures/uxml-v2-supports/bench');
const reportPath = opt('--json');
const hide = argv.includes('--names-hidden');
const control = argv[0] === 'no-choices' ? 'no-choices' : null;
const STAGED = { G30: 'golden-30_staged.json' };
const LENGTH = /\/ElementLengthMm\[\d+\](#\d+)?$/;

/** Every leaf by path (repeated tags numbered), as in the stage gate. */
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

const pick = (...files) => files.find((f) => fs.existsSync(f));
const models = fs.readdirSync(root).filter((b) => fs.existsSync(path.join(root, b, 'choices.json'))).sort();
if (!models.length) throw new Error(`UXML_WEIGHTS_GATE_NO_DATA: no <model>/choices.json under ${root}`);

const results = models.map((b, i) => {
  const dir = path.join(root, b);
  const startXml = pick(path.join(dir, 'start.xml'), path.join(oracle, b, 'xml/engineering-pass-start.xml'));
  const startJson = pick(path.join(dir, 'start.json'), path.join(oracle, b, 'xml/engineering-pass-start.json'));
  const baseXml = pick(path.join(dir, 'base.xml'), path.join(oracle, b, 'xml/04-mds-closure.xml'));
  if (!startXml || !startJson || !baseXml) throw new Error(`UXML_WEIGHTS_GATE_INPUT_MISSING: ${hide ? `model-${i + 1}` : b}`);
  const supportConfig = JSON.parse(fs.readFileSync(path.join(dir, 'choices.json'), 'utf8'));
  const choices = Object.keys(supportConfig.overrides?.rigidWeight || {}).length;
  if (control) delete supportConfig.overrides.rigidWeight;
  const snap = revive(JSON.parse(fs.readFileSync(startJson, 'utf8')));
  const stagedFile = STAGED[b] && path.join(bench, STAGED[b]);
  const stagedJsonText = stagedFile ? fs.readFileSync(stagedFile, 'utf8') : '';
  const out = runSupportsStage({ xmlText: fs.readFileSync(startXml, 'utf8'), stagedJsonText, supportConfig,
    masters: { materialMapRows: snap.config.material?.mapRows } });
  const want = leafValues(fs.readFileSync(baseXml, 'utf8'));
  const expected = JSON.parse(fs.readFileSync(path.join(dir, 'expected-weights.json'), 'utf8'));
  for (const [key, value] of Object.entries(expected)) { if (value === null) want.delete(key); else want.set(key, value); }
  const have = leafValues(out.xmlText);
  const tags = {};
  let weightsRight = 0;
  for (const key of new Set([...want.keys(), ...have.keys()])) {
    if (LENGTH.test(key)) continue;
    if (want.get(key) === have.get(key)) { if (key in expected) weightsRight += 1; continue; }
    const tag = key.replace(/\[\d+\]/g, '').replace(/#\d+$/, '').split('/').pop();
    tags[tag] = (tags[tag] || 0) + 1;
  }
  const problems = Object.values(tags).reduce((n, v) => n + v, 0);
  return { model: hide ? `model-${i + 1}` : b, choices, expectedWeights: Object.keys(expected).length, weightsRight,
    verdict: problems ? 'FAIL' : 'PASS', differences: tags };
});

const verdict = results.every((r) => r.verdict === 'PASS') ? 'PASS' : 'FAIL';
const report = { gate: 'uxml-v2-weights', control, verdict, models: results.length, results };
for (const r of results) {
  console.log(`${r.model}: ${r.verdict} choices ${r.choices}, weights ${r.weightsRight}/${r.expectedWeights}`
    + (r.verdict === 'FAIL' ? ` differences ${JSON.stringify(r.differences)}` : ''));
}
console.log(`weights gate${control ? ` (control ${control})` : ''}: ${verdict} ${results.filter((r) => r.verdict === 'PASS').length}/${results.length}`);
if (reportPath) fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.exit(verdict === 'PASS' ? 0 : 1);
