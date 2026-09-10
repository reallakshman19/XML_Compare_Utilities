import { createXmlCompareCandidatePairs } from '../../xml-compare/XmlCompareCandidatePairModel.js';
import { coordinateDelta, solveRevisionCoordinateFrame, SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';

export const SUPPORT_REVISION_LINEAGE_SCHEMA = 'support-revision-lineage/v1';
export const LINEAGE_OUTCOMES = Object.freeze(['DETERMINISTIC', 'LIKELY', 'AMBIGUOUS', 'NO_MATCH']);

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const intersects = (a, b) => a.filter((value) => b.includes(value));

export function buildSupportRevisionLineage(sourceModel, targetModel, options = {}) {
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const sourceClusters = detectCommonSupportClusters(sourceModel);
  const targetClusters = detectCommonSupportClusters(targetModel);
  const xmlCandidateHints = buildExistingCandidateHints(sourceModel, targetModel);
  const candidates = buildCandidateLedger(sourceModel, targetModel, policy, xmlCandidateHints);
  const structural = buildStructuralEdges(sourceModel, targetModel, sourceClusters, targetClusters, candidates);
  const usedSource = new Set(structural.flatMap((edge) => edge.sourceNodeIds));
  const usedTarget = new Set(structural.flatMap((edge) => edge.targetNodeIds));
  const ordinary = buildOrdinaryEdges(sourceModel, targetModel, candidates, usedSource, usedTarget);
  const edges = [...structural, ...ordinary];
  const frame = solveRevisionCoordinateFrame(deterministicAnchors(edges, sourceModel, targetModel), policy);
  const enrichedEdges = Object.freeze(edges.map((edge) => enrichCoordinates(edge, sourceModel, targetModel, frame, policy)));
  const matchedSource = new Set(enrichedEdges.flatMap((edge) => edge.sourceNodeIds));
  const matchedTarget = new Set(enrichedEdges.flatMap((edge) => edge.targetNodeIds));
  return Object.freeze({
    schema: SUPPORT_REVISION_LINEAGE_SCHEMA,
    policyId: policy.policyId,
    sourceRevision: sourceModel.revision,
    targetRevision: targetModel.revision,
    sourceClusters,
    targetClusters,
    candidates,
    xmlCandidateHints,
    edges: enrichedEdges,
    removed: Object.freeze(sourceModel.locations.filter((item) => !matchedSource.has(item.nodeId)).map((item) => item.nodeId)),
    added: Object.freeze(targetModel.locations.filter((item) => !matchedTarget.has(item.nodeId)).map((item) => item.nodeId)),
    ambiguous: Object.freeze(candidates.filter((item) => item.outcome === 'AMBIGUOUS')),
    coordinateFrame: frame,
  });
}

function buildExistingCandidateHints(sourceModel, targetModel) {
  const sourceRecords = sourceModel.locations.map(candidateRecord);
  const targetRecords = targetModel.locations.map(candidateRecord);
  const model = createXmlCompareCandidatePairs({
    sourceRecords,
    targetRecords,
    basis: 'name',
    nameField: 'legacyIdentity',
    mode: 'text',
    textField: 'displayName',
    textMatchThreshold: 1,
    scopeToAnchorLine: false,
  });
  return Object.freeze(model.pairs.map((pair) => Object.freeze({
    sourceNodeId: pair.sourceUid,
    targetNodeId: pair.targetUid,
    status: pair.status,
    method: `xml-compare:${pair.method}`,
    matchPct: pair.matchPct,
  })));
}

function candidateRecord(location) {
  return Object.freeze({
    uid: location.nodeId,
    stableKey: location.referenceSetKey || location.nodeId,
    displayName: location.legacyIdentity || location.family,
    legacyIdentity: location.legacyIdentity,
    lineNo: location.pipe.lineNumber,
    fields: Object.freeze({ family: location.family, pipeCore: location.pipe.normalizedCore }),
  });
}

export function detectCommonSupportClusters(model) {
  const groups = new Map();
  for (const location of model?.locations || []) {
    const key = commonGroupKey(location);
    if (!key || key === '|') continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(location);
  }
  let index = 0;
  return Object.freeze([...groups.entries()].flatMap(([groupKey, locations]) => {
    if (locations.length < 2 || !hasCommonSupportStructure(locations)) return [];
    return [Object.freeze({
      clusterId: `common:${model.revision || 'R'}:${String(++index).padStart(3, '0')}`,
      groupKey,
      sharedLegacyIdentity: locations[0].legacyIdentity,
      sharedPipeIdentity: locations[0].pipe.normalizedCore,
      classification: 'CROSS_FAMILY_COMMON_SUPPORT',
      locationNodeIds: Object.freeze(locations.map((item) => item.nodeId)),
      locations: Object.freeze(locations.map((item) => Object.freeze({ nodeId: item.nodeId, family: item.family, referenceSet: item.persistentReferences, position: item.position }))),
      structuralEvidence: Object.freeze({ distinctFamilies: distinct(locations.map((item) => upper(item.family))), distinctReferenceSets: distinct(locations.map((item) => item.referenceSetKey)), distinctPositions: distinctPositionCount(locations) }),
    })];
  }));
}

function hasCommonSupportStructure(locations) {
  return distinct(locations.map((item) => upper(item.family))) > 1 && distinct(locations.map((item) => item.referenceSetKey)) > 1 && distinctPositionCount(locations) > 1;
}
function distinct(values) { return new Set(values).size; }
function distinctPositionCount(locations) {
  return distinct(locations.map((item) => ['x','y','z'].map((axis) => {
    const value = item.position?.[axis]?.directedMm;
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : '';
  }).join('|')));
}
function commonGroupKey(location) { return `${upper(location?.legacyIdentity)}|${upper(location?.pipe?.normalizedCore)}`; }

function buildCandidateLedger(sourceModel, targetModel, policy, hints) {
  const ledger = [];
  let index = 0;
  for (const source of sourceModel.locations) {
    const scored = targetModel.locations.map((target) => scoreCandidate(source, target, policy, hints)).sort((a, b) => b.score - a.score || a.target.nodeId.localeCompare(b.target.nodeId));
    const top = scored[0] || null;
    const second = scored[1] || null;
    const topOutcome = candidateOutcome(top, second, policy);
    for (const [position, item] of scored.entries()) {
      if (position >= 8 || (item.score <= 0 && position > 0)) break;
      const ambiguousPeer = topOutcome === 'AMBIGUOUS' && top && top.score - item.score <= policy.candidate.ambiguityMargin;
      ledger.push(Object.freeze({
        candidateId: `srcand:${String(++index).padStart(5, '0')}`,
        sourceNodeId: source.nodeId,
        targetNodeId: item.target.nodeId,
        outcome: position === 0 ? topOutcome : (ambiguousPeer ? 'AMBIGUOUS' : 'NO_MATCH'),
        score: item.score,
        matchingMethod: item.method,
        reasonCodes: Object.freeze(item.reasonCodes),
        persistentReferences: Object.freeze(item.sharedReferences),
        evidence: Object.freeze(item.evidence),
        reviewRequired: position === 0 ? topOutcome === 'AMBIGUOUS' : ambiguousPeer,
      }));
    }
  }
  return Object.freeze(ledger);
}

function scoreCandidate(source, target, policy, hints) {
  const sharedReferences = intersects(source.persistentReferences, target.persistentReferences);
  const unionSize = new Set([...source.persistentReferences, ...target.persistentReferences]).size;
  const referenceJaccard = unionSize ? sharedReferences.length / unionSize : 0;
  const exactReferenceSet = Boolean(source.referenceSetKey) && source.referenceSetKey === target.referenceSetKey;
  const sameLegacy = Boolean(source.legacyIdentity) && upper(source.legacyIdentity) === upper(target.legacyIdentity);
  const sameFamily = Boolean(source.family) && upper(source.family) === upper(target.family);
  const samePipeCore = Boolean(source.pipe.normalizedCore) && source.pipe.normalizedCore === target.pipe.normalizedCore;
  const sameLine = Boolean(source.pipe.lineNumber) && upper(source.pipe.lineNumber) === upper(target.pipe.lineNumber);
  const xmlHint = hints.some((hint) => hint.sourceNodeId === source.nodeId && hint.targetNodeId === target.nodeId && hint.status === 'valid');
  const provisionalDistance = rawCoordinateDistance(source, target);
  const reasonCodes = [];
  let score = 0;
  if (exactReferenceSet) { score += 100; reasonCodes.push('PERSISTENT_REFERENCE_SET_EXACT'); }
  else if (sharedReferences.length) { score += 72 + Math.round(referenceJaccard * 18); reasonCodes.push('PERSISTENT_REFERENCE_OVERLAP'); }
  if (sameLegacy) { score += 18; reasonCodes.push('LEGACY_IDENTITY_EQUAL'); }
  if (samePipeCore) { score += 18; reasonCodes.push('PIPE_CORE_EQUAL'); } else if (sameLine) { score += 10; reasonCodes.push('PIPE_LINE_EQUAL'); }
  if (sameFamily) { score += 8; reasonCodes.push('SECONDARY_FAMILY_EQUAL'); }
  if (xmlHint) { score += 2; reasonCodes.push('XML_COMPARE_CANDIDATE_HINT'); }
  if (provisionalDistance != null && provisionalDistance <= policy.candidate.coordinateNearMm) { score += 6; reasonCodes.push('COORDINATE_NEAR_PRE_FRAME'); }
  const method = exactReferenceSet ? 'persistent-reference-set' : sharedReferences.length ? 'persistent-reference-overlap' : xmlHint ? 'xml-compare-adapted-structure' : sameLegacy && samePipeCore ? 'legacy-pipe-structure' : 'structural-score';
  return { target, score, method, reasonCodes, sharedReferences, evidence: { exactReferenceSet, referenceJaccard, sameLegacy, sameFamily, samePipeCore, sameLine, xmlHint, provisionalDistance } };
}

function candidateOutcome(top, second, policy) {
  if (!top || top.score < policy.candidate.likelyScore) return 'NO_MATCH';
  const close = second && second.score >= policy.candidate.likelyScore && top.score - second.score <= policy.candidate.ambiguityMargin;
  if (close) return 'AMBIGUOUS';
  return top.sharedReferences.length ? 'DETERMINISTIC' : 'LIKELY';
}

function rawCoordinateDistance(source, target) {
  const deltas = ['x','y','z'].flatMap((axis) => {
    const a = source.position?.[axis]?.directedMm;
    const b = target.position?.[axis]?.directedMm;
    return Number.isFinite(a) && Number.isFinite(b) ? [b - a] : [];
  });
  return deltas.length ? Math.sqrt(deltas.reduce((sum, value) => sum + value * value, 0)) : null;
}

function buildStructuralEdges(sourceModel, targetModel, sourceClusters, targetClusters, candidates) {
  const sourceGroups = groupLocations(sourceModel.locations);
  const targetGroups = groupLocations(targetModel.locations);
  const sourceKeys = new Set(sourceClusters.map((item) => item.groupKey));
  const targetKeys = new Set(targetClusters.map((item) => item.groupKey));
  let index = 0;
  const edges = [];
  for (const key of new Set([...sourceGroups.keys(), ...targetGroups.keys()])) {
    const source = sourceGroups.get(key) || [];
    const target = targetGroups.get(key) || [];
    if (!source.length || !target.length) continue;
    if (source.length === 1 && target.length > 1 && targetKeys.has(key)) edges.push(structuralEdge(++index, source, target, '1->N', 'COMMON_SUPPORT_REPLICATION', candidates));
    else if (source.length > 1 && target.length === 1 && sourceKeys.has(key)) edges.push(structuralEdge(++index, source, target, 'N->1', 'COMMON_SUPPORT_CONSOLIDATION', candidates));
    else if (source.length > 1 && target.length > 1 && source.length !== target.length && (sourceKeys.has(key) || targetKeys.has(key))) edges.push(structuralEdge(++index, source, target, 'N->M', 'COMMON_SUPPORT_REDESIGN', candidates, 'AMBIGUOUS'));
  }
  return edges;
}

function structuralEdge(index, source, target, cardinality, reason, candidates, outcome = 'DETERMINISTIC') {
  const refs = [...new Set(source.flatMap((item) => item.persistentReferences).filter((ref) => target.some((item) => item.persistentReferences.includes(ref))))].sort();
  return Object.freeze({ edgeId: `lineage:struct:${String(index).padStart(4,'0')}`, cardinality, sourceNodeIds: Object.freeze(source.map((item) => item.nodeId)), targetNodeIds: Object.freeze(target.map((item) => item.nodeId)), outcome, matchingMethod: 'common-support-graph', reasonCodes: Object.freeze([reason,'STRUCTURAL_COMMON_SUPPORT_EVIDENCE']), persistentReferences: Object.freeze(refs), candidateIds: Object.freeze(candidates.filter((candidate) => source.some((item) => item.nodeId === candidate.sourceNodeId) && target.some((item) => item.nodeId === candidate.targetNodeId)).map((item) => item.candidateId)) });
}
function groupLocations(locations) { const map = new Map(); for (const item of locations) { const key = commonGroupKey(item); if (!map.has(key)) map.set(key, []); map.get(key).push(item); } return map; }

function buildOrdinaryEdges(sourceModel, targetModel, candidates, usedSource, usedTarget) {
  const edges = [];
  let index = 0;
  for (const source of sourceModel.locations) {
    if (usedSource.has(source.nodeId)) continue;
    const rows = candidates.filter((item) => item.sourceNodeId === source.nodeId && !usedTarget.has(item.targetNodeId)).sort((a,b) => b.score - a.score || a.targetNodeId.localeCompare(b.targetNodeId));
    const top = rows[0];
    if (!top || ['NO_MATCH','AMBIGUOUS'].includes(top.outcome)) continue;
    const competing = candidates.filter((item) => item.targetNodeId === top.targetNodeId && !usedSource.has(item.sourceNodeId) && !['NO_MATCH','AMBIGUOUS'].includes(item.outcome)).sort((a,b) => b.score - a.score);
    if (competing[0]?.sourceNodeId !== source.nodeId) continue;
    usedSource.add(source.nodeId); usedTarget.add(top.targetNodeId);
    edges.push(Object.freeze({ edgeId: `lineage:ordinary:${String(++index).padStart(4,'0')}`, cardinality: '1->1', sourceNodeIds: Object.freeze([source.nodeId]), targetNodeIds: Object.freeze([top.targetNodeId]), outcome: top.outcome, matchingMethod: top.matchingMethod, reasonCodes: top.reasonCodes, persistentReferences: top.persistentReferences, candidateIds: Object.freeze([top.candidateId]) }));
  }
  return edges;
}

function deterministicAnchors(edges, sourceModel, targetModel) {
  return edges.flatMap((edge) => edge.cardinality === '1->1' && edge.outcome === 'DETERMINISTIC' && edge.persistentReferences.length ? [{ source: sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]), target: targetModel.locationByNodeId.get(edge.targetNodeIds[0]) }] : []);
}
function enrichCoordinates(edge, sourceModel, targetModel, frame, policy) {
  const evidence = [];
  for (const sourceId of edge.sourceNodeIds) for (const targetId of edge.targetNodeIds) {
    const source = sourceModel.locationByNodeId.get(sourceId), target = targetModel.locationByNodeId.get(targetId);
    if (source && target) evidence.push(Object.freeze({ sourceNodeId: sourceId, targetNodeId: targetId, ...coordinateDelta(source.position, target.position, frame, policy) }));
  }
  return Object.freeze({ ...edge, coordinateEvidence: Object.freeze(evidence) });
}

export const _test = Object.freeze({ commonGroupKey, hasCommonSupportStructure, scoreCandidate, candidateOutcome, rawCoordinateDistance, candidateRecord });
