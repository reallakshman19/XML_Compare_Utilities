// End-to-end plan E2b (Owner 20 Nov 2026): E2a's read-back under the transfer's locks. Two support pairing gaps from the
// PR 299 re-check, the locked-node rule, the join (Owner 20 Nov, "Yes, that join"), and the gate: the same XML, note
// and conflicts as today's lock wrapper on the locked samples; the join cases; wrong controls fail.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { changesFromXml, placeIds } from '../uxml/v2/supports/SupportsAsChanges.js';
import { holdBackLocked, runSupportsUnderLocks } from '../uxml/v2/supports/SupportsUnderLocks.js';
import { joinNames, joinNamesPlan } from '../uxml/v2/supports/JoinNames.js';
import { SUPPORTS_STEPS } from '../uxml/v2/supports/SupportsAsChanges.js';
import { joinDuplicates } from '../uxml/v2/supports/JoinDuplicates.js';

const NS = ' xmlns="http://aveva.com/pipeStress116.xsd"';
const node = (n, extra = '', type = 'ATTA', x = 0) => `<Node><NodeNumber>${n}</NodeNumber><NodeName>N${n}</NodeName><ComponentType>${type}</ComponentType>`
  + `<ComponentRefNo>=1/${n}</ComponentRefNo><Position>${x} 0 0</Position><Endpoint>1</Endpoint>${extra}</Node>`;
const xml = (nodes) => `<?xml version="1.0"?>\n<PipeStressExport${NS}><Pipe><Branch><Branchname>/B1</Branchname>${nodes}</Branch></Pipe></PipeStressExport>`;
const read = (t) => readPsi116V2(t, { fileSha256: sha256Hex(t) });
const R = (type, extra = '') => `<Restraint><Type>${type}</Type>${extra}</Restraint>`;
const ids = (doc, text, keep = doc.pipelines[0].components) => placeIds(text, [{ uid: doc.pipelines[0].uid, nodes: keep.map((c) => c.uid) }]);

test('the one support left on a node keeps its uid when its Type changes (so a lock on it stays)', () => {
  const doc = read(xml(node(10, R('ANCI'))));
  const r = doc.pipelines[0].components[0].restraints[0];
  const ops = changesFromXml(doc, ids(doc, xml(node(10, R('+Y')))), 't');
  assert.deepEqual(ops.map((o) => [o.op, o.uid, o.path]), [['set', r.uid, 'values.Type']]);
});

test('a removal of a node holding a lock is held back; supports of a supports-locked node are not taken', () => {
  const doc = read(xml(node(10) + node(20, R('+Y'), 'ATTA', 50)));
  const [a, b] = doc.pipelines[0].components;
  const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
  const locked = runStage({ id: 'l', rulesVersion: 'l/1', reads: ['topology'], writes: LAYERS, run: () => ({ ops: [
    { op: 'lock', uid: a.uid, path: 'values.NodeName', after: { field: 'Node/NodeName' } },
    { op: 'lock', uid: b.uid, path: 'values.NodeNumber', after: { field: 'Node/Supports', supports: true } },
  ] }) }, doc).uxml;
  const ops = changesFromXml(locked, ids(locked, xml(node(20, R('GUI'), 'ATTA', 50)), [locked.pipelines[0].components[1]]), 't');
  const { taken, held } = holdBackLocked(locked, ops);
  assert.deepEqual(held.map((h) => [h.kind, h.uid]), [['node', a.uid], ['supports', b.uid]]);
  assert.deepEqual(taken, []);
});

const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const stageOf = (ops) => ({ id: 'l', rulesVersion: 'l/1', reads: ['topology'], writes: LAYERS, run: () => ({ ops }) });
const setLock = (uid, key, text) => [{ op: 'set', uid, path: 'values.' + key, after: { v: Number(text) || text, text, src: 'transfer', rule: 't' } },
  { op: 'lock', uid, path: 'values.' + key, after: { field: 'Node/' + key } }];

test('review note N4: a Z support that stays Z keeps its uid', () => {
  const doc = read(xml(node(10, R('Z', '<Gap>1</Gap>'))));
  const r = doc.pipelines[0].components[0].restraints[0];
  assert.deepEqual(changesFromXml(doc, ids(doc, xml(node(10, R('Z', '<Gap>2</Gap>')))), 't').map((o) => [o.op, o.uid]), [['set', r.uid]]);
});

