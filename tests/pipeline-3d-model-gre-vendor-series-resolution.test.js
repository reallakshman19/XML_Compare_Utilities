import assert from 'node:assert/strict';
import {
  buildPipelineGreVendorSeriesLedgerText,
  buildPipelineGreVendorSeriesPlanJson,
  resolvePipelineGreVendorSeriesPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-vendor-series-resolution.js';

const section = (id, start, profileId) => ({ schema: 'PipelineAnalysisSection.v1', analysisSectionId: id,
  startElementIndex: start, profileId, boundaryAuthority: 'TEST', boundarySourceReference: '',
  sourceAuthority: 'TEST', sourceReference: '', status: 'CONTRACT_ONLY', diagnostics: [], blockerCodes: [] });
const element = (index, sectionId, profileId, mode, start) => ({ schema: 'PipelineElementSectionResolution.v1',
  elementIndex: index, elementId: `E${index + 1}`, analysisSectionId: sectionId, profileId, resolvedMode: mode,
  sectionDisposition: start ? 'SECTION_START' : 'INHERITED', boundaryNode: start ? 100 + index : null,
  sourceAuthority: 'TEST', sourceReference: '', diagnostics: [], blockerCodes: [], ready: true });
function fixture() {
  const sections = [section('AS1', 0, 'gre'), section('AS2', 2, 'gre'),
    section('AS3', 4, 'normal-metallic'), section('AS4', 6, 'asme-b31.4')];
  const elements = [element(0, 'AS1', 'gre', 'GRE', true), element(1, 'AS1', 'gre', 'GRE', false),
    element(2, 'AS2', 'gre', 'GRE', true), element(3, 'AS2', 'gre', 'GRE', false),
    element(4, 'AS3', 'normal-metallic', 'NORMAL', true), element(5, 'AS3', 'normal-metallic', 'NORMAL', false),
    element(6, 'AS4', 'asme-b31.4', 'ASME_B31_4', true), element(7, 'AS4', 'asme-b31.4', 'ASME_B31_4', false)];
  const values = [
    { outsideDiameterMm: 400, nominalPipeSizeNps: null, greVendorNominalBoreMm: 254 },
    { outsideDiameterMm: 500, nominalPipeSizeNps: null, greVendorNominalBoreMm: 300 },
    { outsideDiameterMm: 114.3, nominalPipeSizeNps: 4, greVendorNominalBoreMm: null },
    { outsideDiameterMm: 508, nominalPipeSizeNps: 20, greVendorNominalBoreMm: null },
  ];
  const modes = ['GRE', 'GRE', 'NORMAL', 'ASME_B31_4'];
  const diameterSections = sections.map((item, index) => ({ schema: 'PipelineAnalysisDiameterResolution.v1',
    analysisSectionId: item.analysisSectionId, profileId: item.profileId, resolvedMode: modes[index],
    startElementIndex: item.startElementIndex, ...values[index], caesarDiameterMm: values[index].outsideDiameterMm,
    physicalDiameterReady: true, sizeBandInputReady: values[index].nominalPipeSizeNps != null,
    vendorSeriesInputReady: values[index].greVendorNominalBoreMm != null, sourceKind: 'EXPLICIT',
    sourceAuthority: 'TEST', sourceReference: '', quantitySources: {}, status: 'RESOLVED',
    diagnostics: [], blockerCodes: [], ready: true }));
  const diameterElements = elements.map((item) => {
    const owner = diameterSections.find((candidate) => candidate.analysisSectionId === item.analysisSectionId);
    return { schema: 'PipelineElementDiameterResolution.v1', elementIndex: item.elementIndex, elementId: item.elementId,
      analysisSectionId: item.analysisSectionId, profileId: item.profileId, outsideDiameterMm: owner.outsideDiameterMm,
      nominalPipeSizeNps: owner.nominalPipeSizeNps, greVendorNominalBoreMm: owner.greVendorNominalBoreMm,
      caesarDiameterMm: owner.caesarDiameterMm, propertyDiameterMm: null,
      diameterDisposition: item.sectionDisposition, sourceKind: 'EXPLICIT', diagnostics: [], blockerCodes: [], ready: true };
  });
  return {
    analysisSectionPlan: { schema: 'PipelineAnalysisSectionPlan.v1', sections, elementResolutions: elements,
      diagnostics: [], blockerCodes: [], ready: true },
    analysisDiameterPlan: { schema: 'PipelineAnalysisDiameterPlan.v1',
      analysisSectionPlanSchema: 'PipelineAnalysisSectionPlan.v1', propertySectionPlanSchema: 'PipelinePropertySectionPlan.v1',
      migration: { schema: 'PipelineDiameterMigration.v1', outsideDiameterSourceKinds: ['EXPLICIT'],
        nominalPipeSizeSourceKinds: ['EXPLICIT'], greVendorNominalBoreSourceKinds: ['EXPLICIT'],
        legacyDiameterEvidenceObserved: false, legacyDiameterBasisConfirmed: false,
        npsToOutsideDiameterConversionApplied: false, greVendorBoreToOutsideDiameterConversionApplied: false,
        sourceAuthority: 'TEST', sourceReference: '', diagnostics: [], blockerCodes: [], ready: true },
      sectionResolutions: diameterSections, elementResolutions: diameterElements,
      diagnostics: [], blockerCodes: [], ready: true },
    grePlaceholder: { schema: 'PipelineGreFittingPlaceholder.v1', active: false, policyReady: false,
      resolverReady: false, geometryApplied: false, inputXmlApplied: false, requirementReference: '',
      bend: { radiusBasis: 'GRE_PLACEHOLDER', radiusMm: null, breakLengthBasis: 'NOMINAL_BORE', nominalBoreMm: null,
        breakMultiplierBore: 1.5, breakLengthMm: null, localThicknessMm: null, resolverReady: false },
      tee: { breakLengthBasis: 'CUSTOM_LENGTH', breakLengthMm: null, localThicknessMm: null, resolverReady: false } },
  };
}
const multiplier254 = { analysisSectionId: 'AS1', vendorId: 'VENDOR-A', seriesId: 'SERIES-254',
  qualificationEvidenceId: 'QUAL-254', requirementReference: 'REQ-A', greVendorNominalBoreMm: 254,
  bendPolicyId: 'gre-vendor-qualified-bend', bendRadiusMm: 800,
  bendBreakLengthBasis: 'NOMINAL_BORE_MULTIPLIER', bendBreakMultiplierBore: 2,
  bendBreakLengthMm: 508, bendLocalThicknessMm: 11, teePolicyId: 'gre-vendor-qualified-tee',
  teeBreakLengthBasis: 'EXPLICIT_LENGTH', teeBreakLengthMm: 260, teeLocalThicknessMm: 13,
  sourceAuthority: 'PROJECT', sourceReference: 'A-254' };
const explicit300 = { vendorId: 'VENDOR-B', seriesId: 'SERIES-300', qualificationEvidenceId: 'QUAL-300',
  requirementReference: 'REQ-B', greVendorNominalBoreMm: 300, bendPolicyId: 'gre-vendor-qualified-bend',
  bendRadiusMm: 900, bendBreakLengthBasis: 'EXPLICIT_LENGTH', bendBreakMultiplierBore: null,
  bendBreakLengthMm: 450, bendLocalThicknessMm: 12, teePolicyId: 'gre-vendor-qualified-tee',
  teeBreakLengthBasis: 'EXPLICIT_LENGTH', teeBreakLengthMm: 320, teeLocalThicknessMm: 15,
  sourceAuthority: 'PROJECT', sourceReference: 'B-300' };

const input = { ...fixture(), greVendorSeriesSections: [multiplier254], greVendorSeriesGlobal: [explicit300] };
const plan = resolvePipelineGreVendorSeriesPlan(input);
assert.equal(plan.ready, true);
assert.equal(plan.sectionResolutions.length, 2);
assert.equal(plan.elementResolutions.length, 4);
assert.deepEqual(plan.notApplicableAnalysisSectionIds, ['AS3', 'AS4']);
assert.equal(plan.sectionResolutions[0].bendBreakLengthMm, 508);
assert.notEqual(plan.sectionResolutions[0].bendBreakLengthMm, 400 * 2);
assert.equal(plan.sectionResolutions[1].bendBreakLengthBasis, 'EXPLICIT_LENGTH');
assert.equal(plan.sectionResolutions[1].bendBreakMultiplierBore, null);
assert.equal(plan.elementResolutions[0].sectionDisposition, 'SECTION_START');
assert.equal(plan.elementResolutions[1].sectionDisposition, 'INHERITED');
assert.equal(Object.isFrozen(plan), true);
assert.equal(Object.isFrozen(plan.sectionResolutions[0]), true);
assert.equal(buildPipelineGreVendorSeriesPlanJson(plan), buildPipelineGreVendorSeriesPlanJson(resolvePipelineGreVendorSeriesPlan(input)));
assert.equal(buildPipelineGreVendorSeriesLedgerText(plan), buildPipelineGreVendorSeriesLedgerText(resolvePipelineGreVendorSeriesPlan(input)));
assert.match(buildPipelineGreVendorSeriesLedgerText(plan), /^RecordType\tSchema/m);

const isolatedInput = structuredClone(input);
const isolated = resolvePipelineGreVendorSeriesPlan(isolatedInput);
isolatedInput.greVendorSeriesSections[0].vendorId = 'MUTATED';
isolatedInput.analysisDiameterPlan.sectionResolutions[0].greVendorNominalBoreMm = 999;
assert.equal(isolated.sectionResolutions[0].vendorId, 'VENDOR-A');
assert.equal(isolated.sectionResolutions[0].greVendorNominalBoreMm, 254);

const unsupportedField = resolvePipelineGreVendorSeriesPlan({ ...fixture(),
  greVendorSeriesSections: [{ ...multiplier254, outsideDiameterMm: 254 }] });
assert.equal(unsupportedField.ready, false);
assert.ok(unsupportedField.blockerCodes.includes('PIPELINE_GRE_VENDOR_INPUT_INVALID'));

const orphan = fixture();
orphan.analysisSectionPlan.sections[1].startElementIndex = orphan.analysisSectionPlan.elementResolutions.length;
orphan.analysisDiameterPlan.sectionResolutions[1].startElementIndex = orphan.analysisSectionPlan.elementResolutions.length;
const orphanResult = resolvePipelineGreVendorSeriesPlan({ ...orphan,
  greVendorSeriesSections: [multiplier254], greVendorSeriesGlobal: [explicit300] });
assert.equal(orphanResult.ready, false);
assert.ok(orphanResult.blockerCodes.includes('PIPELINE_GRE_VENDOR_OWNERSHIP_INVALID'));

const converted = fixture();
converted.analysisDiameterPlan.migration.greVendorBoreToOutsideDiameterConversionApplied = true;
const convertedResult = resolvePipelineGreVendorSeriesPlan({ ...converted,
  greVendorSeriesSections: [multiplier254], greVendorSeriesGlobal: [explicit300] });
assert.equal(convertedResult.ready, false);
assert.ok(convertedResult.blockerCodes.includes('PIPELINE_GRE_VENDOR_DIAMETER_PLAN_INVALID'));

const forgedRoot = fixture();
forgedRoot.analysisDiameterPlan.ready = false;
const forgedRootResult = resolvePipelineGreVendorSeriesPlan({ ...forgedRoot,
  greVendorSeriesSections: [multiplier254], greVendorSeriesGlobal: [explicit300] });
assert.equal(forgedRootResult.ready, false);
assert.equal(forgedRootResult.sectionResolutions.every((item) => item.status === 'BLOCKED'), true);

const vendorFlag = fixture();
vendorFlag.analysisDiameterPlan.sectionResolutions[0].vendorSeriesInputReady = false;
const vendorFlagResult = resolvePipelineGreVendorSeriesPlan({ ...vendorFlag,
  greVendorSeriesSections: [multiplier254], greVendorSeriesGlobal: [explicit300] });
assert.equal(vendorFlagResult.ready, false);
assert.equal(vendorFlagResult.sectionResolutions.every((item) => item.status === 'BLOCKED'), true);
assert.ok(vendorFlagResult.blockerCodes.includes('PIPELINE_GRE_VENDOR_DIAMETER_PLAN_INVALID'));

const elementBoreMismatch = fixture();
elementBoreMismatch.analysisDiameterPlan.elementResolutions[0].greVendorNominalBoreMm = 253;
const elementMismatchResult = resolvePipelineGreVendorSeriesPlan({ ...elementBoreMismatch,
  greVendorSeriesSections: [multiplier254], greVendorSeriesGlobal: [explicit300] });
assert.equal(elementMismatchResult.ready, false);
assert.ok(elementMismatchResult.blockerCodes.includes('PIPELINE_GRE_VENDOR_DIAMETER_PLAN_INVALID'));

const cyclic = {};
cyclic.self = cyclic;
for (const malformed of [null, [], cyclic, { analysisSectionPlan: { schema: 'PipelineAnalysisSectionPlan.v1',
  ready: true, sections: [null], elementResolutions: [] } }, { ...fixture(), greVendorSeriesGlobal: [null] },
{ ...fixture(), greVendorSeriesGlobal: [{ ...explicit300, vendorId: new Date(0) }] }]) {
  assert.doesNotThrow(() => resolvePipelineGreVendorSeriesPlan(malformed));
  assert.equal(resolvePipelineGreVendorSeriesPlan(malformed).ready, false);
}

console.log('pipeline-3d-model GRE vendor-series resolution: PASS');
