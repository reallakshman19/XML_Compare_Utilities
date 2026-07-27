import assert from 'node:assert/strict';
import { buildPipelineInputXmlDocumentPlan } from '../tabs/pipeline-3d-model/pipeline-3d-model-inputxml-document.js';
import { buildInputXmlPipingModelXml } from '../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js';
import { profileDocumentInput } from './pipeline-3d-model-inputxml-profile-document.test.js';

const authorities = [
  { analysisSectionId: 'AS1', profileId: 'normal-metallic', resolvedMode: 'NORMAL',
    caesarPipingCode: 101, sourceAuthority: 'PROJECT-DESIGN-BASIS' },
  { analysisSectionId: 'AS2', profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4',
    caesarPipingCode: 202, sourceAuthority: 'APPROVED-CODE-SELECTION' },
  { analysisSectionId: 'AS3', profileId: 'gre', resolvedMode: 'GRE',
    caesarPipingCode: 303, sourceAuthority: 'VENDOR-QUALIFICATION' },
];
const allowableValueAuthorities = authorities.map((item, index) => ({
  analysisSectionId: item.analysisSectionId, profileId: item.profileId,
  resolvedMode: item.resolvedMode, materialNumber: 1, materialName: 'TEST MATERIAL',
  coldAllow: 1000 + index * 1000, sy: 1100 + index * 1000, su: 1200 + index * 1000,
  sourceAuthority: 'APPROVED-MATERIAL-SHEET', cases: [
    { num: 1, temperature: 100, hotAllow: 900 + index * 1000,
      hotSy: 1000 + index * 1000, hotSu: 1100 + index * 1000 },
    { num: 2, temperature: 200, hotAllow: 800 + index * 1000,
      hotSy: 900 + index * 1000, hotSu: 1000 + index * 1000 },
  ],
}));

function profileInput() {
  const input = structuredClone(profileDocumentInput());
  input.exportContext.branchInfo.caesarVersion = '14.00';
  input.exportContext.branchInfo.materialName = 'TEST MATERIAL';
  input.exportContext.branchInfo.t1 = 100;
  input.exportContext.branchInfo.t2 = 200;
  input.allowableStresses = [
    { elementIndex: 0, cases: [] },
    { elementIndex: 2, PIPING_CODE: 202, cases: [] },
    { elementIndex: 4, cases: [] },
  ];
  input.pipingCodeAuthorities = structuredClone(authorities);
  input.allowableValueAuthorities = structuredClone(allowableValueAuthorities);
  return input;
}

const plan = buildPipelineInputXmlDocumentPlan(profileInput());
assert.equal(plan.ready, true);
assert.equal(plan.pipingCodeAuthorityPlan.ready, true);
assert.equal(plan.pipingCodeAuthorityPlan.authorityCount, 3);
assert.equal(plan.pipingCodeAuthorityPlan.requiredSectionCount, 3);
assert.deepEqual(plan.elements.filter((item) => item.allowableStress)
  .map((item) => item.allowableStress.attributes.PIPING_CODE), [101, 202, 303]);
assert.equal(plan.elements[0].allowableStress.pipingCodeAuthority.sourceAuthority,
  'PROJECT-DESIGN-BASIS');
assert.equal(Object.isFrozen(plan.pipingCodeAuthorityPlan.authorities[0]), true);

const xml = buildInputXmlPipingModelXml(plan);
assert.match(xml, /NUMALLOW="3"/);
assert.equal((xml.match(/<ALLOWABLESTRESS /g) || []).length, 3);
assert.equal((xml.match(/<CASE /g) || []).length, 27);
assert.equal((xml.match(/PIPING_CODE="101\.000000"/g) || []).length, 1);
assert.equal((xml.match(/PIPING_CODE="202\.000000"/g) || []).length, 1);
assert.equal((xml.match(/PIPING_CODE="303\.000000"/g) || []).length, 1);
assert.equal(xml, buildInputXmlPipingModelXml(buildPipelineInputXmlDocumentPlan(profileInput())));

function writerBlocked(mutator) {
  const forged = structuredClone(plan);
  mutator(forged);
  assert.throws(() => buildInputXmlPipingModelXml(forged),
    (error) => error.code === 'PIPELINE_INPUTXML_WRITER_BLOCKED');
}
writerBlocked((value) => { value.elements[0].allowableStress.attributes.PIPING_CODE = 999; });
writerBlocked((value) => { value.elements[0].allowableStress.pipingCodeAuthority.caesarPipingCode = 999; });
writerBlocked((value) => { value.pipingCodeAuthorityPlan.authorities[0].caesarPipingCode = 999; });
writerBlocked((value) => { value.pipingCodeAuthorityPlan.elements[0].analysisSectionId = 'AS2'; });
writerBlocked((value) => { delete value.pipingCodeAuthorityPlan; delete value.pipingCodeAuthorityPlanSchema; });

const missingInput = profileInput();
missingInput.pipingCodeAuthorities.pop();
const missing = buildPipelineInputXmlDocumentPlan(missingInput);
assert.equal(missing.ready, false);
assert.ok(missing.blockerCodes.includes('PIPELINE_PIPING_CODE_AUTHORITY_REQUIRED'));

const conflictInput = profileInput();
conflictInput.allowableStresses[0].PIPING_CODE = 999;
const conflict = buildPipelineInputXmlDocumentPlan(conflictInput);
assert.equal(conflict.ready, false);
assert.ok(conflict.blockerCodes.includes('PIPELINE_PIPING_CODE_CONFLICT'));

const noAllowable = buildPipelineInputXmlDocumentPlan(profileDocumentInput());
assert.equal(Object.hasOwn(noAllowable, 'pipingCodeAuthorityPlan'), false);

const nonProfile = buildPipelineInputXmlDocumentPlan({
  exportContext: { branchInfo: { lineNo: 'PL-1', caesarVersion: '14.00' } },
  coordinateRows: [
    { nodeNumber: 100, x: 0, y: 0, z: 0 },
    { nodeNumber: 110, x: 1000, y: 0, z: 0 },
  ],
  bendResolution: { errors: [], bendByIncomingElementIndex: {} },
  pipingCodeAuthorities: [authorities[0]],
});
assert.equal(nonProfile.ready, false);
assert.ok(nonProfile.blockerCodes.includes('PIPELINE_PIPING_CODE_PROFILE_AUTHORITY_REQUIRED'));

console.log('pipeline-3d-model piping-code authority integration: PASS');
