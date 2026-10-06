import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from '../../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from '../../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { intakeCiiWorkspaceDocument } from '../../tabs/cii-workspace/cii-workspace-intake.js';
import { adaptCiiDocumentToTopologyGraph } from '../../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { qualifyCiiGeometryTransform } from '../../tabs/cii-workspace/cii-workspace-geometry.js';
import { buildCiiSourceTargetAudit } from '../../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import {
  deriveCiiNodeNameBenchmarkDeltaFromCii,
  buildCiiSourceTargetBenchmarkOverlay,
} from '../../tabs/cii-workspace/cii-workspace-benchmark-overlay.js';

const cryptoRef = globalThis.crypto || webcrypto;
const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
const sources = sourceNames.map((fileName, index) => ({
  sourceId: `S${index + 1}`,
  fileName,
  bytes: readFileSync(new URL(`../../Benchmark/${fileName}`, import.meta.url)),
}));
const targetBytes = readFileSync(new URL('../../Benchmark/T.CII', import.meta.url));
const expectedBytes = readFileSync(new URL('../../Benchmark/TEXPECTED-PARTIALLLYDONE.CII', import.meta.url));

const anchors = [
  { sourceNodeId: '3910', targetNodeId: '875' },
  { sourceNodeId: '3940', targetNodeId: '880' },
  { sourceNodeId: '3870', targetNodeId: '870' },
];

function nodeMap(graph) {
  return new Map((graph?.nodes || []).map((node) => [String(node.id), node]));
}
function sourceOdAtNode(graph, nodeId) {
  const values = [...(graph?.adjacency?.get(String(nodeId)) || [])]
    .map((edge) => Number(edge.diameter))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : null;
}
function geometryPairs(sourceGraph, targetGraph, pairs) {
  const sourceNodes = nodeMap(sourceGraph);
  const targetNodes = nodeMap(targetGraph);
  return pairs.map((pair) => ({
    ...pair,
    source: sourceNodes.get(String(pair.sourceNodeId))?.position,
    target: targetNodes.get(String(pair.targetNodeId))?.position,
    sourceOdMm: sourceOdAtNode(sourceGraph, pair.sourceNodeId),
  }));
}
function automaticLoops(inspection) {
  const loops = {};
  for (const member of inspection.memberInspections || []) {
    const choice = ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions || []);
    if (choice.status === 'READY') loops[member.sourceId] = choice.baseLoops;
  }
  delete loops.S1;
  return loops;
}
function s1Metrics(preview, benchmark) {
  const member = preview.memberPreviews.find((item) => item.sourceId === 'S1')?.preview;
  if (!member) throw new Error('S1_PREVIEW_MISSING');
  const audit = buildCiiSourceTargetAudit(preview);
  const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);
  const s1Rows = audit.rows.filter((row) => row.sourceId === 'S1');
  const s1Key = (value) => String(value || '').startsWith('S1:');
  const correspondence = member.multiBaseCorrespondence;
  const unresolved = [
    ...(correspondence?.elementRows || []),
    ...(correspondence?.nodeRows || []),
  ].filter((row) => row?.status === 'UNRESOLVED').map((row) => ({
    kind: row.kind,
    sourceElementId: row.sourceElementId ?? null,
    sourceNodeId: row.sourceNodeId ?? null,
    targetNodeId: row.targetNodeId ?? null,
    targetElementIds: row.targetElementIds || [],
    authority: row.authority ?? null,
    propagation: row.evidence?.propagation || null,
    candidates: row.evidence?.candidates ? {
      status: row.evidence.candidates.status,
      reasons: row.evidence.candidates.reasons,
      winnerTargetElementId: row.evidence.candidates.winnerTargetElementId,
      winnerScore: row.evidence.candidates.winnerScore,
      winnerRankingScore: row.evidence.candidates.winnerRankingScore,
      winnerIdentityConfidence: row.evidence.candidates.winnerIdentityConfidence,
      methodWinners: row.evidence.candidates.methodWinners,
    } : null,
  }));
  return {
    memberStatus: member.correspondence?.status || 'UNKNOWN',
    memberBlockers: member.correspondence?.blockers || [],
    combination: correspondence?.combination || 'UNKNOWN',
    seedCoverage: correspondence?.seedCoverage || null,
    seedDiagnostics: correspondence?.seedDiagnostics || [],
    conflicts: correspondence?.conflicts || [],
    emittedNodeRows: (member.correspondence?.nodeRows || []).length,
    boundNodeCount: s1Rows.filter((row) => row.state === 'BOUND').length,
    unresolvedNodeCount: s1Rows.filter((row) => row.state === 'UNRESOLVED').length,
    unemittedNodeCount: s1Rows.filter((row) => row.state === 'UNEMITTED').length,
    qualifiedNodeNameChangeCount: s1Rows.filter((row) => row.qualifiedNodeNameChange).length,
    knownPositiveCorrespondenceRecoveredByS1: overlay.rows.filter((row) => (row.sourceRowKeys || []).some(s1Key)).length,
    knownPositiveMutationRecoveredByS1: overlay.rows.filter((row) => (row.mutationSourceRowKeys || []).some(s1Key)).length,
    additionalQualifiedByS1: overlay.additionalQualifiedRows.filter((row) => row.sourceId === 'S1').length,
    unresolved,
  };
}

const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge(
  { sources, targetBytes, targetFileName: 'T.CII' },
  { cryptoRef },
);
const baseLoopsBySource = automaticLoops(inspection);
const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
  beforeFileName: 'T.CII',
  expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII',
  cryptoRef,
});

const sourceDocument = await intakeCiiWorkspaceDocument(sources[0].bytes, 'S1.CII', { side: 'SOURCE', cryptoRef });
const targetDocument = await intakeCiiWorkspaceDocument(targetBytes, 'T.CII', { side: 'TARGET', cryptoRef });
const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDocument);
const targetGraph = adaptCiiDocumentToTopologyGraph(targetDocument);
const resolvedGeometryPairs = geometryPairs(sourceGraph, targetGraph, anchors);
const sharedGeometry = qualifyCiiGeometryTransform(resolvedGeometryPairs);

const input = {
  sources,
  targetBytes,
  targetFileName: 'T.CII',
  baseLoopsBySource,
  anchorPairsBySource: { S1: anchors },
};

const baselinePreview = await createCiiWriter2SourceSetPreviewWithVersionBridge(input, { cryptoRef });
const sharedGeometryPreview = await createCiiWriter2SourceSetPreviewWithVersionBridge(input, {
  cryptoRef,
  geometryTransform: sharedGeometry,
});

const result = {
  benchmarkExpectedCount: benchmark.summary.expectedCount,
  anchors,
  sharedGeometry: {
    status: sharedGeometry.status,
    mode: sharedGeometry.mode,
    reason: sharedGeometry.reason || null,
    confidence: sharedGeometry.confidence || null,
    selectedBasisId: sharedGeometry.selectedBasisId || null,
    maxResidualMm: sharedGeometry.maxResidualMm ?? null,
    rmsResidualMm: sharedGeometry.rmsResidualMm ?? null,
    maxNormalizedResidual: sharedGeometry.maxNormalizedResidual ?? null,
    minimumAnchorSinAngle: sharedGeometry.minimumAnchorSinAngle ?? null,
    weight: sharedGeometry.weight || null,
  },
  baseline: s1Metrics(baselinePreview, benchmark),
  withSharedGeometry: s1Metrics(sharedGeometryPreview, benchmark),
};

console.log('SHARED_GEOMETRY_FALSIFIER=' + JSON.stringify(result, null, 2));
