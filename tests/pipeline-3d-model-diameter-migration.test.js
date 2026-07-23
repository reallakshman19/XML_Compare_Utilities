import assert from 'node:assert/strict';
import { resolvePipelineAnalysisDiameterPlan } from '../tabs/pipeline-3d-model/pipeline-3d-model-diameter-resolution.js';

function analysis(profileId = 'normal-metallic', mode = 'NORMAL') {
  return {
    schema: 'PipelineAnalysisSectionPlan.v1', ready: true,
    sections: [{ schema: 'PipelineAnalysisSection.v1', analysisSectionId: 'AS1', startElementIndex: 0, profileId }],
    elementResolutions: [0, 1, 2].map((elementIndex) => ({
      schema: 'PipelineElementSectionResolution.v1', elementIndex, elementId: `E${elementIndex + 1}`,
      analysisSectionId: 'AS1', profileId, resolvedMode: mode,
      sectionDisposition: elementIndex === 0 ? 'SECTION_START' : 'INHERITED', ready: true,
    })),
  };
}
function properties(values = [114.3, 114.3, 114.3]) {
  return {
    schema: 'PipelinePropertySectionPlan.v1', ready: true, sectionCount: 1,
    sections: [{ schema: 'PipelinePropertySection.v1', sectionId: 'S1', startElementIndex: 0 }],
    elements: values.map((diameter, elementIndex) => ({
      schema: 'PipelineElementPropertyResolution.v1', elementIndex, elementId: `E${elementIndex + 1}`,
      sectionId: 'S1', propertyDisposition: elementIndex === 0 ? 'SECTION_START' : 'INHERITED',
      properties: { diameter }, emittedProperties: {}, effectiveSources: { diameter: 'BASE_BRANCH_INFO' },
    })),
  };
}
const base = { analysisSectionPlan: analysis(), propertySectionPlan: properties(), sourceAuthority: 'TEST' };

const explicit = resolvePipelineAnalysisDiameterPlan({ ...base, outsideDiameterMm: 168.3 });
assert.equal(explicit.ready, true);
assert.equal(explicit.sectionResolutions[0].outsideDiameterMm, 168.3);
assert.equal(explicit.sectionResolutions[0].caesarDiameterMm, 168.3);
assert.equal(explicit.sectionResolutions[0].sourceKind, 'EXPLICIT_GLOBAL');

const settingsExplicit = resolvePipelineAnalysisDiameterPlan({ ...base,
  settings: { diameterSource: 'explicit-od', explicitOutsideDiameterMm: 219.1 } });
assert.equal(settingsExplicit.ready, true);
assert.equal(settingsExplicit.sectionResolutions[0].outsideDiameterMm, 219.1);
assert.equal(settingsExplicit.sectionResolutions[0].sourceKind, 'SETTINGS_EXPLICIT_OD');

const confirmedBranch = resolvePipelineAnalysisDiameterPlan({ ...base, branchInfo: { boreMm: 114.3 },
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true } });
assert.equal(confirmedBranch.ready, true);
assert.equal(confirmedBranch.sectionResolutions[0].outsideDiameterMm, 114.3);
assert.equal(confirmedBranch.migration.legacyDiameterBasisConfirmed, true);

const unconfirmedBranch = resolvePipelineAnalysisDiameterPlan({ ...base, branchInfo: { boreMm: 114.3 } });
assert.equal(unconfirmedBranch.ready, false);
assert.ok(unconfirmedBranch.blockerCodes.includes('PIPELINE_DIAMETER_BASIS_UNCONFIRMED'));
assert.equal(unconfirmedBranch.sectionResolutions[0].outsideDiameterMm, null);

const unconfirmedProperty = resolvePipelineAnalysisDiameterPlan({ ...base });
assert.equal(unconfirmedProperty.ready, false);
assert.ok(unconfirmedProperty.blockerCodes.includes('PIPELINE_DIAMETER_BASIS_UNCONFIRMED'));

const explicitOverridesStale = resolvePipelineAnalysisDiameterPlan({ ...base, outsideDiameterMm: 273,
  branchInfo: { boreMm: 114.3 }, settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: false } });
assert.equal(explicitOverridesStale.ready, true);
assert.equal(explicitOverridesStale.sectionResolutions[0].outsideDiameterMm, 273);
assert.ok(!explicitOverridesStale.blockerCodes.includes('PIPELINE_DIAMETER_BASIS_UNCONFIRMED'));

const sectionConflict = resolvePipelineAnalysisDiameterPlan({ ...base, diameterSections: [
  { analysisSectionId: 'AS1', outsideDiameterMm: 100 },
  { startElementIndex: 0, outsideDiameterMm: 120 },
] });
assert.equal(sectionConflict.ready, false);
assert.ok(sectionConflict.blockerCodes.includes('PIPELINE_DIAMETER_SOURCE_CONFLICT'));

const npsOnly = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis(), propertySectionPlan: properties([null, null, null]), nominalPipeSizeNps: 8,
});
assert.equal(npsOnly.sectionResolutions[0].nominalPipeSizeNps, 8);
assert.equal(npsOnly.sectionResolutions[0].outsideDiameterMm, null);
assert.equal(npsOnly.sectionResolutions[0].caesarDiameterMm, null);
assert.ok(npsOnly.blockerCodes.includes('PIPELINE_OUTSIDE_DIAMETER_REQUIRED'));

const greOnly = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis('gre', 'GRE'), propertySectionPlan: properties([null, null, null]),
  greVendorNominalBoreMm: 200,
});
assert.equal(greOnly.ready, true);
assert.equal(greOnly.sectionResolutions[0].greVendorNominalBoreMm, 200);
assert.equal(greOnly.sectionResolutions[0].outsideDiameterMm, null);
assert.equal(greOnly.sectionResolutions[0].caesarDiameterMm, null);
assert.equal(greOnly.migration.npsToOutsideDiameterConversionApplied, false);
assert.equal(greOnly.migration.greVendorBoreToOutsideDiameterConversionApplied, false);

const mutable = { ...base, outsideDiameterMm: 168.3,
  diameterSections: [{ analysisSectionId: 'AS1', nominalPipeSizeNps: 6 }] };
const isolated = resolvePipelineAnalysisDiameterPlan(mutable);
mutable.outsideDiameterMm = 999;
mutable.diameterSections[0].nominalPipeSizeNps = 99;
mutable.propertySectionPlan.elements[0].properties.diameter = 999;
assert.equal(isolated.sectionResolutions[0].outsideDiameterMm, 168.3);
assert.equal(isolated.sectionResolutions[0].nominalPipeSizeNps, 6);
assert.doesNotThrow(() => JSON.parse(JSON.stringify(isolated)));

console.log('Pipeline diameter legacy migration tests passed.');
