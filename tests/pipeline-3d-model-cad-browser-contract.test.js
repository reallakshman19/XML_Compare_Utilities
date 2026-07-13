import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spec = readFileSync(new URL('./browser/pipeline-3d-model-cad-browser.spec.mjs', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('./browser/pipeline-cad-fixture.html', import.meta.url), 'utf8');
const config = readFileSync(new URL('../playwright.pipeline-cad.config.mjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/pipeline-cad-browser-acceptance.yml', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

for (const scenario of ['CAD-B01', 'CAD-B02', 'CAD-B03', 'CAD-B04', 'CAD-B05', 'CAD-B06']) {
  assert.match(spec, new RegExp(scenario));
}
assert.match(spec, /page\.mouse\.down/);
assert.match(spec, /page\.mouse\.wheel/);
assert.match(spec, /button: 'right'/);
assert.match(spec, /page\.keyboard\.press/);
assert.match(spec, /page\.screenshot/);
assert.match(spec, /console/);
assert.match(spec, /pageerror/);

assert.match(fixture, /pipeline-3d-model-cad-authoring\.js/);
assert.match(fixture, /mountPipelineCadWorkspace/);
assert.match(fixture, /data-p3d-split="table2x-preview"/);
assert.match(fixture, /data-p3d-split="table3x-preview"/);
assert.match(fixture, /__pipelineCadHarness/);

assert.match(config, /browserName: 'chromium'/);
assert.match(config, /deviceScaleFactor: 1\.5/);
assert.match(config, /pipeline-cad-browser-results\.json/);
assert.match(workflow, /@playwright\/test@1\.54\.1/);
assert.match(workflow, /playwright install --with-deps chromium/);
assert.match(workflow, /actions\/upload-artifact@v4/);
assert.equal(packageJson.scripts['test:pipeline-cad-browser'], 'playwright test --config=playwright.pipeline-cad.config.mjs');

console.log('pipeline-3d-model CAD browser contract tests passed');
