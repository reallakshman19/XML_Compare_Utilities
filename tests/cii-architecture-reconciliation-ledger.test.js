import assert from 'node:assert/strict';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js';
import {
  classifyCiiSnapshotOperations, reconcileCiiSnapshot, compareCiiNodeCensuses,
} from '../scripts/cii-architecture-snapshot-ledger.mjs';

const nameProperty = 'Node name / to-name';
const operation = (id, action, target, before, proposed, sourceId = 'S1') => ({
  operationId: id, sourceId, family: 'NODE_NAME', property: nameProperty, status: 'PREVIEW_READY',
  policyAuthority: action === 'COPY' ? 'CII_WRITER_1C_NODENAME_EXISTING_ROW_FIELD' : CII_WRITER_2_NODENAME_RELOCATION_POLICY,
  matchAuthority: { status: 'REVIEWED' }, targetEvidence: { identity: target, value: before },
  sourceEvidence: { value: proposed }, before, proposed, action,
});
const realOps = [
  operation('replace-1', 'COPY', '875', 'PS-OLD', 'SL-NEW'),
  operation('replace-duplicate', 'COPY', '875', 'PS-OLD', 'SL-NEW', 'S2'),
  operation('create-1', 'CREATE', '880', '', 'SL-CREATE'),
];
const distinct = classifyCiiSnapshotOperations({ operations: realOps });
assert.equal(distinct.canonicalPotentialMutationCount, 2, 'one identical physical corroboration collapses');
assert.deepEqual(distinct.potentialByWriterFamily, { WRITER1C_REPLACE: 1, WRITER2_CREATE: 1, WRITER2_DELETE: 0 });
assert.equal(distinct.duplicateCorroborationCount, 1, 'collapsing a mutation is not proving shared source custody');
assert.equal(distinct.conflictingPhysicalTargetCount, 0);
assert.equal(distinct.totalTransferOperations, 3);
assert.equal(distinct.unqualifiedNodeNameOperationCount, 0);
const different = classifyCiiSnapshotOperations({ operations: [
  operation('conflict-a', 'COPY', '875', 'PS-OLD', 'SL-A'),
  operation('conflict-b', 'COPY', '875', 'PS-OLD', 'SL-B'),
] });
assert.equal(different.conflictingPhysicalTargetCount, 1, 'same target physical field with incompatible values conflicts');
assert.equal(different.canonicalPotentialMutationCount, 0, 'conflict is not an available physical mutation');
const unauthorized = classifyCiiSnapshotOperations({ operations: [
  { ...operation('bad-review', 'COPY', '875', 'PS-OLD', 'SL-X'), matchAuthority: { status: 'REVIEW' } },
] });
assert.equal(unauthorized.canonicalPotentialMutationCount, 0);
assert.equal(unauthorized.unqualifiedNodeNameOperationCount, 1);
assert.throws(() => classifyCiiSnapshotOperations({ operations: [
  operation('dupe-id', 'COPY', '875', 'A', 'B'), operation('dupe-id', 'COPY', '880', 'A', 'B'),
] }), /A0_DUPLICATE_OPERATION_ID/);

