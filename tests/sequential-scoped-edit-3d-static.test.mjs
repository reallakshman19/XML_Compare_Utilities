import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const gateway = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-gateway.js');
const boundary = source('tabs/sequential-sketcher/scoped-edit/sequential-workspace-command-boundary.js');
const index = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-index.js');
const markup = source('tabs/sequential-sketcher/sequential-sketcher-markup.js');
const tab = source('tabs/sequential-sketcher/sequential-sketcher-tab.js');
const workspace = source('tabs/sequential-sketcher/sequential-sketcher-workspace.js');
const fixture = source('tests/browser/sequential-engineering-svg-preview-fixture.html');
const browserSpec = source('tests/browser/sequential-scoped-edit-3d.spec.mjs');
const workbenchFixture = source('tests/browser/sequential-scoped-edit-3d-workbench-fixture.html');
const workbenchSpec = source('tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs');
const config = source('playwright.sequential-scoped-edit-3d.config.mjs');

for (const [name, value] of [
  ['visual model', visual], ['3D controller', controller],
  ['command gateway', gateway], ['workspace command boundary', boundary],
]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default|module\.exports|exports\./);
}
assert(workspace.split(/\r?\n/).length - 1 <= 486,
  'existing Sequential workspace exception must remain at or below 486 lines');

assert.match(visual, /createVisualGeometryModelV2/);
assert.match(visual, /assertSequentialScopedEditSceneAncestry/);
assert.match(controller, /workbench-viewer\.js/);
assert.match(controller, /setMode\('target-only'\)/);
assert.match(controller, /Read-only; no command issued/);
assert.match(controller, /getSequentialScopedEdit3dController/);
assert.match(controller, /getCommandGatewayState/);
assert.match(controller, /prepareCommand: gateway\.prepare/);
assert.match(controller, /acceptCommand: gateway\.accept/);
assert.match(controller, /executeCommand: gateway\.execute/);
assert.match(controller, /requiredCommandBoundary/);
assert.match(controller, /options\.createViewer/);
assert.match(controller, /failureFactory/);
assert.match(controller, /viewerState/);
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand|data-ssk-command/);

assert.match(gateway, /createSequentialCommandService/);
assert.match(gateway, /SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES/);
assert.match(gateway, /validateSequentialCommandJournalState/);
assert.match(gateway, /deriveSequentialEditAuthority/);
assert.match(gateway, /COMMAND_BRANCH_MISMATCH/);
assert.match(gateway, /COMMAND_RUNTIME_NOT_DETERMINISTIC/);
assert.match(gateway, /COMMAND_AUTHORITY_MISMATCH/);
assert.match(gateway, /function gatewayState\(\)/);
assert.doesNotMatch(gateway, /createSequentialJournalAdoption|createSequentialCommandJournalState/);
assert.doesNotMatch(gateway, /querySelector|addEventListener|onPick|beginDrag|commitDrag/);

assert.match(boundary, /SequentialWorkspaceRestoration\.v2/);
assert.match(boundary, /restorePackage/);
assert.match(boundary, /expectedJournalImpact: 'REPLACE'/);
assert.match(boundary, /preparedEntries/);
assert.match(boundary, /before-commit/);
assert.match(boundary, /synchronizationWarning/);
assert.match(boundary, /SequentialCommandOwnerRevision\.v1/);
assert.match(boundary, /journalHeadFingerprint/);
assert.match(boundary, /sequentialCommandJournalHeadFingerprint/);
assert.match(boundary, /Array\.isArray\(records\)/,
  'uninitialized readiness must not fingerprint non-array source input');
assert.doesNotMatch(boundary, /Object\.assign\(model/,
  'command boundary must use the existing workspace restoration commit boundary');

assert.match(index, /sequential-draft-edit-command-gateway/);
assert.match(index, /sequential-workspace-command-boundary/);
assert.match(markup, /data-ssk-draft-edit-3d/);
assert.match(markup, /data-ssk-draft-edit-3d-host/);
assert.doesNotMatch(markup, /data-ssk-draft-edit-command|data-ssk-command-execute/,
  'SSK-TS-3A must not add visible command controls');
assert.match(tab, /createSequentialWorkspaceCommandBoundary/);
assert.match(tab, /commandBoundary/);
assert.match(tab, /restorePackage: active\.restorePackage/);
assert.match(tab, /scopedEditShadow\?\.observe\(\)/);
assert.match(tab, /createViewer: context\.createSequentialScopedEdit3dViewer/);
assert.match(tab, /failureFactory: context\.sequentialScopedEdit3dFailureFactory/);
assert.match(tab, /onActivate: \(\) => previewController\?\.switchRenderer\('CONSTRUCTION_SVG'\)/);
assert(tab.indexOf('draftEdit3dController?.destroy();') < tab.indexOf('scopedEditShadow?.destroy();'));
assert(tab.indexOf('draftEdit3dController = mountSequentialScopedEdit3dController')
  < tab.indexOf('previewController = mountSequentialEngineeringSvgPreviewController'));

assert.match(fixture, /createSequentialScopedEdit3dViewer/);
assert.match(fixture, /SequentialFakeViewerState\.v1/);
assert.match(fixture, /getSequentialScopedEdit3dController/);
assert.match(browserSpec, /SSK-TS-1B-B01/);
assert.match(browserSpec, /SSK-TS-1B-B10/);
assert.doesNotMatch(browserSpec, /appendEditCommand|commitDrag|beginDrag/);
assert.match(workbenchFixture, /type="importmap"/);
assert.match(workbenchFixture, /three@0\.160\.0/);
assert.match(workbenchFixture, /getSequentialScopedEdit3dController/);
assert.doesNotMatch(workbenchFixture, /createSequentialScopedEdit3dViewer/);
assert.match(workbenchSpec, /SSK-TS-1B-W01/);
assert.match(workbenchSpec, /SSK-TS-1B-W04/);
assert.match(workbenchSpec, /runtimePending/);
assert.match(workbenchSpec, /instanceCount/);
assert.match(config, /sequential-scoped-edit-3d-workbench\.spec\.mjs/);

console.log('Sequential SSK-TS-3A Draft Edit 3D static containment: ok');
