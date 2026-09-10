import { componentByReference } from './support-revision-model.js';
import { compareLoadVectors, SUPPORT_REV_LOAD_POLICY_V1 } from './support-revision-loads.js';
import { pipeTokenChanges } from './support-revision-normalization.js';
import { assessRelocationEvidence } from './support-revision-relocation.js';

export const SUPPORT_REVISION_EVENT_LEDGER_SCHEMA = 'support-revision-event-ledger/v2-relocation';
const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();

export function buildSupportRevisionEventLedger(sourceModel, targetModel, lineage, options = {}) {
  const policy = options.policy || {};
  const policyId = policy.policyId || options.policyId || 'SUPPORT_REV_COMPARE_POLICY_V1';
  const policyVersion = policy.version || options.policyVersion || '';
  const makeEvent = eventFactory({ profileId: sourceModel.profileId, profileVersion: sourceModel.profileVersion, policyId, policyVersion });
  const events = [];
  for (const edge of lineage.edges) events.push(...eventsForEdge(edge, sourceModel, targetModel, makeEvent, options.loadPolicy, lineage.coordinateFrame));
  for (const id of lineage.removed) events.push(noSuccessorEvent(id, sourceModel, lineage, makeEvent));
  for (const id of lineage.added) events.push(noPredecessorEvent(id, targetModel, lineage, makeEvent));
  events.push(...ambiguousEvents(lineage, sourceModel, makeEvent));
  return Object.freeze({ schema: SUPPORT_REVISION_EVENT_LEDGER_SCHEMA, profileId: sourceModel.profileId, profileVersion: sourceModel.profileVersion, policyId, policyVersion, events: Object.freeze(events), summary: summarize(events) });
}

function noSuccessorEvent(id, sourceModel, lineage, makeEvent) {
  const candidateIds = candidateEvidenceIds(lineage, 'source', id);
  return makeEvent('SUPPORT_LOCATION_REMOVED', sourceModel.locationByNodeId.get(id), null, null, { remarkEligible: true, matchingMethod: 'candidate-exhaustion', candidateIds, reasonCodes: ['NO_LINEAGE_SUCCESSOR'] });
}
function noPredecessorEvent(id, targetModel, lineage, makeEvent) {
  const candidateIds = candidateEvidenceIds(lineage, 'target', id);
  return makeEvent('SUPPORT_LOCATION_ADDED', null, targetModel.locationByNodeId.get(id), null, { remarkEligible: false, matchingMethod: 'candidate-exhaustion', candidateIds, reasonCodes: ['NO_LINEAGE_PREDECESSOR'] });
}
function candidateEvidenceIds(lineage, side, nodeId) {
  const field = side === 'target' ? 'targetNodeId' : 'sourceNodeId';
  return Object.freeze((lineage?.candidates || []).filter((item) => item[field] === nodeId).map((item) => item.candidateId));
}

function eventsForEdge(edge, sourceModel, targetModel, makeEvent, loadPolicy, coordinateFrame) {
  const sources = edge.sourceNodeIds.map((id) => sourceModel.locationByNodeId.get(id)).filter(Boolean);
  const targets = edge.targetNodeIds.map((id) => targetModel.locationByNodeId.get(id)).filter(Boolean);
  if (edge.cardinality === '1->1') return compareOneToOne(sources[0], targets[0], edge, makeEvent, loadPolicy, coordinateFrame);
  if (edge.cardinality === '1->N') return targets.flatMap((target) => replicationEvents(sources[0], target, edge, makeEvent, loadPolicy, coordinateFrame));
  if (edge.cardinality === 'N->1') return [makeEvent('COMMON_SUPPORT_CONSOLIDATED', sources[0], targets[0], edge, { remarkEligible: false, reasonCodes: ['STRUCTURAL_COMMON_SUPPORT_EVIDENCE'] })];
  const reviewed = edge.reviewDecision === 'ACCEPTED';
  return [makeEvent('AMBIGUOUS_LINEAGE', sources[0], targets[0], edge, { remarkEligible: false, auditStatus: reviewed ? 'REVIEWED_ACCEPTED' : 'REVIEW_REQUIRED', reasonCodes: reviewed ? ['N_TO_M_REVIEW_ACCEPTED', ...(edge.reasonCodes || [])] : ['N_TO_M_REQUIRES_REVIEW'] })];
}

