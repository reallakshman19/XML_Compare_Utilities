import assert from 'assert';
import { qualifyCiiGeometryTransform, registeredCiiPoint } from '../tabs/cii-workspace/cii-workspace-geometry.js';

const point = (x, y, z) => ({ x, y, z });
assert.strictEqual(qualifyCiiGeometryTransform([{ source: point(0, 0, 0), target: point(10, 20, 30) }]).registeredWeight, 0);
assert.strictEqual(qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(10, 20, 30) },
  { source: point(100, 0, 0), target: point(10, 120, 30) },
]).status, 'UNDERDETERMINED');
const transform = qualifyCiiGeometryTransform([
  { source: point(0, 0, 0), target: point(1000, -500, 200) },
  { source: point(100, 0, 0), target: point(1000, -400, 200) },
  { source: point(0, 100, 0), target: point(900, -500, 200) },
]);
assert.strictEqual(transform.status, 'READY');
assert.strictEqual(transform.registeredWeight, 8);
const mapped = registeredCiiPoint(transform, point(50, 25, 0));
assert(Math.abs(mapped.x - 975) < 1e-6);
assert(Math.abs(mapped.y + 450) < 1e-6);
assert(Math.abs(mapped.z - 200) < 1e-6);
console.log('CII Workspace geometry authority checks passed.');
