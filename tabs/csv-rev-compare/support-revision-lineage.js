import { createXmlCompareCandidatePairs } from '../../xml-compare/XmlCompareCandidatePairModel.js';
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
const intersects = (a = [], b = []) => a.filter((value) => b.includes(value));

export function buildSupportRevisionLineage(sourceModel, targetModel, options = {}) {
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const scorePolicy = options.scorePolicy || SUPPORT_LINEAGE_SCORE_POLICY_V2;
  const sourceClusters = detectCommonSupportClusters(sourceModel);
  const targetClusters = detectCommonSupportClusters(targetModel);
  const xmlCandidateHints = buildExistingCandidateHints(sourceModel, targetModel);
  const trustedAnchors = buildTrustedCoordinateAnchors(sourceModel, targetModel);
  const solvedFrame = solveRevisionCoordinateFrame(trustedAnchors, policy);
  const coordinateFrame = Object.freeze({
    ...solvedFrame,
    anchorBasis: 'UNIQUE_SUPPORT_LOCATION_IDENTITY',
    scoreMinimumAnchors: scorePolicy.minimumFrameAnchors,
    scoreFrameUsable: solvedFrame.status === 'SOLVED' && solvedFrame.anchorCount >= scorePolicy.minimumFrameAnchors,
  });
  const candidates = buildCandidateLedger(sourceModel, targetModel, coordinateFrame, policy, scorePolicy, xmlCandidateHints);
  const structural = buildStructuralEdges(sourceModel, targetModel, sourceClusters, targetClusters, candidates);
  const usedSource = new Set(structural.flatMap((edge) => edge.sourceNodeIds));
  const usedTarget = new Set(structural.flatMap((edge) => edge.targetNodeIds));
  const exact = buildExactLocationEdges(sourceModel, targetModel, candidates, usedSource, usedTarget);
  const ordinary = buildOrdinaryEdges(sourceModel, targetModel, candidates, usedSource, usedTarget, policy);
  const edges = [...structural, ...exact, ...ordinary];
  const enrichedEdges = Object.freeze(edges.map((edge) => enrichCoordinates(edge, sourceModel, targetModel, coordinateFrame, policy)));
  const matchedSource = new Set(enrichedEdges.flatMap((edge) => edge.sourceNodeIds));
  const matchedTarget = new Set(enrichedEdges.flatMap((edge) => edge.targetNodeIds));
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
    xmlCandidateHints,
    edges: enrichedEdges,
    removed: Object.freeze(sourceModel.locations.filter((item) => !matchedSource.has(item.nodeId)).map((item) => item.nodeId)),
    added: Object.freeze(targetModel.locations.filter((item) => !matchedTarget.has(item.nodeId)).map((item) => item.nodeId)),
    ambiguous: Object.freeze(candidates.filter((item) => item.outcome === 'AMBIGUOUS' && !matchedSource.has(item.sourceNodeId) && !matchedTarget.has(item.targetNodeId))),
    coordinateFrame,
  });
}

function buildExistingCandidateHints(sourceModel, targetModel) {
  const model = createXmlCompareCandidatePairs({
    sourceRecords: sourceModel.locations.map(candidateRecord),
    targetRecords: targetModel.locations.map(candidateRecord),
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
    stableKey: location.referenceSetKey || location.supportLocationIdentity || location.nodeId,
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
      locations: Object.freeze(locations.map((item) => Object.freeze({ nodeId: item.nodeId, family: item.family, supportLocationIdentity: item.supportLocationIdentity, referenceSet: item.persistentReferences, position: item.position }))),
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

function buildCandidateLedger(sourceModel, targetModel, coordinateFrame, policy, scorePolicy, hints) {
  const ledger = [];
  let index = 0;
  for (const source of sourceModel.locations) {
    const scored = targetModel.locations.map((target) => {
      const item = scoreSupportRevisionCandidate(source, target, coordinateFrame, policy, scorePolicy);
      const xmlHint = hints.find((hint) => hint.sourceNodeId === source.nodeId && hint.targetNodeId === target.nodeId) || null;
      return Object.freeze({ ...item, evidence: Object.freeze({ ...item.evidence, xmlCandidateHint: xmlHint }) });
    }).sort((a, b) => b.score - a.score || a.target.nodeId.localeCompare(b.target.nodeId));
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
        evidence: item.evidence,
        reviewRequired: outcome === 'AMBIGUOUS',
      }));
    }
  }
  return Object.freeze(ledger);
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

