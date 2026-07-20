import assert from 'node:assert/strict';
import { CommandHistory } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-commands.js';
import {
  deleteProfileRowsCommand,
  moveTable2ElevationRowsCommand,
  moveTable3MarkerRowsCommand,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-batch-commands.js';

class Model {
  constructor() {
    this.table2Rows = [
      { id: 'T2-1', sourceTable: 'table2a', stationValue: 0, basisH: 0, elevationValue: 10 },
      { id: 'T2-2', sourceTable: 'table2a', stationValue: 10, basisH: 10, elevationValue: 11 },
      { id: 'T2-3', sourceTable: 'table2a', stationValue: 20, basisH: 20, elevationValue: 12 },
      { id: 'T2-4', sourceTable: 'table2a', stationValue: 30, basisH: 30, elevationValue: 13 },
    ];
    this.table3DepthRows = [{ id: 'D-1', sourceTable: 'table3b', z: -1.5 }];
    this.table3MarkerRows = [
      { id: 'M-1', sourceTable: 'table3c', absoluteH: 5 },
      { id: 'M-2', sourceTable: 'table3c', absoluteH: 15 },
    ];
    this.revision = 0;
  }
  snapshot() { return structuredClone({ table2Rows: this.table2Rows, table3DepthRows: this.table3DepthRows, table3MarkerRows: this.table3MarkerRows, revision: this.revision }); }
  restore(snapshot) { Object.assign(this, structuredClone(snapshot)); }
  findRow(id) { return [...this.table2Rows, ...this.table3DepthRows, ...this.table3MarkerRows].find((row) => row.id === id) || null; }
  moveTable2Elevation(id, value) { this.findRow(id).elevationValue = Number(value); this.revision += 1; }
  moveMarker(id, value) { this.findRow(id).absoluteH = Number(value); this.revision += 1; }
  deleteRow(id) {
    for (const name of ['table2Rows', 'table3DepthRows', 'table3MarkerRows']) {
      const index = this[name].findIndex((row) => row.id === id);
      if (index >= 0) { this[name].splice(index, 1); this.revision += 1; return; }
    }
    throw new Error(`Unknown profile row: ${id}`);
  }
}

const model = new Model();
const history = new CommandHistory();
const before = model.snapshot();
history.execute(moveTable2ElevationRowsCommand(model, [
  { id: 'T2-2', elevationValue: 21 },
  { id: 'T2-3', elevationValue: 22 },
]));
assert.equal(history.undoStack.length, 1);
assert.deepEqual(model.table2Rows.map((row) => row.elevationValue), [10, 21, 22, 13]);
history.undo();
assert.deepEqual(model.snapshot(), before);
history.redo();
assert.deepEqual(model.table2Rows.map((row) => row.elevationValue), [10, 21, 22, 13]);

history.execute(moveTable3MarkerRowsCommand(model, [
  { id: 'M-1', absoluteH: 25 },
  { id: 'M-2', absoluteH: 20 },
]));
assert.equal(history.undoStack.length, 2);
assert.deepEqual(model.table3MarkerRows.map((row) => [row.id, row.absoluteH]), [['M-2', 20], ['M-1', 25]]);
history.undo();
assert.deepEqual(model.table3MarkerRows.map((row) => [row.id, row.absoluteH]), [['M-1', 5], ['M-2', 15]]);

const deleteBefore = model.snapshot();
history.execute(deleteProfileRowsCommand(model, ['T2-2', 'M-1', 'D-1']));
assert.equal(history.undoStack.length, 2, 'one delete batch adds one command after prior undo');
assert.equal(model.findRow('T2-2'), null);
assert.equal(model.findRow('M-1'), null);
assert.equal(model.findRow('D-1'), null);
history.undo();
assert.deepEqual(model.snapshot(), deleteBefore, 'batch undo restores all rows atomically');
history.redo();
assert.equal(model.findRow('T2-2'), null);
assert.equal(model.findRow('M-1'), null);
assert.equal(model.findRow('D-1'), null);

const invalid = new Model();
assert.throws(() => deleteProfileRowsCommand(invalid, []), /at least one/);
assert.throws(() => deleteProfileRowsCommand(invalid, ['UNKNOWN']), /unknown/);
assert.throws(() => deleteProfileRowsCommand(invalid, ['T2-1', 'T2-2', 'T2-3']), /invalidate Table 2/);
assert.throws(() => moveTable2ElevationRowsCommand(invalid, [{ id: 'M-1', elevationValue: 1 }]), /not compatible/);
assert.throws(() => moveTable3MarkerRowsCommand(invalid, [{ id: 'D-1', absoluteH: 1 }]), /not compatible/);
assert.equal(invalid.table3DepthRows[0].z, -1.5, 'no grouped depth mutation API exists');

console.log('Pipeline CAD batch commands are atomic and authority-scoped');
