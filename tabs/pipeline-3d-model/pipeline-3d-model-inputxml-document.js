import * as core from './pipeline-3d-model-inputxml-document-core.js';
import { adoptPipelineApprovedCatalogRegistryIntoInputXmlDocumentPlan } from './pipeline-3d-model-approved-catalog-document.js';

export const PIPELINE_INPUTXML_DOCUMENT_SCHEMA = core.PIPELINE_INPUTXML_DOCUMENT_SCHEMA;
export const PIPELINE_INPUTXML_ELEMENT_SCHEMA = core.PIPELINE_INPUTXML_ELEMENT_SCHEMA;
export const PIPELINE_CANONICAL_NAMESPACE = core.PIPELINE_CANONICAL_NAMESPACE;
export const PIPELINE_EXTENSION_NAMESPACE = core.PIPELINE_EXTENSION_NAMESPACE;
export const DEFAULT_PIPELINE_INPUTXML_METADATA = core.DEFAULT_PIPELINE_INPUTXML_METADATA;

export function buildPipelineInputXmlDocumentPlan(input = {}) {
  const explicitRegistry = input != null && typeof input === 'object'
    && Object.hasOwn(input, 'approvedCatalogRegistry');
  if (!explicitRegistry) return core.buildPipelineInputXmlDocumentPlan(input);

  const { approvedCatalogRegistry, ...baseInput } = input;
  const documentPlan = core.buildPipelineInputXmlDocumentPlan(baseInput);
  return adoptPipelineApprovedCatalogRegistryIntoInputXmlDocumentPlan({
    documentPlan,
    approvedCatalogRegistry,
  });
}

export function buildPipelineInputXmlDocumentPlanJson(plan) {
  return core.buildPipelineInputXmlDocumentPlanJson(plan);
}
