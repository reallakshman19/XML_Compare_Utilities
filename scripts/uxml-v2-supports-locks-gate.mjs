// Gate for end-to-end plan E2b (uxml/v2/supports/SupportsUnderLocks.js): today's supports stage read back as recorded
// changes UNDER the transfer's locks must give what today's lock wrapper (uxml/v2/transfer/LockedEngineering.js) gives:
// the same XML with the same protection note, byte for byte, and the same conflict list, on every locked case it accepts.
// One case it refuses today (a lock on a duplicate ATTA node the stage removes) must keep that node and list it once.
//   node scripts/uxml-v2-supports-locks-gate.mjs [control] [--json report.json]
// Controls (each must FAIL): ignore-value-locks (the stage's value is written over a lock), take-locked-supports (the
// stage's supports taken on a node whose supports the transfer set), remove-locked-node (a locked duplicate removed).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { loadCalls, revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';
import { runSupportsUnderLocks } from '../uxml/v2/supports/SupportsUnderLocks.js';
import { noteLockStage, transferStage } from '../uxml/v2/transfer/TransferStage.js';
import { readTransferNote } from '../uxml/v2/transfer/TransferNote.js';
import { runEngineeringUnderLocks } from '../uxml/v2/transfer/LockedEngineering.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const at = (...p) => path.join(ROOT, ...p);
const args = process.argv.slice(2);
const control = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--json') || null;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const CONTROLS = ['ignore-value-locks', 'take-locked-supports', 'remove-locked-node'];
if (control && !CONTROLS.includes(control)) throw new Error(`unknown control ${control}`);
const read = (t) => readPsi116V2(t, { fileSha256: sha256Hex(t) });
const tx = (e, k) => String(e?.values?.[k]?.text ?? '');

/** Today's supports stage with one model's recorded config (the supports gate's inputs). */
function benchStage(bench) {
  const dir = at('fixtures/uxml-v2-supports/oracle', bench, 'xml');
  const snap = revive(JSON.parse(fs.readFileSync(path.join(dir, 'engineering-pass-start.json'), 'utf8')));
  const dtxr = loadCalls([at('fixtures/uxml-v2-supports/core-calls', `${bench}.substep-calls.json`)]).find((c) => c.name === 'enrichStandaloneDtxrAnnotations');
  const [, stagedJsonText, supportConfig] = revive(dtxr.args);
  return (xmlText) => runSupportsStage({ xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows } });
}
const rows = JSON.parse(fs.readFileSync(at('fixtures/uxml-v2-supports/bench/default-material-map-rows.json'), 'utf8'));
const ef05Stage = (xmlText) => runSupportsStage({ xmlText, stagedJsonText: '', supportConfig: {}, masters: { materialMapRows: rows } });