test('the join (Owner 20 Nov): same once, only-on-removed moved, a locked value wins, removed node released', () => {
  const doc = read(xml(node(10, R('Z', '<Stiffness>0</Stiffness>')) + node(20, R('Z', '<Stiffness>0</Stiffness>') + R('GUI'))));
  const [k, r] = doc.pipelines[0].components;
  const locked = runStage(stageOf([...setLock(r.restraints[0].uid, 'Stiffness', '2E+12'), ...setLock(r.uid, 'Weight', '5')]), doc).uxml;
  const j = joinDuplicates(locked, [{ branch: '/B1', from: r.uid, into: k.uid }]);
  const kept = j.uxml.pipelines[0].components[0], gone = j.uxml.pipelines[0].components[1];
  assert.equal(kept.values.Weight.text, '5'); assert.ok(kept.values.Weight.lock);
  assert.equal(kept.restraints[0].values.Stiffness.text, '2E+12'); assert.ok(kept.restraints[0].values.Stiffness.lock);
  assert.deepEqual(kept.restraints.map((x) => x.values.Type.text), ['Z', 'GUI'], 'the identical Z once, the GUI moved');
  assert.ok(![gone, ...gone.restraints].some((e) => Object.values(e.values).some((v) => v.lock)), 'the removed node holds no lock');
  assert.deepEqual(j.joined[0].replaced.map((x) => x.key), ['Stiffness'], 'differs: the lock wins');
  assert.ok(j.joined[0].moved.some((x) => x.key === 'Weight' && x.locked), 'only on the removed node: moved, locked');
});

test('the join refuses a lock on an identity value and two different locks on one value', () => {
  const doc = read(xml(node(10) + node(20)));
  const [k, r] = doc.pipelines[0].components;
  const name = runStage(stageOf([{ op: 'lock', uid: r.uid, path: 'values.NodeName', after: { field: 'Node/NodeName' } }]), doc).uxml;
  assert.throws(() => joinDuplicates(name, [{ branch: '/B1', from: r.uid, into: k.uid }]), (e) => e.code === 'UXML_JOIN_IDENTITY_LOCKED');
  const two = runStage(stageOf([...setLock(r.uid, 'Weight', '5'), ...setLock(k.uid, 'Weight', '6')]), doc).uxml;
  assert.throws(() => joinDuplicates(two, [{ branch: '/B1', from: r.uid, into: k.uid }]), (e) => e.code === 'UXML_JOIN_LOCKS_DIFFER');
});

const supLock = (uid, source) => ({ op: 'lock', uid, path: 'values.NodeNumber', after: { field: 'Node/Supports', supports: true, source } });
const plan1 = (r, k) => [{ branch: '/B1', from: r.uid, into: k.uid }];
const types = (c) => c.restraints.map((x) => x.values.Type.text);

test('review B1: two different supports, one on each node, are both kept (never paired as the last one left)', () => {
  const doc = read(xml(node(10, R('+Z')) + node(20, R('X'))));
  const [k, r] = doc.pipelines[0].components;
  const sup = runStage(stageOf([supLock(r.uid, 'T')]), doc).uxml;
  const a = joinDuplicates(sup, plan1(r, k)).uxml.pipelines[0].components[0];
  assert.deepEqual(types(a), ['+Z', 'X']); assert.ok(a.values.NodeNumber.lock?.supports, 'the supports lock moves');
  const typed = runStage(stageOf(setLock(r.restraints[0].uid, 'Type', 'X')), doc).uxml;
  assert.deepEqual(types(joinDuplicates(typed, plan1(r, k)).uxml.pipelines[0].components[0]), ['+Z', 'X'], 'a locked Type never writes over the REST');
});

