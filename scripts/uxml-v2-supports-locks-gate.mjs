// Gate for end-to-end plan E2b (uxml/v2/supports/SupportsUnderLocks.js): today's supports stage read back as recorded
// changes UNDER the transfer's locks must give what today's lock wrapper (uxml/v2/transfer/LockedEngineering.js) gives:
// the same XML with the same protection note, byte for byte, and the same conflict list, on every locked case it accepts.
// A lock on a duplicate ATTA node the stage removes (refused by today's wrapper) is joined into the node today keeps
// (Owner 20 Nov, "Yes, that join"): the output must be today's unlocked output plus the joined value, listed once.
//   node scripts/uxml-v2-supports-locks-gate.mjs [control] [--json report.json]
// Controls (each must FAIL): ignore-value-locks (the stage's value is written over a lock), take-locked-supports (the
// stage's supports taken on a node whose supports the transfer set), join-stage-wins (the kept node's value wins over the
// removed node's lock), keep-locked-node (the locked duplicate kept, as E2b did), remove-locked-node (removed, no join),
// no-join-names (the "|" names left out), names-in-engine (the XML with the "|" names given to the CII engine).
// The "|" names (Owner 20 Nov, "Write | in output"): on every case the XML the CII engine gets is the one compared with
// today; the XML output must be that XML except, on each kept node of a duplicate group today thinned, its NodeName and
// ComponentRefNo: the kept node's then the removed nodes' joined with "|" (once when the same on all). The groups are
// worked out here without ids: today's groups (xmlPositionKey, tolerance 1), the kept one by the name today still has.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { loadCalls, revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';
import { runSupportsUnderLocks } from '../uxml/v2/supports/SupportsUnderLocks.js';
import { SUPPORTS_STEPS } from '../uxml/v2/supports/SupportsAsChanges.js';
import { noteLockStage, transferStage } from '../uxml/v2/transfer/TransferStage.js';
import { readTransferNote, withoutTransferNote } from '../uxml/v2/transfer/TransferNote.js';
import { xmlPositionKey } from '../uxml/v2/supports/parent/ParentMatching.js';
import { runEngineeringUnderLocks } from '../uxml/v2/transfer/LockedEngineering.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const at = (...p) => path.join(ROOT, ...p);
const args = process.argv.slice(2);
const control = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--json') || null;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const CONTROLS = ['ignore-value-locks', 'take-locked-supports', 'join-stage-wins', 'keep-locked-node', 'remove-locked-node', 'no-join-names', 'names-in-engine'];
const NAMES = control === 'no-join-names' ? { names: false } : {};
/** The XML the CII engine gets (names-in-engine control: the one with the "|" names). */
const engineOf = (got) => (control === 'names-in-engine' ? got.xmlText : got.engineXmlText);
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
const asFull = (edit) => (xmlText) => { const out = edit(xmlText); return { xmlText: out, stages: Object.fromEntries(SUPPORTS_STEPS.map((id) => [id, out])) }; };
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

/**
 * The join (Owner 20 Nov, "Yes, that join"): a raw model, today's stage, and locks set on duplicate ATTA nodes today
 * removes. `pick(removedNode, keptNode)` gives the lock ops (removed node: one today removes, with a kept ATTA node
 * at its point; `supports`: both with supports). Returns the locked document, today's unlocked
 * output (the oracle), and the nodes.
 */
function joinCase(bench, pick, {supports = true} = {}) {
  const xmlText = fs.readFileSync(at('fixtures/uxml-v2-supports/oracle', bench, 'xml/engineering-pass-start.xml'), 'utf8');
  const doc = read(xmlText), full = benchStage(bench), today = full(xmlText);
  const out = read(today.stages['branch-pass']);
  const kept = new Set(out.pipelines.flatMap((p) => p.components.map((c) => tx(c, 'ComponentRefNo') + '|' + tx(c, 'Position'))));
  const all = doc.pipelines.flatMap((p) => p.components);
  const isKept = (c) => kept.has(tx(c, 'ComponentRefNo') + '|' + tx(c, 'Position'));
  const victim = all.find((c) => tx(c, 'ComponentType') === 'ATTA' && !isKept(c) && (!supports || c.restraints.length)
    && all.some((k) => k !== c && isKept(k) && tx(k, 'ComponentType') === 'ATTA' && tx(k, 'Position') === tx(c, 'Position') && (!supports || k.restraints.length)));
  const keeper = all.find((k) => isKept(k) && tx(k, 'ComponentType') === 'ATTA' && tx(k, 'Position') === tx(victim, 'Position'));
  const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
  const ops = pick(victim, keeper); // built once: the kernel runs a stage twice to check it is deterministic
  const stage = { id: 'gate-lock', rulesVersion: 'gate/1', reads: ['topology'], writes: LAYERS, run: () => ({ ops: structuredClone(ops) }) };
  return { doc: runStage(stage, doc).uxml, full, todayXml: today.xmlText, victim, keeper, names: expectedNames(xmlText, today.stages['branch-pass']) };
}
let lockOrder = 0; // the transfer's lock shape (TransferStage.js), so the protection note carries node-value locks
const lockValue = (uid, key, text) => [
  { op: 'set', uid, path: 'values.' + key, after: { v: Number(text) || text, text, src: 'transfer', rule: 'gate' } },
  { op: 'lock', uid, path: 'values.' + key, after: { by: 'transfer', receipt: 'gate', order: lockOrder++, field: 'Node/' + key } }];

