// E2c step 3 (Owner 20 Nov 2026): the review page lists what step 10 recorded on the UXML document, per sub-step and
// rule. On RMS-BLOW-1 and BM2 (today's supports stage, recorded inputs) the list holds every recorded change, with the
// counts measured before (RMS-BLOW-1: 21 nodes removed, 6 supports added; BM2: 0 and 9); a list missing a sub-step is
// flagged on the page. EF-05 (164 removed, 79 added, 94 rewritten) is measured by hand (it takes minutes).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {joinDuplicates} from '../uxml/v2/supports/JoinDuplicates.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {loadCalls, revive} from '../uxml/v2/supports/CoreCallsLib.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {runSupportsUnderLocks} from '../uxml/v2/supports/SupportsUnderLocks.js';
import {changeList} from '../uxml/v2/supports/ChangeList.js';
import {addedNodeRows, changeLines, changeStepRows, conflictLine, removedNodeRows, removedSupportRows} from '../uxml/v2/UxmlV2RunRecordChanges.js';

const R = fileURLToPath(new URL('../fixtures/uxml-v2-supports/', import.meta.url));

/** A Run record's `changes` as 3D_Converters step 10 writes it, from today's stage on one bench model. */
function recordOf(bench) {
  const dir = path.join(R, 'oracle', bench, 'xml');
  const src = fs.readFileSync(path.join(dir, 'engineering-pass-start.xml'), 'utf8');
  const snap = revive(JSON.parse(fs.readFileSync(path.join(dir, 'engineering-pass-start.json'), 'utf8')));
  const dtxr = loadCalls([path.join(R, 'core-calls', `${bench}.substep-calls.json`)]).find(c => c.name === 'enrichStandaloneDtxrAnnotations');
  const [, stagedJsonText, supportConfig] = revive(dtxr.args);
  const full = xmlText => runSupportsStage({xmlText, stagedJsonText, supportConfig, masters: {materialMapRows: snap.config.material?.mapRows}});
  const doc = readPsi116V2(src, {fileSha256: sha256Hex(src)});
  const under = runSupportsUnderLocks(doc, full);
  return {changes: {made: true, steps: under.deltas.map(d => ({stage: d.stage, rule: d.rulesVersion, ops: d.ops.length})),
    list: changeList(doc, under.deltas), joined: under.joined, names: under.names, conflicts: under.conflicts}};
}
const total = (record, i) => changeStepRows(record).reduce((n, r) => n + r[i], 0);

test('RMS-BLOW-1 and BM2: every recorded change listed, with the measured counts; none without a sub-step and rule', () => {
  for (const [bench, removed, added, named] of [['RMS-BLOW-1', 21, 6, 17], ['BM2', 0, 9, 0]]) {
    const record = recordOf(bench);
    assert.equal(total(record, 3), removed, `${bench} nodes removed`);
    assert.equal(total(record, 5), added, `${bench} supports added`);
    assert.equal(total(record, 11), 0, `${bench}: no change of a kind with no list`);
    assert.equal(total(record, 2), record.changes.steps.reduce((n, s) => n + s.ops, 0), `${bench}: every change is in a row`);
    const lines = changeLines(record);
    assert.ok(!lines.some(l => l.notice), `${bench}: ${lines.filter(l => l.notice).map(l => l.text).join(' / ')}`);
    assert.ok(lines.some(l => l.text === 'No lock conflicts.'));
    assert.equal(lines.some(l => l.text.startsWith(`${named} node(s) carry`)), named > 0);
    assert.equal(removedNodeRows(record).length, removed);
  }
});

test('wrong mode: a change list missing a sub-step, or a change with no rule, is flagged on the page', () => {
  const record = recordOf('RMS-BLOW-1');
  const missing = {changes: {...record.changes, list: record.changes.list.filter(s => s.stage !== 'supports:03-atta-default')}};
  assert.ok(changeLines(missing).some(l => l.notice && l.text.includes('supports:03-atta-default: 6 change(s) recorded, 0 listed')));
  const noRule = {changes: {...record.changes, list: record.changes.list.map((s, i) => (i ? s : {...s, noRule: 2}))}};
  assert.ok(changeLines(noRule).some(l => l.notice && l.text === '2 change(s) name no rule.'));
  assert.ok(changeLines({changes: {...record.changes, list: undefined}})[0].notice, 'a record before 20 Nov says it has no list');
  assert.ok(changeLines({})[0].notice, 'review N3: a record with no changes at all says so');
  const extra = {changes: {...record.changes, steps: record.changes.steps.filter(s => s.stage !== 'supports:names')}};
  assert.ok(changeLines(extra).some(l => l.notice && l.text.includes('no such stage was recorded')), 'review N4: a listed stage nobody recorded');
});

