import { coordinateDelta, solveRevisionCoordinateFrame, SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';

/**
 * Apply explicit user decisions to AMBIGUOUS candidate evidence. A review can
 * approve one target for a source or reject an individual candidate. Nothing
 * is auto-promoted merely because it has the highest score.
 */
export function resolveReviewedLineage(lineage, sourceModel, targetModel, decisions = [], options = {}) {
  if (!decisions.length) return lineage;
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const decisionMap = new Map(decisions.map((decision) => [decisionKey(decision.sourceNodeId, decision.targetNodeId), decision]));
  const approvedBySource = new Map(decisions.filter((decision) => decision.action === 'approve').map((decision) => [decision.sourceNodeId, decision.targetNodeId]));
  const reviewedCandidates = Object.freeze(lineage.candidates.map((candidate) => {
    const explicit = decisionMap.get(decisionKey(candidate.sourceNodeId, candidate.targetNodeId));
    const approvedTarget = approvedBySource.get(candidate.sourceNodeId);
    if (explicit?.action === 'approve' && candidate.outcome === 'AMBIGUOUS') return Object.freeze({ ...candidate, outcome: 'DETERMINISTIC', reviewRequired: false, reviewDecision: 'APPROVED' });
    if ((explicit?.action === 'reject' || (approvedTarget && approvedTarget !== candidate.targetNodeId)) && candidate.outcome === 'AMBIGUOUS') return Object.freeze({ ...candidate, outcome: 'NO_MATCH', reviewRequired: false, reviewDecision: 'REJECTED' });
    return candidate;
  }));

  const existingSources = new Set(lineage.edges.flatMap((edge) => edge.sourceNodeIds));
  const existingTargets = new Set(lineage.edges.flatMap((edge) => edge.targetNodeIds));
  const reviewedEdges = [...lineage.edges];
  let index = 0;
  for (const decision of decisions.filter((item) => item.action === 'approve')) {
    if (existingSources.has(decision.sourceNodeId) || existingTargets.has(decision.targetNodeId)) continue;
    const candidate = reviewedCandidates.find((item) => item.sourceNodeId === decision.sourceNodeId && item.targetNodeId === decision.targetNodeId && item.reviewDecision === 'APPROVED');
    if (!candidate) continue;
    existingSources.add(decision.sourceNodeId); existingTargets.add(decision.targetNodeId);
    reviewedEdges.push(Object.freeze({
      edgeId: `lineage:review:${String(++index).padStart(4, '0')}`,
      cardinality: '1->1',
      sourceNodeIds: Object.freeze([decision.sourceNodeId]),
      targetNodeIds: Object.freeze([decision.targetNodeId]),
      outcome: 'DETERMINISTIC',
      matchingMethod: 'manual-review',
      reasonCodes: Object.freeze(['AMBIGUOUS_LINEAGE_REVIEW_APPROVED', ...candidate.reasonCodes]),
      persistentReferences: candidate.persistentReferences,
      candidateIds: Object.freeze([candidate.candidateId]),
      reviewDecision: 'APPROVED',
    }));
  }

  const anchorPairs = reviewedEdges.flatMap((edge) => edge.cardinality === '1->1' && edge.outcome === 'DETERMINISTIC' && edge.persistentReferences?.length
    ? [{ source: sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]), target: targetModel.locationByNodeId.get(edge.targetNodeIds[0]) }]
    : []);
  const coordinateFrame = solveRevisionCoordinateFrame(anchorPairs, policy);
  const edges = Object.freeze(reviewedEdges.map((edge) => Object.freeze({ ...edge, coordinateEvidence: coordinateEvidence(edge, sourceModel, targetModel, coordinateFrame, policy) })));
  const matchedSource = new Set(edges.flatMap((edge) => edge.sourceNodeIds));
  const matchedTarget = new Set(edges.flatMap((edge) => edge.targetNodeIds));
  const removed = Object.freeze(sourceModel.locations.filter((location) => !matchedSource.has(location.nodeId)).map((location) => location.nodeId));
  const added = Object.freeze(targetModel.locations.filter((location) => !matchedTarget.has(location.nodeId)).map((location) => location.nodeId));
  const ambiguous = Object.freeze(reviewedCandidates.filter((candidate) => candidate.outcome === 'AMBIGUOUS'));
  return Object.freeze({
    ...lineage,
    candidates: reviewedCandidates,
    edges,
    removed,
    added,
    ambiguous,
    coordinateFrame,
    reviewDecisions: Object.freeze(decisions.map((decision) => Object.freeze({ ...decision }))),
  });
}

function coordinateEvidence(edge, sourceModel, targetModel, frame, policy) {
  const rows = [];
  for (const sourceNodeId of edge.sourceNodeIds || []) {
    const source = sourceModel.locationByNodeId.get(sourceNodeId);
    for (const targetNodeId of edge.targetNodeIds || []) {
      const target = targetModel.locationByNodeId.get(targetNodeId);
      if (source && target) rows.push(Object.freeze({ sourceNodeId, targetNodeId, ...coordinateDelta(source.position, target.position, frame, policy) }));
    }
  }
  return Object.freeze(rows);
}
function decisionKey(sourceNodeId, targetNodeId) { return `${sourceNodeId || ''}=>${targetNodeId || ''}`; }

export const _test = Object.freeze({ decisionKey, coordinateEvidence });
