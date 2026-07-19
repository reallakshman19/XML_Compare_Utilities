import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const productionFiles = [
  'tabs/pipeline-3d-model/pipeline-engineering-svg-view-model.js',
  'tabs/pipeline-3d-model/pipeline-engineering-svg-scene.js',
  'tabs/pipeline-3d-model/pipeline-engineering-svg-properties.js',
  'tabs/pipeline-3d-model/pipeline-engineering-svg-adapter.js',
];

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

for (const name of productionFiles) {
  const source = readFileSync(join(root, name), 'utf8');
  const lines = source.split(/\r?\n/).length;
  assert.ok(lines <= 300, `${name} exceeds 300 lines (${lines})`);
  assert.doesNotMatch(source, /export\s+default\b/, `${name} uses a default export`);
  assert.doesNotMatch(source, /\b(Canvas|WebGL|ReactDOM|React|THREE|localStorage|sessionStorage|CustomEvent)\b/, `${name} leaks a forbidden runtime or storage owner`);
  assert.doesNotMatch(source, /document\.|window\.|innerHTML|dispatchEvent|addEventListener|removeEventListener/, `${name} owns DOM or a global event path`);
  assert.doesNotMatch(source, /toFixed|Math\.(round|floor|ceil|trunc)|parseInt/, `${name} rounds authoritative coordinates`);
  assert.doesNotMatch(source, /createEngineeringSvgCommandGateway|\.execute\s*\(|new\s+CommandHistory|undoStack|redoStack/, `${name} introduces command or history execution`);
  assert.doesNotMatch(source, /pipeline-3d-model-(table2x|table3x|preview|cad-|profile-propagation-runtime|tab)\.js/, `${name} imports Pipeline UI, renderer or editor ownership`);
  assert.doesNotMatch(source, /window\.dispatchEvent|globalThis\.dispatchEvent|new\s+Event\(/, `${name} introduces a global event bus`);
}

const adapterSource = readFileSync(join(root, productionFiles[3]), 'utf8');
assert.doesNotMatch(adapterSource, /commandGateway\s*:/, 'read-only Pipeline adapter must not pass a command gateway');
assert.match(adapterSource, /accessMode:\s*'read-only'/);
assert.match(adapterSource, /editing:\s*false/);

const coreFiles = filesUnder(join(root, 'core')).filter((path) => path.endsWith('.js'));
for (const path of coreFiles) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /from\s+['"][^'"]*pipeline-3d-model\//, `shared core imports Pipeline module: ${relative(root, path)}`);
}

const pipelineFiles = filesUnder(join(root, 'tabs/pipeline-3d-model'))
  .filter((path) => path.endsWith('.js') && !path.includes('pipeline-engineering-svg-'));
for (const path of pipelineFiles) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /pipeline-engineering-svg-/, `existing Pipeline production file mounts the adapter: ${relative(root, path)}`);
}

const workflow = readFileSync(join(root, '.github/workflows/pipeline-engineering-svg-adapter.yml'), 'utf8');
assert.doesNotMatch(workflow, /playwright|chromium|browser/i, 'PCAD-ESVG-001 must not add a browser shadow mount');

console.log('Pipeline engineering SVG dependency and deployment guards: ok');
