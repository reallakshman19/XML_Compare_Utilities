import assert from 'node:assert/strict';
import {
  DEFAULT_PIPELINE_CAD_SNAP_SETTINGS,
  describePipelineCadSnapSettings,
  normalizePipelineCadSnapSettings,
  roundToSnapStep,
  snapTable2Elevation,
  snapTable2Station,
  snapTable3Cumulative,
  snapTable3Depth,
  table3StationCandidates,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-snap.js';
import {
  PipelineCadShortcut,
  isPipelineCadEditableTarget,
  resolvePipelineCadShortcut,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-shortcuts.js';

const model = {
  table2Rows: [
    { id: 'a', stationValue: 0 },
    { id: 'b', stationValue: 19 },
    { id: 'c', stationValue: 31.9 },
  ],
  coordinateMap: {
    cumulativeMin: 0,
    cumulativeMax: 70.8,
    anchors: [
      { cumulative: 0, absoluteH: 661.791 },
      { cumulative: 20.5, absoluteH: 682.337 },
      { cumulative: 54.8, absoluteH: 716.683 },
      { cumulative: 70.8, absoluteH: 732.683 },
    ],
  },
};

assert.equal(DEFAULT_PIPELINE_CAD_SNAP_SETTINGS.gridEnabled, false);
assert.equal(roundToSnapStep(12.37, 0.5), 12.5);
assert.equal(roundToSnapStep(-1.24, 0.1), -1.2);
assert.equal(snapTable2Elevation(235.037, { gridEnabled: true, elevationStep: 0.05 }), 235.05);
assert.equal(snapTable2Station(18.55, model, { stationEnabled: true, stationTolerance: 0.6 }), 19);
assert.equal(snapTable2Station(18.55, model, { stationEnabled: true, stationTolerance: 0.6 }, { excludeIds: ['b'] }), 18.55);
assert.deepEqual(table3StationCandidates(model), [0, 20.5, 54.8, 70.8]);
assert.equal(snapTable3Cumulative(20.2, model, { stationEnabled: true, stationTolerance: 0.5 }), 20.5);
assert.equal(snapTable3Cumulative(71.2, model, { gridEnabled: true, stationStep: 0.5 }), 70.8);
assert.equal(snapTable3Depth(-1.24, { gridEnabled: true, depthStep: 0.1 }), -1.2);
assert.equal(snapTable3Depth(-0.05, { aboveGroundTolerance: 0.15, aboveGroundZ: 0.75 }), 0.75);
assert.equal(describePipelineCadSnapSettings({ gridEnabled: true, stationEnabled: true }), 'Grid + Station snap');
assert.equal(normalizePipelineCadSnapSettings({ stationStep: -1 }).stationStep, 0.5);

assert.equal(resolvePipelineCadShortcut({ key: 'v' }, 'table2x'), PipelineCadShortcut.SELECT);
assert.equal(resolvePipelineCadShortcut({ key: 'n' }, 'table2x'), PipelineCadShortcut.ADD_NODE);
assert.equal(resolvePipelineCadShortcut({ key: 'm' }, 'table2x'), null);
assert.equal(resolvePipelineCadShortcut({ key: 'm' }, 'table3x'), PipelineCadShortcut.ADD_MARKER);
assert.equal(resolvePipelineCadShortcut({ key: 'Delete' }, 'table3x'), PipelineCadShortcut.DELETE_SELECTION);
assert.equal(resolvePipelineCadShortcut({ key: 'z', ctrlKey: true }, 'table3x'), PipelineCadShortcut.UNDO);
assert.equal(resolvePipelineCadShortcut({ key: 'z', ctrlKey: true, shiftKey: true }, 'table3x'), PipelineCadShortcut.REDO);
assert.equal(resolvePipelineCadShortcut({ key: 'g' }, 'table3x'), PipelineCadShortcut.TOGGLE_GRID_SNAP);
assert.equal(resolvePipelineCadShortcut({ key: 's' }, 'table3x'), PipelineCadShortcut.TOGGLE_STATION_SNAP);
assert.equal(isPipelineCadEditableTarget({ tagName: 'INPUT' }), true);
assert.equal(resolvePipelineCadShortcut({ key: 'x', target: { tagName: 'INPUT' } }, 'table3x'), null);

console.log('pipeline-3d-model CAD authoring tests passed');
