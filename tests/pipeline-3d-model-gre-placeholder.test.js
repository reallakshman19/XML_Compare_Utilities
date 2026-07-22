import assert from 'node:assert/strict';
import {
  DEFAULT_ELASTIC_BEND_SETTINGS,
  normalizeElasticBendSettings,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-elastic-bend-settings.js';
import { resolveGreFittingPlaceholder } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-placeholder.js';
import {
  buildElasticBendLedgerText,
  resolvePipelineElasticBends,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-elastic-bend.js';
import { calculateElasticBendScreening } from '../tabs/pipeline-3d-model/pipeline-3d-model-bend-screening.js';
import { bendPolicyHtml } from '../tabs/pipeline-3d-model/pipeline-3d-model-elastic-bend-ui-policy-view.js';
import { buildInputXmlPipingModelXml } from '../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js';

function point(x, y, z, source = 'vertex') {
  return { x, y, z, source, sources: [source], label: '' };
}

function rows(points) {
  return points.map((item, index) => ({
    branchName: 'B1',
    nodeNumber: 100 + index * 10,
    x: item.x * 1000,
    y: item.y * 1000,
    z: item.z * 1000,
    nodeName: '',
  }));
}

const fresh = normalizeElasticBendSettings();
assert.equal(fresh.designBasis, 'default-metallic');
assert.equal(fresh.requestedDesignBasis, '');
assert.equal(fresh.profileFallbackApplied, true);
assert.equal(fresh.profileResolutionReason, 'PROFILE_NOT_SPECIFIED');

const normal = normalizeElasticBendSettings({ designBasis: 'default-metallic' });
assert.equal(normal.profileFallbackApplied, false);
assert.equal(normal.profileResolutionReason, 'EXPLICIT_NORMAL');

const unknown = normalizeElasticBendSettings({ designBasis: 'not-supported' });
assert.equal(unknown.designBasis, 'default-metallic');
assert.equal(unknown.requestedDesignBasis, 'not-supported');
assert.equal(unknown.profileFallbackApplied, true);
assert.equal(unknown.profileResolutionReason, 'UNRECOGNIZED_PROFILE_FALLBACK');

const greSettings = normalizeElasticBendSettings({
  ...DEFAULT_ELASTIC_BEND_SETTINGS,
  enabled: true,
  emitToInputXml: true,
  screeningOnlyAcknowledged: true,
  designBasis: 'gre',
  diameterSource: 'explicit-od',
  explicitOutsideDiameterMm: 114.3,
  greNominalBoreMm: 100,
  greBendRadiusMm: 500,
  greBendBreakMultiplierBore: 1.5,
  greBendLocalThicknessMm: 12,
  greTeeBreakLengthMm: 275,
  greTeeLocalThicknessMm: 15,
  greRequirementReference: 'GRE-VENDOR-REQ-001',
  maximumTurnAngleDeg: 179,
  preferredStraightTangentMm: 0,
});
const placeholder = resolveGreFittingPlaceholder(greSettings);
assert.equal(placeholder.active, true);
assert.equal(placeholder.policyReady, false);
assert.equal(placeholder.resolverReady, false);
assert.equal(placeholder.bend.nominalBoreMm, 100);
assert.equal(placeholder.bend.breakLengthBasis, 'NOMINAL_BORE');
assert.equal(placeholder.bend.breakLengthMm, 150);
assert.notEqual(placeholder.bend.breakLengthMm, 1.5 * 114.3);
assert.equal(placeholder.bend.radiusMm, 500);
assert.equal(placeholder.bend.localThicknessMm, 12);
assert.equal(placeholder.tee.breakLengthBasis, 'CUSTOM_LENGTH');
assert.equal(placeholder.tee.breakLengthMm, 275);
assert.equal(placeholder.tee.localThicknessMm, 15);
assert.equal(placeholder.geometryApplied, false);
assert.equal(placeholder.inputXmlApplied, false);

const screening = calculateElasticBendScreening(greSettings, { boreMm: 114.3 });
assert.equal(screening.policyReady, false);
assert.equal(screening.governingRadiusMm, null);
assert.equal(screening.grePlaceholder.bend.breakLengthMm, 150);
assert.ok(screening.warnings.some((item) => item.code === 'gre_bend_policy_placeholder'));
assert.ok(!screening.warnings.some((item) => item.code === 'bend_diameter_basis_unconfirmed'));

const fallbackScreening = calculateElasticBendScreening({ enabled: true }, { boreMm: 100 });
assert.ok(fallbackScreening.warnings.some((item) => item.code === 'pipeline_mode_defaulted_to_normal'));
const unknownScreening = calculateElasticBendScreening({ enabled: true, designBasis: 'bad-mode' }, { boreMm: 100 });
assert.ok(unknownScreening.warnings.some((item) => item.code === 'pipeline_mode_unrecognized_fallback'));

const html = bendPolicyHtml();
assert.match(html, /Normal — default, standard 1\.5D/);
assert.match(html, /greNominalBoreMm/);
assert.match(html, /greBendLocalThicknessMm/);
assert.match(html, /greTeeBreakLengthMm/);
assert.match(html, /1\.5 × 100 = 150 mm even when OD is 114\.3 mm/);

const geometry = [point(0, 0, 0), point(100, 0, 0), point(100, 100, 0)];
const common = {
  enabled: true,
  emitToInputXml: true,
  screeningOnlyAcknowledged: true,
  diameterSource: 'explicit-od',
  explicitOutsideDiameterMm: 100,
  diameterBasisConfirmed: true,
  maximumTurnAngleDeg: 179,
  preferredStraightTangentMm: 0,
};
const normalResolution = resolvePipelineElasticBends({
  points: geometry,
  coordinateRows: rows(geometry),
  settings: common,
});
assert.equal(normalResolution.candidates[0].radiusMm, 150);
assert.equal(normalResolution.candidates[0].status, 'EMITTED');
assert.match(
  buildInputXmlPipingModelXml({ boreMm: 100 }, normalResolution.geometryRows, normalResolution),
  /BEND RADIUS="150"/,
);

const b314 = resolvePipelineElasticBends({
  points: geometry,
  coordinateRows: rows(geometry),
  settings: {
    ...common,
    designBasis: 'asme-b31.4',
    classificationMode: 'source-authority-auto',
    coldFieldRadiusMultiplierD: 40,
  },
});
assert.equal(b314.candidates[0].bendClass, 'cold-field');
assert.equal(b314.candidates[0].radiusD, 40);

const greResolution = resolvePipelineElasticBends({
  points: geometry,
  coordinateRows: rows(geometry),
  settings: greSettings,
});
assert.equal(greResolution.screening.grePlaceholder.bend.breakLengthMm, 150);
assert.equal(greResolution.candidates[0].status, 'GRE_POLICY_PLACEHOLDER');
assert.equal(greResolution.errors[0].code, 'GRE_BEND_POLICY_NOT_IMPLEMENTED');
assert.throws(
  () => buildInputXmlPipingModelXml({}, greResolution.geometryRows, greResolution),
  (error) => error.code === 'GRE_BEND_POLICY_NOT_IMPLEMENTED',
);

const ledger = buildElasticBendLedgerText(greResolution);
const [header, row] = ledger.split('\n');
assert.match(header, /RequestedDesignBasis/);
assert.match(header, /GreBendBreakBasis/);
assert.match(header, /GreTeeBreakBasis/);
assert.match(row, /GRE-VENDOR-REQ-001/);
assert.match(row, /150\.000/);
assert.match(row, /NOMINAL_BORE/);
assert.match(row, /CUSTOM_LENGTH/);
assert.match(row, /\tNO\tNO$/);

console.log('Pipeline GRE placeholder Phase 1 tests passed.');
