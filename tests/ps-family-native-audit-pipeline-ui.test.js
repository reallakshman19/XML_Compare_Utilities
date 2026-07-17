import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildPsFamilyNativeAuditPipeline,
  createPsFamilyNativePipelineReadiness,
} from '../tabs/ps-family-clash-audit/ps-family-native-combined-input.js';
import { createPsFamilyNativePipelineExports } from '../tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-export.js';
import {
  renderPsFamilyNativePipelinePanel,
  renderPsFamilyNativePipelineReadiness,
  renderPsFamilyNativePipelineResults,
} from '../tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-view.js';
import { SUPPORT_STEEL_SAMPLE_COMBINED } from '../tabs/support-steel-relationship-builder/support-steel-relationship-samples.js';

const panel = renderPsFamilyNativePipelinePanel();
for (const label of [
  'Native Staged JSON Pipeline', 'Build &amp; Audit', 'Load PS-14259 Demo',
  'Check Native Readiness', 'Combined staged model JSON',
  'one staged model JSON containing piping, support and structural records',
  'Steel projection tolerance mm', 'Member contact tolerance mm',
  'Member candidate tolerance mm', 'Carrier attachment tolerance mm',
  'Carrier nearby tolerance mm', 'Carrier topology exact tolerance mm',
  'Carrier topology small-gap tolerance mm', 'Audit family filter',
  'Use Bundle in Audit Input', 'Download Relationship Bundle',
  'Download Audit JSON', 'Download Pipeline Package',
]) assert.ok(panel.includes(label), `missing native pipeline label ${label}`);
for (const key of [
  'native-model', 'native-load-sample', 'native-check-readiness',
  'native-build-audit', 'native-use-bundle', 'native-download-bundle',
  'native-download-audit', 'native-download-package', 'native-results',
]) assert.ok(panel.includes(`data-psfa="${key}"`), `missing native pipeline control ${key}`);
assert.doesNotMatch(panel, /data-psfa="native-support"/);
assert.doesNotMatch(panel, /data-psfa="native-steel"/);
assert.equal((panel.match(/<textarea /g) || []).length, 1);

const readiness = createPsFamilyNativePipelineReadiness({
  combinedInput: SUPPORT_STEEL_SAMPLE_COMBINED,
});
assert.equal(readiness.blocking, false);
assert.ok(readiness.summary.sourceRecordCount > 0);
assert.ok(readiness.summary.supportRecordCount > 0);
assert.ok(readiness.summary.steelRecordCount > 0);
const readinessHtml = renderPsFamilyNativePipelineReadiness(readiness);
assert.match(readinessHtml, /Combined model ready/);
assert.match(readinessHtml, /XML required: No/);

const pipeline = buildPsFamilyNativeAuditPipeline({
  combinedInput: SUPPORT_STEEL_SAMPLE_COMBINED,
});
assert.equal(pipeline.inputMode, 'COMBINED_STAGED_MODEL');
assert.deepEqual(Object.keys(pipeline.inputSchemas), ['combinedModel']);
assert.equal(pipeline.relationshipBundle.inputMode, 'COMBINED_STAGED_MODEL');
const results = renderPsFamilyNativePipelineResults(pipeline);
assert.match(results, /PS-14259/);
assert.match(results, /Carrier-object resolution/);
assert.match(results, /Carrier topology continuity/);
assert.match(results, /Complete carrier-to-structure paths/);
assert.match(results, /Carrier-to-structure path exceptions/);
assert.match(results, /Input mode<\/dt><dd>COMBINED_STAGED_MODEL/);
assert.match(results, /Carrier resolution<\/dt><dd>SupportCarrierResolution\.v1/);
assert.match(results, /Carrier attachment<\/dt><dd>SupportCarrierAttachmentBundle\.v1/);
assert.match(results, /Carrier topology<\/dt><dd>SupportCarrierTopologyBundle\.v1/);
assert.match(results, /Carrier-to-structure path<\/dt><dd>SupportCarrierToStructurePathBundle\.v1/);
assert.match(results, /Complete-path policy<\/dt><dd>Connected topology/);
assert.match(results, /Evidence boundary<\/dt><dd>Analytical path candidate/);
assert.match(results, /XML required<\/dt><dd>No/);
assert.match(results, /XML consumed<\/dt><dd>No/);

const exports = createPsFamilyNativePipelineExports(pipeline);
assert.match(exports.pipelineJson, /PsFamilyNativeAuditPipeline\.v1/);
assert.match(exports.relationshipBundleJson, /SupportSteelRelationshipBundle\.v1/);
assert.match(exports.auditJson, /ps-family-evidence-audit\/v1/);
assert.match(exports.summaryCsv, /CompleteCarrierToStructurePathCount/);
assert.match(exports.summaryCsv, /CarrierToStructurePathExceptionCount/);
assert.match(exports.summaryCsv, /XmlRequired,XmlConsumed/);
assert.match(exports.carrierToStructureCompletePathsCsv, /PathId,PathStatus/);
assert.match(exports.carrierToStructurePathExceptionsCsv, /ExceptionId,ExceptionCode/);
assert.match(exports.carrierToStructureFamiliesCsv, /SupportFamilyId,PathStatus/);

const addon = readFileSync('tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-addon.js', 'utf8');
const bootstrap = readFileSync('tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js', 'utf8');
assert.match(addon, /ps-family-native-combined-input\.js/);
assert.match(addon, /combinedInputText/);
assert.match(addon, /native-model/);
assert.doesNotMatch(addon, /native-support/);
assert.doesNotMatch(addon, /native-steel/);
assert.match(addon, /carrier-to-structure-complete-paths\.csv/);
assert.doesNotMatch(addon, /parseSupportChangeXml/);
assert.match(bootstrap, /ps-family-native-audit-pipeline-addon\.js/);

console.log('ps-family-native-audit-pipeline-ui tests passed');
