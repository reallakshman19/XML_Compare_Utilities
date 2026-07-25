import { buildGeometryAuthorityRoute } from './pipeline-3d-model-bend-route.js?v=20260721-bend-policy-v3-1';
import { resolvePipelineSectionAwareBends } from './pipeline-3d-model-section-aware-bend-resolution.js';
import { resolvePipelineAnalysisPropertyReseedPlan } from './pipeline-3d-model-analysis-property-reseed.js';
import { resolvePipelineAnalysisDiameterPlan } from './pipeline-3d-model-diameter-resolution.js';
import { resolvePipelineNormalFittingPlan } from './pipeline-3d-model-normal-fitting-resolution.js';
import { resolvePipelineB314RadiusPlan } from './pipeline-3d-model-b314-radius-resolution.js';
import { resolvePipelineGreVendorSeriesPlan } from './pipeline-3d-model-gre-vendor-series-resolution.js';
import { resolvePipelinePropertySectionPlan } from './pipeline-3d-model-property-sections.js?v=20260724-p3d-hard-051-1';
import { buildExplicitPipelineInputXmlDocumentPlan } from './pipeline-3d-model-explicit-inputxml.js';
import { buildInputXmlPipingModelXml } from './pipeline-3d-model-xml-builder.js?v=20260722-p3d-base-039-1';
import { buildPipelineCoreOrchestration } from './pipeline-3d-model-core-orchestrator.js';

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
  return buildPipelineCoreOrchestration(input, PIPELINE_CORE_RUNTIME_DEPENDENCIES);
}
