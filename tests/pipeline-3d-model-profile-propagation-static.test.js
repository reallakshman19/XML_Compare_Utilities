import assert from 'node:assert/strict';
import fs from 'node:fs';

const sources = [
  'pipeline-3d-model-profile-coordinate-map.js',
  'pipeline-3d-model-profile-events.js',
  'pipeline-3d-model-profile-output.js',
  'pipeline-3d-model-profile-propagation.js',
  'pipeline-3d-model-profile-propagation-runtime.js',
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
  assert.doesNotMatch(source.text, /setInterval|setTimeout\s*\(/);
}

const propagation = sources.find((source) => source.name === 'pipeline-3d-model-profile-propagation.js').text;
assert.match(propagation, /PipelineProfileModel\.fromRaw/);
assert.match(propagation, /buildDepthRules/);
assert.match(propagation, /assertPlausibleProfileSegments/);

const runtime = sources.find((source) => source.name === 'pipeline-3d-model-profile-propagation-runtime.js').text;
assert.match(runtime, /new AbortController\(\)/);
assert.match(runtime, /event\.stopImmediatePropagation\(\)/);
assert.match(runtime, /createTable3XSVG\(output\.table3XText\)/);
assert.match(runtime, /raw\.dispatchEvent\(new Event\('input'/);
assert.doesNotMatch(runtime, /MutationObserver/);

const adapter = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js', import.meta.url), 'utf8');
assert.match(adapter, /input\?\.profileRaw/);
assert.match(adapter, /buildAuthoritativePipelineOutputs/);
assert.match(adapter, /Pipeline3DModelTables\.v1/);

const addon = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-addon.js', import.meta.url), 'utf8');
assert.match(addon, /installPipelineProfilePropagation\(dialog\)/);

const utilityTab = fs.readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /20260718-profile-propagation-1/);

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.match(packageJson.scripts['test:pipeline-table-paste'], /test:pipeline-profile-propagation/);

console.log('Pipeline profile propagation static guards passed.');
