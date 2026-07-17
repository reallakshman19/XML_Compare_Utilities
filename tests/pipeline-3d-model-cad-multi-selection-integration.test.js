import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executePipelineCadBatchMove } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-batch-controller.js';
import { CommandHistory } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-commands.js';
import { formatDepth, parseDepthText } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-math.js';
import { PipelineProfileModel } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-model.js';
import { _test as precisionRuntimeTest } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-precision-runtime.js';
import { Table2XCanvas } from '../tabs/pipeline-3d-model/pipeline-3d-model-table2x-canvas.js';
import { Table3XCanvas } from '../tabs/pipeline-3d-model/pipeline-3d-model-table3x-canvas.js';

const raw = {
  table2a: `H(coor)\tV(coor)\t[H vs V] Length\tStation Text\tElevation Text
659.791\t—\t—\t0+000.0\t231.32
668.540\t—\t—\t0+006.7\t230.95
680.803\t—\t—\t0+019.0\t230.82
732.683\t—\t—\t0+070.8\t233.00`,
  table3a: `From H(coor)\tTo H(coor)\tText Position X\tHLength Text
661.791\t682.337\t671.704\t20.5
682.337\t716.683\t700.435\t34.3
716.683\t732.683\t723.927\t16.0`,
  table3b: `From H(coor)\tTo H(coor)\tText Position X\tZ Text
—\t—\t665.621\tA/G
682.337\t732.683\t708.374\t1.5M`,
  table3c: `Text Position X\tMarker Text
688.135\tPM-001
700.000\tPM-002`,
};

function controllerFor(model) {
  const history = new CommandHistory();
  let writes = 0;
  return {
    model,
    history,
    get writes() { return writes; },
    execute(command) { history.execute(command); writes += 1; return true; },
  };
}

const table2Model = PipelineProfileModel.fromRaw(raw);
const table2 = new Table2XCanvas(null, { width: 1000, height: 400 });
table2.setModel(table2Model);
const table2Nodes = table2.currentNodes();
table2.setSelection(table2Nodes.slice(0, 2), { primaryId: table2Nodes[0].id, source: 'test' });
assert.equal(table2.getSelectionDetail().count, 2);
assert.equal(table2.selectedId, table2Nodes[0].id);
let table2Batch = null;
table2.addEventListener('batchMoved', (event) => { table2Batch = event.detail; });
const table2Before = table2Nodes.slice(0, 2).map((node) => table2Model.findRow(node.id).elevationValue);
table2.onPrimaryPointerDown({}, table2.worldToScreen(table2Nodes[0]), table2Nodes[0]);
table2.onPrimaryPointerMove({}, table2.worldToScreen(table2Nodes[0]), { ...table2Nodes[0], y: table2Nodes[0].y + 1 });
assert.deepEqual(table2Nodes.slice(0, 2).map((node) => table2Model.findRow(node.id).elevationValue), table2Before, 'group preview must not mutate model');
assert.equal(table2.visualOverrides.size, 2);
table2.onPrimaryPointerUp({}, table2.worldToScreen(table2Nodes[0]), { ...table2Nodes[0], y: table2Nodes[0].y + 1 });
assert.equal(table2Batch.edits.length, 2);
const table2Controller = controllerFor(table2Model);
assert.equal(executePipelineCadBatchMove(table2Controller, table2Batch), true);
assert.equal(table2Controller.history.undoStack.length, 1);
assert.equal(table2Controller.writes, 1);
assert.deepEqual(table2Batch.edits.map((edit) => table2Model.findRow(edit.id).elevationValue), table2Before.map((value) => value + 1));
table2Controller.history.undo();
assert.deepEqual(table2Batch.edits.map((edit) => table2Model.findRow(edit.id).elevationValue), table2Before);

const boxGraph = new Table2XCanvas(null, { width: 1000, height: 400 });
boxGraph.setModel(PipelineProfileModel.fromRaw(raw));
const boxNodes = boxGraph.currentNodes().slice(0, 2);
const screens = boxNodes.map((node) => boxGraph.worldToScreen(node));
boxGraph.beginSelectionBox({ x: Math.min(...screens.map((point) => point.x)) - 10, y: Math.min(...screens.map((point) => point.y)) - 10 }, {});
boxGraph.updateSelectionBox({ x: Math.max(...screens.map((point) => point.x)) + 10, y: Math.max(...screens.map((point) => point.y)) + 10 });
assert.equal(boxGraph.finishSelectionBox().count, 2, 'window selection must select contained nodes');
boxGraph.selectHit({ type: 'elevation-node', node: boxGraph.currentNodes()[2] }, { ctrlKey: true });
assert.equal(boxGraph.getSelectionDetail().count, 3, 'modifier click must toggle into selection');
boxGraph.setSelectionEnabled(false);
boxGraph.setSelection([boxGraph.currentNodes()[0]], { source: 'blocked' });
assert.equal(boxGraph.getSelectionDetail().count, 0, 'review-only selection gate must reject new selection');
boxGraph.setSelectionEnabled(true);

