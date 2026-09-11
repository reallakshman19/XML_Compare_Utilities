import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupSupportReportEvidenceByLocation,
  SUPPORT_REPORT_MULTI_LOCATION_REMARK,
} from '../tabs/support-steel-relationship-builder/support-report-location-grouping.js?issue=1206';
import { buildSupportReportBundle } from '../tabs/support-steel-relationship-builder/support-report-engine.js?issue=1206';
import { supportReportTraceRows } from '../tabs/support-steel-relationship-builder/support-report-trace-export.js?issue=1206';

const line = 'ASIM-1885-2"-D8810242-11441T3-PP-01';
const branch = `/${line}/B4`;

function clashRow(memberId, point) {
  return {
    secondarySupportFamilyId: 'PS-12005',
    fullLineTag: line,
    scope: 'ASIM',
    branchNode: branch,
    primarySupportMemberId: memberId,
    clashPointGlobalMm: point,
    primaryPath: ['/ASIM-1885-CU-PI', '/ASIM-1885-CU-PI-D', `/${line}`, branch, memberId],
    secondaryPath: ['/ASIM-1885-CU-SU', '/PS-12005'],
  };
}

function nativeMember(memberId, positionGlobal = null, attributes = {}) {
  return {
    memberId,
    semanticRole: 'OTHER_FAMILY_MEMBER',
    attributes,
    positionGlobal,
    sourcePath: ['/ASIM-1885-CU-PI', '/ASIM-1885-CU-PI-D', `/${line}`, branch, memberId],
    sourceParentBranch: branch,
    lineContext: { fullLineTag: line, branchNode: branch },
  };
}

function reportGroup(memberId, locationIndex, locationCount, x) {
  const point = { x, y: -1107599, z: 101674 };
  return Object.freeze({
    groupId: `PS-12005::${line}::LOC-${locationIndex + 1}`,
    secondarySupportFamilyId: 'PS-12005',
    fullLineTag: line,
    scope: 'ASIM',
    branchNodes: [branch],
    primarySupportMemberIds: [memberId],
    clashPointsGlobalMm: [point],
    representativeClashPointGlobalMm: point,
    primaryPaths: [['/ASIM-1885-CU-PI', '/ASIM-1885-CU-PI-D', `/${line}`, branch, memberId]],
    secondaryPaths: [['/ASIM-1885-CU-SU', '/PS-12005']],
    evidenceRows: [{}],
    clashCount: 1,
    locationIndex,
    locationCountOnPipe: locationCount,
    locationMergeToleranceMm: 50,
    locationGroupingBasis: ['SINGLE_EVIDENCE_POINT'],
    multipleLocationsOnPipe: locationCount > 1,
    totalSupportPointsOnSecondary: locationCount,
  });
}

function relationshipBundle(members) {
  return {
    schema: 'SupportSteelRelationshipBundle.v1',
    supportFamilies: [{ familyId: 'PS-12005', members }],
    supportCarrierResolution: { carrierObjects: [] },
  };
}

test('same concrete support member joins contact points beyond 50 mm into one physical location', () => {
  const groups = groupSupportReportEvidenceByLocation([
    clashRow('/PS-12005.1', { x: 605291, y: -1107599, z: 101674 }),
    clashRow('/PS-12005.1', { x: 605315, y: -1107679, z: 101674 }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].locationCountOnPipe, 1);
  assert.equal(groups[0].multipleLocationsOnPipe, false);
  assert.deepEqual(groups[0].primarySupportMemberIds, ['/PS-12005.1']);
  assert.ok(groups[0].locationGroupingBasis.includes('SAME_CONCRETE_MEMBER'));
});

test('different members still obey 50 mm location tolerance', () => {
  const far = groupSupportReportEvidenceByLocation([
    clashRow('/PS-12005.1', { x: 0, y: 0, z: 0 }),
    clashRow('/PS-12005.2', { x: 80, y: 0, z: 0 }),
  ]);
  assert.equal(far.length, 2);
  assert.ok(far.every((group) => group.multipleLocationsOnPipe));

  const near = groupSupportReportEvidenceByLocation([
    clashRow('/PS-12005.1', { x: 0, y: 0, z: 0 }),
    clashRow('/PS-12005.2', { x: 38, y: 0, z: 0 }),
  ]);
  assert.equal(near.length, 1);
  assert.deepEqual(near[0].primarySupportMemberIds, ['/PS-12005.1', '/PS-12005.2']);
  assert.ok(near[0].locationGroupingBasis.includes('WITHIN_50MM'));
});

test('multi-location rows receive only staged members attributable to that location', () => {
  const one = nativeMember('/PS-12005.1', { x: 10, y: 20, z: 30 }, { CMPSUPTYPE: 'PG-50' });
  const two = nativeMember('/PS-12005.2', { x: 40, y: 50, z: 60 }, { CMPSUPTYPE: 'REST-50' });
  const report = buildSupportReportBundle({
    clashEvidence: {
      schema: 'SupportReportClashEvidence.v1',
      rows: [{}, {}],
      groups: [reportGroup('/PS-12005.1', 0, 2, 605291), reportGroup('/PS-12005.2', 1, 2, 606000)],
      diagnostics: [],
    },
    relationshipBundle: relationshipBundle([one, two]),
  });
  assert.equal(report.rows.length, 2);
  assert.deepEqual(report.rows.map((row) => row.pipingPrimarySupport), ['/PS-12005.1', '/PS-12005.2']);
  assert.deepEqual(report.rows[0].evidence.selectedNativeMemberIds, ['/PS-12005.1']);
  assert.deepEqual(report.rows[1].evidence.selectedNativeMemberIds, ['/PS-12005.2']);
  assert.ok(report.rows.every((row) => row.remarks === SUPPORT_REPORT_MULTI_LOCATION_REMARK));
  assert.ok(report.rows.every((row) => row.evidence.jsonTrace.memberAttributionBasis === 'MULTI_LOCATION_OBSERVED_MEMBER_ONLY'));

  const trace = supportReportTraceRows(report);
  assert.ok(trace.every((row) => row['MEMBER ATTRIBUTION BASIS'] === 'MULTI_LOCATION_OBSERVED_MEMBER_ONLY'));
  assert.ok(trace.every((row) => row['LOCATION GROUPING BASIS'] === 'SINGLE_EVIDENCE_POINT'));
});

test('single-location pipe retains family-line staged enrichment', () => {
  const one = nativeMember('/PS-12005.1', { x: 10, y: 20, z: 30 });
  const two = nativeMember('/PS-12005.2', { x: 10, y: 20, z: 30 });
  const group = reportGroup('/PS-12005.1', 0, 1, 605291);
  const report = buildSupportReportBundle({
    clashEvidence: { schema: 'SupportReportClashEvidence.v1', rows: [{}], groups: [group], diagnostics: [] },
    relationshipBundle: relationshipBundle([one, two]),
  });
  const row = report.rows[0];
  assert.equal(row.pipingPrimarySupport, '/PS-12005.1, /PS-12005.2');
  assert.deepEqual(row.evidence.selectedNativeMemberIds, ['/PS-12005.1', '/PS-12005.2']);
  assert.equal(row.evidence.jsonTrace.memberAttributionBasis, 'SINGLE_LOCATION_FAMILY_LINE_ENRICHMENT');
  assert.equal(row.remarks.includes(SUPPORT_REPORT_MULTI_LOCATION_REMARK), false);
});
