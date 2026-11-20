// End-to-end plan E2a (Owner 19 Nov 2026): today's supports stage as recorded changes on the UXML document.
// The writer places new tags where today's supports output has them; the kernel's set op takes afterKey; the read-back
// gives today's engine XML byte for byte (gate on RMS-BLOW-1: 21 duplicate ATTA nodes removed, 6 supports added), and a
// read-back that drops a support fails.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runStage, sha256Hex } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { writePsi116FromUxmlV2 } from '../uxml/v2/UxmlV2Psi116Writer.js';
import { changesFromXml, countChanges, engineXml } from '../uxml/v2/supports/SupportsAsChanges.js';

const NS = ' xmlns="http://aveva.com/pipeStress116.xsd"';
const node = (n, type, x, extra = '') => `<Node><NodeNumber>${n}</NodeNumber><ComponentType>${type}</ComponentType>`
  + `<Position>${x} 0 0</Position><Endpoint>1</Endpoint>${extra}</Node>`;
const xml = (branch, nodes) => `<?xml version="1.0"?>\n<PipeStressExport${NS}><Pipe><Branch><Branchname>/B1</Branchname>${branch}${nodes}</Branch></Pipe></PipeStressExport>`;
const read = (t) => readPsi116V2(t, { fileSha256: sha256Hex(t) });
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const apply = (doc, ops) => runStage({ id: 't', rulesVersion: 't/1', reads: ['topology'], writes: LAYERS, run: () => ({ ops, diagnostics: [] }) }, doc, {}, {}, { inputHashes: [] }).uxml;
const R = '<Restraint><Type>Y</Type></Restraint>';
const flat = (t) => t.replace(/>\s+</g, '><');

test('a new node tag goes after the tag before it (and before the supports), not at the end', () => {
  const doc = read(xml('', node(10, 'FLAN', 0, R)));
  const c = doc.pipelines[0].components[0];
  const out = apply(doc, [{ op: 'set', uid: c.uid, path: 'values.Rigid', after: { v: 2, text: '2', src: 'stage', rule: 't' }, afterKey: 'NodeNumber', rule: 't' }]);
  assert.deepEqual(out.pipelines[0].components[0].fieldOrder.slice(0, 2), ['NodeNumber', 'Rigid']);
  assert.match(flat(writePsi116FromUxmlV2(out).text), /<NodeNumber>10<\/NodeNumber><Rigid>2<\/Rigid><ComponentType>FLAN/);
});

test('a new tag in an existing group goes inside the group; a new branch tag and a new branch group go after the nodes', () => {
  const doc = read(xml('<Pressure><Pressure1>5</Pressure1></Pressure>', node(10, 'PIPE', 0)));
  const p = doc.pipelines[0];
  const v = (t) => ({ v: Number(t) || t, text: t, src: 'stage', rule: 't' });
  const out = apply(doc, [
    { op: 'set', uid: p.uid, path: 'values.Pressure.HydroPressure', after: v('9'), afterKey: 'Pressure.Pressure1', rule: 't' },
    { op: 'set', uid: p.uid, path: 'values.LineNo', after: v('L1'), rule: 't' },
    { op: 'set', uid: p.uid, path: 'values.Temperature.Temperature1', after: v('120'), rule: 't' },
  ]);
  const text = flat(writePsi116FromUxmlV2(out).text);
  assert.match(text, /<Pressure><Pressure1>5<\/Pressure1><HydroPressure>9<\/HydroPressure><\/Pressure><Node>/);
  assert.match(text, /<\/Node><LineNo>L1<\/LineNo><Temperature><Temperature1>120<\/Temperature1><\/Temperature><\/Branch>/);
});

test('a removed duplicate ATTA, a rewritten support and a new support: recorded as remove, set and add ops', () => {
  const before = xml('', node(10, 'ATTA', 0, '<NodeName>N10</NodeName><Restraint><Type>Z</Type></Restraint>') + node(20, 'ATTA', 0, '<NodeName>N20</NodeName>') + node(30, 'PIPE', 100));
  const after = xml('', node(10, 'ATTA', 0, '<NodeName>N10</NodeName><Restraint><Type>Y</Type></Restraint><Restraint><Type>+Y</Type></Restraint>') + node(30, 'PIPE', 100));
  const doc = read(before), ops = changesFromXml(doc, after, 'test');
  assert.deepEqual(countChanges(doc, ops), { nodesRemoved: 1, supportsAdded: 1, supportsRemoved: 0, supportsChanged: 1, nodeValues: 0, branchValues: 0, nodesNumbered: 0 });
  const kept = doc.pipelines[0].components[0].restraints[0].uid;
  assert.ok(ops.some((o) => o.op === 'set' && o.uid === kept && o.path === 'values.Type'), 'the rewritten support keeps its uid');
  assert.equal(flat(writePsi116FromUxmlV2(apply(doc, ops)).text), flat(after));
});

