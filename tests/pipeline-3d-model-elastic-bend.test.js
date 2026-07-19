import assert from 'node:assert/strict';
import {
  b314NormalColdFieldRadiusD,
  resolveColdFieldBendPolicy,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-bend-policy.js';
import {
  buildElasticBendLedgerText,
  calculateElasticBendScreening,
  resolvePipelineElasticBends,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-elastic-bend.js';
import {
  DEFAULT_ELASTIC_BEND_SETTINGS,
  normalizeElasticBendSettings,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-elastic-bend-settings.js';
import { buildInputXmlPipingModelXml } from '../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js';

function point(x, y, z, source = 'vertex', label = '') {
  return { x, y, z, source, sources: [source], label };
}
function coordinateRows(points) {
  return points.map((item, index) => ({
    branchName: 'PL-BEND', nodeNumber: 100 + index * 10,
    x: item.x * 1000, y: item.y * 1000, z: item.z * 1000,
    nodeName: item.label || `${item.source}-${index + 1}`,
  }));
}
function settings(overrides = {}) {
  return normalizeElasticBendSettings({
    ...DEFAULT_ELASTIC_BEND_SETTINGS,
    enabled: true, emitToInputXml: true, screeningOnlyAcknowledged: true,
    diameterSource: 'explicit-od', explicitOutsideDiameterMm: 100,
    useFormulaMinimum: false, usePracticalMinimum: true,
    practicalRadiusMultiplierD: 1.5, minimumTurnAngleDeg: 0.1,
    maximumTurnAngleDeg: 179, retainedStraightAllowanceMm: 0,
    preferredStraightTangentMm: 0,
    ...overrides,
  });
}
function evidence(item) {
  return {
    bendClass: item.bendClass,
    classification: item.classification,
    planAngleDeg: item.planAngleDeg,
    profileAngleDeg: item.profileAngleDeg,
    turnAngleDeg: item.turnAngleDeg,
    radiusMm: item.radiusMm,
    tangentMm: item.tangentMm,
    incomingLengthMm: item.incomingLengthMm,
    outgoingLengthMm: item.outgoingLengthMm,
    previousNode: item.previousNode,
    cornerNode: item.cornerNode,
    nextNode: item.nextNode,
    curvatureNodes: item.curvatureNodes,
    status: item.status,
  };
}

const formula = calculateElasticBendScreening(settings({
  useFormulaMinimum: true, allowableBendingStressMpa: 207, practicalRadiusMultiplierD: 400,
}), {});
assert.equal(formula.formulaRadiusMm, 50000);
assert.equal(formula.practicalRadiusMm, 40000);
assert.equal(formula.governingRadiusMm, 50000);
assert.equal(formula.stressMpa, 207);

for (const [nps, expectedD] of [[6, 18], [12, 18], [14, 21], [16, 24], [18, 27], [20, 30], [36, 30]]) {
  assert.equal(b314NormalColdFieldRadiusD(nps), expectedD, `NPS ${nps}`);
}
assert.equal(b314NormalColdFieldRadiusD(15), null);

const normalColdField = resolveColdFieldBendPolicy({
  outsideDiameterMm: 500, nominalPipeSizeNps: 16,
  projectMinimumRadiusD: 40, procedureMinimumRadiusD: 35,
});
assert.equal(normalColdField.normalCodeRadiusD, 24);
assert.equal(normalColdField.selectedCodeRadiusD, 24);
assert.equal(normalColdField.governingRadiusD, 40);
assert.equal(normalColdField.governingRadiusMm, 20000);

const unqualified18D = resolveColdFieldBendPolicy({
  outsideDiameterMm: 500, nominalPipeSizeNps: 16,
  useProjectMinimum: false, useQualified18DAlternative: true,
});
assert.equal(unqualified18D.qualifiedAlternativeApplied, false);
assert.equal(unqualified18D.qualificationEvidenceRequired, true);
assert.equal(unqualified18D.selectedCodeRadiusD, 24);

const qualified18D = resolveColdFieldBendPolicy({
  outsideDiameterMm: 500, nominalPipeSizeNps: 16,
  useProjectMinimum: false, useQualified18DAlternative: true,
  qualificationEvidenceId: 'BP-16-TEST-BEND-001',
});
assert.equal(qualified18D.qualifiedAlternativeApplied, true);
assert.equal(qualified18D.selectedCodeRadiusD, 18);
assert.equal(qualified18D.governingRadiusD, 18);

const markerRoute = [
  point(0, 0, 0, 'vertex', 'A'),
  point(50, 0, 0, 'marker', 'PMS-001'),
  point(100, 0, 0, 'vertex', 'IP-1'),
  point(100, 100, 0, 'vertex', 'B'),
];
const markerRows = coordinateRows(markerRoute);
const horizontal = resolvePipelineElasticBends({
  points: markerRoute, coordinateRows: markerRows, branchInfo: {}, settings: settings(),
});
assert.equal(horizontal.schema, 'PipelineElasticBendResolution.v2');
assert.equal(horizontal.geometryRows.length, 3);
assert.equal(horizontal.diagnostics.excludedMarkerCount, 1);
assert.equal(horizontal.diagnostics.candidateCount, 1);
assert.equal(horizontal.diagnostics.emittedCount, 1);
assert.equal(horizontal.candidates[0].classification, 'HORIZONTAL');
assert.equal(horizontal.candidates[0].incomingElementIndex, 0);
assert.equal(horizontal.candidates[0].previousNode, 100);
assert.equal(horizontal.candidates[0].cornerNode, 110);
assert.equal(horizontal.candidates[0].nextNode, 120);
assert.equal(horizontal.candidates[0].incomingLengthMm, 100000);
assert.equal(horizontal.candidates[0].markerRowsExcludedBefore, 1);
assert.deepEqual(horizontal.candidates[0].curvatureNodes, [
  { angleDeg: 0, nodeNumber: 130, role: 'NEAR_POINT' },
  { angleDeg: 45, nodeNumber: 140, role: 'MIDPOINT' },
]);
assert.equal(horizontal.candidates[0].status, 'EMITTED');
assert.ok(horizontal.warnings.some((item) => item.code === 'bend_screening_only'));

const markerVariant = [
  point(0, 0, 0, 'vertex', 'A'),
  point(25, 0, 0, 'marker', '1.5M START'),
  point(50, 0, 0, 'marker', 'HL 14.7'),
  point(100, 0, 0, 'vertex', 'IP-1'),
  point(100, 100, 0, 'vertex', 'B'),
];
const variant = resolvePipelineElasticBends({
  points: markerVariant, coordinateRows: coordinateRows(markerVariant), settings: settings(),
});
assert.deepEqual(variant.geometryRows, horizontal.geometryRows, 'Marker insertion must not renumber or relabel InputXML geometry');
assert.deepEqual(variant.candidates.map(evidence), horizontal.candidates.map(evidence), 'Marker insertion must not alter bend evidence');

const verticalPoints = [
  point(0, 0, 0, 'table2', 'EL-1'),
  point(100, 0, 0, 'table2', 'EL-2'),
  point(200, 0, 10, 'table2', 'EL-3'),
];
const vertical = resolvePipelineElasticBends({ points: verticalPoints, coordinateRows: coordinateRows(verticalPoints), settings: settings() });
assert.equal(vertical.candidates[0].classification, 'VERTICAL');
assert.ok(vertical.candidates[0].profileAngleDeg > 5);
const changedProfile = [verticalPoints[0], verticalPoints[1], point(200, 0, 20, 'table2', 'EL-3')];
const changedVertical = resolvePipelineElasticBends({ points: changedProfile, coordinateRows: coordinateRows(changedProfile), settings: settings() });
assert.notEqual(changedVertical.candidates[0].profileAngleDeg, vertical.candidates[0].profileAngleDeg);

const compoundPoints = [point(0, 0, 0, 'vertex'), point(100, 0, 0, 'table2'), point(200, 100, 10, 'vertex')];
const compound = resolvePipelineElasticBends({ points: compoundPoints, coordinateRows: coordinateRows(compoundPoints), settings: settings() });
assert.equal(compound.candidates[0].classification, 'COMPOUND');

const infeasiblePoints = [point(0, 0, 0), point(10, 0, 0), point(10, 10, 0)];
const infeasible = resolvePipelineElasticBends({
  points: infeasiblePoints, coordinateRows: coordinateRows(infeasiblePoints),
  settings: settings({ practicalRadiusMultiplierD: 100, retainedStraightAllowanceMm: 2000 }),
});
assert.equal(infeasible.candidates[0].status, 'INFEASIBLE');
assert.equal(infeasible.hasBlockingErrors, true);
assert.equal(infeasible.errors[0].code, 'BEND_GEOMETRY_INFEASIBLE');
assert.throws(
  () => buildInputXmlPipingModelXml({}, infeasible.geometryRows, infeasible),
  (error) => error.code === 'BEND_GEOMETRY_INFEASIBLE',
);

const coldFieldPoints = [point(0, 0, 0), point(1000, 0, 0), point(1000, 1000, 0)];
const coldField = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({
    bendClass: 'cold-field', nominalPipeSizeNps: 16,
    useColdFieldProjectMinimum: true, coldFieldProjectRadiusMultiplierD: 40,
  }),
});
assert.equal(coldField.screening.coldFieldPolicy.normalCodeRadiusD, 24);
assert.equal(coldField.candidates[0].radiusD, 40);
assert.equal(coldField.candidates[0].status, 'EMITTED');

const missingQualification = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({
    bendClass: 'cold-field', nominalPipeSizeNps: 16,
    useColdFieldProjectMinimum: false, useQualified18DAlternative: true,
  }),
});
assert.equal(missingQualification.candidates[0].status, 'QUALIFICATION_REVIEW');
assert.equal(missingQualification.errors[0].code, 'COLD_FIELD_BEND_QUALIFICATION_REQUIRED');

