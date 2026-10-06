import { CII_WORKSPACE_SCHEMAS, compareNodeIds, deepFreeze } from './cii-workspace-contracts.js';
import { discoverCiiMethodABases, projectCiiMethodAEvidence } from './cii-workspace-anchor-method-a.js';

const DEFAULT_PHYSICAL_SEARCH_LIMIT = 10;
const MAX_PHYSICAL_SEARCH_LIMIT = 24;

function componentLengthToken(edge) {
  const length = Number(edge?.lengthMm);
  if (!Number.isFinite(length)) return null;
  return `${String(edge?.componentKind || 'UNKNOWN')}@${length.toFixed(3)}`;
}
function incidentFingerprint(graph, nodeId) {
  const tokens = [...(graph?.adjacency?.get(String(nodeId)) || [])].map(componentLengthToken).filter(Boolean).sort();
  return tokens.length ? tokens.join('|') : null;
}
function uniqueByFingerprint(graph) {
  const groups = new Map();
  for (const node of graph?.nodes || []) {
    const fingerprint = incidentFingerprint(graph, node?.id); if (!fingerprint) continue;
    if (!groups.has(fingerprint)) groups.set(fingerprint, []);
    groups.get(fingerprint).push(String(node.id));
  }
  return new Map([...groups].filter(([, ids]) => ids.length === 1).map(([fingerprint, ids]) => [fingerprint, ids[0]]));
}
export function uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph) {
  const source = uniqueByFingerprint(sourceGraph); const target = uniqueByFingerprint(targetGraph); const rows = [];
  for (const [fingerprint, sourceNodeId] of source) {
    const targetNodeId = target.get(fingerprint); if (!targetNodeId) continue;
    rows.push(deepFreeze({ sourceNodeId, targetNodeId, score: 100, winnerGap: 0, sourceRank: 1, targetRank: 1, mutualBest: true,
      physicalFingerprint: deepFreeze({ authority: 'CANDIDATE_GENERATION_ONLY', fingerprint, uniqueInSource: true, uniqueInTarget: true }) }));
  }
  return deepFreeze(rows.sort((a, b) => compareNodeIds(a.sourceNodeId, b.sourceNodeId) || compareNodeIds(a.targetNodeId, b.targetNodeId)));
}
function boundedPhysicalLimit(value) {
  const requested = Number(value); const finite = Number.isFinite(requested) ? Math.floor(requested) : DEFAULT_PHYSICAL_SEARCH_LIMIT;
  return Math.max(3, Math.min(MAX_PHYSICAL_SEARCH_LIMIT, finite));
}
function physicalSearchLimit(options) { return boundedPhysicalLimit(options.methodAPhysicalCandidateLimit ?? DEFAULT_PHYSICAL_SEARCH_LIMIT); }
function boundedDiscoveryLimit(value, physicalLimit) {
  const requested = Number(value); const finite = Number.isFinite(requested) ? Math.floor(requested) : physicalLimit;
  return Math.max(3, Math.min(physicalLimit, finite));
}
function candidatePriority(graph, nodeId) {
  const edges = [...(graph?.adjacency?.get(String(nodeId)) || [])];
  const kinds = new Set(edges.map((edge) => String(edge?.componentKind || 'UNKNOWN')));
  return { degree: edges.length, kindCount: kinds.size };
}
function comparePriority(left, right, sourceGraph) {
  const l = candidatePriority(sourceGraph, left.sourceNodeId); const r = candidatePriority(sourceGraph, right.sourceNodeId);
  return r.degree - l.degree || r.kindCount - l.kindCount
    || compareNodeIds(left.sourceNodeId, right.sourceNodeId) || compareNodeIds(left.targetNodeId, right.targetNodeId);
}
function positionMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node?.position])); }
function squaredDistance(left, right) {
  if (!left || !right) return 0;
  const dx = Number(left.x) - Number(right.x); const dy = Number(left.y) - Number(right.y); const dz = Number(left.z) - Number(right.z);
  return [dx, dy, dz].every(Number.isFinite) ? dx * dx + dy * dy + dz * dz : 0;
}
function pointDistanceMm(left, right) {
  if (!left || !right) return null;
  const values = [left.x, left.y, left.z, right.x, right.y, right.z].map(Number);
  if (!values.every(Number.isFinite)) return null;
  return Math.hypot(values[0] - values[3], values[1] - values[4], values[2] - values[5]);
}
function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function incidentOdMm(graph, nodeId) {
  const values = [...(graph?.adjacency?.get(String(nodeId)) || [])]
    .map((edge) => positiveNumber(edge?.diameter ?? edge?.od)).filter((value) => value != null);
  return values.length ? Math.min(...values) : null;
}
function coherenceToleranceMm(sourceGraph, left, right, options = {}) {
  const factor = positiveNumber(options.methodAPreselectionOdToleranceFactor ?? options.odToleranceFactor) ?? 2;
  const ods = [incidentOdMm(sourceGraph, left.sourceNodeId), incidentOdMm(sourceGraph, right.sourceNodeId)]
    .filter((value) => value != null);
  return ods.length ? factor * Math.min(...ods) : 1e-6;
}
function distinctCandidateClaims(left, right) {
  return String(left.sourceNodeId) !== String(right.sourceNodeId) && String(left.targetNodeId) !== String(right.targetNodeId);
}
function pairDistanceCompatible(sourceGraph, sourcePositions, targetPositions, left, right, options) {
  if (!distinctCandidateClaims(left, right)) return false;
  const sourceDistance = pointDistanceMm(sourcePositions.get(left.sourceNodeId), sourcePositions.get(right.sourceNodeId));
  const targetDistance = pointDistanceMm(targetPositions.get(left.targetNodeId), targetPositions.get(right.targetNodeId));
  if (sourceDistance == null || targetDistance == null) return false;
  return Math.abs(sourceDistance - targetDistance) <= coherenceToleranceMm(sourceGraph, left, right, options);
}
function coherenceGraph(sourceGraph, targetGraph, pairs, options) {
  const sourcePositions = positionMap(sourceGraph); const targetPositions = positionMap(targetGraph);
  const neighbours = (pairs || []).map(() => new Set());
  for (let a = 0; a < pairs.length - 1; a += 1) for (let b = a + 1; b < pairs.length; b += 1) {
    if (!pairDistanceCompatible(sourceGraph, sourcePositions, targetPositions, pairs[a], pairs[b], options)) continue;
    neighbours[a].add(b); neighbours[b].add(a);
  }
  return neighbours;
}
function connectedComponents(indexes, neighbours) {
  const allowed = new Set(indexes); const unseen = new Set(indexes); const components = [];
  while (unseen.size) {
    const first = unseen.values().next().value; const queue = [first]; const component = []; unseen.delete(first);
    while (queue.length) {
      const index = queue.shift(); component.push(index);
      for (const next of neighbours[index]) if (allowed.has(next) && unseen.delete(next)) queue.push(next);
    }
    components.push(component);
  }
  return components;
}
function componentStrength(component, neighbours) {
  const members = new Set(component); let links = 0;
  for (const index of component) for (const next of neighbours[index]) if (members.has(next)) links += 1;
  return links / 2;
}
function componentKey(component, pairs) {
  return component.map((index) => `${pairs[index].sourceNodeId}=>${pairs[index].targetNodeId}`).sort().join('|');
}
function strongestCoherentCluster(sourceGraph, targetGraph, pairs, options = {}) {
  if ((pairs || []).length < 3) return [];
  const neighbours = coherenceGraph(sourceGraph, targetGraph, pairs, options);
  const supports = neighbours.map((items) => items.size); const maximum = Math.max(...supports, 0);
  if (maximum < 2) return [];
  const floor = Math.max(2, Math.ceil(maximum * 0.75));
  const eligible = supports.flatMap((count, index) => count >= floor ? [index] : []);
  const components = connectedComponents(eligible, neighbours).filter((component) => component.length >= 3);
  components.sort((a, b) => b.length - a.length || componentStrength(b, neighbours) - componentStrength(a, neighbours)
    || componentKey(a, pairs).localeCompare(componentKey(b, pairs), undefined, { numeric: true }));
  return (components[0] || []).map((index) => pairs[index]).sort((a, b) => comparePriority(a, b, sourceGraph));
}
function spreadScore(pair, selected, sourcePositions, targetPositions) {
  if (!selected.length) return 0;
  return Math.min(...selected.map((row) => squaredDistance(sourcePositions.get(pair.sourceNodeId), sourcePositions.get(row.sourceNodeId))
    + squaredDistance(targetPositions.get(pair.targetNodeId), targetPositions.get(row.targetNodeId))));
}
function fillBySpread(sourceGraph, targetGraph, candidates, count, seed = []) {
  if (count <= 0 || !candidates.length) return [];
  const sourcePositions = positionMap(sourceGraph); const targetPositions = positionMap(targetGraph);
  const selected = [...seed]; const added = []; const remaining = [...candidates];
  while (added.length < count && remaining.length) {
    remaining.sort((a, b) => selected.length
      ? spreadScore(b, selected, sourcePositions, targetPositions) - spreadScore(a, selected, sourcePositions, targetPositions)
        || comparePriority(a, b, sourceGraph)
      : comparePriority(a, b, sourceGraph));
    const next = remaining.shift(); selected.push(next); added.push(next);
  }
  return added;
}
export function selectPhysicalCandidatePairs(sourceGraph, targetGraph, pairs, requestedLimit, options = {}) {
  const limit = boundedPhysicalLimit(requestedLimit); const input = [...(pairs || [])];
  if (input.length <= limit) return deepFreeze(input);
  const coherent = strongestCoherentCluster(sourceGraph, targetGraph, input, options);
  const reserved = fillBySpread(sourceGraph, targetGraph, coherent, Math.min(limit, coherent.length));
  const reservedKeys = new Set(reserved.map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`));
  const remaining = input.filter((row) => !reservedKeys.has(`${row.sourceNodeId}=>${row.targetNodeId}`));
  const fill = fillBySpread(sourceGraph, targetGraph, remaining, limit - reserved.length, reserved);
  options.instrumentation?.record?.('ANCHOR_PHYSICAL_COHERENT_CLUSTER_SIZE', coherent.length);
  options.instrumentation?.record?.('ANCHOR_PHYSICAL_COHERENT_RESERVED_COUNT', reserved.length);
  return deepFreeze([...reserved, ...fill]);
}
function methodABasis(methodA) {
  const base = methodA?.bestBase;
  if (!base) return ['Method A unavailable'];
  return [`Method A PASS: base ${base.baseId}; ${base.anchorCount} anchors (${base.validationAnchorCount} validation); confidence ${base.confidence}`,
    `registered max residual ${Number(base.maxResidualMm || 0).toFixed(3)} mm; normalized ${Number(base.maxNormalizedResidual || 0).toFixed(3)}`];
}
export function suggestCiiPhysicalMethodAAnchors(sourceGraph, targetGraph, options = {}) {
  const allPairs = uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph); const limit = physicalSearchLimit(options);
  const pairs = selectPhysicalCandidatePairs(sourceGraph, targetGraph, allPairs, limit, options); const instrumentation = options.instrumentation;
  instrumentation?.record?.('ANCHOR_PHYSICAL_CANDIDATE_COUNT', allPairs.length);
  instrumentation?.record?.('ANCHOR_PHYSICAL_SEARCH_LIMIT', limit);
  instrumentation?.record?.('ANCHOR_PHYSICAL_SELECTED_COUNT', pairs.length);
  if (pairs.length < 3) return deepFreeze([]);
  const discovery = discoverCiiMethodABases(sourceGraph, targetGraph, pairs, {
    ...options,
    methodASeedPairLimit: boundedDiscoveryLimit(options.methodASeedPairLimit, limit),
    methodAExpansionPairLimit: boundedDiscoveryLimit(options.methodAExpansionPairLimit, limit),
  });
  const rows = pairs.flatMap((pair) => {
    const methodA = projectCiiMethodAEvidence(discovery, pair.sourceNodeId, pair.targetNodeId);
    if (methodA.status !== 'READY') return [];
    return [deepFreeze({
      schema: CII_WORKSPACE_SCHEMAS.baseAnchorSuggestion,
      sourceNodeId: pair.sourceNodeId, targetNodeId: pair.targetNodeId,
      status: 'SUGGESTED', authority: 'EVIDENCE_ONLY_ENGINEER_ACCEPT_REQUIRED', reviewRequired: true,
      basisMethod: 'METHOD_A_SPATIAL', methodA, methodAWeight: methodA.bestBase?.weight || null,
      methodB: null, methodBWeight: null, confidence: methodA.bestBase?.confidence || 'REVIEW',
      score: pair.score, winnerGap: 0, requiredWinnerGap: Math.max(0, Number(options.baseAnchorWinnerGap ?? 8)),
      candidateGeneration: deepFreeze({
        method: 'UNIQUE_INCIDENT_COMPONENT_LENGTH_FOR_METHOD_A', authorityRole: 'CANDIDATE_GENERATION_ONLY',
        score: pair.score, sourceRank: 1, targetRank: 1, mutualBest: true,
        sourceWinnerGap: 0, targetWinnerGap: 0, physicalFingerprint: pair.physicalFingerprint,
      }),
      basis: deepFreeze([`Candidate-generation-only unique incident component/length fingerprint ${pair.physicalFingerprint.fingerprint}`, ...methodABasis(methodA)]),
      identityExclusions: deepFreeze(['NODE_NUMBER_OFFSET_NOT_USED', 'NODE_NAME_NOT_USED_FOR_PHYSICAL_FINGERPRINT', 'OD_NOT_IDENTITY_USED_AS_METHOD_A_TOLERANCE_SCALE', 'WALL_NOT_USED']),
    })];
  });
  return deepFreeze(rows);
}

export const _test = Object.freeze({ componentLengthToken, incidentFingerprint, uniqueByFingerprint, boundedPhysicalLimit, physicalSearchLimit, boundedDiscoveryLimit, candidatePriority, pointDistanceMm, coherenceToleranceMm, distinctCandidateClaims, coherenceGraph, strongestCoherentCluster, fillBySpread, spreadScore });
