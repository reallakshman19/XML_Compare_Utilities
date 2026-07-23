import assert from 'node:assert/strict';
import { resolvePipelineB314RadiusPlan, buildPipelineB314RadiusPlanJson } from '../tabs/pipeline-3d-model/pipeline-3d-model-b314-radius-resolution.js';

const section = (id, start, profileId, mode) => ({
  schema: 'PipelineAnalysisSection.v1', analysisSectionId: id, startElementIndex: start, profileId,
  boundaryAuthority: 'TEST', boundarySourceReference: '', sourceAuthority: 'TEST', sourceReference: '',
  status: 'CONTRACT_ONLY', diagnostics: [], blockerCodes: [],
});
const element = (index, sectionId, profileId, mode, start) => ({
  schema: 'PipelineElementSectionResolution.v1', elementIndex: index, elementId: `E${index + 1}`,
  analysisSectionId: sectionId, profileId, resolvedMode: mode,
  sectionDisposition: start ? 'SECTION_START' : 'INHERITED', boundaryNode: start ? 100 + index : null,
  sourceAuthority: 'TEST', sourceReference: '', diagnostics: [], blockerCodes: [], ready: true,
});
function fixture({ includeNormal = false } = {}) {
  const sections = [section('AS1', 0, 'asme-b31.4', 'ASME_B31_4')];
  const elements = [element(0, 'AS1', 'asme-b31.4', 'ASME_B31_4', true), element(1, 'AS1', 'asme-b31.4', 'ASME_B31_4', false)];
  if (includeNormal) {
    sections.push(section('AS2', 2, 'normal-metallic', 'NORMAL'));
    elements.push(element(2, 'AS2', 'normal-metallic', 'NORMAL', true), element(3, 'AS2', 'normal-metallic', 'NORMAL', false));
  }
  const diameterSections = sections.map((item) => ({
    schema: 'PipelineAnalysisDiameterResolution.v1', analysisSectionId: item.analysisSectionId,
    profileId: item.profileId, resolvedMode: item.profileId === 'asme-b31.4' ? 'ASME_B31_4' : 'NORMAL',
    startElementIndex: item.startElementIndex, outsideDiameterMm: item.profileId === 'asme-b31.4' ? 508 : 114.3,
    nominalPipeSizeNps: item.profileId === 'asme-b31.4' ? 20 : 4, greVendorNominalBoreMm: null,
    caesarDiameterMm: item.profileId === 'asme-b31.4' ? 508 : 114.3, physicalDiameterReady: true,
    sizeBandInputReady: true, vendorSeriesInputReady: false, sourceKind: 'EXPLICIT', sourceAuthority: 'TEST',
    sourceReference: '', quantitySources: {}, status: 'RESOLVED', diagnostics: [], blockerCodes: [], ready: true,
  }));
  const diameterElements = elements.map((item) => {
    const owner = diameterSections.find((candidate) => candidate.analysisSectionId === item.analysisSectionId);
    return {
      schema: 'PipelineElementDiameterResolution.v1', elementIndex: item.elementIndex, elementId: item.elementId,
      analysisSectionId: item.analysisSectionId, profileId: item.profileId, outsideDiameterMm: owner.outsideDiameterMm,
      nominalPipeSizeNps: owner.nominalPipeSizeNps, greVendorNominalBoreMm: null, caesarDiameterMm: owner.caesarDiameterMm,
      propertyDiameterMm: null, diameterDisposition: item.sectionDisposition, sourceKind: 'EXPLICIT',
      diagnostics: [], blockerCodes: [], ready: true,
    };
  });
  const candidates = [{
    id: 'bend:110', incomingElementIndex: 0, outgoingElementIndex: 1,
    previousNode: 100, cornerNode: 110, nextNode: 120, classification: 'VERTICAL',
    sourceBasis: 'TABLE_2_PROFILE_ONLY', turnAngleDeg: 5, bendClass: 'elastic',
    radiusD: 500, radiusMm: 254000, geometryFits: true, status: 'READY_NOT_EMITTED',
  }];
  if (includeNormal) candidates.push({
    id: 'bend:130', incomingElementIndex: 2, outgoingElementIndex: 3,
    previousNode: 120, cornerNode: 130, nextNode: 140, classification: 'HORIZONTAL',
    sourceBasis: 'TABLE_1_PLAN', turnAngleDeg: 90, bendClass: 'standard',
    radiusD: 1.5, radiusMm: 171.45, geometryFits: true, status: 'READY_NOT_EMITTED',
  });
  return {
    analysisSectionPlan: { schema: 'PipelineAnalysisSectionPlan.v1', sections, elementResolutions: elements,
      diagnostics: [], blockerCodes: [], ready: true },
    analysisDiameterPlan: { schema: 'PipelineAnalysisDiameterPlan.v1',
      analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1', propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1',
      migration: { schema: 'PipelineDiameterMigration.v1', outsideDiameterSourceKinds: ['EXPLICIT'],
        nominalPipeSizeSourceKinds: ['EXPLICIT'], greVendorNominalBoreSourceKinds: [], legacyDiameterEvidenceObserved: false,
        legacyDiameterBasisConfirmed: false, npsToOutsideDiameterConversionApplied: false,
        greVendorBoreToOutsideDiameterConversionApplied: false, sourceAuthority: 'TEST', sourceReference: '',
        diagnostics: [], blockerCodes: [], ready: true },
      sectionResolutions: diameterSections, elementResolutions: diameterElements,
      diagnostics: [], blockerCodes: [], ready: true },
    bendResolution: { schema: 'PipelineBendResolution.v3', candidates },
  };
}
const elasticPolicy = {
  bendClass: 'elastic', radiusPolicyId: 'b31.4-elastic-screening', formulaEnabled: true,
  youngsModulusMpa: 207000, allowableBendingStressMpa: 100, practicalEnabled: true,
  practicalRadiusD: 500, sourceAuthority: 'PROJECT', sourceReference: 'P1',
};
const coldA = { bendClass: 'cold-field', radiusPolicyId: 'b31.4-cold-field-project-radius-d',
  projectRadiusD: 30, sourceAuthority: 'PROJECT', sourceReference: 'C1' };
