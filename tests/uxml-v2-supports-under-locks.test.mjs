// End-to-end plan E2b (Owner 20 Nov 2026): E2a's read-back under the transfer's locks. Two support pairing gaps from the
// PR 299 re-check, the locked-node rule (Owner 19 Nov, "Yes, keep the node"), and the gate: the same XML, note and
// conflicts as today's lock wrapper on the locked samples; each wrong control fails.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { changesFromXml } from '../uxml/v2/supports/SupportsAsChanges.js';
import { holdBackLocked } from '../uxml/v2/supports/SupportsUnderLocks.js';

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

test('gate: same XML, note and conflicts as today on the locked samples; the locked duplicate is kept; controls fail', () => {
  const gate = fileURLToPath(new URL('../scripts/uxml-v2-supports-locks-gate.mjs', import.meta.url));
  const run = (...a) => spawnSync(process.execPath, [gate, ...a], { encoding: 'utf8' });
  const ok = run();
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /PASS RMS-BLOW-1 locked duplicate kept/);
  assert.equal(run('remove-locked-node').status, 1);
});
