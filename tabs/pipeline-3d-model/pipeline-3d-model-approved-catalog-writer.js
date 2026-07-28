import { buildPipelineInputXmlDocumentPlan, PIPELINE_INPUTXML_DOCUMENT_SCHEMA } from './pipeline-3d-model-inputxml-document.js';
import { buildInputXmlPipingModelXml } from './pipeline-3d-model-xml-builder.js';
import {
  PIPELINE_APPROVED_CATALOG_DOCUMENT_ADOPTION_SCHEMA,
  adoptPipelineApprovedCatalogRegistryIntoInputXmlDocumentPlan,
} from './pipeline-3d-model-approved-catalog-document.js';
import { PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA } from './pipeline-3d-model-approved-catalog-registry.js';
import {
  PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS,
  PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA,
  PIPELINE_APPROVED_CATALOG_REGISTRY_SECTION_BINDING_SCHEMA,
} from './pipeline-3d-model-approved-catalog-registry-binding.js';

export const PIPELINE_APPROVED_CATALOG_WRITER_QUALIFICATION_SCHEMA =
  'PipelineApprovedCatalogWriterQualification.v1';

const text = (value) => String(value ?? '').trim();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const ANCESTRY_FIELDS = Object.freeze([
  'approvedCatalogAdoption',
  'approvedCatalogRegistryPlan',
  'approvedCatalogRegistryPlanSchema',
  'approvedCatalogRegistryBindingPlan',
  'approvedCatalogRegistryBindingPlanSchema',
]);

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

