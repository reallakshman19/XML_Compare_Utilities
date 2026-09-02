import assert from 'node:assert/strict';
import test from 'node:test';

import { CII_SIX_FIELD_WIDTHS } from '../parser/fixed-field.js';
import { inspectForcmntOracleCandidate } from '../scripts/cii-forcmnt-oracle-check.mjs';

function fixedRow(values) {
  return CII_SIX_FIELD_WIDTHS.map((width, index) => {
    const value = values[index] ?? 0;
    return String(value).padStart(width, ' ');
  }).join('');
}

function elementBlock({ from = 100, to = 200, forcePointer = 1 } = {}) {
  const rows = Array.from({ length: 15 }, () => fixedRow([0, 0, 0, 0, 0, 0]));
  rows[0] = fixedRow([from, to, 0, 0, 0, 0]);
  rows[12] = fixedRow([0, 0, 0, 0, 0, forcePointer]);
  return rows;
}

function fixture({ version = 14, controlCount = 1, forcePointer = 1, forcmntRows = 20 } = {}) {
  const lines = [
    '#$ VERSION',
    fixedRow([5, version, 1256, 0, 0, 0]),
    '#$ CONTROL',
    fixedRow([1, 0, 0, 0, 0, 0]),
    fixedRow([0, 0, 0, 0, 0, controlCount]),
    fixedRow([0, 0, 0, 0, 0, 0]),
    fixedRow([0, 0, 0, 0, 0, 0]),
    '#$ ELEMENTS',
    ...elementBlock({ forcePointer }),
    '#$ FORCMNT',
  ];
  for (let index = 0; index < forcmntRows; index += 1) {
    lines.push(fixedRow([index === 0 ? 200 : index === 10 ? 0 : index + 1, 0, 0, 0, 0, 0]));
  }
  return `${lines.join('\r\n')}\r\n`;
}

test('qualifies only as a retained-oracle candidate and grants no FORCE mutation authority', () => {
  const result = inspectForcmntOracleCandidate(fixture());
  assert.equal(result.status, 'PASS_CANDIDATE');
  assert.equal(result.evidence.version, 14);
  assert.equal(result.evidence.controlForcmntCount, 1);
  assert.equal(result.evidence.physicalForcmntRows, 20);
  assert.equal(result.evidence.physicalForcmntBlockCount, 1);
  assert.deepEqual(result.evidence.positiveElementPointers.map(({ from, to, pointer }) => ({ from, to, pointer })), [
    { from: 100, to: 200, pointer: 1 },
  ]);
  assert.equal(result.evidence.blocks[0].specification1HeadValue, 200);
  assert.equal(result.evidence.blocks[0].specification2HeadValue, 0);
  assert.equal(result.mutationAuthority, 'NONE');
  assert.deepEqual(result.mutableSpans, []);
  assert.equal(result.blockers.length, 0);
});

test('rejects a non-v14 neutral file even when FORCMNT structure is otherwise present', () => {
  const result = inspectForcmntOracleCandidate(fixture({ version: 11 }));
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('TARGET_V14_REQUIRED:11'));
  assert.equal(result.mutationAuthority, 'NONE');
});

test('rejects zero CONTROL FORCMNT cardinality', () => {
  const result = inspectForcmntOracleCandidate(fixture({ controlCount: 0, forcePointer: 0, forcmntRows: 0 }));
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('CONTROL_FORCMNT_NONZERO_REQUIRED'));
  assert.ok(result.blockers.includes('ELEMENT_FORCMNT_POSITIVE_POINTER_REQUIRED'));
});

test('rejects physical FORCMNT rows that do not match CONTROL count x 20', () => {
  const result = inspectForcmntOracleCandidate(fixture({ forcmntRows: 19 }));
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('FORCMNT_CONTROL_CARDINALITY_MISMATCH:19:20'));
  assert.ok(result.blockers.includes('FORCMNT_20_ROW_ALIGNMENT_REQUIRED:19'));
});

test('rejects a positive element FORCMNT pointer outside physical block range', () => {
  const result = inspectForcmntOracleCandidate(fixture({ controlCount: 1, forcePointer: 2, forcmntRows: 20 }));
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('ELEMENT_FORCMNT_POINTER_OUT_OF_RANGE:2:1:100:200'));
});
