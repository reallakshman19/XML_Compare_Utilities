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
  assert.equal(line, 'Supports (listed below, not applied to the XML yet): 162 points the same, 1 changed in CAESAR II, '
    + '30 open-end anchors step 10 adds; not compared: 11 supports in the XML that step 10 does not write, 1 support on a node the XML does not have.');
  assert.doesNotMatch(line, /U2D_/);
});
