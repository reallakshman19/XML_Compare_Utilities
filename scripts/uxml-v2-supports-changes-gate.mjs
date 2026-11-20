// Gate for end-to-end plan E2a (uxml/v2/supports/SupportsAsChanges.js): today's supports stage, read back after every
// sub-step as recorded changes on the UXML document, must write the XML today's stage gives, byte for byte, after every
// sub-step and at the end. Inputs per model are the supports stage gate's: oracle/<B>/xml/engineering-pass-start.xml,
// the job config from the recorded DTXR call, and the material map rows from the snapshot.
//   node scripts/uxml-v2-supports-changes-gate.mjs [control] [--bench <model>] [--json report.json]
// Identity (PR 299 review): a kept node never changes NodeName or ComponentRefNo (today never does), and a kept support
// never changes Type except PSI116 Z to CAESAR II Y, so no op hands one node's or support's identity to another.
// Support order inside a node is not compared (Owner 20 Nov: it does not matter); everything else is, by byte at the end.
// Controls (each must FAIL): drop-support (one new support not recorded), wrong-duplicate (duplicate ATTA nodes matched
// by position and type only, first of a tie kept), by-number (nodes matched by NodeNumber), by-place (supports paired by
// their place on the node).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { loadCalls, revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';
import { parsePlainXml, serializePlainXml } from '../uxml/v2/supports/PlainDom.js';
import { changesFromXml, countChanges, engineXml, SUPPORTS_AS_CHANGES_RULES } from '../uxml/v2/supports/SupportsAsChanges.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ORACLE = path.join(ROOT, 'fixtures/uxml-v2-supports/oracle');
const CALLS = path.join(ROOT, 'fixtures/uxml-v2-supports/core-calls');
const STEPS = ['branch-pass', '01-parent-enrichment', '02-dtxr-enrichment', '02b-process-parity', '03-atta-default', '04-mds-closure'];
const args = process.argv.slice(2);
const control = args.find((a, i) => !a.startsWith('--') && !['--json', '--bench'].includes(args[i - 1])) || null;
const only = args.includes('--bench') ? args[args.indexOf('--bench') + 1] : null;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const CONTROLS = ['drop-support', 'wrong-duplicate', 'by-number', 'by-place'];
if (control && !CONTROLS.includes(control)) throw new Error(`unknown control ${control}`);
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const tx = (e, k) => String(e?.values?.[k]?.text ?? '').trim();

const AXIS = { Z: 'Y', '+Z': '+Y', '-Z': '-Y' };
const OPTIONS = {
  'wrong-duplicate': { nodeKey: (c) => `${tx(c, 'Position')}|${tx(c, 'ComponentType')}`, firstOfTies: true },
  'by-number': { nodeKey: (c) => tx(c, 'NodeNumber') },
  'by-place': { byPlace: true },
};

/** The drop-support control: one new support of the sub-step not recorded. */
function spoil(ops) {
  if (control === 'drop-support') { const at = ops.findIndex((o) => o.op === 'add'); if (at >= 0) ops.splice(at, 1); }
  return ops;
}

/** The first op that hands a node's or a support's identity to another, or null. */
function identitySwap(doc, ops) {
  const byUid = new Map();
  for (const p of doc.pipelines) for (const c of p.components) { byUid.set(c.uid, c); for (const r of c.restraints) byUid.set(r.uid, r); }
  for (const o of ops) {
    const e = byUid.get(o.uid);
    if (o.op !== 'set' || !e || !o.path.startsWith('values.')) continue;
    const key = o.path.slice('values.'.length), was = tx(e, key), now = String(o.after?.text ?? '').trim();
    if (e.kind !== 'restraint' && (key === 'NodeName' || key === 'ComponentRefNo')) return { uid: o.uid, key, was, now };
    if (e.kind === 'restraint' && key === 'Type' && (AXIS[was] ?? was) !== now) return { uid: o.uid, key, was, now };
  }
  return null;
}

/** Support order inside each node set aside: each node's run of <Restraint> elements sorted. */
const supportsSorted = (xmlText) => xmlText.replace(/(?:<Restraint>[\s\S]*?<\/Restraint>\s*)+(?=<\/Node>)/g, (run) => {
  const parts = run.match(/<Restraint>[\s\S]*?<\/Restraint>\s*/g), tail = /\s*$/.exec(parts.at(-1))[0];
  const gap = parts.length > 1 ? /\s*$/.exec(parts[0])[0] : '';
  return parts.map((x) => x.trimEnd()).sort().join(gap) + tail;
});