test('lock conflicts in plain words', () => {
  assert.equal(conflictLine({branch: '/B1', node: '120', key: 'Weight', kept: '127', stageWanted: '120', step: '01-parent-enrichment'}),
    "/B1 node 120: Weight kept at the transfer's 127; today's stage wanted 120 (first wanted by 01-parent-enrichment).");
  assert.match(conflictLine({branch: '/B1', node: '30', key: 'Node', step: 'branch-pass'}), /kept, because it holds a transfer lock; today's stage removes it/);
  assert.match(conflictLine({branch: '/B1', node: '40', key: 'Supports', kept: '+Y', stageWanted: 'GUI'}), /kept the supports the transfer set \(\+Y\); today's stage wanted GUI\./);
});

// PR 303 review B1/B2/N5: two locked duplicates joined into one kept node are two `supports:join` stages with one rule;
// the list matches each in order (no false notice, a missing one flagged), and the locks they move are shown.
const NS = ' xmlns="http://aveva.com/pipeStress116.xsd"';
const pnode = (n, extra = '') => `<Node><NodeNumber>${n}</NodeNumber><NodeName>N${n}</NodeName><ComponentType>ATTA</ComponentType>`
  + `<ComponentRefNo>=1/${n}</ComponentRefNo><Position>0 0 0</Position><Endpoint>1</Endpoint>${extra}</Node>`;
const pxml = nodes => `<?xml version="1.0"?>\n<PipeStressExport${NS}><Pipe><Branch><Branchname>/B1</Branchname>${nodes}</Branch></Pipe></PipeStressExport>`;
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const setLock = (uid, key, t) => [{op: 'set', uid, path: 'values.' + key, after: {v: Number(t) || t, text: t, src: 'transfer', rule: 't'}, rule: 't'},
  {op: 'lock', uid, path: 'values.' + key, after: {field: 'Node/' + key}, rule: 't'}];

function joinRecord() {
  const t = pxml(pnode(10, '<Restraint><Type>+Z</Type></Restraint>') + pnode(20, '<Restraint><Type>+Z</Type><Stiffness>0</Stiffness></Restraint>') + pnode(30));
  const doc = readPsi116V2(t, {fileSha256: sha256Hex(t)});
  const [k, r1, r2] = doc.pipelines[0].components;
  const locked = runStage({id: 'l', rulesVersion: 'l/1', reads: ['topology'], writes: LAYERS,
    run: () => ({ops: [...setLock(r1.restraints[0].uid, 'Stiffness', '2E+12'), ...setLock(r2.uid, 'Weight', '5')]})}, doc).uxml;
  const j = joinDuplicates(locked, [{branch: '/B1', from: r1.uid, into: k.uid}, {branch: '/B1', from: r2.uid, into: k.uid}]);
  return {changes: {made: true, steps: j.deltas.map(d => ({stage: d.stage, rule: d.rulesVersion, ops: d.ops.length})),
    list: changeList(locked, j.deltas), joined: j.joined, names: [], conflicts: []}};
}

test('PR 303 review B1/B2: two joins are matched in order; the locks they move are shown; nothing is left unshown', () => {
  const record = joinRecord();
  assert.deepEqual(record.changes.steps.map(s => s.stage), ['supports:join', 'supports:join']);
  const lines = changeLines(record);
  assert.ok(!lines.some(l => l.notice), lines.filter(l => l.notice).map(l => l.text).join(' / '));
  assert.equal(total(record, 11), 0, 'no change is left as Other changes');
  assert.ok(changeStepRows(record).every(r => r[10]), 'each join row shows the locks it set or cleared');
  assert.deepEqual(changeStepRows(record).map(r => [r[8], r[9], r[10]]), [[1, '', 'Stiffness 2'], [0, 'Weight 1', 'Weight 2']],
    'a join moves the value and its lock onto the kept node (the branch pass removes the duplicate later)');
  for (const drop of [0, 1]) {
    const missing = {changes: {...record.changes, list: record.changes.list.filter((_, i) => i !== drop)}};
    assert.ok(changeLines(missing).some(l => l.notice && l.text.includes('The list is incomplete')), `join ${drop} missing is flagged`);
  }
  const unknown = {changes: {...record.changes, list: record.changes.list.map((s, i) => (i ? s : {...s, other: 1}))}};
  assert.ok(changeLines(unknown).some(l => l.notice && l.text.startsWith('1 change(s) are of a kind')), 'Other changes get a notice');
});

test('PR 303 review N6: a node added and a support removed after its node are listed with the node they belong to', () => {
  const t = pxml(pnode(10, '<Restraint><Type>+Y</Type></Restraint>'));
  const doc = readPsi116V2(t, {fileSha256: sha256Hex(t)});
  const [c] = doc.pipelines[0].components, p = doc.pipelines[0];
  const added = {...structuredClone(c), uid: 'new-1', restraints: [], values: {...structuredClone(c.values), NodeNumber: {v: 15, text: '15'}, NodeName: {v: 'N15', text: 'N15'}}};
  const deltas = [{stage: 's', rulesVersion: 'r/1', ops: [{op: 'remove', uid: c.uid, before: c, rule: 'r/1'}, {op: 'remove', uid: c.restraints[0].uid, rule: 'r/1'},
    {op: 'add', kind: 'component', uid: 'new-1', parent: p.uid, entity: added, rule: 'r/1'}]}];
  const record = {changes: {made: true, steps: [{stage: 's', rule: 'r/1', ops: 3}], list: changeList(doc, deltas), conflicts: []}};
  assert.deepEqual(removedSupportRows(record), [['/B1', '10', 'N10', '+Y', 's']]);
  assert.deepEqual(addedNodeRows(record), [['/B1', '15', 'N15', '=1/10', 's']]);
  assert.ok(!changeLines(record).some(l => l.notice));
});
