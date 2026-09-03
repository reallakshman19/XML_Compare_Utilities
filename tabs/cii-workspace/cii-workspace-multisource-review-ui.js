function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
function decisionFromRow(row) {
  if (row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') return 'LOCK';
  if (row?.decision === 'ACCEPTED') return 'ACCEPT';
  if (row?.decision === 'REJECTED') return 'REJECT';
  return '';
}
function effectiveDecision(row, decisions) {
  return decisions?.get?.(String(row?.correspondenceId || '')) || decisionFromRow(row);
}
function reviewRows(preview) { return preview?.compareReview?.rows || []; }
function filterRow(row, filters = {}) {
  const confidence = String(filters.confidence || 'ALL');
  if (confidence !== 'ALL') {
    if (confidence === 'LOCKED') {
      if (row?.decision !== 'LOCKED' && row?.workflowStatus !== 'LOCKED') return false;
    } else if (row?.confidence !== confidence) return false;
  }
  if (filters.changedOnly && !row?.changeCount) return false;
  const search = String(filters.search || '').trim().toLowerCase();
  if (!search) return true;
  const haystack = [row?.sourceId, row?.source, row?.target, row?.kind, row?.confidence, ...(row?.changeFamilies || [])].join(' ').toLowerCase();
  return haystack.includes(search);
}
function decisionControl(row, decisions) {
  const current = effectiveDecision(row, decisions);
  if (row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') return '<span class="ciiw-pill">LOCKED</span>';
  return `<select data-ciiw-ms-decision="${h(row?.correspondenceId)}"><option value="">Review…</option><option value="LOCK" ${current === 'LOCK' ? 'selected' : ''}>Lock</option><option value="ACCEPT" ${current === 'ACCEPT' ? 'selected' : ''}>Accept</option><option value="REJECT" ${current === 'REJECT' ? 'selected' : ''}>Reject</option></select>`;
}

export function seedCiiMultiSourceReviewDecisions(preview, decisions = new Map()) {
  decisions.clear();
  for (const row of reviewRows(preview)) {
    const value = decisionFromRow(row);
    if (value) decisions.set(String(row.correspondenceId), value);
  }
  return decisions;
}

export function ciiMultiSourceReviewBySource(preview, decisions) {
  const result = {};
  for (const row of reviewRows(preview)) {
    const sourceId = String(row?.sourceId || ''); const memberId = String(row?.memberCorrespondenceId || '');
    if (!sourceId || !memberId) continue;
    if (!result[sourceId]) result[sourceId] = { reviewedCorrespondenceIds: [], lockedCorrespondenceIds: [], rejectedCorrespondenceIds: [] };
    const decision = effectiveDecision(row, decisions);
    if (decision === 'LOCK') result[sourceId].lockedCorrespondenceIds.push(memberId);
    else if (decision === 'ACCEPT') result[sourceId].reviewedCorrespondenceIds.push(memberId);
    else if (decision === 'REJECT') result[sourceId].rejectedCorrespondenceIds.push(memberId);
  }
  return result;
}

export function bulkAcceptCiiMultiSourceReview(preview, decisions, confidence) {
  let count = 0;
  for (const row of reviewRows(preview)) {
    if (row?.confidence !== confidence || !row?.identityBound || row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') continue;
    decisions.set(String(row.correspondenceId), 'ACCEPT'); count += 1;
  }
  return count;
}

export function ciiMultiSourceLockedReviewCount(preview) {
  return reviewRows(preview).filter((row) => row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED').length;
}

export function ciiMultiSourceBulkAcceptOutcome(preview, decisions, confidence) {
  const label = String(confidence || '').toUpperCase();
  const count = bulkAcceptCiiMultiSourceReview(preview, decisions, label);
  const locked = ciiMultiSourceLockedReviewCount(preview);
  if (count) return Object.freeze({
    count, changed: true, locked,
    message: `${count} ${label} multi-source correspondence rows marked Accept. Apply approvals to Transfer Preview.`,
  });
  return Object.freeze({
    count: 0, changed: false, locked,
    message: `No ${label} correspondence rows are eligible. ${locked} reviewed anchor row(s) are already LOCKED; REVIEW/UNRESOLVED rows require explicit decisions. Transfer Preview was not changed.`,
  });
}

export function ciiMultiSourceReviewMarkup(preview, decisions = new Map(), filters = {}) {
  const rows = reviewRows(preview).filter((row) => filterRow(row, filters));
  if (!reviewRows(preview).length) return '<p>No correspondence rows were produced. Recheck the per-source base authority and correspondence blockers.</p>';
  if (!rows.length) return '<p>No correspondence rows match the current filters.</p>';
  return `<table class="ciiw-grid" data-ciiw-ms-review-table="1"><thead><tr><th>Decision</th><th>Source set member</th><th>Kind</th><th>Confidence</th><th>SOURCE</th><th>TARGET</th><th>Changed</th><th>Identity</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${decisionControl(row, decisions)}</td><td><b>${h(row.sourceId)}</b></td><td>${h(row.kind || '—')}</td><td><b>${h(row.confidence || '—')}</b><small>${h(row.workflowStatus || row.decision || '—')}</small></td><td>${h(row.source || '—')}</td><td>${h(row.target || '—')}</td><td>${row.changeCount ? `<b>${h(row.changeCount)}</b><small>${h((row.changeFamilies || []).join(', '))}</small>` : '—'}</td><td>${row.identityBound ? 'BOUND' : 'REVIEW'}</td></tr>`).join('')}</tbody></table>`;
}

export function ciiMultiSourceReviewSummaryMarkup(preview, decisions = new Map()) {
  const rows = reviewRows(preview); const counts = { HIGH: 0, MEDIUM: 0, REVIEW: 0, UNRESOLVED: 0, LOCKED: 0, ACCEPT: 0, REJECT: 0, PENDING: 0 };
  for (const row of rows) {
    if (row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') counts.LOCKED += 1;
    else counts[row?.confidence] = (counts[row?.confidence] || 0) + 1;
    const decision = effectiveDecision(row, decisions);
    if (decision === 'ACCEPT') counts.ACCEPT += 1; else if (decision === 'REJECT') counts.REJECT += 1; else if (!decision) counts.PENDING += 1;
  }
  return `<div class="ciiw-kpis" data-ciiw-ms-review-summary="1"><div><b>${h(rows.length)}</b><span>Rows</span></div><div><b>${h(counts.HIGH)}</b><span>HIGH</span></div><div><b>${h(counts.MEDIUM)}</b><span>MEDIUM</span></div><div><b>${h(counts.REVIEW)}</b><span>REVIEW</span></div><div><b>${h(counts.LOCKED)}</b><span>Locked</span></div><div><b>${h(counts.ACCEPT)}</b><span>Accepted</span></div><div><b>${h(counts.REJECT)}</b><span>Rejected</span></div><div><b>${h(counts.PENDING)}</b><span>Pending</span></div></div>`;
}

export const _test = Object.freeze({ decisionFromRow, effectiveDecision, filterRow });
