import { coordinateDelta, solveRevisionCoordinateFrame, SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';

export const SUPPORT_REVISION_LINEAGE_SCHEMA = 'support-revision-lineage/v3-location-first';
export const LINEAGE_OUTCOMES = Object.freeze(['DETERMINISTIC', 'LIKELY', 'AMBIGUOUS', 'NO_MATCH']);

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const intersects = (a, b) => a.filter((value) => b.includes(value));

export function buildSupportRevisionLineage(sourceModel, targetModel, options = {}) {
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const sourceClusters = detectCommonSupportClusters(sourceModel);
  const targetClusters = detectCommonSupportClusters(targetModel);
  const candidates = buildCandidateLedger(sourceModel, targetModel, policy);

  // Common-support topology remains higher-order structural evidence. Outside
  // those clusters, the owner-defined logical location identity (Civil + PIPE)
  // is bound before component-reference fallback. Persistent references are
  // component identity and must not steal a target from its exact location.
  const structural = buildStructuralEdges(sourceModel, targetModel, sourceClusters, targetClusters, candidates);
  const usedSource = new Set(structural.edges.flatMap((edge) => edge.sourceNodeIds));
  const usedTarget = new Set(structural.edges.flatMap((edge) => edge.targetNodeIds));
  const exact = buildExactLocationEdges(sourceModel, targetModel, candidates, usedSource, usedTarget);
  const ordinary = buildOrdinaryEdges(sourceModel, targetModel, candidates, usedSource, usedTarget, policy);
  const edges = [...structural.edges, ...exact.edges, ...ordinary.edges];

  const anchorPairs = edges.flatMap((edge) => edge.cardinality === '1->1' && edge.outcome === 'DETERMINISTIC' && edge.persistentReferences.length
    ? [{ source: sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]), target: targetModel.locationByNodeId.get(edge.targetNodeIds[0]) }]
    : []);
  const coordinateFrame = solveRevisionCoordinateFrame(anchorPairs, policy);
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

function buildCandidateLedger(sourceModel, targetModel, policy) {
  const ledger = [];
  let index = 0;
  for (const source of sourceModel.locations) {
    const scored = targetModel.locations.map((target) => scoreCandidate(source, target, policy)).sort((a, b) => b.score - a.score || a.target.nodeId.localeCompare(b.target.nodeId));
    const top = scored[0] || null;
    const second = scored[1] || null;
    const topOutcome = candidateOutcome(top, second, policy);
    for (const item of scored.filter((row, position) => position < 8 && (row.score > 0 || position === 0))) {
      const outcome = item === top ? topOutcome : (topOutcome === 'AMBIGUOUS' && top.score - item.score <= policy.candidate.ambiguityMargin ? 'AMBIGUOUS' : 'NO_MATCH');
      ledger.push(Object.freeze({
        candidateId: `srcand:${String(++index).padStart(5, '0')}`,
        sourceNodeId: source.nodeId,
        targetNodeId: item.target.nodeId,
        outcome,
        score: item.score,
        matchingMethod: item.method,
        reasonCodes: Object.freeze(item.reasonCodes),
        persistentReferences: Object.freeze(item.sharedReferences),
        evidence: Object.freeze(item.evidence),
        reviewRequired: outcome === 'AMBIGUOUS',
      }));
    }
  }
  return Object.freeze(ledger);
}

