import assert from 'node:assert/strict';
import {
  deleteProfileRowsCommand,
  moveTable2RowsCommand,
  moveTable3DepthRowsCommand,
  moveTable3MarkerRowsCommand,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-batch-commands.js';
import { CommandHistory } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-commands.js';
import { formatDepth, parseDepthText } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-math.js';
import { PipelineProfileModel } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-model.js';

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

const model = PipelineProfileModel.fromRaw(raw);
const history = new CommandHistory();
const table2 = model.table2Rows.slice(1, 3);
const table2Before = table2.map((row) => row.elevationValue);
history.execute(moveTable2RowsCommand(model, table2.map((row, index) => ({ id: row.id, elevation: table2Before[index] + 1 }))));
assert.equal(history.undoStack.length, 1);
assert.deepEqual(table2.map((row) => model.findRow(row.id).elevationValue), table2Before.map((value) => value + 1));
history.undo();
assert.deepEqual(table2.map((row) => model.findRow(row.id).elevationValue), table2Before);
history.redo();
assert.deepEqual(table2.map((row) => model.findRow(row.id).elevationValue), table2Before.map((value) => value + 1));

const depths = model.table3DepthRows;
const depthBefore = depths.map((row) => row.z);
const depthTargets = depthBefore.map((value) => value - 0.5);
const depthExpected = depthTargets.map((value) => parseDepthText(formatDepth(value))?.z ?? value);
history.execute(moveTable3DepthRowsCommand(model, depths.map((row, index) => ({ id: row.id, z: depthTargets[index] }))));
assert.equal(history.undoStack.length, 2);
assert.deepEqual(depths.map((row) => model.findRow(row.id).z), depthExpected);
assert.equal(model.findRow(depths[0].id).zText, 'A/G', 'near-grade batch target must preserve Above-Ground semantics');
history.undo();
assert.deepEqual(depths.map((row) => model.findRow(row.id).z), depthBefore);

const markers = model.table3MarkerRows;
const markerBefore = markers.map((row) => row.absoluteH);
history.execute(moveTable3MarkerRowsCommand(model, markers.map((row, index) => ({ id: row.id, absoluteH: markerBefore[index] + 2 }))));
assert.equal(history.undoStack.length, 2, 'undo followed by a new batch must replace redo history');
assert.deepEqual(markers.map((row) => model.findRow(row.id).absoluteH), markerBefore.map((value) => value + 2));

const deleteModel = PipelineProfileModel.fromRaw(raw);
const deleteHistory = new CommandHistory();
const deleteIds = [deleteModel.table2Rows[1].id, deleteModel.table3MarkerRows[0].id];
deleteHistory.execute(deleteProfileRowsCommand(deleteModel, deleteIds));
assert.equal(deleteHistory.undoStack.length, 1);
assert.ok(deleteIds.every((id) => !deleteModel.findRow(id)));
deleteHistory.undo();
assert.ok(deleteIds.every((id) => deleteModel.findRow(id)));
deleteHistory.redo();
assert.ok(deleteIds.every((id) => !deleteModel.findRow(id)));

assert.throws(() => deleteProfileRowsCommand(model, []), /at least one valid row/);
assert.throws(() => moveTable2RowsCommand(model, [{ id: '', elevation: 1 }]), /at least one valid row/);

console.log('Pipeline CAD batch command tests passed');
