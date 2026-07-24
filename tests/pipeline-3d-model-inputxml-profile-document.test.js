import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  buildPipelineInputXmlDocumentPlan,
  buildPipelineInputXmlDocumentPlanJson,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-inputxml-document.js';
import { buildInputXmlPipingModelXml } from '../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js';
import { authorityFixture, withGreTurn } from './pipeline-3d-model-inputxml-profile-authority.test.js';

export const profileRows = Object.freeze(Array.from({ length: 7 }, (_, index) => Object.freeze({
  nodeNumber: 100 + index * 10, x: index * 1000, y: 0, z: 0,
  nodeName: `NODE-${index + 1}`, lineNo: 'PL-048',
})));
export const profileContext = Object.freeze({ schema: 'PipelineUtilityExportContext.v1',
  profile: Object.freeze({ resolvedMode: 'GRE' }),
  readiness: Object.freeze({ blockerCodes: Object.freeze(['GRE_BEND_POLICY_NOT_IMPLEMENTED']) }),
  branchInfo: Object.freeze({ lineNo: 'PL-048', jobName: 'P3D-XML-048', caesarVersion: '11.00',
    diameter: 100, wallThickness: 6, insulationThickness: 0, corrosionAllowance: 0,
    insulationDensity: 0, fluidDensity: 0, materialNumber: 1 }),
});
export const profileSections = Object.freeze([
  Object.freeze({ startElementIndex: 2, diameter: 200 }),
  Object.freeze({ startElementIndex: 4, diameter: 300 }),
]);
export function profileDocumentInput(authority = authorityFixture(), propertySections = profileSections) {
  return { exportContext: profileContext, coordinateRows: profileRows,
    bendResolution: authority.bendResolution, propertySections,
    profileAuthorityPlans: { analysisSectionPlan: authority.analysisSectionPlan,
      analysisDiameterPlan: authority.analysisDiameterPlan, normalFittingPlan: authority.normalFittingPlan,
      b314RadiusPlan: authority.b314RadiusPlan, greVendorSeriesPlan: authority.greVendorSeriesPlan } };
}

const plan = buildPipelineInputXmlDocumentPlan(profileDocumentInput());
assert.equal(plan.ready, true);
assert.equal(plan.profileAuthorityPlan.ready, true);
assert.equal(plan.counts.numElt, 6);
assert.equal(plan.counts.numBend, 2);
assert.deepEqual(plan.elements.map((item) => item.emittedProperties.diameter), [100, 100, 200, 200, 300, 300]);
assert.deepEqual(plan.elements.map((item) => item.analysisSectionId), ['AS1', 'AS1', 'AS2', 'AS2', 'AS3', 'AS3']);
assert.equal(plan.elements[0].bend.radiusMm, 150);
assert.equal(plan.elements[2].bend.radiusMm, 6000);
assert.equal(plan.elements[2].profileAuthority.fittingPolicyId, 'b31.4-cold-field-size-band');
assert.equal(plan.elements[2].profileAuthority.geometryDisposition, 'MATCHES_AUTHORITY');
assert.equal(plan.elements[4].bend, null);
assert.equal(plan.elements[4].writerDisposition, 'READY');
assert.equal(plan.blockerCodes.includes('GRE_BEND_POLICY_NOT_IMPLEMENTED'), false);
assert.equal(Object.isFrozen(plan.elements[0].profileAuthority), true);
assert.equal(buildPipelineInputXmlDocumentPlanJson(plan),
  buildPipelineInputXmlDocumentPlanJson(buildPipelineInputXmlDocumentPlan(profileDocumentInput())));

const conflict = buildPipelineInputXmlDocumentPlan(profileDocumentInput(authorityFixture(), [
  { startElementIndex: 2, diameter: 201 }, { startElementIndex: 4, diameter: 300 },
]));
assert.equal(conflict.ready, false);
assert.ok(conflict.blockerCodes.includes('PIPELINE_INPUTXML_PROPERTY_CONFLICT'));

const normalMismatch = authorityFixture();
normalMismatch.bendResolution.bendByIncomingElementIndex[0].radiusMm = 149;
const normalBlocked = buildPipelineInputXmlDocumentPlan(profileDocumentInput(normalMismatch));
assert.ok(normalBlocked.blockerCodes.includes('PIPELINE_INPUTXML_FITTING_GEOMETRY_CONFLICT'));
const b314Mismatch = authorityFixture();
b314Mismatch.b314RadiusPlan.radiusResolutions[0].candidateRadiusDisposition = 'REQUIRES_RECOMPUTE';
const b314Blocked = buildPipelineInputXmlDocumentPlan(profileDocumentInput(b314Mismatch));
assert.ok(b314Blocked.blockerCodes.includes('PIPELINE_INPUTXML_FITTING_AUTHORITY_UNRESOLVED'));

const greTurnAuthority = withGreTurn();
const greTurn = buildPipelineInputXmlDocumentPlan(profileDocumentInput(greTurnAuthority));
assert.equal(greTurn.ready, false);
assert.ok(greTurn.blockerCodes.includes('PIPELINE_INPUTXML_GRE_BEND_GEOMETRY_REQUIRED'));
assert.equal(greTurn.blockerCodes.includes('GRE_BEND_POLICY_NOT_IMPLEMENTED'), false);
assert.equal(greTurn.elements[4].geometryDisposition, 'GRE_GEOMETRY_NOT_ADOPTED');
assert.equal(greTurn.elements[4].bend, null);
assert.equal(greTurn.counts.numBend, 2);

const legacyContext = { schema: 'PipelineUtilityExportContext.v1', profile: { resolvedMode: 'NORMAL' },
  branchInfo: { branchName: 'BR-07', lineNo: 'PL-100', jobName: 'JOB-100', issueNo: 'A',
    caesarVersion: '11.00', boreMm: '114.3', wallThickness: '6.02', insulationThickness: '0',
    corrosionAllowance: '0', t1: '100', p1: '1000', hydroPressure: '1500', insulationDensity: '0',
    fluidDensity: '0.000965', materialCode: '1' } };
const legacyRows = [{ nodeNumber: 100, x: 0, y: 0, z: 0, nodeName: 'NODE-A', lineNo: 'PL-100' },
  { nodeNumber: 110, x: 1000, y: 0, z: 0, nodeName: 'NODE-B', lineNo: 'PL-100' }];
const noBends = { errors: [], bendByIncomingElementIndex: {} };
const legacyPlan = buildPipelineInputXmlDocumentPlan({ exportContext: legacyContext,
  coordinateRows: legacyRows, bendResolution: noBends });
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(hash(buildPipelineInputXmlDocumentPlanJson(legacyPlan)),
  'c20b46294a53e876501ab08f5adde84c0ca6ce7a262d6d8cd1c986e01381141b');
assert.equal(hash(buildInputXmlPipingModelXml(legacyPlan)),
  '936819d07151f665facb6cad778ec226b80f047e93fde7901c754df97515d759');
assert.equal(Object.hasOwn(legacyPlan, 'profileAuthorityPlan'), false);
console.log('pipeline-3d-model InputXML profile document: PASS');
