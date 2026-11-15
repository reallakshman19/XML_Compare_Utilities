// UXML revamp step 1: kernel + PS116 reader v2 + PS116 writer (Owner checks 1-6 of the schema note, section 10).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  sha256Hex, canonicalJson, verifyDocument, applyDelta, undoDelta, runStage, walkEntities,
  sealDocument, clone, makeValue, CODES,
} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';
import {repairPlaceholderStage, setValueTestStage, splitNodeTestStage, STAGE_REGISTRY} from '../uxml/v2/UxmlV2Stages.js';

const SOURCE = readFileSync(new URL('../fixtures/uxml-v2/golden-30.xml', import.meta.url), 'utf8');
const sha = t => createHash('sha256').update(t, 'utf8').digest('hex');
const read = (t = SOURCE) => readPsi116V2(t, {fileSha256: sha(t)});
const write = doc => writePsi116FromUxmlV2(doc).text;
const codeOf = fn => { try { fn(); } catch (e) { return e.code; } return 'NO_REFUSAL'; };
const T1 = 'Temperature.Temperature1';
const pipelinesOf = doc => canonicalJson(doc.pipelines.map(p => {
  const strip = e => { const c = {...e}; delete c.h; return c; };
  return {...strip(p), components: p.components.map(c => ({...strip(c), restraints: c.restraints.map(strip)}))};
}).map(p => { const c = clone(p); for (const x of [c, ...c.components]) for (const v of Object.values(x.values)) delete v.rev; return c; }));

test('sha256Hex equals node:crypto on edge lengths and unicode', () => {
  for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000), 'Ø 8" ∆ 🙂', SOURCE])
    assert.equal(sha256Hex(s), sha(s));
});

test('canonical JSON sorts keys and refuses NaN', () => {
  assert.equal(canonicalJson({b: 1, a: [2, {d: 3, c: 4}]}), '{"a":[2,{"c":4,"d":3}],"b":1}');
  assert.equal(codeOf(() => canonicalJson({a: NaN})), 'UXML_CANONICAL_NUMBER_INVALID');
});

test('check 1: PSI116 -> UXML v2 -> PS116 is byte-identical (GOLDEN-30) and every leaf is modelled', () => {
  const doc = read();
  assert.deepEqual(verifyDocument(doc), []);
  assert.equal(write(doc), SOURCE);
  assert.deepEqual(doc.readCounts, {pipelines: 5, components: 77, restraints: 5});
  const b0 = doc.pipelines[0];
  assert.equal(b0.values[T1].v, 340);
  assert.equal(b0.values.Branchname.v, '/GF30-01-8"-P0001-A1A/B1');
  const leafTags = (SOURCE.match(/<(\w+)>[^<]*<\/\1>/g) || []).length;
  const modelled = walkEntities(doc).reduce((n, e) => n + Object.keys(e.entity.values).length, 0);
  const header = (SOURCE.slice(0, SOURCE.indexOf('<Branch>')).match(/<(\w+)>[^<]*<\/\1>/g) || []).length;
  assert.equal(modelled, leafTags - header, 'every leaf inside a Branch is a modelled value');
});

test('check 2: reading the same file twice gives the same revision id and uids', () => {
  const a = read(), b = read();
  assert.equal(a.revision.id, b.revision.id);
  assert.deepEqual(walkEntities(a).map(e => e.entity.uid), walkEntities(b).map(e => e.entity.uid));
  assert.match(a.revision.id, /^r:[0-9a-f]{64}$/);
  const uids = walkEntities(a).map(e => e.entity.uid);
  assert.equal(new Set(uids).size, uids.length);
});

