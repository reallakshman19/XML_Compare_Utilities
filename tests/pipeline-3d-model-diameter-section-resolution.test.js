import assert from 'node:assert/strict';
import {
  resolvePipelineAnalysisDiameterPlan,
  buildPipelineAnalysisDiameterPlanJson,
  buildPipelineAnalysisDiameterLedgerText,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-diameter-resolution.js';

function analysis(sections, count) {
  const normalized = sections.map((s, i) => ({ analysisSectionId: `AS${i + 1}`,
    startElementIndex: s.start, profileId: s.profileId }));
  return { schema: 'PipelineAnalysisSectionPlan.v1', ready: true, sections: normalized,
    elementResolutions: Array.from({ length: count }, (_, elementIndex) => {
      const owner = normalized.filter((s) => s.startElementIndex <= elementIndex).at(-1);
      return { elementIndex, elementId: `E${elementIndex + 1}`, analysisSectionId: owner.analysisSectionId,
        profileId: owner.profileId, resolvedMode: owner.profileId === 'asme-b31.4' ? 'ASME_B31_4' : 'NORMAL',
        sectionDisposition: owner.startElementIndex === elementIndex ? 'SECTION_START' : 'INHERITED' };
    }) };
}
function property(values, starts = [0]) {
  const sections = starts.map((start, i) => ({ sectionId: `S${i + 1}`, startElementIndex: start }));
  return { schema: 'PipelinePropertySectionPlan.v1', ready: true, sections,
    elements: values.map((diameter, elementIndex) => {
      const owner = sections.filter((s) => s.startElementIndex <= elementIndex).at(-1);
      return { elementIndex, elementId: `E${elementIndex + 1}`, sectionId: owner.sectionId,
        properties: { diameter }, effectiveSources: { diameter: owner.sectionId } };
    }) };
}
const frozen = (v) => !v || typeof v !== 'object'
  || (Object.isFrozen(v) && Object.values(v).every(frozen));

const one = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis([{ start: 0, profileId: 'normal-metallic' }], 4),
  propertySectionPlan: property([114.3, 114.3, 114.3, 114.3]), outsideDiameterMm: 114.3,
});
assert.equal(one.ready, true);
assert.equal(one.elementResolutions.length, 4);
assert.deepEqual(one.elementResolutions.map((e) => e.analysisSectionId), ['AS1', 'AS1', 'AS1', 'AS1']);
assert.deepEqual(one.elementResolutions.map((e) => e.diameterDisposition),
  ['SECTION_START', 'INHERITED', 'INHERITED', 'INHERITED']);

const inside = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis([{ start: 0, profileId: 'normal-metallic' }], 4),
  propertySectionPlan: property([100, 100, 120, 120], [0, 2]),
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true },
});
assert.equal(inside.ready, false);
assert.ok(inside.blockerCodes.includes('PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION'));

const alignedAnalysis = analysis([
  { start: 0, profileId: 'normal-metallic' }, { start: 2, profileId: 'asme-b31.4' },
], 4);
const alignedProperty = property([100, 100, 120, 120], [0, 2]);
const aligned = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: alignedAnalysis,
  propertySectionPlan: alignedProperty,
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true } });
assert.equal(aligned.ready, true);
assert.deepEqual(aligned.sectionResolutions.map((s) => s.outsideDiameterMm), [100, 120]);
assert.deepEqual(aligned.elementResolutions.map((e) => e.analysisSectionId), ['AS1', 'AS1', 'AS2', 'AS2']);
assert.deepEqual(aligned.elementResolutions.map((e) => e.diameterDisposition),
  ['SECTION_START', 'INHERITED', 'SECTION_START', 'INHERITED']);
assert.deepEqual(alignedProperty.sections.map((s) => s.sectionId), ['S1', 'S2']);

const profileOnly = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: alignedAnalysis,
  propertySectionPlan: property([100, 100, 100, 100]),
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true } });
assert.equal(profileOnly.ready, true);
assert.deepEqual(profileOnly.sectionResolutions.map((s) => s.outsideDiameterMm), [100, 100]);

const mismatch = resolvePipelineAnalysisDiameterPlan({
  analysisSectionPlan: analysis([{ start: 0, profileId: 'normal-metallic' }], 2),
  propertySectionPlan: property([100, 100]), outsideDiameterMm: 120,
  settings: { diameterSource: 'branch-diameter', diameterBasisConfirmed: true },
});
assert.equal(mismatch.ready, false);
assert.ok(mismatch.blockerCodes.includes('PIPELINE_DIAMETER_PROPERTY_MISMATCH'));

const inconsistent = analysis([{ start: 0, profileId: 'normal-metallic' }], 2);
inconsistent.elementResolutions[1] = { ...inconsistent.elementResolutions[1], profileId: 'gre', resolvedMode: 'GRE' };
const badOwner = resolvePipelineAnalysisDiameterPlan({ analysisSectionPlan: inconsistent,
  propertySectionPlan: property([114.3, 114.3]), outsideDiameterMm: 114.3 });
assert.equal(badOwner.ready, false);
assert.ok(badOwner.blockerCodes.includes('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID'));
assert.equal(badOwner.sectionResolutions[0].profileId, 'normal-metallic');
assert.equal(badOwner.elementResolutions[1].profileId, 'gre');

const before = JSON.stringify({ analysis: alignedAnalysis, property: alignedProperty });
const repeat = resolvePipelineAnalysisDiameterPlan({
  settings: { diameterBasisConfirmed: true, diameterSource: 'branch-diameter' },
  propertySectionPlan: alignedProperty, analysisSectionPlan: alignedAnalysis,
});
assert.equal(JSON.stringify(aligned), JSON.stringify(repeat));
assert.equal(buildPipelineAnalysisDiameterPlanJson(aligned), buildPipelineAnalysisDiameterPlanJson(repeat));
assert.equal(buildPipelineAnalysisDiameterLedgerText(aligned), buildPipelineAnalysisDiameterLedgerText(repeat));
assert.equal(JSON.stringify({ analysis: alignedAnalysis, property: alignedProperty }), before);
assert.ok(frozen(aligned));
assert.doesNotThrow(() => JSON.parse(JSON.stringify(aligned)));

console.log('Pipeline analysis-section diameter resolution tests passed.');
