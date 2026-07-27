import assert from 'node:assert/strict';
import {
  PIPELINE_PIPING_CODE_AUTHORITY_PLAN_SCHEMA,
  resolvePipelinePipingCodeAuthorityPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-piping-code-authority.js';

const profileAuthorityPlan = Object.freeze({
  schema: 'PipelineInputXmlProfileAuthorityPlan.v1',
  ready: true,
  blockerCodes: Object.freeze([]),
  sectionAuthorities: Object.freeze([
    Object.freeze({ analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL' }),
    Object.freeze({ analysisSectionId: 'AS2', profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4' }),
    Object.freeze({ analysisSectionId: 'AS3', profileId: 'gre', resolvedMode: 'GRE' }),
  ]),
  elementAuthorities: Object.freeze([
    Object.freeze({ elementId: 'E1', elementIndex: 0, analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL' }),
    Object.freeze({ elementId: 'E2', elementIndex: 1, analysisSectionId: 'AS2', profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4' }),
    Object.freeze({ elementId: 'E3', elementIndex: 2, analysisSectionId: 'AS3', profileId: 'gre', resolvedMode: 'GRE' }),
  ]),
});

function allowable(elementId, elementIndex, pipingCode = null) {
  return Object.freeze({
    elementId,
    elementIndex,
    node: 110 + elementIndex * 10,
    attributes: Object.freeze({ PIPING_CODE: pipingCode }),
    cases: Object.freeze([]),
  });
}

const allowableStressPlan = Object.freeze({
  schema: 'PipelineAllowableStressPlan.v1',
  active: true,
  ready: true,
  blockerCodes: Object.freeze([]),
  elements: Object.freeze([
    Object.freeze({ elementId: 'E1', elementIndex: 0, allowableStress: allowable('E1', 0) }),
    Object.freeze({ elementId: 'E2', elementIndex: 1, allowableStress: allowable('E2', 1, 202) }),
    Object.freeze({ elementId: 'E3', elementIndex: 2, allowableStress: allowable('E3', 2) }),
  ]),
});

const authorities = Object.freeze([
  Object.freeze({ analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL', caesarPipingCode: 101, sourceAuthority: 'PROJECT-BASIS' }),
  Object.freeze({ analysisSectionId: 'AS2', profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4', caesarPipingCode: 202, sourceAuthority: 'APPROVED-CODE-SELECTION' }),
  Object.freeze({ analysisSectionId: 'AS3', profileId: 'gre', resolvedMode: 'GRE', caesarPipingCode: 303, sourceAuthority: 'VENDOR-QUALIFICATION' }),
]);

const plan = resolvePipelinePipingCodeAuthorityPlan({
  profileAuthorityPlan,
  allowableStressPlan,
  pipingCodeAuthorities: authorities,
});
assert.equal(plan.schema, PIPELINE_PIPING_CODE_AUTHORITY_PLAN_SCHEMA);
assert.equal(plan.ready, true);
assert.equal(plan.authorityCount, 3);
assert.equal(plan.requiredSectionCount, 3);
assert.deepEqual(plan.elements.map((item) => item.allowableStress.attributes.PIPING_CODE), [101, 202, 303]);
assert.equal(plan.elements[0].allowableStress.pipingCodeAuthority.sourceAuthority, 'PROJECT-BASIS');
assert.equal(Object.isFrozen(plan.elements[0].allowableStress.attributes), true);
assert.deepEqual(plan, resolvePipelinePipingCodeAuthorityPlan({
  profileAuthorityPlan,
  allowableStressPlan,
  pipingCodeAuthorities: authorities,
}));

function blocked(pipingCodeAuthorities, expectedCode, stressPlan = allowableStressPlan, profilePlan = profileAuthorityPlan) {
  const result = resolvePipelinePipingCodeAuthorityPlan({
    profileAuthorityPlan: profilePlan,
    allowableStressPlan: stressPlan,
    pipingCodeAuthorities,
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockerCodes.includes(expectedCode), `${expectedCode} not found in ${result.blockerCodes}`);
}

blocked(authorities.slice(0, 2), 'PIPELINE_PIPING_CODE_AUTHORITY_REQUIRED');
blocked([...authorities, authorities[0]], 'PIPELINE_PIPING_CODE_AUTHORITY_DUPLICATE');
blocked([{ ...authorities[0], profileId: 'gre' }, authorities[1], authorities[2]],
  'PIPELINE_PIPING_CODE_PROFILE_MISMATCH');
blocked([{ ...authorities[0], caesarPipingCode: 0 }, authorities[1], authorities[2]],
  'PIPELINE_PIPING_CODE_VALUE_INVALID');
blocked([{ ...authorities[0], sourceAuthority: '' }, authorities[1], authorities[2]],
  'PIPELINE_PIPING_CODE_SOURCE_REQUIRED');
blocked(authorities, 'PIPELINE_PIPING_CODE_CONFLICT', Object.freeze({
  ...allowableStressPlan,
  elements: Object.freeze([
    Object.freeze({ elementId: 'E1', elementIndex: 0, allowableStress: allowable('E1', 0, 999) }),
    ...allowableStressPlan.elements.slice(1),
  ]),
}));
blocked([authorities[0]], 'PIPELINE_PIPING_CODE_PROFILE_AUTHORITY_REQUIRED', allowableStressPlan, null);

const inactive = resolvePipelinePipingCodeAuthorityPlan({
  profileAuthorityPlan: null,
  allowableStressPlan,
  pipingCodeAuthorities: [],
});
assert.equal(inactive.active, false);
assert.equal(inactive.ready, true);
assert.deepEqual(inactive.elements, []);

const unusedAllowablePlan = Object.freeze({
  ...allowableStressPlan,
  active: false,
  elements: Object.freeze(allowableStressPlan.elements.map((item) => Object.freeze({
    ...item, allowableStress: null,
  }))),
});
blocked([authorities[0]], 'PIPELINE_PIPING_CODE_AUTHORITY_UNUSED', unusedAllowablePlan);

console.log('pipeline-3d-model piping-code authority: PASS');