function compareOneToOne(source, target, edge, makeEvent, loadPolicy, coordinateFrame) {
  if (!source || !target) return [];
  const events = [];
  const familyChanged = upper(source.family) !== upper(target.family);
  if (familyChanged) events.push(makeEvent('SECONDARY_SUPPORT_FAMILY_CHANGED', source, target, edge, { remarkEligible: true, normalizedState: { beforeFamily: source.family, afterFamily: target.family }, reasonCodes: ['PROVEN_LINEAGE_DIFFERENT_FAMILY'] }));
  if (source.familyClass && target.familyClass && upper(source.familyClass) !== upper(target.familyClass)) events.push(makeEvent('SECONDARY_FAMILY_CLASS_CHANGED', source, target, edge, { remarkEligible: false, normalizedState: { beforeClass: source.familyClass, afterClass: target.familyClass } }));
  const pipeChanges = pipeTokenChanges(source.pipe, target.pipe);
  if (pipeChanges.length) {
    const lineIdentityChanged = !familyChanged && edge.outcome === 'DETERMINISTIC' && upper(source.pipe?.normalizedCore) !== upper(target.pipe?.normalizedCore);
    events.push(makeEvent('PIPE_IDENTITY_CHANGED', source, target, edge, {
      remarkEligible: lineIdentityChanged,
      normalizedState: { before: source.pipe.normalizedFull, after: target.pipe.normalizedFull, tokenChanges: pipeChanges, projection: lineIdentityChanged ? 'LINE_NUMBER_CHANGE' : 'AUDIT_ONLY' },
      reasonCodes: lineIdentityChanged ? ['PROVEN_LINEAGE_PIPE_IDENTITY_CHANGED','LINE_NUMBER_CHANGE'] : ['PIPE_TOKEN_DELTA_AUDIT_ONLY'],
    }));
  }
  events.push(...relocationEvents(source, target, edge, coordinateFrame, makeEvent, 'SUPPORT_LOCATION_RELOCATED'));
  events.push(...compareComponents(source, target, edge, makeEvent));
  events.push(...compareLoads(source, target, edge, makeEvent, loadPolicy));
  events.push(...suppressedFieldEvents(source, target, edge, makeEvent));
  return events;
}

function replicationEvents(source, target, edge, makeEvent, loadPolicy, coordinateFrame) {
  if (!source || !target) return [];
  const events = [makeEvent('COMMON_SUPPORT_REPLICATED', source, target, edge, { remarkEligible: true, reasonCodes: ['STRUCTURAL_COMMON_SUPPORT_EVIDENCE'] })];
  const shared = source.persistentReferences.filter((ref) => target.persistentReferences.includes(ref));
  if (shared.length) {
    events.push(...relocationEvents(source, target, edge, coordinateFrame, makeEvent, 'COMMON_SUPPORT_ANCHOR_RELOCATED', {
      persistentReferences: shared,
      reasonCodes: ['PERSISTENT_REFERENCE_ANCHOR'],
    }));
    events.push(...compareComponents(source, target, edge, makeEvent));
  }
  events.push(...compareLoads(source, target, edge, makeEvent, loadPolicy));
  return events;
}

function relocationEvents(source, target, edge, coordinateFrame, makeEvent, type, options = {}) {
  const assessment = assessRelocationEvidence(source, target, edge, coordinateFrame);
  if (!assessment.relocated) return [];
  return [makeEvent(type, source, target, edge, {
    remarkEligible: true,
    persistentReferences: options.persistentReferences || edge.persistentReferences || [],
    coordinateResidual: assessment.coordinate,
    normalizedState: {
      coordinateClassification: assessment.coordinate.classification,
      frameStatus: assessment.frameStatus,
      frameTrusted: assessment.frameTrusted,
      frameAnchorCount: assessment.anchorCount,
      frameMinimumAnchors: assessment.minimumAnchors,
      validatedAxes: assessment.validatedAxes,
    },
    reasonCodes: [...(options.reasonCodes || []), ...assessment.reasonCodes],
  })];
}

