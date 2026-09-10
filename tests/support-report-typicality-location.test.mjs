import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseSupportReportClashXml } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js';
import { buildSupportReportTypicalityAudit } from '../tabs/support-steel-relationship-builder/support-report-typicality.js';
import {
  buildCanonicalTypicalityLocations,
  buildTypicalityLocationAssignment,
  buildTypicalityLocationAssignmentsForMatches,
} from '../tabs/support-steel-relationship-builder/support-report-typicality-location.js';

function syntheticGroup(id, familyId, x, options = {}) {
  return Object.freeze({
    groupId: id,
    secondarySupportFamilyId: familyId,
    fullLineTag: options.fullLineTag || 'ASIM-1-2"-P8810001-31441C4-HT-01',
    primarySupportMemberIds: options.memberIds || [`/${familyId}.1`],
    representativeClashPointGlobalMm: Object.freeze({ x, y: options.y || 0, z: options.z || 0 }),
    clashPointsGlobalMm: Object.freeze([{ x, y: options.y || 0, z: options.z || 0 }]),
    evidenceRows: Object.freeze([{ guid: `${id}-guid` }]),
  });
}

function syntheticEvidence(familyId, specs) {
  const groups = specs.map((spec) => syntheticGroup(spec.id, familyId, spec.x, spec));
  return Object.freeze({
    groups: Object.freeze(groups),
    rawClashes: Object.freeze(specs.map((spec) => Object.freeze({
      guid: `${spec.id}-raw`,
      familyIds: Object.freeze([familyId]),
      clashPointGlobalMm: Object.freeze({ x: spec.x, y: spec.y || 0, z: spec.z || 0 }),
    }))),
  });
}

function reportBundle(rows) { return Object.freeze({ rows: Object.freeze(rows.map((row) => Object.freeze(row))) }); }

test('11168 -> 14168 produces ten row-independent physical-location assignments', () => {
  const left = parseSupportReportClashXml(readFileSync('benchmarks/11168.xml', 'utf8'));
  const right = parseSupportReportClashXml(readFileSync('benchmarks/14168.xml', 'utf8'));
  const familyAudit = buildSupportReportTypicalityAudit(left, right);
  const [assignment] = buildTypicalityLocationAssignmentsForMatches(left, right, familyAudit.matches, {
    profile: { pipingLocation: { requireCompatiblePipeClass: true, geometryFingerprintToleranceMm: 100 } },
  });
  const leftLocations = new Map(buildCanonicalTypicalityLocations(left).map((item) => [item.locationId, item]));
  const rightLocations = new Map(buildCanonicalTypicalityLocations(right).map((item) => [item.locationId, item]));

  assert.equal(assignment.leftFamilyId, 'PS-11168');
  assert.equal(assignment.rightFamilyId, 'PS-14168');
  assert.equal(assignment.selectedAssignments.length, 10);
  assert.deepEqual(assignment.unmatchedLeftLocationIds, []);
  assert.deepEqual(assignment.unmatchedRightLocationIds, []);
  assert.equal(leftLocations.size, 10);
  assert.equal(rightLocations.size, 10);
  for (const pair of assignment.selectedAssignments) {
    assert.equal(pair.signals.pipeClass.result, 'PASS');
    assert.equal(leftLocations.get(pair.leftLocationId).normalizedPipeClass,
      rightLocations.get(pair.rightLocationId).normalizedPipeClass);
    assert.ok(pair.sourceEvidence.leftClashIds.length > 0);
    assert.ok(pair.sourceEvidence.rightClashIds.length > 0);
  }
});

