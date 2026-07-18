import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const packageSource = read('tabs/sequential-sketcher/persistence/sequential-workspace-package.js');
assert.match(packageSource, /SequentialWorkspacePackage\.v1/);
assert.match(packageSource, /SequentialWorkspaceRestoration\.v1/);
assert.match(packageSource, /sequentialSourceRecordsFingerprint/);
assert.match(packageSource, /sequentialWorkspacePackageFingerprint/);
assert.match(packageSource, /externalBoundaryPolicyFingerprint/);
assert.match(packageSource, /tolerancePolicyFingerprint/);
assert.match(packageSource, /sessionFingerprint/);
assert.match(packageSource, /WORKSPACE_HISTORY_BEFORE_FINGERPRINT_MISMATCH/);
assert.match(packageSource, /WORKSPACE_HISTORY_AFTER_FINGERPRINT_MISMATCH/);
assert.match(packageSource, /buildSequentialEvidenceModel/);
assert.match(packageSource, /indexSequentialEvidence/);
assert.match(packageSource, /buildSequentialDecisionRegister/);
assert.doesNotMatch(packageSource, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS|acceptAll|bulkAccept/i,
  'workspace package code must validate and hydrate state without executing construction decisions');
assert.doesNotMatch(packageSource, /sj-pipe-support|buildPipeSupportProjectionBundle/);

const controller = read('tabs/sequential-sketcher/persistence/sequential-workspace-persistence-controller.js');
assert.match(controller, /mountSequentialWorkspacePersistenceController/);
assert.match(controller, /serializeSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /restoreSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /workspace\?\.saveActiveBranch/);
assert.match(controller, /workspace\?\.restorePackage/);
assert.match(controller, /data-ssk-workspace-export/);
assert.match(controller, /data-ssk-workspace-import/);
assert.match(controller, /data-ssk-workspace-apply/);
assert.match(controller, /data-ssk-workspace-cancel/);
assert.doesNotMatch(controller, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS/,
  'persistence controller must not mutate construction topology');

const registry = read('tabs/sequential-sketcher/sequential-branch-workspace-state.js');
assert.match(registry, /function replace\(ids = \[\], entries = \[\]\)/);
assert.match(registry, /const nextSnapshots = new Map\(\)/);
assert.match(registry, /snapshots\.clear\(\)/);
assert.match(registry, /replace,/);

const markup = read('tabs/sequential-sketcher/sequential-sketcher-markup.js');
for (const selector of [
  'data-ssk-workspace-export',
  'data-ssk-workspace-import',
  'data-ssk-workspace-apply',
  'data-ssk-workspace-cancel',
  'data-ssk-workspace-package-summary',
]) assert.match(markup, new RegExp(selector));
assert.match(markup, /creates a non-mutating preview/);
assert.match(markup, /Every successful apply creates a fingerprinted receipt/);

const workspace = read('tabs/sequential-sketcher/sequential-sketcher-workspace.js');
assert.match(workspace, /function restorePackage\(restoration\)/);
assert.match(workspace, /SequentialWorkspaceRestoration\.v1/);
assert.match(workspace, /model\.branchRegistry\.replace\(restoration\.branchIds, restoration\.workspaces\)/);
assert.match(workspace, /reviewController\?\.reset\(\)/);
assert.match(workspace, /restoredDecisionRegister/);
assert.match(workspace, /refreshDownstream\(\)/);
assert.match(workspace, /saveActiveBranch,/);
assert.match(workspace, /restorePackage,/);

const css = read('tabs/sequential-sketcher/sequential-sketcher.css');
assert.match(css, /\.ssk-workspace-package/);
assert.match(css, /\.ssk-workspace-package-actions/);
assert.match(css, /\.ssk-workspace-package-summary/);

const tab = read('tabs/sequential-sketcher/sequential-sketcher-tab.js');
assert.match(tab, /mountSequentialWorkspacePersistenceController/);
assert.match(tab, /persistenceController\?\.destroy\(\)/);
assert.match(tab, /20260717-ssk-workspace-apply-receipts-1/);

const utility = read('tabs/psnm-utility-tab.js');
assert.match(utility, /20260717-ssk-continuity-geometry-1/);

console.log('sequential workspace persistence UI tests passed');