export function compareComponents(source, target, edge, makeEvent) {
  const before = componentByReference(source), after = componentByReference(target);
  const beforeRefs = [...before.keys()].sort(), afterRefs = [...after.keys()].sort();
  const removed = beforeRefs.filter((ref) => !after.has(ref)), added = afterRefs.filter((ref) => !before.has(ref));
  const events = [];
  if (removed.length || added.length) events.push(makeEvent('SUPPORT_COMPONENT_SET_CHANGED', source, target, edge, { remarkEligible: true, persistentReferences: [...new Set([...removed, ...added, ...(edge.persistentReferences || [])])], normalizedState: { removedReferences: removed, addedReferences: added, beforeReferences: beforeRefs, afterReferences: afterRefs }, reasonCodes: ['PERSISTENT_REFERENCE_SET_DELTA'] }));
  for (const ref of beforeRefs.filter((item) => after.has(item))) events.push(...sameReferenceEvents(before.get(ref), after.get(ref), source, target, edge, makeEvent));
  if (!beforeRefs.length && !afterRefs.length && multisetKey(source.components) !== multisetKey(target.components)) events.push(makeEvent('SUPPORT_COMPONENT_SET_CHANGED', source, target, edge, { remarkEligible: true, normalizedState: { beforeTypeMultiset: multiset(source.components), afterTypeMultiset: multiset(target.components) }, reasonCodes: ['REFERENCE_UNAVAILABLE','SUPPORT_TYPE_MULTISET_CHANGED'] }));
  return events;
}

function sameReferenceEvents(before, after, source, target, edge, makeEvent) {
  const events = [];
  if (clean(before.memberId) !== clean(after.memberId)) events.push(makeEvent('PRIMARY_MEMBER_RENUMBERED', source, target, edge, { remarkEligible: false, persistentReferences: [before.reference], beforeRawState: componentRaw(before), afterRawState: componentRaw(after), normalizedState: { identity: 'SAME_COMPONENT', reference: before.reference, beforeMemberId: before.memberId, afterMemberId: after.memberId }, reasonCodes: ['PERSISTENT_REFERENCE_UNCHANGED','MEMBER_ID_CHANGED'], trace: componentTrace(before, after) }));
  if (upper(before.supportType) !== upper(after.supportType)) events.push(makeEvent('SUPPORT_COMPONENT_TYPE_CHANGED', source, target, edge, { remarkEligible: true, persistentReferences: [before.reference], beforeRawState: componentRaw(before), afterRawState: componentRaw(after), normalizedState: { reference: before.reference, beforeType: before.supportTypeKey, afterType: after.supportTypeKey }, reasonCodes: ['PERSISTENT_REFERENCE_UNCHANGED','SUPPORT_TYPE_CHANGED'], trace: componentTrace(before, after) }));
  return events;
}

function compareLoads(source, target, edge, makeEvent, loadPolicy = SUPPORT_REV_LOAD_POLICY_V1) {
  const result = compareLoadVectors(source.loads, target.loads, loadPolicy);
  if (result.classification === 'UNCHANGED') return [];
  const type = result.classification === 'LOAD_BECAME_NUMERIC' ? 'LOAD_BECAME_NUMERIC' : 'LOAD_SIGNATURE_CHANGED';
  return [makeEvent(type, source, target, edge, { remarkEligible: true, beforeRawState: result.before, afterRawState: result.after, normalizedState: { beforeState: result.before.state, afterState: result.after.state }, loadDeltas: result.deltas, loadPolicyId: loadPolicy.policyId, loadPolicyVersion: loadPolicy.version, reasonCodes: [result.classification], trace: loadTrace(result) })];
}

function suppressedFieldEvents(source, target, edge, makeEvent) {
  return [['pipeSchedule','PIPE SCHEDULE'],['insulation','INSULATION'],['stressSystemNumber','STRESS SYSTEM NUMBER'],['nodeNo','NODE NO']].flatMap(([field, header]) => clean(source.sourceFields?.[field]) === clean(target.sourceFields?.[field]) ? [] : [makeEvent('SUPPRESSED_FIELD_CHANGED', source, target, edge, { remarkEligible: false, beforeRawState: { field: header, value: clean(source.sourceFields?.[field]) }, afterRawState: { field: header, value: clean(target.sourceFields?.[field]) }, normalizedState: { field: header }, reasonCodes: ['DETAILED_AUDIT_ONLY'] })]);
}

function ambiguousEvents(lineage, sourceModel, makeEvent) {
  const sourceIds = [...new Set(lineage.candidates.filter((item) => item.outcome === 'AMBIGUOUS').map((item) => item.sourceNodeId))];
  return sourceIds.map((id) => makeEvent('AMBIGUOUS_LINEAGE', sourceModel.locationByNodeId.get(id), null, null, { remarkEligible: false, auditStatus: 'REVIEW_REQUIRED', matchingMethod: 'candidate-review', candidateIds: candidateEvidenceIds(lineage, 'source', id), reasonCodes: ['MULTIPLE_CANDIDATES_WITHIN_AMBIGUITY_MARGIN'], normalizedState: { candidates: lineage.candidates.filter((item) => item.sourceNodeId === id && item.outcome === 'AMBIGUOUS').map((item) => ({ candidateId: item.candidateId, targetNodeId: item.targetNodeId, score: item.score })) } }));
}

