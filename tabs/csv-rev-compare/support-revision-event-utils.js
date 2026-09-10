import { compareLoadVectors, pipeTokenChanges } from './support-revision-normalization.js';
import { componentByReference } from './support-revision-model.js';

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();

export function createEventFactory(policy, profileId = 'support-revision-csv-xml/v1') {
  let index = 0;
  return (type, source, target, edge = null, patch = {}) => Object.freeze({
    eventId: `support-event:${String(++index).padStart(5, '0')}`,
    type,
    sourceXmlNode: source?.nodeId || null,
    targetXmlNode: target?.nodeId || null,
    sourceCsvRowId: source?.sourceRowId || null,
    targetCsvRowId: target?.sourceRowId || null,
    beforeRawState: patch.beforeRawState ?? rawLocationState(source),
    afterRawState: patch.afterRawState ?? rawLocationState(target),
    normalizedState: patch.normalizedState ?? null,
    matchingMethod: patch.matchingMethod || edge?.matchingMethod || 'none',
    reasonCodes: Object.freeze([...(patch.reasonCodes || edge?.reasonCodes || [])]),
    persistentReferences: Object.freeze([...(patch.persistentReferences || edge?.persistentReferences || [])]),
    coordinateResidual: patch.coordinateResidual || coordinateEvidenceFor(edge, source, target),
    loadDeltas: Object.freeze([...(patch.loadDeltas || [])]),
    profileVersion: profileId,
    policyVersion: policy.policyId,
    auditStatus: patch.auditStatus || (edge?.outcome === 'AMBIGUOUS' ? 'REVIEW_REQUIRED' : 'AUTO'),
    remarkEligible: Boolean(patch.remarkEligible),
    lineageEdgeId: edge?.edgeId || null,
    candidateIds: Object.freeze([...(edge?.candidateIds || [])]),
    trace: patch.trace || locationTrace(source, target),
  });
}

export function compareOneToOne(source, target, edge, policy, makeEvent) {
  const events = [];
  if (upper(source.family) !== upper(target.family)) events.push(makeEvent('SECONDARY_SUPPORT_FAMILY_CHANGED', source, target, edge, {
    remarkEligible: true,
    normalizedState: { beforeFamily: source.family, afterFamily: target.family },
    reasonCodes: ['PROVEN_LINEAGE_DIFFERENT_FAMILY'],
  }));
  if (source.familyClass && target.familyClass && upper(source.familyClass) !== upper(target.familyClass)) events.push(makeEvent('SECONDARY_FAMILY_CLASS_CHANGED', source, target, edge, {
    remarkEligible: false,
    normalizedState: { beforeClass: source.familyClass, afterClass: target.familyClass },
  }));
  const pipeChanges = pipeTokenChanges(source.pipe, target.pipe);
  if (pipeChanges.length) events.push(makeEvent('PIPE_IDENTITY_CHANGED', source, target, edge, {
    remarkEligible: false,
    normalizedState: { before: source.pipe.normalizedFull, after: target.pipe.normalizedFull, tokenChanges: pipeChanges },
  }));
  events.push(...compareComponents(source, target, edge, makeEvent));
  events.push(...compareLoads(source, target, edge, policy, makeEvent));
  events.push(...compareSuppressedFields(source, target, edge, makeEvent));
  return events;
}

export function compareComponents(source, target, edge, makeEvent) {
  const events = [];
  const before = componentByReference(source), after = componentByReference(target);
  const beforeRefs = [...before.keys()].sort(), afterRefs = [...after.keys()].sort();
  const removed = beforeRefs.filter((ref) => !after.has(ref));
  const added = afterRefs.filter((ref) => !before.has(ref));
  if (removed.length || added.length) events.push(makeEvent('SUPPORT_COMPONENT_SET_CHANGED', source, target, edge, {
    remarkEligible: true,
    persistentReferences: [...new Set([...removed, ...added, ...(edge?.persistentReferences || [])])],
    normalizedState: { removedReferences: removed, addedReferences: added, beforeReferences: beforeRefs, afterReferences: afterRefs },
    reasonCodes: ['PERSISTENT_REFERENCE_SET_DELTA'],
  }));
  for (const ref of beforeRefs.filter((item) => after.has(item))) {
    const a = before.get(ref), b = after.get(ref);
    if (clean(a.memberId) !== clean(b.memberId)) events.push(makeEvent('PRIMARY_MEMBER_RENUMBERED', source, target, edge, {
      remarkEligible: false,
      persistentReferences: [ref],
      beforeRawState: { reference: ref, memberId: a.memberId, supportType: a.supportType },
      afterRawState: { reference: ref, memberId: b.memberId, supportType: b.supportType },
      normalizedState: { identity: 'SAME_COMPONENT', reference: ref, beforeMemberId: a.memberId, afterMemberId: b.memberId },
      reasonCodes: ['PERSISTENT_REFERENCE_UNCHANGED', 'MEMBER_ID_CHANGED'],
      trace: componentTrace(a, b),
    }));
    if (upper(a.supportType) !== upper(b.supportType)) events.push(makeEvent('SUPPORT_COMPONENT_TYPE_CHANGED', source, target, edge, {
      remarkEligible: true,
      persistentReferences: [ref],
      beforeRawState: { reference: ref, supportType: a.supportType },
      afterRawState: { reference: ref, supportType: b.supportType },
      normalizedState: { reference: ref, beforeType: a.supportTypeKey, afterType: b.supportTypeKey },
      reasonCodes: ['PERSISTENT_REFERENCE_UNCHANGED', 'SUPPORT_TYPE_CHANGED'],
      trace: componentTrace(a, b),
    }));
  }
  if (!beforeRefs.length && !afterRefs.length && multisetKey(source.components) !== multisetKey(target.components)) events.push(makeEvent('SUPPORT_COMPONENT_SET_CHANGED', source, target, edge, {
    remarkEligible: true,
    normalizedState: { beforeTypeMultiset: multiset(source.components), afterTypeMultiset: multiset(target.components) },
    reasonCodes: ['REFERENCE_UNAVAILABLE', 'SUPPORT_TYPE_MULTISET_CHANGED'],
  }));
  return events;
}

