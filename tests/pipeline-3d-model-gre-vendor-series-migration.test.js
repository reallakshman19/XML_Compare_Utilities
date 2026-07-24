import assert from 'node:assert/strict';
import {
  buildPipelineGreVendorSeriesPlanJson,
  resolvePipelineGreVendorSeriesPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-vendor-series-resolution.js';

const analysisSection = (id, start, profileId) => ({
  schema: 'PipelineAnalysisSection.v1', analysisSectionId: id, startElementIndex: start, profileId,
  boundaryAuthority: 'TEST', boundarySourceReference: '', sourceAuthority: 'TEST', sourceReference: '',
  status: 'CONTRACT_ONLY', diagnostics: [], blockerCodes: [],
});
const analysisElement = (index, section, profileId, mode, start) => ({
  schema: 'PipelineElementSectionResolution.v1', elementIndex: index, elementId: `E${index + 1}`,
  analysisSectionId: section, profileId, resolvedMode: mode,
  sectionDisposition: start ? 'SECTION_START' : 'INHERITED', boundaryNode: start ? 100 + index : null,
  sourceAuthority: 'TEST', sourceReference: '', diagnostics: [], blockerCodes: [], ready: true,
});
function fixture() {
  const sections = [analysisSection('AS1', 0, 'gre'), analysisSection('AS2', 2, 'normal-metallic'),
    analysisSection('AS3', 4, 'asme-b31.4')];
  const elements = [analysisElement(0, 'AS1', 'gre', 'GRE', true), analysisElement(1, 'AS1', 'gre', 'GRE', false),
    analysisElement(2, 'AS2', 'normal-metallic', 'NORMAL', true),
    analysisElement(3, 'AS2', 'normal-metallic', 'NORMAL', false),
    analysisElement(4, 'AS3', 'asme-b31.4', 'ASME_B31_4', true),
    analysisElement(5, 'AS3', 'asme-b31.4', 'ASME_B31_4', false)];
  const diameterSections = [
    { schema: 'PipelineAnalysisDiameterResolution.v1', analysisSectionId: 'AS1', profileId: 'gre', resolvedMode: 'GRE',
      startElementIndex: 0, outsideDiameterMm: 300, nominalPipeSizeNps: null, greVendorNominalBoreMm: 254,
      caesarDiameterMm: 300, physicalDiameterReady: true, sizeBandInputReady: false, vendorSeriesInputReady: true,
      sourceKind: 'EXPLICIT', sourceAuthority: 'TEST', sourceReference: '', quantitySources: {},
      status: 'RESOLVED', diagnostics: [], blockerCodes: [], ready: true },
    { schema: 'PipelineAnalysisDiameterResolution.v1', analysisSectionId: 'AS2', profileId: 'normal-metallic', resolvedMode: 'NORMAL',
      startElementIndex: 2, outsideDiameterMm: 114.3, nominalPipeSizeNps: 4, greVendorNominalBoreMm: null,
      caesarDiameterMm: 114.3, physicalDiameterReady: true, sizeBandInputReady: true, vendorSeriesInputReady: false,
      sourceKind: 'EXPLICIT', sourceAuthority: 'TEST', sourceReference: '', quantitySources: {},
      status: 'RESOLVED', diagnostics: [], blockerCodes: [], ready: true },
    { schema: 'PipelineAnalysisDiameterResolution.v1', analysisSectionId: 'AS3', profileId: 'asme-b31.4', resolvedMode: 'ASME_B31_4',
      startElementIndex: 4, outsideDiameterMm: 508, nominalPipeSizeNps: 20, greVendorNominalBoreMm: null,
      caesarDiameterMm: 508, physicalDiameterReady: true, sizeBandInputReady: true, vendorSeriesInputReady: false,
      sourceKind: 'EXPLICIT', sourceAuthority: 'TEST', sourceReference: '', quantitySources: {},
      status: 'RESOLVED', diagnostics: [], blockerCodes: [], ready: true },
  ];
  const diameterElements = elements.map((element) => {
    const owner = diameterSections.find((section) => section.analysisSectionId === element.analysisSectionId);
    return { schema: 'PipelineElementDiameterResolution.v1', elementIndex: element.elementIndex, elementId: element.elementId,
      analysisSectionId: element.analysisSectionId, profileId: element.profileId,
      outsideDiameterMm: owner.outsideDiameterMm, nominalPipeSizeNps: owner.nominalPipeSizeNps,
      greVendorNominalBoreMm: owner.greVendorNominalBoreMm, caesarDiameterMm: owner.caesarDiameterMm,
      propertyDiameterMm: null, diameterDisposition: element.sectionDisposition, sourceKind: 'EXPLICIT',
      diagnostics: [], blockerCodes: [], ready: true };
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
    grePlaceholder: { schema: 'PipelineGreFittingPlaceholder.v1', active: true, policyReady: false,
      resolverReady: false, geometryApplied: false, inputXmlApplied: false, requirementReference: 'LEGACY-REQ',
      bend: { radiusBasis: 'GRE_PLACEHOLDER', radiusMm: 700, breakLengthBasis: 'NOMINAL_BORE',
        nominalBoreMm: 254, breakMultiplierBore: 1.5, breakLengthMm: 381,
        localThicknessMm: 10, resolverReady: false },
      tee: { breakLengthBasis: 'CUSTOM_LENGTH', breakLengthMm: 280,
        localThicknessMm: 12, resolverReady: false } },
  };
}
const series = (vendorId, sourceReference, overrides = {}) => ({
  vendorId, seriesId: 'SERIES-254', qualificationEvidenceId: 'QUAL-254', requirementReference: 'REQ-550',
  greVendorNominalBoreMm: 254, bendPolicyId: 'gre-vendor-qualified-bend', bendRadiusMm: 762,
  bendBreakLengthBasis: 'NOMINAL_BORE_MULTIPLIER', bendBreakMultiplierBore: 1.5,
  bendBreakLengthMm: 381, bendLocalThicknessMm: 12, teePolicyId: 'gre-vendor-qualified-tee',
  teeBreakLengthBasis: 'EXPLICIT_LENGTH', teeBreakLengthMm: 300, teeLocalThicknessMm: 14,
  sourceAuthority: 'PROJECT', sourceReference, ...overrides,
});
const legacy = {
  settings: { designBasis: 'gre' }, legacyGreVendorSeriesBasisConfirmed: true,
  legacyGreVendorId: 'LEGACY-VENDOR', legacyGreSeriesId: 'LEGACY-SERIES',
  legacyGreQualificationEvidenceId: 'LEGACY-QUAL', sourceAuthority: 'LEGACY', sourceReference: 'SETTINGS-1',
};

const sectionWins = resolvePipelineGreVendorSeriesPlan({ ...fixture(), ...legacy,
  greVendorSeriesSections: [{ analysisSectionId: 'AS1', ...series('SECTION-VENDOR', 'S1') }],
  greVendorSeriesGlobal: [series('GLOBAL-VENDOR', 'G1')] });
assert.equal(sectionWins.ready, true);
assert.equal(sectionWins.sectionResolutions[0].sourceKind, 'EXPLICIT_ANALYSIS_SECTION_VENDOR_SERIES');
assert.equal(sectionWins.sectionResolutions[0].vendorId, 'SECTION-VENDOR');
assert.equal(sectionWins.migration.legacyEvidenceObserved, false);

const globalWins = resolvePipelineGreVendorSeriesPlan({ ...fixture(), ...legacy,
  greVendorSeriesGlobal: [series('GLOBAL-VENDOR', 'G1')] });
assert.equal(globalWins.ready, true);
assert.equal(globalWins.sectionResolutions[0].sourceKind, 'EXPLICIT_GLOBAL_GRE_VENDOR_SERIES');

const legacyWins = resolvePipelineGreVendorSeriesPlan({ ...fixture(), ...legacy });
assert.equal(legacyWins.ready, true);
assert.equal(legacyWins.sectionResolutions[0].sourceKind, 'CONFIRMED_LEGACY_GRE_PLACEHOLDER');
assert.equal(legacyWins.sectionResolutions[0].bendBreakLengthBasis, 'NOMINAL_BORE_MULTIPLIER');
assert.deepEqual(legacyWins.migration.legacyAnalysisSectionIds, ['AS1']);

const invalidHigh = resolvePipelineGreVendorSeriesPlan({ ...fixture(), ...legacy,
  greVendorSeriesSections: [{ analysisSectionId: 'AS1', ...series('BAD', 'S1', { bendRadiusMm: true }) }],
  greVendorSeriesGlobal: [series('GLOBAL-VENDOR', 'G1')] });
assert.equal(invalidHigh.ready, false);
assert.equal(invalidHigh.sectionResolutions[0].sourceKind, 'EXPLICIT_ANALYSIS_SECTION_VENDOR_SERIES');
assert.ok(invalidHigh.blockerCodes.includes('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID'));

const invalidGlobalHigh = resolvePipelineGreVendorSeriesPlan({ ...fixture(), ...legacy,
  greVendorSeriesGlobal: [series('BAD-GLOBAL', 'G1', { teeLocalThicknessMm: false })] });
assert.equal(invalidGlobalHigh.ready, false);
assert.equal(invalidGlobalHigh.sectionResolutions[0].sourceKind, 'EXPLICIT_GLOBAL_GRE_VENDOR_SERIES');
assert.ok(invalidGlobalHigh.blockerCodes.includes('PIPELINE_GRE_VENDOR_TEE_INPUT_INVALID'));

const boreMismatch = resolvePipelineGreVendorSeriesPlan({ ...fixture(),
  greVendorSeriesSections: [{ analysisSectionId: 'AS1', ...series('BAD-BORE', 'S1', { greVendorNominalBoreMm: 250 }) }] });
assert.equal(boreMismatch.ready, false);
assert.ok(boreMismatch.blockerCodes.includes('PIPELINE_GRE_VENDOR_NOMINAL_BORE_CONFLICT'));

const duplicateEquivalentA = series('GLOBAL', 'G1', { greVendorNominalBoreMm: '254', bendBreakMultiplierBore: '1.5' });
const duplicateEquivalentB = series('GLOBAL', 'G1');
const duplicateA = resolvePipelineGreVendorSeriesPlan({ ...fixture(), greVendorSeriesGlobal: [duplicateEquivalentA, duplicateEquivalentB] });
const duplicateB = resolvePipelineGreVendorSeriesPlan({ ...fixture(), greVendorSeriesGlobal: [duplicateEquivalentB, duplicateEquivalentA] });
assert.equal(duplicateA.ready, true);
assert.equal(buildPipelineGreVendorSeriesPlanJson(duplicateA), buildPipelineGreVendorSeriesPlanJson(duplicateB));

const duplicateConflict = resolvePipelineGreVendorSeriesPlan({ ...fixture(),
  greVendorSeriesGlobal: [series('GLOBAL', 'G1'), series('GLOBAL', 'G2')] });
assert.equal(duplicateConflict.ready, false);
assert.ok(duplicateConflict.blockerCodes.includes('PIPELINE_GRE_VENDOR_SOURCE_CONFLICT'));

const unusedInvalid = resolvePipelineGreVendorSeriesPlan({ ...fixture(), greVendorSeriesGlobal: [
  series('GLOBAL', 'G1'), series('UNUSED', 'U1', { greVendorNominalBoreMm: 400, qualificationEvidenceId: '' })] });
assert.equal(unusedInvalid.ready, false);
assert.ok(unusedInvalid.blockerCodes.includes('PIPELINE_GRE_VENDOR_QUALIFICATION_REQUIRED'));

const noNearest = resolvePipelineGreVendorSeriesPlan({ ...fixture(), grePlaceholder: { ...fixture().grePlaceholder, active: false },
  greVendorSeriesGlobal: [series('LOW', 'L1', { greVendorNominalBoreMm: 253,
    bendBreakLengthMm: 379.5 }), series('HIGH', 'H1', { greVendorNominalBoreMm: 255, bendBreakLengthMm: 382.5 })] });
assert.equal(noNearest.ready, false);
assert.ok(noNearest.blockerCodes.includes('PIPELINE_GRE_VENDOR_AUTHORITY_UNRESOLVED'));

const unconfirmed = resolvePipelineGreVendorSeriesPlan({ ...fixture(), ...legacy,
  legacyGreVendorSeriesBasisConfirmed: false });
assert.equal(unconfirmed.ready, false);
assert.ok(unconfirmed.blockerCodes.includes('PIPELINE_GRE_VENDOR_LEGACY_AUTHORITY_UNCONFIRMED'));

const legacyMismatchInput = fixture();
legacyMismatchInput.grePlaceholder.bend.nominalBoreMm = 250;
legacyMismatchInput.grePlaceholder.bend.breakLengthMm = 375;
const legacyMismatch = resolvePipelineGreVendorSeriesPlan({ ...legacyMismatchInput, ...legacy });
assert.equal(legacyMismatch.ready, false);
assert.ok(legacyMismatch.blockerCodes.includes('PIPELINE_GRE_VENDOR_NOMINAL_BORE_CONFLICT'));

const legacyExplicitInput = fixture();
legacyExplicitInput.grePlaceholder.bend.breakLengthBasis = 'EXPLICIT_LENGTH';
legacyExplicitInput.grePlaceholder.bend.breakMultiplierBore = null;
legacyExplicitInput.grePlaceholder.bend.breakLengthMm = 420;
const legacyExplicit = resolvePipelineGreVendorSeriesPlan({ ...legacyExplicitInput, ...legacy });
assert.equal(legacyExplicit.ready, true);
assert.equal(legacyExplicit.sectionResolutions[0].bendBreakLengthBasis, 'EXPLICIT_LENGTH');
assert.equal(legacyExplicit.sectionResolutions[0].bendBreakMultiplierBore, null);
assert.equal(legacyExplicit.sectionResolutions[0].bendBreakLengthMm, 420);

const nonGreTarget = resolvePipelineGreVendorSeriesPlan({ ...fixture(), greVendorSeriesGlobal: [series('GLOBAL', 'G1')],
  greVendorSeriesSections: [{ analysisSectionId: 'AS2', ...series('WRONG-TARGET', 'S2') }] });
assert.equal(nonGreTarget.ready, false);
assert.ok(nonGreTarget.blockerCodes.includes('PIPELINE_GRE_VENDOR_TARGET_INVALID'));

console.log('pipeline-3d-model GRE vendor-series migration: PASS');
