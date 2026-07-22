import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(
  new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url),
  'utf8',
);
const context = read('pipeline-3d-model-export-context.js');
const xml = read('pipeline-3d-model-xml-builder.js');
const adapter = read('pipeline-3d-model-project-adapter.js');
const profile = read('pipeline-3d-model-profile-propagation.js');
const runtime = read('pipeline-3d-model-profile-propagation-runtime.js');

for (const [name, source] of Object.entries({ context, xml, adapter, profile, runtime })) {
  assert.ok(source.split(/\r?\n/).length < 300, `${name} must stay below 300 lines`);
  assert.doesNotMatch(source, /export\s+default/);
  assert.doesNotMatch(source, /inputxml_to_cii2019|converters\/scripts/);
}

assert.match(context, /PipelineUtilityExportContext\.v1/);
assert.match(context, /PipelineUtilityExportQualification\.v1/);
assert.match(context, /baseGeometryReady: true/);
assert.match(context, /baseInputXmlReady: true/);
assert.match(context, /fittingInputXmlRequested/);
assert.match(context, /GRE_BEND_POLICY_NOT_IMPLEMENTED/);
assert.match(context, /PIPELINE_GEOMETRY_SEGMENT_REQUIRED/);
assert.match(context, /buildPipelineExportContextJson/);
assert.match(xml, /exportContextBranchInfo/);
assert.match(xml, /buildInputXmlPipingModelXml\(exportInput/);
assert.match(adapter, /pipeline-export-context\.json/);
assert.match(adapter, /PipelineUtilityExportContext\.v1/);
assert.match(adapter, /exportQualification/);
assert.match(adapter, /pipelineMode/);
assert.match(profile, /resolvePipelineUtilityExportContext/);
assert.match(profile, /qualifyPipelineUtilityExport/);
assert.match(profile, /buildInputXmlPipingModelXml\(exportContext/);
assert.match(runtime, /'branchName', 'lineNo'/);
assert.doesNotMatch(runtime, /branchName: value\('lineNo'\)/);
assert.match(runtime, /project-adapter\.js\?v=20260722-p3d-export-context-1/);

console.log('Pipeline export context static guards: ok');
