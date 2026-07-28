import * as core from './pipeline-3d-model-xml-builder-core.js';
import {
  PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
  buildPipelineInputXmlDocumentPlan,
} from './pipeline-3d-model-inputxml-document.js';
import { PIPELINE_APPROVED_CATALOG_DOCUMENT_ADOPTION_SCHEMA } from './pipeline-3d-model-approved-catalog-document.js';
import {
  PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA,
  PIPELINE_APPROVED_CATALOG_REGISTRY_SOURCE_SCHEMA,
} from './pipeline-3d-model-approved-catalog-registry.js';
import {
  PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS,
  PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA,
  PIPELINE_APPROVED_CATALOG_REGISTRY_SECTION_BINDING_SCHEMA,
} from './pipeline-3d-model-approved-catalog-registry-binding.js';
import {
  PIPELINE_PIPING_CODE_AUTHORITY_PLAN_SCHEMA,
  PIPELINE_PIPING_CODE_CATALOG_ENTRY_SCHEMA,
} from './pipeline-3d-model-piping-code-authority.js';
import {
  PIPELINE_ALLOWABLE_VALUE_AUTHORITY_PLAN_SCHEMA,
  PIPELINE_MATERIAL_ALLOWABLE_CATALOG_ENTRY_SCHEMA,
} from './pipeline-3d-model-allowable-value-authority.js';

const text = (value) => String(value ?? '').trim();
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const EVIDENCE_FIELDS = Object.freeze([
  'approvedCatalogAdoption',
  'approvedCatalogRegistryPlan',
  'approvedCatalogRegistryPlanSchema',
  'approvedCatalogRegistryBindingPlan',
  'approvedCatalogRegistryBindingPlanSchema',
]);

function blocking(value) {
  return (Array.isArray(value?.blockerCodes) && value.blockerCodes.length > 0)
    || (Array.isArray(value?.diagnostics)
      && value.diagnostics.some((item) => text(item?.severity) === 'BLOCKING'));
}

function evidencePresent(plan) {
  return plain(plan) && EVIDENCE_FIELDS.some((field) => Object.hasOwn(plan, field));
}

function registryMap(entries) {
  if (!Array.isArray(entries)) return null;
  const map = new Map();
  for (const entry of entries) {
    const id = text(entry?.catalogEntryId);
    if (!id || map.has(id)) return null;
    map.set(id, entry);
  }
  return map;
}

function authorityDescriptor(plan, kind, authorityIndex) {
  const authorityPlan = kind === 'PIPING_CODE'
    ? plan.pipingCodeAuthorityPlan : plan.allowableValueAuthorityPlan;
  const expectedPlanSchema = kind === 'PIPING_CODE'
    ? PIPELINE_PIPING_CODE_AUTHORITY_PLAN_SCHEMA
    : PIPELINE_ALLOWABLE_VALUE_AUTHORITY_PLAN_SCHEMA;
  const expectedEntrySchema = kind === 'PIPING_CODE'
    ? PIPELINE_PIPING_CODE_CATALOG_ENTRY_SCHEMA
    : PIPELINE_MATERIAL_ALLOWABLE_CATALOG_ENTRY_SCHEMA;
  if (!plain(authorityPlan) || authorityPlan.schema !== expectedPlanSchema
    || authorityPlan.ready !== true || blocking(authorityPlan)
    || !Array.isArray(authorityPlan.authorities)) return null;
  const authority = authorityPlan.authorities[authorityIndex];
  return plain(authority) ? { authority, expectedEntrySchema } : null;
}

function expectedBindings(plan) {
  const descriptors = [];
  const append = (kind, authorityPlan, expectedSchema) => {
    if (authorityPlan == null) return true;
    if (!plain(authorityPlan) || authorityPlan.schema !== expectedSchema
      || authorityPlan.ready !== true || blocking(authorityPlan)
      || !Array.isArray(authorityPlan.authorities)) return false;
    authorityPlan.authorities.forEach((authority, authorityIndex) => {
      descriptors.push({ kind, authorityIndex, authority });
    });
    return true;
  };
  if (!append('PIPING_CODE', plan.pipingCodeAuthorityPlan,
    PIPELINE_PIPING_CODE_AUTHORITY_PLAN_SCHEMA)) return null;
  if (!append('MATERIAL_ALLOWABLE', plan.allowableValueAuthorityPlan,
    PIPELINE_ALLOWABLE_VALUE_AUTHORITY_PLAN_SCHEMA)) return null;
  return descriptors;
}