/** Content lines of a PSI116 text, whatever the tag and support order (as the E2a gate's). */
function content(xmlText) {
  const doc = read(xmlText);
  const vals = (e) => Object.keys(e.values).sort().map((k) => `${k}=${e.values[k].text}`).join(' ');
  return doc.pipelines.flatMap((p) => [`B ${vals(p)}`, ...p.components.flatMap((c) => [`N ${vals(c)}`, ...c.restraints.map((r) => `  S ${vals(r)}`).sort()])]);
}
/** Lines in `a` not in `b`, counted (a multiset difference). */
function minus(a, b) {
  const n = new Map();
  for (const x of b) n.set(x, (n.get(x) || 0) + 1);
  return a.filter((x) => (n.get(x) ? (n.set(x, n.get(x) - 1), false) : true));
}

/** The "|" names today's removals call for, per branch and kept node name|reference, worked out without ids. */
function expectedNames(inputText, branchPassText) {
  const a = read(inputText), b = read(branchPassText), out = new Map();
  const id = (c) => tx(c, 'NodeName') + '\u0000' + tx(c, 'ComponentRefNo');
  const groupsOf = (q) => {
    const g = new Map();
    for (const c of q.components) {
      if (tx(c, 'ComponentType').toUpperCase() !== 'ATTA') continue;
      const k = xmlPositionKey(tx(c, 'Position'), 1);
      if (!k) continue;
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(c);
    }
    return g;
  };
  if (a.pipelines.length !== b.pipelines.length) throw new Error('gate: branch pass changed the branches');
  a.pipelines.forEach((p, i) => {
    const after = groupsOf(b.pipelines[i]);
    for (const [k, g] of groupsOf(p)) {
      const left = after.get(k) || [];
      if (left.length === g.length) continue;
      const keep = left.length === 1 ? g.filter((c) => id(c) === id(left[0])) : [];
      if (keep.length !== 1) throw new Error(`gate: group at ${k} not thinned to one known node`);
      const order = [keep[0], ...g.filter((c) => c !== keep[0])];
      const join = (key) => { const v = order.map((c) => tx(c, key)); return new Set(v).size === 1 ? v[0] : v.join('|'); };
      out.set(tx(p, 'Branchname') + '\u0000' + id(left[0]), { NodeName: join('NodeName'), ComponentRefNo: join('ComponentRefNo') });
    }
  });
  return out;
}
/** The XML output is the engine's XML except exactly the expected "|" names; null, or the problem. */
function checkNames(got, expect) {
  const blank = (t) => t.replace(/<(NodeName|ComponentRefNo)>[^<]*<\/\1>/g, '<$1/>');
  const segs = (t) => blank(t).split(/<Node[ >]/);
  const x = segs(got.xmlText), e = segs(got.engineXmlText);
  if (x.length !== e.length || x.some((s, i) => s !== e[i])) return { what: 'the output differs from the engine XML in more than the names' };
  const named = read(withoutTransferNote(got.xmlText)), plain = read(withoutTransferNote(got.engineXmlText));
  let joined = 0;
  for (const [i, p] of plain.pipelines.entries()) for (const [j, c] of p.components.entries()) {
    const n = named.pipelines[i].components[j];
    const want = expect.get(tx(p, 'Branchname') + '\u0000' + tx(c, 'NodeName') + '\u0000' + tx(c, 'ComponentRefNo'));
    for (const key of ['NodeName', 'ComponentRefNo']) {
      const w = want ? want[key] : tx(c, key);
      if (tx(n, key) !== w) return { what: 'names not as expected', node: tx(c, 'NodeNumber'), key, got: tx(n, key).slice(0, 80), want: w.slice(0, 80) };
    }
    if (want) joined += 1;
  }
  if (joined !== expect.size) return { what: 'kept nodes missing', joined, want: expect.size };
  return null;
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
    return runSupportsUnderLocks(strip, full, NAMES);
  }
  return runSupportsUnderLocks(doc, full, NAMES);
}

