import assert from 'node:assert/strict';
import {
  buildPipelineNormalFittingLedgerText,
  buildPipelineNormalFittingPlanJson,
  resolvePipelineNormalFittingPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-normal-fitting-resolution.js';

function plans(candidateOverrides = [], planOverrides = {}) {
  const analysisSectionPlan = {
    schema: 'PipelineAnalysisSectionPlan.v1', ready: true,
    sections: [
      { analysisSectionId: 'AS1', startElementIndex: 0, profileId: 'normal-metallic' },
      { analysisSectionId: 'AS2', startElementIndex: 2, profileId: 'asme-b31.4' },
    ],
    elementResolutions: [
      { elementIndex: 0, elementId: 'E1', analysisSectionId: 'AS1', profileId: 'normal-metallic' },
      { elementIndex: 1, elementId: 'E2', analysisSectionId: 'AS1', profileId: 'normal-metallic' },
      { elementIndex: 2, elementId: 'E3', analysisSectionId: 'AS2', profileId: 'asme-b31.4' },
      { elementIndex: 3, elementId: 'E4', analysisSectionId: 'AS2', profileId: 'asme-b31.4' },
    ],
  };
  const analysisDiameterPlan = {
    schema: 'PipelineAnalysisDiameterPlan.v1', ready: true,
    sectionResolutions: [
      { analysisSectionId: 'AS1', profileId: 'normal-metallic', outsideDiameterMm: 100,
        nominalPipeSizeNps: 8, greVendorNominalBoreMm: null, ready: true },
      { analysisSectionId: 'AS2', profileId: 'asme-b31.4', outsideDiameterMm: 200,
        nominalPipeSizeNps: 8, greVendorNominalBoreMm: null, ready: true },
    ],
    elementResolutions: [
      { elementIndex: 0, elementId: 'E1', analysisSectionId: 'AS1', profileId: 'normal-metallic', outsideDiameterMm: 100, ready: true },
      { elementIndex: 1, elementId: 'E2', analysisSectionId: 'AS1', profileId: 'normal-metallic', outsideDiameterMm: 100, ready: true },
      { elementIndex: 2, elementId: 'E3', analysisSectionId: 'AS2', profileId: 'asme-b31.4', outsideDiameterMm: 200, ready: true },
      { elementIndex: 3, elementId: 'E4', analysisSectionId: 'AS2', profileId: 'asme-b31.4', outsideDiameterMm: 200, ready: true },
    ],
  };
  const candidates = [
    { id: 'bend:110', incomingElementIndex: 0, outgoingElementIndex: 1, previousNode: 100, cornerNode: 110,
      nextNode: 120, classification: 'COMPOUND', turnAngleDeg: 60, sourceBasis: 'GEOMETRY_AUTHORITY',
      bendClass: 'standard', radiusBasis: 'DEFAULT_MULTIPLIER', radiusD: 1.5, radiusMm: 150,
      geometryFits: true, status: 'READY_NOT_EMITTED', ...candidateOverrides[0] },
    { id: 'bend:130', incomingElementIndex: 2, outgoingElementIndex: 3, previousNode: 120, cornerNode: 130,
      nextNode: 140, classification: 'HORIZONTAL', turnAngleDeg: 30, sourceBasis: 'TABLE_1_PLAN',
      bendClass: 'cold-field', radiusD: 30, radiusMm: 6000, geometryFits: true, status: 'READY_NOT_EMITTED',
      ...candidateOverrides[1] },
  ];
  return { analysisSectionPlan, analysisDiameterPlan,
    bendResolution: { schema: 'PipelineBendResolution.v3', candidates }, ...planOverrides };
}
const policy = { normalFittingPolicy: { fittingPolicyId: 'normal-standard-elbow', radiusD: 2 } };
const recompute = resolvePipelineNormalFittingPlan({ ...plans(), ...policy });
assert.equal(recompute.ready, true);
assert.equal(recompute.fittingResolutions.length, 1);
assert.deepEqual(recompute.notApplicableCandidateIds, ['bend:130']);
const item = recompute.fittingResolutions[0];
assert.equal(item.incomingElementId, 'E1');
assert.equal(item.outgoingElementId, 'E2');
assert.equal(item.radiusMm, 200);
assert.equal(item.candidateRadiusDisposition, 'REQUIRES_RECOMPUTE');
assert.equal(item.geometryRecheckRequired, true);
assert.equal(item.ready, true);
assert.notEqual(item.radiusMm, 8 * 2);

const emitted = resolvePipelineNormalFittingPlan({ ...plans([{ status: 'EMITTED' }]), ...policy });
assert.equal(emitted.ready, false);
assert.ok(emitted.blockerCodes.includes('PIPELINE_NORMAL_FITTING_EMITTED_RADIUS_CONFLICT'));

const infeasible = resolvePipelineNormalFittingPlan({ ...plans([{ status: 'INFEASIBLE', geometryFits: false, radiusMm: 200 }]), ...policy });
assert.equal(infeasible.ready, true);
assert.equal(infeasible.fittingResolutions[0].candidateRadiusDisposition, 'MATCHES_AUTHORITY');

const noRadius = resolvePipelineNormalFittingPlan({ ...plans([{ radiusMm: null, radiusD: null }]), ...policy });
assert.equal(noRadius.ready, true);
assert.equal(noRadius.fittingResolutions[0].candidateRadiusDisposition, 'NOT_AVAILABLE');

const explicitMm = resolvePipelineNormalFittingPlan({ ...plans(),
  normalFittingPolicy: { fittingPolicyId: 'normal-explicit-radius-bend', radiusMm: 250 } });
assert.equal(explicitMm.ready, true);
assert.equal(explicitMm.fittingResolutions[0].radiusD, 2.5);
assert.equal(explicitMm.fittingResolutions[0].radiusBasis, 'NORMAL_EXPLICIT_RADIUS_MM');

const duplicate = plans([{ id: 'bend:130', cornerNode: 130, incomingElementIndex: 2, outgoingElementIndex: 3 }]);
duplicate.bendResolution.candidates = [duplicate.bendResolution.candidates[0], duplicate.bendResolution.candidates[1]];
const duplicateResult = resolvePipelineNormalFittingPlan({ ...duplicate, ...policy });
assert.equal(duplicateResult.ready, false);
assert.ok(duplicateResult.blockerCodes.includes('PIPELINE_NORMAL_FITTING_CANDIDATE_COVERAGE_INVALID'));

const crossing = plans([{ outgoingElementIndex: 2 }]);
const crossingResult = resolvePipelineNormalFittingPlan({ ...crossing, ...policy });
assert.equal(crossingResult.ready, false);
assert.ok(crossingResult.blockerCodes.includes('PIPELINE_NORMAL_FITTING_OWNERSHIP_INVALID'));

const missingDiameter = plans();
missingDiameter.analysisDiameterPlan.sectionResolutions[0].outsideDiameterMm = null;
const missingResult = resolvePipelineNormalFittingPlan({ ...missingDiameter, ...policy });
assert.equal(missingResult.ready, false);
assert.ok(missingResult.blockerCodes.includes('PIPELINE_NORMAL_FITTING_DIAMETER_PLAN_INVALID'));

for (const malformed of [
  { analysisSectionPlan: { schema: 'PipelineAnalysisSectionPlan.v1', ready: true, sections: [null], elementResolutions: [] } },
  { analysisDiameterPlan: { schema: 'PipelineAnalysisDiameterPlan.v1', ready: true, sectionResolutions: {}, elementResolutions: [] } },
  { bendResolution: { schema: 'PipelineBendResolution.v3', candidates: [null] } },
  { normalFittingOverrides: [null] },
]) {
  assert.doesNotThrow(() => resolvePipelineNormalFittingPlan({ ...plans(), ...policy, ...malformed }));
  assert.equal(resolvePipelineNormalFittingPlan({ ...plans(), ...policy, ...malformed }).ready, false);
}
assert.equal(buildPipelineNormalFittingPlanJson(recompute), buildPipelineNormalFittingPlanJson(resolvePipelineNormalFittingPlan({ ...plans(), ...policy })));
assert.equal(buildPipelineNormalFittingLedgerText(recompute), buildPipelineNormalFittingLedgerText(resolvePipelineNormalFittingPlan({ ...plans(), ...policy })));
assert.ok(Object.isFrozen(recompute));
assert.ok(Object.isFrozen(recompute.fittingResolutions[0]));

const invalidSectionTarget = resolvePipelineNormalFittingPlan({ ...plans(), ...policy,
  normalFittingSections: [{ analysisSectionId: 'AS2', fittingPolicyId: 'normal-standard-elbow', radiusD: 2 }] });
assert.equal(invalidSectionTarget.ready, false);
assert.ok(invalidSectionTarget.blockerCodes.includes('PIPELINE_NORMAL_FITTING_TARGET_INVALID'));

const mutableInput = { ...plans(), normalFittingPolicy: { fittingPolicyId: 'normal-standard-elbow', radiusD: 2 } };
const isolated = resolvePipelineNormalFittingPlan(mutableInput);
mutableInput.normalFittingPolicy.radiusD = 9;
mutableInput.bendResolution.candidates[0].radiusMm = 999;
assert.equal(isolated.fittingResolutions[0].radiusMm, 200);
assert.equal(isolated.fittingResolutions[0].observedCandidateRadiusMm, 150);

console.log('Pipeline Normal fitting resolution tests passed.');
