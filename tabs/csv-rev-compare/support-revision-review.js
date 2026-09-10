import {
  coordinateDelta,
  solveRevisionCoordinateFrame,
  SUPPORT_REV_COMPARE_POLICY_V1,
} from './support-revision-normalization.js';

export const SUPPORT_REVISION_REVIEW_SCHEMA = 'support-revision-lineage-review/v1';
const clean = (value) => String(value ?? '').trim();

/** Apply explicit approve/reject decisions to AMBIGUOUS 1->1 candidates. */
export function resolveReviewedLineage(lineage, sourceModel, targetModel, decisions = [], options = {}) {
  const normalized = normalizeReviewDecisions(decisions);
  if (!normalized.length) return Object.freeze({ ...lineage, reviewDecisions: Object.freeze([]), reviewDiagnostics: Object.freeze([]) });
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const diagnostics = validateReviewDecisions(lineage, normalized);
  const usable = normalized.filter((decision) => !diagnostics.some((item) => item.decisionId === decision.decisionId && item.severity === 'blocker'));
  const candidates = reviewCandidates(lineage.candidates, usable);
  const edges = addApprovedEdges(lineage.edges, candidates, usable);
  const coordinateFrame = solveRevisionCoordinateFrame(anchorPairs(edges, sourceModel, targetModel), policy);
  const enrichedEdges = Object.freeze(edges.map((edge) => enrichCoordinates(edge, sourceModel, targetModel, coordinateFrame, policy)));
  const matchedSource = new Set(enrichedEdges.flatMap((edge) => edge.sourceNodeIds));
  const matchedTarget = new Set(enrichedEdges.flatMap((edge) => edge.targetNodeIds));
  return Object.freeze({
    ...lineage,
    candidates,
    edges: enrichedEdges,
    removed: Object.freeze(sourceModel.locations.filter((item) => !matchedSource.has(item.nodeId)).map((item) => item.nodeId)),
    added: Object.freeze(targetModel.locations.filter((item) => !matchedTarget.has(item.nodeId)).map((item) => item.nodeId)),
    ambiguous: Object.freeze(candidates.filter((item) => item.outcome === 'AMBIGUOUS')),
    coordinateFrame,
    reviewDecisions: Object.freeze(normalized),
    reviewDiagnostics: Object.freeze(diagnostics),
  });
}

export function unresolvedLineageReviews(lineage) {
  const candidateSources = new Set((lineage?.candidates || []).filter((item) => item.outcome === 'AMBIGUOUS').map((item) => item.sourceNodeId));
  const structuralEdges = (lineage?.edges || []).filter((edge) => edge.outcome === 'AMBIGUOUS').map((edge) => edge.edgeId);
  return Object.freeze({
    candidateSourceNodeIds: Object.freeze([...candidateSources]),
    structuralEdgeIds: Object.freeze(structuralEdges),
    count: candidateSources.size + structuralEdges.length,
  });
}

function normalizeReviewDecisions(decisions) {
  return Object.freeze((decisions || []).map((decision, index) => Object.freeze({
    decisionId: clean(decision?.decisionId) || `review:${String(index + 1).padStart(4, '0')}`,
    sourceNodeId: clean(decision?.sourceNodeId),
    targetNodeId: clean(decision?.targetNodeId),
    action: clean(decision?.action).toLowerCase(),
    reason: clean(decision?.reason),
  })));
}

function validateReviewDecisions(lineage, decisions) {
  const ambiguous = new Set((lineage?.candidates || []).filter((item) => item.outcome === 'AMBIGUOUS').map((item) => decisionKey(item.sourceNodeId, item.targetNodeId)));
  const approvedSources = new Set();
  const diagnostics = [];
  for (const decision of decisions) {
    if (!['approve', 'reject'].includes(decision.action)) diagnostics.push(blocker(decision, 'review_action_invalid'));
    else if (!ambiguous.has(decisionKey(decision.sourceNodeId, decision.targetNodeId))) diagnostics.push(blocker(decision, 'review_candidate_not_ambiguous'));
    else if (decision.action === 'approve' && approvedSources.has(decision.sourceNodeId)) diagnostics.push(blocker(decision, 'multiple_targets_approved_for_source'));
    else if (decision.action === 'approve') approvedSources.add(decision.sourceNodeId);
  }
  return diagnostics;
}

