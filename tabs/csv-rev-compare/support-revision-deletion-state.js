const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();

export const SUPPORT_REV_DELETION_STATE_EVENT = 'SUPPORT_DELETED_IN_LATEST_REPORT';
export const SUPPORT_REV_DELETION_STATE_SCHEMA = 'support-revision-target-deletion-state/v1';
const SUPPORT_DELETED_MARKER = 'SUPPORT DELETED';

/**
 * A later-report deletion row is a retained target record, not a source tombstone.
 * It is admitted only when XML lineage already proves exact Civil+PIPE continuity,
 * persistent component references corroborate the predecessor, the earlier row has
 * reportable position evidence, the later row has no numeric position, PREV NAME is
 * blank, and a non-remark report-state slot carries the explicit SUPPORT DELETED marker.
 *
 * REMARKS (IF ANY) is deliberately absent from this detector and remains oracle-only.
 */
export function augmentDeletionStateEvents(ledger, sourceModel, targetModel, lineage) {
  const detections = deletionStatePairs(sourceModel, targetModel, lineage);
  if (!detections.length) return ledger;

  const terminalPairs = new Set(detections.map(({ source, target }) => pairKey(source.nodeId, target.nodeId)));
  const preserved = (ledger?.events || []).filter((event) => !terminalPairs.has(pairKey(event.sourceXmlNode, event.targetXmlNode)));
  let nextIndex = ledger?.events?.length || 0;
  const additions = detections.map(({ source, target, edge, assessment }) => Object.freeze({
    eventId: `support-event:${String(++nextIndex).padStart(5, '0')}`,
    type: SUPPORT_REV_DELETION_STATE_EVENT,
    sourceXmlNode: source.nodeId,
    targetXmlNode: target.nodeId,
    sourceCsvRowId: source.sourceRowId || null,
    targetCsvRowId: target.sourceRowId || null,
    beforeRawState: rawDeletionState(source),
    afterRawState: rawDeletionState(target),
    normalizedState: Object.freeze({
      schema: SUPPORT_REV_DELETION_STATE_SCHEMA,
      sourceFiniteAxes: assessment.sourceFiniteAxes,
      targetFiniteAxes: assessment.targetFiniteAxes,
      targetPrevNameBlank: assessment.targetPrevNameBlank,
      markerFields: assessment.markerFields,
      sharedReferenceCount: assessment.sharedReferences.length,
    }),
    matchingMethod: edge.matchingMethod,
    reasonCodes: Object.freeze([
      'LATEST_REPORT_RETAINED_DELETION_ROW',
      'SUPPORT_LOCATION_IDENTITY_EXACT',
      'PERSISTENT_REFERENCE_CONTINUITY',
      'SOURCE_POSITION_PRESENT',
      'TARGET_POSITION_ABSENT',
      'TARGET_PREV_NAME_ABSENT',
      'NON_REMARK_SUPPORT_DELETED_MARKER',
    ]),
    persistentReferences: Object.freeze(assessment.sharedReferences),
    coordinateResidual: null,
    loadDeltas: Object.freeze([]),
    profileId: ledger.profileId,
    profileVersion: ledger.profileVersion,
    policyId: ledger.policyId,
    policyVersion: ledger.policyVersion,
    loadPolicyId: null,
    loadPolicyVersion: null,
    auditStatus: 'AUTO',
    remarkEligible: true,
    lineageEdgeId: edge.edgeId || null,
    candidateIds: Object.freeze([...(edge.candidateIds || [])]),
    trace: Object.freeze({
      sourceNodeId: source.nodeId,
      targetNodeId: target.nodeId,
      sourceRowId: source.sourceRowId || null,
      targetRowId: target.sourceRowId || null,
      sourceCells: source.provenance?.cells || {},
      targetCells: target.provenance?.cells || {},
      markerFields: assessment.markerFields,
    }),
  }));

  const events = Object.freeze([...preserved, ...additions]);
  return Object.freeze({
    ...ledger,
    schema: 'support-revision-event-ledger/v6-target-deletion-state',
    events,
    summary: summarize(events),
  });
}

