// E2c step 3 (Owner 20 Nov 2026): the review page lists what step 10 recorded on the UXML document, per sub-step and
// rule. On RMS-BLOW-1 and BM2 (today's supports stage, recorded inputs) the list holds every recorded change, with the
// counts measured before (RMS-BLOW-1: 21 nodes removed, 6 supports added; BM2: 0 and 9); a list missing a sub-step is
// flagged on the page. EF-05 (164 removed, 79 added, 94 rewritten) is measured by hand (it takes minutes).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {loadCalls, revive} from '../uxml/v2/supports/CoreCallsLib.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {runSupportsUnderLocks} from '../uxml/v2/supports/SupportsUnderLocks.js';
import {changeList} from '../uxml/v2/supports/ChangeList.js';
import {changeLines, changeStepRows, conflictLine, removedNodeRows} from '../uxml/v2/UxmlV2RunRecordChanges.js';

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
    assert.equal(total(record, 4), added, `${bench} supports added`);
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
});

test('lock conflicts in plain words', () => {
  assert.equal(conflictLine({branch: '/B1', node: '120', key: 'Weight', kept: '127', stageWanted: '120', step: '01-parent-enrichment'}),
    "/B1 node 120: Weight kept at the transfer's 127; today's stage wanted 120 (first wanted by 01-parent-enrichment).");
  assert.match(conflictLine({branch: '/B1', node: '30', key: 'Node', step: 'branch-pass'}), /kept, because it holds a transfer lock; today's stage removes it/);
  assert.match(conflictLine({branch: '/B1', node: '40', key: 'Supports', kept: '+Y', stageWanted: 'GUI'}), /kept the supports the transfer set \(\+Y\); today's stage wanted GUI\./);
});
