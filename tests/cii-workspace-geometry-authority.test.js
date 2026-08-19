import assert from 'assert';
import { qualifyCiiGeometryTransform, registeredCiiPoint } from '../tabs/cii-workspace/cii-workspace-geometry.js';

const point = (x, y, z) => ({ x, y, z });
const one = qualifyCiiGeometryTransform([{ source: point(0, 0, 0), target: point(10, 20, 30) }]);
assert.strictEqual(one.status, 'UNDERDETERMINED');
assert.strictEqual(one.registeredWeight, 0);

const two = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(10, 20, 30) },
  { source: point(100, 0, 0), target: point(10, 120, 30) },
]);
assert.strictEqual(two.status, 'UNDERDETERMINED');
assert.strictEqual(two.registeredWeight, 0);

const incompatibleSpan = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(10, 20, 30) },
  { source: point(100, 0, 0), target: point(10, 140, 30) },
]);
assert.strictEqual(incompatibleSpan.status, 'INCOMPATIBLE');

const nearCollinear = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(1000, 0, 0) },
  { source: point(1000, 0, 0), target: point(2000, 0, 0) },
  { source: point(2000, 0.01, 0), target: point(3000, 0.01, 0) },
]);
assert.strictEqual(nearCollinear.status, 'UNDERDETERMINED');
assert.strictEqual(nearCollinear.registeredWeight, 0);

const transform = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(1000, -500, 200) },
  { source: point(100, 0, 0), target: point(1000, -400, 200) },
  { source: point(0, 100, 0), target: point(900, -500, 200) },
]);
assert.strictEqual(transform.status, 'READY');
assert.strictEqual(transform.registeredWeight, 8);
assert.strictEqual(transform.basisHypothesisCount, 1);
const mapped = registeredCiiPoint(transform, point(50, 25, 0));
assert(Math.abs(mapped.x - 975) < 1e-6);
assert(Math.abs(mapped.y + 450) < 1e-6);
assert(Math.abs(mapped.z - 200) < 1e-6);

const fourConsistent = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(10, 20, 30) },
  { source: point(100, 0, 0), target: point(110, 20, 30) },
  { source: point(0, 100, 0), target: point(10, 120, 30) },
  { source: point(0, 0, 100), target: point(10, 20, 130) },
]);
assert.strictEqual(fourConsistent.status, 'READY');
assert.strictEqual(fourConsistent.basisHypothesisCount, 4);
assert.strictEqual(fourConsistent.admissibleBasisCount, 4);
assert.strictEqual(fourConsistent.basisComparisons.length, 6);

const ambiguous = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(0, 0, 0) },
  { source: point(1000, 0, 0), target: point(1000, 0, 0) },
  { source: point(2000, 1, 0), target: point(2000, 1, 0) },
  { source: point(3000, 0, 1), target: point(3000, 1, 0) },
], { anchorResidualToleranceMm: 2, nonCollinearSinTolerance: 1e-4, basisTransformAgreementToleranceMm: 2 });
assert.strictEqual(ambiguous.status, 'AMBIGUOUS');
assert.strictEqual(ambiguous.reason, 'METHOD_A_AMBIGUOUS_BASES');
assert(ambiguous.admissibleBasisCount >= 2);
assert(ambiguous.conflictingBasisComparisons.some((row) => row.materialDisagreementMm > 1000));
assert.strictEqual(ambiguous.registeredWeight, 0);

const corruptedFourth = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(1000, -500, 200) },
  { source: point(100, 0, 0), target: point(1000, -400, 200) },
  { source: point(0, 100, 0), target: point(900, -500, 200) },
  { source: point(100, 100, 0), target: point(5000, 5000, 5000) },
]);
assert.strictEqual(corruptedFourth.status, 'INCOMPATIBLE');
assert.strictEqual(corruptedFourth.registeredWeight, 0);

const invalid = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(0, 0, 0) },
  { source: point(1, 0, 0), target: point(1, 0, 0) },
  { source: { x: 'bad', y: 1, z: 0 }, target: point(0, 1, 0) },
]);
assert.strictEqual(invalid.status, 'INCOMPATIBLE');
assert.strictEqual(invalid.reason, 'NON_FINITE_ANCHOR_COORDINATE');
assert.strictEqual(registeredCiiPoint(transform, { x: NaN, y: 0, z: 0 }), null);

console.log('CII Workspace multi-basis geometry authority checks passed.');
