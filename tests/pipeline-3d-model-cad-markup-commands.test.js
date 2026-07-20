import assert from 'node:assert/strict';
import { CommandHistory } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-commands.js';
import { createPipelineCadMarkupRuntime } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-markup-commands.js';

function profile() {
  return {
    revision: 11,
    table2Rows: [
      { id: 'table2a-0001', sourceTable: 'table2a', sourceLine: 1, stationValue: 0, elevationValue: 100, basisH: 500 },
      { id: 'table2a-0002', sourceTable: 'table2a', sourceLine: 2, stationValue: 10, elevationValue: 104, basisH: 510 },
    ],
    table3LengthRows: [{ id: 'table3a-0001', sourceTable: 'table3a', sourceLine: 1, fromH: 500, toH: 510, hLength: 10 }],
    table3DepthRows: [],
    table3MarkerRows: [{ id: 'table3c-0001', sourceTable: 'table3c', sourceLine: 1, absoluteH: 505, markerText: 'PM-001' }],
    serializeRawCalls: 0,
    serializeRaw() { this.serializeRawCalls += 1; return {}; },
  };
}
const current = profile(); const redraw = { table2x: 0, table3x: 0 };
const graphs = {
  table2x: {
    currentNodes: () => current.table2Rows.map((row) => ({ id: row.id, type: 'elevation-node', x: row.stationValue, y: row.elevationValue })),
    setMarkupProjection(value) { this.projection = value; redraw.table2x += 1; },
  },
  table3x: {
    depthNodes: () => [], markerNodes: () => [{ id: 'table3c-0001', type: 'marker', x: 5, y: .75 }],
    setMarkupProjection(value) { this.projection = value; redraw.table3x += 1; },
  },
};
const history = new CommandHistory();
const runtime = createPipelineCadMarkupRuntime({ profileModel: current, graphs, history });
let publications = 0; runtime.subscribe(() => { publications += 1; });
const engineeringRevision = current.revision;
runtime.createDimension({
  graph: 'table2x', dimensionType: 'LINEAR_HORIZONTAL',
  firstAnchor: { kind: 'ENTITY', graph: 'table2x', entityId: 'table2a-0001', entityType: 'elevation-node', pointRole: 'CENTER' },
  secondAnchor: { kind: 'ENTITY', graph: 'table2x', entityId: 'table2a-0002', entityType: 'elevation-node', pointRole: 'CENTER' },
  offset: 1, labelMode: 'MEASURED',
});
assert.equal(history.undoStack.length, 1);
assert.equal(publications, 1);
assert.equal(current.revision, engineeringRevision);
assert.equal(current.serializeRawCalls, 0);
assert.equal(runtime.getDocument().nextSequence, 2);
const beforeFailure = runtime.export(); const historyBefore = history.undoStack.length;
assert.throws(() => runtime.createAnnotation({
  graph: 'table3x',
  anchor: { kind: 'ENTITY', graph: 'table3x', entityId: 'table3c-0001', entityType: 'marker', pointRole: 'CENTER' },
  text: '<script>', alignment: 'LEFT', leader: {},
}), /scriptable/);
assert.equal(runtime.export(), beforeFailure);
assert.equal(history.undoStack.length, historyBefore);
assert.equal(publications, 1);
assert.equal(runtime.undo(), true);
assert.equal(runtime.getDocument().dimensions.length, 0);
assert.equal(runtime.getDocument().nextSequence, 1);
assert.equal(runtime.redo(), true);
assert.equal(runtime.getDocument().dimensions.length, 1);
runtime.updateDimension('pcad-dim-000001', { offset: 3 });
runtime.deleteDimension('pcad-dim-000001');
assert.equal(history.undoStack.length, 3);
runtime.undo();
assert.equal(runtime.getDocument().dimensions.length, 1);
const exported = runtime.export();
runtime.import(exported);
assert.equal(runtime.export(), exported);
assert.equal(current.serializeRawCalls, 0);
assert.ok(redraw.table2x >= publications && redraw.table3x >= publications);
runtime.destroy();
assert.equal(runtime.destroy(), false);
console.log('Pipeline CAD markup commands: ok');
