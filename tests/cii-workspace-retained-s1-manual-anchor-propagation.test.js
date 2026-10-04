import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCiiWorkspacePreviewWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-writer-version-bridge.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
const sourceBytes = readFileSync(benchmark('S1.CII'));
const targetBytes = readFileSync(benchmark('T.CII'));
const oneAnchor = [{ sourceNodeId: '3910', targetNodeId: '875' }];
const threeAnchors = [
  { sourceNodeId: '3910', targetNodeId: '875' },
  { sourceNodeId: '3940', targetNodeId: '880' },
  { sourceNodeId: '3870', targetNodeId: '870' },
];

async function preview(anchorPairs) {
  return createCiiWorkspacePreviewWithVersionBridge({
    sourceBytes, sourceFileName: 'S1.CII',
    targetBytes, targetFileName: 'T.CII',
    anchorPairs,
  }, { cryptoRef, writerVersion: '2' });
}
function nodePairs(result) {
  return (result?.correspondence?.nodeRows || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`).sort();
}
function nodeNameChanges(result) {
  return (result?.engineeringDeltas?.rows || []).filter((row) => row?.category === 'NODE_NAME' && row?.property === 'Node name / to-name' && row?.changed);
}
function summary(label, result) {
  return Object.freeze({
    label,
    authorityStatus: result?.multiBaseAuthority?.status,
    correspondenceStatus: result?.correspondence?.status,
    blockers: result?.correspondence?.blockers || [],
    anchorCount: result?.multiBaseCorrespondence?.propagation?.anchorCount ?? null,
    matchedNodeCount: result?.multiBaseCorrespondence?.propagation?.matchedNodeCount ?? null,
    matchedEdgeCount: result?.multiBaseCorrespondence?.propagation?.matchedEdgeCount ?? null,
    correspondenceNodeRows: result?.correspondence?.nodeRows?.length || 0,
    nodeNameChanges: nodeNameChanges(result).length,
  });
}

const one = await preview(oneAnchor);
assert.equal(one.multiBaseAuthority.inputMode, 'LEGACY_ANCHOR_PAIRS');
assert.equal(one.multiBaseCorrespondence.propagation.anchorCount, 1, 'one reviewed S1 anchor must remain one seed authority');
assert(one.multiBaseCorrespondence.propagation.matchedNodeCount > 1,
  'one reviewed S1 anchor must propagate beyond its single locked node pair when topology/evidence permits');

const three = await preview(threeAnchors);
assert.equal(three.multiBaseAuthority.inputMode, 'LEGACY_ANCHOR_PAIRS');
assert.equal(three.multiBaseCorrespondence.propagation.anchorCount, 3, 'three reviewed pairs must remain three seed/validation authorities');
assert.equal(three.multiBaseCorrespondence.nodeRows.filter((row) => row.status === 'LOCKED').length, 3,
  'all three reviewed S1 pairs must remain explicit locked authority');
assert(three.multiBaseCorrespondence.propagation.matchedNodeCount >= 3,
  'three reviewed S1 anchors must never collapse correspondence cardinality to fewer than the locked seeds');
assert(nodeNameChanges(three).length > threeAnchors.length,
  'retained S1 must demonstrate anchor count is not the NodeName mutation count');

const repeat = await preview(threeAnchors);
assert.equal(repeat.correspondence.correspondenceIdentity, three.correspondence.correspondenceIdentity,
  'identical reviewed anchors must produce deterministic correspondence identity');
assert.deepEqual(nodePairs(repeat), nodePairs(three), 'identical reviewed anchors must produce deterministic SOURCE↔TARGET node pairs');

console.log(JSON.stringify({
  oneAnchor: summary('one-anchor', one),
  threeAnchors: summary('three-anchor', three),
}, null, 2));
console.log('CII retained S1 reviewed-anchor propagation cardinality checks passed.');
