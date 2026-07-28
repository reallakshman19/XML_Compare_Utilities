import assert from 'node:assert/strict';
import {
  PIPELINE_APPROVED_CATALOG_WRITER_QUALIFICATION_SCHEMA,
  resolvePipelineApprovedCatalogWriterQualification,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-approved-catalog-writer.js';

const pipingEntry = Object.freeze({
  schema: 'PipelinePipingCodeCatalogEntry.v1',
  catalogEntryId: 'CODE-R1',
  codeFamily: 'PROJECT-CODE',
  codeEdition: 'R1',
  caesarVersion: '14.00',
  caesarPipingCode: 101,
  sourceAuthority: 'PROJECT-BASIS',
  sourceReference: 'PROJECT-BASIS@R1',
});
const materialEntry = Object.freeze({
  schema: 'PipelineMaterialAllowableCatalogEntry.v1',
  catalogEntryId: 'MAT-R1',
  codeFamily: 'PROJECT-CODE',
  codeEdition: 'R1',
  caesarVersion: '14.00',
  materialNumber: 1,
  materialName: 'TEST MATERIAL',
  values: Object.freeze({
    COLD_ALLOW: Object.freeze({ disposition: 'VALUE', value: 1000 }),
    SY: Object.freeze({ disposition: 'VALUE', value: 1100 }),
    SU: Object.freeze({ disposition: 'VALUE', value: 1200 }),
  }),
  sourceAuthority: 'MATERIAL-SHEET',
  sourceReference: 'MATERIAL-SHEET@R1',
  cases: Object.freeze([]),
});
const registry = Object.freeze({
  source: Object.freeze({
    registryId: 'P3D-CATALOG',
    title: 'Approved Pipeline Catalog',
    revision: 'R1',
    approvalReference: 'APPROVAL-P3D-R1',
    sha256: 'a'.repeat(64),
    caesarVersion: '14.00',
  }),
  pipingCodeEntries: Object.freeze([pipingEntry]),
  materialAllowableEntries: Object.freeze([materialEntry]),
});
const pipingCodeAuthorityPlan = Object.freeze({
  schema: 'PipelinePipingCodeAuthorityPlan.v1', active: true, ready: true,
  blockerCodes: Object.freeze([]),
  authorities: Object.freeze([Object.freeze({
    authorityIndex: 0, analysisSectionId: 'AS1',
    catalogEntryId: pipingEntry.catalogEntryId, catalogEntry: pipingEntry,
  })]),
});
const allowableValueAuthorityPlan = Object.freeze({
  schema: 'PipelineAllowableValueAuthorityPlan.v1', active: true, ready: true,
  blockerCodes: Object.freeze([]),
  authorities: Object.freeze([Object.freeze({
    authorityIndex: 0, analysisSectionId: 'AS1',
    catalogEntryId: materialEntry.catalogEntryId, catalogEntry: materialEntry,
  })]),
});
function documentPlan(overrides = {}) {
  return Object.freeze({
    schema: 'PipelineInputXmlDocumentPlan.v1',
    namespace: 'COADE', extensionNamespace: 'urn:test', xmlType: 'Input', version: '14.00',
    metadata: Object.freeze({ jobName: 'TEST' }),
    counts: Object.freeze({ numElt: 0, numAllow: 0 }),
    elements: Object.freeze([]),
    pipingCodeAuthorityPlan,
    allowableValueAuthorityPlan,
    diagnostics: Object.freeze([]), blockerCodes: Object.freeze([]), ready: true,
    ...overrides,
  });
}

const valid = resolvePipelineApprovedCatalogWriterQualification({
  documentPlan: documentPlan(), approvedCatalogRegistry: registry,
});
assert.equal(valid.schema, PIPELINE_APPROVED_CATALOG_WRITER_QUALIFICATION_SCHEMA);
assert.equal(valid.active, true);
assert.equal(valid.ready, true);
assert.equal(valid.bindingCount, 2);
assert.equal(valid.documentPlan.approvedCatalogAdoption.ready, true);
assert.equal(valid.documentPlan.approvedCatalogRegistryPlan.ready, true);
assert.equal(valid.documentPlan.approvedCatalogRegistryBindingPlan.ready, true);
assert.equal(Object.isFrozen(valid), true);
assert.equal(Object.isFrozen(valid.documentPlan), true);
assert.equal(Object.isFrozen(valid.documentPlan.approvedCatalogRegistryBindingPlan.bindings[0]), true);
assert.deepEqual(valid, resolvePipelineApprovedCatalogWriterQualification({
  documentPlan: structuredClone(documentPlan()),
  approvedCatalogRegistry: structuredClone(registry),
}));

const missing = resolvePipelineApprovedCatalogWriterQualification({ documentPlan: documentPlan() });
assert.equal(missing.ready, false);
assert.ok(missing.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_REGISTRY_REQUIRED'));
assert.ok(missing.blockerCodes.includes('PIPELINE_APPROVED_CATALOG_WRITER_ADOPTION_INVALID'));

const mismatchRegistry = structuredClone(registry);
mismatchRegistry.pipingCodeEntries[0].caesarPipingCode = 999;
const mismatch = resolvePipelineApprovedCatalogWriterQualification({
  documentPlan: documentPlan(), approvedCatalogRegistry: mismatchRegistry,
});
assert.equal(mismatch.ready, false);
assert.ok(mismatch.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_ENTRY_MISMATCH'));

const noAuthorities = documentPlan({
  pipingCodeAuthorityPlan: null,
  allowableValueAuthorityPlan: null,
});
const inactive = resolvePipelineApprovedCatalogWriterQualification({ documentPlan: noAuthorities });
assert.equal(inactive.active, false);
assert.equal(inactive.ready, true);
assert.equal(inactive.documentPlan, noAuthorities);
assert.equal(inactive.bindingCount, 0);

const registryOnly = resolvePipelineApprovedCatalogWriterQualification({
  documentPlan: noAuthorities, approvedCatalogRegistry: registry,
});
assert.equal(registryOnly.active, true);
assert.equal(registryOnly.ready, true);
assert.equal(registryOnly.bindingCount, 0);
assert.equal(registryOnly.documentPlan.approvedCatalogAdoption.ready, true);

const blockedBase = documentPlan({
  diagnostics: Object.freeze([{ severity: 'BLOCKING', code: 'BASE_BLOCKER', details: {} }]),
  blockerCodes: Object.freeze(['BASE_BLOCKER']),
  ready: false,
});
const blocked = resolvePipelineApprovedCatalogWriterQualification({
  documentPlan: blockedBase, approvedCatalogRegistry: registry,
});
assert.equal(blocked.ready, false);
assert.ok(blocked.blockerCodes.includes('BASE_BLOCKER'));

console.log('pipeline-3d-model approved catalog writer qualification: PASS');