/** A PSI116 text's content, whatever the tag order: one line per branch, node and support, values sorted by tag. */
function content(xmlText) {
  const doc = readPsi116V2(xmlText, { fileSha256: sha256Hex(xmlText) });
  const vals = (e) => Object.keys(e.values).sort().map((k) => `${k}=${e.values[k].text}`).join(' ');
  return doc.pipelines.flatMap((p) => [`B ${vals(p)}`, ...p.components.flatMap((c) => [`N ${vals(c)}`, ...c.restraints.map((r) => `  S ${vals(r)}`).sort()])]).join('\n');
}

function check(bench) {
  const dir = path.join(ORACLE, bench, 'xml');
  const xmlText = fs.readFileSync(path.join(dir, 'engineering-pass-start.xml'), 'utf8');
  const snap = revive(JSON.parse(fs.readFileSync(path.join(dir, 'engineering-pass-start.json'), 'utf8')));
  const dtxr = loadCalls([path.join(CALLS, `${bench}.substep-calls.json`)]).find((c) => c.name === 'enrichStandaloneDtxrAnnotations');
  const [, stagedJsonText, supportConfig] = revive(dtxr.args);
  const today = runSupportsStage({ xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows } });
  let uxml = readPsi116V2(xmlText, { fileSha256: sha256Hex(xmlText) });
  const problems = [], counts = {};
  for (const id of STEPS) {
    const stepXml = today.stages[id];
    let ops;
    try { ops = spoil(changesFromXml(uxml, stepXml, id, OPTIONS[control] || {})); } catch (e) { problems.push({ step: id, refused: e.code || e.message }); break; }
    const swap = identitySwap(uxml, ops);
    if (swap) { problems.push({ step: id, what: 'identity handed to another node or support', ...swap }); break; }
    counts[id] = countChanges(uxml, ops);
    const stage = { id: 'supports:' + id, rulesVersion: SUPPORTS_AS_CHANGES_RULES, reads: ['topology'], writes: LAYERS, run: () => ({ ops, diagnostics: [] }) };
    try { uxml = runStage(stage, uxml, {}, {}, { inputHashes: [sha256Hex(stepXml)] }).uxml; } catch (e) { problems.push({ step: id, kernelRefused: e.code || e.message }); break; }
    try { engineXml(uxml); } catch (e) { problems.push({ step: id, writeRefused: e.code, details: e.details }); break; }
    // Between sub-steps today's code leaves new tags after a node's restraints (the last sub-step moves restraints last),
    // so there the content is compared: every branch and node as its sorted lines. The engine's XML is compared by byte.
    const got = engineXml(uxml), want = serializePlainXml(parsePlainXml(today.stages[id]));
    if (content(got) !== content(want)) { const a = content(got), b = content(want); let at = 0; while (a[at] === b[at]) at += 1; problems.push({ step: id, what: 'content differs', got: a.slice(at - 80, at + 80), want: b.slice(at - 80, at + 80) }); break; }
  }
  if (!problems.length && supportsSorted(engineXml(uxml)) !== supportsSorted(today.xmlText)) { const got = supportsSorted(engineXml(uxml)), want = supportsSorted(today.xmlText); let at = 0; while (got[at] === want[at]) at += 1; problems.push({ step: 'final', what: 'engine XML differs by byte (support order aside)', at, got: got.slice(at - 80, at + 80), want: want.slice(at - 80, at + 80) }); }
  return { problems, counts };
}

const report = { control, models: {} };
let failed = 0;
for (const bench of fs.readdirSync(ORACLE).filter((b) => (!only || b === only) && fs.existsSync(path.join(ORACLE, b, 'xml', 'engineering-pass-start.xml')))) {
  const r = check(bench);
  report.models[bench] = r;
  const total = Object.values(r.counts).reduce((m, c) => { for (const [k, v] of Object.entries(c)) m[k] = (m[k] || 0) + v; return m; }, {});
  console.log(`${r.problems.length ? 'FAIL' : 'PASS'} ${bench.padEnd(12)} ${JSON.stringify(total)}${r.problems.length ? ' ' + JSON.stringify(r.problems[0]).slice(0, 300) : ''}`);
  if (r.problems.length) failed += 1;
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(failed ? `FAIL ${failed} model(s) (${control || 'stage'})` : `PASS every model (${control || 'stage'})`);
process.exitCode = failed ? 1 : 0;