function scoreCandidate(source, target, policy) {
  const sharedReferences = intersects(source.persistentReferences, target.persistentReferences);
  const union = new Set([...source.persistentReferences, ...target.persistentReferences]).size;
  const referenceJaccard = union ? sharedReferences.length / union : 0;
  const exactReferenceSet = Boolean(source.referenceSetKey) && source.referenceSetKey === target.referenceSetKey;
  const sameSupportLocationIdentity = Boolean(source.supportLocationIdentity) && source.supportLocationIdentity === target.supportLocationIdentity;
  const sameLegacy = Boolean(source.legacyIdentity) && upper(source.legacyIdentity) === upper(target.legacyIdentity);
  const sameFamily = Boolean(source.family) && upper(source.family) === upper(target.family);
  const samePipeCore = Boolean(source.pipe.normalizedCore) && source.pipe.normalizedCore === target.pipe.normalizedCore;
  const sameLine = Boolean(source.pipe.lineNumber) && upper(source.pipe.lineNumber) === upper(target.pipe.lineNumber);
  const provisionalDistance = rawCoordinateDistance(source, target);
  let score = 0;
  const reasonCodes = [];
  if (exactReferenceSet) { score += 100; reasonCodes.push('PERSISTENT_REFERENCE_SET_EXACT'); }
  else if (sharedReferences.length) { score += 72 + Math.round(referenceJaccard * 18); reasonCodes.push('PERSISTENT_REFERENCE_OVERLAP'); }
  if (sameSupportLocationIdentity) { score += 60; reasonCodes.push('SUPPORT_LOCATION_IDENTITY_EXACT'); }
  if (sameLegacy) { score += 18; reasonCodes.push('LEGACY_IDENTITY_EQUAL'); }
  if (samePipeCore) { score += 18; reasonCodes.push('PIPE_CORE_EQUAL'); }
  else if (sameLine) { score += 10; reasonCodes.push('PIPE_LINE_EQUAL'); }
  if (sameFamily) { score += 8; reasonCodes.push('SECONDARY_FAMILY_EQUAL'); }
  if (provisionalDistance != null && provisionalDistance <= policy.candidate.coordinateNearMm) { score += 6; reasonCodes.push('COORDINATE_NEAR_PRE_FRAME'); }
  const method = sameSupportLocationIdentity ? 'civil-pipe-location-identity'
    : exactReferenceSet ? 'persistent-reference-set'
      : sharedReferences.length ? 'persistent-reference-overlap'
        : sameLegacy && samePipeCore ? 'legacy-pipe-structure'
          : samePipeCore ? 'pipe-structure'
            : 'structural-score';
  return {
    source,
    target,
    score,
    method,
    reasonCodes,
    sharedReferences,
    evidence: { exactReferenceSet, referenceJaccard, sameSupportLocationIdentity, sameLegacy, sameFamily, samePipeCore, sameLine, provisionalDistance },
  };
}

function candidateOutcome(top, second, policy) {
  if (!top || top.score < policy.candidate.likelyScore) return 'NO_MATCH';
  const deterministicEvidence = top.reasonCodes.includes('PERSISTENT_REFERENCE_SET_EXACT')
    || top.reasonCodes.includes('PERSISTENT_REFERENCE_OVERLAP')
    || top.reasonCodes.includes('SUPPORT_LOCATION_IDENTITY_EXACT');
  const closeCompetitor = second && second.score >= policy.candidate.likelyScore && top.score - second.score <= policy.candidate.ambiguityMargin;
  if (closeCompetitor) return 'AMBIGUOUS';
  return deterministicEvidence ? 'DETERMINISTIC' : 'LIKELY';
}

function candidateLedgerOutcome(top, second, policy) {
  if (!top || top.score < policy.candidate.likelyScore) return 'NO_MATCH';
  const deterministicEvidence = top.reasonCodes.includes('PERSISTENT_REFERENCE_SET_EXACT')
    || top.reasonCodes.includes('PERSISTENT_REFERENCE_OVERLAP')
    || top.reasonCodes.includes('SUPPORT_LOCATION_IDENTITY_EXACT');
  const closeCompetitor = second && second.score >= policy.candidate.likelyScore && top.score - second.score <= policy.candidate.ambiguityMargin;
  if (closeCompetitor) return 'AMBIGUOUS';
  return deterministicEvidence ? 'DETERMINISTIC' : 'LIKELY';
}

function rawCoordinateDistance(source, target) {
  const deltas = ['x', 'y', 'z'].flatMap((axis) => {
    const a = source.position?.[axis]?.directedMm;
    const b = target.position?.[axis]?.directedMm;
    return Number.isFinite(a) && Number.isFinite(b) ? [b - a] : [];
  });
  return deltas.length ? Math.sqrt(deltas.reduce((sum, value) => sum + (value * value), 0)) : null;
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
      reasonCodes: Object.freeze(['SUPPORT_LOCATION_IDENTITY_EXACT']),
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
    const rows = candidates.filter((candidate) => candidate.sourceNodeId === source.nodeId && !usedTarget.has(candidate.targetNodeId)).sort((a, b) => b.score - a.score || a.targetNodeId.localeCompare(b.targetNodeId));
    const top = rows[0], second = rows[1];
    const resolvedOutcome = candidateLedgerOutcome(top, second, policy);
    if (!top || resolvedOutcome === 'NO_MATCH' || resolvedOutcome === 'AMBIGUOUS') continue;
    const target = targetModel.locationByNodeId.get(top.targetNodeId);
    if (!target) continue;
    const competing = candidates
      .filter((candidate) => candidate.targetNodeId === target.nodeId && !usedSource.has(candidate.sourceNodeId))
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

export const _test = Object.freeze({ commonGroupKey, hasCommonSupportStructure, scoreCandidate, candidateOutcome, candidateLedgerOutcome, rawCoordinateDistance, groupByLocationIdentity });