test('check 3: changing any one value breaks the hash; apply(delta) rebuilds the next revision exactly', () => {
  const doc = read();
  const tampered = clone(doc);
  tampered.pipelines[1].components[3].values.Weight.v = 123;
  assert.ok(verifyDocument(tampered).some(p => p.code === CODES.HASH_MISMATCH));
  const resealedEntityOnly = clone(doc);
  resealedEntityOnly.custody.$tail += ' ';
  assert.ok(verifyDocument(resealedEntityOnly).some(p => p.code === CODES.HASH_MISMATCH && p.uid === 'revision'));

  const p0 = doc.pipelines[0];
  const r = runStage(setValueTestStage, doc, {uid: p0.uid, key: T1, v: 999});
  const rebuilt = applyDelta(doc, r.delta);
  assert.equal(rebuilt.revision.id, r.uxml.revision.id);
  assert.equal(canonicalJson(rebuilt), canonicalJson(r.uxml));
  assert.equal(r.delta.ops[0].before.v, 340);
  assert.equal(r.delta.ops[0].after.rev, 1);
  const bad = clone(r.delta); bad.ops[0].after.v = 998;
  assert.equal(codeOf(() => applyDelta(doc, bad)), CODES.DELTA_RESULT_MISMATCH);
  const wrongBefore = clone(r.delta); wrongBefore.ops[0].before.v = 1;
  assert.equal(codeOf(() => applyDelta(doc, wrongBefore)), CODES.DELTA_BEFORE_MISMATCH);
  assert.equal(codeOf(() => applyDelta(r.uxml, r.delta)), CODES.DELTA_BASE_MISMATCH);
});

test('check 6: a changed T1 appears in the written file, and only that literal changes', () => {
  const doc = read();
  const r = runStage(setValueTestStage, doc, {uid: doc.pipelines[0].uid, key: T1, v: 999});
  const out = write(r.uxml);
  assert.notEqual(out, SOURCE, 'a writer that copies raw XML only must fail here');
  assert.equal(out, SOURCE.replace('<Temperature1>340</Temperature1>', '<Temperature1>999</Temperature1>'));
  const again = read(out);
  assert.equal(again.pipelines[0].values[T1].v, 999);
  assert.equal(again.pipelines[1].values[T1].v, read().pipelines[1].values[T1].v);
});

test('a node value a stage adds is inserted; a string value is XML-escaped', () => {
  const doc = read();
  const ci = 2;
  const c = doc.pipelines[0].components[ci];
  assert.equal(c.values.PipingClass, undefined, 'GOLDEN-30 nodes carry no PipingClass tag');
  let r = runStage(setValueTestStage, doc, {uid: c.uid, key: 'PipingClass', v: 'A1A', src: 'lineList'});
  r = runStage(setValueTestStage, r.uxml, {uid: c.uid, key: 'NodeName', v: 'A&B <1>'});
  const again = read(write(r.uxml));
  const c2 = again.pipelines[0].components[ci];
  assert.equal(c2.values.PipingClass.v, 'A1A');
  assert.deepEqual(Object.keys(c2.values).slice(-1), ['PipingClass']);
  assert.equal(c2.values.NodeName.v, 'A&B <1>');
  assert.equal(c2.values.NodeName.text, 'A&amp;B &lt;1&gt;');
});

test('check 4: a split keeps every other uid, records lineage, and the writer emits the new node', () => {
  const doc = read();
  const comp = doc.pipelines[0].components[1];
  const r = runStage(splitNodeTestStage, doc, {uid: comp.uid});
  const before = walkEntities(doc).map(e => e.entity.uid);
  const after = walkEntities(r.uxml).map(e => e.entity.uid);
  assert.deepEqual(after.filter(u => before.includes(u)), before);
  const added = r.uxml.pipelines[0].components[2];
  assert.equal(after.length, before.length + 1);
  assert.deepEqual(added.lineage.from, [comp.uid]);
  assert.equal(added.values.Position.src, 'stage');
  const out = write(r.uxml);
  const again = read(out);
  assert.equal(again.readCounts.components, 78);
  const written = again.pipelines[0].components[2];
  assert.equal(written.values.Position.v, added.values.Position.v);
  assert.equal(written.values.NodeNumber.v, added.values.NodeNumber.v);
  assert.equal(written.restraints.length, 0);
  // everything outside the new record is untouched
  const raw = r.uxml.custody[comp.uid].raw;
  const at = out.indexOf(raw) + raw.length;
  assert.equal(out.slice(0, at), SOURCE.slice(0, at));
});

