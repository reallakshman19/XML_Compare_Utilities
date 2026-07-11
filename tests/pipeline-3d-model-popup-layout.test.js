import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layoutPath = new URL('../tabs/pipeline-3d-model/pipeline-3d-model-layout-overrides.js', import.meta.url);
const psnmPath = new URL('../tabs/psnm-utility-tab.js', import.meta.url);

const layoutSource = readFileSync(layoutPath, 'utf8');
const psnmSource = readFileSync(psnmPath, 'utf8');

assert.match(layoutSource, /\.pipeline-3d-model-backdrop\{[\s\S]*padding:0!important/);
assert.match(layoutSource, /\.pipeline-3d-model-dialog\{[\s\S]*width:100vw!important/);
assert.match(layoutSource, /\.pipeline-3d-model-dialog\{[\s\S]*height:100vh!important/);
assert.match(layoutSource, /\.p3d-input-grid\{[\s\S]*grid-template-columns:minmax\(280px,1\.2fr\)/);
assert.match(layoutSource, /\.p3d-input-grid textarea,[\s\S]*\.p3d-tablex-shell textarea\{[\s\S]*max-width:100%!important/);
assert.match(layoutSource, /\.p3d-branch-grid\{[\s\S]*repeat\(auto-fit,minmax\(150px,190px\)\)/);
assert.match(layoutSource, /@media \(max-width:900px\)/);
assert.match(psnmSource, /pipeline-3d-model-layout-overrides\.js\?v=20260711-fullscreen-layout-1/);

console.log('pipeline-3d-model-popup-layout.test.js passed');
