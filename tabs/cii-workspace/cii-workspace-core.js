import { CII_WORKSPACE_SCHEMAS, deepFreeze } from './cii-workspace-contracts.js';
import { intakeCiiWorkspaceDocument } from './cii-workspace-intake.js';
import { adaptCiiDocumentToTopologyGraph } from './cii-workspace-topology-adapter.js';
import { qualifyCiiGeometryTransform } from './cii-workspace-geometry.js';
import { suggestCiiLandmarks } from './cii-workspace-landmarks.js';
import { suggestCiiBaseAnchorPairs } from './cii-workspace-anchor-suggestions.js';
import { buildCiiAutomaticPathAudit, compareLockedCiiAnchorSpan } from './cii-workspace-topology.js';
import { propagateSingleCiiAnchorCorrespondence } from './cii-workspace-propagation.js';
import { buildCiiPathCandidateAudit } from './cii-workspace-path-candidates.js';
import { applyCiiNodeCustodyGates } from './cii-workspace-node-custody.js';
import { attachCiiComponentCorrespondence } from './cii-workspace-components.js';
import { bindCiiCorrespondenceIdentity } from './cii-workspace-identity.js';
import { buildCiiEngineeringDeltas } from './cii-workspace-engineering-delta.js';
import { augmentCiiEngineeringDeltasWithWriter1BFields } from './cii-workspace-writer1b-deltas.js';
import { augmentCiiEngineeringDeltasWithRestraintPairing } from './cii-workspace-restraint-transfer.js';
import { augmentCiiEngineeringDeltasWithRestraintSlots } from './cii-workspace-restraint-slot-transfer.js';
import { buildCiiCompareReviewModel } from './cii-workspace-compare-review.js';
import { createCiiTransferPreview } from './cii-workspace-transfer-plan.js';
import { normalizeCiiWorkspaceReview } from './cii-workspace-review.js';
import { createCiiWorkspaceStageModel } from './cii-workspace-placeholders.js';
import { applyCiiTargetWriter1A, ciiWriter1AReadiness } from './cii-workspace-target-writer.js';
import { applyCiiTargetWriter1B, ciiWriter1BReadiness } from './cii-workspace-target-writer-1b.js';
import { validateCiiWriterRoundTrip } from './cii-workspace-writer-validation.js';
import { ciiWorkspaceArtifactBundle } from './cii-workspace-export.js';