const report = { control, cases: {} };
let failed = 0;
const say = (id, problem) => { report.cases[id] = problem || 'PASS'; console.log(`${problem ? 'FAIL' : 'PASS'} ${id}${problem ? ' ' + JSON.stringify(problem).slice(0, 300) : ''}`); if (problem) failed += 1; };
for (const c of cases()) {
  let seen = null;
  const today = runEngineeringUnderLocks(c.doc, (t) => { const r = c.full(t); seen ??= { t, branchPass: r.stages['branch-pass'] }; return r.xmlText; });
  let got;
  try {
    got = control === 'take-locked-supports' ? runSupportsUnderLocks(c.doc, c.full, { takeLockedSupports: true, ...NAMES }) : spoiled(c.doc, c.full);
  } catch (e) { say(c.id, { refused: e.code || e.message }); continue; }
  const engine = engineOf(got);
  if (engine !== today.xmlText) { let i = 0; while (engine[i] === today.xmlText[i]) i += 1; say(c.id, { what: 'XML differs', at: i, got: engine.slice(i - 60, i + 60), want: today.xmlText.slice(i - 60, i + 60) }); continue; }
  const expect = expectedNames(seen.t, seen.branchPass), names = checkNames(got, expect);
  if (names) { say(c.id, names); continue; }
  const a = got.conflicts.map(key), b = today.conflicts.map(key);
  if (JSON.stringify(a) !== JSON.stringify(b)) { say(c.id, { what: 'conflicts differ', got: a, want: b }); continue; }
  if (got.conflicts.some((x) => !x.step)) { say(c.id, { what: 'a conflict names no sub-step' }); continue; }
  say(c.id + (expect.size ? ` (${expect.size} kept nodes with "|" names)` : ''), null);
}
const JOIN_OPTIONS = { 'join-stage-wins': { joinStageWins: true }, 'keep-locked-node': { noJoin: true }, 'remove-locked-node': { noJoin: true, removeLockedNodes: true } };
/** A join case: the result must equal today's unlocked output except the expected lines, and list the join. */
function checkJoin(id, c, expect) {
  let got;
  try { got = runSupportsUnderLocks(c.doc, c.full, { ...(JOIN_OPTIONS[control] || {}), ...NAMES }); } catch (e) { return say(id, expect.refused === (e.code || e.message) ? null : { refused: e.code || e.message }); }
  if (expect.refused) return say(id, { what: 'not refused', want: expect.refused });
  const a = content(withoutTransferNote(engineOf(got))), b = content(c.todayXml);
  const extra = minus(a, b), missing = minus(b, a);
  if (extra.length !== expect.lines || missing.length !== expect.lines || !extra.every((x) => x.includes(expect.text)))
    return say(id, { what: 'output is not today plus the joined value', extra: extra.slice(0, 3), missing: missing.slice(0, 3) });
  const j = got.joined?.[0];
  if (got.joined?.length !== 1 || j.from !== tx(c.victim, 'NodeNumber') || j.into !== tx(c.keeper, 'NodeNumber') || !j.replaced.some((r) => r.kept === expect.value))
    return say(id, { what: 'join not listed', joined: got.joined });
  // PR 301 review N2: the joined value is still locked on the kept node, the note carries it, and nothing else conflicts.
  const kept = got.uxml.pipelines.flatMap((p) => p.components).find((x) => x.uid === c.keeper.uid);
  const lockedThere = kept && [kept, ...kept.restraints].some((e) => Object.values(e.values).some((v) => v?.lock && v.text === expect.value));
  if (!lockedThere) return say(id, { what: 'joined value not locked on the kept node' });
  // A node value lock is written in the note under the kept node (a support value lock goes with the supports lock).
  const listed = readTransferNote(got.xmlText)?.note?.nodes?.[tx(got.uxml.pipelines.find((p) => p.components.includes(kept)), 'Branchname') + '|' + tx(kept, 'NodeNumber')] ?? [];
  if (expect.noteKey && !listed.includes(expect.noteKey)) return say(id, { what: 'note does not carry the joined lock', listed });
  if (got.conflicts.length) return say(id, { what: 'conflicts listed', conflicts: got.conflicts.map(key) });
  const names = checkNames(got, c.names);
  if (names) return say(id, names);
  return say(`${id} (${c.names.size} kept nodes with "|" names)`, null);
}
{
  const stiff = joinCase('EF05', (v) => lockValue(v.restraints[0].uid, 'Stiffness', '2.000000E+12'));
  checkJoin('EF-05 join: a locked support stiffness moves to the kept node', stiff, { lines: 1, text: 'Stiffness=2.000000E+12', value: '2.000000E+12' });
  const weight = joinCase('RMS-BLOW-1', (v) => lockValue(v.uid, 'Weight', '5'), { supports: false });
  checkJoin('RMS-BLOW-1 join: a locked node value moves to the kept node', weight, { lines: 1, text: 'Weight=5', value: '5', noteKey: 'Weight' });
  const name = joinCase('EF05', (v) => [{ op: 'lock', uid: v.uid, path: 'values.NodeName', after: { field: 'Node/NodeName', source: 'gate' } }]);
  checkJoin("EF-05 join: a lock on the removed node's name is refused", name, { refused: 'UXML_JOIN_IDENTITY_LOCKED' });
  const two = joinCase('EF05', (v, k) => [...lockValue(v.restraints[0].uid, 'Stiffness', '2.000000E+12'), ...lockValue(k.restraints[0].uid, 'Stiffness', '3.000000E+12')]);
  checkJoin('EF-05 join: two different locks on one value are refused', two, { refused: 'UXML_JOIN_LOCKS_DIFFER' });
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(failed ? `FAIL ${failed} case(s) (${control || 'stage'})` : `PASS every case (${control || 'stage'})`);
process.exitCode = failed ? 1 : 0;
