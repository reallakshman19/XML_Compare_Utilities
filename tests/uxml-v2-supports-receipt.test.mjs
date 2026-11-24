// Supports from CAESAR II, step 2 (Owner 18 Nov 2026): section 5 lists the receipt's support changes in plain words.
import assert from 'node:assert/strict';
import test from 'node:test';

import {supportRows, supportsLine} from '../uxml/v2/transfer/SupportLines.js';

const ref = {branchName: '/B1', nodeNumber: '50'};

test('a receipt made before supports were read says it lists none', () => {
  const r = supportRows(undefined);
  assert.deepEqual([r.rows, r.refused], [[], []]);
  assert.match(r.none, /before supports were read/);
});

test('each support change is one row: branch, node, what changed, XML, CAESAR II', () => {
  const r = supportRows({changes: [{ref, kind: 'edited', beforeText: '+Y, stiffness 1.7513E+12', afterText: '+Y, stiffness 2E+12'}], refused: []});
  assert.deepEqual(r.rows, [['/B1', '50', 'support edited', '+Y, stiffness 1.7513E+12', '+Y, stiffness 2E+12']]);
});

test('refusals show where and why; supports step 10 never writes are left to the summary line', () => {
  const r = supportRows({changes: [], refused: [
    {code: 'U2D_SUPPORT_NEW_NODE', ciiNode: '99999', detail: 'this support is on a node the XML does not have'},
    {code: 'U2D_SUPPORT_NOT_IN_CII', ref, detail: 'step 10 does not write ...'}]});
  assert.deepEqual(r.refused, [['CII node 99999', 'this support is on a node the XML does not have']]);
});

test('the summary line counts in plain words, with no codes', () => {
  const line = supportsLine({pointsSame: 162, changes: 1, step10Anchors: 30, refused: {U2D_SUPPORT_NOT_IN_CII: 11, U2D_SUPPORT_NEW_NODE: 1}});
  assert.equal(line, 'Supports (applied and locked, listed below): 162 points the same, 1 changed in CAESAR II, '
    + '30 open-end anchors step 10 adds; not compared: 11 supports in the XML that step 10 does not write, 1 support on a node the XML does not have.');
  assert.doesNotMatch(line, /U2D_/);
});

test('S-fix step 1: supports step 10 may have written itself are counted in plain words and listed as refused', () => {
  const line = supportsLine({pointsSame: 11, changes: 0, step10Anchors: 3, refused: {U2D_SUPPORT_MAY_BE_STEP10: 30}});
  assert.match(line, /0 changed in CAESAR II, .*not compared: 30 supports that step 10 may have written itself \(not applied\)\.$/);
  assert.doesNotMatch(line, /U2D_/);
  const r = supportRows({changes: [], refused: [{code: 'U2D_SUPPORT_MAY_BE_STEP10', ciiNode: '120', detail: 'step 10 may have ...'}]});
  assert.deepEqual([r.rows, r.refused], [[], [['CII node 120', 'step 10 may have ...']]]);
  assert.match(r.none, /^No support change was applied; the XML keeps its supports/);   // not "the same supports" above refused ones
  assert.doesNotMatch(r.none, /not compared/);                    // review of PR 309: they were compared, not applied
  assert.match(supportRows({changes: [], refused: []}).none, /same supports as the XML/);
});

test('S-fix step 3: compared with what step 10 wrote, every new code is in plain words', () => {
  const codes = ['U2D_SUPPORT_RULE_REMOVED', 'U2D_SUPPORT_OPEN_END_REMOVED', 'U2D_SUPPORT_SOURCE_UNKNOWN', 'U2D_SUPPORT_MERGED_COPY',
    'U2D_SUPPORT_NOT_ON_NODE', 'U2D_SUPPORT_ALREADY_ON_NODE', 'U2D_SUPPORT_TARGET_UNCLEAR'];
  const line = supportsLine({pointsSame: 203, changes: 0, step10Anchors: 30, comparedWith: 'step10', refused: Object.fromEntries(codes.map(c => [c, 1]))});
  assert.match(line, /^Supports \(applied and locked, listed below, compared with what step 10 wrote\): 203 points the same/);
  assert.doesNotMatch(line, /U2D_/);
  assert.equal(supportRows({changes: [], refused: []}, 'step10').none, 'CAESAR II has the same supports as step 10 wrote, on every node.');
  assert.equal(supportRows({changes: [], refused: []}).none, 'CAESAR II has the same supports as the XML on every paired node.');
});