test('a split node is still written after its source node is removed (template from custody)', () => {
  const doc = read();
  const comp = doc.pipelines[0].components[1];
  const split = runStage(splitNodeTestStage, doc, {uid: comp.uid});
  const removeStage = {id: 'test-remove', rulesVersion: 't', writes: ['topology'], run: () => ({ops: [{op: 'remove', uid: comp.uid}]})};
  const r = runStage(removeStage, split.uxml);
  const again = read(write(r.uxml));
  assert.equal(again.readCounts.components, 77);
  assert.equal(again.pipelines[0].components[1].values.NodeNumber.v, split.uxml.pipelines[0].components[2].values.NodeNumber.v);
  assert.ok(r.uxml.retiredUids.includes(comp.uid));
  const reuse = {id: 'test-reuse', rulesVersion: 't', writes: ['topology'], run: () => ({ops: [{op: 'add', uid: comp.uid,
    parent: doc.pipelines[0].uid, after: null, kind: 'component', entity: {...clone(comp), lineage: {op: 'insert', from: []}}}]})};
  assert.equal(codeOf(() => runStage(reuse, r.uxml)), CODES.UID_REUSED);
});

test('a stage-made node with a missing template value is refused', () => {
  const doc = read();
  const comp = doc.pipelines[0].components[1];
  const r = runStage(splitNodeTestStage, doc, {uid: comp.uid});
  const broken = clone(r.uxml);
  delete broken.pipelines[0].components[2].values.Weight;
  sealDocument(broken);
  assert.equal(codeOf(() => write(broken)), 'PS116_WRITE_REQUIRED_VALUE_MISSING');
});

test('restraints: changed in place, removed, and added from modelled values (frame required)', () => {
  const doc = read();
  const host = doc.pipelines.flatMap(p => p.components).find(c => c.restraints.length);
  const r0 = host.restraints[0];
  let r = runStage(setValueTestStage, doc, {uid: r0.uid, key: 'Gap', v: 7});
  assert.equal(read(write(r.uxml)).pipelines.flatMap(p => p.components).find(c => c.sourceKey === host.sourceKey).restraints[0].values.Gap.v, 7);
  const remove = {id: 'rm', rulesVersion: 't', writes: ['supports'], run: () => ({ops: [{op: 'remove', uid: r0.uid}]})};
  r = runStage(remove, doc);
  assert.equal(read(write(r.uxml)).readCounts.restraints, doc.readCounts.restraints - 1);
  const entity = {kind: 'restraint', lineage: {op: 'insert', from: [host.uid], stage: 'add', rule: 't'}, frame: 'CII_XYZ',
    fieldOrder: ['Type', 'Gap', 'DirectionCosineX'], values: {Type: makeValue('GUI', 'staged'), Gap: makeValue(3, 'staged'), DirectionCosineX: makeValue(1, 'staged')}};
  const add = e => ({id: 'add', rulesVersion: 't', writes: ['supports'], run: () => ({ops: [{op: 'add', uid: 'u:newrestraint0001', parent: host.uid, after: r0.uid, kind: 'restraint', entity: e}]})});
  r = runStage(add(entity), doc);
  const host2 = read(write(r.uxml)).pipelines.flatMap(p => p.components).find(c => c.sourceKey === host.sourceKey);
  assert.equal(host2.restraints.length, host.restraints.length + 1);
  assert.equal(host2.restraints.at(-1).values.Type.v, 'GUI');
  assert.equal(host2.restraints.at(-1).values.Gap.v, 3);
  const noFrame = clone(entity); delete noFrame.frame;
  assert.equal(codeOf(() => runStage(add(noFrame), doc)), CODES.FRAME_MISSING);
});

test('check 5: the repair placeholder gives an empty delta and TOPOFIX_NOT_INTEGRATED', () => {
  const doc = read();
  assert.equal(STAGE_REGISTRY[0], repairPlaceholderStage);
  const r = runStage(repairPlaceholderStage, doc);
  assert.deepEqual(r.delta.ops, []);
  assert.deepEqual(r.diagnostics.map(d => d.code), ['TOPOFIX_NOT_INTEGRATED']);
  assert.equal(canonicalJson(r.uxml.pipelines), canonicalJson(doc.pipelines));
  assert.deepEqual(r.uxml.revision.parents, [doc.revision.id]);
  assert.equal(write(r.uxml), SOURCE);
});

