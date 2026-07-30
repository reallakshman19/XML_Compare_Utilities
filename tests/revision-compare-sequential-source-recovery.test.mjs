import assert from 'node:assert/strict';
import { projectCompareRecords } from '../tabs/revision-compare/revision-compare-projection.js';
import { stagedDocumentMetadata } from '../tabs/revision-compare/revision-document-metadata.js';
import { createInlineRevisionWorkerClient } from '../tabs/revision-compare/revision-intake-worker-client.js';
import { createRevisionLoadService } from '../tabs/revision-compare/revision-load-service.js';
import { revisionBasisApprovalReadiness } from '../tabs/revision-compare/revision-compare-readiness.js';
import { revisionComparisonPreflight } from '../tabs/revision-compare/revision-preflight.js';
import { createRevisionScopeProposal } from '../tabs/revision-compare/revision-scope-proposal.js';

const NOW = '2026-07-30T05:30:00.000Z';

function source(name, endX) {
  return [{
    name: '/ASIM-1885-10"-S8810101-91261M7-HC-01/B1',
    type: 'BRANCH',
    attributes: {
      NAME: '/ASIM-1885-10"-S8810101-91261M7-HC-01/B1',
      HPOS: { x: 0, y: 0, z: 0 },
      TPOS: { x: endX, y: 0, z: 0 },
      HREF: '/PREVIOUS',
      TREF: '/NEXT',
    },
    children: [{
      name,
      type: 'PIPE',
      attributes: {
        APOS: { x: 10, y: 20, z: 30 },
        LPOS: { x: endX, y: 40, z: 50 },
        ROUTE_TIER: 'BUILD_QUEUE_CONTINUITY',
        AUTO_GENERATED_PIPE: 'true',
      },
    }],
  }];
}

const inferred = stagedDocumentMetadata(source('PIPE AUTO CONTINUITY CONT-TEST', 100));
assert.deepEqual(inferred, {
  stagedSchema: 'sequential-sketcher-source-array/v1',
  unit: 'MM',
  verticalAxis: 'Z',
  coordinateFrame: 'PLANT',
});

assert.deepEqual(stagedDocumentMetadata([{ name: '/UNRECOGNIZED', children: [] }]), {
  stagedSchema: 'UNKNOWN',
  unit: 'UNKNOWN',
  verticalAxis: 'UNKNOWN',
  coordinateFrame: 'UNKNOWN',
});

const request = {
  basisId: 'basis:sequential',
  side: 'A',
  sourceDocumentId: 'document:A',
  sourceHash: 'a'.repeat(64),
  scopedHash: 'b'.repeat(64),
  selectedBranchIds: ['branch:/ASIM-1885-10"-S8810101-91261M7-HC-01/B1'],
};
const projection = projectCompareRecords(source('PIPE AUTO CONTINUITY CONT-TEST', 100), request);
assert.equal(projection.records.length, 1);
assert.equal(projection.records[0].geometry.availability, 'AVAILABLE');
assert.equal(projection.records[0].geometry.family, 'APOS_LPOS');
assert.deepEqual(projection.records[0].geometry.points, [[10, 20, 30], [100, 40, 50]]);
assert.deepEqual(projection.records[0].visualPrimitive.start, [10, 20, 30]);
assert.deepEqual(projection.records[0].visualPrimitive.end, [100, 40, 50]);

const pointsProjection = projectCompareRecords([{
  name: '/POINTS',
  type: 'BRANCH',
  children: [{
    name: 'OBJECT POINTS',
    type: 'PIPE',
    points: [{ x: 0, y: 1, z: 2 }, { x: 3, y: 4, z: 5 }, { x: 6, y: 7, z: 8 }],
  }],
}], {
  ...request,
  sourceDocumentId: 'document:points',
  selectedBranchIds: ['branch:/POINTS'],
});
assert.deepEqual(pointsProjection.records[0].geometry.points, [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
]);

const service = createRevisionLoadService(globalThis.crypto, {
  clientFactory: () => createInlineRevisionWorkerClient(),
});
const revA = await service.loadText('baseline', 'sequential-a.json', JSON.stringify(source('PIPE AUTO CONTINUITY CONT-A', 100)), NOW);
const revB = await service.loadText('candidate', 'sequential-b.json', JSON.stringify(source('PIPE AUTO CONTINUITY CONT-B', 110)), NOW);
for (const revision of [revA, revB]) {
  assert.equal(revision.document.unit, 'MM');
  assert.equal(revision.document.coordinateFrame, 'PLANT');
  assert.equal(revision.document.verticalAxis, 'Z');
  assert.equal(revision.warnings.some((warning) => warning.includes('not declared')), false);
}
const proposal = await createRevisionScopeProposal(revA, revB, {}, globalThis.crypto);
const preflight = revisionComparisonPreflight(revA, revB, proposal);
assert.equal(preflight.status, 'READY');
assert.equal(revisionBasisApprovalReadiness(preflight).status, 'READY');
assert.deepEqual([
  preflight.compatibility.unitCompatibility.status,
  preflight.compatibility.coordinateFrameCompatibility.status,
  preflight.compatibility.verticalAxisCompatibility.status,
], ['COMPATIBLE', 'COMPATIBLE', 'COMPATIBLE']);
service.dispose();

console.log('revision-compare-sequential-source-recovery: PASS');
