import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommandHistory } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-commands.js';
import { createPipelineCadBatchController } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-batch-controller.js';
import { installPipelineCadSelectionRuntime } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-selection-runtime.js';

class Model {
  constructor() {
    this.table2Rows = [
      { id: 'T2-1', sourceTable: 'table2a', stationValue: 0, basisH: 0, elevationValue: 10 },
      { id: 'T2-2', sourceTable: 'table2a', stationValue: 10, basisH: 10, elevationValue: 11 },
      { id: 'T2-3', sourceTable: 'table2a', stationValue: 20, basisH: 20, elevationValue: 12 },
      { id: 'T2-4', sourceTable: 'table2a', stationValue: 30, basisH: 30, elevationValue: 13 },
    ];
    this.table3DepthRows = [{ id: 'D-1', sourceTable: 'table3b', z: -1.5 }];
    this.table3MarkerRows = [{ id: 'M-1', sourceTable: 'table3c', absoluteH: 5 }, { id: 'M-2', sourceTable: 'table3c', absoluteH: 15 }];
    this.revision = 0;
  }
  snapshot() { return structuredClone({ table2Rows: this.table2Rows, table3DepthRows: this.table3DepthRows, table3MarkerRows: this.table3MarkerRows, revision: this.revision }); }
  restore(value) { Object.assign(this, structuredClone(value)); }
  findRow(id) { return [...this.table2Rows, ...this.table3DepthRows, ...this.table3MarkerRows].find((row) => row.id === id) || null; }
  moveTable2Elevation(id, value) { this.findRow(id).elevationValue = value; this.revision += 1; }
  moveMarker(id, value) { this.findRow(id).absoluteH = value; this.revision += 1; }
  deleteRow(id) {
    for (const name of ['table2Rows', 'table3DepthRows', 'table3MarkerRows']) {
      const index = this[name].findIndex((row) => row.id === id);
      if (index >= 0) { this[name].splice(index, 1); this.revision += 1; return; }
    }
    throw new Error(`Unknown ${id}`);
  }
}

class Graph extends EventTarget {
  constructor(name, nodes) {
    super(); this.name = name; this.nodes = nodes; this.hitRadius = 2;
    this.preview = new Map(); this.clearCount = 0; this.renderCount = 0;
    installPipelineCadSelectionRuntime(this, name);
  }
  getPipelineCadEditableNodes() { return this.nodes; }
  worldToScreen(value) { return { x: value.x || 0, y: value.y || 0 }; }
  dispatchGraphEvent(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  render() { this.renderCount += 1; }
  clearBatchPreview() { this.preview.clear(); this.clearCount += 1; }
}

const model = new Model();
const history = new CommandHistory();
const graphs = {
  table2x: new Graph('table2x', model.table2Rows.map((row) => ({ id: row.id, type: 'elevation-node' }))),
  table3x: new Graph('table3x', [
    ...model.table3MarkerRows.map((row) => ({ id: row.id, type: 'marker' })),
    ...model.table3DepthRows.map((row) => ({ id: row.id, type: 'depth-node' })),
  ]),
};
class Controller extends EventTarget {
  constructor() { super(); this.model = model; this.executes = 0; this.rawWrites = 0; this.refreshCycles = 0; }
  execute(command) { history.execute(command); this.executes += 1; this.rawWrites += 1; this.refreshCycles += 1; return true; }
}
const controller = new Controller();
const batch = createPipelineCadBatchController({ controller, graphs });
const commits = []; const rejects = [];
controller.addEventListener('batchCommandCommitted', (event) => commits.push(event.detail));
controller.addEventListener('batchCommandRejected', (event) => rejects.push(event.detail));

const beforePreview = model.snapshot();
graphs.table2x.preview.set('T2-2', 20);
assert.deepEqual(model.snapshot(), beforePreview, 'preview must not mutate model');
graphs.table2x.dispatchGraphEvent('batchMoveRequested', {
  graph: 'table2x', entityType: 'elevation-node',
  changes: [{ id: 'T2-2', elevationValue: 20 }, { id: 'T2-3', elevationValue: 21 }], skippedIds: [],
});
assert.equal(controller.executes, 1);
assert.equal(controller.rawWrites, 1);
assert.equal(controller.refreshCycles, 1);
assert.equal(history.undoStack.length, 1);
assert.deepEqual(model.table2Rows.map((row) => row.elevationValue), [10, 20, 21, 13]);
history.undo();
assert.deepEqual(model.table2Rows.map((row) => row.elevationValue), [10, 11, 12, 13]);
history.redo();
assert.deepEqual(model.table2Rows.map((row) => row.elevationValue), [10, 20, 21, 13]);

const markerResult = batch.commitMove({
  graph: 'table3x', entityType: 'marker',
  changes: [{ id: 'M-1', absoluteH: 25 }, { id: 'M-2', absoluteH: 20 }],
  skippedIds: ['D-1'],
});
assert.equal(markerResult.committed, true);
assert.deepEqual(markerResult.skippedIds, ['D-1']);
assert.equal(markerResult.operation, 'TABLE3_MARKER_EVIDENCE_POSITION');
assert.equal(model.findRow('D-1').z, -1.5);

const executeCount = controller.executes;
const depthResult = batch.commitMove({ graph: 'table3x', entityType: 'depth-node', changes: [{ id: 'D-1', z: -2 }] });
assert.equal(depthResult.committed, false);
assert.match(depthResult.reason, /not permitted/);
assert.equal(controller.executes, executeCount, 'unsupported grouped depth creates zero commands');
assert.equal(model.findRow('D-1').z, -1.5);

const selection = graphs.table3x.setPipelineCadSelection([
  { graph: 'table3x', entityId: 'M-1', entityType: 'marker' },
  { graph: 'table3x', entityId: 'D-1', entityType: 'depth-node' },
]);
const deleteBefore = model.snapshot();
const deleteResult = batch.deleteSelection(selection);
assert.equal(deleteResult.committed, true);
assert.equal(controller.executes, executeCount + 1, 'one batch delete creates one command');
assert.equal(model.findRow('M-1'), null);
assert.equal(model.findRow('D-1'), null);
history.undo();
assert.deepEqual(model.snapshot(), deleteBefore);
history.redo();
assert.equal(model.findRow('M-1'), null);
assert.equal(model.findRow('D-1'), null);

assert.equal(batch.deleteSelection(graphs.table3x.selection).committed, false, 'cleared selection creates zero command');
assert.equal(commits.length, 3);
assert.equal(rejects.length, 2);
assert.equal(batch.destroy(), true);
assert.equal(batch.destroy(), false);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const protectedTokens = /pipeline-engineering-svg|core\/engineering-svg|core\/engineering-scene|core\/workbench-viewport|object-snap-(?:engine|runtime)|canvas-contracts/;
for (const name of [
  'pipeline-3d-model-cad-selection-contracts.js', 'pipeline-3d-model-cad-selection-runtime.js',
  'pipeline-3d-model-cad-batch-commands.js', 'pipeline-3d-model-cad-batch-controller.js', 'pipeline-3d-model-cad-batch-view.js',
]) {
  const source = readFileSync(join(root, 'tabs/pipeline-3d-model', name), 'utf8');
  assert.ok(source.split(/\r?\n/).length < 300, `${name} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default\b/);
  assert.doesNotMatch(source, protectedTokens);
  assert.doesNotMatch(source, /MutationObserver|localStorage|setTimeout|setInterval/);
}

console.log('Pipeline CAD multi-selection batch integration passed');