test('locks: a stage cannot change a locked value; it becomes a UXML_LOCKED_VALUE conflict', () => {
  const doc = read();
  const uid = doc.pipelines[0].uid;
  const lock = {id: 'transfer', rulesVersion: 't', writes: ['engineering'], run: () => ({ops: [{op: 'lock', uid, path: 'values.' + T1, after: {by: 'owner', reason: 'test'}}]})};
  const locked = runStage(lock, doc).uxml;
  const r = runStage(setValueTestStage, locked, {uid, key: T1, v: 1});
  assert.deepEqual(r.refusals.map(x => x.code), [CODES.LOCKED_VALUE]);
  assert.deepEqual(r.delta.ops, []);
  assert.equal(r.uxml.pipelines[0].values[T1].v, 340);
});

test('layers, provenance and determinism are enforced by runStage', () => {
  const doc = read();
  const uid = doc.pipelines[0].uid;
  const namesOnly = {id: 'n', rulesVersion: 't', writes: ['names'], run: () => ({ops: [{op: 'set', uid, path: 'values.' + T1, after: makeValue(1, 'owner')}]})};
  assert.equal(codeOf(() => runStage(namesOnly, doc)), CODES.LAYER_UNDECLARED_WRITE);
  const noSrc = {id: 'p', rulesVersion: 't', writes: ['engineering'], run: () => ({ops: [{op: 'set', uid, path: 'values.' + T1, after: {v: 1, src: 'guess'}}]})};
  assert.equal(codeOf(() => runStage(noSrc, doc)), CODES.PROVENANCE_MISSING);
  let n = 0;
  const flaky = {id: 'f', rulesVersion: 't', writes: ['engineering'], run: () => ({ops: [{op: 'set', uid, path: 'values.' + T1, after: makeValue(n++, 'owner')}]})};
  assert.equal(codeOf(() => runStage(flaky, doc)), CODES.STAGE_NONDETERMINISTIC);
  const unknown = {id: 'u', rulesVersion: 't', writes: ['engineering'], run: () => ({ops: [{op: 'set', uid: 'u:nope', path: 'values.' + T1, after: makeValue(1, 'owner')}]})};
  assert.equal(codeOf(() => runStage(unknown, doc)), CODES.UID_UNKNOWN);
  const merge = {id: 'm', rulesVersion: 't', writes: ['topology'], run: () => ({ops: [{op: 'merge', uid}]})};
  assert.equal(codeOf(() => runStage(merge, doc)), CODES.DELTA_OP_UNSUPPORTED);
});

test('undo: the reversed delta gives the base content back (value edit, split and remove)', () => {
  const doc = read();
  const edit = runStage(setValueTestStage, doc, {uid: doc.pipelines[0].uid, key: T1, v: 999});
  const u1 = undoDelta(edit.uxml, edit.delta);
  assert.equal(pipelinesOf(u1.uxml), pipelinesOf(doc));
  assert.equal(u1.uxml.revision.stage, 'undo');
  assert.equal(write(u1.uxml), SOURCE);
  const comp = doc.pipelines[2].components[4];
  const split = runStage(splitNodeTestStage, doc, {uid: comp.uid});
  assert.equal(write(undoDelta(split.uxml, split.delta).uxml), SOURCE);
  const rm = runStage({id: 'rm', rulesVersion: 't', writes: ['topology'], run: () => ({ops: [{op: 'remove', uid: comp.uid}]})}, doc);
  assert.notEqual(write(rm.uxml), SOURCE);
  const back = undoDelta(rm.uxml, rm.delta).uxml;
  assert.equal(write(back), SOURCE);
  assert.ok(!back.retiredUids.includes(comp.uid));
});

test('only uxml-topology-v2 documents are accepted', () => {
  const doc = read();
  const v1 = clone(doc); v1.schemaVersion = 'uxml-topology-v1';
  assert.equal(verifyDocument(v1)[0].code, CODES.VERSION_UNKNOWN);
  assert.equal(codeOf(() => write(v1)), CODES.VERSION_UNKNOWN);
});
