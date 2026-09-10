export const SUPPORT_REV_REMARKS_V1 = Object.freeze({
  policyId: 'SUPPORT_REV_REMARKS_V1',
  version: '1.0.0',
  precedence: Object.freeze([
    'REMOVED_REPLACED',
    'REMOVED_UNSUPPORTED',
    'PREVIOUS_FAMILY_LINE',
    'LINE_NUMBER_CHANGE',
    'COMMON_REPLICATED',
    'COMMON_RELOCATED',
    'SUPPORT_TYPE_CHANGES',
    'LOAD_STANDARDISED',
    'LOAD_CHANGE',
  ]),
});

export function renderSupportRevisionRemarks(ledger, sourceModel, targetModel, policy = SUPPORT_REV_REMARKS_V1) {
  const sourceTokens = new Map(), targetTokens = new Map();
  const trace = [];
  for (const event of ledger?.events || []) {
    if (!event.remarkEligible) continue;
    for (const projection of projectEvent(event, sourceModel, targetModel)) {
      const map = projection.side === 'source' ? sourceTokens : targetTokens;
      if (!map.has(projection.rowId)) map.set(projection.rowId, []);
      const rows = map.get(projection.rowId);
      if (!rows.some((item) => item.key === projection.key)) rows.push(Object.freeze({ ...projection, eventId: event.eventId }));
      trace.push(Object.freeze({ eventId: event.eventId, side: projection.side, rowId: projection.rowId, tokenKey: projection.key, token: projection.text, sourceXmlNode: event.sourceXmlNode, targetXmlNode: event.targetXmlNode, lineageEdgeId: event.lineageEdgeId, candidateIds: event.candidateIds, eventTrace: event.trace }));
    }
  }
  return Object.freeze({
    schema: 'support-revision-remark-render/v1',
    policyId: policy.policyId,
    sourceRemarks: freezeRemarkMap(sourceTokens, policy),
    targetRemarks: freezeRemarkMap(targetTokens, policy),
    trace: Object.freeze(trace),
  });
}

function projectEvent(event, sourceModel, targetModel) {
  const source = sourceModel?.locationByNodeId?.get(event.sourceXmlNode) || null;
  const target = targetModel?.locationByNodeId?.get(event.targetXmlNode) || null;
  if (event.type === 'COMMON_SUPPORT_REPLICATED' && target) return [token('target', target.sourceRowId, 'COMMON_REPLICATED', 'Replicated due to Common support')];
  if (event.type === 'COMMON_SUPPORT_ANCHOR_RELOCATED' && target) return [token('target', target.sourceRowId, 'COMMON_RELOCATED', 'Relocated Support')];
  if ((event.type === 'SUPPORT_COMPONENT_SET_CHANGED' || event.type === 'SUPPORT_COMPONENT_TYPE_CHANGED') && target) return [token('target', target.sourceRowId, 'SUPPORT_TYPE_CHANGES', 'Support Type Changes')];
  if (event.type === 'LOAD_BECAME_NUMERIC' && target) return [token('target', target.sourceRowId, 'LOAD_STANDARDISED', 'load standardised')];
  if (event.type === 'LOAD_SIGNATURE_CHANGED' && target) return [token('target', target.sourceRowId, 'LOAD_CHANGE', 'Load change')];
  if (event.type === 'PIPE_IDENTITY_CHANGED' && event.normalizedState?.projection === 'LINE_NUMBER_CHANGE' && source && target) {
    return [token('target', target.sourceRowId, 'LINE_NUMBER_CHANGE', `Line No. Change(Old Line No. ${source.pipe.raw})`)];
  }
  if (event.type === 'SUPPORT_LOCATION_REMOVED' && source) return [token('source', source.sourceRowId, 'REMOVED_UNSUPPORTED', 'Invalid Support, This pipe no longer supported')];
  if (event.type === 'SECONDARY_SUPPORT_FAMILY_CHANGED' && source && target) {
    const ref = event.persistentReferences?.[0] || source.persistentReferences?.[0] || '';
    const previous = ref ? `${source.family}(${ref})` : source.family;
    return [
      token('source', source.sourceRowId, 'REMOVED_REPLACED', `Invalid Support, replaced by ${target.family}`),
      token('target', target.sourceRowId, 'PREVIOUS_FAMILY_LINE', `PS No./Line No. Change Earlier:${previous}`),
    ];
  }
  return [];
}

function token(side, rowId, key, text) { return Object.freeze({ side, rowId, key, text }); }

function freezeRemarkMap(map, policy) {
  const rank = new Map(policy.precedence.map((key, index) => [key, index]));
  return Object.freeze(Object.fromEntries([...map.entries()].map(([rowId, tokens]) => {
    const ordered = [...tokens].sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999) || a.key.localeCompare(b.key));
    return [rowId, Object.freeze({ remark: ordered.map((item) => item.text).join(', '), tokens: Object.freeze(ordered) })];
  })));
}

export const _test = Object.freeze({ projectEvent, freezeRemarkMap });
