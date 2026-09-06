import assert from 'node:assert/strict';
import {
  evaluatePartialTExpectedPostimage,
  expectedStructuralTransferKeys,
  partialExpectedFamilyKey,
  partialExpectedNameMatch,
  structuralTransferKey,
  validateAppliedRawIdentity,
  validateRawMutationIdentity,
} from './cii-workspace-multisource-partial-texpected-oracle.js';
import { deriveExpectedNodeNameDelta } from './cii-workspace-multisource-texpected-oracle.js';

function field(value) { return String(value ?? '').padStart(13, ' '); }
function six(values = []) { return `  ${Array.from({ length: 6 }, (_, index) => field(values[index] ?? 0)).join('')}`; }
function elementBlock(from, to, pointer) {
  const rows = Array.from({ length: 15 }, () => six());
  rows[0] = six([from, to, 0, 0, 0, 0]);
  rows[13] = six([0, 0, 0, 0, 0, pointer]);
  return rows;
}
function nodeNameRow(fromName = '', toName = '') { return `  ${fromName.padEnd(26, ' ')}${toName.padEnd(25, ' ')}`; }
function fixture({ firstPointer, secondPointer, fromName, allowValue = 3 }) {
  return [
    '#$ CONTROL ', six([2, 0, 0, 1, 0, 0]), six(), six(), field(0),
    '#$ ELEMENTS', ...elementBlock(20, 21, firstPointer), ...elementBlock(30, 31, secondPointer),
    '#$ NODENAME', nodeNameRow(fromName),
    '#$ ALLOWBLS', six([1, 0, 0, 0, 9999, 0]), six([allowValue, 0, 0, 0, 0, 0]), '#$ END',
  ].join('\r\n');
}

assert.equal(partialExpectedFamilyKey('SL-106.3'), 'SL-106');
assert.equal(partialExpectedFamilyKey('/SL-001.14'), 'SL-1');
assert.equal(partialExpectedNameMatch('SL-106.3', 'SL-106').kind, 'PARTIAL_EXPECTED_FAMILY');
assert.equal(partialExpectedNameMatch('SL-106.4', 'SL-106.3').match, false, 'a dotted expected name remains exact sibling authority');
assert.equal(partialExpectedNameMatch('SL-107.3', 'SL-106').match, false, 'wrong family must never pass partial expected matching');

const target = fixture({ firstPointer: 1, secondPointer: 0, fromName: 'PS02494.1' });
const partialExpected = fixture({ firstPointer: 0, secondPointer: 1, fromName: 'SL-106' });
const exactActual = fixture({ firstPointer: 0, secondPointer: 1, fromName: 'SL-106.3' });
const truncatedActual = fixture({ firstPointer: 0, secondPointer: 1, fromName: 'SL-106' });
const foreignActual = fixture({ firstPointer: 0, secondPointer: 1, fromName: 'SL-106.3', allowValue: 53 });

const structural = evaluatePartialTExpectedPostimage(target, exactActual, partialExpected);
assert.equal(structural.status, 'READY');
assert.equal(structural.encoding.differences.length, 0);
assert.equal(structural.semantics.differences.length, 0);
assert.equal(structural.encoding.familyExpansions.length, 1, 'exact dotted output must be recorded as an expansion of the partial expected family');
assert.equal(evaluatePartialTExpectedPostimage(target, foreignActual, partialExpected).status, 'BLOCKED', 'partial expected matching must not authorize unrelated target edits');

const delta = deriveExpectedNodeNameDelta(target, partialExpected);
assert.deepEqual(expectedStructuralTransferKeys(delta.rows), [
  'CREATE|30|SL-106',
  'DELETE|20|PS-2494',
]);
assert.equal(structuralTransferKey('CREATE', '30', 'SL-106.3'), 'CREATE|30|SL-106');

const source = fixture({ firstPointer: 1, secondPointer: 0, fromName: 'SL-106.3' });
const operations = [
  {
    operationId: 'delete-target-name', sourceId: 'S1', action: 'DELETE', before: 'PS02494.1', proposed: '',
    targetEvidence: { identity: '20', value: 'PS02494.1' },
  },
  {
    operationId: 'create-source-name', sourceId: 'S1', action: 'CREATE', before: '', proposed: 'SL-106.3',
    sourceEvidence: { value: 'SL-106.3' }, targetEvidence: { identity: '30', value: '' },
    bm001Acceptance: { benchmark: 'BM-001', status: 'BOUND', sourceNames: ['SL-106.3'], targetName: 'PS02494.1' },
  },
];
const bmRows = [{ rowNumber: 1, sourceNames: ['/SL-106.3'], targetName: 'PS02494.1' }];
assert.equal(validateRawMutationIdentity(operations, { S1: source }, target, bmRows).status, 'READY');
assert.equal(validateAppliedRawIdentity(exactActual, operations).status, 'READY');
assert.equal(validateAppliedRawIdentity(truncatedActual, operations).status, 'BLOCKED',
  'matching the partial TEXPECTED family is insufficient when Writer2 truncates the exact selected raw source name');

const wrongSibling = operations.map((row) => row.action === 'CREATE' ? {
  ...row,
  proposed: 'SL-106.4',
  sourceEvidence: { value: 'SL-106.4' },
  bm001Acceptance: { ...row.bm001Acceptance, sourceNames: ['SL-106.4'] },
} : row);
const wrongRaw = validateRawMutationIdentity(wrongSibling, { S1: source }, target, bmRows);
assert.equal(wrongRaw.status, 'BLOCKED');
assert(wrongRaw.errors.some((row) => row.code === 'CREATE_VALUE_NOT_EXACT_SOURCE_NAME'));
assert(wrongRaw.errors.some((row) => row.code === 'CREATE_VALUE_NOT_EXACT_BM_ALIAS_FOR_TARGET'));

console.log('CII partial TEXPECTED structural + exact raw identity oracle checks passed.');
