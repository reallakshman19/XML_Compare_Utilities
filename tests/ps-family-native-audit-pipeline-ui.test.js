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
  'Projection tolerance mm',
  'Member contact tolerance mm',
  'Member candidate tolerance mm',
  'Carrier attachment tolerance mm',
  'Carrier nearby tolerance mm',
  'Audit family filter',
  'Use Bundle in Audit Input',
  'Download Relationship Bundle',
  'Download Audit JSON',
  'Download Pipeline Package',
  'authoritative pipe/carrier objects',
  'analytical support-to-carrier attachment',
]) assert.ok(panel.includes(label), `missing native pipeline label ${label}`);
for (const key of [
  'native-support',
  'native-steel',
  'native-load-sample',
  'native-check-readiness',
  'native-build-audit',
  'native-use-bundle',
  'native-download-bundle',
  'native-download-audit',
  'native-download-package',
  'native-results',
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
assert.match(results, /\/PS-14260/);
assert.match(results, /FAMILY_WITHOUT_RESOLVED_STRUCTURE/);
assert.match(results, /Carrier-object resolution/);
assert.match(results, /Carrier catalog<\/dt><dd>SupportCarrierCatalog\.v1/);
assert.match(results, /Carrier resolution<\/dt><dd>SupportCarrierResolution\.v1/);
assert.match(results, /Carrier attachment<\/dt><dd>SupportCarrierAttachmentBundle\.v1/);
assert.match(results, /Carrier identity proof<\/dt><dd>Not physical contact/);
assert.match(results, /Carrier attachment proof<\/dt><dd>Analytical candidates only/);
assert.match(results, /XML required<\/dt><dd>No/);
assert.match(results, /XML consumed<\/dt><dd>No/);

const exports = createPsFamilyNativePipelineExports(pipeline);
assert.match(exports.pipelineJson, /PsFamilyNativeAuditPipeline\.v1/);
assert.match(exports.relationshipBundleJson, /SupportSteelRelationshipBundle\.v1/);
assert.match(exports.auditJson, /ps-family-evidence-audit\/v1/);
assert.match(exports.summaryCsv, /CarrierObjectCount,ResolvedPhysicalCarrierCount/);
assert.match(exports.summaryCsv, /AnalyticalCarrierGeometryCount/);
assert.match(exports.summaryCsv, /CarrierAttachmentCandidateCount/);
assert.match(exports.summaryCsv, /XmlRequired,XmlConsumed/);
assert.match(exports.supportSummaryCsv, /PS-14259/);
assert.match(exports.supportExceptionsCsv, /FAMILY_WITHOUT_RESOLVED_STRUCTURE/);
assert.match(exports.inputEvidenceCsv, /EvidenceId/);
assert.match(exports.carrierCatalogCsv, /CarrierObjectId,CarrierObjectClass/);
assert.match(exports.carrierResolutionCsv, /ResolutionStatus,CarrierObjectId/);
assert.match(exports.supportCarrierEdgesCsv, /EdgeId,EdgeType/);
assert.match(exports.carrierAttachmentCsv, /AttachmentStatus/);
assert.match(exports.carrierAttachmentEdgesCsv, /SUPPORT_MEMBER_TO_CARRIER_/);

const addon = readFileSync('tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-addon.js', 'utf8');
const bootstrap = readFileSync('tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js', 'utf8');
assert.match(addon, /button\.textContent = 'Native Pipeline'/);
assert.match(addon, /buildPsFamilyNativeAuditPipeline/);
assert.match(addon, /populateBundleField/);
assert.match(addon, /RELATIONSHIP_BUNDLE/);
assert.match(addon, /saveZipTextFiles/);
assert.match(addon, /relationship-bundle\.json/);
assert.match(addon, /carrier-catalog\.csv/);
assert.match(addon, /carrier-resolutions\.csv/);
assert.match(addon, /support-carrier-edges\.csv/);
assert.match(addon, /carrier-attachment-evaluations\.csv/);
assert.match(addon, /carrier-attachment-edges\.csv/);
assert.doesNotMatch(addon, /parseSupportChangeXml/);
assert.match(bootstrap, /ps-family-native-audit-pipeline-addon\.js/);
assert.match(bootstrap, /carrier-attachment-v1/);

console.log('ps-family-native-audit-pipeline-ui tests passed');
