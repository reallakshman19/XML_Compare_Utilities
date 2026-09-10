import { SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';
import { compareComponents, compareLoads, compareOneToOne, createEventFactory } from './support-revision-event-utils.js';

export const SUPPORT_REVISION_EVENT_LEDGER_SCHEMA = 'support-revision-event-ledger/v1';

export function buildSupportRevisionEventLedger(sourceModel, targetModel, lineage, options = {}) {
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const makeEvent = createEventFactory(policy, sourceModel.profileId);
  const events = [];
  for (const edge of lineage.edges) {
    const sources = edge.sourceNodeIds.map((id) => sourceModel.locationByNodeId.get(id)).filter(Boolean);
    const targets = edge.targetNodeIds.map((id) => targetModel.locationByNodeId.get(id)).filter(Boolean);
    if (edge.cardinality === '1->1' && sources[0] && targets[0]) events.push(...compareOneToOne(sources[0], targets[0], edge, policy, makeEvent));
    else events.push(...structuralEvents(sources, targets, edge, policy, makeEvent));
  }
  for (const id of lineage.removed) {
    const source = sourceModel.locationByNodeId.get(id);
    if (source) events.push(makeEvent('SUPPORT_LOCATION_REMOVED', source, null, null, { remarkEligible: true, reasonCodes: ['NO_LINEAGE_SUCCESSOR'], normalizedState: { disposition: 'REMOVED_WITHOUT_SUCCESSOR' } }));
  }
  for (const id of lineage.added) {
    const target = targetModel.locationByNodeId.get(id);
    if (target) events.push(makeEvent('SUPPORT_LOCATION_ADDED', null, target, null, { remarkEligible: false, reasonCodes: ['NO_LINEAGE_PREDECESSOR'], normalizedState: { disposition: 'ADDED_WITHOUT_PREDECESSOR' } }));
  }
  for (const sourceNodeId of new Set(lineage.candidates.filter((item) => item.outcome === 'AMBIGUOUS').map((item) => item.sourceNodeId))) {
    const source = sourceModel.locationByNodeId.get(sourceNodeId);
    const candidates = lineage.candidates.filter((item) => item.sourceNodeId === sourceNodeId && item.outcome === 'AMBIGUOUS');
    events.push(makeEvent('AMBIGUOUS_LINEAGE', source, null, null, {
      remarkEligible: false,
      auditStatus: 'REVIEW_REQUIRED',
      matchingMethod: 'candidate-review',
      reasonCodes: ['MULTIPLE_CANDIDATES_WITHIN_AMBIGUITY_MARGIN'],
      normalizedState: { candidates: candidates.map((item) => ({ candidateId: item.candidateId, targetNodeId: item.targetNodeId, score: item.score })) },
    }));
  }
  return Object.freeze({ schema: SUPPORT_REVISION_EVENT_LEDGER_SCHEMA, policyId: policy.policyId, profileId: sourceModel.profileId, sourceRevision: sourceModel.revision, targetRevision: targetModel.revision, events: Object.freeze(events), summary: summarizeEvents(events) });
}

function structuralEvents(sources, targets, edge, policy, makeEvent) {
  if (edge.cardinality === '1->N') return replicationEvents(sources[0], targets, edge, policy, makeEvent);
  if (edge.cardinality === 'N->1') return [makeEvent('COMMON_SUPPORT_CONSOLIDATED', sources[0] || null, targets[0] || null, edge, { remarkEligible: false, reasonCodes: ['STRUCTURAL_COMMON_SUPPORT_EVIDENCE', 'COMMON_SUPPORT_CONSOLIDATION'], normalizedState: { clusterTransition: 'N->1', sourceFamilies: sources.map((item) => item.family), targetFamily: targets[0]?.family || '' } })];
  return [makeEvent('AMBIGUOUS_LINEAGE', sources[0] || null, targets[0] || null, edge, { remarkEligible: false, auditStatus: 'REVIEW_REQUIRED', reasonCodes: ['COMMON_SUPPORT_REDESIGN', 'N_TO_M_REQUIRES_REVIEW'], normalizedState: { clusterTransition: edge.cardinality, sourceNodeIds: edge.sourceNodeIds, targetNodeIds: edge.targetNodeIds } })];
}

function replicationEvents(source, targets, edge, policy, makeEvent) {
  if (!source) return [];
  const events = [];
  for (const target of targets) {
    events.push(makeEvent('COMMON_SUPPORT_REPLICATED', source, target, edge, { remarkEligible: true, reasonCodes: ['STRUCTURAL_COMMON_SUPPORT_EVIDENCE', 'COMMON_SUPPORT_REPLICATION'], normalizedState: { clusterTransition: '1->N', targetFamily: target.family } }));
    const shared = source.persistentReferences.filter((ref) => target.persistentReferences.includes(ref));
    const coordinate = edge.coordinateEvidence?.find((row) => row.sourceNodeId === source.nodeId && row.targetNodeId === target.nodeId);
    if (shared.length && coordinate?.classification === 'ACTUAL_POSITION_CHANGED') events.push(makeEvent('COMMON_SUPPORT_ANCHOR_RELOCATED', source, target, edge, { remarkEligible: true, persistentReferences: shared, coordinateResidual: coordinate, reasonCodes: ['STRUCTURAL_COMMON_SUPPORT_EVIDENCE', 'PERSISTENT_REFERENCE_ANCHOR', 'NORMALIZED_POSITION_CHANGED'], normalizedState: { coordinateClassification: coordinate.classification, residualMm: coordinate.residualMm } }));
    // A structurally new replicated branch may legitimately own a different
    // reference set. Do not turn that topology fact into a false Support Type
    // Changes remark. Component deltas are evaluated only where at least one
    // persistent component actually continues into this branch.
    if (shared.length) events.push(...compareComponents(source, target, edge, makeEvent));
    events.push(...compareLoads(source, target, edge, policy, makeEvent));
  }
  return events;
}

function summarizeEvents(events) {
  const byType = {};
  for (const event of events) byType[event.type] = (byType[event.type] || 0) + 1;
  return Object.freeze({ total: events.length, remarkEligible: events.filter((event) => event.remarkEligible).length, reviewRequired: events.filter((event) => event.auditStatus === 'REVIEW_REQUIRED').length, byType: Object.freeze(byType) });
}

export const _test = Object.freeze({ summarizeEvents });
