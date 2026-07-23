import assert from 'node:assert/strict';
import {
  PIPELINE_DIAMETER_SEMANTIC_REGISTRY,
  PIPELINE_DIAMETER_BASIS_IDS,
  createPipelineDiameterMigration,
  createPipelineAnalysisDiameterResolution,
  createPipelineElementDiameterResolution,
  createPipelineAnalysisDiameterPlan,
  parsePipelinePositiveScalar,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-diameter-contracts.js';

const frozen = (v) => !v || typeof v !== 'object'
  || (Object.isFrozen(v) && Object.values(v).every(frozen));
const migration = createPipelineDiameterMigration();
const section = (patch = {}) => createPipelineAnalysisDiameterResolution({
  analysisSectionId: 'AS1', startElementIndex: 0, profileId: 'normal-metallic', resolvedMode: 'NORMAL',
  outsideDiameterMm: 114.3, caesarDiameterMm: 114.3, ...patch,
});
const element = (patch = {}) => createPipelineElementDiameterResolution({
  elementIndex: 0, elementId: 'E1', analysisSectionId: 'AS1', profileId: 'normal-metallic',
  outsideDiameterMm: 114.3, caesarDiameterMm: 114.3, diameterDisposition: 'SECTION_START', ...patch,
});
const blocked = (value, code) => {
  assert.equal(value.ready, false);
  assert.ok(value.blockerCodes.includes(code), `${code} expected in ${value.blockerCodes}`);
};

assert.deepEqual(Object.values(PIPELINE_DIAMETER_BASIS_IDS), [
  'outside-diameter-mm', 'nominal-pipe-size-nps', 'gre-vendor-nominal-bore-mm',
]);
assert.equal(PIPELINE_DIAMETER_SEMANTIC_REGISTRY.ready, true);
assert.ok(frozen(PIPELINE_DIAMETER_SEMANTIC_REGISTRY));
assert.equal(migration.npsToOutsideDiameterConversionApplied, false);
assert.equal(migration.greVendorBoreToOutsideDiameterConversionApplied, false);

assert.equal(parsePipelinePositiveScalar(114.3), 114.3);
assert.equal(parsePipelinePositiveScalar(' 114.3 '), 114.3);
for (const value of [true, false, [114.3], { value: 114.3 }, '', ' ', 0, -1, NaN, Infinity]) {
  assert.equal(parsePipelinePositiveScalar(value), null);
}

assert.equal(section().ready, true);
blocked(section({ profileId: 'unknown-profile' }), 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE');
blocked(section({ profileId: 'Normal-Metallic' }), 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE');
blocked(section({ resolvedMode: 'GRE' }), 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE');
blocked(section({ outsideDiameterMm: null, caesarDiameterMm: null }), 'PIPELINE_OUTSIDE_DIAMETER_REQUIRED');
blocked(section({ profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4', outsideDiameterMm: null,
  caesarDiameterMm: null }), 'PIPELINE_OUTSIDE_DIAMETER_REQUIRED');
blocked(section({ profileId: 'gre', resolvedMode: 'GRE', outsideDiameterMm: null,
  caesarDiameterMm: null }), 'PIPELINE_GRE_VENDOR_BORE_REQUIRED');
blocked(section({ greVendorNominalBoreMm: 100 }), 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE');
blocked(section({ outsideDiameterMm: true, caesarDiameterMm: null }), 'PIPELINE_OUTSIDE_DIAMETER_INVALID');
blocked(section({ nominalPipeSizeNps: [8] }), 'PIPELINE_NPS_INVALID');
blocked(element({ profileId: 'UNKNOWN' }), 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE');
blocked(element({ profileId: 'gre', outsideDiameterMm: null, caesarDiameterMm: null }),
  'PIPELINE_GRE_VENDOR_BORE_REQUIRED');

const readyPlan = createPipelineAnalysisDiameterPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1', migration,
  sectionResolutions: [section()], elementResolutions: [element()],
});
assert.equal(readyPlan.ready, true);
assert.ok(frozen(readyPlan));
blocked(createPipelineAnalysisDiameterPlan({
  analysisSectionPlanSchema: 'Wrong.v1', propertySectionPlanSchema: 'Wrong.v1', migration,
  sectionResolutions: [section()], elementResolutions: [element()],
}), 'PIPELINE_DIAMETER_INPUT_INVALID');
const blockedMigration = createPipelineDiameterMigration({ blockerCodes: ['PIPELINE_DIAMETER_BASIS_UNCONFIRMED'] });
blocked(createPipelineAnalysisDiameterPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1', migration: blockedMigration,
  sectionResolutions: [section()], elementResolutions: [element()],
}), 'PIPELINE_DIAMETER_BASIS_UNCONFIRMED');
for (const partial of [{ sectionResolutions: [], elementResolutions: [] },
  { sectionResolutions: [section()] }, { elementResolutions: [element()] }]) {
  blocked(createPipelineAnalysisDiameterPlan({
    analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
    propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1', migration, ...partial,
  }), 'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID');
}
const greElement = element({ profileId: 'gre', outsideDiameterMm: null, caesarDiameterMm: null,
  greVendorNominalBoreMm: 100 });
blocked(createPipelineAnalysisDiameterPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1', migration,
  sectionResolutions: [section()], elementResolutions: [greElement],
}), 'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID');

console.log('Pipeline diameter semantic contract tests passed.');
