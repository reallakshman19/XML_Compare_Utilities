import { CII_WORKSPACE_SCHEMAS, compareNodeIds, deepFreeze, uniqueStrings } from './cii-workspace-contracts.js';
import { suggestCiiLandmarks } from './cii-workspace-landmarks.js';

const ROBUST_REASONS = new Set(['BRANCH', 'RIGID_ADJACENT', 'TERMINAL', 'BEND_ADJACENT', 'NAMED_NODE']);

function nodeMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node])); }
function otherNode(edge, nodeId) { return edge.from === nodeId ? edge.to : edge.from; }
function jaccard(left, right) {
  const a = new Set(left || []); const b = new Set(right || []);
  const union = new Set([...a, ...b]); if (!union.size) return 1;
  return [...union].filter((item) => a.has(item) && b.has(item)).length / union.size;
}
function multisetSimilarity(left, right) {
  const a = [...(left || [])]; const b = [...(right || [])];
  if (!a.length && !b.length) return 1;
  const counts = new Map(); for (const item of a) counts.set(item, (counts.get(item) || 0) + 1);
  let common = 0; for (const item of b) { const count = counts.get(item) || 0; if (count) { common += 1; counts.set(item, count - 1); } }
  return common / Math.max(a.length, b.length, 1);
}
function layerSimilarity(left, right) {
  const weights = [0.5, 0.3, 0.2]; let score = 0; let total = 0;
  for (let index = 0; index < weights.length; index += 1) {
    const a = left?.[index] || []; const b = right?.[index] || [];
    if (!a.length && !b.length) continue;
    score += jaccard(a, b) * weights[index]; total += weights[index];
  }
  return total ? score / total : 1;
}
function structuralEvidence(graph, landmark) {
  const nodes = nodeMap(graph); const node = nodes.get(String(landmark.nodeId));
  const incident = [...(graph?.adjacency?.get(String(landmark.nodeId)) || [])];
  const neighbourDegrees = incident.map((edge) => Number(nodes.get(String(otherNode(edge, String(landmark.nodeId))))?.degree || 0)).sort((a, b) => a - b);
  return {
    nodeId: String(landmark.nodeId),
    degree: Number(node?.degree || 0),
    componentKinds: uniqueStrings(incident.map((edge) => edge.componentKind)),
    neighbourDegrees,
    layers: node?.neighbourhoodLayers || [],
    robustReasons: landmark.reasons.filter((reason) => ROBUST_REASONS.has(reason)),
    sizeTransition: landmark.reasons.includes('SIZE_TRANSITION'),
  };
}
function pairEvidence(source, target) {
  if (source.degree !== target.degree) return { score: 0, basis: ['degree mismatch'], blocked: true };
  const kinds = jaccard(source.componentKinds, target.componentKinds);
  const neighbours = multisetSimilarity(source.neighbourDegrees, target.neighbourDegrees);
  const layers = layerSimilarity(source.layers, target.layers);
  const reasons = jaccard(source.robustReasons, target.robustReasons);
  const score = 30 + (20 * kinds) + (20 * neighbours) + (25 * layers) + (5 * reasons);
  const basis = [
    `degree ${source.degree}=${target.degree}`,
    `incident kinds ${Math.round(kinds * 100)}%`,
    `neighbour degrees ${Math.round(neighbours * 100)}%`,
    `topology neighbourhood ${Math.round(layers * 100)}%`,
  ];
  const sharedReasons = source.robustReasons.filter((reason) => target.robustReasons.includes(reason));
  if (sharedReasons.length) basis.push(`shared ${sharedReasons.join('+')}`);
  if (source.sizeTransition !== target.sizeTransition) basis.push('size-transition difference ignored for identity');
  return { score, basis, blocked: false };
}
function rankedForSource(source, targets) {
  return targets.map((target) => ({ target, ...pairEvidence(source, target) }))
    .filter((row) => !row.blocked)
    .sort((a, b) => b.score - a.score || compareNodeIds(a.target.nodeId, b.target.nodeId));
}
function confidence(score, gap, requiredGap) {
  if (score >= 90 && gap >= Math.max(requiredGap, 12)) return 'HIGH';
  if (score >= 78 && gap >= requiredGap) return 'MEDIUM';
  return 'REVIEW';
}

export function suggestCiiBaseAnchorPairs(sourceGraph, targetGraph, options = {}) {
  const limit = Math.max(1, Number(options.baseAnchorSuggestionLimit || 8));
  const landmarkLimit = Math.max(limit * 2, Number(options.landmarkPairingPool || 16));
  const requiredGap = Math.max(0, Number(options.baseAnchorWinnerGap ?? 8));
  const minimumScore = Math.max(0, Number(options.baseAnchorMinimumScore ?? 65));
  const source = suggestCiiLandmarks(sourceGraph, { ...options, limit: landmarkLimit }).map((item) => structuralEvidence(sourceGraph, item));
  const target = suggestCiiLandmarks(targetGraph, { ...options, limit: landmarkLimit }).map((item) => structuralEvidence(targetGraph, item));
  const sourceRankings = new Map(source.map((item) => [item.nodeId, rankedForSource(item, target)]));
  const targetRankings = new Map(target.map((item) => [item.nodeId, rankedForSource(item, source)]));
  const suggestions = [];
  for (const item of source) {
    const ranked = sourceRankings.get(item.nodeId) || []; const winner = ranked[0]; if (!winner || winner.score < minimumScore) continue;
    const reverse = targetRankings.get(winner.target.nodeId) || [];
    if (reverse[0]?.target?.nodeId !== item.nodeId) continue;
    const sourceGap = winner.score - Number(ranked[1]?.score ?? 0);
    const targetGap = winner.score - Number(reverse[1]?.score ?? 0);
    const winnerGap = Math.min(sourceGap, targetGap);
    suggestions.push(deepFreeze({
      schema: CII_WORKSPACE_SCHEMAS.baseAnchorSuggestion,
      sourceNodeId: item.nodeId,
      targetNodeId: winner.target.nodeId,
      status: 'SUGGESTED',
      authority: 'EVIDENCE_ONLY_ENGINEER_ACCEPT_REQUIRED',
      reviewRequired: true,
      confidence: confidence(winner.score, winnerGap, requiredGap),
      score: Number(winner.score.toFixed(3)),
      winnerGap: Number(winnerGap.toFixed(3)),
      requiredWinnerGap: requiredGap,
      basis: Object.freeze(winner.basis),
      identityExclusions: Object.freeze(['NODE_NUMBER_OFFSET_NOT_USED', 'OD_NOT_USED', 'WALL_NOT_USED']),
    }));
  }
  const order = { HIGH: 0, MEDIUM: 1, REVIEW: 2 };
  suggestions.sort((a, b) => (order[a.confidence] - order[b.confidence]) || b.score - a.score || b.winnerGap - a.winnerGap || compareNodeIds(a.sourceNodeId, b.sourceNodeId));
  return deepFreeze(suggestions.slice(0, limit));
}
