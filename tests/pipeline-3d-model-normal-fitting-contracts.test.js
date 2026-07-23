import assert from 'node:assert/strict';
import {
  PIPELINE_NORMAL_FITTING_POLICY_REGISTRY,
  PIPELINE_NORMAL_FITTING_POLICY_IDS,
  createPipelineNormalFittingPlan,
  createPipelineNormalFittingResolution,
  getPipelineNormalFittingPolicy,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-normal-fitting-contracts.js';

assert.equal(PIPELINE_NORMAL_FITTING_POLICY_REGISTRY.ready, true);
assert.deepEqual(PIPELINE_NORMAL_FITTING_POLICY_REGISTRY.descriptors.map((item) => item.fittingPolicyId),
  ['normal-standard-elbow', 'normal-explicit-radius-bend']);
assert.equal(getPipelineNormalFittingPolicy('NORMAL-STANDARD-ELBOW'), null);
assert.equal(getPipelineNormalFittingPolicy(PIPELINE_NORMAL_FITTING_POLICY_IDS.STANDARD_ELBOW).fittingKind, 'STANDARD_ELBOW');

const base = {
  candidateId: 'bend:110', incomingElementIndex: 0, incomingElementId: 'E1',
  outgoingElementIndex: 1, outgoingElementId: 'E2', analysisSectionId: 'AS1',
  profileId: 'normal-metallic', cornerNode: 110, previousNode: 100, nextNode: 120,
  geometricClass: 'HORIZONTAL', turnAngleDeg: 45, sourceBasis: 'GEOMETRY_AUTHORITY',
  outsideDiameterMm: 114.3, candidateStatus: 'READY_NOT_EMITTED',
  candidateRadiusDisposition: 'MATCHES_AUTHORITY', geometryRecheckRequired: false,
  sourceKind: 'EXPLICIT_GLOBAL_NORMAL_POLICY', sourceAuthority: 'TEST', sourceReference: 'C-1',
};
const standard = createPipelineNormalFittingResolution({ ...base,
  fittingPolicyId: 'normal-standard-elbow', fittingKind: 'STANDARD_ELBOW',
  radiusBasis: 'NORMAL_STANDARD_ELBOW_RADIUS_D', radiusD: 1.5, radiusMm: 171.45,
  observedCandidateRadiusD: 1.5, observedCandidateRadiusMm: 171.45,
});
assert.equal(standard.ready, true);
assert.equal(standard.radiusMm, 171.45);
const explicitMm = createPipelineNormalFittingResolution({ ...base,
  fittingPolicyId: 'normal-explicit-radius-bend', fittingKind: 'EXPLICIT_RADIUS_BEND',
  radiusBasis: 'NORMAL_EXPLICIT_RADIUS_MM', radiusD: 2, radiusMm: 228.6,
  observedCandidateRadiusMm: 228.6,
});
assert.equal(explicitMm.ready, true);
const explicitD = createPipelineNormalFittingResolution({ ...base,
  fittingPolicyId: 'normal-explicit-radius-bend', fittingKind: 'EXPLICIT_RADIUS_BEND',
  radiusBasis: 'NORMAL_EXPLICIT_RADIUS_D', radiusD: 2, radiusMm: 228.6,
  observedCandidateRadiusMm: 228.6,
});
assert.equal(explicitD.ready, true);
const emittedMismatch = createPipelineNormalFittingResolution({ ...standard, candidateStatus: 'EMITTED',
  observedCandidateRadiusMm: 150, candidateRadiusDisposition: 'REQUIRES_RECOMPUTE', geometryRecheckRequired: true });
assert.ok(emittedMismatch.blockerCodes.includes('PIPELINE_NORMAL_FITTING_EMITTED_RADIUS_CONFLICT'));
const both = createPipelineNormalFittingResolution({ ...base,
  fittingPolicyId: 'normal-explicit-radius-bend', fittingKind: 'EXPLICIT_RADIUS_BEND',
  radiusBasis: 'NORMAL_EXPLICIT_RADIUS_MM', radiusD: 2, radiusMm: 228.6,
  blockerCodes: ['PIPELINE_NORMAL_FITTING_RADIUS_BASIS_CONFLICT'],
});
assert.equal(both.ready, false);
const wrongProfile = createPipelineNormalFittingResolution({ ...standard, profileId: 'asme-b31.4' });
assert.ok(wrongProfile.blockerCodes.includes('PIPELINE_NORMAL_FITTING_PROFILE_INCOMPATIBLE'));
const booleanRadius = createPipelineNormalFittingResolution({ ...base,
  fittingPolicyId: 'normal-standard-elbow', fittingKind: 'STANDARD_ELBOW',
  radiusBasis: 'NORMAL_STANDARD_ELBOW_RADIUS_D', radiusD: true, radiusMm: 171.45,
});
assert.ok(booleanRadius.blockerCodes.includes('PIPELINE_NORMAL_FITTING_RADIUS_INVALID'));

const plan = createPipelineNormalFittingPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1',
  bendResolutionSchema: 'PipelineBendResolution.v3',
  migration: { sourceKinds: ['EXPLICIT_GLOBAL_NORMAL_POLICY'] },
  fittingResolutions: [standard], notApplicableCandidateIds: [],
});
assert.equal(plan.ready, true);
assert.ok(Object.isFrozen(plan));
assert.ok(Object.isFrozen(plan.fittingResolutions));
assert.ok(Object.isFrozen(plan.fittingResolutions[0]));
assert.doesNotThrow(() => JSON.stringify(plan));
const blockedMigration = createPipelineNormalFittingPlan({
  analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
  analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1', bendResolutionSchema: 'PipelineBendResolution.v3',
  migration: { blockerCodes: ['PIPELINE_NORMAL_FITTING_LEGACY_AUTHORITY_UNCONFIRMED'] },
  fittingResolutions: [standard], notApplicableCandidateIds: [],
});
assert.equal(blockedMigration.ready, false);
assert.ok(blockedMigration.blockerCodes.includes('PIPELINE_NORMAL_FITTING_LEGACY_AUTHORITY_UNCONFIRMED'));
console.log('Pipeline Normal fitting contract tests passed.');
