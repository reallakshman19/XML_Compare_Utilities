import assert from 'node:assert/strict';
import fs from 'node:fs';

const sources = [
  'pipeline-3d-model-profile-coordinate-map.js',
  'pipeline-3d-model-profile-events.js',
  'pipeline-3d-model-profile-output.js',
  'pipeline-3d-model-profile-propagation.js',
  'pipeline-3d-model-profile-propagation-runtime.js',
  'pipeline-3d-model-export-context.js',
  'pipeline-3d-model-inputxml-document.js',
  'pipeline-3d-model-identity.js',
  'pipeline-3d-model-warning-log.js',
].map((name) => ({
  name,
  text: fs.readFileSync(new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url), 'utf8'),
}));

for (const source of sources) {
  const lines = source.text.split(/\r?\n/).length;
  assert.ok(lines < 300, `${source.name} must stay below 300 lines, got ${lines}`);
  assert.doesNotMatch(source.text, /export\s+default/);
  assert.doesNotMatch(source.text, /core\/workbench-viewport/);
  assert.doesNotMatch(source.text, /inputxml_to_cii2019|converters\/scripts/);
  assert.doesNotMatch(source.text, /setInterval/);
}

const propagation = sources.find((source) => source.name === 'pipeline-3d-model-profile-propagation.js').text;
assert.match(propagation, /PipelineProfileModel\.fromRaw/);
assert.match(propagation, /buildDepthRules/);
assert.match(propagation, /table3MarkerRules/);
assert.match(propagation, /warnings: Object\.freeze/);
assert.match(propagation, /elevationAuthority: 'TABLE_2'/);
assert.match(propagation, /materializeProfileEvents\(events, context, gradeRows\)/);
assert.match(propagation, /assertPlausibleProfileSegments\(combined, context\.total, context\.warnings\)/);
assert.match(propagation, /sanitizeTable1Label/);
assert.match(propagation, /T1-\$\{String\(index \+ 1\)\.padStart\(3, '0'\)\}/);
assert.match(propagation, /resolvePipelineElasticBends/);
assert.match(propagation, /buildPipelineInputXmlDocumentPlan/);
assert.match(propagation, /buildPipelineInputXmlDocumentPlanJson/);
assert.match(propagation, /buildInputXmlPipingModelXml\(document\.plan\)/);
assert.match(propagation, /appendDocumentDiagnostics/);
assert.match(propagation, /inputXmlDocumentPlanText/);
assert.match(propagation, /inputXmlCoordinateRows: elasticBends\.geometryRows/);
assert.match(propagation, /markerRowsExcludedFromInputXml/);

const coordinateMap = sources.find((source) => source.name === 'pipeline-3d-model-profile-coordinate-map.js').text;
assert.match(coordinateMap, /table3_h_clamped/);
assert.match(coordinateMap, /route_distance_clamped/);
assert.match(coordinateMap, /station_alignment_quality/);
assert.match(coordinateMap, /grade_profile_extrapolated/);
assert.doesNotMatch(coordinateMap, /throw new RangeError\(`Table 3 H/);

const events = sources.find((source) => source.name === 'pipeline-3d-model-profile-events.js').text;
assert.match(events, /geometryRole: 'MARKER_ONLY'/);
assert.match(events, /const z = grade;/);
assert.match(events, /elevationAuthority: 'TABLE_2'/);
assert.doesNotMatch(events, /activeDepthRule/);

const exportContext = sources.find((source) => source.name === 'pipeline-3d-model-export-context.js').text;
assert.match(exportContext, /PipelineUtilityExportContext\.v1/);
assert.match(exportContext, /PipelineUtilityExportQualification\.v1/);
assert.match(exportContext, /documentPlan = null/);
assert.match(exportContext, /documentBlockerCount/);
assert.match(exportContext, /GRE_BEND_POLICY_NOT_IMPLEMENTED/);

const documentPlan = sources.find((source) => source.name === 'pipeline-3d-model-inputxml-document.js').text;
assert.match(documentPlan, /PipelineInputXmlDocumentPlan\.v1/);
assert.match(documentPlan, /PIPELINE_LINE_NUMBER_REQUIRED/);
assert.match(documentPlan, /PIPELINE_GEOMETRY_NONFINITE/);
assert.match(documentPlan, /id: `E\$\{index \+ 1\}`/);

const identity = sources.find((source) => source.name === 'pipeline-3d-model-identity.js').text;
assert.match(identity, /PipelineIdentityContext\.v1/);
assert.match(identity, /DEFAULT_PIPELINE_BRANCH_NAME = 'B1'/);
assert.match(identity, /SOURCE_LABEL_PRESERVED/);

const runtime = sources.find((source) => source.name === 'pipeline-3d-model-profile-propagation-runtime.js').text;
assert.match(runtime, /new AbortController\(\)/);
assert.match(runtime, /'jobName', 'issueNo', 'caesarVersion'/);
assert.match(runtime, /'branchName', 'lineNo'/);
assert.doesNotMatch(runtime, /branchName: value\('lineNo'\)/);
assert.match(runtime, /20260722-p3d-canonical-document-1/);
assert.match(runtime, /hasAuthoritativeProfile\(dialog\) \? readProfileRaw\(dialog\) : null/);
assert.doesNotMatch(runtime, /!hasAuthoritativeProfile\(dialog\) && !instance\.output/);
assert.match(runtime, /inputxml_blocked/);
assert.match(runtime, /renderPipelineWarningLog/);
assert.doesNotMatch(runtime, /MutationObserver/);

const adapter = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js', import.meta.url), 'utf8');
assert.match(adapter, /input\?\.profileRaw/);
assert.match(adapter, /buildAuthoritativePipelineOutputs/);
assert.match(adapter, /20260722-p3d-canonical-document-1/);
assert.match(adapter, /pipeline-inputxml-document-plan\.json/);
assert.match(adapter, /PipelineInputXmlDocumentPlan\.v1/);
assert.match(adapter, /InputXML\.Canonical\.v1/);
assert.match(adapter, /inputXmlDocumentBlockerCount/);

const addon = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-addon.js', import.meta.url), 'utf8');
assert.match(addon, /installPipelineProfilePropagation\(dialog\)/);
assert.match(addon, /installPipelineElasticBendSettingsUi\(dialog\)/);
assert.match(addon, /Table 2 station\/elevation values are the sole generated-geometry Z authority/);
assert.match(addon, /20260722-p3d-canonical-document-1/);

const utilityTab = fs.readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /pipeline-3d-model-table-paste-addon\.js\?v=20260722-p3d-canonical-document-1/);

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.match(packageJson.scripts['test:pipeline-table-paste'], /test:pipeline-profile-propagation/);
assert.match(packageJson.scripts['test:pipeline-profile-propagation'], /pipeline-3d-model-elastic-bend\.test\.js/);

await import('./pipeline-3d-model-identity-static.test.js');
await import('./pipeline-3d-model-identity.test.js');
await import('./pipeline-3d-model-export-context-static.test.js');
await import('./pipeline-3d-model-export-context.test.js');
await import('./pipeline-3d-model-inputxml-document-static.test.js');

console.log('Pipeline profile propagation static guards passed.');
