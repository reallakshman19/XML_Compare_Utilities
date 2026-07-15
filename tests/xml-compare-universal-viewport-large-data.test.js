import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUniversalViewportSearchIndex } from '../xml-compare/universal-categorizer/universal-viewport-search.js';
import { createUniversalViewportProjection } from '../xml-compare/universal-categorizer/universal-viewport-projection.js';
import { calculateUniversalVirtualWindow } from '../xml-compare/universal-categorizer/universal-viewport-virtual-window.js';

const tree = Object.freeze(Array.from({ length: 10_000 }, (_, index) => Object.freeze({
  nodeId: `tree:node:${index}`, path: `Plant / Line ${Math.floor(index / 100)} / Node ${index}`,
  label: `Node ${index}`, level: 'Node', levelId: 'node', key: String(index), depth: 3,
})));
const pivot = Object.freeze(Array.from({ length: 20_000 }, (_, index) => Object.freeze({
  path: `Plant / Node ${Math.floor(index / 2)}`, level: 'Node', key: String(Math.floor(index / 2)),
  block: index % 2 ? 'Coordinates' : 'NodeBlock', field: index % 2 ? 'X' : 'NAME',
  value: String(index), source: index % 2 ? 'coordinateLookup' : 'mainXml',
})));
const treeIndex = createUniversalViewportSearchIndex(tree, { surface: 'tree', identityFor: (row) => row.nodeId });
const pivotIndex = createUniversalViewportSearchIndex(pivot, { surface: 'pivot', identityFor: (_, index) => `pivot:${index}` });
const treeProjection = createUniversalViewportProjection(treeIndex, { searchText: 'node', dimensions: ['level'], filters: {} });
const pivotProjection = createUniversalViewportProjection(pivotIndex, { searchText: 'coordinates x', dimensions: ['level', 'block', 'source'], filters: { source: 'coordinateLookup' } });
assert.equal(treeProjection.count, 10_000);
assert.equal(pivotProjection.count, 10_000);
assert.equal(treeProjection.rows[4_321], tree[4_321]);
assert.equal(pivotProjection.rows[123], pivot[247]);
for (const count of [treeProjection.count, pivotProjection.count]) {
  const window = calculateUniversalVirtualWindow({ count, rowHeight: 34, viewportHeight: 900, scrollTop: count * 17, overscan: 10 });
  assert.ok(window.rendered <= 250);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = fs.readdirSync(path.join(root, 'xml-compare/universal-categorizer')).filter((name) => name.includes('viewport') || name.includes('virtual'));
for (const file of files) {
  const source = fs.readFileSync(path.join(root, 'xml-compare/universal-categorizer', file), 'utf8');
  assert.ok(source.split(/\r?\n/).length < 300, `${file} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default\b/);
  assert.doesNotMatch(source, /pipeline-3d-model|PipelineCad/);
}
console.log('xml-builder viewport 10k/20k large-data tests passed');
