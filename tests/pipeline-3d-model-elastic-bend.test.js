import assert from 'node:assert/strict';
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
    branchName: 'PL-ELASTIC', nodeNumber: 100 + index * 10,
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
    maximumTurnAngleDeg: 179, maximumTangentUtilization: 0.45,
    ...overrides,
  });
}

const formula = calculateElasticBendScreening(settings({
  useFormulaMinimum: true, allowableBendingStressMpa: 207, practicalRadiusMultiplierD: 400,
}), {});
assert.equal(formula.formulaRadiusMm, 50000);
assert.equal(formula.practicalRadiusMm, 40000);
assert.equal(formula.governingRadiusMm, 50000);
assert.equal(formula.stressMpa, 207);

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
assert.equal(horizontal.diagnostics.candidateCount, 1);
assert.equal(horizontal.diagnostics.emittedCount, 1);
assert.equal(horizontal.candidates[0].classification, 'HORIZONTAL');
assert.equal(horizontal.candidates[0].incomingElementIndex, 1);
assert.equal(horizontal.candidates[0].previousNode, 110);
assert.equal(horizontal.candidates[0].cornerNode, 120);
assert.equal(horizontal.candidates[0].incomingLengthMm, 50000);
assert.equal(horizontal.candidates[0].markerSplitBefore, true);
assert.equal(horizontal.candidates[0].status, 'EMITTED');
assert.ok(horizontal.warnings.some((item) => item.code === 'elastic_bend_screening_only'));

const renamedMarker = markerRoute.map((item, index) => index === 1 ? { ...item, label: 'PMS-RENAMED' } : item);
const renamed = resolvePipelineElasticBends({
  points: renamedMarker, coordinateRows: coordinateRows(renamedMarker), branchInfo: {}, settings: settings(),
});
const evidence = ({ classification, planAngleDeg, profileAngleDeg, turnAngleDeg, radiusMm, tangentMm, status }) => ({ classification, planAngleDeg, profileAngleDeg, turnAngleDeg, radiusMm, tangentMm, status });
assert.deepEqual(renamed.candidates.map(evidence), horizontal.candidates.map(evidence), 'Table 3 marker naming must not alter bend evidence');

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
  settings: settings({ practicalRadiusMultiplierD: 500 }),
});
assert.equal(infeasible.candidates[0].status, 'INFEASIBLE');
assert.equal(infeasible.diagnostics.emittedCount, 0);
assert.ok(infeasible.warnings.some((item) => item.code === 'elastic_bend_radius_does_not_fit'));

const unconfirmedPoints = [point(0, 0, 0), point(100, 0, 0), point(100, 100, 0)];
const unconfirmed = resolvePipelineElasticBends({
  points: unconfirmedPoints, coordinateRows: coordinateRows(unconfirmedPoints), branchInfo: { boreMm: '100' },
  settings: settings({ diameterSource: 'branch-diameter', explicitOutsideDiameterMm: '', diameterBasisConfirmed: false }),
});
assert.equal(unconfirmed.candidates[0].status, 'DIAMETER_REVIEW');
assert.equal(unconfirmed.diagnostics.emittedCount, 0);
assert.ok(unconfirmed.warnings.some((item) => item.code === 'elastic_bend_diameter_basis_unconfirmed'));

const branchInfo = {
  branchName: 'PL-ELASTIC', lineNo: 'PL-ELASTIC', boreMm: '100', wallThickness: '6',
  insulationThickness: '0', corrosionAllowance: '0', t1: '120', t2: '90', t3: '5',
  p1: '10', materialCode: '106', fluidDensity: '100', insulationDensity: '0', hydroPressure: '15',
};
const xml = buildInputXmlPipingModelXml(branchInfo, markerRows, horizontal);
assert.equal((xml.match(/<PIPINGELEMENT\b/g) || []).length, markerRows.length - 1);
assert.equal((xml.match(/<BEND\b/g) || []).length, 1);
const blocks = [...xml.matchAll(/<PIPINGELEMENT\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/PIPINGELEMENT>)/g)].map((match) => match[0]);
assert.equal(blocks.length, 3);
assert.doesNotMatch(blocks[0], /<BEND\b/);
assert.match(blocks[1], /FROM_NODE="110" TO_NODE="120"[\s\S]*?<BEND RADIUS="150" TYPE="0"/);
assert.doesNotMatch(blocks[2], /<BEND\b/);
assert.equal(buildElasticBendLedgerText(horizontal).split('\n').length, 2);

const disabled = resolvePipelineElasticBends({ points: markerRoute, coordinateRows: markerRows, settings: {} });
assert.equal(disabled.candidates[0].status, 'DISABLED');
assert.equal(disabled.diagnostics.emittedCount, 0);
assert.doesNotMatch(buildInputXmlPipingModelXml(branchInfo, markerRows, disabled), /<BEND\b/);

console.log('Pipeline elastic bend core tests passed.');
