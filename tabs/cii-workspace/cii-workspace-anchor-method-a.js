import { compareNodeIds, deepFreeze } from './cii-workspace-contracts.js';
import { qualifyCiiGeometryTransform, registeredCiiPoint } from './cii-workspace-geometry.js';

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function nodeMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node])); }
function sourceOdAtNode(graph, nodeId) {
  const values = [...(graph?.adjacency?.get(String(nodeId)) || [])]
    .map((edge) => positiveNumber(edge.diameter)).filter((value) => value != null);
  return values.length ? Math.min(...values) : null;
}
function pairKey(pair) { return `${pair.sourceNodeId}=>${pair.targetNodeId}`; }
function rankInputPairs(left, right) {
  return Number(right.score || 0) - Number(left.score || 0)
    || Number(right.winnerGap || 0) - Number(left.winnerGap || 0)
    || compareNodeIds(left.sourceNodeId, right.sourceNodeId)
    || compareNodeIds(left.targetNodeId, right.targetNodeId);
}
function resolvedPair(sourceNodes, targetNodes, sourceGraph, pair) {
  const sourceNodeId = String(pair.sourceNodeId); const targetNodeId = String(pair.targetNodeId);
  const source = sourceNodes.get(sourceNodeId)?.position; const target = targetNodes.get(targetNodeId)?.position;
  const sourceOdMm = sourceOdAtNode(sourceGraph, sourceNodeId);
  if (!source || !target || sourceOdMm == null) return null;
  return { ...pair, sourceNodeId, targetNodeId, source, target, sourceOdMm };
}
function geometryPair(pair) {
  return { sourceNodeId: pair.sourceNodeId, targetNodeId: pair.targetNodeId,
    source: pair.source, target: pair.target, sourceOdMm: pair.sourceOdMm };
}
function combinations3(rows) {
  const result = [];
  for (let a = 0; a < rows.length - 2; a += 1) for (let b = a + 1; b < rows.length - 1; b += 1) {
    for (let c = b + 1; c < rows.length; c += 1) result.push([rows[a], rows[b], rows[c]]);
  }
  return result;
}
function distance(left, right) {
  return Math.hypot(Number(left.x) - Number(right.x), Number(left.y) - Number(right.y), Number(left.z) - Number(right.z));
}
function transformCompatible(transform, pair, options) {
  if (transform?.status !== 'READY') return false;
  const registered = registeredCiiPoint(transform, pair.source); if (!registered) return false;
  const factor = positiveNumber(options.odToleranceFactor) ?? 2;
  return distance(registered, pair.target) <= factor * pair.sourceOdMm;
}
function confidenceRank(value) { return ({ HIGH: 3, MEDIUM: 2, REVIEW: 1 }[value] || 0); }
function automaticConfidence(geometry, anchorCount, options) {
  const minimum = Math.max(3, Number(options.methodAAutoConfidenceMinAnchorCount ?? 4));
  return anchorCount >= minimum ? (geometry.confidence || 'REVIEW') : 'REVIEW';
}
function baseId(pairs) { return `METHOD_A_AUTO_${pairs.map(pairKey).sort().join('__')}`; }
function baseCandidateScore(pairs) {
  return pairs.reduce((sum, pair) => sum + Number(pair.score || 0), 0) / Math.max(pairs.length, 1);
}
function baseCandidateGap(pairs) {
  return Math.min(...pairs.map((pair) => Number(pair.winnerGap || 0)));
}
function makeBase(seed, expanded, geometry, options) {
  const ordered = [...expanded].sort((a, b) => compareNodeIds(a.sourceNodeId, b.sourceNodeId)
    || compareNodeIds(a.targetNodeId, b.targetNodeId));
  const confidence = automaticConfidence(geometry, ordered.length, options);
  const minimumForAuto = Math.max(3, Number(options.methodAAutoConfidenceMinAnchorCount ?? 4));
  return {
    baseId: baseId(ordered), status: 'READY', method: 'METHOD_A_SPATIAL', confidence,
    anchorCount: ordered.length, establishmentAnchorCount: 3, validationAnchorCount: Math.max(0, ordered.length - 3),
    automaticConfidenceMinimumAnchorCount: minimumForAuto,
    automaticConfidenceCap: ordered.length < minimumForAuto ? 'REVIEW' : null,
    candidateScoreMean: Number(baseCandidateScore(ordered).toFixed(3)),
    candidateWinnerGapMin: Number(baseCandidateGap(ordered).toFixed(3)),
    seedTriplets: [[...seed].map(pairKey).sort()],
    anchorPairs: ordered.map((pair) => ({ sourceNodeId: pair.sourceNodeId, targetNodeId: pair.targetNodeId,
      sourceOdMm: pair.sourceOdMm, candidateScore: Number(pair.score || 0), winnerGap: Number(pair.winnerGap || 0) })),
    geometry,
  };
}
function mergeEquivalentBase(existing, candidate) {
  existing.seedTriplets.push(...candidate.seedTriplets);
  existing.seedTriplets.sort((a, b) => a.join('|').localeCompare(b.join('|'), undefined, { numeric: true }));
}
function rankBases(left, right) {
  return confidenceRank(right.confidence) - confidenceRank(left.confidence)
    || right.anchorCount - left.anchorCount
    || Number(right.geometry?.weight?.total || 0) - Number(left.geometry?.weight?.total || 0)
    || Number(left.geometry?.maxNormalizedResidual ?? Infinity) - Number(right.geometry?.maxNormalizedResidual ?? Infinity)
    || left.baseId.localeCompare(right.baseId, undefined, { numeric: true });
}
function baseEvidence(base) {
  return deepFreeze({
    baseId: base.baseId, status: base.status, confidence: base.confidence,
    anchorCount: base.anchorCount, establishmentAnchorCount: base.establishmentAnchorCount,
    validationAnchorCount: base.validationAnchorCount, automaticConfidenceMinimumAnchorCount: base.automaticConfidenceMinimumAnchorCount,
    automaticConfidenceCap: base.automaticConfidenceCap, candidateScoreMean: base.candidateScoreMean,
    candidateWinnerGapMin: base.candidateWinnerGapMin, seedTriplets: deepFreeze(base.seedTriplets),
    anchorPairs: deepFreeze(base.anchorPairs), selectedBasisId: base.geometry.selectedBasisId,
    minimumAnchorSinAngle: base.geometry.minimumAnchorSinAngle, maxResidualMm: base.geometry.maxResidualMm,
    rmsResidualMm: base.geometry.rmsResidualMm, maxNormalizedResidual: base.geometry.maxNormalizedResidual,
    rmsNormalizedResidual: base.geometry.rmsNormalizedResidual, rotation: base.geometry.rotation,
    translation: base.geometry.translation, tolerancePolicy: base.geometry.tolerancePolicy, weight: base.geometry.weight,
  });
}

