import assert from 'node:assert/strict';
import { _test } from '../tabs/pipeline-3d-model/pipeline-3d-model-keyplan-preview-overrides.js';

const coordinateText = [
  'BranchName\tNodeNumber\tX(mm)\tY(mm)\tZ(mm)\tNodeName',
  'PL-XX\t100\t0\t0\t0\tSheet 1 Pt 1',
  'PL-XX\t110\t1000\t0\t10\tSTA 1.0',
  'PL-XX\t120\t2000\t500\t20\tMarker 1',
].join('\n');

const rows = _test.parseCoordinateTabText(coordinateText);
assert.equal(rows.length, 3);
assert.equal(rows[0].nodeNumber, 100);
assert.equal(rows[2].name, 'Marker 1');
assert.equal(_test.isMarkerRow(rows[1]), false);
assert.equal(_test.isMarkerRow(rows[2]), true);

const html = _test.renderCoordinateKeyPlanViewer(rows);
for (const expected of [
  'data-p3d-keyplan-action="fit"',
  'data-p3d-keyplan-action="zoom-in"',
  'data-p3d-keyplan-action="pan-left"',
  'data-p3d-keyplan-toggle="nodes"',
  'data-p3d-keyplan-toggle="markers"',
  '100',
  'Marker 1',
]) {
  assert.ok(html.includes(expected), `missing ${expected}`);
}

console.log('pipeline-3d-model-keyplan-preview.test.js passed');
