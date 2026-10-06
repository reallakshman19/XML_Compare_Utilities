import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  prepareCiiWorkspaceSourceWithVersionBridge,
  prepareCiiWorkspaceTargetWithVersionBridge,
  inspectCiiWorkspaceModelsWithPreparedPair,
} from '../tabs/cii-workspace/cii-workspace-writer-version-bridge.js';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { suggestCiiLandmarks } from '../tabs/cii-workspace/cii-workspace-landmarks.js';
import { suggestCiiBaseAnchorPairs } from '../tabs/cii-workspace/cii-workspace-anchor-suggestions.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
const sourceBytes = readFileSync(benchmark('S1.CII'));
const targetBytes = readFileSync(benchmark('T.CII'));

function state(graph) {
  const edge = graph?.edges?.[0] || null;
  const adjacencyRow = edge ? graph?.adjacency?.get(String(edge.from)) : null;
  return {
    graphFrozen: Object.isFrozen(graph),
    edgesArrayFrozen: Object.isFrozen(graph?.edges),
    edgeFrozen: edge ? Object.isFrozen(edge) : null,
    adjacencyFrozen: Object.isFrozen(graph?.adjacency),
    adjacencyRowFrozen: adjacencyRow ? Object.isFrozen(adjacencyRow) : null,
    adjacencySharesEdge: Boolean(edge && adjacencyRow?.includes(edge)),
    edgeId: edge?.elementId || null,
  };
}
async function freshPair() {
  const source = await prepareCiiWorkspaceSourceWithVersionBridge(sourceBytes, 'S1.CII', { cryptoRef, writerVersion: '2' });
  const target = await prepareCiiWorkspaceTargetWithVersionBridge(targetBytes, 'T.CII', { cryptoRef, writerVersion: '2' });
  return { source, target };
}

const afterPrepare = await freshPair();
const prepareState = {
  source: state(afterPrepare.source.sourceGraph),
  target: state(afterPrepare.target.targetGraph),
};

const landmarkPair = await freshPair();
suggestCiiLandmarks(landmarkPair.source.sourceGraph);
suggestCiiLandmarks(landmarkPair.target.targetGraph);
const afterLandmarks = {
  source: state(landmarkPair.source.sourceGraph),
  target: state(landmarkPair.target.targetGraph),
};

const suggestionPair = await freshPair();
const suggestions = suggestCiiBaseAnchorPairs(
  suggestionPair.source.sourceGraph,
  suggestionPair.target.targetGraph,
  { methodAPhysicalCandidateLimit: 10, baseAnchorDisplayLimit: 5 },
);
const afterSuggestions = {
  source: state(suggestionPair.source.sourceGraph),
  target: state(suggestionPair.target.targetGraph),
  suggestionCount: suggestions.length,
};

const inspectPair = await freshPair();
const inspection = await inspectCiiWorkspaceModelsWithPreparedPair(
  inspectPair.source,
  inspectPair.target,
  { cryptoRef, writerVersion: '2', methodAPhysicalCandidateLimit: 10, baseAnchorDisplayLimit: 5 },
);
const afterInspect = {
  source: state(inspectPair.source.sourceGraph),
  target: state(inspectPair.target.targetGraph),
  suggestionCount: inspection.baseAnchorSuggestions?.length || 0,
};

const sources = ['S1.CII', 'S2.CII', 'S3.CII'].map((fileName, index) => ({
  sourceId: `S${index + 1}`,
  fileName,
  bytes: readFileSync(benchmark(fileName)),
}));
const sourceSet = await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  { sources, targetBytes, targetFileName: 'T.CII' },
  { cryptoRef, methodAPhysicalCandidateLimit: 10, baseAnchorDisplayLimit: 5 },
);
const afterSourceSet = {
  members: sourceSet.preparedSession.members.map((member) => ({
    sourceId: member.sourceId,
    ...state(member.sourceGraph),
  })),
  target: state(sourceSet.preparedSession.target.targetGraph),
};

const diagnostics = {
  afterPrepare: prepareState,
  afterLandmarks,
  afterSuggestions,
  afterInspect,
  afterSourceSet,
};
console.log('B1_TOPOLOGY_FREEZE_DIAGNOSTICS=' + JSON.stringify(diagnostics, null, 2));

// B1 is diagnostic. Fail only if the test cannot preserve graph-edge identity.
for (const stage of [prepareState, afterLandmarks, afterSuggestions, afterInspect]) {
  if (!stage.source.adjacencySharesEdge || !stage.target.adjacencySharesEdge) {
    throw new Error('B1_GRAPH_EDGE_IDENTITY_BROKEN');
  }
}
for (const member of afterSourceSet.members) {
  if (!member.adjacencySharesEdge) throw new Error(`B1_SOURCE_SET_EDGE_IDENTITY_BROKEN:${member.sourceId}`);
}
if (!afterSourceSet.target.adjacencySharesEdge) throw new Error('B1_SOURCE_SET_TARGET_EDGE_IDENTITY_BROKEN');
