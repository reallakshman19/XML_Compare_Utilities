import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES } from '../tabs/revision-compare/revision-transfer-handover-inspection.js';
import { serializeRevisionCompareTransferHandoverBundle } from '../tabs/revision-compare/revision-transfer-handover.js';
import { handoverInspectionFixture } from './revision-compare-transfer-handover-inspection-fixtures.mjs';

const COUNTS = Object.freeze({ differences: 180_000, reviews: 95_000, decisions: 40_000,
  operations: 120_000, auditRows: 120_000 });
function elapsed(start) { return Number((performance.now() - start).toFixed(1)); }
function heapMiB() { return Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)); }
const started = performance.now(); const fixture = await handoverInspectionFixture();
const fixtureDurationMs = elapsed(started); const operation = fixture.bundle.payload.transferPlan.operations[0];
const operationBytes = Buffer.byteLength(JSON.stringify(operation));
const operationArrayLowerBoundBytes = operationBytes * COUNTS.operations;
const baseBytes = Buffer.byteLength(serializeRevisionCompareTransferHandoverBundle(fixture.bundle));
const measurements = {
  counts: COUNTS, baseBytes, operationBytes, operationArrayLowerBoundBytes,
  maximumSourceBytes: REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES,
  fixtureDurationMs, heapAfterFixtureMiB: heapMiB(),
};
console.log(JSON.stringify(measurements, null, 2));
assert.ok(operationArrayLowerBoundBytes < REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES,
  'The required 120,000 current-schema operations alone exceed the 128 MiB admission limit; stop for Work Pack amendment before constructing duplicated package, audit, proof, completion and artifact evidence.');
console.log('revision-compare-transfer-handover-inspection-scale.test.mjs passed');