export function compareLoads(source, target, edge, policy, makeEvent) {
  const result = compareLoadVectors(source.loads, target.loads, policy);
  if (result.classification === 'UNCHANGED') return [];
  const type = result.classification === 'LOAD_BECAME_NUMERIC' ? 'LOAD_BECAME_NUMERIC' : 'LOAD_SIGNATURE_CHANGED';
  return [makeEvent(type, source, target, edge, {
    remarkEligible: true,
    beforeRawState: result.before,
    afterRawState: result.after,
    normalizedState: { beforeState: result.before.state, afterState: result.after.state },
    loadDeltas: result.deltas,
    reasonCodes: [result.classification],
    trace: loadTrace(source, target),
  })];
}

function compareSuppressedFields(source, target, edge, makeEvent) {
  const fields = [['pipeSchedule', 'PIPE SCHEDULE'], ['insulation', 'INSULATION'], ['stressSystemNumber', 'STRESS SYSTEM NUMBER'], ['nodeNo', 'NODE NO']];
  return fields.flatMap(([field, header]) => clean(source.sourceFields?.[field]) === clean(target.sourceFields?.[field]) ? [] : [makeEvent('SUPPRESSED_FIELD_CHANGED', source, target, edge, {
    remarkEligible: false,
    beforeRawState: { field: header, value: clean(source.sourceFields?.[field]) },
    afterRawState: { field: header, value: clean(target.sourceFields?.[field]) },
    normalizedState: { field: header },
    reasonCodes: ['DETAILED_AUDIT_ONLY'],
  })]);
}

function multiset(components) {
  const out = {};
  for (const value of components.map((item) => item.supportTypeKey).filter(Boolean).sort()) out[value] = (out[value] || 0) + 1;
  return out;
}
function multisetKey(components) { return JSON.stringify(multiset(components)); }
function rawLocationState(location) {
  if (!location) return null;
  return { family: location.family, prevName: location.legacyIdentity, pipe: location.pipe.raw, position: Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, location.position?.[axis]?.raw || ''])), components: location.components.map((c) => ({ reference: c.reference, memberId: c.memberId, supportType: c.supportType })), loads: location.loads.slots.map((s) => ({ sourceHeader: s.sourceHeader, ordinal: s.ordinal, raw: s.raw })) };
}
function coordinateEvidenceFor(edge, source, target) { return edge?.coordinateEvidence?.find((row) => row.sourceNodeId === source?.nodeId && row.targetNodeId === target?.nodeId) || null; }
function locationTrace(source, target) { return { sourceNodeId: source?.nodeId || null, targetNodeId: target?.nodeId || null, sourceRowId: source?.sourceRowId || null, targetRowId: target?.sourceRowId || null, sourceCells: source?.provenance?.cells || {}, targetCells: target?.provenance?.cells || {} }; }
function componentTrace(a, b) { return { sourceNodeId: a?.nodeId || null, targetNodeId: b?.nodeId || null, sourceCells: a?.provenance || {}, targetCells: b?.provenance || {} }; }
function loadTrace(source, target) { return { sourceNodeId: source.nodeId, targetNodeId: target.nodeId, sourceCells: source.loads.slots.map((s) => s.sourceCellRef).filter(Boolean), targetCells: target.loads.slots.map((s) => s.sourceCellRef).filter(Boolean) }; }

export const _test = Object.freeze({ multiset, multisetKey, rawLocationState });