test('review B2: several locked nodes into one kept node are joined one after another; a clash is refused', () => {
  const doc = read(xml(node(10, R('+Z')) + node(20, R('+Z', '<Stiffness>0</Stiffness>')) + node(30)));
  const [k, r1, r2] = doc.pipelines[0].components;
  const both = runStage(stageOf([...setLock(r1.restraints[0].uid, 'Stiffness', '2E+12'), ...setLock(r2.uid, 'Weight', '5')]), doc).uxml;
  const j = joinDuplicates(both, [...plan1(r1, k), ...plan1(r2, k)]);
  const kept = j.uxml.pipelines[0].components[0];
  assert.equal(kept.restraints[0].values.Stiffness.text, '2E+12'); assert.equal(kept.values.Weight.text, '5');
  assert.equal(j.deltas.length, 2); assert.deepEqual(j.joined.map((x) => x.from), ['20', '30']);
  const clash = runStage(stageOf([...setLock(r1.uid, 'Weight', '5'), ...setLock(r2.uid, 'Weight', '6')]), doc).uxml;
  assert.throws(() => joinDuplicates(clash, [...plan1(r1, k), ...plan1(r2, k)]), (e) => e.code === 'UXML_JOIN_LOCKS_DIFFER');
  const twoSup = runStage(stageOf([supLock(r1.uid, 'T1'), supLock(r2.uid, 'T2')]), doc).uxml;
  assert.throws(() => joinDuplicates(twoSup, [...plan1(r1, k), ...plan1(r2, k)]), (e) => e.code === 'UXML_JOIN_LOCKS_DIFFER');
});

test("review N1/N5: the transfer's lock shape (supports lock plus the support's value locks) joins; a kept node's own number lock is refused as identity", () => {
  const doc = read(xml(node(10, R('+Z', '<Stiffness>0</Stiffness>')) + node(20, R('+Z', '<Stiffness>0</Stiffness>'))));
  const [k, r] = doc.pipelines[0].components;
  const tr = runStage(stageOf([...setLock(r.restraints[0].uid, 'Stiffness', '2E+12'), { op: 'lock', uid: r.restraints[0].uid, path: 'values.Type', after: { field: 'Node/Type' } }, supLock(r.uid, 'T')]), doc).uxml;
  const kept = joinDuplicates(tr, plan1(r, k)).uxml.pipelines[0].components[0];
  assert.deepEqual(types(kept), ['+Z']); assert.ok(kept.values.NodeNumber.lock?.supports);
  assert.equal(kept.restraints[0].values.Stiffness.text, '2E+12'); assert.ok(kept.restraints[0].values.Type.lock);
  const own = runStage(stageOf([{ op: 'lock', uid: k.uid, path: 'values.NodeNumber', after: { field: 'Node/NodeNumber' } }, supLock(r.uid, 'T')]), doc).uxml;
  assert.throws(() => joinDuplicates(own, plan1(r, k)), (e) => e.code === 'UXML_JOIN_IDENTITY_LOCKED');
});

/** A stand-in for today's stage: drops the nodes numbered `drop` in every sub-step (as its branch pass does). */
const dropping = (...drop) => (t) => {
  let out = t;
  for (const n of drop) { const i = out.indexOf(`<NodeNumber>${n}</NodeNumber>`), a = Math.max(out.lastIndexOf('<Node>', i), out.lastIndexOf('<Node ', i)); out = out.slice(0, a) + out.slice(out.indexOf('</Node>', a) + 7); }
  return { xmlText: out, stages: Object.fromEntries(SUPPORTS_STEPS.map((id) => [id, out])) };
};

test('the "|" names (Owner 20 Nov): the kept node first, then the removed ones in order; the same on all written once; NodeNumber never', () => {
  const doc = read(xml(node(10) + node(20, R('+Y')) + node(30) + node(40, '', 'PIPE', 100)));
  const [n10, n20, n30, n40] = doc.pipelines[0].components;
  const plan = joinNamesPlan(doc, ids(doc, xml(node(20, R('+Y')) + node(40, '', 'PIPE', 100)), [n20, n40]));
  assert.deepEqual(plan.map((g) => [g.into, g.from]), [[n20.uid, [n10.uid, n30.uid]]]);
  const j = joinNames(doc, plan), kept = j.uxml.pipelines[0].components[1];
  assert.equal(kept.values.NodeName.text, 'N20|N10|N30');
  assert.equal(kept.values.ComponentRefNo.text, '=1/20|=1/10|=1/30');
  assert.equal(kept.values.NodeNumber.text, '20');
  assert.deepEqual(j.names[0].NodeName, ['N20', 'N10', 'N30'], 'the history, in order: .1 kept, .2 and .3 removed');
  const same = read(xml(node(10) + node(20)).replaceAll(/=1\/[12]0/g, '=1/X'));
  const [s10, s20] = same.pipelines[0].components;
  const k2 = joinNames(same, joinNamesPlan(same, ids(same, xml(node(10)), [s10]))).uxml.pipelines[0].components[0];
  assert.deepEqual([k2.values.NodeName.text, k2.values.ComponentRefNo.text], ['N10|N20', '=1/X']);
  assert.ok(s20);
});

