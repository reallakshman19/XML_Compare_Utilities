import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-cad-workspace.js', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-cad-controller.js', import.meta.url), 'utf8');

assert.match(workspace, /pipelineCadCanvas/);
assert.match(workspace, /data-p3d-cad-tool="select"/);
assert.match(workspace, /data-p3d-cad-tool="add-node"/);
assert.match(workspace, /data-p3d-cad-tool="add-marker"/);
assert.match(workspace, /data-p3d-cad-action="reload"/);
assert.match(workspace, /data-p3d-cad-action="undo"/);
assert.match(workspace, /data-p3d-cad-action="redo"/);
assert.match(workspace, /dblclick/);
assert.match(workspace, /new-multisheet/);
assert.match(workspace, /data-p3d-split-add/);
assert.match(controller, /moveTable2ElevationCommand/);
assert.match(controller, /moveTable3MarkerCommand/);
assert.match(controller, /addTable3MarkerCommand/);
assert.match(controller, /preserveSnapshot: true/);
assert.match(controller, /p3d-cad-dirty-row/);

console.log('pipeline-3d-model CAD workspace static tests passed');
