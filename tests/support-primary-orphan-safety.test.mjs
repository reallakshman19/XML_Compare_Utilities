import assert from 'node:assert/strict';
import test from 'node:test';

import { applySupportPrimaryAssemblyCounts } from '../tabs/support-steel-relationship-builder/support-primary-counting.js';
import { _test as orphanTest } from '../tabs/support-steel-relationship-builder/support-primary-orphan-recovery.js';
import { _test as locationTest } from '../tabs/support-steel-relationship-builder/support-report-location-grouping.js';

const line = 'ASIM-1885-10"-S8810101-91261M7-HC-01';

function group(id, memberId, point) {
  return {
    groupId: id,
    secondarySupportFamilyId: 'PS-11167',
    fullLineTag: line,
    branchNodes: ['B4'],
    primarySupportMemberIds: [memberId],
    representativeClashPointGlobalMm: point,
    locationNominalBoreMm: 250,
    evidenceRows: [{
      secondarySupportFamilyId: 'PS-11167',
      primarySupportMemberId: memberId,
      fullLineTag: line,
      branchNode: 'B4',
      clashPointGlobalMm: point,
    }],
  };
}

test('pipe-level orphan axis rejects trusted two-point models so the candidate pair cannot define its own axis', () => {
  const twoPoint = locationTest.principalAxisModel([
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
  ]);
  assert.equal(twoPoint.trusted, true);
  assert.equal(twoPoint.pointCount, 2);
  assert.equal(orphanTest.trustedPipeModel(twoPoint), null);

  const threePoint = locationTest.principalAxisModel([
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
    { x: 200, y: 0, z: 0 },
  ]);
  assert.equal(threePoint.trusted, true);
  assert.equal(threePoint.pointCount, 3);
  assert.equal(orphanTest.trustedPipeModel(threePoint), threePoint);
});

test('no-explicit fallback preserves non-recoverable legacy groups while deduplicating only recovered geometry groups', () => {
  const concrete = group('G1', '/PS-11167.1', { x: 0, y: 0, z: 0 });
  const symbolic = group('G2', '/PS-11167/DATUM', { x: 1000, y: 1000, z: 0 });
  const counted = applySupportPrimaryAssemblyCounts({
    locationGroups: [concrete, symbolic],
    relationshipBundle: null,
    orphanRecoveryConfig: {},
  });
  assert.equal(counted.reconciliation.assignments.find((row) => row.groupId === 'G2').status, 'SYMBOLIC_ONLY');
  assert.equal(counted.familySummaries[0].legacyGeometryCount, 2);
  assert.equal(counted.familySummaries[0].totalSupportPointsOnSecondary, 2);
  assert.equal(counted.familySummaries[0].legacyFallbackOccurrenceIds.length, 2);
});
