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
    designBasis: 'asme-b31.4', classificationMode: 'legacy-global', bendClass: 'elastic',
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
assert.equal(horizontal.schema, 'PipelineBendResolution.v3');
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

const adjacentPoints = [
  point(0, 0, 0), point(1, 0, 0),
  point(1, 0.25, 0), point(2, 0.25, 0),
];
const overlapping = resolvePipelineElasticBends({
  points: adjacentPoints, coordinateRows: coordinateRows(adjacentPoints), settings: settings(),
});
assert.equal(overlapping.candidates.length, 2);
assert.ok(overlapping.candidates.every((candidate) => candidate.localGeometryFits));
assert.ok(overlapping.candidates.every((candidate) => !candidate.sharedSegmentFits));
assert.ok(overlapping.candidates.every((candidate) => candidate.status === 'INFEASIBLE'));
assert.equal(overlapping.diagnostics.sharedSegmentFailureCount, 1);
assert.equal(overlapping.errors[0].code, 'BEND_SHARED_SEGMENT_INFEASIBLE');
assert.equal(overlapping.sharedSegmentFailures[0].availableLengthMm, 250);
assert.ok(overlapping.sharedSegmentFailures[0].requiredLengthMm > 299);
assert.throws(
  () => buildInputXmlPipingModelXml({}, overlapping.geometryRows, overlapping),
  (error) => error.code === 'BEND_SHARED_SEGMENT_INFEASIBLE',
);

const coldFieldPoints = [point(0, 0, 0), point(1000, 0, 0), point(1000, 1000, 0)];
const coldField = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({
    bendClass: 'cold-field', coldFieldRadiusMode: 'b31.4-size-band', nominalPipeSizeNps: 16,
    useColdFieldProjectMinimum: true, coldFieldProjectRadiusMultiplierD: 40,
  }),
});
assert.equal(coldField.screening.coldFieldPolicy.normalCodeRadiusD, 24);
assert.equal(coldField.candidates[0].radiusD, 40);
assert.equal(coldField.candidates[0].status, 'EMITTED');

const missingQualification = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({
    bendClass: 'cold-field', coldFieldRadiusMode: 'b31.4-size-band', nominalPipeSizeNps: 16,
    useColdFieldProjectMinimum: false, useQualified18DAlternative: true,
  }),
});
assert.equal(missingQualification.candidates[0].status, 'QUALIFICATION_REVIEW');
assert.equal(missingQualification.errors[0].code, 'COLD_FIELD_BEND_QUALIFICATION_REQUIRED');

const freshV3 = normalizeElasticBendSettings();
assert.deepEqual(
  [freshV3.designBasis, freshV3.bendClass, freshV3.standardRadiusMultiplierD],
  ['default-metallic', 'standard', 1.5],
);
const migratedV2 = normalizeElasticBendSettings({ schema: 'PipelineElasticBendSettings.v2', bendClass: 'cold-field' });
assert.deepEqual([migratedV2.designBasis, migratedV2.classificationMode], ['asme-b31.4', 'legacy-global']);
const autoSettings = { designBasis: 'asme-b31.4', classificationMode: 'source-authority-auto' };
const standardDefault = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({ designBasis: 'default-metallic', bendClass: 'standard' }),
});
assert.deepEqual([standardDefault.candidates[0].bendClass, standardDefault.candidates[0].radiusD], ['standard', 1.5]);
const autoCold40 = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({ ...autoSettings, coldFieldRadiusMode: 'project-multiplier', coldFieldRadiusMultiplierD: 40 }),
});
const autoCold60 = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints),
  settings: settings({ ...autoSettings, coldFieldRadiusMode: 'project-multiplier', coldFieldRadiusMultiplierD: 60 }),
});
assert.deepEqual([autoCold40.candidates[0].bendClass, autoCold40.candidates[0].radiusD], ['cold-field', 40]);
assert.ok(autoCold60.candidates[0].tangentMm > autoCold40.candidates[0].tangentMm);
const autoVertical = resolvePipelineElasticBends({
  points: verticalPoints, coordinateRows: coordinateRows(verticalPoints), settings: settings(autoSettings),
});
assert.equal(autoVertical.candidates[0].bendClass, 'elastic');
const autoCompoundPoints = [point(0, 0, 0), { ...point(100, 0, 0), sources: ['vertex', 'table2'] }, point(100, 100, 10)];
const autoCompound = resolvePipelineElasticBends({
  points: autoCompoundPoints, coordinateRows: coordinateRows(autoCompoundPoints), settings: settings(autoSettings),
});
assert.deepEqual([autoCompound.candidates[0].classification, autoCompound.candidates[0].bendClass], ['COMPOUND', 'cold-field']);
const falseZigzag = [point(0, 0, 0), point(100, 0, 0), point(100.2, 0.2, 0), point(200.2, 0.2, 0)];
const falseFiltered = resolvePipelineElasticBends({
  points: falseZigzag, coordinateRows: coordinateRows(falseZigzag),
  settings: settings({ ...autoSettings, shortElementAnglePolicy: 'ignore-below-length', minimumAngleElementLengthMm: 500 }),
});
assert.equal(falseFiltered.candidates.length, 0);
const shortTransition = [point(0, 0, 0), point(100, 0, 0), point(100.2, 0.2, 0), point(100.2, 100.2, 0)];
const shortFiltered = resolvePipelineElasticBends({
  points: shortTransition, coordinateRows: coordinateRows(shortTransition),
  settings: settings({ ...autoSettings, shortElementAnglePolicy: 'ignore-below-length', minimumAngleElementLengthMm: 500 }),
});
assert.equal(shortFiltered.geometryRows.length, 4);
assert.equal(shortFiltered.errors[0].code, 'SHORT_ELEMENT_BEND_OWNERSHIP_UNRESOLVED');
const grePlaceholder = resolvePipelineElasticBends({
  points: coldFieldPoints, coordinateRows: coordinateRows(coldFieldPoints), settings: settings({ designBasis: 'gre' }),
});
assert.equal(grePlaceholder.errors[0].code, 'GRE_BEND_POLICY_NOT_IMPLEMENTED');
assert.ok(!grePlaceholder.warnings.some((item) => item.code === 'elastic_bend_allowable_stress_missing'));

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
