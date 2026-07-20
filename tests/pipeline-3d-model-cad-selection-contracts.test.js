import assert from 'node:assert/strict';
import {
  createPipelineCadSelection,
  createPipelineCadSelectionBox,
  emptyPipelineCadSelection,
  pipelineCadSelectionBoxBounds,
  replacePipelineCadSelection,
  togglePipelineCadSelection,
  updatePipelineCadSelectionBox,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-selection-contracts.js';
import { installPipelineCadSelectionRuntime } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-selection-runtime.js';

const a = { graph: 'table2x', entityId: 'A', entityType: 'elevation-node' };
const b = { graph: 'table2x', entityId: 'B', entityType: 'elevation-node' };
let selection = emptyPipelineCadSelection('table2x');
selection = replacePipelineCadSelection(selection, a);
assert.deepEqual(selection.selectedIds, ['A']);
assert.equal(selection.primaryId, 'A');
selection = togglePipelineCadSelection(selection, b);
assert.deepEqual(selection.selectedIds, ['A', 'B']);
assert.equal(selection.primaryId, 'B');
selection = togglePipelineCadSelection(selection, b);
assert.deepEqual(selection.selectedIds, ['A']);
assert.equal(selection.primaryId, 'A');
assert.throws(() => createPipelineCadSelection({ graph: 'table2x', items: [{ ...a, graph: 'table3x' }] }), /cannot span graphs/);
assert(Object.isFrozen(selection));
assert(Object.isFrozen(selection.items));

let box = createPipelineCadSelectionBox({ graph: 'table2x', start: { x: 10, y: 10 }, current: { x: 50, y: 50 } });
assert.equal(box.mode, 'window');
assert.deepEqual(pipelineCadSelectionBoxBounds(box), { left: 10, right: 50, top: 10, bottom: 50 });
box = updatePipelineCadSelectionBox(box, { x: -10, y: 60 });
assert.equal(box.mode, 'crossing');
assert.deepEqual(pipelineCadSelectionBoxBounds(box), { left: -10, right: 10, top: 10, bottom: 60 });

class Graph extends EventTarget {
  constructor() {
    super();
    this.hitRadius = 2;
    this.nodes = [
      { id: 'A', type: 'elevation-node', x: 10, y: 10 },
      { id: 'B', type: 'elevation-node', x: 30, y: 30 },
      { id: 'C', type: 'elevation-node', x: 52, y: 30 },
    ];
    this.renderCount = 0;
  }
  worldToScreen(value) { return { x: value.x, y: value.y }; }
  render() { this.renderCount += 1; }
  dispatchGraphEvent(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  getPipelineCadEditableNodes() { return this.nodes; }
}
const graph = new Graph();
installPipelineCadSelectionRuntime(graph, 'table2x');
const events = [];
graph.addEventListener('selectionChanged', (event) => events.push(event.detail));
graph.selectPipelineCadHit({ type: a.entityType, node: { id: 'A' } }, {});
graph.selectPipelineCadHit({ type: b.entityType, node: { id: 'B' } }, { shiftKey: true });
assert.deepEqual(graph.selection.selectedIds, ['A', 'B']);
assert.equal(graph.selection.primaryId, 'B');
graph.selectAllPipelineCad();
assert.deepEqual(graph.selection.selectedIds, ['A', 'B', 'C']);
graph.beginPipelineCadSelectionBox({ x: 0, y: 0 });
graph.updatePipelineCadSelectionBox({ x: 40, y: 40 });
graph.commitPipelineCadSelectionBox({});
assert.deepEqual(graph.selection.selectedIds, ['A', 'B'], 'window requires full aperture containment');
graph.beginPipelineCadSelectionBox({ x: 51, y: 40 });
graph.updatePipelineCadSelectionBox({ x: 31, y: 20 });
graph.commitPipelineCadSelectionBox({});
assert.deepEqual(graph.selection.selectedIds, ['B', 'C'], 'crossing accepts aperture intersection');
graph.beginPipelineCadSelectionBox({ x: 0, y: 0 });
graph.updatePipelineCadSelectionBox({ x: 15, y: 15 });
graph.commitPipelineCadSelectionBox({ ctrlKey: true });
assert.deepEqual(graph.selection.selectedIds, ['B', 'C', 'A'], 'modifier box toggles candidates');
graph.setPipelineCadSelectionEnabled(false);
assert.equal(graph.selection.count, 0);
assert.equal(graph.selectionEnabled, false);
assert(events.every((event) => event.graph === 'table2x'));

const other = new Graph();
installPipelineCadSelectionRuntime(other, 'table3x');
other.setPipelineCadSelection([{ graph: 'table3x', entityId: 'M1', entityType: 'marker' }]);
assert.equal(graph.selection.count, 0, 'graph-local state is isolated');
assert.equal(other.selection.count, 1);

console.log('Pipeline CAD selection contracts and box algebra passed');
