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
  'sequential-sketcher-contract.js', 'sequential-sketcher-source.js',
  'sequential-sketcher-projection.js', 'sequential-sketcher-markup.js',
  'sequential-sketcher-workspace.js', 'sequential-sketcher-tab.js', 'sequential-sketcher.css',
  'source/sequential-evidence-model.js',
  'construction/sequential-construction-contract.js',
  'construction/sequential-connection-resolver.js',
  'construction/sequential-terminal-classifier.js',
  'construction/sequential-construction-engine.js',
  'stroke/sequential-component-stroke-compiler.js',
  'canvas/sequential-construction-svg.js',
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
  'Sequential Sketcher', 'Authoritative start branch', 'Exact tolerance',
  'Automatic repair limit', 'Candidate search radius', 'Advance one',
  'Run until blocked', 'Solid = confirmed', 'dotted = candidate',
]) assert.match(markup, new RegExp(label));
assert.doesNotMatch(markup, /Compile branch|Coordinate tolerance/, 'graph-first compile controls must be retired');

const workspace = read('sequential-sketcher-workspace.js');
assert.match(workspace, /sequential-construction-engine\.js/);
assert.match(workspace, /buildSequentialEvidenceModel/);
assert.match(workspace, /runConstructionUntilBlocked/);
assert.match(workspace, /applyConstructionDecision/);
assert.doesNotMatch(workspace, /buildBranchTopology|planSequentialTraversal|sequential-sketcher-renderer|buildSequentialSketcherSupportProjection/,
  'runtime must not construct and walk a complete graph or project supports before confirmation');

const evidence = read('source/sequential-evidence-model.js');
assert.match(evidence, /sourcePosition/);
assert.match(evidence, /resolvedPosition:\s*null/);
assert.match(evidence, /RUN_IN/);
assert.match(evidence, /RUN_OUT/);
assert.match(evidence, /BRANCH_OUT/);
assert.doesNotMatch(evidence, /samePoint|toleranceMm/, 'source evidence must not merge coordinates');

const engine = read('construction/sequential-construction-engine.js');
assert.match(engine, /USER_DECISION_REQUIRED/);
assert.match(engine, /DRAW_VIRTUAL_REPAIR/);
assert.match(engine, /RETURN_TO_JUNCTION/);
assert.match(engine, /ENTER_BRANCH/);
assert.doesNotMatch(engine, /DISCONNECTED_FRAGMENT|unvisited|options\[0\]/,
  'construction authority must not continue through arbitrary or disconnected graph sections');

const resolver = read('construction/sequential-connection-resolver.js');
assert.match(resolver, /autoRepairToleranceMm/);
assert.match(resolver, /MULTIPLE_REPAIR_CANDIDATES/);
assert.match(resolver, /CONTINUITY_NOT_PROVEN/);
assert.match(resolver, /sourceAdjacent/);
assert.match(resolver, /referenceMatch/);

const strokes = read('stroke/sequential-component-stroke-compiler.js');
for (const operation of [
  'DRAW_PIPE', 'DRAW_ELBOW', 'DRAW_REDUCER', 'DRAW_TEE_RUN',
  'REGISTER_TEE_BRANCH', 'DRAW_OLET', 'DRAW_VALVE', 'DRAW_FLANGE', 'DRAW_CAP',
]) assert.match(strokes, new RegExp(operation));

const canvas = read('canvas/sequential-construction-svg.js');
assert.match(canvas, /<svg/);
assert.doesNotMatch(canvas, /<canvas|canvas\.getContext/);
for (const layer of ['confirmed-geometry', 'candidate-connections', 'active-port']) assert.match(canvas, new RegExp(layer));
assert.match(canvas, /data-ssk-candidate-id/);
assert.match(canvas, /ssk-confirmed-repair/);
assert.match(canvas, /ssk-candidate/);

const support = read('sequential-sketcher-support.js');
assert.match(support, /\.\/support\/sj-pipe-support-projection\.js/);
const constructionFiles = [
  'source/sequential-evidence-model.js',
  'construction/sequential-construction-contract.js',
  'construction/sequential-connection-resolver.js',
  'construction/sequential-terminal-classifier.js',
  'construction/sequential-construction-engine.js',
  'stroke/sequential-component-stroke-compiler.js',
  'canvas/sequential-construction-svg.js',
  'sequential-sketcher-workspace.js',
];
for (const name of constructionFiles) {
  assert.doesNotMatch(read(name), /sj-pipe-support|buildPipeSupportProjectionBundle/,
    `${name} must remain independent of support projection`);
}

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
assert.equal(schema.properties.schema.const, 'PipeSupportProjectionBundle.v1');
assert.equal(schema.$defs.coordinateSystem.properties.units.const, 'mm');

const utilityTab = readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /installSequentialSketcherTile/);
console.log('sequential sketcher UI static tests passed');
