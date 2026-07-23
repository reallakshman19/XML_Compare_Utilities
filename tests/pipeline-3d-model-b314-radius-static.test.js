import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = [
  'tabs/pipeline-3d-model/pipeline-3d-model-b314-radius-contracts.js',
  'tabs/pipeline-3d-model/pipeline-3d-model-b314-radius-resolution.js',
];
const sources = production.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
for (const [file, source] of sources) {
  assert.ok(source.trimEnd().split(/\r?\n/).length < 300, `${file} must remain below 300 lines`);
  assert.equal(/export\s+default\b/.test(source), false, `${file} must use named exports only`);
  for (const forbidden of ['localStorage', 'sessionStorage', 'document.', 'window.', 'canvas', 'three.js',
    'pipeline-3d-model-tab', 'project-adapter', 'inputxml-document', 'xml-builder', 'normal-fitting',
    'gre-', 'branchInfo', 'boreMm', 'Math.random', 'performance.now', 'localeCompare', 'new Date',
    'new Map', 'new Set']) assert.equal(source.includes(forbidden), false, `${file} contains forbidden ${forbidden}`);
  assert.equal(/nominalPipeSizeNps\s*\*/.test(source), false, `${file} must not multiply NPS`);
  assert.equal(/\*\s*nominalPipeSizeNps/.test(source), false, `${file} must not use NPS as D`);
  assert.equal(/\bcandidate\.bendClass\s*=(?!=)/.test(source), false, `${file} must not reclassify candidates`);
  assert.equal(/\.geometry(?:Rows|Points|Fits)?\s*=/.test(source), false, `${file} must not mutate geometry`);
}
const joined = sources.map(([, source]) => source).join('\n');
for (const value of ['b31.4-elastic-screening', 'b31.4-cold-field-size-band',
  'b31.4-cold-field-project-radius-d', 'B31_4_ELASTIC_GOVERNING',
  'B31_4_COLD_FIELD_SIZE_BAND_GOVERNING', 'B31_4_COLD_FIELD_PROJECT_RADIUS_D']) assert.ok(joined.includes(value));
assert.ok(joined.includes('E / (2') || joined.includes('/ (2 *'));
assert.ok(joined.includes('sizeBandRadiusD'));
assert.ok(joined.includes('0.000001'));
const runtimeFiles = fs.readdirSync(path.join(root, 'tabs/pipeline-3d-model')).filter((name) => name.endsWith('.js')
  && !name.startsWith('pipeline-3d-model-b314-radius-'));
for (const file of runtimeFiles) {
  const source = fs.readFileSync(path.join(root, 'tabs/pipeline-3d-model', file), 'utf8');
  assert.equal(source.includes('pipeline-3d-model-b314-radius-'), false, `${file} must not adopt the new modules`);
}
console.log('pipeline-3d-model B31.4 radius static guards: PASS');