test('the "|" names: a kept name the transfer locked is not written and is listed', () => {
  const doc = read(xml(node(10) + node(20)));
  const [a, b] = doc.pipelines[0].components;
  const locked = runStage(stageOf(setLock(a.uid, 'NodeName', 'MINE')), doc).uxml;
  const j = joinNames(locked, joinNamesPlan(locked, ids(locked, xml(node(10)), [a])));
  const kept = j.uxml.pipelines[0].components[0];
  assert.equal(kept.values.NodeName.text, 'MINE');
  assert.equal(kept.values.ComponentRefNo.text, '=1/10|=1/20');
  assert.deepEqual(j.names[0].notWritten, [{ key: 'NodeName', why: 'locked by the transfer' }]);
  assert.ok(b);
});

test('the "|" names go into the XML output and the document, never into the XML the CII engine gets', () => {
  const doc = read(xml(node(10) + node(20, R('+Y')) + node(40, '', 'PIPE', 100)));
  const got = runSupportsUnderLocks(doc, dropping(10));
  assert.match(got.xmlText, /<NodeName>N20\|N10<\/NodeName>/);
  assert.match(got.xmlText, /<ComponentRefNo>=1\/20\|=1\/10<\/ComponentRefNo>/);
  assert.ok(!got.engineXmlText.includes('|') && got.engineXmlText.includes('<NodeName>N20</NodeName>'));
  assert.equal(got.xmlText.replace('N20|N10', 'N20').replace('=1/20|=1/10', '=1/20'), got.engineXmlText, 'nothing else differs');
  assert.equal(got.uxml.pipelines[0].components.find((c) => c.values.NodeNumber.text === '20').values.NodeName.text, 'N20|N10');
  assert.deepEqual(got.conflicts, []);
  // E3 (Owner 21 Nov 2026): engineUxml is the document engineXmlText is written from, the revision before the names.
  assert.equal(got.deltas.at(-1).stage, 'supports:names');
  assert.equal(got.engineUxml.revision.id, got.deltas.at(-1).base);
  assert.equal(got.engineUxml.pipelines[0].components.find((c) => c.values.NodeNumber.text === '20').values.NodeName.text, 'N20');
  const off = runSupportsUnderLocks(doc, dropping(10), { names: false });
  assert.equal(off.engineUxml, off.uxml, 'without names the engine document is the document');
  assert.equal(off.xmlText, off.engineXmlText);
  assert.equal(off.engineXmlText, got.engineXmlText);
});

test('"Read it as history" (Owner 20 Nov): a "|" in an input name is history; today and the CII get the first part', () => {
  const doc = read(xml(node(10) + node(20, R('+Y')) + node(40, '', 'PIPE', 100))
    .replace('<NodeName>N10</NodeName>', '<NodeName>N10|OLD</NodeName>').replace('=1/10<', '=1/10|=1/OLD<')
    .replace('<NodeName>N40</NodeName>', '<NodeName>N40|P</NodeName>'));
  const seen = [];
  const got = runSupportsUnderLocks(doc, (t) => { seen.push(t); return dropping(10)(t); });
  assert.ok(seen.every((t) => !t.includes('|')), "today's code never sees a \"|\"");
  assert.ok(!got.engineXmlText.includes('|'), 'nor does the CII engine');
  assert.match(got.xmlText, /<NodeName>N20\|N10\|OLD<\/NodeName>/, 'the removed node brings its whole history');
  assert.match(got.xmlText, /<ComponentRefNo>=1\/20\|=1\/10\|=1\/OLD<\/ComponentRefNo>/);
  assert.match(got.xmlText, /<NodeName>N40\|P<\/NodeName>/, 'a node with history and no new join keeps it');
  assert.deepEqual(got.names.map((n) => [n.nodeNumber, n.from.length, n.written]), [['20', 1, ['NodeName', 'ComponentRefNo']], ['40', 0, ['NodeName']]]);
  assert.equal(got.deltas[0].stage, 'supports:name-history');
  const left = runSupportsUnderLocks(doc, dropping(10), { nameHistory: false });
  assert.match(left.engineXmlText, /N40\|P/, 'control: without the reading the "|" reaches the CII engine');
  const n40 = doc.pipelines[0].components[2];
  const locked = runStage(stageOf([{ op: 'lock', uid: n40.uid, path: 'values.NodeName', after: { field: 'Node/NodeName' } }]), doc).uxml;
  const kept = runSupportsUnderLocks(locked, dropping(10));
  assert.match(kept.engineXmlText, /<NodeName>N40\|P<\/NodeName>/, 'a name the transfer locked stays as the transfer set it');
  assert.ok(!kept.names.some((x) => x.nodeNumber === '40'), 'and is not read as history');
});

