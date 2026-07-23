import assert from 'node:assert/strict';
import {
  buildPipelineAnalysisDiameterLedgerText,
  buildPipelineAnalysisDiameterPlanJson,
  resolvePipelineAnalysisDiameterPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-diameter-resolution.js';

function analysis(sectionDefs, elementCount) {
  const sections = sectionDefs.map((item, index) => ({ schema: 'PipelineAnalysisSection.v1',
    analysisSectionId: `AS${index + 1}`, startElementIndex: item.start, profileId: item.profileId }));
  return { schema: 'PipelineAnalysisSectionPlan.v1', ready: true, sections,
    elementResolutions: Array.from({ length: elementCount }, (_, elementIndex) => {
      let owner = sections[0];
      sections.forEach((section) => { if (section.startElementIndex <= elementIndex) owner = section; });
      const mode = owner.profileId === 'gre' ? 'GRE' : owner.profileId === 'asme-b31.4' ? 'ASME_B31_4' : 'NORMAL';
      return { schema: 'PipelineElementSectionResolution.v1', elementIndex, elementId: `E${elementIndex + 1}`,
        analysisSectionId: owner.analysisSectionId, profileId: owner.profileId, resolvedMode: mode,
        sectionDisposition: owner.startElementIndex === elementIndex ? 'SECTION_START' : 'INHERITED', ready: true };
    }) };
}
function property(values, sectionStarts = [0]) {
  const sections = sectionStarts.map((start, index) => ({ schema: 'PipelinePropertySection.v1',
    sectionId: `S${index + 1}`, startElementIndex: start }));
  return { schema: 'PipelinePropertySectionPlan.v1', ready: true, sectionCount: sections.length, sections,
    elements: values.map((diameter, elementIndex) => {
      let owner = sections[0]; sections.forEach((section) => { if (section.startElementIndex <= elementIndex) owner = section; });
      return { schema: 'PipelineElementPropertyResolution.v1', elementIndex, elementId: `E${elementIndex + 1}`,
        sectionId: owner.sectionId, propertyDisposition: owner.startElementIndex === elementIndex ? 'SECTION_START' : 'INHERITED',
        properties: { diameter }, emittedProperties: {}, effectiveSources: { diameter: owner.sectionId } };
    }) };
}
function deepFrozen(value) {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(deepFrozen);
}

const normalAnalysis = analysis([{ start: 0, profileId: 'normal-metallic' }], 4);
const normalProperty = property([114.3, 114.3, 114.3, 114.3]);
const normal = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: normalAnalysis,
  propertySectionPlan: normalProperty, outsideDiameterMm: 114.3 });
assert.equal(normal.ready, true);
assert.equal(normal.sectionResolutions.length, 1);
assert.equal(normal.elementResolutions.length, 4);
assert.ok(normal.elementResolutions.every((item) => item.analysisSectionId === 'AS1'));
assert.deepEqual(normal.elementResolutions.map((item) => item.diameterDisposition),
  ['SECTION_START', 'INHERITED', 'INHERITED', 'INHERITED']);

const b314 = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis([{ start: 0, profileId: 'asme-b31.4' }], 2),
  propertySectionPlan: property([273, 273]), outsideDiameterMm: 273, nominalPipeSizeNps: 10,
});
assert.equal(b314.ready, true);
assert.equal(b314.sectionResolutions[0].outsideDiameterMm, 273);
assert.equal(b314.sectionResolutions[0].nominalPipeSizeNps, 10);
assert.equal(b314.sectionResolutions[0].caesarDiameterMm, 273);
assert.equal(b314.sectionResolutions[0].sizeBandInputReady, true);

const gre = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis([{ start: 0, profileId: 'gre' }], 2),
  propertySectionPlan: property([null, null]), outsideDiameterMm: 225,
  greVendorNominalBoreMm: 200,
});
assert.equal(gre.ready, true);
assert.equal(gre.sectionResolutions[0].outsideDiameterMm, 225);
assert.equal(gre.sectionResolutions[0].greVendorNominalBoreMm, 200);
assert.equal(gre.sectionResolutions[0].caesarDiameterMm, 225);

const changedInside = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis([{ start: 0, profileId: 'normal-metallic' }], 4),
  propertySectionPlan: property([100, 100, 120, 120], [0, 2]),
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true },
});
assert.equal(changedInside.ready, false);
assert.ok(changedInside.blockerCodes.includes('PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION'));
assert.ok(changedInside.blockerCodes.includes('PIPELINE_DIAMETER_PROPERTY_MISMATCH'));

const alignedAnalysis = analysis([
  { start: 0, profileId: 'normal-metallic' },
  { start: 2, profileId: 'asme-b31.4' },
], 4);
const alignedProperty = property([100, 100, 120, 120], [0, 2]);
const aligned = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: alignedAnalysis,
  propertySectionPlan: alignedProperty,
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true },
});
assert.equal(aligned.ready, true);
assert.deepEqual(aligned.sectionResolutions.map((item) => item.outsideDiameterMm), [100, 120]);
assert.deepEqual(aligned.elementResolutions.map((item) => item.analysisSectionId), ['AS1', 'AS1', 'AS2', 'AS2']);
assert.deepEqual(aligned.elementResolutions.map((item) => item.propertyDiameterMm), [100, 100, 120, 120]);
assert.deepEqual(aligned.elementResolutions.map((item) => item.diameterDisposition),
  ['SECTION_START', 'INHERITED', 'SECTION_START', 'INHERITED']);
assert.deepEqual(alignedProperty.sections.map((item) => item.sectionId), ['S1', 'S2']);

const profileOnly = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: alignedAnalysis,
  propertySectionPlan: property([100, 100, 100, 100]),
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true },
});
assert.equal(profileOnly.ready, true);
assert.deepEqual(profileOnly.sectionResolutions.map((item) => item.outsideDiameterMm), [100, 100]);

const propertyMismatch = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: normalAnalysis, propertySectionPlan: normalProperty, outsideDiameterMm: 120,
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true },
});
assert.equal(propertyMismatch.ready, false);
assert.ok(propertyMismatch.blockerCodes.includes('PIPELINE_DIAMETER_PROPERTY_MISMATCH'));

const identityBefore = JSON.stringify({ analysis: alignedAnalysis, property: alignedProperty });
const deterministicA = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: alignedAnalysis,
  propertySectionPlan: alignedProperty,
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true }, sourceReference: 'proof' });
const deterministicB = resolvePipelineAnalysisDiameterPlan({ sourceReference: 'proof',
  settings: { diameterBasisConfirmed: true, diameterSource: 'branch-diameter' },
  propertySectionPlan: alignedProperty, analysisSectionPlan: alignedAnalysis });
assert.equal(JSON.stringify(deterministicA), JSON.stringify(deterministicB));
assert.equal(buildPipelineAnalysisDiameterPlanJson(deterministicA), buildPipelineAnalysisDiameterPlanJson(deterministicB));
assert.equal(buildPipelineAnalysisDiameterLedgerText(deterministicA), buildPipelineAnalysisDiameterLedgerText(deterministicB));
assert.equal(JSON.stringify({ analysis: alignedAnalysis, property: alignedProperty }), identityBefore);
assert.deepEqual(deterministicA.sectionResolutions.map((item) => item.analysisSectionId), ['AS1', 'AS2']);
assert.deepEqual(deterministicA.elementResolutions.map((item) => item.elementId), ['E1', 'E2', 'E3', 'E4']);
assert.ok(deepFrozen(deterministicA));
assert.doesNotThrow(() => JSON.parse(JSON.stringify(deterministicA)));

console.log('Pipeline analysis-section diameter resolution tests passed.');
