import { buildGeometryAuthorityRoute } from './pipeline-3d-model-bend-route.js?v=20260721-bend-policy-v3-1';
import { resolvePipelineSectionAwareBends } from './pipeline-3d-model-section-aware-bend-resolution.js';
import { resolvePipelineAnalysisPropertyReseedPlan } from './pipeline-3d-model-analysis-property-reseed.js';
import { resolvePipelineAnalysisDiameterPlan } from './pipeline-3d-model-diameter-resolution.js';
import { resolvePipelineNormalFittingPlan } from './pipeline-3d-model-normal-fitting-resolution.js';
import { resolvePipelineB314RadiusPlan } from './pipeline-3d-model-b314-radius-resolution.js';
import { resolvePipelineGreVendorSeriesPlan } from './pipeline-3d-model-gre-vendor-series-resolution.js';
import {
  buildPipelineGreBendGeometryPlanJson,
  buildPipelineGreBendGeometryPlanTsv,
} from './pipeline-3d-model-gre-bend-geometry-contracts.js';
import { resolvePipelineGreBendGeometryPlan } from './pipeline-3d-model-gre-bend-geometry-plan.js';
import { resolvePipelinePropertySectionPlan } from './pipeline-3d-model-property-sections.js?v=20260724-p3d-hard-051-1';
import { buildExplicitPipelineInputXmlDocumentPlan } from './pipeline-3d-model-explicit-inputxml.js';
import { buildInputXmlPipingModelXml } from './pipeline-3d-model-xml-builder.js?v=20260722-p3d-base-039-1';
import { buildPipelineCoreOrchestration } from './pipeline-3d-model-core-orchestrator.js';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
function artifact(fileId, name, sourceSchema, text, mime) {
  return freeze({ fileId, name, sourceSchema, mime, role: 'ENGINEERING_EVIDENCE', text });
}
function adoptGreBendGeometry(base, input) {
  const plan = resolvePipelineGreBendGeometryPlan({
    bendResolution: base.bendResolution,
    sectionProfileRoutingPlan: base.sectionProfileRoutingPlan,
    greVendorSeriesPlan: base.greVendorSeriesPlan,
    bendBreakApplications: input.greBendBreakApplications,
  });
  const artifacts = Object.freeze([...(base.artifacts || []),
    artifact('greBendGeometryPlan', 'pipeline-gre-bend-geometry-plan.json', plan.schema,
      buildPipelineGreBendGeometryPlanJson(plan), 'application/json'),
    artifact('greBendGeometryPlanTsv', 'pipeline-gre-bend-geometry-plan.tsv', plan.schema,
      buildPipelineGreBendGeometryPlanTsv(plan), 'text/tab-separated-values')]);
  const diagnostics = Object.freeze([...(base.diagnostics || []), ...plan.diagnostics]);
  const blockerCodes = Object.freeze([...new Set([...(base.blockerCodes || []), ...plan.blockerCodes])]);
  return freeze({ ...base, greBendGeometryPlan: plan, artifacts, diagnostics, blockerCodes,
    ready: base.ready === true && plan.ready === true });
}

export const PIPELINE_CORE_RUNTIME_DEPENDENCIES = Object.freeze({
  buildGeometryRoute: buildGeometryAuthorityRoute,
  resolveSectionAwareBends: resolvePipelineSectionAwareBends,
  resolvePropertySectionPlan: resolvePipelinePropertySectionPlan,
  resolvePropertyReseedPlan: resolvePipelineAnalysisPropertyReseedPlan,
  resolveDiameterPlan: resolvePipelineAnalysisDiameterPlan,
  resolveNormalFittingPlan: resolvePipelineNormalFittingPlan,
  resolveB314RadiusPlan: resolvePipelineB314RadiusPlan,
  resolveGreVendorSeriesPlan: resolvePipelineGreVendorSeriesPlan,
  buildInputXmlDocumentPlan: buildExplicitPipelineInputXmlDocumentPlan,
  buildInputXmlXml: buildInputXmlPipingModelXml,
});

export function buildPipelineCoreOutputs(input = {}) {
  return adoptGreBendGeometry(
    buildPipelineCoreOrchestration(input, PIPELINE_CORE_RUNTIME_DEPENDENCIES),
    input,
  );
}
