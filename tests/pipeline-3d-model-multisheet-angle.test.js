import assert from 'node:assert/strict';
import { _internal } from '../tabs/pipeline-3d-model/pipeline-3d-model-geometry.js';

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

console.log('pipeline-3d-model-multisheet-angle.test.js passed');
