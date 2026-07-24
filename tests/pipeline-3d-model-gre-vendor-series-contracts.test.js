import assert from 'node:assert/strict';
import {
  PIPELINE_GRE_VENDOR_POLICY_IDS,
  PIPELINE_GRE_VENDOR_SERIES_POLICY_REGISTRY,
  createPipelineGreVendorSeriesElementResolution,
  createPipelineGreVendorSeriesMigration,
  createPipelineGreVendorSeriesPlan,
  createPipelineGreVendorSeriesSectionResolution,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-vendor-series-contracts.js';

assert.deepEqual(PIPELINE_GRE_VENDOR_SERIES_POLICY_REGISTRY.descriptors.map((item) => item.componentPolicyId), [
  'gre-vendor-qualified-bend',
  'gre-vendor-qualified-tee',
]);
assert.equal(PIPELINE_GRE_VENDOR_SERIES_POLICY_REGISTRY.ready, true);
assert.equal(Object.isFrozen(PIPELINE_GRE_VENDOR_SERIES_POLICY_REGISTRY.descriptors[0]), true);

const base = {
  analysisSectionId: 'AS1', startElementIndex: 0, profileId: 'gre',
  vendorId: 'VENDOR-A', seriesId: 'SERIES-254', qualificationEvidenceId: 'QUAL-1',
  requirementReference: 'REQ-550', greVendorNominalBoreMm: 254,
  bendPolicyId: PIPELINE_GRE_VENDOR_POLICY_IDS.BEND, bendRadiusMm: 762,
  bendBreakLengthBasis: 'NOMINAL_BORE_MULTIPLIER', bendBreakMultiplierBore: 1.5,
  bendBreakLengthMm: 381, bendLocalThicknessMm: 12,
  teePolicyId: PIPELINE_GRE_VENDOR_POLICY_IDS.TEE, teeBreakLengthBasis: 'EXPLICIT_LENGTH',
  teeBreakLengthMm: 300, teeLocalThicknessMm: 14,
  sourceKind: 'EXPLICIT_ANALYSIS_SECTION_VENDOR_SERIES', sourceAuthority: 'PROJECT', sourceReference: 'VS-1',
};
const multiplier = createPipelineGreVendorSeriesSectionResolution(base);
assert.equal(multiplier.ready, true);
assert.equal(multiplier.bendBreakLengthMm, 381);
assert.equal(Object.isFrozen(multiplier), true);

const explicit = createPipelineGreVendorSeriesSectionResolution({
  ...base, bendBreakLengthBasis: 'EXPLICIT_LENGTH', bendBreakMultiplierBore: null, bendBreakLengthMm: 425,
});
assert.equal(explicit.ready, true);
assert.equal(explicit.bendBreakMultiplierBore, null);

const wrongMultiplier = createPipelineGreVendorSeriesSectionResolution({ ...base, bendBreakLengthMm: 400 });
assert.equal(wrongMultiplier.ready, false);
assert.ok(wrongMultiplier.blockerCodes.includes('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID'));

const explicitWithMultiplier = createPipelineGreVendorSeriesSectionResolution({
  ...explicit, bendBreakMultiplierBore: 1.5,
});
assert.equal(explicitWithMultiplier.ready, false);
assert.ok(explicitWithMultiplier.blockerCodes.includes('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID'));

const missingQualification = createPipelineGreVendorSeriesSectionResolution({ ...base, qualificationEvidenceId: '' });
assert.ok(missingQualification.blockerCodes.includes('PIPELINE_GRE_VENDOR_QUALIFICATION_REQUIRED'));
const missingRequirement = createPipelineGreVendorSeriesSectionResolution({ ...base, requirementReference: '' });
assert.ok(missingRequirement.blockerCodes.includes('PIPELINE_GRE_VENDOR_REQUIREMENT_REFERENCE_REQUIRED'));
const invalidTee = createPipelineGreVendorSeriesSectionResolution({ ...base, teeBreakLengthBasis: 'NOMINAL_BORE' });
assert.ok(invalidTee.blockerCodes.includes('PIPELINE_GRE_VENDOR_TEE_INPUT_INVALID'));
const invalidBendRadius = createPipelineGreVendorSeriesSectionResolution({ ...base, bendRadiusMm: null });
assert.ok(invalidBendRadius.blockerCodes.includes('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID'));
const invalidBendThickness = createPipelineGreVendorSeriesSectionResolution({ ...base, bendLocalThicknessMm: null });
assert.ok(invalidBendThickness.blockerCodes.includes('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID'));
const invalidTeeLength = createPipelineGreVendorSeriesSectionResolution({ ...base, teeBreakLengthMm: null });
assert.ok(invalidTeeLength.blockerCodes.includes('PIPELINE_GRE_VENDOR_TEE_INPUT_INVALID'));
const invalidTeeThickness = createPipelineGreVendorSeriesSectionResolution({ ...base, teeLocalThicknessMm: null });
assert.ok(invalidTeeThickness.blockerCodes.includes('PIPELINE_GRE_VENDOR_TEE_INPUT_INVALID'));

const diagnosticOnlyBlocked = createPipelineGreVendorSeriesSectionResolution({
  analysisSectionId: 'AS1', startElementIndex: 0, profileId: 'gre', greVendorNominalBoreMm: 254,
  sourceKind: 'UNRESOLVED', status: 'BLOCKED',
  diagnostics: [{ severity: 'BLOCKING', code: 'PIPELINE_GRE_VENDOR_AUTHORITY_UNRESOLVED', message: 'blocked', details: {} }],
});
assert.equal(diagnosticOnlyBlocked.ready, false);
assert.equal(diagnosticOnlyBlocked.blockerCodes.includes('PIPELINE_GRE_VENDOR_IDENTITY_INVALID'), false);

const element = createPipelineGreVendorSeriesElementResolution({
  elementIndex: 0, elementId: 'E1', analysisSectionId: 'AS1', profileId: 'gre',
  vendorId: 'VENDOR-A', seriesId: 'SERIES-254', greVendorNominalBoreMm: 254,
  sectionDisposition: 'SECTION_START', sourceKind: 'EXPLICIT_ANALYSIS_SECTION_VENDOR_SERIES',
});
assert.equal(element.ready, true);
assert.equal(Object.isFrozen(element), true);

const migration = createPipelineGreVendorSeriesMigration({
  sourceKinds: ['EXPLICIT_ANALYSIS_SECTION_VENDOR_SERIES'], legacyEvidenceObserved: false,
});
assert.equal(migration.ready, true);
const plan = createPipelineGreVendorSeriesPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1',
  grePlaceholderSchema: 'PipelineGreFittingPlaceholder.v1', migration,
  sectionResolutions: [multiplier], elementResolutions: [element],
  notApplicableAnalysisSectionIds: ['AS2'],
});
assert.equal(plan.ready, true);
assert.equal(Object.isFrozen(plan.sectionResolutions), true);
assert.doesNotThrow(() => JSON.stringify(plan));

assert.doesNotThrow(() => createPipelineGreVendorSeriesPlan({ sectionResolutions: [null], elementResolutions: {},
  notApplicableAnalysisSectionIds: [] }));
assert.equal(createPipelineGreVendorSeriesPlan({ sectionResolutions: [null], elementResolutions: {},
  notApplicableAnalysisSectionIds: [] }).ready, false);

console.log('pipeline-3d-model GRE vendor-series contracts: PASS');
