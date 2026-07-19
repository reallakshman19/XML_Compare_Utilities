import assert from 'node:assert/strict';
import fs from 'node:fs';

const names = [
  'pipeline-3d-model-elastic-bend-settings.js',
  'pipeline-3d-model-elastic-bend.js',
  'pipeline-3d-model-elastic-bend-ui.js',
];
const sources = Object.fromEntries(names.map((name) => [name, fs.readFileSync(new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url), 'utf8')]));
for (const [name, text] of Object.entries(sources)) {
  assert.ok(text.split(/\r?\n/).length < 300, `${name} must stay below 300 lines`);
  assert.doesNotMatch(text, /export\s+default/);
}

const core = sources['pipeline-3d-model-elastic-bend.js'];
assert.match(core, /youngsModulusMpa \* outsideDiameterMm/);
assert.match(core, /2 \* settings\.allowableBendingStressMpa/);
assert.match(core, /practicalRadiusMultiplierD \* outsideDiameterMm/);
assert.match(core, /Math\.tan\(\(turnAngleDeg \/ DEG\) \/ 2\)/);
assert.match(core, /sources\.includes\('vertex'\) \|\| sources\.includes\('table2'\)/);
assert.doesNotMatch(core, /table3|depthRule|zOffset/i);
assert.match(core, /incomingElementIndex: entry\.index - 1/);
assert.match(core, /PipelineElasticBendResolution\.v1/);
assert.match(core, /elastic_bend_screening_only/);

const settings = sources['pipeline-3d-model-elastic-bend-settings.js'];
assert.match(settings, /PipelineElasticBendSettings\.v1/);
assert.match(settings, /enabled: false/);
assert.match(settings, /emitToInputXml: false/);
assert.match(settings, /practicalRadiusMultiplierD: 500/);
assert.match(settings, /pipeline-3d-model-elastic-bend-settings-v1/);

const ui = sources['pipeline-3d-model-elastic-bend-ui.js'];
assert.match(ui, /Elastic Bend Settings/);
assert.match(ui, /Screening only/);
assert.match(ui, /global-buckling review/);
assert.match(ui, /Bend Settings/);
assert.match(ui, /pipeline-elastic-bends\.tsv/);

const xml = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js', import.meta.url), 'utf8');
assert.match(xml, /function bendXml/);
assert.match(xml, /<BEND /);
assert.match(xml, /bendByIncomingElementIndex/);
assert.match(xml, /if \(!bend\) return `<PIPINGELEMENT/);

const adapter = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js', import.meta.url), 'utf8');
assert.match(adapter, /pipeline-elastic-bends\.tsv/);
assert.match(adapter, /PipelineElasticBendResolution\.v1/);
assert.match(adapter, /elasticBendSettings/);
assert.match(adapter, /elasticBendEmittedCount/);

const utility = fs.readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utility, /pipeline-3d-model-elastic-bend-ui\.js\?v=20260719-elastic-bend-1/);
const runtime = fs.readFileSync(new URL('../core/app-standalone-runtime.js', import.meta.url), 'utf8');
assert.match(runtime, /psnm-utility-tab\.js\?v=standalone-20260719-elastic-bend-1/);

console.log('Pipeline elastic bend static guards passed.');