test('PR 302 review B1: names are values, escaped once; a second run changes nothing', () => {
  const doc = read(xml(node(10) + node(20, R('+Y')) + node(40, '', 'PIPE', 100))
    .replace('<NodeName>N10</NodeName>', '<NodeName>A&amp;B</NodeName>')
    .replace('<NodeName>N40</NodeName>', '<NodeName> K&amp;L|N&lt;9 </NodeName>'));
  const seen = [];
  const got = runSupportsUnderLocks(doc, (t) => { seen.push(t); return dropping(10)(t); });
  assert.ok(seen.every((t) => t.includes('<NodeName>K&amp;L</NodeName>')), "today's code gets the first part, escaped once");
  assert.match(got.engineXmlText, /<NodeName>K&amp;L<\/NodeName>/);
  assert.match(got.xmlText, /<NodeName>N20\|A&amp;B<\/NodeName>/);
  assert.match(got.xmlText, /<NodeName>K&amp;L\|N&lt;9<\/NodeName>/);
  assert.deepEqual(got.names.map((n) => n.NodeName), [['N20', 'A&B'], ['K&L', 'N<9']], 'the list holds values, not literals');
  const again = runSupportsUnderLocks(read(got.xmlText), dropping());
  assert.equal(again.xmlText, got.xmlText, 'run again from its own output: the same XML');
  assert.equal(again.engineXmlText, got.engineXmlText);
});

test("PR 301 review B1: the names group with today's own coordinate tolerance, not 1; a caller's other value is refused", () => {
  const doc = read(xml(node(10, R('+Y')) + node(20, '', 'ATTA', 4) + node(40, '', 'PIPE', 100)));
  const wide = (t) => ({ ...dropping(20)(t), config: { coordinateTolerance: 10 } });
  const got = runSupportsUnderLocks(doc, wide);
  assert.match(got.xmlText, /<NodeName>N10\|N20<\/NodeName>/, 'node 20 is 4 mm off: one group at tolerance 10');
  assert.throws(() => runSupportsUnderLocks(doc, wide, { tolerance: 1 }), (e) => e.code === 'UXML_SUPPORTS_TOLERANCE_DIFFERS');
});

test('gate: same XML, note and conflicts as today on the locked samples; the join cases and the "|" names; three wrong controls fail', () => {
  const gate = fileURLToPath(new URL('../scripts/uxml-v2-supports-locks-gate.mjs', import.meta.url));
  const run = (...a) => spawnSync(process.execPath, [gate, ...a], { encoding: 'utf8' });
  const ok = run();
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /PASS EF-05 join: a locked support stiffness moves to the kept node/);
  assert.match(ok.stdout, /PASS EF-05 join: .* \(89 kept nodes with "\|" names\)/);
  assert.match(ok.stdout, /PASS RMS-BLOW-1 join: .* \(17 kept nodes with "\|" names\)/);
  assert.match(ok.stdout, /PASS EF-05 join: .*, run again from its output \(89 nodes with history\)/);
  assert.match(ok.stdout, /PASS RMS-BLOW-1 join: .*, run again from its output \(17 nodes with history\)/);
  // Each gate run takes minutes: the suite runs the join's own wrong control and the value-lock one; the others are run
  // by hand (scripts/uxml-v2-supports-locks-gate.mjs <control>), see the PR.
  assert.equal(run('join-stage-wins').status, 1);
  assert.equal(run('ignore-value-locks').status, 1);
  assert.equal(run('no-join-names').status, 1);
});
