import assert from 'node:assert/strict';
import {
  PIPELINE_ALLOWABLE_VALUE_AUTHORITY_PLAN_SCHEMA,
  resolvePipelineAllowableValueAuthorityPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-allowable-value-authority.js';

const profileAuthorityPlan = Object.freeze({
  schema: 'PipelineInputXmlProfileAuthorityPlan.v1', ready: true, blockerCodes: Object.freeze([]),
  sectionAuthorities: Object.freeze([
    Object.freeze({ analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL' }),
    Object.freeze({ analysisSectionId: 'AS2', profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4' }),
  ]),
});
const pipingCodeAuthorities = Object.freeze([
  Object.freeze({ analysisSectionId: 'AS1', caesarPipingCode: 101, sourceAuthority: 'DB' }),
  Object.freeze({ analysisSectionId: 'AS2', caesarPipingCode: 202, sourceAuthority: 'DB' }),
]);
const emptyCase = (num) => Object.freeze({ num, attributes: Object.freeze({
  HOT_ALLOW: null, HOT_SY: null, HOT_SU: null,
}) });
const allowable = (elementId, elementIndex, node, codeAuthority) => Object.freeze({
  elementId, elementIndex, node,
  attributes: Object.freeze({ COLD_ALLOW: null, SY: null, SU: null, PIPING_CODE: codeAuthority.caesarPipingCode }),
  cases: Object.freeze(Array.from({ length: 9 }, (_, index) => emptyCase(index + 1))),
  pipingCodeAuthority: codeAuthority,
});
const element = (id, index, section, profileId, resolvedMode, codeAuthority) => Object.freeze({
  id, index, analysisSectionId: section, profileId, resolvedMode,
  properties: Object.freeze({ materialNumber: section === 'AS1' ? 106 : 5,
    temperatures: Object.freeze([100, 200]) }),
  mechanicalProperties: Object.freeze({ materialName: section === 'AS1' ? 'A106 B' : 'PIPELINE STEEL' }),
  allowableStress: allowable(id, index, 110 + index * 10, codeAuthority),
});
const elements = Object.freeze([
  element('E1', 0, 'AS1', 'normal-metallic', 'NORMAL', pipingCodeAuthorities[0]),
  element('E2', 1, 'AS2', 'asme-b31.4', 'ASME_B31_4', pipingCodeAuthorities[1]),
]);
const pipingCodeAuthorityPlan = Object.freeze({
  schema: 'PipelinePipingCodeAuthorityPlan.v1', ready: true, blockerCodes: Object.freeze([]),
  elements: Object.freeze(elements.map((item) => Object.freeze({ elementId: item.id }))),
});
const authority = (section, profileId, resolvedMode, materialNumber, materialName, base) => ({
  analysisSectionId: section, profileId, resolvedMode, materialNumber, materialName,
  coldAllow: base, sy: base + 10, su: base + 20, sourceAuthority: 'APPROVED-MATERIAL-SHEET',
  cases: [
    { num: 1, temperature: 100, hotAllow: base - 1, hotSy: base + 9, hotSu: base + 19 },
    { num: 2, temperature: 200, hotAllow: base - 2, hotSy: base + 8, hotSu: base + 18 },
  ],
});
const authorities = [
  authority('AS1', 'normal-metallic', 'NORMAL', 106, 'A106 B', 1000),
  authority('AS2', 'asme-b31.4', 'ASME_B31_4', 5, 'PIPELINE STEEL', 2000),
];
authorities[1].su = { disposition: 'SENTINEL' };
authorities[1].cases[0].hotSy = { disposition: 'SENTINEL' };
authorities[1].cases[0].hotSu = { disposition: 'ZERO' };

const plan = resolvePipelineAllowableValueAuthorityPlan({
  profileAuthorityPlan, pipingCodeAuthorityPlan, elements, allowableValueAuthorities: authorities,
});
assert.equal(plan.schema, PIPELINE_ALLOWABLE_VALUE_AUTHORITY_PLAN_SCHEMA);
assert.equal(plan.ready, true);
assert.equal(plan.authorityCount, 2);
assert.equal(plan.requiredSectionCount, 2);
assert.equal(plan.elements[0].allowableStress.attributes.COLD_ALLOW, 1000);
assert.equal(plan.elements[0].allowableStress.attributes.SY, 1010);
assert.equal(plan.elements[0].allowableStress.cases[0].attributes.HOT_ALLOW, 999);
assert.equal(plan.elements[0].allowableStress.cases[1].attributes.HOT_SU, 1018);
assert.equal(plan.elements[0].allowableStress.cases[2].allowableValueCaseAuthority, undefined);
assert.equal(plan.elements[0].allowableStress.allowableValueAuthority.analysisSectionId, 'AS1');
assert.equal(plan.elements[1].allowableStress.attributes.SU, null);
assert.equal(plan.elements[1].allowableStress.cases[0].attributes.HOT_SY, null);
assert.equal(plan.elements[1].allowableStress.cases[0].attributes.HOT_SU, 0);
assert.equal(plan.authorities[1].values.SU.disposition, 'SENTINEL');
assert.equal(Object.isFrozen(plan.elements[0].allowableStress.allowableValueAuthority), true);
assert.deepEqual(plan, resolvePipelineAllowableValueAuthorityPlan({
  profileAuthorityPlan, pipingCodeAuthorityPlan, elements, allowableValueAuthorities: structuredClone(authorities),
}));

const missing = resolvePipelineAllowableValueAuthorityPlan({
  profileAuthorityPlan, pipingCodeAuthorityPlan, elements, allowableValueAuthorities: authorities.slice(0, 1),
});
assert.ok(missing.blockerCodes.includes('PIPELINE_ALLOWABLE_VALUE_AUTHORITY_REQUIRED'));

const duplicate = resolvePipelineAllowableValueAuthorityPlan({
  profileAuthorityPlan, pipingCodeAuthorityPlan, elements,
  allowableValueAuthorities: [authorities[0], authorities[0], authorities[1]],
});
assert.ok(duplicate.blockerCodes.includes('PIPELINE_ALLOWABLE_VALUE_AUTHORITY_DUPLICATE'));

const wrongMaterial = structuredClone(authorities);
wrongMaterial[0].materialName = 'WRONG';
assert.ok(resolvePipelineAllowableValueAuthorityPlan({ profileAuthorityPlan, pipingCodeAuthorityPlan,
  elements, allowableValueAuthorities: wrongMaterial }).blockerCodes
  .includes('PIPELINE_ALLOWABLE_VALUE_MATERIAL_MISMATCH'));

const wrongTemperature = structuredClone(authorities);
wrongTemperature[0].cases[0].temperature = 101;
assert.ok(resolvePipelineAllowableValueAuthorityPlan({ profileAuthorityPlan, pipingCodeAuthorityPlan,
  elements, allowableValueAuthorities: wrongTemperature }).blockerCodes
  .includes('PIPELINE_ALLOWABLE_VALUE_TEMPERATURE_MISMATCH'));

const extraCase = structuredClone(authorities);
extraCase[0].cases.push({ num: 3, temperature: 300, hotAllow: 1, hotSy: 1, hotSu: 1 });
assert.ok(resolvePipelineAllowableValueAuthorityPlan({ profileAuthorityPlan, pipingCodeAuthorityPlan,
  elements, allowableValueAuthorities: extraCase }).blockerCodes
  .includes('PIPELINE_ALLOWABLE_VALUE_CASE_UNUSED'));

const conflictingElements = structuredClone(elements);
conflictingElements[0].allowableStress.attributes.COLD_ALLOW = 9999;
assert.ok(resolvePipelineAllowableValueAuthorityPlan({ profileAuthorityPlan, pipingCodeAuthorityPlan,
  elements: conflictingElements, allowableValueAuthorities: authorities }).blockerCodes
  .includes('PIPELINE_ALLOWABLE_VALUE_CONFLICT'));

const explicitZeroValue = structuredClone(authorities);
explicitZeroValue[0].coldAllow = { disposition: 'VALUE', value: 0 };
assert.ok(resolvePipelineAllowableValueAuthorityPlan({ profileAuthorityPlan, pipingCodeAuthorityPlan,
  elements, allowableValueAuthorities: explicitZeroValue }).blockerCodes
  .includes('PIPELINE_ALLOWABLE_VALUE_FIELD_INVALID'));

const ungovernedHotValueElements = structuredClone(elements);
ungovernedHotValueElements[0].allowableStress.cases[2].attributes.HOT_ALLOW = 123;
assert.ok(resolvePipelineAllowableValueAuthorityPlan({ profileAuthorityPlan, pipingCodeAuthorityPlan,
  elements: ungovernedHotValueElements, allowableValueAuthorities: authorities }).blockerCodes
  .includes('PIPELINE_ALLOWABLE_VALUE_UNGOVERNED_CASE_VALUE'));

const nonProfile = resolvePipelineAllowableValueAuthorityPlan({
  profileAuthorityPlan: null, pipingCodeAuthorityPlan: null, elements: [],
  allowableValueAuthorities: authorities,
});
assert.ok(nonProfile.blockerCodes.includes('PIPELINE_ALLOWABLE_VALUE_PROFILE_AUTHORITY_REQUIRED'));

console.log('pipeline-3d-model allowable-value authority: PASS');