const base = { ...fixture(), b314RadiusPolicies: [elasticPolicy] };
assert.equal(resolvePipelineB314RadiusPlan(base).ready, true);

const forgedRoot = structuredClone(base);
forgedRoot.analysisSectionPlan.ready = false;
assert.equal(resolvePipelineB314RadiusPlan(forgedRoot).ready, false);

const blockedMigration = structuredClone(base);
blockedMigration.analysisDiameterPlan.migration.blockerCodes = ['PIPELINE_DIAMETER_BASIS_UNCONFIRMED'];
blockedMigration.analysisDiameterPlan.migration.ready = false;
assert.equal(resolvePipelineB314RadiusPlan(blockedMigration).ready, false);
assert.ok(resolvePipelineB314RadiusPlan(blockedMigration).blockerCodes.includes('PIPELINE_B314_RADIUS_DIAMETER_PLAN_INVALID'));


const wrongReferences = structuredClone(base);
wrongReferences.analysisDiameterPlan.propertySectionPlanSchema = 'ForgedPropertyPlan.v1';
assert.equal(resolvePipelineB314RadiusPlan(wrongReferences).ready, false);

const wrongDiameterNestedSchema = structuredClone(base);
wrongDiameterNestedSchema.analysisDiameterPlan.sectionResolutions[0].schema = 'ForgedDiameterSection.v1';
assert.equal(resolvePipelineB314RadiusPlan(wrongDiameterNestedSchema).ready, false);

