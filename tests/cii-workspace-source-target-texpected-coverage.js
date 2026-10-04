function text(value) { return String(value ?? '').trim(); }
function auditRowsForTarget(audit, targetNodeId) {
  const wanted = text(targetNodeId);
  return (audit?.rows || []).filter((row) => (row?.targetNodeIds || []).map(text).includes(wanted));
}

export function ciiSourceTargetKnownPositiveCoverage(audit, expectedDeltaRows) {
  const rows = (expectedDeltaRows || []).map((delta) => {
    const matches = auditRowsForTarget(audit, delta?.nodeId);
    const statuses = [...new Set(matches.map((row) => text(row?.status)).filter(Boolean))].sort();
    return Object.freeze({
      targetNodeId: text(delta?.nodeId),
      action: text(delta?.action),
      beforeNodeName: text(delta?.oldValue),
      partialExpectedNodeName: text(delta?.newValue),
      sourceAuditRowIds: Object.freeze(matches.map((row) => text(row?.auditRowId)).filter(Boolean).sort()),
      sourceIds: Object.freeze([...new Set(matches.map((row) => text(row?.sourceId)).filter(Boolean))].sort()),
      statuses: Object.freeze(statuses),
      covered: matches.length > 0,
      bound: matches.some((row) => row?.status === 'BOUND'),
      reviewOnly: matches.length > 0 && !matches.some((row) => row?.status === 'BOUND'),
    });
  });
  return Object.freeze({
    schema: 'CIIWorkspaceSourceTargetKnownPositiveCoverage.v1',
    authority: 'TEST_ONLY_PARTIAL_TEXPECTED_KNOWN_POSITIVE',
    expectedTargetNodeCount: rows.length,
    coveredTargetNodeCount: rows.filter((row) => row.covered).length,
    boundTargetNodeCount: rows.filter((row) => row.bound).length,
    reviewOnlyTargetNodeCount: rows.filter((row) => row.reviewOnly).length,
    missingTargetNodeCount: rows.filter((row) => !row.covered).length,
    missingTargetNodeIds: Object.freeze(rows.filter((row) => !row.covered).map((row) => row.targetNodeId)),
    rows: Object.freeze(rows),
  });
}

export const _test = Object.freeze({ auditRowsForTarget });
