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
  sequentialWorkspaceRestorationStateFingerprint,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-import-preview.js';
import { sequentialSourceRecordsFingerprint } from '../tabs/sequential-sketcher/persistence/sequential-workspace-package.js';
import { createSequentialJournalAdoption } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-service.js';
import { appendSequentialCommandJournal } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-journal.js';
import { appendJournalCommand } from '../contracts/command-journal.js';

function records(branchIds) {
  return branchIds.map((branchId) => ({ type: 'BRANCH', name: branchId, attributes: { NAME: branchId }, children: [] }));
}
function session(branchId, state, extra = {}) {
  return freezeConstructionSession({ ...createEmptyConstructionSession(branchId), state, ...extra });
}
function model(sourceRecords, branchIds, entries, activeBranchId = null, journalState = null) {
  const registry = createSequentialBranchWorkspaceRegistry();
  registry.reset(branchIds);
  for (const entry of entries) registry.save(entry.branchId, entry.snapshot);
  return {
    records: sourceRecords,
    evidence: { branches: branchIds.map((branchId) => ({ branchId })) },
    branchRegistry: registry,
    session: activeBranchId ? registry.get(activeBranchId)?.session || null : null,
    journalState,
  };
}
function restoration(sourceRecords, branchIds, entries, activeBranchId, journalState = null) {
  return Object.freeze({
    schema: journalState ? 'SequentialWorkspaceRestoration.v2' : 'SequentialWorkspaceRestoration.v1',
    packageSchema: journalState ? 'SequentialWorkspacePackage.v2' : 'SequentialWorkspacePackage.v1',
    packageRevision: journalState ? 2 : 1,
    packageFingerprint: journalState ? 'pkg-preview-v2' : 'pkg-preview-v1',
    sourceFingerprint: sequentialSourceRecordsFingerprint(sourceRecords),
    records: sourceRecords,
    evidence: { branches: branchIds.map((branchId) => ({ branchId })) },
    branchIds,
    activeBranchId,
    workspaces: Object.freeze(entries.map((entry) => Object.freeze(entry))),
    decisionRegister: Object.freeze({ summary: Object.freeze({ unresolvedCount: 2, manualResolutionCount: 1 }) }),
    journalState,
  });
}

const currentRecords = records(['/PREVIEW/A', '/PREVIEW/B']);
const packageRecords = records(['/PREVIEW/B', '/PREVIEW/C']);
const currentA = session('/PREVIEW/A', 'ROUTE_COMPLETE', {
  transactionLedger: [{ transactionId: 'TX-A', schema: 'SequentialConstructionTransaction.v1' }],
  undoStack: [{ transactionId: 'TX-A' }],
});
const currentB = session('/PREVIEW/B', 'USER_DECISION_REQUIRED', { deferredDecisionIds: ['DEC-B'] });
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
const currentEntries = [
  { branchId: '/PREVIEW/A', snapshot: { session: currentA, selectedCandidateId: 'CAND-A' } },
  { branchId: '/PREVIEW/B', snapshot: { session: currentB } },
];
const packageEntries = [
  { branchId: '/PREVIEW/B', snapshot: { session: packageB, selectedCandidateId: '' } },
  { branchId: '/PREVIEW/C', snapshot: { session: packageC, selectedCandidateId: 'CAND-C' } },
];
const currentModel = model(currentRecords, ['/PREVIEW/A', '/PREVIEW/B'], currentEntries, '/PREVIEW/A');
const v1Restoration = restoration(packageRecords, ['/PREVIEW/B', '/PREVIEW/C'], packageEntries, '/PREVIEW/C');
const preview = buildSequentialWorkspaceImportPreview(v1Restoration, currentModel);
assert.equal(preview.schema, 'SequentialWorkspaceImportPreview.v1');
assert.equal(preview.packageSchema, 'SequentialWorkspacePackage.v1');
assert.equal(preview.journalImpact, 'ABSENT');
assert.equal(preview.sourceRelation, 'DIFFERENT');
assert.deepEqual(preview.addedBranchIds, ['/PREVIEW/C']);
assert.deepEqual(preview.removedBranchIds, ['/PREVIEW/A']);
assert.deepEqual(preview.overwrittenWorkspaceBranchIds, ['/PREVIEW/B']);
assert.equal(preview.packageTotals.transactionCount, 3);
assert.equal(preview.hasDestructiveChanges, true);
assert.match(formatSequentialWorkspaceImportPreview(preview), /journal impact ABSENT/);
assert.equal(
  sequentialWorkspaceRestorationStateFingerprint(v1Restoration),
  sequentialWorkspaceRestorationStateFingerprint(JSON.parse(JSON.stringify(v1Restoration))),
);

