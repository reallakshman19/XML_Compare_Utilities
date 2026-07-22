import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../tabs/pipeline-3d-model/', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const planner = read('pipeline-3d-model-inputxml-document.js');
const writer = read('pipeline-3d-model-xml-builder.js');
const context = read('pipeline-3d-model-export-context.js');
const adapter = read('pipeline-3d-model-project-adapter.js');
const profile = read('pipeline-3d-model-profile-propagation.js');
const config = read('pipeline-3d-model-config.js');
const runtime = read('pipeline-3d-model-profile-propagation-runtime.js');

for (const [name, source] of Object.entries({ planner, writer, context, adapter, profile })) {
  assert.ok(source.split(/\r?\n/).length < 300, `${name} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default/);
  assert.doesNotMatch(source, /inputxml_to_cii2019|converters\/scripts/);
}

assert.match(planner, /PipelineInputXmlDocumentPlan\.v1/);
assert.match(planner, /PIPELINE_LINE_NUMBER_REQUIRED/);
assert.match(planner, /PIPELINE_DIAMETER_REQUIRED/);
assert.match(planner, /PIPELINE_WALL_THICKNESS_REQUIRED/);
assert.match(planner, /PIPELINE_GEOMETRY_NONFINITE/);
assert.match(planner, /PIPELINE_ZERO_LENGTH_ELEMENT/);
assert.match(planner, /PIPELINE_NODE_PAIR_INVALID/);
assert.match(planner, /contextDiagnostics/);
assert.match(planner, /exportContext\?\.readiness\?\.blockerCodes/);
assert.match(planner, /id: `E\$\{index \+ 1\}`/);
assert.match(planner, /fromX, fromY, fromZ, toX, toY, toZ/);

assert.match(writer, /xmlns:ext/);
assert.match(writer, /XML_TYPE/);
assert.match(writer, /NUMELT/);
assert.match(writer, /NUMBEND/);
assert.match(writer, /FROM_X/);
assert.match(writer, /TO_Z/);
assert.match(writer, /buildPipelineInputXmlDocumentPlan/);
assert.doesNotMatch(writer, /NUMELEMENTS/);
assert.doesNotMatch(writer, /SENTINEL_MISSING|-1\.010100/);
assert.doesNotMatch(writer, /FITTINGTHICKNESS',\s*['"]-1/);

assert.match(context, /documentPlan = null/);
assert.match(context, /documentBlockerCount/);
assert.match(context, /documentReady/);
assert.match(adapter, /pipeline-inputxml-document-plan\.json/);
assert.match(adapter, /InputXML\.Canonical\.v1/);
assert.match(adapter, /buildInputXmlPipingModelXml\(plan\)/);
assert.match(profile, /inputXmlDocumentPlanText/);
assert.match(profile, /appendDocumentDiagnostics/);
assert.match(config, /key: 'jobName'/);
assert.match(config, /default: 'PIPELINE_3D_MODEL'/);
assert.match(config, /key: 'issueNo'/);
assert.match(config, /key: 'caesarVersion'/);
assert.match(runtime, /'jobName', 'issueNo', 'caesarVersion'/);
assert.match(runtime, /hasAuthoritativeProfile\(dialog\) \? readProfileRaw\(dialog\) : null/);
assert.doesNotMatch(runtime, /!hasAuthoritativeProfile\(dialog\) && !instance\.output/);
assert.match(runtime, /inputxml_blocked/);
assert.doesNotMatch(runtime, /branchName:\s*value\('lineNo'\)/);

await import('./pipeline-3d-model-inputxml-document.test.js');
console.log('Pipeline canonical InputXML document static guards passed.');
