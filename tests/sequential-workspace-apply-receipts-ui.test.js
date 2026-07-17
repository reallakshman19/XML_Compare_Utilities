import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const receipt = read('tabs/sequential-sketcher/persistence/sequential-workspace-application-receipt.js');
assert.match(receipt, /SequentialWorkspaceApplicationReceipt\.v1/);
assert.match(receipt, /validateSequentialWorkspaceApplicationApproval/);
assert.match(receipt, /WORKSPACE_APPLY_REASON_REQUIRED/);
assert.match(receipt, /WORKSPACE_APPLY_EVIDENCE_REQUIRED/);
assert.match(receipt, /beforeWorkspaceFingerprint/);
assert.match(receipt, /afterWorkspaceFingerprint/);
assert.match(receipt, /receiptFingerprint/);
assert.match(receipt, /externalBoundaryPolicyFingerprint/);
assert.match(receipt, /tolerancePolicyFingerprint/);
assert.doesNotMatch(receipt, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS/);

const wrapper = read('tabs/sequential-sketcher/persistence/sequential-workspace-package-receipts.js');
assert.match(wrapper, /createSequentialWorkspacePackageWithReceipts/);
assert.match(wrapper, /restoreSequentialWorkspacePackageWithReceipts/);
assert.match(wrapper, /applicationReceipts/);
assert.match(wrapper, /validateSequentialWorkspaceApplicationReceipt/);
assert.match(wrapper, /sequentialWorkspacePackageFingerprint/);

const controller = read('tabs/sequential-sketcher/persistence/sequential-workspace-persistence-controller.js');
assert.match(controller, /serializeSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /restoreSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /createSequentialWorkspaceApplicationReceipt/);
assert.match(controller, /validateSequentialWorkspaceApplicationApproval/);
assert.match(controller, /data-ssk-workspace-apply-reason/);
assert.match(controller, /data-ssk-workspace-apply-evidence/);
assert.match(controller, /data-ssk-workspace-receipt-export/);
assert.match(controller, /workspace\.getModel\(\)\.workspaceApplicationReceipts = receipts/);
assert.match(controller, /sequence: restoration\.applicationReceipts\.length \+ 1/);
assert.match(controller, /getLastReceipt/);
assert.match(controller, /exportLastReceipt/);
const restoreIndex = controller.indexOf('workspace?.restorePackage?.(restoration)');
const receiptIndex = controller.indexOf('const receipt = createSequentialWorkspaceApplicationReceipt');
assert.ok(restoreIndex >= 0 && receiptIndex >= 0 && restoreIndex < receiptIndex,
  'receipt must be recorded only after atomic restoration succeeds');
assert.doesNotMatch(controller, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS/);

const markup = read('tabs/sequential-sketcher/sequential-sketcher-markup.js');
for (const selector of [
  'data-ssk-workspace-apply-reason',
  'data-ssk-workspace-apply-evidence',
  'data-ssk-workspace-receipt-export',
]) assert.match(markup, new RegExp(selector));
assert.match(markup, /Every successful apply creates a fingerprinted receipt/);
assert.match(markup, /destructive changes also require an evidence note/);

const tab = read('tabs/sequential-sketcher/sequential-sketcher-tab.js');
const utility = read('tabs/psnm-utility-tab.js');
assert.match(tab, /20260717-ssk-workspace-apply-receipts-1/);
assert.match(utility, /20260717-ssk-workspace-apply-receipts-1/);

console.log('sequential workspace application receipt UI tests passed');
