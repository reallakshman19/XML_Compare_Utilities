import { buildPipelineInputXmlDocumentPlan, PIPELINE_INPUTXML_DOCUMENT_SCHEMA } from './pipeline-3d-model-inputxml-document.js';
import { buildInputXmlPipingModelXml } from './pipeline-3d-model-xml-builder.js';
import {
  PIPELINE_APPROVED_CATALOG_DOCUMENT_ADOPTION_SCHEMA,
  adoptPipelineApprovedCatalogRegistryIntoInputXmlDocumentPlan,
} from './pipeline-3d-model-approved-catalog-document.js';
import { PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA } from './pipeline-3d-model-approved-catalog-registry.js';
import {
  PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA,
  PIPELINE_APPROVED_CATALOG_REGISTRY_SECTION_BINDING_SCHEMA,
} from './pipeline-3d-model-approved-catalog-registry-binding.js';

export const PIPELINE_APPROVED_CATALOG_WRITER_QUALIFICATION_SCHEMA =
  'PipelineApprovedCatalogWriterQualification.v1';

const text = (value) => String(value ?? '').trim();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function plain(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (plain(value)) return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function diagnostic(code, message, details = {}) {
  return freeze({ severity: 'BLOCKING', code, message, details: freeze({ ...details }) });
}

function authorityPlanActive(plan) {
  return plain(plan) && (plan.active === true
    || (Array.isArray(plan.authorities) && plan.authorities.length > 0));
}

function baseDocument({ documentPlan, documentInput }) {
  if (documentPlan?.schema === PIPELINE_INPUTXML_DOCUMENT_SCHEMA) return documentPlan;
  return buildPipelineInputXmlDocumentPlan(documentInput || {});
}

function bindingStructureValid(binding, registryReference) {
  return plain(binding)
    && binding.schema === PIPELINE_APPROVED_CATALOG_REGISTRY_SECTION_BINDING_SCHEMA
    && ['PIPING_CODE', 'MATERIAL_ALLOWABLE'].includes(binding.kind)
    && text(binding.analysisSectionId)
    && text(binding.catalogEntryId)
    && binding.registryReference === registryReference
    && plain(binding.inlineCatalogEntry)
    && plain(binding.registryEntry)
    && binding.inlineCatalogEntry.catalogEntryId === binding.catalogEntryId
    && binding.registryEntry.catalogEntryId === binding.catalogEntryId
    && same(binding.inlineCatalogEntry, binding.registryEntry);
}

function ancestryDiagnostics(plan, active) {
  if (!active) return [];
  const adoption = plan?.approvedCatalogAdoption;
  const registryPlan = plan?.approvedCatalogRegistryPlan;
  const bindingPlan = plan?.approvedCatalogRegistryBindingPlan;
  const diagnostics = [];
  if (!plain(adoption)
    || adoption.schema !== PIPELINE_APPROVED_CATALOG_DOCUMENT_ADOPTION_SCHEMA
    || adoption.active !== true || adoption.ready !== true) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_ADOPTION_INVALID',
      'Registry-qualified InputXML emission requires ready document adoption evidence.'));
  }
  if (!plain(registryPlan)
    || registryPlan.schema !== PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA
    || registryPlan.active !== true || registryPlan.ready !== true
    || !text(registryPlan.registryReference)) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_REGISTRY_INVALID',
      'Registry-qualified InputXML emission requires a ready approved catalog registry.'));
  }
  if (!plain(bindingPlan)
    || bindingPlan.schema !== PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA
    || bindingPlan.active !== true || bindingPlan.ready !== true
    || !Array.isArray(bindingPlan.bindings)) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_BINDING_PLAN_INVALID',
      'Registry-qualified InputXML emission requires a ready approved registry binding plan.'));
    return diagnostics;
  }
  const registryReference = registryPlan?.registryReference;
  if (adoption?.registryReference !== registryReference
    || bindingPlan.registryReference !== registryReference) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_REFERENCE_MISMATCH',
      'Document adoption, registry, and binding evidence must share one registry reference.'));
  }
  const bindings = bindingPlan.bindings;
  const pipingCount = bindings.filter((item) => item?.kind === 'PIPING_CODE').length;
  const materialCount = bindings.filter((item) => item?.kind === 'MATERIAL_ALLOWABLE').length;
  if (bindingPlan.bindingCount !== bindings.length
    || bindingPlan.pipingCodeBindingCount !== pipingCount
    || bindingPlan.materialAllowableBindingCount !== materialCount
    || adoption?.bindingCount !== bindings.length) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_BINDING_COUNT_INVALID',
      'Registry binding counts must exactly match retained section bindings.'));
  }
  bindings.forEach((binding, index) => {
    if (!bindingStructureValid(binding, registryReference)) diagnostics.push(diagnostic(
      'PIPELINE_APPROVED_CATALOG_WRITER_BINDING_INVALID',
      'Each retained section binding must exactly preserve inline and registry evidence.',
      { bindingIndex: index, kind: binding?.kind, analysisSectionId: binding?.analysisSectionId },
    ));
  });
  return diagnostics;
}

export function resolvePipelineApprovedCatalogWriterQualification({
  documentPlan = null,
  documentInput = null,
  approvedCatalogRegistry = null,
} = {}) {
  const base = baseDocument({ documentPlan, documentInput });
  const authorityActive = authorityPlanActive(base.pipingCodeAuthorityPlan)
    || authorityPlanActive(base.allowableValueAuthorityPlan);
  const active = approvedCatalogRegistry != null || authorityActive;
  const adopted = active
    ? adoptPipelineApprovedCatalogRegistryIntoInputXmlDocumentPlan({
      documentPlan: base, approvedCatalogRegistry,
    })
    : base;
  const diagnostics = freeze(clone([
    ...(adopted?.diagnostics || []),
    ...ancestryDiagnostics(adopted, active),
  ]));
  const blockerCodes = freeze([...new Set(diagnostics.map((item) => text(item?.code)).filter(Boolean))]);
  return freeze({
    schema: PIPELINE_APPROVED_CATALOG_WRITER_QUALIFICATION_SCHEMA,
    active,
    documentPlan: adopted,
    registryReference: adopted?.approvedCatalogAdoption?.registryReference ?? null,
    bindingCount: adopted?.approvedCatalogRegistryBindingPlan?.bindingCount ?? 0,
    diagnostics,
    blockerCodes,
    ready: adopted?.ready === true && diagnostics.length === 0,
  });
}

export function buildPipelineApprovedCatalogQualifiedInputXml(input = {}) {
  const qualification = resolvePipelineApprovedCatalogWriterQualification(input);
  if (!qualification.ready) {
    const first = qualification.diagnostics[0];
    const error = new Error(first?.message || 'Approved catalog writer qualification failed.');
    error.code = first?.code || 'PIPELINE_APPROVED_CATALOG_WRITER_BLOCKED';
    error.details = first?.details || {};
    error.blockerCodes = qualification.blockerCodes;
    throw error;
  }
  return buildInputXmlPipingModelXml(qualification.documentPlan);
}

export const buildPipelineApprovedCatalogWriterQualificationJson = (qualification) =>
  JSON.stringify(qualification, null, 2);