function nodeIndex(graph) { return new Map((graph.nodes || []).map((node) => [String(node.id), node])); }
function normalizeAnchorPairs(pairs) {
  return deepFreeze((pairs || []).map((pair) => ({
    schema: CII_WORKSPACE_SCHEMAS.anchor,
    sourceNodeId: String(pair.sourceNodeId), targetNodeId: String(pair.targetNodeId),
    status: 'LOCKED', authority: 'USER_LOCKED', locked: true,
  })));
}
async function intakePair(input, options) {
  const sourceDocument = await intakeCiiWorkspaceDocument(input?.sourceText, input?.sourceFileName, { side: 'SOURCE', cryptoRef: options.cryptoRef });
  const targetDocument = await intakeCiiWorkspaceDocument(input?.targetText, input?.targetFileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  return { sourceDocument, targetDocument,
    sourceGraph: adaptCiiDocumentToTopologyGraph(sourceDocument), targetGraph: adaptCiiDocumentToTopologyGraph(targetDocument) };
}
function sourceOdAtNode(graph, nodeId) {
  const values = [...(graph?.adjacency?.get(String(nodeId)) || [])].map((edge) => Number(edge.diameter)).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : null;
}
function geometryPairs(sourceGraph, targetGraph, anchors) {
  const source = nodeIndex(sourceGraph); const target = nodeIndex(targetGraph);
  return anchors.flatMap((pair) => {
    const left = source.get(pair.sourceNodeId)?.position; const right = target.get(pair.targetNodeId)?.position;
    return left && right ? [{ source: left, target: right, sourceOdMm: sourceOdAtNode(sourceGraph, pair.sourceNodeId),
      sourceNodeId: pair.sourceNodeId, targetNodeId: pair.targetNodeId }] : [];
  });
}
function writerVersion(options) { return options.writerVersion === '1A' ? '1A' : '1B'; }
function writerLabel(version) { return `WRITER_${version}`; }
function writer1APlanContract(plan) {
  if (plan?.mutationAuthority === 'BLOCKED') return plan;
  return deepFreeze({ ...plan, mutationAuthority: 'WRITER_1A_CONDITIONAL', policy: deepFreeze({
    geometryProtected: true, nodeNumberProtected: true, topologyProtected: true, odProtected: true, wallProtected: false,
    processDefault: 'WRITER_1A_P1_T1_T2_WHEN_FIXED_FIELD_QUALIFIED', restraintCardinality: 'EQUAL_CARDINALITY_EXISTING_SLOTS_ONLY',
    sifTeeMutation: 'BLOCKED_SEMANTICS_UNQUALIFIED',
  }) });
}
function buildAudit(sourceDocument, targetDocument, anchors, geometry, pathAudit, correspondence, review, engineeringDeltas, compareReview, transferPlan, landmarks, writerReadiness, version) {
  const label = writerLabel(version);
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.audit, direction: 'SOURCE_TO_TARGET', writerVersion: version,
    source: Object.freeze({ fileName: sourceDocument.fileName, contentSha256: sourceDocument.contentSha256, summary: sourceDocument.summary }),
    target: Object.freeze({ fileName: targetDocument.fileName, contentSha256: targetDocument.contentSha256, summary: targetDocument.summary }),
    lockedAnchors: anchors, landmarkSuggestions: landmarks, geometry, automaticPathAudit: pathAudit,
    correspondence, review, engineeringDeltas, compareReview, transferPreview: transferPlan, writerReadiness,
    mutationAuthority: Object.freeze({ stage06: writerReadiness.ready ? `${label}_READY` : `${label}_BLOCKED`,
      modifiedTargetCiiExport: writerReadiness.ready ? `${label}_CONDITIONAL` : 'BLOCKED' }),
  });
}
function inspectionSummary(document, graph) {
  const componentCounts = {};
  for (const edge of graph?.edges || []) componentCounts[edge.componentKind] = (componentCounts[edge.componentKind] || 0) + 1;
  return deepFreeze({ ...document.summary,
    terminalCount: (graph?.nodes || []).filter((node) => Number(node.degree) === 1).length,
    branchCount: (graph?.nodes || []).filter((node) => Number(node.degree) >= 3).length, componentCounts });
}
function inspectionSide(document, graph, options) {
  return Object.freeze({ fileName: document.fileName, contentSha256: document.contentSha256,
    summary: inspectionSummary(document, graph), landmarks: suggestCiiLandmarks(graph, options) });
}
function buildBaseCorrespondence(sourceGraph, targetGraph, anchors, options) {
  return anchors.length === 1
    ? propagateSingleCiiAnchorCorrespondence(sourceGraph, targetGraph, anchors[0], options)
    : compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchors, options);
}

export async function inspectCiiWorkspaceModels(input, options = {}) {
  const pair = await intakePair(input, options);
  return deepFreeze({ schema: CII_WORKSPACE_SCHEMAS.inspection,
    source: inspectionSide(pair.sourceDocument, pair.sourceGraph, options), target: inspectionSide(pair.targetDocument, pair.targetGraph, options),
    baseAnchorSuggestions: suggestCiiBaseAnchorPairs(pair.sourceGraph, pair.targetGraph, options) });
}

