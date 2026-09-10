import { coordinateDelta, solveRevisionCoordinateFrame, SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';
import {
  SUPPORT_LINEAGE_SCORE_POLICY_V2,
  buildTrustedCoordinateAnchors,
  candidateOutcome,
  compareBore,
  scoreSupportRevisionCandidate,
} from './support-revision-candidate-scoring.js';

export const SUPPORT_REVISION_LINEAGE_SCHEMA = 'support-revision-lineage/v4-weighted-audit';
export const LINEAGE_OUTCOMES = Object.freeze(['DETERMINISTIC', 'LIKELY', 'AMBIGUOUS', 'NO_MATCH']);

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const intersects = (a, b) => a.filter((value) => b.includes(value));

export function buildSupportRevisionLineage(sourceModel, targetModel, options = {}) {
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const scorePolicy = options.scorePolicy || SUPPORT_LINEAGE_SCORE_POLICY_V2;
  const sourceClusters = detectCommonSupportClusters(sourceModel);
  const targetClusters = detectCommonSupportClusters(targetModel);
  const trustedAnchors = buildTrustedCoordinateAnchors(sourceModel, targetModel);
  const solvedFrame = solveRevisionCoordinateFrame(trustedAnchors, policy);
  const coordinateFrame = Object.freeze({
    ...solvedFrame,
    anchorBasis: 'UNIQUE_SUPPORT_LOCATION_IDENTITY',
    scoreMinimumAnchors: scorePolicy.minimumFrameAnchors,
    scoreFrameUsable: solvedFrame.status === 'SOLVED' && solvedFrame.anchorCount >= scorePolicy.minimumFrameAnchors,
  });
  const candidates = buildCandidateLedger(sourceModel, targetModel, coordinateFrame, policy, scorePolicy);

  // Structural common-support evidence is resolved first. For ordinary 1->1
  // lineage, exact Civil+PIPE identity binds before weighted fallback. Known
  // bore mismatch blocks automatic lineage even when other signals are strong.
  const structural = buildStructuralEdges(sourceModel, targetModel, sourceClusters, targetClusters, candidates);
  const usedSource = new Set(structural.edges.flatMap((edge) => edge.sourceNodeIds));
  const usedTarget = new Set(structural.edges.flatMap((edge) => edge.targetNodeIds));
  const exact = buildExactLocationEdges(sourceModel, targetModel, candidates, usedSource, usedTarget);
  const ordinary = buildOrdinaryEdges(sourceModel, targetModel, candidates, usedSource, usedTarget, policy);
  const edges = [...structural.edges, ...exact.edges, ...ordinary.edges];
  const enrichedEdges = Object.freeze(edges.map((edge) => enrichEdgeCoordinates(edge, sourceModel, targetModel, coordinateFrame, policy)));
  const matchedSource = new Set(enrichedEdges.flatMap((edge) => edge.sourceNodeIds));
  const matchedTarget = new Set(enrichedEdges.flatMap((edge) => edge.targetNodeIds));
  const removed = Object.freeze(sourceModel.locations.filter((location) => !matchedSource.has(location.nodeId)).map((location) => location.nodeId));
  const added = Object.freeze(targetModel.locations.filter((location) => !matchedTarget.has(location.nodeId)).map((location) => location.nodeId));
  const ambiguous = Object.freeze(candidates.filter((candidate) => candidate.outcome === 'AMBIGUOUS'
    && !matchedSource.has(candidate.sourceNodeId)
    && !matchedTarget.has(candidate.targetNodeId)));
  return Object.freeze({
    schema: SUPPORT_REVISION_LINEAGE_SCHEMA,
    policyId: policy.policyId,
    scorePolicyId: scorePolicy.policyId,
    scorePolicyVersion: scorePolicy.version,
    sourceRevision: sourceModel.revision,
    targetRevision: targetModel.revision,
    sourceClusters,
    targetClusters,
    candidates,
    edges: enrichedEdges,
    removed,
    added,
    ambiguous,
    coordinateFrame,
  });
}

export function detectCommonSupportClusters(model) {
  const groups = new Map();
  for (const location of model?.locations || []) {
    const groupKey = commonGroupKey(location);
    if (!groupKey || groupKey === '|') continue;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(location);
  }
  const clusters = [];
  let index = 0;
  for (const [groupKey, locations] of groups) {
    if (locations.length < 2 || !hasCommonSupportStructure(locations)) continue;
    clusters.push(Object.freeze({
      clusterId: `common:${model.revision || 'R'}:${String(++index).padStart(3, '0')}`,
      groupKey,
      sharedLegacyIdentity: locations[0].legacyIdentity,
      sharedPipeIdentity: locations[0].pipe.normalizedCore,
      locationNodeIds: Object.freeze(locations.map((location) => location.nodeId)),
      locations: Object.freeze(locations.map((location) => Object.freeze({
        nodeId: location.nodeId,
        family: location.family,
        supportLocationIdentity: location.supportLocationIdentity,
        referenceSet: location.persistentReferences,
        position: location.position,
      }))),
      classification: 'CROSS_FAMILY_COMMON_SUPPORT',
      structuralEvidence: Object.freeze({
        distinctFamilies: new Set(locations.map((location) => upper(location.family))).size,
        distinctReferenceSets: new Set(locations.map((location) => location.referenceSetKey)).size,
        distinctPositions: distinctPositionCount(locations),
      }),
    }));
  }
  return Object.freeze(clusters);
}

function hasCommonSupportStructure(locations) {
  const distinctReferenceSets = new Set(locations.map((location) => location.referenceSetKey)).size;
  const distinctFamilies = new Set(locations.map((location) => upper(location.family))).size;
  const distinctPositions = distinctPositionCount(locations);
  return distinctReferenceSets > 1 && distinctFamilies > 1 && distinctPositions > 1;
}

function distinctPositionCount(locations) {
  return new Set(locations.map((location) => ['x', 'y', 'z'].map((axis) => {
    const value = location.position?.[axis]?.directedMm;
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : '';
  }).join('|'))).size;
}

function commonGroupKey(location) {
  return `${upper(location?.legacyIdentity)}|${upper(location?.pipe?.normalizedCore)}`;
}

function buildCandidateLedger(sourceModel, targetModel, coordinateFrame, policy, scorePolicy) {
  const ledger = [];
  let index = 0;
  for (const source of sourceModel.locations) {
    const scored = targetModel.locations
      .map((target) => scoreSupportRevisionCandidate(source, target, coordinateFrame, policy, scorePolicy))
      .sort((a, b) => b.score - a.score || a.target.nodeId.localeCompare(b.target.nodeId));
    const eligible = scored.filter((item) => item.eligible);
    const top = eligible[0] || null;
    const second = eligible[1] || null;
    const topOutcome = candidateOutcome(top, second, policy);
    for (const item of scored.filter((row, position) => position < 8 && (row.score > 0 || position === 0))) {
      const nearTop = topOutcome === 'AMBIGUOUS' && item.eligible && top && top.score - item.score <= policy.candidate.ambiguityMargin;
      const outcome = item === top ? topOutcome : (nearTop ? 'AMBIGUOUS' : 'NO_MATCH');
      ledger.push(Object.freeze({
        candidateId: `srcand:${String(++index).padStart(5, '0')}`,
        sourceNodeId: source.nodeId,
        targetNodeId: item.target.nodeId,
        outcome,
        score: item.score,
        eligible: item.eligible,
        hardRejected: item.hardRejected,
        strongEvidence: item.strongEvidence,
        approximateEligible: item.approximateEligible,
        approximateSignalCount: item.approximateSignalCount,
        matchingMethod: item.method,
        reasonCodes: Object.freeze(item.reasonCodes),
        persistentReferences: Object.freeze(item.sharedReferences),
        scorePolicyId: item.scorePolicyId,
        scorePolicyVersion: item.scorePolicyVersion,
        weightBreakdown: item.weightBreakdown,
        evidence: Object.freeze(item.evidence),
        reviewRequired: outcome === 'AMBIGUOUS',
      }));
    }
  }
  return Object.freeze(ledger);
}

function buildStructuralEdges(sourceModel, targetModel, sourceClusters, targetClusters, candidates) {
  const sourceGroups = groupLocations(sourceModel.locations);
  const targetGroups = groupLocations(targetModel.locations);
  const sourceClusterKeys = new Set(sourceClusters.map((cluster) => cluster.groupKey));
  const targetClusterKeys = new Set(targetClusters.map((cluster) => cluster.groupKey));
  const edges = [];
  let index = 0;
  for (const groupKey of new Set([...sourceGroups.keys(), ...targetGroups.keys()])) {
    const source = sourceGroups.get(groupKey) || [];
    const target = targetGroups.get(groupKey) || [];
    if (!source.length || !target.length) continue;
    const sourceStructural = sourceClusterKeys.has(groupKey);
    const targetStructural = targetClusterKeys.has(groupKey);
    if (source.length === 1 && target.length > 1 && targetStructural) {
      edges.push(structuralEdge(++index, source, target, '1->N', 'COMMON_SUPPORT_REPLICATION', candidates));
    } else if (source.length > 1 && target.length === 1 && sourceStructural) {
      edges.push(structuralEdge(++index, source, target, 'N->1', 'COMMON_SUPPORT_CONSOLIDATION', candidates));
    } else if (source.length > 1 && target.length > 1 && source.length !== target.length && (sourceStructural || targetStructural)) {
      edges.push(structuralEdge(++index, source, target, 'N->M', 'COMMON_SUPPORT_REDESIGN', candidates, 'AMBIGUOUS'));
    }
  }
  return { edges };
}

function structuralEdge(index, source, target, cardinality, reason, candidates, outcome = 'DETERMINISTIC') {
  const refs = [...new Set(source.flatMap((location) => location.persistentReferences).filter((ref) => target.some((location) => location.persistentReferences.includes(ref))))].sort();
  return Object.freeze({
    edgeId: `lineage:struct:${String(index).padStart(4, '0')}`,
    cardinality,
    sourceNodeIds: Object.freeze(source.map((location) => location.nodeId)),
    targetNodeIds: Object.freeze(target.map((location) => location.nodeId)),
    outcome,
    matchingMethod: 'common-support-graph',
    reasonCodes: Object.freeze([reason, 'STRUCTURAL_COMMON_SUPPORT_EVIDENCE']),
    persistentReferences: Object.freeze(refs),
    candidateIds: Object.freeze(candidates.filter((candidate) => source.some((location) => location.nodeId === candidate.sourceNodeId) && target.some((location) => location.nodeId === candidate.targetNodeId)).map((candidate) => candidate.candidateId)),
  });
}

function groupLocations(locations) {
  const groups = new Map();
  for (const location of locations) {
    const key = commonGroupKey(location);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(location);
  }
  return groups;
}

function buildExactLocationEdges(sourceModel, targetModel, candidates, usedSource, usedTarget) {
  const sourceByIdentity = groupByLocationIdentity(sourceModel.locations.filter((location) => !usedSource.has(location.nodeId)));
  const targetByIdentity = groupByLocationIdentity(targetModel.locations.filter((location) => !usedTarget.has(location.nodeId)));
  const edges = [];
  let index = 0;
  for (const [identity, sourceRows] of sourceByIdentity) {
    const targetRows = targetByIdentity.get(identity) || [];
    if (!identity || sourceRows.length !== 1 || targetRows.length !== 1) continue;
    const source = sourceRows[0], target = targetRows[0];
    const bore = compareBore(source, target);
    if (bore.status === 'MISMATCH') continue;
    const sharedReferences = intersects(source.persistentReferences, target.persistentReferences).sort();
    const candidate = candidates.find((item) => item.sourceNodeId === source.nodeId && item.targetNodeId === target.nodeId) || null;
    usedSource.add(source.nodeId);
    usedTarget.add(target.nodeId);
    edges.push(Object.freeze({
      edgeId: `lineage:location:${String(++index).padStart(4, '0')}`,
      cardinality: '1->1',
      sourceNodeIds: Object.freeze([source.nodeId]),
      targetNodeIds: Object.freeze([target.nodeId]),
      outcome: 'DETERMINISTIC',
      matchingMethod: 'civil-pipe-location-identity',
      reasonCodes: Object.freeze(['SUPPORT_LOCATION_IDENTITY_EXACT', bore.status === 'MATCH' ? 'BORE_MATCH' : 'BORE_UNKNOWN']),
      persistentReferences: Object.freeze(sharedReferences),
      candidateIds: Object.freeze(candidate ? [candidate.candidateId] : []),
    }));
  }
  return { edges };
}

function groupByLocationIdentity(locations) {
  const groups = new Map();
  for (const location of locations) {
    const key = upper(location.supportLocationIdentity);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(location);
  }
  return groups;
}

function buildOrdinaryEdges(sourceModel, targetModel, candidates, usedSource, usedTarget, policy) {
  const edges = [];
  let index = 0;
  for (const source of sourceModel.locations) {
    if (usedSource.has(source.nodeId)) continue;
    const rows = candidates
      .filter((candidate) => candidate.sourceNodeId === source.nodeId && candidate.eligible && !usedTarget.has(candidate.targetNodeId))
      .sort((a, b) => b.score - a.score || a.targetNodeId.localeCompare(b.targetNodeId));
    const top = rows[0], second = rows[1];
    const resolvedOutcome = candidateOutcome(top, second, policy);
    if (!top || resolvedOutcome === 'NO_MATCH' || resolvedOutcome === 'AMBIGUOUS') continue;
    const target = targetModel.locationByNodeId.get(top.targetNodeId);
    if (!target) continue;
    const competing = candidates
      .filter((candidate) => candidate.targetNodeId === target.nodeId && candidate.eligible && !usedSource.has(candidate.sourceNodeId))
      .sort((a, b) => b.score - a.score || a.sourceNodeId.localeCompare(b.sourceNodeId));
    if (competing[0]?.sourceNodeId !== source.nodeId) continue;
    usedSource.add(source.nodeId);
    usedTarget.add(target.nodeId);
    edges.push(Object.freeze({
      edgeId: `lineage:ordinary:${String(++index).padStart(4, '0')}`,
      cardinality: '1->1',
      sourceNodeIds: Object.freeze([source.nodeId]),
      targetNodeIds: Object.freeze([target.nodeId]),
      outcome: resolvedOutcome,
      matchingMethod: top.matchingMethod,
      reasonCodes: top.reasonCodes,
      persistentReferences: top.persistentReferences,
      candidateIds: Object.freeze([top.candidateId]),
      candidateScore: top.score,
      scorePolicyId: top.scorePolicyId,
      scorePolicyVersion: top.scorePolicyVersion,
    }));
  }
  return { edges };
}

function enrichEdgeCoordinates(edge, sourceModel, targetModel, frame, policy) {
  const pairDeltas = [];
  for (const sourceNodeId of edge.sourceNodeIds) {
    const source = sourceModel.locationByNodeId.get(sourceNodeId);
    for (const targetNodeId of edge.targetNodeIds) {
      const target = targetModel.locationByNodeId.get(targetNodeId);
      if (!source || !target) continue;
      pairDeltas.push(Object.freeze({ sourceNodeId, targetNodeId, ...coordinateDelta(source.position, target.position, frame, policy) }));
    }
  }
  return Object.freeze({ ...edge, coordinateEvidence: Object.freeze(pairDeltas) });
}

export const _test = Object.freeze({
  commonGroupKey,
  hasCommonSupportStructure,
  groupByLocationIdentity,
  buildCandidateLedger,
});
