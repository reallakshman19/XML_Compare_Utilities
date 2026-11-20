// End-to-end plan E2b (Owner 20 Nov 2026): E2a's read-back under the transfer's locks. Two support pairing gaps from the
// PR 299 re-check, the locked-node rule, the join (Owner 20 Nov, "Yes, that join"), and the gate: the same XML, note
// and conflicts as today's lock wrapper on the locked samples; the join cases; wrong controls fail.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { changesFromXml } from '../uxml/v2/supports/SupportsAsChanges.js';
import { holdBackLocked } from '../uxml/v2/supports/SupportsUnderLocks.js';
import { joinDuplicates } from '../uxml/v2/supports/JoinDuplicates.js';

const NS = ' xmlns="http://aveva.com/pipeStress116.xsd"';
const node = (n, extra = '', type = 'ATTA', x = 0) => `<Node><NodeNumber>${n}</NodeNumber><NodeName>N${n}</NodeName><ComponentType>${type}</ComponentType>`
  + `<ComponentRefNo>=1/${n}</ComponentRefNo><Position>${x} 0 0</Position><Endpoint>1</Endpoint>${extra}</Node>`;
const xml = (nodes) => `<?xml version="1.0"?>\n<PipeStressExport${NS}><Pipe><Branch><Branchname>/B1</Branchname>${nodes}</Branch></Pipe></PipeStressExport>`;
const read = (t) => readPsi116V2(t, { fileSha256: sha256Hex(t) });
const R = (type, extra = '') => `<Restraint><Type>${type}</Type>${extra}</Restraint>`;

test('a Z and a Y that could both be one new Y are refused, not guessed', () => {
  const doc = read(xml(node(10, R('Z', '<Gap>2</Gap>') + R('Y', '<Gap>0</Gap>'))));
  assert.throws(() => changesFromXml(doc, xml(node(10, R('Y', '<Gap>2</Gap>'))), 't'), (e) => e.code === 'UXML_SUPPORTS_SUPPORT_AMBIGUOUS');
});

test('the one support left on a node keeps its uid when its Type changes (so a lock on it stays)', () => {
  const doc = read(xml(node(10, R('ANCI'))));
  const r = doc.pipelines[0].components[0].restraints[0];
  const ops = changesFromXml(doc, xml(node(10, R('+Y'))), 't');
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
  const ops = changesFromXml(locked, xml(node(20, R('GUI'), 'ATTA', 50)), 't');
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
  assert.deepEqual(changesFromXml(doc, xml(node(10, R('Z', '<Gap>2</Gap>'))), 't').map((o) => [o.op, o.uid]), [['set', r.uid]]);
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

test('gate: same XML, note and conflicts as today on the locked samples; the join cases; two wrong controls fail', () => {
  const gate = fileURLToPath(new URL('../scripts/uxml-v2-supports-locks-gate.mjs', import.meta.url));
  const run = (...a) => spawnSync(process.execPath, [gate, ...a], { encoding: 'utf8' });
  const ok = run();
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /PASS EF-05 join: a locked support stiffness moves to the kept node/);
  // Each gate run takes minutes: the suite runs the join's own wrong control and the value-lock one; the others are run
  // by hand (scripts/uxml-v2-supports-locks-gate.mjs <control>), see the PR.
  assert.equal(run('join-stage-wins').status, 1);
  assert.equal(run('ignore-value-locks').status, 1);
});