const adoptedRecords = records(['/PREVIEW/J']);
const adoptedSession = createEmptyConstructionSession('/PREVIEW/J');
const adoptedEntries = [{ branchId: '/PREVIEW/J', snapshot: { session: adoptedSession } }];
const adoptedModel = model(adoptedRecords, ['/PREVIEW/J'], adoptedEntries, '/PREVIEW/J');
const sourceFingerprint = sequentialSourceRecordsFingerprint(adoptedRecords);
const journal = createSequentialJournalAdoption({
  documentId: 'preview-document', sessionId: 'preview-session', sourceFingerprint,
  branchRegistry: adoptedModel.branchRegistry, adoptedAt: '2026-07-27T09:10:00.000Z',
});
const adoptedRestoration = restoration(adoptedRecords, ['/PREVIEW/J'], adoptedEntries, '/PREVIEW/J', journal);
assert.equal(buildSequentialWorkspaceImportPreview(adoptedRestoration, adoptedModel).journalImpact, 'INSTALL');
const currentAdopted = { ...adoptedModel, journalState: journal };
const unchanged = buildSequentialWorkspaceImportPreview(adoptedRestoration, currentAdopted);
assert.equal(unchanged.journalImpact, 'UNCHANGED');
assert.equal(unchanged.hasDestructiveChanges, false);
const replacementJournal = createSequentialJournalAdoption({
  documentId: 'preview-document-2', sessionId: 'preview-session-2', sourceFingerprint,
  branchRegistry: adoptedModel.branchRegistry, adoptedAt: '2026-07-27T09:11:00.000Z',
});
const replacement = buildSequentialWorkspaceImportPreview(
  restoration(adoptedRecords, ['/PREVIEW/J'], adoptedEntries, '/PREVIEW/J', replacementJournal),
  currentAdopted,
);
assert.equal(replacement.journalImpact, 'REPLACE');
assert.equal(replacement.hasDestructiveChanges, true);
const removal = buildSequentialWorkspaceImportPreview(
  restoration(adoptedRecords, ['/PREVIEW/J'], adoptedEntries, '/PREVIEW/J'),
  currentAdopted,
);
assert.equal(removal.journalImpact, 'REMOVE');
assert.equal(removal.hasDestructiveChanges, true);

const initialFingerprint = sequentialWorkspaceCurrentStateFingerprint(currentAdopted);
const changedHead = JSON.parse(JSON.stringify(journal));
changedHead.journal = appendJournalCommand(changedHead.journal, {
  commandId: 'PREVIEW-COMMAND-1',
  commandType: 'TEST',
  payload: {},
  issuedAt: '2026-07-27T09:12:00.000Z',
}, '2026-07-27T09:12:00.000Z');
assert.notEqual(
  sequentialWorkspaceCurrentStateFingerprint({ ...currentAdopted, journalState: changedHead }),
  initialFingerprint,
  'journal-head-only change must invalidate a pending preview',
);
const independent = model(adoptedRecords, ['/PREVIEW/J'], adoptedEntries, '/PREVIEW/J', JSON.parse(JSON.stringify(journal)));
assert.equal(sequentialWorkspaceCurrentStateFingerprint(independent), initialFingerprint);
assert.throws(
  () => sequentialWorkspaceCurrentStateFingerprint({ ...currentAdopted, journalState: { schema: 'Wrong' } }),
  /WORKSPACE_IMPORT_JOURNAL_STATE_INVALID/,
);
assert.throws(() => buildSequentialWorkspaceImportPreview({ schema: 'WrongSchema' }, currentModel), /WORKSPACE_IMPORT_PREVIEW_RESTORATION_INVALID/);
assert.throws(() => formatSequentialWorkspaceImportPreview({}), /WORKSPACE_IMPORT_PREVIEW_INVALID/);

console.log('sequential workspace import preview tests passed');
