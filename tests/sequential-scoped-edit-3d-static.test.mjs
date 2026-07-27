import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const markup = source('tabs/sequential-sketcher/sequential-sketcher-markup.js');
const tab = source('tabs/sequential-sketcher/sequential-sketcher-tab.js');
const fixture = source('tests/browser/sequential-engineering-svg-preview-fixture.html');
const browserSpec = source('tests/browser/sequential-scoped-edit-3d.spec.mjs');
const workbenchFixture = source('tests/browser/sequential-scoped-edit-3d-workbench-fixture.html');
const workbenchSpec = source('tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs');
const config = source('playwright.sequential-scoped-edit-3d.config.mjs');

for (const [name, value] of [['visual model', visual], ['3D controller', controller]]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default/);
}

assert.match(visual, /createVisualGeometryModelV2/);
assert.match(visual, /assertSequentialScopedEditSceneAncestry/);
assert.match(controller, /workbench-viewer\.js/);
assert.match(controller, /setMode\('target-only'\)/);
assert.match(controller, /Read-only; no command issued/);
assert.match(controller, /getSequentialScopedEdit3dController/);
assert.match(controller, /options\.createViewer/);
assert.match(controller, /failureFactory/);
assert.match(controller, /viewerState/);
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand|publishCandidate/);

assert.match(markup, /data-ssk-draft-edit-3d/);
assert.match(markup, /data-ssk-draft-edit-3d-host/);
assert.match(tab, /mountSequentialScopedEdit3dController/);
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

console.log('Sequential SSK-TS-1B Draft Edit 3D static containment: ok');
