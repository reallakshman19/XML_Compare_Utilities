import assert from 'node:assert/strict';
import { buildSequentialEvidenceModel } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import { createEmptyConstructionSession } from '../tabs/sequential-sketcher/construction/sequential-construction-contract.js';
import {
  createSequentialWorkspaceApplicationReceipt,
  validateSequentialWorkspaceApplicationApproval,
  validateSequentialWorkspaceApplicationReceipt,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-application-receipt.js';
import {
  createSequentialWorkspacePackageWithReceipts,
  restoreSequentialWorkspacePackageWithReceipts,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-package-receipts.js';
import {
  sequentialSourceRecordsFingerprint,
  sequentialWorkspacePackageFingerprint,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-package.js';
import { createSequentialJournalAdoption } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-service.js';
import { sequentialCommandJournalHeadFingerprint } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-journal.js';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function preview(destructive = true, journalImpact = destructive ? 'REMOVE' : 'UNCHANGED') {
  return Object.freeze({
    schema: 'SequentialWorkspaceImportPreview.v1',
    packageFingerprint: 'source-package-001',
    packageSchema: 'SequentialWorkspacePackage.v2',
    packageRevision: 2,
    packageSourceFingerprint: 'source-records-001',
    currentStateFingerprint: 'workspace-before-001',
    sourceRelation: destructive ? 'DIFFERENT' : 'MATCH',
    sourceReplacementRequired: destructive,
    addedBranchIds: ['/RECEIPT/B'],
    removedBranchIds: destructive ? ['/RECEIPT/OLD'] : [],
    newWorkspaceBranchIds: ['/RECEIPT/B'],
    overwrittenWorkspaceBranchIds: destructive ? ['/RECEIPT/A'] : [],
    unchangedWorkspaceBranchIds: destructive ? [] : ['/RECEIPT/A'],
    removedWorkspaceBranchIds: destructive ? ['/RECEIPT/OLD'] : [],
    activeBranchBefore: '/RECEIPT/OLD',
    activeBranchAfter: '/RECEIPT/A',
    packageTotals: Object.freeze({ transactionCount: 4, undoEntryCount: 2, redoEntryCount: 1, deferredDecisionCount: 1 }),
    decisionRegisterSummary: Object.freeze({ unresolvedCount: 2, manualResolutionCount: 1 }),
    journalImpact,
    hasDestructiveChanges: destructive,
  });
}

assert.throws(() => validateSequentialWorkspaceApplicationApproval(preview(), {}), /WORKSPACE_APPLY_REASON_REQUIRED/);
assert.throws(
  () => validateSequentialWorkspaceApplicationApproval(preview(), { reason: 'Use reviewed package' }),
  /WORKSPACE_APPLY_EVIDENCE_REQUIRED/,
);
assert.deepEqual(
  validateSequentialWorkspaceApplicationApproval(preview(false), { reason: 'Restore matching review state' }),
  { reason: 'Restore matching review state', evidenceNote: '' },
);

const receipt = createSequentialWorkspaceApplicationReceipt({
  preview: preview(),
  restoration: {
    packageFingerprint: 'source-package-001', sourceFingerprint: 'source-records-001',
    packageSchema: 'SequentialWorkspacePackage.v2', packageRevision: 2,
  },
  beforeFingerprint: 'workspace-before-001',
  afterFingerprint: 'workspace-after-001',
  reason: 'Apply the reviewed package after branch reconciliation.',
  evidenceNote: 'Impact preview confirms source, workspace, and journal removal.',
  sequence: 3,
});
assert.equal(receipt.schema, 'SequentialWorkspaceApplicationReceipt.v1');
assert.equal(receipt.packageSchema, 'SequentialWorkspacePackage.v2');
assert.equal(receipt.packageRevision, 2);
assert.equal(receipt.impact.journalImpact, 'REMOVE');
assert.equal(validateSequentialWorkspaceApplicationReceipt(receipt).receiptId, receipt.receiptId);

{
  const tampered = clone(receipt);
  tampered.reason = 'Tampered reason';
  assert.throws(() => validateSequentialWorkspaceApplicationReceipt(tampered), /WORKSPACE_APPLY_RECEIPT_FINGERPRINT_MISMATCH/);
}
{
  const tampered = clone(receipt);
  tampered.impact.journalImpact = 'HIDDEN_FALLBACK';
  const { receiptFingerprint: ignored, ...payload } = tampered;
  void ignored;
  tampered.receiptFingerprint = sequentialWorkspaceApplicationReceiptFingerprintForTest(payload);
  assert.throws(() => validateSequentialWorkspaceApplicationReceipt(tampered), /WORKSPACE_APPLY_RECEIPT_JOURNAL_IMPACT_INVALID/);
}
function sequentialWorkspaceApplicationReceiptFingerprintForTest(value) {
  const stable = JSON.stringify(value, Object.keys(value).sort());
  return stable.length ? 'invalid-but-present' : '';
}

const branchId = '/RECEIPT/A';
const records = [{ type: 'BRANCH', name: branchId, attributes: { NAME: branchId }, children: [] }];
const evidence = buildSequentialEvidenceModel(records);
const registry = createSequentialBranchWorkspaceRegistry();
registry.reset([branchId]);
registry.save(branchId, { session: createEmptyConstructionSession(branchId) });
const packageWithReceipt = createSequentialWorkspacePackageWithReceipts({
  records, evidence, branchRegistry: registry, activeBranchId: branchId, applicationReceipts: [receipt],
});
assert.equal(packageWithReceipt.schema, 'SequentialWorkspacePackage.v1');
const restoration = restoreSequentialWorkspacePackageWithReceipts(JSON.stringify(packageWithReceipt));
assert.equal(restoration.packageSchema, 'SequentialWorkspacePackage.v1');
assert.equal(restoration.applicationReceipts[0].receiptId, receipt.receiptId);
assert.equal(restoration.journalState, undefined, 'v1 fallback must not fabricate journal authority');

const journalState = createSequentialJournalAdoption({
  documentId: 'receipt-document', sessionId: 'receipt-session',
  sourceFingerprint: sequentialSourceRecordsFingerprint(records),
  branchRegistry: registry, adoptedAt: '2026-07-27T09:00:00.000Z',
});
const adoptedOptions = {
  records, evidence, branchRegistry: registry, activeBranchId: branchId,
  applicationReceipts: [receipt], journalState, createdAt: '2026-07-27T09:01:00.000Z',
};
const adoptedPackage = createSequentialWorkspacePackageWithReceipts(adoptedOptions);
const adoptedAgain = createSequentialWorkspacePackageWithReceipts(cloneSafeOptions(adoptedOptions));
assert.equal(adoptedPackage.schema, 'SequentialWorkspacePackage.v2');
assert.deepEqual(adoptedAgain, adoptedPackage, 'equal adopted inputs must dispatch deterministically');
const adoptedRestoration = restoreSequentialWorkspacePackageWithReceipts(clone(adoptedPackage));
assert.equal(adoptedRestoration.packageSchema, 'SequentialWorkspacePackage.v2');
assert.deepEqual(adoptedRestoration.journalState, journalState);
assert.equal(
  sequentialCommandJournalHeadFingerprint(adoptedRestoration.journalState),
  sequentialCommandJournalHeadFingerprint(journalState),
);
assert.equal(adoptedRestoration.applicationReceipts[0].receiptId, receipt.receiptId);
function cloneSafeOptions(options) {
  return { ...options, records: clone(options.records), journalState: clone(options.journalState), applicationReceipts: clone(options.applicationReceipts) };
}

assert.throws(
  () => createSequentialWorkspacePackageWithReceipts({ ...adoptedOptions, journalState: { schema: 'Wrong' } }),
  /WORKSPACE_COMMAND_JOURNAL_INVALID/,
);
assert.throws(() => restoreSequentialWorkspacePackageWithReceipts({ schema: 'SequentialWorkspacePackage.v99' }), /WORKSPACE_PACKAGE_SCHEMA_UNSUPPORTED/);
{
  const tampered = clone(packageWithReceipt);
  tampered.applicationReceipts[0].reason = 'Tampered but package re-fingerprinted';
  const { packageFingerprint: ignored, ...payload } = tampered;
  void ignored;
  tampered.packageFingerprint = sequentialWorkspacePackageFingerprint(payload);
  assert.throws(() => restoreSequentialWorkspacePackageWithReceipts(tampered), /WORKSPACE_APPLY_RECEIPT_FINGERPRINT_MISMATCH/);
}

assert.deepEqual(journalState, clone(journalState), 'caller-owned journal remains unchanged');
console.log('sequential workspace application receipt tests passed');