export function assessTargetDeletionState(source, target, edge) {
  const exactIdentity = Boolean(source && target)
    && upper(source.supportLocationIdentity) === upper(target.supportLocationIdentity);
  const exactLineage = edge?.cardinality === '1->1'
    && edge?.outcome === 'DETERMINISTIC'
    && edge?.matchingMethod === 'civil-pipe-location-identity';
  const sourceFiniteAxes = finiteAxisCount(source?.position);
  const targetFiniteAxes = finiteAxisCount(target?.position);
  const targetPrevNameBlank = !clean(target?.legacyIdentity);
  const sharedReferences = Object.freeze((source?.persistentReferences || [])
    .filter((ref) => (target?.persistentReferences || []).includes(ref))
    .sort());
  const markerFields = Object.freeze(deletionMarkerFields(target));
  const deleted = exactIdentity
    && exactLineage
    && sourceFiniteAxes >= 2
    && targetFiniteAxes === 0
    && targetPrevNameBlank
    && sharedReferences.length > 0
    && (target?.components?.length || 0) > 0
    && markerFields.length > 0;

  return Object.freeze({
    schema: SUPPORT_REV_DELETION_STATE_SCHEMA,
    deleted,
    exactIdentity,
    exactLineage,
    sourceFiniteAxes,
    targetFiniteAxes,
    targetPrevNameBlank,
    sharedReferences,
    markerFields,
  });
}

function deletionStatePairs(sourceModel, targetModel, lineage) {
  const pairs = [];
  for (const edge of lineage?.edges || []) {
    if (edge.cardinality !== '1->1') continue;
    const source = sourceModel.locationByNodeId.get(edge.sourceNodeIds?.[0]);
    const target = targetModel.locationByNodeId.get(edge.targetNodeIds?.[0]);
    if (!source || !target) continue;
    const assessment = assessTargetDeletionState(source, target, edge);
    if (assessment.deleted) pairs.push(Object.freeze({ source, target, edge, assessment }));
  }
  return Object.freeze(pairs);
}

function deletionMarkerFields(target) {
  const candidates = [
    ['EAST/WEST', target?.position?.x?.raw],
    ['NORTH/SOUTH', target?.position?.y?.raw],
    ['BOP ELEVATION', target?.position?.z?.raw],
    ['TOTAL SUPPORT POINTS ON SECONDARY', target?.sourceFields?.totalSupportPoints],
  ];
  return candidates.flatMap(([field, value]) => upper(value) === SUPPORT_DELETED_MARKER
    ? [Object.freeze({ field, value: clean(value) })]
    : []);
}

function finiteAxisCount(position) {
  return ['x', 'y', 'z'].filter((axis) => Number.isFinite(position?.[axis]?.directedMm)).length;
}

function rawDeletionState(location) {
  if (!location) return null;
  return Object.freeze({
    family: location.family,
    pipe: location.pipe?.raw || '',
    prevName: location.legacyIdentity || '',
    position: Object.freeze(Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, location.position?.[axis]?.raw || '']))),
    totalSupportPoints: clean(location.sourceFields?.totalSupportPoints),
    persistentReferences: Object.freeze([...(location.persistentReferences || [])]),
  });
}

function pairKey(sourceNodeId, targetNodeId) {
  return `${clean(sourceNodeId)}\u0000${clean(targetNodeId)}`;
}

function summarize(events) {
  const byType = {};
  for (const event of events) byType[event.type] = (byType[event.type] || 0) + 1;
  return Object.freeze({
    total: events.length,
    remarkEligible: events.filter((event) => event.remarkEligible).length,
    reviewRequired: events.filter((event) => event.auditStatus === 'REVIEW_REQUIRED').length,
    byType: Object.freeze(byType),
  });
}

export const _test = Object.freeze({ deletionStatePairs, deletionMarkerFields, finiteAxisCount, pairKey, summarize });
