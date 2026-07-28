import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { sha256Text } from '../tabs/revision-compare/revision-hash.js';
import { REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES } from '../tabs/revision-compare/revision-transfer-handover-inspection.js';
import { serializeRevisionCompareTransferHandoverBundle } from '../tabs/revision-compare/revision-transfer-handover.js';
import { clone, cryptoRef, handoverInspectionFixture } from './revision-compare-transfer-handover-inspection-fixtures.mjs';

const COUNTS = Object.freeze({
  differences: 180_000, reviews: 95_000, decisions: 40_000,
  operations: 120_000, auditRows: 120_000,
});
const encoder = new TextEncoder();
function id(prefix, index) { return `${prefix}${String(index).padStart(6, '0')}`; }
function elapsed(start) { return Number((performance.now() - start).toFixed(1)); }
function heapMiB() { return Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)); }
function rows(count, build) { return Array.from({ length: count }, (_, index) => build(index)); }
function populate(bundle) {
  const evidence = bundle.payload.evidencePackage.payload;
  evidence.audit.differenceRows = rows(COUNTS.differences, (index) => ({
    differenceId: id('D', index), differenceCategory: 'MODIFIED', changeReason: 'C',
    sourceRecordId: id('A', index), targetRecordId: id('B', index), changedProperties: ['p'],
  }));
  evidence.reviewSession.items = rows(COUNTS.reviews, (index) => ({
    differenceId: id('D', index), reviewState: 'REVIEWED', note: 'N',
    updatedAt: '2026-07-25T00:00:00.000Z',
  }));
  evidence.decisionLedger.decisions = rows(COUNTS.decisions, (index) => ({
    differenceId: id('D', index), decisionState: 'ACCEPTED_CANDIDATE',
    acceptedTargetDifferenceId: id('T', index), rationale: 'R',
    updatedAt: '2026-07-25T00:00:00.000Z',
  }));
  bundle.payload.transferPlan.operations = rows(COUNTS.operations, (index) => ({
    operationId: id('OP', index), operationType: 'REPLACE_FIELD', sourceEntityId: id('A', index),
    targetEntityId: id('B', index), targetCanonicalPath: '/', fieldPath: '/p',
    beforeValue: 0, afterValue: 1, status: 'READY',
  }));
  bundle.payload.transferAudit.rows = rows(COUNTS.auditRows, (index) => ({
    operationId: id('OP', index), status: 'APPLIED', sourceEntityId: id('A', index),
    targetEntityId: id('B', index), fieldPath: '/p', reason: '',
  }));
  return bundle;
}
function assertPopulation(bundle) {
  const payload = bundle.payload; const evidence = payload.evidencePackage.payload;
  assert.equal(evidence.audit.differenceRows.length, COUNTS.differences);
  assert.equal(evidence.reviewSession.items.length, COUNTS.reviews);
  assert.equal(evidence.decisionLedger.decisions.length, COUNTS.decisions);
  assert.equal(payload.transferPlan.operations.length, COUNTS.operations);
  assert.equal(payload.transferAudit.rows.length, COUNTS.auditRows);
  assert.equal(evidence.audit.differenceRows[0].differenceId, id('D', 0));
  assert.equal(evidence.audit.differenceRows.at(-1).differenceId, id('D', COUNTS.differences - 1));
  assert.equal(payload.transferPlan.operations[0].operationId, id('OP', 0));
  assert.equal(payload.transferPlan.operations.at(-1).operationId, id('OP', COUNTS.operations - 1));
}

const fixtureStart = performance.now(); let fixture = await handoverInspectionFixture();
const fixtureDurationMs = elapsed(fixtureStart); const populateStart = performance.now();
let bundle = populate(clone(fixture.bundle)); fixture = null;
const populateDurationMs = elapsed(populateStart); assertPopulation(bundle);
const serializeStart = performance.now(); let sourceText = serializeRevisionCompareTransferHandoverBundle(bundle);
const serializeDurationMs = elapsed(serializeStart); const sourceBytes = encoder.encode(sourceText).byteLength;
assert.ok(sourceBytes <= REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES,
  `Complete mandatory handover fixture is ${sourceBytes} bytes and exceeds the 128 MiB import boundary.`);
const digestStart = performance.now(); const firstHash = await sha256Text(sourceText, cryptoRef);
const digestDurationMs = elapsed(digestStart); bundle = null; globalThis.gc?.();
const parseStart = performance.now(); let reparsed = JSON.parse(sourceText); const parseDurationMs = elapsed(parseStart);
assertPopulation(reparsed); sourceText = null; globalThis.gc?.();
const repeatStart = performance.now(); const repeated = serializeRevisionCompareTransferHandoverBundle(reparsed);
const repeatDurationMs = elapsed(repeatStart); reparsed = null; globalThis.gc?.();
const repeatedHash = await sha256Text(repeated, cryptoRef);
assert.equal(repeatedHash, firstHash); assert.equal(encoder.encode(repeated).byteLength, sourceBytes);
console.log(JSON.stringify({
  counts: COUNTS, sourceBytes, maximumSourceBytes: REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES,
  fixtureDurationMs, populateDurationMs, serializeDurationMs, parseDurationMs,
  digestDurationMs, repeatDurationMs, finalHeapMiB: heapMiB(), contentSha256: firstHash,
}, null, 2));
console.log('revision-compare-transfer-handover-inspection-scale.test.mjs passed');