const rows = [
  { rowKey: 'S1:1', sourceId: 'S1', state: 'BOUND', sourceNodeName: 'SL1', targetNodeId: '875', targetNodeName: 'PS1',
    confidence: 'HIGH', reviewDecisions: ['ACCEPTED'], reasons: [], qualifiedNodeNameChange: true },
  { rowKey: 'S1:2', sourceId: 'S1', state: 'UNRESOLVED', targetNodeId: '880', reasons: ['AMBIGUOUS_FRONTIER'] },
  { rowKey: 'S2:5', sourceId: 'S2', state: 'UNEMITTED', targetNodeId: null, reasons: ['NO_NODE_CORRESPONDENCE_EMITTED'] },
];
const audit = {
  rows, summary: {
    totalSourceNodes: 3,
    bySource: [
      { sourceId: 'S1', declaredNodeCount: 2, enumeratedNodeCount: 2, populationStatus: 'MATCH' },
      { sourceId: 'S2', declaredNodeCount: 1, enumeratedNodeCount: 1, populationStatus: 'MATCH' },
    ],
  },
};
const preview = {
  sourceSetSha256: 'a'.repeat(64), targetAuthority: { originalSha256: 'b'.repeat(64) },
  correspondence: { status: 'UNRESOLVED' },
  compareReview: { rows: [{ kind: 'NODE', confidence: 'HIGH' }, { kind: 'ELEMENT', confidence: 'MEDIUM' }] },
  transferPlan: { operations: realOps, excludedOperations: [], status: 'BLOCKED', blockers: [
    'S2:CORRESPONDENCE_NOT_READY', 'MULTISOURCE_CORRESPONDENCE_NOT_READY',
  ] },
  writerReadiness: { status: 'BLOCKED', blockers: ['CII_MS_WRITER2_BOUND_SCOPE_REQUIRED'],
    blockerCausality: { primary: [{ code: 'S2:CORRESPONDENCE_NOT_READY' }],
      derived: [{ code: 'MULTISOURCE_CORRESPONDENCE_NOT_READY' }] } },
};
const ledger = reconcileCiiSnapshot(preview, audit, { mode: 'SYNTHETIC' });
assert.deepEqual(ledger.physicalNodeCensus.states, { BOUND: 1, UNRESOLVED: 1, AMBIGUOUS: 0, UNEMITTED: 1 });
assert.equal(ledger.physicalNodeCensus.total, 3);
assert.equal(ledger.reviewRowPopulation.confidenceByKind.NODE.HIGH, 1);
assert.equal(ledger.reviewRowPopulation.confidenceByKind.ELEMENT.MEDIUM, 1);
assert.equal(ledger.bm001Observation.expectedRows, 329);
assert.equal(ledger.bm001Observation.matchedRows, 0);
assert.equal(ledger.bm001Observation.status, 'READY', 'zero observed BM lexical rows is not automatically a failure');
assert.equal(ledger.bm001Observation.observationStatus, 'PARTIAL');
assert.equal(ledger.scope.state, 'UNBOUND');
assert.equal(ledger.scope.appliedCount, null, 'unbound is not the same as authorized zero');
assert.equal(ledger.mutation.canonicalPotentialMutationCount, 2);
assert.equal(ledger.blockers.primary[0].code, 'S2:CORRESPONDENCE_NOT_READY');
assert.equal(ledger.blockers.derived[0].code, 'MULTISOURCE_CORRESPONDENCE_NOT_READY');
const revisedRows = rows.map((row) => row.rowKey === 'S2:5' ? { ...row, state: 'BOUND', targetNodeId: '940' } : row);
const revisedAudit = { ...audit, rows: revisedRows };
const revised = reconcileCiiSnapshot(preview, revisedAudit, { mode: 'SYNTHETIC_REVISED' });
const diff = compareCiiNodeCensuses(ledger, revised);
assert.equal(diff.differences.length, 1);
assert.equal(diff.differences[0].sourceNode, 'S2:5');
assert.equal(diff.differences[0].leftState, 'UNEMITTED');
assert.equal(diff.differences[0].rightState, 'BOUND');
assert.throws(() => reconcileCiiSnapshot(preview, { ...audit, rows: [rows[0], rows[0], rows[2]] }), /A0_PHYSICAL_SOURCE_KEY_NOT_UNIQUE/);
assert.throws(() => reconcileCiiSnapshot(preview, { ...audit, rows: rows.slice(0, 2) }), /A0_SOURCE_AUDIT_DENOMINATOR_MISMATCH/);
assert.throws(() => compareCiiNodeCensuses(reconcileCiiSnapshot(preview, audit, { evidenceLimit: 1 }), revised),
  /A0_CENSUS_DIFF_REQUIRES_COMPLETE_PHYSICAL_ROWS/);
console.log('PASS A0 snapshot-ledger: unique SOURCE denominator, mixed review population, BM observation vs authorization, Writer1C/Writer2 partition, duplicates/conflicts, blocker causality, snapshot differences.');
