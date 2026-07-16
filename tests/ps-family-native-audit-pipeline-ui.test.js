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
  'Audit family filter',
  'Use Bundle in Audit Input',
  'Download Relationship Bundle',
  'Download Audit JSON',
  'Download Pipeline Package',
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
assert.match(results, /XML required<\/dt><dd>No/);
assert.match(results, /XML consumed<\/dt><dd>No/);

const exports = createPsFamilyNativePipelineExports(pipeline);
assert.match(exports.pipelineJson, /PsFamilyNativeAuditPipeline\.v1/);
assert.match(exports.relationshipBundleJson, /SupportSteelRelationshipBundle\.v1/);
assert.match(exports.auditJson, /ps-family-evidence-audit\/v1/);
assert.match(exports.summaryCsv, /XmlRequired,XmlConsumed/);
assert.match(exports.supportSummaryCsv, /PS-14259/);
assert.match(exports.supportExceptionsCsv, /FAMILY_WITHOUT_RESOLVED_STRUCTURE/);
assert.match(exports.inputEvidenceCsv, /EvidenceId/);

const addon = readFileSync('tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-addon.js', 'utf8');
const bootstrap = readFileSync('tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js', 'utf8');
assert.match(addon, /button\.textContent = 'Native Pipeline'/);
assert.match(addon, /buildPsFamilyNativeAuditPipeline/);
assert.match(addon, /populateBundleField/);
assert.match(addon, /RELATIONSHIP_BUNDLE/);
assert.match(addon, /saveZipTextFiles/);
assert.match(addon, /relationship-bundle\.json/);
assert.doesNotMatch(addon, /parseSupportChangeXml/);
assert.match(bootstrap, /ps-family-native-audit-pipeline-addon\.js/);
assert.match(bootstrap, /native-pipeline-v1/);

console.log('ps-family-native-audit-pipeline-ui tests passed');
