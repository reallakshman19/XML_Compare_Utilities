import assert from 'assert';
import { stableStringify } from '../tabs/cii-workspace/cii-workspace-contracts.js';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { compareLockedCiiAnchorSpan } from '../tabs/cii-workspace/cii-workspace-topology.js';

function makeDocument(side, offset) {
  const elements = [
    { index: 0, from: offset, to: offset + 10, dx: 500, dy: 0, dz: 0, length: 500, od: 273, wall: 8, P1: 10, T1: 100, hasBend: false },
    { index: 1, from: offset + 10, to: offset + 20, dx: 500, dy: 0, dz: 0, length: 500, od: 273, wall: 8, P1: 10, T1: 100, hasBend: false },
  ];
  const nodes = Object.fromEntries([offset, offset + 10, offset + 20].map((node) => [node, { x: node, y: 0, z: 0 }]));
  return { schema: 'CIIWorkspaceDocument.v1', side, contentSha256: `${side}-sha`, nodeNames: {}, parsed: { elements, nodes, rigids: [] } };
}
function run() {
  const source = adaptCiiDocumentToTopologyGraph(makeDocument('SOURCE', 100));
  const target = adaptCiiDocumentToTopologyGraph(makeDocument('TARGET', 5000));
  return compareLockedCiiAnchorSpan(source, target, [
    { sourceNodeId: '100', targetNodeId: '5000' }, { sourceNodeId: '120', targetNodeId: '5020' },
  ]);
}
assert.strictEqual(stableStringify(run()), stableStringify(run()));
console.log('CII Workspace deterministic correspondence checks passed.');