const profileMismatch = structuredClone(base);
profileMismatch.analysisSectionPlan.elementResolutions[0].profileId = 'normal-metallic';
profileMismatch.analysisSectionPlan.elementResolutions[0].resolvedMode = 'NORMAL';
assert.equal(resolvePipelineB314RadiusPlan(profileMismatch).ready, false);
assert.ok(resolvePipelineB314RadiusPlan(profileMismatch).blockerCodes.includes('PIPELINE_B314_RADIUS_OWNERSHIP_INVALID'));

const wrongNestedSchema = structuredClone(base);
wrongNestedSchema.analysisSectionPlan.elementResolutions[0].schema = 'ForgedElement.v1';
assert.equal(resolvePipelineB314RadiusPlan(wrongNestedSchema).ready, false);

const wrongElementId = structuredClone(base);
wrongElementId.analysisSectionPlan.elementResolutions[0].elementId = 'E99';
assert.equal(resolvePipelineB314RadiusPlan(wrongElementId).ready, false);
assert.ok(resolvePipelineB314RadiusPlan(wrongElementId).blockerCodes.includes('PIPELINE_B314_RADIUS_OWNERSHIP_INVALID'));

const nestedBlocker = structuredClone(base);
nestedBlocker.analysisDiameterPlan.elementResolutions[0].blockerCodes = ['PIPELINE_DIAMETER_INPUT_INVALID'];
nestedBlocker.analysisDiameterPlan.elementResolutions[0].ready = false;
assert.equal(resolvePipelineB314RadiusPlan(nestedBlocker).ready, false);

const unusedConflict = resolvePipelineB314RadiusPlan({ ...fixture(), b314RadiusPolicies: [elasticPolicy,
  coldA, { ...coldA, projectRadiusD: 31 }] });
assert.equal(unusedConflict.ready, false);
assert.ok(unusedConflict.blockerCodes.includes('PIPELINE_B314_RADIUS_SOURCE_CONFLICT'));

const normalOverride = resolvePipelineB314RadiusPlan({ ...fixture({ includeNormal: true }), b314RadiusPolicies: [elasticPolicy],
  b314RadiusOverrides: [{ candidateId: 'bend:130', bendClass: 'cold-field',
    radiusPolicyId: 'b31.4-cold-field-project-radius-d', projectRadiusD: 30 }] });
assert.equal(normalOverride.ready, false);
assert.ok(normalOverride.blockerCodes.includes('PIPELINE_B314_RADIUS_TARGET_INVALID'));

const metadataConflict = resolvePipelineB314RadiusPlan({ ...fixture(), b314RadiusPolicies: [elasticPolicy,
  { ...elasticPolicy, sourceReference: 'P2' }] });
assert.equal(metadataConflict.ready, false);
assert.ok(metadataConflict.blockerCodes.includes('PIPELINE_B314_RADIUS_SOURCE_CONFLICT'));

const equivalentA = { ...elasticPolicy, formulaEnabled: 'true', practicalEnabled: 'true' };
const equivalentB = { ...elasticPolicy };
const first = resolvePipelineB314RadiusPlan({ ...fixture(), b314RadiusPolicies: [equivalentA, equivalentB] });
const second = resolvePipelineB314RadiusPlan({ ...fixture(), b314RadiusPolicies: [equivalentB, equivalentA] });
assert.equal(first.ready, true);
assert.equal(buildPipelineB314RadiusPlanJson(first), buildPipelineB314RadiusPlanJson(second));

const explicitSuppressesLegacy = resolvePipelineB314RadiusPlan({ ...fixture(), b314RadiusPolicies: [elasticPolicy],
  settings: { designBasis: 'asme-b31.4', nominalPipeSizeNps: 18 } });
assert.equal(explicitSuppressesLegacy.ready, true);
assert.equal(explicitSuppressesLegacy.migration.legacyEvidenceObserved, false);
console.log('pipeline-3d-model B31.4 radius migration: PASS');
