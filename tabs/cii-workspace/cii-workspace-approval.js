function explicitDecision(row, decisions) {
  const current = decisions?.get?.(row?.correspondenceId);
  if (current) return current;
  if (row?.decision === 'ACCEPTED') return 'ACCEPT';
  if (row?.decision === 'REJECTED') return 'REJECT';
  if (row?.decision === 'LOCKED') return 'LOCK';
  return '';
}

export function ciiApprovalStatus(row, decisions) {
  const value = explicitDecision(row, decisions);
  if (value === 'ACCEPT') return 'APPROVED';
  if (value === 'LOCK') return 'LOCKED';
  if (value === 'REJECT') return 'REJECTED';
  return 'PENDING';
}

export function applyCiiBulkAcceptance(rows, decisions, confidence) {
  const accepted = [];
  for (const row of rows || []) {
    if (row?.confidence !== confidence) continue;
    if (row?.identityBound !== true) continue;
    if (row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') continue;
    if (!row?.correspondenceId) continue;
    decisions.set(row.correspondenceId, 'ACCEPT');
    accepted.push(row.correspondenceId);
  }
  return Object.freeze(accepted);
}

export function ciiDecisionValue(row, decisions) {
  return explicitDecision(row, decisions);
}
