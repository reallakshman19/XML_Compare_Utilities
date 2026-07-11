import assert from 'node:assert/strict';
import { groupPointsIntoSheets, parseTable1, _internal } from '../tabs/pipeline-3d-model/pipeline-3d-model-geometry.js';

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

const realDeviation = _internal.pickReferenceSegment([
  { x: 464138, y: 97843 },
  { x: 466141, y: 99187 },
  { x: 760220, y: 393266 },
], true);

assert.equal(round(realDeviation.bearing, 3), 33.861, 'first real sheet-boundary segment should define the deviation angle');
assert.ok(realDeviation.length > 2400 && realDeviation.length < 2420, 'first real deviation segment length should be retained');

const duplicateMatchPointThenRealSegment = _internal.pickReferenceSegment([
  { x: 464138, y: 97843 },
  { x: 464138, y: 97843 },
  { x: 466141, y: 99187 },
], true);

assert.equal(round(duplicateMatchPointThenRealSegment.bearing, 3), 33.861, 'zero-length duplicate match connector should be skipped');

const previousSheetBoundary = _internal.pickReferenceSegment([
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 120, y: 10 },
], false);

assert.equal(round(previousSheetBoundary.bearing, 3), 26.565, 'previous sheet should also use the last real boundary segment');

const multisheetCadDump = `
Constant width     0.300
          length   511.100
        at point  X=  1116885.000  Y=  -75529.000  Z=  232590.000
        at point  X=  1121341.000  Y=  -68885.000  Z=  232870.000
        at point  X=  1125630.000  Y=  -62490.000  Z=  233166.000
        at point  X=  1125687.000  Y=  -62406.000  Z=  233170.000

Constant width     0.300
          length   1271.0677
        at point  X=  464138.000  Y=  97843.000  Z=  1850.000
        at point  X=  466141.000  Y=  99187.000  Z=  1850.000
`;

const points = parseTable1(multisheetCadDump);
const sheets = groupPointsIntoSheets(points);

assert.equal(sheets.length, 2, 'same-angle CAD blocks should still remain separate preview sheets');
assert.equal(sheets[0].angleDeg, 0, 'Sheet 1 should remain at reference angle 0');
assert.equal(sheets[1].angleDeg, 0, 'Sheet 2 should stitch in-line without false 75.19° rotation');
assert.equal(sheets[0].meta.length, 511.1, 'Sheet 1 length metadata should be preserved');
assert.equal(sheets[1].meta.length, 1271.0677, 'Sheet 2 length metadata should be preserved');

const joint = points[3];
const sheet2First = points[4];
assert.equal(joint.label, 'Sheet 1 Pt 4');
assert.equal(sheet2First.label, 'Sheet 2 Pt 1');
assert.equal(round(sheet2First.globalX - joint.globalX, 3), 0, 'first Sheet 2 point should snap to Sheet 1 boundary');
assert.equal(round(sheet2First.globalY - joint.globalY, 3), 0, 'first Sheet 2 point should snap to Sheet 1 boundary');

const sheet2Second = points[5];
assert.equal(round(sheet2Second.globalX - sheet2First.globalX, 3), 2003, 'Sheet 2 first real segment must retain ΔX=2003');
assert.equal(round(sheet2Second.globalY - sheet2First.globalY, 3), 1344, 'Sheet 2 first real segment must retain ΔY=1344');
assert.equal(round(_internal.bearingDeg(sheet2First, sheet2Second), 3), 33.861, 'Sheet 2 first real segment bearing should remain 33.861°');

console.log('pipeline-3d-model-multisheet-angle.test.js passed');
