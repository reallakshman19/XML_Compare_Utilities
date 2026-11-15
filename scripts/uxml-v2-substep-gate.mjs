// Gate for buddy batches 2 and 3: a ported support sub-step must give today's support result on the 5 public models.
//   node scripts/uxml-v2-substep-gate.mjs <impl> <parent-loop|dtxr|atta|mds> [--json report.json]
//   <impl> = an ES module exporting the port, or a control: "recorded" (today's own outputs: must PASS),
//            "identity" (returns its input XML unchanged: must FAIL), "refuse" (throws: must FAIL).
// The port gets `core` last: createReplayCore over today's recorded core, ledger, config and sub-step calls.
//   parent-loop: parentSupportLoop({sourceXmlText, loopStartXmlText, stagedJsonText, config, tolerance, diagnostics}, core) -> {xmlText}
//   dtxr:        enrichStandaloneDtxrAnnotations(xmlText, stagedJsonText, config, core) -> {text, stats, diagnostics}
//   atta:        closeGovernedAttaDefaultRestraintsXml(xmlText, config, core)          -> {xmlText, changed, stats, diagnostics}
//   mds:         closeGovernedMdsPositionRestraintsXml(xmlText, stagedJsonText, config, core) -> {xmlText, changed, stats, diagnostics}
// Checked per model: the support table of the output XML (every node, support value and restraint, in order),
// and for dtxr/atta/mds also stats, `changed` and the count of diagnostics per type.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { supportTableOf } from '../uxml/v2/supports/SupportTable.js';
import { createReplayCore } from '../uxml/v2/supports/CoreReplay.js';
import { loadCalls, revive, canonical } from '../uxml/v2/supports/CoreCallsLib.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FX = path.join(ROOT, 'fixtures/uxml-v2-supports');
const SOURCES = {
  G30: ['fixtures/uxml-v2/golden-30.xml', 'bench/golden-30_staged.json'], 'G30-NOJSON': ['fixtures/uxml-v2/golden-30.xml', null],
  'G30-CUSTOM': ['fixtures/uxml-v2/golden-30.xml', 'bench/golden-30_staged.json'], 'RMS-BLOW-1': ['bench/RMS-BLOW-1.xml', null],
  'ACTIVE-AUDIT': ['bench/active-audit-ns.xml', 'bench/active-audit.json'],
};
const ENTRY = { dtxr: 'enrichStandaloneDtxrAnnotations', atta: 'closeGovernedAttaDefaultRestraintsXml', mds: 'closeGovernedMdsPositionRestraintsXml' };
const read = (p) => fs.readFileSync(p.startsWith('fixtures/') ? path.join(ROOT, p) : path.join(FX, p), 'utf8');
const table = (text) => supportTableOf(readPsi116V2(text, { fileSha256: createHash('sha256').update(text).digest('hex') }));
const typeCounts = (list) => { const o = {}; for (const d of list || []) o[d?.type ?? '?'] = (o[d?.type ?? '?'] || 0) + 1; return o; };

const argv = process.argv.slice(2);
const at = argv.indexOf('--json');
const reportPath = at >= 0 ? argv.splice(at, 2)[1] : null;
const [impl, substep] = argv;
if (!['parent-loop', 'dtxr', 'atta', 'mds'].includes(substep)) throw new Error('substep must be parent-loop, dtxr, atta or mds');
const port = ['recorded', 'identity', 'refuse'].includes(impl) ? null : await import(pathToFileURL(path.resolve(impl)).href);

/** One model's case: the inputs the port gets and today's answer. */
function caseOf(bench) {
  const files = ['core', 'ledger', 'config', 'substep'].map((g) => path.join(FX, 'core-calls', `${bench}.${g}-calls.json`));
  const core = createReplayCore(files);
  if (substep === 'parent-loop') {
    const [src, staged] = SOURCES[bench];
    const snap = revive(JSON.parse(read(`oracle/${bench}/xml/parent-support-loop-start.json`)));
    // Today's diagnostics array already holds the master-load entries when buildStagedSupportIndex receives it.
    const indexCall = loadCalls([files[0]]).find((c) => c.name === 'buildStagedSupportIndex');
    const input = { sourceXmlText: read(src), loopStartXmlText: read(`oracle/${bench}/xml/parent-support-loop-start.xml`),
      stagedJsonText: staged ? read(staged) : '', config: snap.config, tolerance: snap.tolerance,
      diagnostics: revive(indexCall.args[2]) };
    return { core, args: [input], inputXml: input.loopStartXmlText, want: { xmlText: read(`oracle/${bench}/xml/parent-support-loop-end.xml`) } };
  }
  const call = loadCalls([files[3]]).find((c) => c.name === ENTRY[substep]);
  const args = revive(call.args).slice(0, substep === 'atta' ? 2 : 3);
  return { core, args, inputXml: args[0], want: revive(call.result) };
}

function runPort(c) {
  if (impl === 'recorded') return c.want;
  if (impl === 'identity') return { xmlText: c.inputXml, text: c.inputXml, changed: false, stats: {}, diagnostics: [] };
  if (impl === 'refuse') throw new Error('REFUSED');
  const fn = substep === 'parent-loop' ? port.parentSupportLoop : port[ENTRY[substep]];
  if (typeof fn !== 'function') throw new Error('MISSING_EXPORT ' + (substep === 'parent-loop' ? 'parentSupportLoop' : ENTRY[substep]));
  return fn(...c.args, c.core);
}

function check(bench) {
  const c = caseOf(bench);
  const problems = [];
  let got;
  try { got = runPort(c); } catch (e) { return [{ what: 'threw', message: String(e?.message || e).slice(0, 400) }]; }
  const outText = substep === 'dtxr' ? (got?.text ?? '') : (got?.xmlText ?? '');
  const wantText = substep === 'dtxr' ? c.want.text : c.want.xmlText;
  const a = table(outText || c.inputXml), b = table(wantText || c.inputXml);
  if (a.length !== b.length) problems.push({ what: 'node count', got: a.length, want: b.length });
  const rows = b.map((r, i) => (canonical(a[i]) === canonical(r) ? null : { nodeIndex: r.nodeIndex, branch: r.branch, NodeNumber: r.NodeNumber })).filter(Boolean);
  if (rows.length) problems.push({ what: 'support table rows differ', count: rows.length, first: rows.slice(0, 5) });
  if (substep !== 'parent-loop') {
    if (canonical(got?.stats ?? {}) !== canonical(c.want.stats ?? {})) problems.push({ what: 'stats', got: got?.stats, want: c.want.stats });
    if (substep !== 'dtxr' && Boolean(got?.changed) !== Boolean(c.want.changed)) problems.push({ what: 'changed', got: got?.changed, want: c.want.changed });
    if (canonical(typeCounts(got?.diagnostics)) !== canonical(typeCounts(c.want.diagnostics))) problems.push({ what: 'diagnostic counts per type', got: typeCounts(got?.diagnostics), want: typeCounts(c.want.diagnostics) });
  }
  const misses = c.core.__replay.misses;
  if (misses.length) problems.push({ what: 'CORE_REPLAY_MISS during the run', count: misses.length, first: misses.slice(0, 5) });
  return problems;
}

const perBench = {};
for (const bench of Object.keys(SOURCES)) perBench[bench] = check(bench);
const failing = Object.entries(perBench).filter(([, p]) => p.length).map(([b]) => b);
const report = { impl, substep, verdict: failing.length ? 'FAIL' : 'PASS', failing, perBench };
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 4000));
process.exitCode = failing.length ? 1 : 0;
