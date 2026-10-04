import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deriveExpectedNodeNameDelta } from './cii-workspace-multisource-texpected-oracle.js';
import { ciiSourceTargetKnownPositiveCoverage } from './cii-workspace-source-target-texpected-coverage.js';

const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
const targetText = readFileSync(benchmark('T.CII'), 'latin1');
const expectedText = readFileSync(benchmark('TEXPECTED-PARTIALLLYDONE.CII'), 'latin1');
const delta = deriveExpectedNodeNameDelta(targetText, expectedText);
const byAction = Object.fromEntries(['CREATE', 'DELETE', 'REPLACE'].map((action) => [
  action, delta.rows.filter((row) => row.action === action).length,
]));

assert.equal(delta.rows.length, 36, 'partial TEXPECTED known-positive census must remain 36 observed NodeName target changes');
assert.deepEqual(byAction, { CREATE: 1, DELETE: 0, REPLACE: 35 });
assert.equal(delta.before.physicalNodeNameRowCount, 1265);
assert.equal(delta.expected.physicalNodeNameRowCount, 1266);
assert.equal(delta.before.controlNodeNameCount, delta.before.physicalNodeNameRowCount);
assert.equal(delta.expected.controlNodeNameCount, delta.expected.physicalNodeNameRowCount);
assert.equal(new Set(delta.rows.map((row) => row.nodeId)).size, delta.rows.length, 'known-positive TARGET node list must be unique');

const benchmarkRows = delta.rows.map((row) => Object.freeze({
  targetNodeId: row.nodeId,
  action: row.action,
  beforeNodeName: row.oldValue,
  partialExpectedNodeName: row.newValue,
}));

// Exercise the audit-coverage classifier without using benchmark answers in production.
// The real retained correspondence run can feed the same helper with its Source→Target audit.
const syntheticAudit = {
  rows: benchmarkRows.slice(0, -1).map((row, index) => ({
    auditRowId: `TEST:S${(index % 3) + 1}:${index + 1}`,
    sourceId: `S${(index % 3) + 1}`,
    status: index % 2 === 0 ? 'BOUND' : 'REVIEW',
    targetNodeIds: [row.targetNodeId],
  })),
};
const syntheticCoverage = ciiSourceTargetKnownPositiveCoverage(syntheticAudit, delta.rows);
assert.equal(syntheticCoverage.expectedTargetNodeCount, 36);
assert.equal(syntheticCoverage.coveredTargetNodeCount, 35);
assert.equal(syntheticCoverage.missingTargetNodeCount, 1);
assert.deepEqual(syntheticCoverage.missingTargetNodeIds, [benchmarkRows.at(-1).targetNodeId]);
assert.equal(syntheticCoverage.boundTargetNodeCount + syntheticCoverage.reviewOnlyTargetNodeCount, 35);

console.log(JSON.stringify({
  benchmark: 'T.CII -> TEXPECTED-PARTIALLLYDONE.CII',
  authority: 'TEST_ONLY_PARTIAL_KNOWN_POSITIVE_LOWER_BOUND',
  physicalNodeNameRowsBefore: delta.before.physicalNodeNameRowCount,
  physicalNodeNameRowsPartialExpected: delta.expected.physicalNodeNameRowCount,
  observedNodeNameDeltaCount: delta.rows.length,
  byAction,
  benchmarkRows,
  coverageContractExample: syntheticCoverage,
  productionAuthority: 'NONE — this output is validation-only and must not feed correspondence or Writer2',
}, null, 2));

console.log('CII Source→Target partial-TEXPECTED benchmark census checks: PASS');
