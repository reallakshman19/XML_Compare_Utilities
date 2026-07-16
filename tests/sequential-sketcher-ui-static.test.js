import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../tabs/sequential-sketcher/', import.meta.url));
const schemaPath = fileURLToPath(new URL('../contracts/pipe-support-projection/v1/PipeSupportProjectionBundle.schema.json', import.meta.url));

function relativeFiles(root, prefix = '') {
  return readdirSync(root).flatMap((name) => {
    const full = path.join(root, name);
    const relative = path.join(prefix, name).replaceAll('\\', '/');
    return statSync(full).isDirectory() ? relativeFiles(full, relative) : [relative];
  });
}

const files = relativeFiles(directory);
for (const required of [
  'sequential-sketcher-contract.js', 'sequential-sketcher-source.js', 'sequential-sketcher-support.js',
  'sequential-sketcher-topology.js', 'sequential-sketcher-traversal.js', 'sequential-sketcher-projection.js',
  'sequential-sketcher-renderer.js', 'sequential-sketcher-markup.js', 'sequential-sketcher-workspace.js',
  'sequential-sketcher-tab.js', 'sequential-sketcher.css',
  'support/sj-pipe-support-projection.js', 'support/sj-pipe-support-family.js',
  'support/sj-pipe-support-geometry.js', 'support/sj-pipe-support-utils.js',
]) assert(files.includes(required), `${required} is required`);

const read = (name) => readFileSync(path.join(directory, name), 'utf8');
for (const name of files.filter((file) => file.endsWith('.js'))) {
  const text = read(name);
  assert.doesNotMatch(text, /from\s+['"]three['"]|WebGLRenderer|PerspectiveCamera|OrbitControls/, `${name} must not use a 3D render engine`);
  assert.doesNotMatch(text, /from\s+['"][^'"]*(?:topology-trace-validator|pipeline-3d-model|component-topology)[^'"]*['"]/, `${name} must not import old topology/render modules`);
  assert.doesNotMatch(text, /from\s+['"][^'"]*(?:3D_Converters|stagedjson-to-enrichxml)[^'"]*['"]/, `${name} must own its implementation rather than link to the source repository`);
  assert.doesNotMatch(text, /sj-point-resolver|sj-restraint-resolver/, `${name} must not depend on unrelated converter helpers`);
}

const markup = read('sequential-sketcher-markup.js');
for (const label of [
  'Sequential Sketcher', 'Exact branch', 'Coordinate tolerance', 'Stroke sequence',
  'Support projection', 'Owned PipeSupportProjectionBundle.v1',
  'Projection tolerance', 'On-centreline tolerance', 'Ambiguity tolerance',
]) assert.match(markup, new RegExp(label));
assert.doesNotMatch(markup, /Load optional support JSON|data-ssk-supports/, 'support evidence must come from selected branch siblings');

const renderer = read('sequential-sketcher-renderer.js');
assert.match(renderer, /<svg/);
assert.doesNotMatch(renderer, /<canvas|canvas\.getContext/);
assert.match(renderer, /centerlinePointGlobal/);

const topology = read('sequential-sketcher-topology.js');
assert.doesNotMatch(topology, /sequential-sketcher-support|buildPipeSupportProjectionBundle/, 'topology construction must remain support-independent');

const support = read('sequential-sketcher-support.js');
assert.match(support, /\.\/support\/sj-pipe-support-projection\.js/);
assert.match(support, /buildValidatedSupportCarriers/);
assert.match(support, /decorateTopologyWithSupportProjection/);

const workspace = read('sequential-sketcher-workspace.js');
const topologyAt = workspace.indexOf('const pipingTopology = buildBranchTopology');
const traversalAt = workspace.indexOf('const pipingTraversal = planSequentialTraversal');
const supportAt = workspace.indexOf('model.supportBundle = buildSequentialSketcherSupportProjection');
assert(topologyAt >= 0 && traversalAt > topologyAt && supportAt > traversalAt,
  'workspace must complete topology and pen traversal before support projection');

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
assert.equal(schema.properties.schema.const, 'PipeSupportProjectionBundle.v1');
assert.equal(schema.$defs.coordinateSystem.properties.units.const, 'mm');
assert.deepEqual(schema.$defs.position.properties.positionStatus.enum, [
  'ON_CENTERLINE', 'PROJECTED_TO_CENTERLINE', 'OFFSET_FROM_CENTERLINE',
  'ATTACHED_TO_FITTING', 'ATTACHED_TO_COMPONENT_PORT', 'AMBIGUOUS_CARRIER',
  'OUTSIDE_PROJECTION_TOLERANCE', 'UNRESOLVED',
]);

const utilityTab = readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /installSequentialSketcherTile/);
console.log('sequential sketcher UI static tests passed');