function uniqueDiagnostics(items) {
  const keys = new Set();
  return items.filter((item) => {
    const key = `${text(item?.code)}:${JSON.stringify(item?.details || {})}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function authorityPlanActive(plan) {
  return plain(plan) && (plan.active === true
    || (Array.isArray(plan.authorities) && plan.authorities.length > 0));
}

function baseDocument({ documentPlan, documentInput }) {
  if (documentPlan?.schema === PIPELINE_INPUTXML_DOCUMENT_SCHEMA) return documentPlan;
  return buildPipelineInputXmlDocumentPlan(documentInput || {});
}

function attachedAncestryPresent(plan) {
  return plain(plan) && ANCESTRY_FIELDS.some((field) => Object.hasOwn(plan, field));
}

function evidenceReady(plan, expectedSchema) {
  return plain(plan) && plan.schema === expectedSchema && plan.active === true
    && plan.ready === true && Array.isArray(plan.diagnostics) && plan.diagnostics.length === 0
    && Array.isArray(plan.blockerCodes) && plan.blockerCodes.length === 0;
}

function authorityPlanForKind(plan, kind) {
  return kind === 'PIPING_CODE'
    ? plan?.pipingCodeAuthorityPlan : plan?.allowableValueAuthorityPlan;
}

function registryEntriesForKind(registryPlan, kind) {
  return kind === 'PIPING_CODE'
    ? registryPlan?.pipingCodeEntries : registryPlan?.materialAllowableEntries;
}

function bindingStructureValid(binding, registryReference) {
  return plain(binding)
    && binding.schema === PIPELINE_APPROVED_CATALOG_REGISTRY_SECTION_BINDING_SCHEMA
    && PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS.includes(binding.kind)
    && Number.isInteger(binding.authorityIndex) && binding.authorityIndex >= 0
    && text(binding.analysisSectionId)
    && text(binding.catalogEntryId)
    && binding.registryReference === registryReference
    && plain(binding.inlineCatalogEntry)
    && plain(binding.registryEntry)
    && binding.inlineCatalogEntry.catalogEntryId === binding.catalogEntryId
    && binding.registryEntry.catalogEntryId === binding.catalogEntryId
    && same(binding.inlineCatalogEntry, binding.registryEntry);
}

function bindingCoverageDiagnostics(plan, registryPlan, bindingPlan) {
  const diagnostics = [];
  const bindings = bindingPlan.bindings;
  const expected = [];
  PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS.forEach((kind) => {
    const authorityPlan = authorityPlanForKind(plan, kind);
    if (!authorityPlanActive(authorityPlan)) return;
    (authorityPlan.authorities || []).forEach((authority, authorityIndex) => expected.push({
      kind,
      authorityIndex,
      analysisSectionId: text(authority?.analysisSectionId),
      catalogEntryId: text(authority?.catalogEntryId ?? authority?.catalogEntry?.catalogEntryId),
      catalogEntry: authority?.catalogEntry,
    }));
  });
  const represented = new Set();
  const sectionKeys = new Set();
  bindings.forEach((binding, bindingIndex) => {
    const sectionKey = `${binding?.kind}:${text(binding?.analysisSectionId)}`;
    if (sectionKeys.has(sectionKey)) diagnostics.push(diagnostic(
      'PIPELINE_APPROVED_CATALOG_WRITER_BINDING_DUPLICATE',
      'Registry-qualified writer evidence may bind each section once per namespace.',
      { bindingIndex, kind: binding?.kind, analysisSectionId: binding?.analysisSectionId },
    ));
    sectionKeys.add(sectionKey);
    const expectedBinding = expected.find((item) => item.kind === binding?.kind
      && item.authorityIndex === binding?.authorityIndex);
    const registryEntry = (registryEntriesForKind(registryPlan, binding?.kind) || [])
      .find((item) => item?.catalogEntryId === binding?.catalogEntryId);
    const valid = bindingStructureValid(binding, registryPlan.registryReference)
      && expectedBinding
      && binding.analysisSectionId === expectedBinding.analysisSectionId
      && binding.catalogEntryId === expectedBinding.catalogEntryId
      && same(binding.inlineCatalogEntry, expectedBinding.catalogEntry)
      && plain(registryEntry)
      && same(binding.registryEntry, registryEntry);
    if (!valid) diagnostics.push(diagnostic(
      'PIPELINE_APPROVED_CATALOG_WRITER_BINDING_INVALID',
      'Each retained binding must match its authority index, section, namespace, and registry entry.',
      { bindingIndex, kind: binding?.kind, authorityIndex: binding?.authorityIndex,
        analysisSectionId: binding?.analysisSectionId, catalogEntryId: binding?.catalogEntryId },
    ));
    if (expectedBinding) represented.add(`${expectedBinding.kind}:${expectedBinding.authorityIndex}`);
  });
  const missing = expected.filter((item) => !represented.has(`${item.kind}:${item.authorityIndex}`));
  if (bindings.length !== expected.length || missing.length > 0) diagnostics.push(diagnostic(
    'PIPELINE_APPROVED_CATALOG_WRITER_BINDING_COVERAGE_INVALID',
    'Registry bindings must cover every catalog-bearing section authority exactly once.',
    { expectedBindingCount: expected.length, actualBindingCount: bindings.length,
      missing: missing.map((item) => ({ kind: item.kind, authorityIndex: item.authorityIndex,
        analysisSectionId: item.analysisSectionId, catalogEntryId: item.catalogEntryId })) },
  ));
  const ordered = [...bindings].sort((left, right) => {
    const kindOrder = PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS.indexOf(left.kind)
      - PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS.indexOf(right.kind);
    return kindOrder || text(left.analysisSectionId).localeCompare(text(right.analysisSectionId))
      || text(left.catalogEntryId).localeCompare(text(right.catalogEntryId));
  });
  if (!same(bindings, ordered)) diagnostics.push(diagnostic(
    'PIPELINE_APPROVED_CATALOG_WRITER_BINDING_ORDER_INVALID',
    'Registry bindings must retain deterministic namespace and section ordering.'));
  return diagnostics;
}

function ancestryDiagnostics(plan, active) {
  if (!active) return [];
  const adoption = plan?.approvedCatalogAdoption;
  const registryPlan = plan?.approvedCatalogRegistryPlan;
  const bindingPlan = plan?.approvedCatalogRegistryBindingPlan;
  const diagnostics = [];
  if (!plain(adoption)
    || adoption.schema !== PIPELINE_APPROVED_CATALOG_DOCUMENT_ADOPTION_SCHEMA
    || adoption.active !== true || adoption.ready !== true
    || adoption.registryReady !== true || adoption.bindingReady !== true) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_ADOPTION_INVALID',
      'Registry-qualified InputXML emission requires ready document adoption evidence.'));
  }
  if (plan?.approvedCatalogRegistryPlanSchema !== PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA
    || plan?.approvedCatalogRegistryBindingPlanSchema
      !== PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_SCHEMA_REFERENCE_INVALID',
      'Registry-qualified document evidence must retain exact registry and binding schema references.'));
  }
  if (!evidenceReady(registryPlan, PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA)
    || !text(registryPlan?.registryReference)) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_REGISTRY_INVALID',
      'Registry-qualified InputXML emission requires a ready approved catalog registry.'));
  }
  if (!evidenceReady(bindingPlan, PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA)
    || !Array.isArray(bindingPlan?.bindings)) {
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
  diagnostics.push(...bindingCoverageDiagnostics(plan, registryPlan, bindingPlan));
  return diagnostics;
}

function attachedAncestryDiagnostics(base, adopted) {
  if (!attachedAncestryPresent(base)) return [];
  const diagnostics = ancestryDiagnostics(base, true);
  if (ANCESTRY_FIELDS.some((field) => !same(base?.[field] ?? null, adopted?.[field] ?? null))) {
    diagnostics.push(diagnostic('PIPELINE_APPROVED_CATALOG_WRITER_ATTACHED_ANCESTRY_MISMATCH',
      'Attached registry ancestry must exactly match evidence regenerated from the approved registry.'));
  }
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
  const active = approvedCatalogRegistry != null || authorityActive || attachedAncestryPresent(base);
  const adopted = active
    ? adoptPipelineApprovedCatalogRegistryIntoInputXmlDocumentPlan({
      documentPlan: base, approvedCatalogRegistry,
    })
    : base;
  const diagnostics = freeze(clone(uniqueDiagnostics([
    ...(adopted?.diagnostics || []),
    ...ancestryDiagnostics(adopted, active),
    ...attachedAncestryDiagnostics(base, adopted),
  ])));
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

export const _internal = Object.freeze({
  attachedAncestryPresent,
  bindingStructureValid,
  bindingCoverageDiagnostics,
  ancestryDiagnostics,
});