export async function createCiiWorkspacePreview(input, options = {}) {
  const { sourceDocument, targetDocument, sourceGraph, targetGraph } = await intakePair(input, options);
  const version = writerVersion(options); const anchors = normalizeAnchorPairs(input?.anchorPairs);
  const landmarks = deepFreeze({ source: suggestCiiLandmarks(sourceGraph, options), target: suggestCiiLandmarks(targetGraph, options) });
  const geometry = qualifyCiiGeometryTransform(geometryPairs(sourceGraph, targetGraph, anchors), options);
  const pathAudit = deepFreeze({ structural: buildCiiAutomaticPathAudit(sourceGraph, targetGraph, options),
    candidates: buildCiiPathCandidateAudit(sourceGraph, targetGraph, options) });
  const baseCorrespondence = buildBaseCorrespondence(sourceGraph, targetGraph, anchors, { ...options, geometryTransform: geometry });
  const nodeGatedCorrespondence = applyCiiNodeCustodyGates(baseCorrespondence, sourceGraph);
  const componentCorrespondence = attachCiiComponentCorrespondence(nodeGatedCorrespondence, sourceGraph, targetGraph);
  const correspondence = bindCiiCorrespondenceIdentity(componentCorrespondence, sourceDocument, targetDocument, anchors);
  const review = normalizeCiiWorkspaceReview(input?.review, sourceDocument, targetDocument, anchors, correspondence);
  const baseDeltas = buildCiiEngineeringDeltas(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, { ...options, geometryTransform: geometry });
  const fieldDeltas = version === '1B' ? augmentCiiEngineeringDeltasWithWriter1BFields(baseDeltas, sourceGraph, targetGraph, correspondence, options) : baseDeltas;
  const pairedDeltas = augmentCiiEngineeringDeltasWithRestraintPairing(fieldDeltas, sourceDocument, targetDocument, correspondence, options);
  const engineeringDeltas = version === '1B'
    ? augmentCiiEngineeringDeltasWithRestraintSlots(pairedDeltas, sourceDocument, targetDocument, correspondence, input?.sourceText, input?.targetText, options)
    : pairedDeltas;
  const compareReview = buildCiiCompareReviewModel(sourceDocument, targetDocument, correspondence, review, engineeringDeltas);
  const rawTransferPlan = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review, engineeringDeltas, options);
  const transferPlan = version === '1A' ? writer1APlanContract(rawTransferPlan) : rawTransferPlan;
  const writerReadiness = version === '1A' ? ciiWriter1AReadiness(transferPlan) : ciiWriter1BReadiness(transferPlan);
  const audit = buildAudit(sourceDocument, targetDocument, anchors, geometry, pathAudit, correspondence, review, engineeringDeltas,
    compareReview, transferPlan, landmarks, writerReadiness, version);
  const result = { writerVersion: version, stages: createCiiWorkspaceStageModel(writerReadiness), sourceDocument, targetDocument, landmarks,
    correspondence, review, engineeringDeltas, compareReview, transferPlan, writerReadiness, audit };
  result.artifacts = ciiWorkspaceArtifactBundle(result);
  return deepFreeze(result);
}

async function currentTargetFor(preview, targetText, options, label) {
  if (!preview?.targetDocument || !preview?.transferPlan || !preview?.correspondence) throw new Error(`CII_${label}_PREVIEW_REQUIRED`);
  const currentTarget = await intakeCiiWorkspaceDocument(targetText, preview.targetDocument.fileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  if (currentTarget.contentSha256 !== preview.targetDocument.contentSha256) throw new Error(`CII_${label}_STALE_TARGET_HASH`);
  return currentTarget;
}
async function applyWriter(preview, targetText, options, version) {
  const label = writerLabel(version); const currentTarget = await currentTargetFor(preview, targetText, options, label);
  const targetGraph = adaptCiiDocumentToTopologyGraph(currentTarget);
  const writerResult = version === '1A'
    ? applyCiiTargetWriter1A({ targetText, targetGraph, correspondence: preview.correspondence, transferPlan: preview.transferPlan })
    : applyCiiTargetWriter1B({ targetText, targetGraph, correspondence: preview.correspondence, transferPlan: preview.transferPlan });
  const modifiedTarget = await intakeCiiWorkspaceDocument(writerResult.text, preview.targetDocument.fileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  const validation = validateCiiWriterRoundTrip(currentTarget, modifiedTarget, targetGraph, writerResult, preview.transferPlan, label);
  return deepFreeze({ schema: 'CIIWorkspaceTargetApplyResult.v1', status: 'PASS', writer: label,
    fileName: `Modified_${preview.targetDocument.fileName}`, text: writerResult.text,
    sourceTargetSha256: currentTarget.contentSha256, modifiedTargetSha256: modifiedTarget.contentSha256,
    mutationCount: writerResult.mutationCount, mutations: writerResult.mutations, validation });
}

export async function applyCiiWorkspaceTargetWriter1A(preview, targetText, options = {}) {
  return applyWriter(preview, targetText, options, '1A');
}
export async function applyCiiWorkspaceTargetWriter1B(preview, targetText, options = {}) {
  return applyWriter(preview, targetText, options, '1B');
}