function eventFactory(metadata) {
  let index = 0;
  return (type, source, target, edge, patch = {}) => Object.freeze({
    eventId: `support-event:${String(++index).padStart(5,'0')}`, type,
    sourceXmlNode: source?.nodeId || null, targetXmlNode: target?.nodeId || null,
    sourceCsvRowId: source?.sourceRowId || null, targetCsvRowId: target?.sourceRowId || null,
    beforeRawState: patch.beforeRawState ?? rawLocation(source), afterRawState: patch.afterRawState ?? rawLocation(target),
    normalizedState: patch.normalizedState ?? null, matchingMethod: patch.matchingMethod || edge?.matchingMethod || 'none',
    reasonCodes: Object.freeze([...(patch.reasonCodes || edge?.reasonCodes || [])]), persistentReferences: Object.freeze([...(patch.persistentReferences || edge?.persistentReferences || [])]),
    coordinateResidual: patch.coordinateResidual || coordinateEvidence(edge, source, target), loadDeltas: Object.freeze([...(patch.loadDeltas || [])]),
    profileId: metadata.profileId, profileVersion: metadata.profileVersion, policyId: metadata.policyId, policyVersion: metadata.policyVersion,
    loadPolicyId: patch.loadPolicyId || null, loadPolicyVersion: patch.loadPolicyVersion || null,
    auditStatus: patch.auditStatus || (edge?.outcome === 'AMBIGUOUS' ? 'REVIEW_REQUIRED' : 'AUTO'), remarkEligible: Boolean(patch.remarkEligible),
    lineageEdgeId: patch.lineageEdgeId || edge?.edgeId || null, candidateIds: Object.freeze([...(patch.candidateIds || edge?.candidateIds || [])]),
    trace: patch.trace || locationTrace(source, target),
  });
}

function loadSlots(location) { return Array.isArray(location?.loads) ? location.loads : (location?.loads?.slots || []); }
function rawLocation(location) { return location ? { family: location.family, prevName: location.legacyIdentity, pipe: location.pipe.raw, position: Object.fromEntries(['x','y','z'].map((axis) => [axis, location.position?.[axis]?.raw || ''])), components: location.components.map(componentRaw), loads: loadSlots(location).map((slot) => ({ sourceHeader: slot.sourceHeader, ordinal: slot.ordinal, raw: slot.raw ?? slot.fields?.raw ?? '' })) } : null; }
function componentRaw(item) { return { reference: item.reference, memberId: item.memberId, supportType: item.supportType }; }
function componentTrace(a,b) { return { sourceNodeId: a.nodeId, targetNodeId: b.nodeId, sourceCells: a.provenance, targetCells: b.provenance }; }
function loadTrace(result) { return { sourceCells: result.before.slots.map((item) => item.sourceCellRef).filter(Boolean), targetCells: result.after.slots.map((item) => item.sourceCellRef).filter(Boolean) }; }
function locationTrace(source,target) { return { sourceNodeId: source?.nodeId || null, targetNodeId: target?.nodeId || null, sourceRowId: source?.sourceRowId || null, targetRowId: target?.sourceRowId || null, sourceCells: source?.provenance?.cells || {}, targetCells: target?.provenance?.cells || {} }; }
function coordinateEvidence(edge, source, target) { return edge?.coordinateEvidence?.find((item) => item.sourceNodeId === source?.nodeId && item.targetNodeId === target?.nodeId) || null; }
function multiset(components) { const result = {}; for (const key of components.map((item) => item.supportTypeKey).filter(Boolean).sort()) result[key] = (result[key] || 0) + 1; return result; }
function multisetKey(components) { return JSON.stringify(multiset(components)); }
function summarize(events) { const byType = {}; for (const event of events) byType[event.type] = (byType[event.type] || 0) + 1; return Object.freeze({ total: events.length, remarkEligible: events.filter((event) => event.remarkEligible).length, reviewRequired: events.filter((event) => event.auditStatus === 'REVIEW_REQUIRED').length, byType: Object.freeze(byType) }); }

export const _test = Object.freeze({ multiset, multisetKey, summarize, rawLocation, eventsForEdge, candidateEvidenceIds, relocationEvents, loadSlots });