const branchInfo = {
  branchName: 'PL-BEND', lineNo: 'PL-BEND', boreMm: '100', wallThickness: '6',
  insulationThickness: '0', corrosionAllowance: '0', t1: '120', t2: '90', t3: '5',
  p1: '10', materialCode: '106', fluidDensity: '100', insulationDensity: '0', hydroPressure: '15',
};
const xml = buildInputXmlPipingModelXml(branchInfo, horizontal.geometryRows, horizontal);
assert.equal((xml.match(/<PIPINGELEMENT\b/g) || []).length, 2);
assert.equal((xml.match(/<BEND\b/g) || []).length, 1);
const blocks = [...xml.matchAll(/<PIPINGELEMENT\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/PIPINGELEMENT>)/g)].map((match) => match[0]);
assert.match(blocks[0], /FROM_NODE="100" TO_NODE="110"[\s\S]*?<BEND RADIUS="150" TYPE="0"/);
assert.match(blocks[0], /ANGLE1="0" NODE1="130"/);
assert.match(blocks[0], /ANGLE2="45" NODE2="140"/);
assert.match(blocks[0], /ANGLE3="-1\.010100" NODE3="-1\.010100"/);
assert.match(blocks[0], /NUM_MITER="0"/);
assert.doesNotMatch(blocks[0], /NODE[123]="110"/);
assert.doesNotMatch(blocks[1], /<BEND\b/);
assert.equal(buildElasticBendLedgerText(horizontal).split('\n').length, 2);

const disabled = resolvePipelineElasticBends({ points: markerRoute, coordinateRows: markerRows, settings: {} });
assert.equal(disabled.candidates[0].status, 'DISABLED');
assert.equal(disabled.diagnostics.emittedCount, 0);
assert.doesNotMatch(buildInputXmlPipingModelXml(branchInfo, disabled.geometryRows, disabled), /<BEND\b/);

console.log('Pipeline authoritative bend core tests passed.');
