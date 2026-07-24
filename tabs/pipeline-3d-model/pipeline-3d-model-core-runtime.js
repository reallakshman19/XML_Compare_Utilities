import { resolvePipelineElasticBends } from './pipeline-3d-model-elastic-bend.js?v=20260721-p3d-meta-phase1-2';
import { resolvePipelineAnalysisSectionPlan } from './pipeline-3d-model-analysis-section-planner.js';
import { resolvePipelineAnalysisPropertyReseedPlan } from './pipeline-3d-model-analysis-property-reseed.js';
import { resolvePipelineAnalysisDiameterPlan } from './pipeline-3d-model-diameter-resolution.js';
import { resolvePipelineNormalFittingPlan } from './pipeline-3d-model-normal-fitting-resolution.js';
import { resolvePipelineB314RadiusPlan } from './pipeline-3d-model-b314-radius-resolution.js';
import { resolvePipelineGreVendorSeriesPlan } from './pipeline-3d-model-gre-vendor-series-resolution.js';
import { resolvePipelinePropertySectionPlan } from './pipeline-3d-model-property-sections.js?v=20260722-p3d-property-sections-1';
import { buildPipelineInputXmlDocumentPlan } from './pipeline-3d-model-inputxml-document.js?v=20260722-p3d-base-039-1';
import { buildInputXmlPipingModelXml } from './pipeline-3d-model-xml-builder.js?v=20260722-p3d-base-039-1';
import { buildPipelineCoreOrchestration } from './pipeline-3d-model-core-orchestrator.js';

export const PIPELINE_CORE_RUNTIME_DEPENDENCIES = Object.freeze({
  resolveBends: resolvePipelineElasticBends,
  resolvePropertySectionPlan: resolvePipelinePropertySectionPlan,
  resolveAnalysisSectionPlan: resolvePipelineAnalysisSectionPlan,
  resolvePropertyReseedPlan: resolvePipelineAnalysisPropertyReseedPlan,
  resolveDiameterPlan: resolvePipelineAnalysisDiameterPlan,
  resolveNormalFittingPlan: resolvePipelineNormalFittingPlan,
  resolveB314RadiusPlan: resolvePipelineB314RadiusPlan,
  resolveGreVendorSeriesPlan: resolvePipelineGreVendorSeriesPlan,
  buildInputXmlDocumentPlan: buildPipelineInputXmlDocumentPlan,
  buildInputXmlXml: buildInputXmlPipingModelXml,
});

export function buildPipelineCoreOutputs(input = {}) {
  return buildPipelineCoreOrchestration(input, PIPELINE_CORE_RUNTIME_DEPENDENCIES);
}
