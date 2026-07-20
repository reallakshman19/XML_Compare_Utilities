import assert from 'node:assert/strict';
import * as batchCommands from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-batch-commands.js';
import { PipelineProfileModel } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-model.js';
import { addTable3MarkerCommand, CommandHistory, renameTable3MarkerCommand } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-commands.js';
import { parseTable1 } from '../tabs/pipeline-3d-model/pipeline-3d-model-geometry.js';
import { buildAuthoritativePipelineOutputs } from '../tabs/pipeline-3d-model/pipeline-3d-model-profile-propagation.js';
import { framesFromTable1, parseTable2Paste, parseTable3Paste } from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-parser.js';
import { SAMPLE_TABLE_2_PASTE_MULTISHEET, SAMPLE_TABLE_3_PASTE_MULTISHEET } from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-samples.js';
import { SAMPLE_TABLE_1_MULTISHEET } from '../tabs/pipeline-3d-model/pipeline-3d-model-samples.js';
import { DEFAULT_ELASTIC_BEND_SETTINGS, normalizeElasticBendSettings } from '../tabs/pipeline-3d-model/pipeline-3d-model-elastic-bend-settings.js';

function profileRaw() {
  const frames = framesFromTable1(parseTable1(SAMPLE_TABLE_1_MULTISHEET));
  const table2 = parseTable2Paste(SAMPLE_TABLE_2_PASTE_MULTISHEET, { frames });
  const table3 = parseTable3Paste(SAMPLE_TABLE_3_PASTE_MULTISHEET, { frames });
  return { table2a: table2.rawText, table3a: table3.table3ARaw, table3b: table3.table3BRaw, table3c: table3.table3CRaw };
}

function build(raw, settings) {
  return buildAuthoritativePipelineOutputs({
    table1Text: SAMPLE_TABLE_1_MULTISHEET,
    table2Text: '', table3Text: '', profileRaw: raw,
    branchInfo: { branchName: 'PCAD-004R', lineNo: 'PCAD-004R' },
    elasticBendSettings: settings,
  });
}

function bendLedger(output) {
  return output.elasticBends.candidates.map((candidate) => ({
    bendId: candidate.bendId,
    radiusMm: candidate.radiusMm,
    incomingElementIndex: candidate.incomingElementIndex,
    previousNode: candidate.previousNode,
    cornerNode: candidate.cornerNode,
    nextNode: candidate.nextNode,
    status: candidate.status,
  }));
}

const raw = profileRaw();
const baseline = build(raw);
assert.equal(baseline.diagnostics.elevationAuthority, 'TABLE_2');
assert.ok(baseline.coordinateRows.length > baseline.inputXmlCoordinateRows.length);
assert.equal('moveTable3DepthRowsCommand' in batchCommands, false, 'obsolete grouped Table 3 depth command must not exist');

const markerModel = PipelineProfileModel.fromRaw(raw);
const markerHistory = new CommandHistory();
const markers = markerModel.table3MarkerRows.slice(0, 2);
assert.ok(markers.length >= 2, 'fixture requires at least two marker rows');
markerHistory.execute(batchCommands.moveTable3MarkerRowsCommand(markerModel, markers.map((row, index) => ({
  id: row.id,
  absoluteH: row.absoluteH + index + 1,
}))));
const movedRaw = markerModel.serializeRaw();
const moved = build(movedRaw);
assert.notDeepEqual(moved.coordinateRows, baseline.coordinateRows, 'marker position remains visible in review ledger');
assert.deepEqual(moved.inputXmlCoordinateRows, baseline.inputXmlCoordinateRows, 'marker movement cannot alter InputXML geometry ledger');
assert.equal(moved.xmlText, baseline.xmlText, 'marker movement cannot alter nodes, vectors or bend XML');
assert.deepEqual(bendLedger(moved), bendLedger(baseline), 'marker movement cannot alter bend identity/radius/ownership');
assert.deepEqual(build(movedRaw).coordinateRows, moved.coordinateRows, 'review evidence remains deterministic');
markerHistory.undo();
assert.deepEqual(markerModel.serializeRaw(), raw, 'marker batch undo restores raw evidence atomically');
markerHistory.redo();
assert.deepEqual(markerModel.serializeRaw(), movedRaw, 'marker batch redo restores raw evidence atomically');

const renameModel = PipelineProfileModel.fromRaw(raw);
const renameRow = renameModel.table3MarkerRows[0];
const renameCommand = renameTable3MarkerCommand(renameModel, renameRow.id, `${renameRow.markerText}-RENAMED`);
renameCommand.execute();
const renamed = build(renameModel.serializeRaw());
assert.equal(renamed.xmlText, baseline.xmlText, 'marker rename cannot alter InputXML');

const insertModel = PipelineProfileModel.fromRaw(raw);
const insertCommand = addTable3MarkerCommand(insertModel, {
  absoluteH: insertModel.table3MarkerRows[0].absoluteH + 0.25,
  markerText: 'PCAD-004R-INSERTED',
});
insertCommand.execute();
const inserted = build(insertModel.serializeRaw());
assert.equal(inserted.xmlText, baseline.xmlText, 'marker insertion cannot alter InputXML');
assert.deepEqual(inserted.inputXmlCoordinateRows, baseline.inputXmlCoordinateRows);
assert.deepEqual(bendLedger(inserted), bendLedger(baseline));

const table2Model = PipelineProfileModel.fromRaw(raw);
const table2Rows = table2Model.table2Rows.slice(1, 3);
const table2Before = table2Model.snapshot();
const table2Command = batchCommands.moveTable2ElevationRowsCommand(table2Model, table2Rows.map((row, index) => ({
  id: row.id,
  elevationValue: row.elevationValue + 0.5 + index * 0.25,
})));
table2Command.execute();
const table2Changed = build(table2Model.serializeRaw());
assert.notDeepEqual(table2Changed.inputXmlCoordinateRows, baseline.inputXmlCoordinateRows, 'Table 2 batch elevation must use generated-Z authority');
assert.notEqual(table2Changed.xmlText, baseline.xmlText);
table2Command.undo();
assert.deepEqual(table2Model.snapshot(), table2Before);
table2Command.execute();
assert.deepEqual(build(table2Model.serializeRaw()).inputXmlCoordinateRows, table2Changed.inputXmlCoordinateRows);

const blockingSettings = normalizeElasticBendSettings({
  ...DEFAULT_ELASTIC_BEND_SETTINGS,
  enabled: true, emitToInputXml: true, screeningOnlyAcknowledged: true,
  diameterSource: 'explicit-od', explicitOutsideDiameterMm: 100,
  useFormulaMinimum: false, usePracticalMinimum: true,
  practicalRadiusMultiplierD: 100000, retainedStraightAllowanceMm: 2000000,
  minimumTurnAngleDeg: 0.1, maximumTurnAngleDeg: 179,
});
const blocked = build(table2Model.serializeRaw(), blockingSettings);
assert.equal(blocked.elasticBends.hasBlockingErrors, true, 'infeasible geometry remains blocked after batch edit');
assert.equal(blocked.xmlText, '', 'batch operations cannot bypass InputXML blocking');
assert.ok(blocked.errors.some((error) => ['BEND_GEOMETRY_INFEASIBLE', 'BEND_SHARED_SEGMENT_INFEASIBLE'].includes(error.code)));

console.log('Pipeline CAD current Table 2/Table 3 dual-ledger and bend authority regressions passed');
