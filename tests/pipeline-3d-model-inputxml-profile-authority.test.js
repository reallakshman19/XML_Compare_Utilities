import assert from 'node:assert/strict';
import {
  PIPELINE_INPUTXML_FITTING_AUTHORITY_SCHEMA,
  PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA,
  PIPELINE_INPUTXML_PROFILE_ELEMENT_AUTHORITY_SCHEMA,
  PIPELINE_INPUTXML_PROFILE_SECTION_AUTHORITY_SCHEMA,
  buildPipelineInputXmlProfileAuthorityPlan,
  buildPipelineInputXmlProfileAuthorityPlanJson,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-inputxml-profile-authority.js';

const clean = () => ({ diagnostics: [], blockerCodes: [], ready: true });
const shape = (diameter) => ({ diameter, wallThickness: 6, insulationThickness: 0,
  corrosionAllowance: 0, temperatures: Array(9).fill(null), pressures: Array(9).fill(null),
  hydroPressure: null, insulationDensity: 0, fluidDensity: 0, materialNumber: 1 });
const profiles = [
  ['AS1', 0, 'normal-metallic', 'NORMAL', 100],
  ['AS2', 2, 'asme-b31.4', 'ASME_B31_4', 200],
  ['AS3', 4, 'gre', 'GRE', 300],
];
const candidate = (id, incoming, nodes, bendClass, radiusMm) => ({ id,
  incomingElementIndex: incoming, outgoingElementIndex: incoming + 1,
  previousNode: nodes[0], cornerNode: nodes[1], nextNode: nodes[2],
  bendClass, radiusMm, bendTypeCode: 0, turnAngleDeg: 90,
  curvatureNodes: [{ angleDeg: 45, nodeNumber: nodes[1] - 5 }], status: 'EMITTED' });
const migration = (schema) => ({ schema, sourceKinds: [], legacyEvidenceObserved: false,
  diagnostics: [], blockerCodes: [], ready: true });

export function authorityFixture() {
  const sections = profiles.map(([id, start, profileId]) => ({ schema: 'PipelineAnalysisSection.v1',
    analysisSectionId: id, startElementIndex: start, profileId, status: 'CONTRACT_ONLY',
    diagnostics: [], blockerCodes: [] }));
  const elements = Array.from({ length: 6 }, (_, index) => {
    const profile = profiles.filter((item) => item[1] <= index).at(-1);
    return { schema: 'PipelineElementSectionResolution.v1', elementIndex: index, elementId: `E${index + 1}`,
      analysisSectionId: profile[0], profileId: profile[2], resolvedMode: profile[3],
      sectionDisposition: profile[1] === index ? 'SECTION_START' : 'INHERITED', ...clean() };
  });
  const diameterSections = profiles.map(([id, start, profileId, mode, diameter]) => ({
    schema: 'PipelineAnalysisDiameterResolution.v1', analysisSectionId: id, startElementIndex: start,
    profileId, resolvedMode: mode, outsideDiameterMm: diameter, nominalPipeSizeNps: profileId === 'gre' ? null : diameter / 25,
    greVendorNominalBoreMm: profileId === 'gre' ? 254 : null, caesarDiameterMm: diameter,
    physicalDiameterReady: true, sizeBandInputReady: profileId !== 'gre', vendorSeriesInputReady: profileId === 'gre',
    sourceKind: 'EXPLICIT', quantitySources: {}, status: 'RESOLVED', ...clean() }));
  const diameterElements = elements.map((item) => {
    const owner = diameterSections.find((value) => value.analysisSectionId === item.analysisSectionId);
    return { schema: 'PipelineElementDiameterResolution.v1', elementIndex: item.elementIndex, elementId: item.elementId,
      analysisSectionId: item.analysisSectionId, profileId: item.profileId, outsideDiameterMm: owner.outsideDiameterMm,
      nominalPipeSizeNps: owner.nominalPipeSizeNps, greVendorNominalBoreMm: owner.greVendorNominalBoreMm,
      caesarDiameterMm: owner.caesarDiameterMm, propertyDiameterMm: owner.caesarDiameterMm,
      diameterDisposition: item.sectionDisposition, sourceKind: 'EXPLICIT', ...clean() };
  });
  const propertySections = profiles.map(([id, start, , , diameter], index) => ({ schema: 'PipelinePropertySection.v1',
    sectionId: `S${index + 1}`, startElementIndex: start, startNode: 100 + start * 10,
    source: index ? 'SECTION_OVERRIDE' : 'BASE_BRANCH_INFO', explicitProperties: shape(diameter),
    effectiveProperties: shape(diameter), effectiveSources: {}, explicitPropertyNames: [] }));
  const propertyElements = elements.map((item) => {
    const index = profiles.filter((value) => value[1] <= item.elementIndex).length - 1;
    const section = propertySections[index], start = section.startElementIndex === item.elementIndex;
    return { schema: 'PipelineElementPropertyResolution.v1', elementIndex: item.elementIndex, elementId: item.elementId,
      sectionId: section.sectionId, propertyDisposition: start ? 'SECTION_START' : 'INHERITED',
      properties: section.effectiveProperties, emittedProperties: start ? section.explicitProperties : shape(null), effectiveSources: {} };
  });
  const normalCandidate = candidate('bend:110', 0, [100, 110, 120], 'standard', 150);
  const b314Candidate = candidate('bend:130', 2, [120, 130, 140], 'cold-field', 6000);
  const normalResolution = { schema: 'PipelineNormalFittingResolution.v1', candidateId: 'bend:110',
    incomingElementIndex: 0, incomingElementId: 'E1', outgoingElementIndex: 1, outgoingElementId: 'E2',
    analysisSectionId: 'AS1', profileId: 'normal-metallic', fittingPolicyId: 'normal-standard-elbow',
    radiusMm: 150, candidateRadiusDisposition: 'MATCHES_AUTHORITY', ...clean() };
  const b314Resolution = { schema: 'PipelineB314RadiusResolution.v1', candidateId: 'bend:130',
    incomingElementIndex: 2, incomingElementId: 'E3', outgoingElementIndex: 3, outgoingElementId: 'E4',
    analysisSectionId: 'AS2', profileId: 'asme-b31.4', radiusPolicyId: 'b31.4-cold-field-size-band',
    bendClass: 'cold-field', governingRadiusMm: 6000, candidateRadiusDisposition: 'MATCHES_AUTHORITY', ...clean() };
  const greSection = { schema: 'PipelineGreVendorSeriesSectionResolution.v1', analysisSectionId: 'AS3',
    startElementIndex: 4, profileId: 'gre', vendorId: 'VENDOR-A', seriesId: 'SERIES-254',
    qualificationEvidenceId: 'QUAL-1', requirementReference: 'REQ-1', greVendorNominalBoreMm: 254,
    bendPolicyId: 'gre-vendor-qualified-bend', bendRadiusMm: 762, bendLocalThicknessMm: 14,
    sourceKind: 'EXPLICIT_GLOBAL_GRE_VENDOR_SERIES', status: 'RESOLVED', ...clean() };
  const greElements = elements.slice(4).map((item) => ({ schema: 'PipelineGreVendorSeriesElementResolution.v1',
    elementIndex: item.elementIndex, elementId: item.elementId, analysisSectionId: 'AS3', profileId: 'gre',
    vendorId: 'VENDOR-A', seriesId: 'SERIES-254', greVendorNominalBoreMm: 254,
    sectionDisposition: item.sectionDisposition, sourceKind: greSection.sourceKind, status: 'RESOLVED', ...clean() }));
  return {
    analysisSectionPlan: { schema: 'PipelineAnalysisSectionPlan.v1', sections, elementResolutions: elements, ...clean() },
    analysisDiameterPlan: { schema: 'PipelineAnalysisDiameterPlan.v1',
      analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1', propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1',
      migration: { schema: 'PipelineDiameterMigration.v1', outsideDiameterSourceKinds: ['EXPLICIT'],
        nominalPipeSizeSourceKinds: ['EXPLICIT'], greVendorNominalBoreSourceKinds: ['EXPLICIT'],
        legacyDiameterEvidenceObserved: false, legacyDiameterBasisConfirmed: false,
        npsToOutsideDiameterConversionApplied: false, greVendorBoreToOutsideDiameterConversionApplied: false, ...clean() },
      sectionResolutions: diameterSections, elementResolutions: diameterElements, ...clean() },
    propertySectionPlan: { schema: 'PipelinePropertySectionPlan.v1', sections: propertySections,
      elements: propertyElements, diagnostics: [], blockerCodes: [], ready: true },
    bendResolution: { schema: 'PipelineBendResolution.v3', candidates: [normalCandidate, b314Candidate],
      bendByIncomingElementIndex: { 0: normalCandidate, 2: b314Candidate }, errors: [], hasBlockingErrors: false },
    normalFittingPlan: { schema: 'PipelineNormalFittingPlan.v1', analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
      analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1', bendResolutionSchema: 'PipelineBendResolution.v3',
      migration: migration('PipelineNormalFittingMigration.v1'), fittingResolutions: [normalResolution],
      notApplicableCandidateIds: ['bend:130'], ...clean() },
    b314RadiusPlan: { schema: 'PipelineB314RadiusPlan.v1', analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
      analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1', bendResolutionSchema: 'PipelineBendResolution.v3',
      migration: migration('PipelineB314RadiusMigration.v1'), radiusResolutions: [b314Resolution],
      notApplicableCandidateIds: ['bend:110'], ...clean() },
    greVendorSeriesPlan: { schema: 'PipelineGreVendorSeriesPlan.v1', analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1',
      analysisDiameterPlanSchema: 'PipelineAnalysisDiameterPlan.v1', migration: migration('PipelineGreVendorSeriesMigration.v1'),
      sectionResolutions: [greSection], elementResolutions: greElements,
      notApplicableAnalysisSectionIds: ['AS1', 'AS2'], ...clean() },
  };
}
export function withGreTurn(input = authorityFixture()) {
  const value = structuredClone(input), turn = candidate('bend:150', 4, [140, 150, 160], 'gre-placeholder', 762);
  value.bendResolution.candidates.push(turn); value.bendResolution.bendByIncomingElementIndex[4] = turn;
  value.normalFittingPlan.notApplicableCandidateIds.push(turn.id);
  value.b314RadiusPlan.notApplicableCandidateIds.push(turn.id);
  return value;
}

const input = authorityFixture();
const plan = buildPipelineInputXmlProfileAuthorityPlan(input);
assert.equal(plan.schema, PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA);
assert.equal(plan.sectionAuthorities[0].schema, PIPELINE_INPUTXML_PROFILE_SECTION_AUTHORITY_SCHEMA);
assert.equal(plan.elementAuthorities[0].schema, PIPELINE_INPUTXML_PROFILE_ELEMENT_AUTHORITY_SCHEMA);
assert.equal(plan.fittingAuthorities[0].schema, PIPELINE_INPUTXML_FITTING_AUTHORITY_SCHEMA);
assert.equal(plan.ready, true);
assert.equal(plan.elementAuthorities[0].caesarDiameterMm, 100);
assert.equal(plan.elementAuthorities[0].geometryDisposition, 'MATCHES_AUTHORITY');
assert.equal(plan.elementAuthorities[4].geometryDisposition, 'NOT_A_TURN');
assert.equal(plan.fittingAuthorities[1].bendClass, 'cold-field');
assert.equal(Object.isFrozen(plan.elementAuthorities[0]), true);
assert.equal(buildPipelineInputXmlProfileAuthorityPlanJson(plan),
  buildPipelineInputXmlProfileAuthorityPlanJson(buildPipelineInputXmlProfileAuthorityPlan(authorityFixture())));
const isolated = authorityFixture(), isolatedPlan = buildPipelineInputXmlProfileAuthorityPlan(isolated);
isolated.analysisDiameterPlan.elementResolutions[0].caesarDiameterMm = 999;
assert.equal(isolatedPlan.elementAuthorities[0].caesarDiameterMm, 100);

const propertyConflict = authorityFixture();
propertyConflict.propertySectionPlan.elements[0].properties.diameter = 99;
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(propertyConflict).blockerCodes.includes('PIPELINE_INPUTXML_PROPERTY_CONFLICT'));
const normalMismatch = authorityFixture(); normalMismatch.bendResolution.bendByIncomingElementIndex[0].radiusMm = 149;
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(normalMismatch).blockerCodes.includes('PIPELINE_INPUTXML_FITTING_GEOMETRY_CONFLICT'));
const b314Mismatch = authorityFixture(); b314Mismatch.b314RadiusPlan.radiusResolutions[0].candidateRadiusDisposition = 'REQUIRES_RECOMPUTE';
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(b314Mismatch).blockerCodes.includes('PIPELINE_INPUTXML_FITTING_AUTHORITY_UNRESOLVED'));
const badSchema = authorityFixture(); badSchema.analysisDiameterPlan.schema = 'PipelineAnalysisDiameterPlan.v0';
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(badSchema).blockerCodes.includes('PIPELINE_INPUTXML_AUTHORITY_SCHEMA_INVALID'));
const badOwner = authorityFixture(); badOwner.analysisSectionPlan.elementResolutions[0].analysisSectionId = 'AS2';
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(badOwner).blockerCodes.includes('PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID'));
const badGeometryOwner = authorityFixture(); badGeometryOwner.bendResolution.bendByIncomingElementIndex[0].incomingElementIndex = 2;
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(badGeometryOwner).blockerCodes.includes('PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID'));
const badCoverage = authorityFixture(); badCoverage.normalFittingPlan.notApplicableCandidateIds = [];
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(badCoverage).blockerCodes.includes('PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID'));
const badReadiness = authorityFixture(); badReadiness.normalFittingPlan.ready = false;
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(badReadiness).blockerCodes.includes('PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID'));
const convertedDiameter = authorityFixture(); convertedDiameter.analysisDiameterPlan.migration.greVendorBoreToOutsideDiameterConversionApplied = true;
assert.ok(buildPipelineInputXmlProfileAuthorityPlan(convertedDiameter).blockerCodes.includes('PIPELINE_INPUTXML_AUTHORITY_SCHEMA_INVALID'));
const elastic = authorityFixture(); elastic.bendResolution.candidates[1].bendClass = 'elastic';
elastic.bendResolution.bendByIncomingElementIndex[2].bendClass = 'elastic';
elastic.b314RadiusPlan.radiusResolutions[0].bendClass = 'elastic';
elastic.b314RadiusPlan.radiusResolutions[0].radiusPolicyId = 'b31.4-elastic-screening';
const elasticPlan = buildPipelineInputXmlProfileAuthorityPlan(elastic);
assert.equal(elasticPlan.ready, true);
assert.equal(elasticPlan.fittingAuthorities[1].bendClass, 'elastic');
const greTurn = buildPipelineInputXmlProfileAuthorityPlan(withGreTurn());
assert.equal(greTurn.ready, false);
assert.ok(greTurn.blockerCodes.includes('PIPELINE_INPUTXML_GRE_BEND_GEOMETRY_REQUIRED'));
assert.equal(greTurn.fittingAuthorities.at(-1).fittingThicknessMm, 14);
assert.equal(greTurn.elementAuthorities[4].geometryDisposition, 'GRE_GEOMETRY_NOT_ADOPTED');
for (const malformed of [null, [], { analysisSectionPlan: { sections: [null] } }, { bendResolution: { candidates: [null] } }]) {
  assert.doesNotThrow(() => buildPipelineInputXmlProfileAuthorityPlan(malformed));
  assert.equal(buildPipelineInputXmlProfileAuthorityPlan(malformed).ready, false);
}
console.log('pipeline-3d-model InputXML profile authority: PASS');
