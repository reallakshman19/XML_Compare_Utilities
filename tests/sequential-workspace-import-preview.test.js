import assert from 'node:assert/strict';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import {
  createEmptyConstructionSession,
  freezeConstructionSession,
} from '../tabs/sequential-sketcher/construction/sequential-construction-contract.js';
import {
  buildSequentialWorkspaceImportPreview,
  formatSequentialWorkspaceImportPreview,
  sequentialWorkspaceCurrentStateFingerprint,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-import-preview.js';
import { sequentialSourceRecordsFingerprint } from '../tabs/sequential-sketcher/persistence/sequential-workspace-package.js';

function records(branchIds) {
  return branchIds.map((branchId) => ({
    type: 'BRANCH',
    name: branchId,
    attributes: { NAME: branchId },
    children: [],
  }));
}
function session(branchId, state, extra = {}) {
  return freezeConstructionSession({
    ...createEmptyConstructionSession(branchId),
    state,
    ...extra,
  });
}
function model(sourceRecords, branchIds, entries, activeBranchId = null) {
  const registry = createSequentialBranchWorkspaceRegistry();
  registry.reset(branchIds);
  for (const entry of entries) registry.save(entry.branchId, entry.snapshot);
  return {
    records: sourceRecords,
    evidence: { branches: branchIds.map((branchId) => ({ branchId })) },
    branchRegistry: registry,
    session: activeBranchId ? registry.get(activeBranchId)?.session || null : null,
  };
}

const currentRecords = records(['/PREVIEW/A', '/PREVIEW/B']);
const packageRecords = records(['/PREVIEW/B', '/PREVIEW/C']);
const currentA = session('/PREVIEW/A', 'ROUTE_COMPLETE', {
  transactionLedger: [{ transactionId: 'TX-A', schema: 'SequentialConstructionTransaction.v1' }],
  undoStack: [{ transactionId: 'TX-A' }],
});
const currentB = session('/PREVIEW/B', 'USER_DECISION_REQUIRED', {
  deferredDecisionIds: ['DEC-B'],
});
const packageB = session('/PREVIEW/B', 'ROUTE_COMPLETE', {
  transactionLedger: [
    { transactionId: 'TX-B1', schema: 'SequentialConstructionTransaction.v1' },
    { transactionId: 'TX-B2', schema: 'SequentialConstructionTransaction.v1' },
  ],
  undoStack: [{ transactionId: 'TX-B1' }],
});
const packageC = session('/PREVIEW/C', 'USER_DECISION_REQUIRED', {
  transactionLedger: [{ transactionId: 'TX-C', schema: 'SequentialConstructionTransaction.v1' }],
  redoStack: [{ transactionId: 'TX-C' }],
  deferredDecisionIds: ['DEC-C1', 'DEC-C2'],
});

const currentModel = model(currentRecords, ['/PREVIEW/A', '/PREVIEW/B'], [
  { branchId: '/PREVIEW/A', snapshot: { session: currentA, selectedCandidateId: 'CAND-A' } },
  { branchId: '/PREVIEW/B', snapshot: { session: currentB } },
], '/PREVIEW/A');

const restoration = Object.freeze({
  schema: 'SequentialWorkspaceRestoration.v1',
  packageFingerprint: 'pkg-preview-001',
  sourceFingerprint: sequentialSourceRecordsFingerprint(packageRecords),
  records: packageRecords,
  branchIds: ['/PREVIEW/B', '/PREVIEW/C'],
  activeBranchId: '/PREVIEW/C',
  workspaces: Object.freeze([
    Object.freeze({ branchId: '/PREVIEW/B', snapshot: Object.freeze({ session: packageB, selectedCandidateId: '' }) }),
    Object.freeze({ branchId: '/PREVIEW/C', snapshot: Object.freeze({ session: packageC, selectedCandidateId: 'CAND-C' }) }),
  ]),
  decisionRegister: Object.freeze({
    schema: 'SequentialDecisionRegister.v1',
    summary: Object.freeze({ unresolvedCount: 2, manualResolutionCount: 1 }),
  }),
});

const preview = buildSequentialWorkspaceImportPreview(restoration, currentModel);
assert.equal(preview.schema, 'SequentialWorkspaceImportPreview.v1');
assert.equal(preview.sourceRelation, 'DIFFERENT');
assert.equal(preview.sourceReplacementRequired, true);
assert.deepEqual(preview.addedBranchIds, ['/PREVIEW/C']);
assert.deepEqual(preview.removedBranchIds, ['/PREVIEW/A']);
assert.deepEqual(preview.commonBranchIds, ['/PREVIEW/B']);
assert.deepEqual(preview.newWorkspaceBranchIds, ['/PREVIEW/C']);
assert.deepEqual(preview.overwrittenWorkspaceBranchIds, ['/PREVIEW/B']);
assert.deepEqual(preview.unchangedWorkspaceBranchIds, []);
assert.deepEqual(preview.removedWorkspaceBranchIds, ['/PREVIEW/A']);
assert.equal(preview.activeBranchBefore, '/PREVIEW/A');
assert.equal(preview.activeBranchAfter, '/PREVIEW/C');
assert.equal(preview.packageTotals.transactionCount, 3);
assert.equal(preview.packageTotals.undoEntryCount, 1);
assert.equal(preview.packageTotals.redoEntryCount, 1);
assert.equal(preview.packageTotals.deferredDecisionCount, 2);
assert.equal(preview.packageTotals.completeWorkspaceCount, 1);
assert.equal(preview.packageTotals.blockedWorkspaceCount, 1);
assert.equal(preview.hasDestructiveChanges, true);
assert.equal(preview.requiresExplicitApply, true);
assert.equal(preview.decisionRegisterSummary.unresolvedCount, 2);
const previewText = formatSequentialWorkspaceImportPreview(preview);
assert.match(previewText, /will replace the current source evidence/);
assert.match(previewText, /Nothing has been applied/);
assert.match(previewText, /3 transactions/);

const matchingModel = model(packageRecords, ['/PREVIEW/B', '/PREVIEW/C'], [
  { branchId: '/PREVIEW/B', snapshot: { session: packageB } },
  { branchId: '/PREVIEW/C', snapshot: { session: packageC, selectedCandidateId: 'CAND-C' } },
], '/PREVIEW/C');
const matchingPreview = buildSequentialWorkspaceImportPreview(restoration, matchingModel);
assert.equal(matchingPreview.sourceRelation, 'MATCH');
assert.equal(matchingPreview.sourceReplacementRequired, false);
assert.deepEqual(matchingPreview.overwrittenWorkspaceBranchIds, []);
assert.deepEqual(matchingPreview.unchangedWorkspaceBranchIds, ['/PREVIEW/B', '/PREVIEW/C']);
assert.equal(matchingPreview.hasDestructiveChanges, false);

const emptyPreview = buildSequentialWorkspaceImportPreview(restoration, {});
assert.equal(emptyPreview.sourceRelation, 'EMPTY');
assert.equal(emptyPreview.currentBranchCount, 0);
assert.deepEqual(emptyPreview.addedBranchIds, ['/PREVIEW/B', '/PREVIEW/C']);
assert.equal(emptyPreview.packageSavedWorkspaceCount, 2);

const initialFingerprint = sequentialWorkspaceCurrentStateFingerprint(currentModel);
currentModel.session = currentB;
assert.notEqual(sequentialWorkspaceCurrentStateFingerprint(currentModel), initialFingerprint,
  'active branch changes must invalidate an existing preview');
currentModel.session = currentA;
currentModel.branchRegistry.save('/PREVIEW/B', { session: packageB });
assert.notEqual(sequentialWorkspaceCurrentStateFingerprint(currentModel), initialFingerprint,
  'workspace changes must invalidate an existing preview');
const sourceChanged = { ...currentModel, records: records(['/PREVIEW/A', '/PREVIEW/B', '/PREVIEW/X']) };
assert.notEqual(sequentialWorkspaceCurrentStateFingerprint(sourceChanged), sequentialWorkspaceCurrentStateFingerprint(currentModel),
  'source changes must invalidate an existing preview');

assert.throws(
  () => buildSequentialWorkspaceImportPreview({ schema: 'WrongSchema' }, currentModel),
  /WORKSPACE_IMPORT_PREVIEW_RESTORATION_INVALID/,
);
assert.throws(() => formatSequentialWorkspaceImportPreview({}), /WORKSPACE_IMPORT_PREVIEW_INVALID/);

console.log('sequential workspace import preview tests passed');