function buildExactLocationEdges(sourceModel, targetModel, candidates, usedSource, usedTarget) {
  const sourceGroups = groupByLocationIdentity(sourceModel.locations.filter((item) => !usedSource.has(item.nodeId)));
  const targetGroups = groupByLocationIdentity(targetModel.locations.filter((item) => !usedTarget.has(item.nodeId)));
  const edges = [];
  let index = 0;
  for (const [identity, sourceRows] of sourceGroups) {
    const targetRows = targetGroups.get(identity) || [];
    if (!identity || sourceRows.length !== 1 || targetRows.length !== 1) continue;
    const source = sourceRows[0], target = targetRows[0];
    const bore = compareBore(source, target);
    if (bore.status === 'MISMATCH') continue;
    const sharedReferences = intersects(source.persistentReferences, target.persistentReferences).sort();
    const candidate = candidates.find((item) => item.sourceNodeId === source.nodeId && item.targetNodeId === target.nodeId) || null;
    usedSource.add(source.nodeId); usedTarget.add(target.nodeId);
    edges.push(Object.freeze({
      edgeId: `lineage:location:${String(++index).padStart(4,'0')}`,
      cardinality: '1->1', sourceNodeIds: Object.freeze([source.nodeId]), targetNodeIds: Object.freeze([target.nodeId]),
      outcome: 'DETERMINISTIC', matchingMethod: 'civil-pipe-location-identity',
      reasonCodes: Object.freeze(['SUPPORT_LOCATION_IDENTITY_EXACT', bore.status === 'MATCH' ? 'BORE_MATCH' : 'BORE_UNKNOWN']),
      persistentReferences: Object.freeze(sharedReferences), candidateIds: Object.freeze(candidate ? [candidate.candidateId] : []),
      candidateScore: candidate?.score ?? null, scorePolicyId: candidate?.scorePolicyId || null, scorePolicyVersion: candidate?.scorePolicyVersion || null,
    }));
  }
  return edges;
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
    const rows = candidates.filter((item) => item.sourceNodeId === source.nodeId && item.eligible && !usedTarget.has(item.targetNodeId)).sort((a,b) => b.score - a.score || a.targetNodeId.localeCompare(b.targetNodeId));
    const top = rows[0], second = rows[1];
    const outcome = candidateOutcome(top, second, policy);
    if (!top || ['NO_MATCH','AMBIGUOUS'].includes(outcome)) continue;
    const competing = candidates.filter((item) => item.targetNodeId === top.targetNodeId && item.eligible && !usedSource.has(item.sourceNodeId)).sort((a,b) => b.score - a.score || a.sourceNodeId.localeCompare(b.sourceNodeId));
    if (competing[0]?.sourceNodeId !== source.nodeId) continue;
    usedSource.add(source.nodeId); usedTarget.add(top.targetNodeId);
    edges.push(Object.freeze({
      edgeId: `lineage:ordinary:${String(++index).padStart(4,'0')}`, cardinality: '1->1', sourceNodeIds: Object.freeze([source.nodeId]), targetNodeIds: Object.freeze([top.targetNodeId]), outcome,
      matchingMethod: top.matchingMethod, reasonCodes: top.reasonCodes, persistentReferences: top.persistentReferences, candidateIds: Object.freeze([top.candidateId]),
      candidateScore: top.score, scorePolicyId: top.scorePolicyId, scorePolicyVersion: top.scorePolicyVersion,
    }));
  }
  return edges;
}

function enrichCoordinates(edge, sourceModel, targetModel, frame, policy) {
  const evidence = [];
  for (const sourceId of edge.sourceNodeIds) for (const targetId of edge.targetNodeIds) {
    const source = sourceModel.locationByNodeId.get(sourceId), target = targetModel.locationByNodeId.get(targetId);
    if (source && target) evidence.push(Object.freeze({ sourceNodeId: sourceId, targetNodeId: targetId, ...coordinateDelta(source.position, target.position, frame, policy) }));
  }
  return Object.freeze({ ...edge, coordinateEvidence: Object.freeze(evidence) });
}

export const _test = Object.freeze({ commonGroupKey, hasCommonSupportStructure, groupByLocationIdentity, buildCandidateLedger, candidateRecord });
