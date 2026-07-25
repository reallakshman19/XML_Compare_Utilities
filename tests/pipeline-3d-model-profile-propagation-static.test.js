import assert from 'node:assert/strict'; import fs from 'node:fs';
const read = (name) => fs.readFileSync(new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url), 'utf8');
const names = ['pipeline-3d-model-profile-coordinate-map.js', 'pipeline-3d-model-profile-events.js',
  'pipeline-3d-model-profile-output.js', 'pipeline-3d-model-profile-propagation.js',
  'pipeline-3d-model-profile-propagation-runtime.js', 'pipeline-3d-model-export-context.js',
  'pipeline-3d-model-inputxml-document.js', 'pipeline-3d-model-identity.js',
  'pipeline-3d-model-warning-log.js', 'pipeline-3d-model-core-orchestrator.js',
  'pipeline-3d-model-core-runtime.js'];
const sources = Object.fromEntries(names.map((name) => [name, read(name)]));
for (const [name, source] of Object.entries(sources)) {
  assert.ok(source.split(/\r?\n/).length < 300, `${name} must stay below 300 lines`);
  assert.doesNotMatch(source, /export\s+default|core\/workbench-viewport|inputxml_to_cii2019|converters\/scripts|setInterval/);
}
const propagation = sources['pipeline-3d-model-profile-propagation.js'];
for (const token of ['PipelineProfileModel.fromRaw', 'buildDepthRules', 'materializeProfileEvents',
  'assertPlausibleProfileSegments', 'sanitizeTable1Label', 'buildPipelineCoreOutputs',
  'configurationPlan', 'orchestration', 'inputXmlDocumentPlanText']) assert.match(propagation, new RegExp(token.replace('.', '\\.')));
assert.doesNotMatch(propagation, /resolvePipelineElasticBends|buildInputXmlPipingModelXml\(/);
const exportContext = sources['pipeline-3d-model-export-context.js'];
assert.match(exportContext, /PipelineUtilityExportContext\.v1/);
assert.match(exportContext, /PIPELINE_CONFIGURATION_PROFILE_REQUIRED/);
assert.doesNotMatch(exportContext, /UNRECOGNIZED_PROFILE_FALLBACK|resolvedMode:\s*'NORMAL'/);
const identity = sources['pipeline-3d-model-identity.js'];
assert.match(identity, /DEFAULT_PIPELINE_BRANCH_NAME = ''/);
assert.doesNotMatch(identity, /branchFallbackApplied:\s*true/);
const runtime = sources['pipeline-3d-model-profile-propagation-runtime.js'];
assert.match(runtime, /new AbortController\(\)/); assert.match(runtime, /buildPipelineProjectOutputs/);
assert.match(runtime, /data-p3d-core-artifacts/); assert.match(runtime, /inputxml_blocked/);
assert.doesNotMatch(runtime, /new Date|pipeline-3d-model-config-v1|MutationObserver/);
const coreRuntime = sources['pipeline-3d-model-core-runtime.js'];
assert.match(coreRuntime, /resolveExplicitPipelineAnalysisSectionPlan/);
assert.match(coreRuntime, /buildExplicitPipelineInputXmlDocumentPlan/);
const adapter = read('pipeline-3d-model-project-adapter.js');
assert.match(adapter, /buildPipelineNativeOutputBundle/);
assert.match(adapter, /pipeline-engineering-configuration/);
assert.match(adapter, /orchestrationBlockerCount/);
const addon = read('pipeline-3d-model-table-paste-addon.js');
assert.match(addon, /installPipelineProfilePropagation\(dialog\)/);
assert.match(addon, /installPipelineElasticBendSettingsUi\(dialog\)/);
const elasticUi = read('pipeline-3d-model-elastic-bend-ui.js');
assert.match(elasticUi, /installPipelineEngineeringConfigurationUi/);
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.match(packageJson.scripts['test:pipeline-table-paste'], /test:pipeline-profile-propagation/);
await import('./pipeline-3d-model-identity-static.test.js');
await import('./pipeline-3d-model-identity.test.js');
await import('./pipeline-3d-model-export-context-static.test.js');
await import('./pipeline-3d-model-export-context.test.js');
await import('./pipeline-3d-model-inputxml-document-static.test.js');
await import('./pipeline-3d-model-inputxml-gre-projection-contracts.test.js');
await import('./pipeline-3d-model-inputxml-gre-projection.test.js');
await import('./pipeline-3d-model-inputxml-gre-projection-adversarial.test.js');
await import('./pipeline-3d-model-inputxml-gre-projection-static.test.js');
console.log('Pipeline profile propagation explicit-authority static guards passed.');