/** EF-05: the three scripted support changes of tests/uxml-v2-supports-apply.test.mjs (node 50 edited, 90 removed, 240 added). */
function ef05SupportsReceipt(doc) {
  const texts = (r) => Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v.text]));
  const nodeAt = (n) => {
    for (const [bi, p] of doc.pipelines.entries()) {
      const ni = p.components.findIndex((c) => tx(c, 'NodeNumber') === String(n));
      if (ni >= 0) return { comp: p.components[ni], ref: { branchOrdinal: bi, branchName: tx(p, 'Branchname'), nodeOrdinal: ni, nodeNumber: String(n) } };
    }
    throw new Error('no node ' + n);
  };
  const n50 = nodeAt(50), n90 = nodeAt(90), n240 = nodeAt(240), r50 = texts(n50.comp.restraints[0]);
  return { format: 'u2.transfer-receipt', version: 1, ok: true, base: { sha256: doc.sources[0].sha256 }, changes: [], refused: [],
    supports: { refused: [], changes: [
      { ciiNode: '50', kind: 'edited', ref: n50.ref, restraintCount: 1, restraints: [{ op: 'edit', index: 0, before: r50, after: { ...r50, Stiffness: '2.000000E+12' } }] },
      { ciiNode: '90', kind: 'removed', ref: n90.ref, restraintCount: 1, restraints: [{ op: 'remove', index: 0, before: texts(n90.comp.restraints[0]) }] },
      { ciiNode: '240', kind: 'added', ref: n240.ref, restraintCount: 0, restraints: [{ op: 'add', after: { Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0' } }] },
    ] } };
}
/** Stand-in stages (text edits, as the real stage writes text), wrapped so every sub-step gives the same output. */
const asFull = (edit) => (xmlText) => { const out = edit(xmlText); return { xmlText: out, stages: new Proxy({}, { get: () => out }) }; };
const putBack = (text) => {
  const a = text.indexOf('<NodeNumber>50</NodeNumber>'), r = text.indexOf('<Restraint>', a);
  const restraint = text.slice(r, text.indexOf('</Restraint>', r) + '</Restraint>'.length);
  const b = text.indexOf('<NodeNumber>90</NodeNumber>'), end = text.indexOf('</Node>', b);
  return text.slice(0, end) + restraint + text.slice(end);
};
const resetStiffness = (text) => {
  const a = text.indexOf('<NodeNumber>50</NodeNumber>'), s = text.indexOf('<Stiffness>', a), e = text.indexOf('</Stiffness>', s);
  return text.slice(0, s) + '<Stiffness>1.751270E+12' + text.slice(e);
};

function cases() {
  const bm2 = (f) => fs.readFileSync(at('fixtures/uxml-v2-transfer/BM2', f), 'utf8');
  const receiptText = bm2('receipt.json');
  const bm2Doc = runStage(transferStage, read(bm2('base.xml')), { receipt: JSON.parse(receiptText), receiptSha256: sha256Hex(receiptText) }).uxml;
  const prot = bm2('protected.xml'), note = readTransferNote(prot);
  const bm2Note = runStage(noteLockStage, read(prot), { note: note.note, noteSha256: sha256Hex(note.raw) }).uxml;
  const ef05Text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(fs.readFileSync(at('fixtures/uxml-v2-transfer/EF05/base.xml')));
  const ef05 = read(ef05Text);
  const ef05Sup = runStage(transferStage, ef05, { receipt: ef05SupportsReceipt(ef05), receiptSha256: 'r'.repeat(64) }).uxml;
  const bs = benchStage('BM2');
  return [
    { id: 'BM2 transfer', doc: bm2Doc, full: bs },
    { id: 'BM2 from the note', doc: bm2Note, full: bs },
    { id: 'BM2 no locks', doc: read(prot.replace(note.raw, '')), full: bs },
    { id: 'EF-05 supports locks', doc: ef05Sup, full: ef05Stage },
    { id: 'EF-05 stage puts a removed support back', doc: ef05Sup, full: asFull(putBack) },
    { id: 'EF-05 stage resets a locked stiffness', doc: ef05Sup, full: asFull(resetStiffness) },
    { id: 'EF-05 no locks', doc: ef05, full: ef05Stage },
  ];
}

/** RMS-BLOW-1, raw: a lock on one duplicate ATTA node the stage removes (refused by today's wrapper). */
function lockedDuplicateCase() {
  const xmlText = fs.readFileSync(at('fixtures/uxml-v2-supports/oracle/RMS-BLOW-1/xml/engineering-pass-start.xml'), 'utf8');
  const doc = read(xmlText), full = benchStage('RMS-BLOW-1'), today = full(xmlText);
  const out = read(today.stages['branch-pass']);
  const kept = new Set(out.pipelines.flatMap((p) => p.components.map((c) => tx(c, 'ComponentRefNo') + '|' + tx(c, 'Position'))));
  const victim = doc.pipelines.flatMap((p) => p.components).find((c) => tx(c, 'ComponentType') === 'ATTA' && !kept.has(tx(c, 'ComponentRefNo') + '|' + tx(c, 'Position')));
  const lock = { field: 'Node/NodeName', source: 'gate' };
  const stage = { id: 'gate-lock', rulesVersion: 'gate/1', reads: ['topology'], writes: ['topology', 'engineering', 'supports', 'names', 'other'],
    run: () => ({ ops: [{ op: 'lock', uid: victim.uid, path: 'values.NodeName', after: lock }] }) };
  return { doc: runStage(stage, doc).uxml, full, victim };
}

const key = (c) => [c.branch, c.node, c.key, c.kept, c.stageWanted].join(' | ');
function spoiled(doc, full) {
  if (control === 'ignore-value-locks') {
    // The wrong route: value locks dropped (by kernel unlock ops, so the document stays sealed), supports locks kept.
    const ops = [];
    for (const e of [...doc.pipelines, ...doc.pipelines.flatMap((p) => p.components)])
      for (const [k, v] of Object.entries(e.values || {})) if (v?.lock && !v.lock.supports) ops.push({ op: 'unlock', uid: e.uid, path: 'values.' + k });
    const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
    const strip = runStage({ id: 'unlock', rulesVersion: 'gate/1', reads: ['topology'], writes: LAYERS, run: () => ({ ops }) }, doc).uxml;
    return runSupportsUnderLocks(strip, full);
  }
  return runSupportsUnderLocks(doc, full);
}

const report = { control, cases: {} };
let failed = 0;
const say = (id, problem) => { report.cases[id] = problem || 'PASS'; console.log(`${problem ? 'FAIL' : 'PASS'} ${id}${problem ? ' ' + JSON.stringify(problem).slice(0, 300) : ''}`); if (problem) failed += 1; };
for (const c of cases()) {
  const today = runEngineeringUnderLocks(c.doc, (t) => c.full(t).xmlText);
  let got;
  try {
    got = control === 'take-locked-supports' ? runSupportsUnderLocks(c.doc, c.full, { takeLockedSupports: true }) : spoiled(c.doc, c.full);
  } catch (e) { say(c.id, { refused: e.code || e.message }); continue; }
  if (got.xmlText !== today.xmlText) { let i = 0; while (got.xmlText[i] === today.xmlText[i]) i += 1; say(c.id, { what: 'XML differs', at: i, got: got.xmlText.slice(i - 60, i + 60), want: today.xmlText.slice(i - 60, i + 60) }); continue; }
  const a = got.conflicts.map(key), b = today.conflicts.map(key);
  if (JSON.stringify(a) !== JSON.stringify(b)) { say(c.id, { what: 'conflicts differ', got: a, want: b }); continue; }
  if (got.conflicts.some((x) => !x.step)) { say(c.id, { what: 'a conflict names no sub-step' }); continue; }
  say(c.id, null);
}
{
  const { doc, full, victim } = lockedDuplicateCase();
  let got;
  try { got = control === 'remove-locked-node' ? runSupportsUnderLocks(doc, full, { removeLockedNodes: true }) : spoiled(doc, full); } catch (e) { got = { refused: e.code || e.message }; }
  const nodeConflicts = got.conflicts?.filter((x) => x.key === 'Node') || [];
  const stillThere = got.uxml?.pipelines.some((p) => p.components.some((c) => c.uid === victim.uid));
  if (got.refused) say('RMS-BLOW-1 locked duplicate kept', { refused: got.refused });
  else if (!stillThere || nodeConflicts.length !== 1 || nodeConflicts[0].node !== tx(victim, 'NodeNumber') || nodeConflicts[0].step !== 'branch-pass')
    say('RMS-BLOW-1 locked duplicate kept', { what: 'locked node not kept and listed once', stillThere, nodeConflicts });
  else say('RMS-BLOW-1 locked duplicate kept', null);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(failed ? `FAIL ${failed} case(s) (${control || 'stage'})` : `PASS every case (${control || 'stage'})`);
process.exitCode = failed ? 1 : 0;
