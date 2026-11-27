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
    'U2D_SUPPORT_NOT_ON_NODE', 'U2D_SUPPORT_TARGET_UNCLEAR', 'U2D_SUPPORT_COPIES_NOT_LISTED',
    'U2D_SUPPORT_COPIES_WRITTEN_ONCE'];
  const line = supportsLine({pointsSame: 203, changes: 0, step10Anchors: 30, comparedWith: 'step10', refused: Object.fromEntries(codes.map(c => [c, 1]))});
  assert.match(line, /^Supports \(applied and locked, listed below, compared with what step 10 wrote\): 203 points the same/);
  assert.doesNotMatch(line, /U2D_/);
  assert.equal(supportRows({changes: [], refused: []}, 'step10').none, 'CAESAR II has the same supports as step 10 wrote, on every node.');
  assert.equal(supportRows({changes: [], refused: []}).none, 'CAESAR II has the same supports as the XML on every paired node.');
});

test('every support code the Python transfer gives is in plain words (S-fix 3l, PR 321 review point 3)', async () => {
  const {readFile} = await import('node:fs/promises');
  const py = await readFile(new URL('../prototypes/u2d-cii-source/u2d_supports.py', import.meta.url), 'utf8');
  const codes = [...new Set(py.match(/U2D_SUPPORT_[A-Z0-9_]+/g))];
  assert.ok(codes.includes('U2D_SUPPORT_ATTA_DEFAULT'), codes.join());
  for (const code of codes) {
    assert.doesNotMatch(supportsLine({pointsSame: 1, changes: 0, step10Anchors: 0, refused: {[code]: 1}}), /U2D_/, code);
  }
  assert.match(supportsLine({pointsSame: 1, changes: 0, step10Anchors: 0, refused: {U2D_SUPPORT_ATTA_DEFAULT: 2}}),
    /not compared: 2 supports changed or deleted in CAESAR II so an ATTA is left with no support step 10 counts; step 10 would put its default rest support \(\+Y\) there instead \(not applied\)\./);
});