export function approvedCatalogStructureValid(plan) {
  if (!evidencePresent(plan)) return true;
  if (!plain(plan) || plan.schema !== PIPELINE_INPUTXML_DOCUMENT_SCHEMA) return false;

  const adoption = plan.approvedCatalogAdoption;
  const registry = plan.approvedCatalogRegistryPlan;
  const bindingPlan = plan.approvedCatalogRegistryBindingPlan;
  if (!plain(adoption) || adoption.schema !== PIPELINE_APPROVED_CATALOG_DOCUMENT_ADOPTION_SCHEMA
    || adoption.active !== true || adoption.ready !== true
    || adoption.registryReady !== true || adoption.bindingReady !== true
    || !plain(registry) || registry.schema !== PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA
    || plan.approvedCatalogRegistryPlanSchema !== PIPELINE_APPROVED_CATALOG_REGISTRY_SCHEMA
    || registry.active !== true || registry.ready !== true || blocking(registry)
    || !plain(registry.source)
    || registry.source.schema !== PIPELINE_APPROVED_CATALOG_REGISTRY_SOURCE_SCHEMA
    || !text(registry.registryReference)
    || !plain(bindingPlan)
    || bindingPlan.schema !== PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA
    || plan.approvedCatalogRegistryBindingPlanSchema
      !== PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_PLAN_SCHEMA
    || bindingPlan.active !== true || bindingPlan.ready !== true || blocking(bindingPlan)
    || !Array.isArray(bindingPlan.bindings)
    || bindingPlan.registryReference !== registry.registryReference
    || !same(bindingPlan.registrySource, registry.source)
    || adoption.registryReference !== registry.registryReference
    || adoption.bindingCount !== bindingPlan.bindingCount
    || bindingPlan.bindingCount !== bindingPlan.bindings.length) return false;

  const pipingEntries = registryMap(registry.pipingCodeEntries);
  const materialEntries = registryMap(registry.materialAllowableEntries);
  const expected = expectedBindings(plan);
  if (!pipingEntries || !materialEntries || !expected
    || expected.length !== bindingPlan.bindings.length) return false;

  const represented = new Set();
  let pipingCount = 0;
  let materialCount = 0;
  for (const binding of bindingPlan.bindings) {
    const kind = text(binding?.kind);
    if (!plain(binding)
      || binding.schema !== PIPELINE_APPROVED_CATALOG_REGISTRY_SECTION_BINDING_SCHEMA
      || !PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_KINDS.includes(kind)
      || !Number.isInteger(binding.authorityIndex) || binding.authorityIndex < 0
      || binding.registryReference !== registry.registryReference) return false;

    const descriptor = authorityDescriptor(plan, kind, binding.authorityIndex);
    const authority = descriptor?.authority;
    const catalogEntry = authority?.catalogEntry;
    const catalogEntryId = text(catalogEntry?.catalogEntryId);
    const analysisSectionId = text(authority?.analysisSectionId);
    const key = `${kind}:${binding.authorityIndex}:${analysisSectionId}`;
    if (!descriptor || !analysisSectionId || !catalogEntryId || represented.has(key)
      || catalogEntry.schema !== descriptor.expectedEntrySchema
      || binding.analysisSectionId !== analysisSectionId
      || binding.catalogEntryId !== catalogEntryId
      || authority.catalogEntryId !== catalogEntryId) return false;

    const registryEntry = kind === 'PIPING_CODE'
      ? pipingEntries.get(catalogEntryId) : materialEntries.get(catalogEntryId);
    if (!registryEntry || registryEntry.schema !== descriptor.expectedEntrySchema
      || !same(binding.inlineCatalogEntry, catalogEntry)
      || !same(binding.registryEntry, registryEntry)
      || !same(catalogEntry, registryEntry)) return false;

    represented.add(key);
    if (kind === 'PIPING_CODE') pipingCount += 1;
    else materialCount += 1;
  }

  const expectedKeys = new Set(expected.map(({ kind, authorityIndex, authority }) =>
    `${kind}:${authorityIndex}:${text(authority?.analysisSectionId)}`));
  return represented.size === expectedKeys.size
    && [...expectedKeys].every((key) => represented.has(key))
    && bindingPlan.pipingCodeBindingCount === pipingCount
    && bindingPlan.materialAllowableBindingCount === materialCount
    && bindingPlan.bindingCount === pipingCount + materialCount;
}

export function approvedCatalogWriterDiagnostic(plan) {
  if (!evidencePresent(plan) || approvedCatalogStructureValid(plan)) return null;
  return {
    code: 'PIPELINE_INPUTXML_WRITER_BLOCKED',
    message: 'Approved catalog ancestry does not match writer input.',
    details: {},
  };
}

function resolvedPlan(input, coordinateRows, bendResolution) {
  if (input?.schema === PIPELINE_INPUTXML_DOCUMENT_SCHEMA) return input;
  return buildPipelineInputXmlDocumentPlan({ exportContext: input, coordinateRows, bendResolution });
}

function assertApprovedCatalogReady(plan) {
  const diagnostic = approvedCatalogWriterDiagnostic(plan);
  if (!diagnostic) return;
  const error = new Error(diagnostic.message);
  error.code = diagnostic.code;
  error.details = diagnostic.details;
  error.blockerCodes = plan?.blockerCodes || [];
  throw error;
}

export const buildCoordinateRows = core.buildCoordinateRows;
export const coordinateRowsToTabText = core.coordinateRowsToTabText;

export function buildInputXmlPipingModelXml(input, coordinateRows = [], bendResolution = null) {
  const plan = resolvedPlan(input, coordinateRows, bendResolution);
  assertApprovedCatalogReady(plan);
  return core.buildInputXmlPipingModelXml(plan);
}

export const _internal = Object.freeze({
  ...(core._internal || {}),
  approvedCatalogStructureValid,
  approvedCatalogWriterDiagnostic,
});