export function discoverCiiMethodABases(sourceGraph, targetGraph, pairCandidates = [], options = {}) {
  const sourceNodes = nodeMap(sourceGraph); const targetNodes = nodeMap(targetGraph);
  const seedLimit = Math.max(3, Number(options.methodASeedPairLimit ?? 10));
  const baseLimit = Math.max(1, Number(options.methodABaseSuggestionLimit ?? 24));
  const eligible = [...pairCandidates].sort(rankInputPairs)
    .map((pair) => resolvedPair(sourceNodes, targetNodes, sourceGraph, pair)).filter(Boolean).slice(0, seedLimit);
  const seeds = combinations3(eligible); const basesById = new Map();
  for (const seed of seeds) {
    const seedGeometry = qualifyCiiGeometryTransform(seed.map(geometryPair), options);
    if (seedGeometry.status !== 'READY') continue;
    const expanded = eligible.filter((pair) => transformCompatible(seedGeometry, pair, options));
    const geometry = qualifyCiiGeometryTransform(expanded.map(geometryPair), options);
    if (geometry.status !== 'READY') continue;
    const candidate = makeBase(seed, expanded, geometry, options); const existing = basesById.get(candidate.baseId);
    if (existing) mergeEquivalentBase(existing, candidate); else basesById.set(candidate.baseId, candidate);
  }
  const bases = [...basesById.values()].sort(rankBases).slice(0, baseLimit).map(baseEvidence);
  return deepFreeze({
    status: bases.length ? 'READY' : 'UNAVAILABLE', method: 'METHOD_A_SPATIAL',
    candidatePairCount: pairCandidates.length, eligiblePairCount: eligible.length, seedPairLimit: seedLimit,
    seedTripletCount: seeds.length, qualifiedBaseCount: bases.length, bases,
    reason: bases.length ? 'AT_LEAST_ONE_AUTOMATIC_LOCAL_METHOD_A_BASE_READY' : 'NO_AUTOMATIC_LOCAL_METHOD_A_BASE_READY',
  });
}

export function projectCiiMethodAEvidence(discovery, sourceNodeId, targetNodeId) {
  const source = String(sourceNodeId); const target = String(targetNodeId);
  const bases = (discovery?.bases || []).filter((base) => base.anchorPairs.some((pair) => pair.sourceNodeId === source && pair.targetNodeId === target));
  if (!bases.length) return deepFreeze({ status: 'UNAVAILABLE', confidence: 'REVIEW', baseCount: 0, baseIds: deepFreeze([]), bestBase: null });
  const bestBase = bases[0];
  return deepFreeze({ status: 'READY', confidence: bestBase.confidence, baseCount: bases.length,
    baseIds: deepFreeze(bases.map((base) => base.baseId)), bestBaseId: bestBase.baseId, bestBase, bases: deepFreeze(bases) });
}
