import assert from 'node:assert/strict';
import {
  PIPELINE_B314_RADIUS_POLICY_IDS,
  PIPELINE_B314_RADIUS_POLICY_REGISTRY,
  PIPELINE_B314_RADIUS_PLAN_SCHEMA,
  createPipelineB314RadiusMigration,
  createPipelineB314RadiusPlan,
  createPipelineB314RadiusResolution,
  getPipelineB314RadiusPolicy,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-b314-radius-contracts.js';

const base = Object.freeze({
  candidateId: 'bend:110', incomingElementIndex: 0, incomingElementId: 'E1',
  outgoingElementIndex: 1, outgoingElementId: 'E2', analysisSectionId: 'AS1',
  profileId: 'asme-b31.4', cornerNode: 110, previousNode: 100, nextNode: 120,
  geometricClass: 'VERTICAL', turnAngleDeg: 5, sourceBasis: 'TABLE_2_PROFILE_ONLY',
  bendClass: 'elastic', outsideDiameterMm: 508, nominalPipeSizeNps: 20,
  sizeBandInputReady: true, candidateStatus: 'READY_NOT_EMITTED', sourceKind: 'EXPLICIT_GLOBAL_B31_4_POLICY',
  sourceAuthority: 'TEST', sourceReference: 'contracts',
});
function elastic(overrides = {}) {
  const formulaRadiusD = 207000 / (2 * 100), formulaRadiusMm = formulaRadiusD * 508;
  const practicalRadiusD = 500, practicalRadiusMm = practicalRadiusD * 508;
  const governingRadiusMm = Math.max(formulaRadiusMm, practicalRadiusMm);
  return createPipelineB314RadiusResolution({ ...base,
    radiusPolicyId: 'b31.4-elastic-screening', radiusBasis: 'B31_4_ELASTIC_GOVERNING',
    formulaEnabled: true, youngsModulusMpa: 207000, allowableBendingStressMpa: 100,
    formulaRadiusD, formulaRadiusMm, practicalEnabled: true, practicalRadiusD, practicalRadiusMm,
    governingRadiusD: governingRadiusMm / 508, governingRadiusMm,
    observedCandidateRadiusD: governingRadiusMm / 508, observedCandidateRadiusMm: governingRadiusMm,
    candidateRadiusDisposition: 'MATCHES_AUTHORITY', geometryRecheckRequired: false, ...overrides });
}

assert.deepEqual(PIPELINE_B314_RADIUS_POLICY_REGISTRY.descriptors.map((item) => item.radiusPolicyId), [
  'b31.4-elastic-screening', 'b31.4-cold-field-size-band', 'b31.4-cold-field-project-radius-d',
]);
assert.equal(PIPELINE_B314_RADIUS_POLICY_REGISTRY.ready, true);
assert.equal(getPipelineB314RadiusPolicy(PIPELINE_B314_RADIUS_POLICY_IDS.ELASTIC_SCREENING).bendClass, 'elastic');
assert.equal(getPipelineB314RadiusPolicy('B31.4-elastic-screening'), null);
assert.ok(Object.isFrozen(PIPELINE_B314_RADIUS_POLICY_REGISTRY));
assert.ok(Object.isFrozen(PIPELINE_B314_RADIUS_POLICY_REGISTRY.descriptors));

const validElastic = elastic();
assert.equal(validElastic.ready, true);
assert.equal(validElastic.status, 'RESOLVED');
assert.ok(Object.isFrozen(validElastic));
assert.ok(Object.isFrozen(validElastic.diagnostics));
assert.equal(JSON.stringify(validElastic), JSON.stringify(elastic()));

for (const invalid of [
  elastic({ radiusPolicyId: 'unknown' }),
  elastic({ radiusPolicyId: 'B31.4-elastic-screening' }),
  elastic({ bendClass: 'cold-field' }),
  elastic({ formulaRadiusD: 12 }),
  elastic({ practicalRadiusMm: 1 }),
  elastic({ formulaEnabled: false, practicalEnabled: false }),
]) assert.equal(invalid.ready, false);

const sizeBand = createPipelineB314RadiusResolution({ ...base, candidateId: 'bend:130', incomingElementIndex: 2,
  incomingElementId: 'E3', outgoingElementIndex: 3, outgoingElementId: 'E4', previousNode: 120,
  cornerNode: 130, nextNode: 140, bendClass: 'cold-field', geometricClass: 'HORIZONTAL',
  sourceBasis: 'TABLE_1_PLAN', radiusPolicyId: 'b31.4-cold-field-size-band',
  radiusBasis: 'B31_4_COLD_FIELD_SIZE_BAND_GOVERNING', normalCodeRadiusD: 30,
  qualifiedAlternativeRequested: true, qualificationEligible: true, qualificationEvidenceId: 'WPQ-1',
  qualifiedAlternativeApplied: true, selectedCodeRadiusD: 18, projectMinimumEnabled: true,
  projectMinimumRadiusD: 25, procedureMinimumRadiusD: 28, governingRadiusD: 28, governingRadiusMm: 14224,
  observedCandidateRadiusD: 28, observedCandidateRadiusMm: 14224,
  candidateRadiusDisposition: 'MATCHES_AUTHORITY', geometryRecheckRequired: false });
assert.equal(sizeBand.ready, true);
assert.equal(createPipelineB314RadiusResolution({ ...sizeBand, normalCodeRadiusD: 21 }).ready, false);
assert.equal(createPipelineB314RadiusResolution({ ...sizeBand, qualificationEvidenceId: '', qualifiedAlternativeApplied: false }).ready, false);

const project = createPipelineB314RadiusResolution({ ...base, bendClass: 'cold-field', geometricClass: 'HORIZONTAL',
  radiusPolicyId: 'b31.4-cold-field-project-radius-d', radiusBasis: 'B31_4_COLD_FIELD_PROJECT_RADIUS_D',
  projectRadiusD: 40, governingRadiusD: 40, governingRadiusMm: 20320,
  observedCandidateRadiusD: 40, observedCandidateRadiusMm: 20320,
  candidateRadiusDisposition: 'MATCHES_AUTHORITY', geometryRecheckRequired: false });
assert.equal(project.ready, true);
assert.equal(createPipelineB314RadiusResolution({ ...project, governingRadiusD: 30 }).ready, false);

assert.equal(createPipelineB314RadiusResolution({ ...validElastic, observedCandidateRadiusD: 10,
  observedCandidateRadiusMm: validElastic.governingRadiusMm }).blockerCodes.includes('PIPELINE_B314_RADIUS_OBSERVED_BASIS_CONFLICT'), true);
assert.equal(createPipelineB314RadiusResolution({ ...validElastic, candidateStatus: 'EMITTED',
  observedCandidateRadiusD: 1, observedCandidateRadiusMm: 508,
  candidateRadiusDisposition: 'REQUIRES_RECOMPUTE', geometryRecheckRequired: true })
  .blockerCodes.includes('PIPELINE_B314_RADIUS_EMITTED_RADIUS_CONFLICT'), true);

const migration = createPipelineB314RadiusMigration({ sourceKinds: ['B', 'A'], legacyEvidenceObserved: true,
  legacyB314RadiusBasisConfirmed: true, sourceAuthority: 'TEST' });
assert.deepEqual(migration.sourceKinds, ['A', 'B']);
assert.ok(Object.isFrozen(migration));
assert.equal(createPipelineB314RadiusMigration({ legacySettingsNpsObserved: [20] }).ready, false);

const plan = createPipelineB314RadiusPlan({ analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1', bendResolutionSchema: 'PipelineBendResolution.v3',
  migration, radiusResolutions: [validElastic], notApplicableCandidateIds: ['bend:300'] });
assert.equal(plan.schema, PIPELINE_B314_RADIUS_PLAN_SCHEMA);
assert.equal(plan.ready, true);
assert.ok(Object.isFrozen(plan.radiusResolutions));
assert.equal(createPipelineB314RadiusPlan({ ...plan, analysisSectionPlanSchema: 'Wrong.v1' }).ready, false);
assert.equal(createPipelineB314RadiusPlan({ ...plan, radiusResolutions: [validElastic, validElastic] }).ready, false);
assert.equal(createPipelineB314RadiusPlan({ ...plan, notApplicableCandidateIds: ['bend:300', 'bend:300'] }).ready, false);
assert.doesNotThrow(() => createPipelineB314RadiusPlan({ radiusResolutions: {}, notApplicableCandidateIds: null }));
console.log('pipeline-3d-model B31.4 radius contracts: PASS');
