import { CII_WORKSPACE_SCHEMAS, deepFreeze } from './cii-workspace-contracts.js';
import { intakeCiiWorkspaceDocument } from './cii-workspace-intake.js';
import { adaptCiiDocumentToTopologyGraph } from './cii-workspace-topology-adapter.js';
import { qualifyCiiGeometryTransform } from './cii-workspace-geometry.js';
import { suggestCiiLandmarks } from './cii-workspace-landmarks.js';
import { buildCiiAutomaticPathAudit, compareLockedCiiAnchorSpan } from './cii-workspace-topology.js';
import { buildCiiPathCandidateAudit } from './cii-workspace-path-candidates.js';
import { attachCiiComponentCorrespondence } from './cii-workspace-components.js';
import { createCiiTransferPreview } from './cii-workspace-transfer-plan.js';
import { normalizeCiiWorkspaceReview } from './cii-workspace-review.js';
import { createCiiWorkspaceStageModel } from './cii-workspace-placeholders.js';
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
  return {
    sourceDocument, targetDocument,
    sourceGraph: adaptCiiDocumentToTopologyGraph(sourceDocument), targetGraph: adaptCiiDocumentToTopologyGraph(targetDocument),
  };
}
function geometryPairs(sourceGraph, targetGraph, anchors) {
  const source = nodeIndex(sourceGraph); const target = nodeIndex(targetGraph);
  return anchors.flatMap((pair) => {
    const left = source.get(pair.sourceNodeId)?.position; const right = target.get(pair.targetNodeId)?.position;
    return left && right ? [{ source: left, target: right, sourceNodeId: pair.sourceNodeId, targetNodeId: pair.targetNodeId }] : [];
  });
}
function buildAudit(sourceDocument, targetDocument, anchors, geometry, pathAudit, correspondence, review, transferPlan, landmarks) {
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.audit, direction: 'SOURCE_TO_TARGET',
    source: Object.freeze({ fileName: sourceDocument.fileName, contentSha256: sourceDocument.contentSha256, summary: sourceDocument.summary }),
    target: Object.freeze({ fileName: targetDocument.fileName, contentSha256: targetDocument.contentSha256, summary: targetDocument.summary }),
    lockedAnchors: anchors, landmarkSuggestions: landmarks, geometry, automaticPathAudit: pathAudit,
    correspondence, review, transferPreview: transferPlan,
    mutationAuthority: Object.freeze({ stage06: 'NOT_IMPLEMENTED', modifiedTargetCiiExport: 'BLOCKED' }),
  });
}
function inspectionSide(document, graph, options) {
  return Object.freeze({
    fileName: document.fileName, contentSha256: document.contentSha256, summary: document.summary,
    landmarks: suggestCiiLandmarks(graph, options),
  });
}

export async function inspectCiiWorkspaceModels(input, options = {}) {
  const pair = await intakePair(input, options);
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.inspection,
    source: inspectionSide(pair.sourceDocument, pair.sourceGraph, options), target: inspectionSide(pair.targetDocument, pair.targetGraph, options),
  });
}

export async function createCiiWorkspacePreview(input, options = {}) {
  const { sourceDocument, targetDocument, sourceGraph, targetGraph } = await intakePair(input, options);
  const anchors = normalizeAnchorPairs(input?.anchorPairs);
  const landmarks = deepFreeze({ source: suggestCiiLandmarks(sourceGraph, options), target: suggestCiiLandmarks(targetGraph, options) });
  const geometry = qualifyCiiGeometryTransform(geometryPairs(sourceGraph, targetGraph, anchors), options);
  const pathAudit = deepFreeze({
    structural: buildCiiAutomaticPathAudit(sourceGraph, targetGraph, options),
    candidates: buildCiiPathCandidateAudit(sourceGraph, targetGraph, options),
  });
  const baseCorrespondence = compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchors, { ...options, geometryTransform: geometry });
  const correspondence = attachCiiComponentCorrespondence(baseCorrespondence, sourceGraph, targetGraph);
  const review = normalizeCiiWorkspaceReview(input?.review, sourceDocument, targetDocument, anchors, correspondence);
  const transferPlan = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review, options);
  const audit = buildAudit(sourceDocument, targetDocument, anchors, geometry, pathAudit, correspondence, review, transferPlan, landmarks);
  const result = { stages: createCiiWorkspaceStageModel(), sourceDocument, targetDocument, landmarks, correspondence, review, transferPlan, audit };
  result.artifacts = ciiWorkspaceArtifactBundle(result);
  return deepFreeze(result);
}
