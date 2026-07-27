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
assert.doesNotMatch(packageSource, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS|acceptAll|bulkAccept/i);

const wrapper = read('tabs/sequential-sketcher/persistence/sequential-workspace-package-receipts.js');
assert.match(wrapper, /createSequentialWorkspacePackageV2/);
assert.match(wrapper, /restoreSequentialWorkspacePackageV2/);
assert.match(wrapper, /validateSequentialCommandJournalState/);
assert.match(wrapper, /WORKSPACE_COMMAND_JOURNAL_INVALID/);
assert.match(wrapper, /WORKSPACE_PACKAGE_SCHEMA_UNSUPPORTED/);
assert.doesNotMatch(wrapper, /createSequentialJournalAdoption|createSequentialCommandJournalState/);

const preview = read('tabs/sequential-sketcher/persistence/sequential-workspace-import-preview.js');
for (const value of ['ABSENT', 'INSTALL', 'UNCHANGED', 'REPLACE', 'REMOVE']) assert.match(preview, new RegExp(value));
assert.match(preview, /journalHeadFingerprint/);
assert.match(preview, /adoptionCheckpointId/);
assert.match(preview, /WORKSPACE_IMPORT_JOURNAL_STATE_INVALID/);

const controller = read('tabs/sequential-sketcher/persistence/sequential-workspace-persistence-controller.js');
assert.match(controller, /mountSequentialWorkspacePersistenceController/);
assert.match(controller, /serializeSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /restoreSequentialWorkspacePackageWithReceipts/);
assert.match(controller, /journalState: model\.journalState/);
assert.match(controller, /expectedJournalImpact: preview\.journalImpact/);
assert.match(controller, /sequentialWorkspaceRestorationStateFingerprint/);
assert.match(controller, /WORKSPACE_IMPORT_PREVIEW_STALE/);
assert.match(controller, /data-ssk-workspace-export/);
assert.match(controller, /data-ssk-workspace-import/);
assert.match(controller, /data-ssk-workspace-apply/);
assert.match(controller, /data-ssk-workspace-cancel/);
assert.doesNotMatch(controller, /applyConstructionDecision|advanceConstruction|runConstructionUntilBlocked|DECISION_ACTIONS/);

const workspace = read('tabs/sequential-sketcher/sequential-sketcher-workspace.js');
assert.match(workspace, /function restorePackage\(restoration, options = \{\}\)/);
assert.match(workspace, /SequentialWorkspaceRestoration\.v2/);
assert.match(workspace, /WORKSPACE_RESTORE_JOURNAL_IMPACT_MISMATCH/);
assert.match(workspace, /WORKSPACE_RESTORE_JOURNAL_DOWNGRADE_UNAPPROVED/);
assert.match(workspace, /const registry = preparedRegistry\(restoration\)/);
assert.ok(workspace.indexOf('const registry = preparedRegistry(restoration)') < workspace.indexOf('model.records = restoration.records'));
assert.match(workspace, /model\.journalState = restoration\.journalState \|\| null/);
assert.match(workspace, /model\.workspaceApplicationReceipts = receipts/);
assert.doesNotMatch(workspace, /createSequentialJournalAdoption|createSequentialCommandJournalState/);
assert.equal(workspace.split('\n').length - 1, 464, 'approved workspace baseline exception must remain within +40 lines');

for (const path of [
  'tabs/sequential-sketcher/persistence/sequential-workspace-package-receipts.js',
  'tabs/sequential-sketcher/persistence/sequential-workspace-import-preview.js',
  'tabs/sequential-sketcher/persistence/sequential-workspace-application-receipt.js',
  'tabs/sequential-sketcher/persistence/sequential-workspace-persistence-controller.js',
]) {
  const source = read(path);
  assert.ok(source.split('\n').length - 1 < 300, `${path} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default|module\.exports|exports\./);
}

const registry = read('tabs/sequential-sketcher/sequential-branch-workspace-state.js');
assert.match(registry, /function replace\(ids = \[\], entries = \[\]\)/);
assert.match(registry, /const nextSnapshots = new Map\(\)/);
assert.match(registry, /snapshots\.clear\(\)/);

const markup = read('tabs/sequential-sketcher/sequential-sketcher-markup.js');
for (const selector of [
  'data-ssk-workspace-export', 'data-ssk-workspace-import', 'data-ssk-workspace-apply',
  'data-ssk-workspace-cancel', 'data-ssk-workspace-package-summary',
]) assert.match(markup, new RegExp(selector));

console.log('sequential workspace persistence UI tests passed');