function reviewCandidates(candidates, decisions) {
  const byPair = new Map(decisions.map((item) => [decisionKey(item.sourceNodeId, item.targetNodeId), item]));
  const approvedBySource = new Map(decisions.filter((item) => item.action === 'approve').map((item) => [item.sourceNodeId, item.targetNodeId]));
  return Object.freeze(candidates.map((candidate) => {
    if (candidate.outcome !== 'AMBIGUOUS') return candidate;
    const direct = byPair.get(decisionKey(candidate.sourceNodeId, candidate.targetNodeId));
    const approvedTarget = approvedBySource.get(candidate.sourceNodeId);
    if (direct?.action === 'approve') return Object.freeze({ ...candidate, outcome: 'DETERMINISTIC', reviewRequired: false, reviewDecision: 'APPROVED' });
    if (direct?.action === 'reject' || (approvedTarget && approvedTarget !== candidate.targetNodeId)) return Object.freeze({ ...candidate, outcome: 'NO_MATCH', reviewRequired: false, reviewDecision: 'REJECTED' });
    return candidate;
  }));
}

function addApprovedEdges(existingEdges, candidates, decisions) {
  const edges = [...existingEdges];
  const usedSource = new Set(edges.flatMap((edge) => edge.sourceNodeIds));
  const usedTarget = new Set(edges.flatMap((edge) => edge.targetNodeIds));
  let index = 0;
  for (const decision of decisions.filter((item) => item.action === 'approve')) {
    if (usedSource.has(decision.sourceNodeId) || usedTarget.has(decision.targetNodeId)) continue;
    const candidate = candidates.find((item) => item.sourceNodeId === decision.sourceNodeId && item.targetNodeId === decision.targetNodeId && item.reviewDecision === 'APPROVED');
    if (!candidate) continue;
    usedSource.add(decision.sourceNodeId);
    usedTarget.add(decision.targetNodeId);
    edges.push(Object.freeze({
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
  return edges;
}

function anchorPairs(edges, sourceModel, targetModel) {
  return edges.flatMap((edge) => edge.cardinality === '1->1' && edge.outcome === 'DETERMINISTIC' && edge.persistentReferences?.length
    ? [{ source: sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]), target: targetModel.locationByNodeId.get(edge.targetNodeIds[0]) }]
    : []);
}

function enrichCoordinates(edge, sourceModel, targetModel, frame, policy) {
  const evidence = [];
  for (const sourceNodeId of edge.sourceNodeIds || []) for (const targetNodeId of edge.targetNodeIds || []) {
    const source = sourceModel.locationByNodeId.get(sourceNodeId);
    const target = targetModel.locationByNodeId.get(targetNodeId);
    if (source && target) evidence.push(Object.freeze({ sourceNodeId, targetNodeId, ...coordinateDelta(source.position, target.position, frame, policy) }));
  }
  return Object.freeze({ ...edge, coordinateEvidence: Object.freeze(evidence) });
}

function blocker(decision, code) {
  return Object.freeze({ severity: 'blocker', code, decisionId: decision.decisionId, sourceNodeId: decision.sourceNodeId, targetNodeId: decision.targetNodeId });
}
function decisionKey(sourceNodeId, targetNodeId) { return `${clean(sourceNodeId)}=>${clean(targetNodeId)}`; }

export const _test = Object.freeze({ decisionKey, normalizeReviewDecisions, validateReviewDecisions, reviewCandidates });