test('repeated pipe classes are assigned by structure geometry, not group order', () => {
  const left = syntheticEvidence('PS-1', [
    { id: 'L-A', x: 0 },
    { id: 'L-B', x: 1000 },
    { id: 'L-C', x: 3000 },
  ]);
  const right = syntheticEvidence('PS-2', [
    { id: 'R-C', x: 13000 },
    { id: 'R-A', x: 10000 },
    { id: 'R-B', x: 11000 },
  ]);
  const assignment = buildTypicalityLocationAssignment(left, right, {
    leftFamilyId: 'PS-1',
    rightFamilyId: 'PS-2',
    profile: { requireCompatiblePipeClass: true, geometryFingerprintToleranceMm: 1 },
  });

  assert.equal(assignment.result, 'TOPOLOGY_ONLY');
  assert.deepEqual(assignment.selectedAssignments.map((item) => [item.leftLocationId, item.rightLocationId]), [
    ['L-A', 'R-A'],
    ['L-B', 'R-B'],
    ['L-C', 'R-C'],
  ]);
  assert.deepEqual(assignment.ambiguousLocationIds, []);
});

test('equal-cost structural alternatives are exposed as ambiguous', () => {
  const left = syntheticEvidence('PS-3', [{ id: 'L-1', x: 0 }, { id: 'L-2', x: 1000 }]);
  const right = syntheticEvidence('PS-4', [{ id: 'R-1', x: 10000 }, { id: 'R-2', x: 11000 }]);
  const assignment = buildTypicalityLocationAssignment(left, right, {
    leftFamilyId: 'PS-3',
    rightFamilyId: 'PS-4',
    profile: { requireCompatiblePipeClass: true, geometryFingerprintToleranceMm: 1 },
  });

  assert.equal(assignment.result, 'AMBIGUOUS');
  assert.deepEqual([...assignment.ambiguousLocationIds].sort(), ['L-1', 'L-2']);
});

test('equal-size incompatible families remain unmatched instead of forcing a real pair', () => {
  const left = syntheticEvidence('PS-7', [{
    id: 'L', x: 0, fullLineTag: 'ASIM-1-2"-P8810001-31441C4-HT-01',
  }]);
  const right = syntheticEvidence('PS-8', [{
    id: 'R', x: 5000, fullLineTag: 'ASIM-1-4"-W8810001-31441C4-01',
  }]);
  const assignment = buildTypicalityLocationAssignment(left, right, {
    leftFamilyId: 'PS-7', rightFamilyId: 'PS-8',
    profile: { requireCompatiblePipeClass: true },
  });

  assert.equal(assignment.selectedAssignments.length, 0);
  assert.deepEqual(assignment.unmatchedLeftLocationIds, ['L']);
  assert.deepEqual(assignment.unmatchedRightLocationIds, ['R']);
  assert.equal(assignment.result, 'PARTIAL');
});

test('SUPPORT TYPE evidence is order-independent and affects arrangement status', () => {
  const left = syntheticEvidence('PS-5', [{ id: 'L', x: 0 }]);
  const right = syntheticEvidence('PS-6', [{ id: 'R', x: 5000 }]);
  const exact = buildTypicalityLocationAssignment(left, right, {
    leftFamilyId: 'PS-5', rightFamilyId: 'PS-6',
    leftReportBundle: reportBundle([{ rowId: 'L', supportType: 'REST-50, BP-50, GUIDE-50' }]),
    rightReportBundle: reportBundle([{ rowId: 'R', supportType: 'GUIDE-50, REST-50, BP-50' }]),
  });
  assert.equal(exact.result, 'EXACT');
  assert.equal(exact.selectedAssignments[0].supportTypeComparison.result, 'EXACT');

  const partial = buildTypicalityLocationAssignment(left, right, {
    leftFamilyId: 'PS-5', rightFamilyId: 'PS-6',
    leftReportBundle: reportBundle([{ rowId: 'L', supportType: 'REST-50, BP-50, GUIDE-50' }]),
    rightReportBundle: reportBundle([{ rowId: 'R', supportType: 'REST-50, BP-50' }]),
  });
  assert.equal(partial.result, 'PARTIAL');
  assert.deepEqual(partial.selectedAssignments[0].supportTypeComparison.missingFromRight, [{ type: 'GUIDE-50', count: 1 }]);
});
