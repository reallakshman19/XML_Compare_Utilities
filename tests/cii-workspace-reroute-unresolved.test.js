import assert from 'assert';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { compareLockedCiiAnchorSpan } from '../tabs/cii-workspace/cii-workspace-topology.js';

function edge(index, from, to, length) {
  return { index, from, to, dx: length, dy: 0, dz: 0, length, od: 273, wall: 8, P1: 10, T1: 100, hasBend: false };
}
function graph(side, edges) {
  const nodes = {};
  let x = 0;
  for (const item of edges) {
    nodes[item.from] ||= { x, y: 0, z: 0 };
    x += item.length;
    nodes[item.to] ||= { x, y: 0, z: 0 };
    item.fromPos = nodes[item.from]; item.toPos = nodes[item.to];
  }
  return adaptCiiDocumentToTopologyGraph({
    schema: 'CIIWorkspaceDocument.v1', side, contentSha256: `${side}-sha`, nodeNames: {}, parsed: { elements: edges, nodes, rigids: [] },
  });
}

const source = graph('SOURCE', [edge(0, 100, 110, 1000), edge(1, 110, 120, 1000)]);
const target = graph('TARGET', [edge(0, 5000, 5010, 400), edge(1, 5010, 5020, 400)]);
const rerouted = compareLockedCiiAnchorSpan(source, target, [
  { sourceNodeId: '100', targetNodeId: '5000' },
  { sourceNodeId: '120', targetNodeId: '5020' },
]);
assert.strictEqual(rerouted.status, 'UNRESOLVED');
assert(rerouted.blockers.includes('ANCHOR_PATH_LENGTH_DIVERGENCE'));
assert.strictEqual(rerouted.pathGate.status, 'UNRESOLVED');
assert(rerouted.elementRows.every((row) => !['HIGH'].includes(row.status)), 'material path divergence must not retain automatic HIGH custody');

// A true subdivision preserves cumulative length and remains valid.
const sourceSubdivision = graph('SOURCE', [edge(0, 200, 300, 1000)]);
const targetSubdivision = graph('TARGET', [edge(0, 6000, 6010, 400), edge(1, 6010, 6020, 600)]);
const subdivision = compareLockedCiiAnchorSpan(sourceSubdivision, targetSubdivision, [
  { sourceNodeId: '200', targetNodeId: '6000' },
  { sourceNodeId: '300', targetNodeId: '6020' },
]);
assert.strictEqual(subdivision.status, 'READY');
assert.strictEqual(subdivision.pathGate.status, 'SUPPORTED');
assert.strictEqual(subdivision.elementRows[0].kind, 'ELEMENT_PATH');
console.log('CII Workspace reroute fail-closed checks passed.');
