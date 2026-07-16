import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../tabs/sequential-sketcher/', import.meta.url));
const files = readdirSync(directory);
for (const required of [
  'sequential-sketcher-contract.js', 'sequential-sketcher-source.js', 'sequential-sketcher-support.js',
  'sequential-sketcher-topology.js', 'sequential-sketcher-traversal.js', 'sequential-sketcher-projection.js',
  'sequential-sketcher-renderer.js', 'sequential-sketcher-markup.js', 'sequential-sketcher-workspace.js',
  'sequential-sketcher-tab.js', 'sequential-sketcher.css',
]) assert(files.includes(required), `${required} is required`);

const read = (name) => readFileSync(path.join(directory, name), 'utf8');
for (const name of files.filter((file) => file.endsWith('.js'))) {
  const text = read(name);
  assert.doesNotMatch(text, /from\s+['"]three['"]|WebGLRenderer|PerspectiveCamera|OrbitControls/, `${name} must not use a 3D render engine`);
  assert.doesNotMatch(text, /topology-trace-validator|pipeline-3d-model|component-topology/, `${name} must not copy or import old topology/render modules`);
}
const markup = read('sequential-sketcher-markup.js');
for (const label of ['Sequential Sketcher', 'Exact branch', 'Coordinate tolerance', 'Stroke sequence', 'Support projection bundle']) assert.match(markup, new RegExp(label));
const renderer = read('sequential-sketcher-renderer.js');
assert.match(renderer, /<svg/);
assert.doesNotMatch(renderer, /<canvas|canvas\.getContext/);
const utilityTab = readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /installSequentialSketcherTile/);
console.log('sequential sketcher UI static tests passed');
