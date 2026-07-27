import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const receipt = read('tabs/sequential-sketcher/persistence/sequential-workspace-application-receipt.js');
assert.match(receipt, /SequentialWorkspaceApplicationReceipt\.v1/);
assert.match(receipt, /validateSequentialWorkspaceApplicationApproval/);
assert.match(receipt, /WORKSPACE_APPLY_REASON_REQUIRED/);
assert.match(receipt, /WORKSPACE_APPLY_EVIDENCE_REQUIRED/);
assert.match(receipt, /packageSchema/);
assert.match(receipt, /packageRevision/);
assert.match(receipt, /journalImpact/);
assert.match(receipt, /WORKSPACE_APPLY_RECEIPT_PACKAGE_IDENTITY_INVALID/);
assert.match(receipt, /WORKSPACE_APPLY_RECEIPT_JOURNAL_IMPACT_INVALID/);
assert.match(receipt, /beforeWorkspaceFingerprint/);
assert.match(receipt, /afterWorkspaceFingerprint/);
assert.match(receipt, /receiptFingerprint/);
assert.doesNotMatch(receipt, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS/);

const wrapper = read('tabs/sequential-sketcher/persistence/sequential-workspace-package-receipts.js');
assert.match(wrapper, /createSequentialWorkspacePackageWithReceipts/);
assert.match(wrapper, /restoreSequentialWorkspacePackageWithReceipts/);
assert.match(wrapper, /applicationReceipts/);
assert.match(wrapper, /validateSequentialWorkspaceApplicationReceipt/);
assert.match(wrapper, /createSequentialWorkspacePackageV2/);
assert.match(wrapper, /restoreSequentialWorkspacePackageV2/);
assert.doesNotMatch(wrapper, /createSequentialJournalAdoption|createSequentialCommandJournalState/);

const controller = read('tabs/sequential-sketcher/persistence/sequential-workspace-persistence-controller.js');
assert.match(controller, /serializeSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /restoreSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /createSequentialWorkspaceApplicationReceipt/);
assert.match(controller, /validateSequentialWorkspaceApplicationApproval/);
assert.match(controller, /journal impact \$\{preview\.journalImpact\}/);
assert.match(controller, /data-ssk-workspace-apply-reason/);
assert.match(controller, /data-ssk-workspace-apply-evidence/);
assert.match(controller, /data-ssk-workspace-receipt-export/);
assert.match(controller, /applicationReceipts: receipts/);
assert.match(controller, /sequence: restoration\.applicationReceipts\.length \+ 1/);
assert.match(controller, /getLastReceipt/);
assert.match(controller, /exportLastReceipt/);
const receiptIndex = controller.indexOf('const receipt = preparedReceipt');
const restoreIndex = controller.indexOf('workspace?.restorePackage?.(restoration');
const lastReceiptIndex = controller.indexOf('lastReceipt = receipt');
assert.ok(receiptIndex >= 0 && restoreIndex > receiptIndex && lastReceiptIndex > restoreIndex,
  'receipt and success state must update only after restoration succeeds');
assert.doesNotMatch(controller, /workspace\.getModel\(\)\.workspaceApplicationReceipts\s*=/,
  'controller must not mutate receipt state outside the atomic workspace boundary');
assert.doesNotMatch(controller, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS/);

const workspace = read('tabs/sequential-sketcher/sequential-sketcher-workspace.js');
const prepareIndex = workspace.indexOf('const registry = preparedRegistry(restoration)');
const commitIndex = workspace.indexOf('model.records = restoration.records');
assert.ok(prepareIndex >= 0 && commitIndex > prepareIndex,
  'fresh registry validation must complete before live workspace mutation');
assert.match(workspace, /model\.workspaceApplicationReceipts = receipts/);
assert.match(workspace, /model\.journalState = restoration\.journalState \|\| null/);
assert.match(workspace, /expected === 'UNCHANGED'/);
assert.match(workspace, /expected !== 'REMOVE'/);

console.log('sequential workspace application receipt UI tests passed');
