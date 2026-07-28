import assert from 'node:assert/strict';
import {
  buildPipelineInputXmlDocumentPlan,
  PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-inputxml-document.js';
import {
  buildInputXmlPipingModelXml,
  _internal,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js';

const source = {
  registryId: 'APPROVED-CATALOG',
  title: 'Approved Pipeline Catalog',
  revision: 'R1',
  approvalReference: 'APPROVAL-001',
  sha256: 'a'.repeat(64),
  caesarVersion: '14.00',
};
const pipingEntry = Object.freeze({
  schema: 'PipelinePipingCodeCatalogEntry.v1',
  catalogEntryId: 'CODE-1',
  codeFamily: 'ASME B31.4',
});
const materialEntry = Object.freeze({
  schema: 'PipelineMaterialAllowableCatalogEntry.v1',
  catalogEntryId: 'MAT-1',
  materialName: 'TEST MATERIAL',
});
const registry = {
  source,
  pipingCodeEntries: [pipingEntry],
  materialAllowableEntries: [materialEntry],
};

function baseDocument(extra = {}) {
  return Object.freeze({
    schema: PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
    namespace: 'COADE',
    extensionNamespace: 'urn:test',
    xmlType: 'Input',
    version: '14.00',
    metadata: Object.freeze({ jobName: 'TEST' }),
    counts: Object.freeze({ numElt: 0 }),
    elements: Object.freeze([]),
    diagnostics: Object.freeze([]),
    blockerCodes: Object.freeze([]),
    ready: true,
    ...extra,
  });
}

const plain = baseDocument();
const legacy = buildPipelineInputXmlDocumentPlan({ documentPlan: plain });
assert.strictEqual(legacy, plain);
assert.equal(Object.hasOwn(legacy, 'approvedCatalogAdoption'), false);

const registryOnly = buildPipelineInputXmlDocumentPlan({
  documentPlan: plain,
  approvedCatalogRegistry: { source, pipingCodeEntries: [], materialAllowableEntries: [] },
});
assert.equal(registryOnly.ready, true);
assert.equal(registryOnly.approvedCatalogAdoption.ready, true);
assert.equal(registryOnly.approvedCatalogRegistryBindingPlan.bindingCount, 0);
assert.equal(_internal.approvedCatalogStructureValid(registryOnly), true);
assert.equal(buildInputXmlPipingModelXml(registryOnly), buildInputXmlPipingModelXml(plain));
assert.equal(Object.isFrozen(registryOnly.approvedCatalogRegistryPlan), true);
assert.equal(Object.isFrozen(registryOnly.approvedCatalogRegistryBindingPlan), true);

const authorityDocument = baseDocument({
  pipingCodeAuthorityPlan: Object.freeze({
    schema: 'PipelinePipingCodeAuthorityPlan.v1',
    active: true,
    ready: true,
    blockerCodes: Object.freeze([]),
    diagnostics: Object.freeze([]),
    authorities: Object.freeze([Object.freeze({
      authorityIndex: 0,
      analysisSectionId: 'AS1',
      catalogEntryId: pipingEntry.catalogEntryId,
      catalogEntry: pipingEntry,
    })]),
  }),
  allowableValueAuthorityPlan: Object.freeze({
    schema: 'PipelineAllowableValueAuthorityPlan.v1',
    active: true,
    ready: true,
    blockerCodes: Object.freeze([]),
    diagnostics: Object.freeze([]),
    authorities: Object.freeze([Object.freeze({
      authorityIndex: 0,
      analysisSectionId: 'AS1',
      catalogEntryId: materialEntry.catalogEntryId,
      catalogEntry: materialEntry,
    })]),
  }),
});
const adopted = buildPipelineInputXmlDocumentPlan({
  documentPlan: authorityDocument,
  approvedCatalogRegistry: registry,
});
assert.equal(adopted.ready, true);
assert.equal(adopted.approvedCatalogRegistryBindingPlan.bindingCount, 2);
assert.equal(adopted.approvedCatalogRegistryBindingPlan.pipingCodeBindingCount, 1);
assert.equal(adopted.approvedCatalogRegistryBindingPlan.materialAllowableBindingCount, 1);
assert.equal(_internal.approvedCatalogStructureValid(adopted), true);
assert.equal(buildInputXmlPipingModelXml(adopted), buildInputXmlPipingModelXml(authorityDocument));

const missingRegistry = buildPipelineInputXmlDocumentPlan({
  documentPlan: authorityDocument,
  approvedCatalogRegistry: null,
});
assert.equal(missingRegistry.ready, false);
assert.ok(missingRegistry.blockerCodes
  .includes('PIPELINE_APPROVED_CATALOG_REGISTRY_BINDING_REGISTRY_REQUIRED'));

function writerBlocked(mutator) {
  const forged = structuredClone(adopted);
  mutator(forged);
  assert.equal(_internal.approvedCatalogStructureValid(forged), false);
  assert.throws(() => buildInputXmlPipingModelXml(forged),
    (error) => error.code === 'PIPELINE_INPUTXML_WRITER_BLOCKED');
}
writerBlocked((plan) => { delete plan.approvedCatalogRegistryPlan; });
writerBlocked((plan) => {
  plan.approvedCatalogRegistryBindingPlan.bindings[0].registryReference = 'FORGED';
});
writerBlocked((plan) => {
  plan.approvedCatalogRegistryBindingPlan.bindings[0].kind = 'MATERIAL_ALLOWABLE';
});
writerBlocked((plan) => {
  plan.approvedCatalogRegistryBindingPlan.bindings.push(
    structuredClone(plan.approvedCatalogRegistryBindingPlan.bindings[0]));
  plan.approvedCatalogRegistryBindingPlan.bindingCount += 1;
  plan.approvedCatalogAdoption.bindingCount += 1;
});
writerBlocked((plan) => {
  plan.approvedCatalogRegistryPlan.pipingCodeEntries[0].codeFamily = 'FORGED';
});
writerBlocked((plan) => {
  plan.approvedCatalogRegistryBindingPlan.bindings[1].analysisSectionId = 'AS2';
});

assert.equal(_internal.approvedCatalogWriterDiagnostic(plain), null);
assert.equal(_internal.approvedCatalogWriterDiagnostic(adopted), null);
assert.equal(Object.isFrozen(_internal), true);
console.log('pipeline-3d-model approved catalog writer integration: PASS');
