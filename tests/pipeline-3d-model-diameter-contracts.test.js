import assert from 'node:assert/strict';
import {
  PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA,
  PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA,
  PIPELINE_DIAMETER_BASIS_IDS,
  PIPELINE_DIAMETER_BLOCKER_ORDER,
  PIPELINE_DIAMETER_MIGRATION_SCHEMA,
  PIPELINE_DIAMETER_SEMANTIC_REGISTRY,
  PIPELINE_DIAMETER_SEMANTIC_REGISTRY_SCHEMA,
  PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA,
  createPipelineAnalysisDiameterPlan,
  createPipelineAnalysisDiameterResolution,
  createPipelineDiameterMigration,
  createPipelineElementDiameterResolution,
  getPipelineDiameterSemanticDescriptor,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-diameter-contracts.js';

const IDS = ['outside-diameter-mm', 'nominal-pipe-size-nps', 'gre-vendor-nominal-bore-mm'];
function deepFrozen(value) {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(deepFrozen);
}

assert.equal(PIPELINE_DIAMETER_SEMANTIC_REGISTRY.schema, PIPELINE_DIAMETER_SEMANTIC_REGISTRY_SCHEMA);
assert.equal(PIPELINE_DIAMETER_SEMANTIC_REGISTRY.ready, true);
assert.deepEqual(Object.values(PIPELINE_DIAMETER_BASIS_IDS), IDS);
assert.deepEqual(PIPELINE_DIAMETER_SEMANTIC_REGISTRY.descriptors.map((item) => item.basisId), IDS);
assert.equal(getPipelineDiameterSemanticDescriptor('outside-diameter-mm').physicalMeasurement, true);
assert.equal(getPipelineDiameterSemanticDescriptor('outside-diameter-mm').caesarDiameterEligible, true);
assert.equal(getPipelineDiameterSemanticDescriptor('nominal-pipe-size-nps').sizeBandInputEligible, true);
assert.equal(getPipelineDiameterSemanticDescriptor('nominal-pipe-size-nps').physicalMeasurement, false);
assert.equal(getPipelineDiameterSemanticDescriptor('gre-vendor-nominal-bore-mm').vendorSeriesInputEligible, true);
assert.equal(getPipelineDiameterSemanticDescriptor('Outside-Diameter-MM'), null);
assert.equal(getPipelineDiameterSemanticDescriptor('NOMINAL-PIPE-SIZE-NPS'), null);
assert.deepEqual(PIPELINE_DIAMETER_BLOCKER_ORDER, [
  'PIPELINE_DIAMETER_INPUT_INVALID', 'PIPELINE_DIAMETER_BASIS_INVALID',
  'PIPELINE_DIAMETER_BASIS_UNCONFIRMED', 'PIPELINE_OUTSIDE_DIAMETER_REQUIRED',
  'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'PIPELINE_OUTSIDE_DIAMETER_CONFLICT',
  'PIPELINE_NPS_INVALID', 'PIPELINE_GRE_VENDOR_BORE_REQUIRED',
  'PIPELINE_GRE_VENDOR_BORE_INVALID', 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE',
  'PIPELINE_DIAMETER_SOURCE_CONFLICT', 'PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION',
  'PIPELINE_DIAMETER_PROPERTY_MISMATCH', 'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID',
]);

const migration = createPipelineDiameterMigration({
  outsideDiameterSourceKinds: ['EXPLICIT_GLOBAL', 'EXPLICIT_GLOBAL'],
  nominalPipeSizeSourceKinds: ['SETTINGS_SEMANTIC_INPUT'],
  greVendorNominalBoreSourceKinds: [], legacyDiameterEvidenceObserved: true,
  legacyDiameterBasisConfirmed: false, sourceAuthority: 'TEST', sourceReference: 'case-1',
});
assert.equal(migration.schema, PIPELINE_DIAMETER_MIGRATION_SCHEMA);
assert.deepEqual(migration.outsideDiameterSourceKinds, ['EXPLICIT_GLOBAL']);
assert.equal(migration.npsToOutsideDiameterConversionApplied, false);
assert.equal(migration.greVendorBoreToOutsideDiameterConversionApplied, false);

const section = createPipelineAnalysisDiameterResolution({
  analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL',
  startElementIndex: 0, outsideDiameterMm: 114.3, nominalPipeSizeNps: 4,
  greVendorNominalBoreMm: null, caesarDiameterMm: 114.3,
  sourceKind: 'EXPLICIT_GLOBAL', quantitySources: {},
});
assert.equal(section.schema, PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA);
assert.equal(section.physicalDiameterReady, true);
assert.equal(section.sizeBandInputReady, true);
assert.equal(section.vendorSeriesInputReady, false);
assert.equal(section.ready, true);

const element = createPipelineElementDiameterResolution({
  elementIndex: 0, elementId: 'E1', analysisSectionId: 'AS1', profileId: 'normal-metallic',
  outsideDiameterMm: 114.3, nominalPipeSizeNps: 4, caesarDiameterMm: 114.3,
  propertyDiameterMm: 114.3, diameterDisposition: 'SECTION_START', sourceKind: 'EXPLICIT_GLOBAL',
});
assert.equal(element.schema, PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA);
assert.equal(element.ready, true);

const plan = createPipelineAnalysisDiameterPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1', migration,
  sectionResolutions: [section], elementResolutions: [element],
});
assert.equal(plan.schema, PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA);
assert.equal(plan.ready, true);
assert.ok(deepFrozen(plan));
assert.doesNotThrow(() => JSON.parse(JSON.stringify(plan)));

const mismatch = createPipelineAnalysisDiameterResolution({
  analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL',
  startElementIndex: 0, outsideDiameterMm: 114.3, caesarDiameterMm: 100,
});
assert.equal(mismatch.ready, false);
assert.deepEqual(mismatch.blockerCodes, ['PIPELINE_DIAMETER_BASIS_INVALID']);

const unsafe = createPipelineAnalysisDiameterPlan({ invalid: new Date(0) });
assert.equal(unsafe.ready, false);
assert.ok(unsafe.blockerCodes.includes('PIPELINE_DIAMETER_INPUT_INVALID'));
assert.ok(deepFrozen(PIPELINE_DIAMETER_SEMANTIC_REGISTRY));
assert.equal(JSON.stringify(plan), JSON.stringify(createPipelineAnalysisDiameterPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1', migration,
  sectionResolutions: [section], elementResolutions: [element],
})));

console.log('Pipeline diameter semantic contract tests passed.');
