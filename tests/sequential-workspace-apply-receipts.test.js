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
import { sequentialWorkspacePackageFingerprint } from '../tabs/sequential-sketcher/persistence/sequential-workspace-package.js';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function preview(destructive = true) {
  return Object.freeze({
    schema: 'SequentialWorkspaceImportPreview.v1',
    packageFingerprint: 'source-package-001',
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
    hasDestructiveChanges: destructive,
  });
}

assert.throws(
  () => validateSequentialWorkspaceApplicationApproval(preview(), {}),
  /WORKSPACE_APPLY_REASON_REQUIRED/,
);
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
  restoration: { packageFingerprint: 'source-package-001', sourceFingerprint: 'source-records-001' },
  beforeFingerprint: 'workspace-before-001',
  afterFingerprint: 'workspace-after-001',
  reason: 'Apply the reviewed package after branch reconciliation.',
  evidenceNote: 'Impact preview confirms one source replacement, one workspace overwrite and one removal.',
  sequence: 3,
});
assert.equal(receipt.schema, 'SequentialWorkspaceApplicationReceipt.v1');
assert.equal(receipt.status, 'APPLIED');
assert.equal(receipt.actorProvenance, 'USER_MANUAL');
assert.equal(receipt.sequence, 3);
assert.match(receipt.receiptId, /^WS-APPLY-00003-/u);
assert.equal(receipt.packageFingerprint, 'source-package-001');
assert.equal(receipt.beforeWorkspaceFingerprint, 'workspace-before-001');
assert.equal(receipt.afterWorkspaceFingerprint, 'workspace-after-001');
assert.equal(receipt.impact.hasDestructiveChanges, true);
assert.ok(receipt.receiptFingerprint);
assert.equal(validateSequentialWorkspaceApplicationReceipt(receipt).receiptId, receipt.receiptId);

{
  const tampered = clone(receipt);
  tampered.reason = 'Tampered reason';
  assert.throws(
    () => validateSequentialWorkspaceApplicationReceipt(tampered),
    /WORKSPACE_APPLY_RECEIPT_FINGERPRINT_MISMATCH/,
  );
}
{
  const tampered = clone(receipt);
  tampered.evidenceNote = '';
  assert.throws(
    () => validateSequentialWorkspaceApplicationReceipt(tampered),
    /WORKSPACE_APPLY_RECEIPT_DESTRUCTIVE_EVIDENCE_MISSING/,
  );
}

const branchId = '/RECEIPT/A';
const records = [{ type: 'BRANCH', name: branchId, attributes: { NAME: branchId }, children: [] }];
const evidence = buildSequentialEvidenceModel(records);
const registry = createSequentialBranchWorkspaceRegistry();
registry.reset([branchId]);
registry.save(branchId, { session: createEmptyConstructionSession(branchId) });
const packageWithReceipt = createSequentialWorkspacePackageWithReceipts({
  records,
  evidence,
  branchRegistry: registry,
  activeBranchId: branchId,
  applicationReceipts: [receipt],
});
assert.equal(packageWithReceipt.applicationReceipts.length, 1);
const restoration = restoreSequentialWorkspacePackageWithReceipts(JSON.stringify(packageWithReceipt));
assert.equal(restoration.applicationReceipts.length, 1);
assert.equal(restoration.applicationReceipts[0].receiptId, receipt.receiptId);

{
  const tampered = clone(packageWithReceipt);
  tampered.applicationReceipts[0].reason = 'Tampered but package re-fingerprinted';
  const { packageFingerprint: ignored, ...payload } = tampered;
  void ignored;
  tampered.packageFingerprint = sequentialWorkspacePackageFingerprint(payload);
  assert.throws(
    () => restoreSequentialWorkspacePackageWithReceipts(tampered),
    /WORKSPACE_APPLY_RECEIPT_FINGERPRINT_MISMATCH/,
  );
}

console.log('sequential workspace application receipt tests passed');