const table3Model = PipelineProfileModel.fromRaw(raw);
const table3 = new Table3XCanvas(null, { width: 1000, height: 400 });
table3.setModel(table3Model);
const depths = table3.depthNodes();
const markers = table3.markerNodes();
table3.setSelection([depths[0], depths[1], markers[0]], { primaryId: depths[0].id, source: 'test' });
let depthBatch = null;
table3.addEventListener('batchMoved', (event) => { if (event.detail.entityType === 'depth-node') depthBatch = event.detail; });
const depthBefore = depths.map((node) => table3Model.findRow(node.id).z);
table3.onPrimaryPointerDown({}, table3.worldToScreen(depths[0]), depths[0]);
table3.onPrimaryPointerMove({}, table3.worldToScreen(depths[0]), { ...depths[0], y: depths[0].y - 0.5 });
assert.equal(table3.depthOverrides.size, 2);
assert.equal(table3.markerOverrides.size, 0, 'mixed selection movement must affect grabbed homogeneous subset only');
assert.deepEqual(depths.map((node) => table3Model.findRow(node.id).z), depthBefore);
table3.onPrimaryPointerUp({}, table3.worldToScreen(depths[0]), { ...depths[0], y: depths[0].y - 0.5 });
assert.equal(depthBatch.edits.length, 2);
const table3Controller = controllerFor(table3Model);
executePipelineCadBatchMove(table3Controller, depthBatch);
assert.equal(table3Controller.history.undoStack.length, 1);
const normalizedDepths = depthBatch.edits.map((edit) => parseDepthText(formatDepth(edit.z))?.z ?? edit.z);
assert.deepEqual(depthBatch.edits.map((edit) => table3Model.findRow(edit.id).z), normalizedDepths);
assert.equal(table3Model.findRow(depthBatch.edits[0].id).zText, 'A/G');

let closes = 0;
let opens = 0;
const precisionState = {
  disabled: false,
  sessions: { close() { closes += 1; }, begin(identity) { return { identity, before: {} }; } },
  view: { close() { closes += 1; }, open() { opens += 1; }, status() {} },
};
precisionRuntimeTest.handleSelection(precisionState, { graph: 'table3x', count: 2, entityId: depths[0].id, entityType: 'depth-node' });
assert.equal(opens, 0);
assert.equal(closes, 2, 'multi-selection must close precision session and view');
precisionRuntimeTest.handleSelection(precisionState, { graph: 'table3x', count: 1, entityId: depths[0].id, entityType: 'depth-node' });
assert.equal(opens, 1);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'tabs/pipeline-3d-model');
const guarded = [
  'pipeline-3d-model-cad-selection-contracts.js',
  'pipeline-3d-model-cad-selection-runtime.js',
  'pipeline-3d-model-cad-batch-commands.js',
  'pipeline-3d-model-cad-batch-controller.js',
  'pipeline-3d-model-cad-batch-view.js',
  'pipeline-3d-model-cad-authoring.js',
  'pipeline-3d-model-cad-precision-runtime.js',
  'pipeline-3d-model-cad-workspace.js',
  'pipeline-3d-model-table2x-canvas.js',
  'pipeline-3d-model-table3x-canvas.js',
];
for (const name of guarded) {
  const source = fs.readFileSync(path.join(DIR, name), 'utf8');
  assert.ok(source.split(/\r?\n/).length < 300, `${name} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default\b|MutationObserver|observe\s*\(\s*(?:document|doc)\.body/);
}
for (const name of guarded.slice(0, 5)) {
  const source = fs.readFileSync(path.join(DIR, name), 'utf8');
  assert.doesNotMatch(source, /core\/workbench-viewport|cad-object-snap|canvas-(?:contracts|runtime)|xml-compare/);
}
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.match(packageJson.scripts['test:pipeline-cad-multi-selection'], /selection-contracts/);
assert.match(packageJson.scripts['test:static'], /test:pipeline-cad-multi-selection/);
const canvasContracts = fs.readFileSync(path.join(DIR, 'pipeline-3d-model-canvas-contracts.js'), 'utf8');
assert.match(canvasContracts, /PipelineCanvasNodeMoved\.v1/);
assert.match(canvasContracts, /PipelineCanvasGeometryUpdated\.v1/);
const workspaceSource = fs.readFileSync(path.join(DIR, 'pipeline-3d-model-cad-workspace.js'), 'utf8');
assert.match(workspaceSource, /setSelectionMode\(graphs, mode\)/);
const browserSpec = fs.readFileSync(path.join(ROOT, 'tests/browser/pipeline-cad-multi-selection.spec.mjs'), 'utf8');
const browserFixture = fs.readFileSync(path.join(ROOT, 'tests/browser/pipeline-cad-multi-selection-fixture.html'), 'utf8');
const browserConfig = fs.readFileSync(path.join(ROOT, 'playwright.pipeline-cad.config.mjs'), 'utf8');
for (let index = 1; index <= 16; index += 1) {
  assert.match(browserSpec, new RegExp(`PCAD-MS-B${String(index).padStart(2, '0')}`));
}
assert.match(browserFixture, /__pcadMulti/);
assert.match(browserFixture, /mountPipelineCadWorkspace/);
assert.match(browserConfig, /pipeline-cad-multi-selection\.spec\.mjs/);

console.log('Pipeline CAD multi-selection integration and source-guard tests passed');
