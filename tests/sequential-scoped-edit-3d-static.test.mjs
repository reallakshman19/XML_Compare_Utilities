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

for (const [name, value] of [['visual model', visual], ['3D controller', controller]]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default/);
}

assert.match(visual, /createVisualGeometryModelV2/);
assert.match(visual, /assertSequentialScopedEditSceneAncestry/);
assert.match(controller, /workbench-viewer\.js/);
assert.match(controller, /setMode\('target-only'\)/);
assert.match(controller, /Read-only; no command issued/);
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand|publishCandidate/);

assert.match(markup, /data-ssk-draft-edit-3d/);
assert.match(markup, /data-ssk-draft-edit-3d-host/);
assert.match(tab, /mountSequentialScopedEdit3dController/);
assert.match(tab, /onActivate: \(\) => previewController\?\.switchRenderer\('CONSTRUCTION_SVG'\)/);
assert(tab.indexOf('draftEdit3dController?.destroy();') < tab.indexOf('scopedEditShadow?.destroy();'));
assert(tab.indexOf('draftEdit3dController = mountSequentialScopedEdit3dController')
  < tab.indexOf('previewController = mountSequentialEngineeringSvgPreviewController'));

console.log('Sequential SSK-TS-1B Draft Edit 3D static containment: ok');