test('PR 299 review: supports that today reorders keep their own uid (paired by content, not place)', () => {
  const gui = '<Restraint><Type>GUI</Type></Restraint>', up = '<Restraint><Type>+Y</Type></Restraint>';
  const doc = read(xml('', node(260, 'ATTA', 0, up + gui)));
  const [a, b] = doc.pipelines[0].components[0].restraints;
  const ops = changesFromXml(doc, xml('', node(260, 'ATTA', 0, gui + up)), 'test');
  assert.deepEqual(ops, [], 'a reorder alone is no change');
  const ops2 = changesFromXml(doc, xml('', node(260, 'ATTA', 0, '<Restraint><Type>GUI</Type><Gap>5</Gap></Restraint>' + up)), 'test');
  assert.deepEqual(ops2.map((o) => [o.op, o.uid]), [['set', b.uid]], 'the changed GUI keeps the GUI uid');
  assert.ok(!ops2.some((o) => o.uid === a.uid));
});

test('PR 299 review: a Z support rewritten as Y keeps its uid; two candidates of one type are refused', () => {
  const doc = read(xml('', node(10, 'ATTA', 0, '<Restraint><Type>X</Type></Restraint><Restraint><Type>Z</Type></Restraint>')));
  const z = doc.pipelines[0].components[0].restraints[1];
  const ops = changesFromXml(doc, xml('', node(10, 'ATTA', 0, '<Restraint><Type>Y</Type></Restraint><Restraint><Type>X</Type></Restraint>')), 'test');
  assert.deepEqual(ops.map((o) => [o.op, o.uid, o.path]), [['set', z.uid, 'values.Type']]);
  const two = read(xml('', node(10, 'ATTA', 0, '<Restraint><Type>Y</Type><Gap>1</Gap></Restraint><Restraint><Type>Y</Type><Gap>2</Gap></Restraint>')));
  assert.throws(() => changesFromXml(two, xml('', node(10, 'ATTA', 0, '<Restraint><Type>Y</Type><Gap>3</Gap></Restraint><Restraint><Type>Y</Type><Gap>4</Gap></Restraint>')), 'test'),
    (e) => e.code === 'UXML_SUPPORTS_SUPPORT_AMBIGUOUS');
});

test('PR 299 review: duplicate ATTA nodes with one reference number are told apart by NodeName, else refused', () => {
  const at = (n, name, extra = '') => `<Node><NodeNumber>${n}</NodeNumber><NodeName>${name}</NodeName><ComponentType>ATTA</ComponentType>`
    + `<ComponentRefNo>=1/2</ComponentRefNo><Position>0 0 0</Position><Endpoint>1</Endpoint>${extra}</Node>`;
  const doc = read(xml('', at(10, 'A') + at(20, 'DATUM-B', R)));
  const ops = changesFromXml(doc, xml('', at(20, 'DATUM-B', R)), 'test');
  assert.deepEqual(ops.map((o) => [o.op, o.uid]), [['remove', doc.pipelines[0].components[0].uid]], 'node 10 removed, node 20 kept as is');
  const tie = read(xml('', at(10, 'A') + at(20, 'A')));
  assert.throws(() => changesFromXml(tie, xml('', at(20, 'A')), 'test'), (e) => e.code === 'UXML_SUPPORTS_NODE_AMBIGUOUS');
});

test('PR 299 review: a new branch key ordered before its group\'s keys goes inside that group, not into a second one', () => {
  const doc = read(xml('<Pressure><Pressure1>5</Pressure1></Pressure>', node(10, 'PIPE', 0)));
  const p = doc.pipelines[0];
  const out = apply(doc, [{ op: 'set', uid: p.uid, path: 'values.Pressure.Pressure0', after: { v: 7, text: '7', src: 'stage', rule: 't' }, afterKey: 'Branchname', rule: 't' }]);
  assert.deepEqual(out.pipelines[0].fieldOrder.slice(0, 3), ['Branchname', 'Pressure.Pressure0', 'Pressure.Pressure1']);
  const text = flat(writePsi116FromUxmlV2(out).text);
  assert.match(text, /<Pressure><Pressure0>7<\/Pressure0><Pressure1>5<\/Pressure1><\/Pressure><Node>/);
  assert.equal(text.match(/<Pressure>/g).length, 1);
});

test('an output node with no input node is refused, never guessed', () => {
  const doc = read(xml('', node(10, 'PIPE', 0)));
  assert.throws(() => changesFromXml(doc, xml('', node(10, 'PIPE', 0) + node(20, 'PIPE', 50)), 'test'), (e) => e.code === 'UXML_SUPPORTS_NODE_NOT_MATCHED');
});

test('gate on RMS-BLOW-1: engine XML byte-equal to today; a read-back that drops a support fails', () => {
  const gate = fileURLToPath(new URL('../scripts/uxml-v2-supports-changes-gate.mjs', import.meta.url));
  const run = (...a) => spawnSync(process.execPath, [gate, ...a, '--bench', 'RMS-BLOW-1'], { encoding: 'utf8' });
  const ok = run();
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /PASS RMS-BLOW-1 .*"nodesRemoved":21,"supportsAdded":6/);
  assert.equal(run('drop-support').status, 1);
  assert.equal(typeof engineXml, 'function');
});
