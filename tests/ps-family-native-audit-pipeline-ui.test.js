import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPsFamilyNativeAuditPipeline } from '../tabs/ps-family-clash-audit/ps-family-native-audit-pipeline.js';
import { createPsFamilyNativePipelineExports } from '../tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-export.js';
import {
  renderPsFamilyNativePipelinePanel,
  renderPsFamilyNativePipelineReadiness,
  renderPsFamilyNativePipelineResults,
} from '../tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-view.js';
import {
  SUPPORT_STEEL_SAMPLE_STEEL,
  SUPPORT_STEEL_SAMPLE_SUPPORT,
} from '../tabs/support-steel-relationship-builder/support-steel-relationship-samples.js';

const panel = renderPsFamilyNativePipelinePanel();
for (const label of [
  'Native Staged JSON Pipeline',
  'Build &amp; Audit',
  'Load PS-14259 Demo',
  'Check Native Readiness',
  'Staged support JSON',
  'Staged steel JSON',
  'Steel projection tolerance mm',
  'Member contact tolerance mm',
  'Member candidate tolerance mm',
  'Carrier attachment tolerance mm',
  'Carrier nearby tolerance mm',
  'Carrier topology exact tolerance mm',
  'Carrier topology small-gap tolerance mm',
  'Audit family filter',
  'Use Bundle in Audit Input',
  'Download Relationship Bundle',
  'Download Audit JSON',
  'Download Pipeline Package',
  'authoritative pipe/carrier objects',
  'fail-closed carrier topology continuity',
]) assert.ok(panel.includes(label), `missing native pipeline label ${label}`);
for (const key of [
  'native-support', 'native-steel', 'native-load-sample', 'native-check-readiness',
  'native-build-audit', 'native-use-bundle', 'native-download-bundle',
  'native-download-audit', 'native-download-package', 'native-results',
]) assert.ok(panel.includes(`data-psfa="${key}"`), `missing native pipeline control ${key}`);

const readinessHtml = renderPsFamilyNativePipelineReadiness({
  blocking: false,
  summary: { supportRecordCount: 2, steelRecordCount: 2 },
  diagnostics: [],
});
assert.match(readinessHtml, /Native inputs ready/);
assert.match(readinessHtml, /XML required: No/);

const pipeline = buildPsFamilyNativeAuditPipeline({
  supportInput: SUPPORT_STEEL_SAMPLE_SUPPORT,
  steelInput: SUPPORT_STEEL_SAMPLE_STEEL,
});
const results = renderPsFamilyNativePipelineResults(pipeline);
assert.match(results, /READY_WITH_ENGINEERING_EXCEPTIONS/);
assert.match(results, /\/PS-14259/);
assert.match(results, /Carrier-object resolution/);
assert.match(results, /Carrier topology continuity/);
assert.match(results, /Carrier catalog<\/dt><dd>SupportCarrierCatalog\.v1/);
assert.match(results, /Carrier resolution<\/dt><dd>SupportCarrierResolution\.v1/);
assert.match(results, /Carrier attachment<\/dt><dd>SupportCarrierAttachmentBundle\.v1/);
assert.match(results, /Carrier topology catalog<\/dt><dd>SupportCarrierTopologyCatalog\.v1/);
assert.match(results, /Carrier topology<\/dt><dd>SupportCarrierTopologyBundle\.v1/);
assert.match(results, /Topology policy<\/dt><dd>Explicit reference/);
assert.match(results, /XML required<\/dt><dd>No/);
assert.match(results, /XML consumed<\/dt><dd>No/);

const exports = createPsFamilyNativePipelineExports(pipeline);
assert.match(exports.pipelineJson, /PsFamilyNativeAuditPipeline\.v1/);
assert.match(exports.relationshipBundleJson, /SupportSteelRelationshipBundle\.v1/);
assert.match(exports.auditJson, /ps-family-evidence-audit\/v1/);
assert.match(exports.summaryCsv, /CarrierObjectCount,ResolvedPhysicalCarrierCount/);
assert.match(exports.summaryCsv, /CarrierTopologyComponentCount/);
assert.match(exports.summaryCsv, /CarrierTopologyConnectionCount/);
assert.match(exports.summaryCsv, /XmlRequired,XmlConsumed/);
assert.match(exports.carrierCatalogCsv, /CarrierObjectId,CarrierObjectClass/);
assert.match(exports.carrierResolutionCsv, /ResolutionStatus,CarrierObjectId/);
assert.match(exports.carrierAttachmentCsv, /AttachmentStatus/);
assert.match(exports.carrierTopologyComponentsCsv, /ComponentId,CanonicalType/);
assert.match(exports.carrierTopologyPortsCsv, /PortId,ComponentId,Role/);
assert.match(exports.carrierTopologyConnectionsCsv, /EdgeId,EdgeType/);
assert.match(exports.carrierTopologyPathsCsv, /PathId,PathStatus/);
assert.match(exports.carrierTopologyExceptionsCsv, /ExceptionId,ExceptionCode/);

const addon = readFileSync('tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-addon.js', 'utf8');
const bootstrap = readFileSync('tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js', 'utf8');
assert.match(addon, /button\.textContent = 'Native Pipeline'/);
assert.match(addon, /buildPsFamilyNativeAuditPipeline/);
assert.match(addon, /RELATIONSHIP_BUNDLE/);
assert.match(addon, /carrier-topology-components\.csv/);
assert.match(addon, /carrier-topology-connections\.csv/);
assert.match(addon, /carrier-topology-paths\.csv/);
assert.match(addon, /carrier-topology-exceptions\.csv/);
assert.doesNotMatch(addon, /parseSupportChangeXml/);
assert.match(bootstrap, /ps-family-native-audit-pipeline-addon\.js/);
assert.match(bootstrap, /carrier-topology-v1/);

console.log('ps-family-native-audit-pipeline-ui tests passed');
