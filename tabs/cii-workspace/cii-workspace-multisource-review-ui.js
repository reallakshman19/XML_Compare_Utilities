import { ciiEvidenceBandStyle, ciiNodeNameBandStyle } from './cii-workspace-evidence-band-style.js';

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
function evidenceBandClass(band) {
  const level = Math.max(0, Math.min(4, Number(band?.level || 0)));
  return `level-${level}`;
}
function nameBandClass(evidence) {
  const kind = String(evidence?.kind || 'UNAVAILABLE').toLowerCase();
  return ['exact', 'canonical', 'partial', 'none'].includes(kind) ? kind : 'unavailable';
}
function fmt(value, digits = 1) {
  const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(digits)).toString() : '—';
}
function confidenceReason(row) {
  if (row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') return 'Manual reviewed anchor authority.';
  const m1 = row?.methodA; const m2 = row?.methodB; const od = row?.od; const name = row?.nodeName;
  if (row?.confidence === 'HIGH') {
    if (m1?.available === false) return name?.match
      ? 'HIGH: M1 registration is underdetermined; M2 + OD <10% + Node Name corroboration agree.'
      : 'HIGH: M1 registration is underdetermined; strong M2 network evidence + OD <10% agree.';
    return 'HIGH: independent M1 and M2 identity evidence agree and OD error is <10%.';
  }
  if (row?.confidence === 'MEDIUM') {
    if (od?.confidence === 'MEDIUM') return 'MEDIUM: identity is supported, but OD error is between 10% and 50%.';
    if (m1?.available === false) return 'MEDIUM: identity is supported but only one independent identity method is available.';
    if (m1 && !m1.pass && m2?.pass) return 'MEDIUM: network identity passes while qualified spatial evidence indicates geometry change.';
    return 'MEDIUM: identity is supported but the evidence set is not strong enough for HIGH.';
  }
  if (row?.candidateStatus === 'AMBIGUOUS') return `REVIEW: candidate is ambiguous${row?.winnerGap != null ? `; winner gap ${fmt(row.winnerGap)} < required ${fmt(row.requiredWinnerGap)}` : ''}.`;
  if (od?.confidence === 'REVIEW') return `REVIEW: OD evidence is ${od?.available ? `outside 50% (${fmt(od.percentError)}%)` : 'unavailable'}.`;
  if (m1?.pass && !m2?.pass) return 'REVIEW: M1 passes but M2 network does not independently support the pair.';
  if (!row?.identityBound) return 'REVIEW: correspondence identity is not bound by qualified evidence.';
  return 'REVIEW: explicit engineering decision required.';
}
function evidenceMarkup(row) {
  const m1 = row?.methodA; const m2 = row?.methodB; const od = row?.od; const name = row?.nodeName; const band = row?.corroborationBand;
  const m1Label = !m1 ? 'M1 —' : (m1.available === false ? `M1 N/A${m1.registrationStatus ? ` ${m1.registrationStatus}` : ''}` : `M1 ${m1.pass ? 'PASS' : 'FAIL'} ${fmt(m1.distanceMm)} / ${fmt(m1.toleranceMm)} mm`);
  const m2Label = !m2 ? 'M2 —' : `M2 ${m2.pass ? 'PASS' : 'FAIL'} ${fmt(m2.score)} / ${fmt(m2.threshold)}`;
  const odLabel = od?.available ? `OD ${od.confidence || (od.pass ? 'HIGH' : 'REVIEW')} ${fmt(od.percentError)}%` : 'OD REVIEW N/A';
  const nameLabel = name?.available === false || !name ? 'NAME N/A' : `NAME ${name.kind}${name.availableEndpointCount ? ` ${name.matchedEndpointCount}/${name.availableEndpointCount}` : ''}`;
  return `<div class="ciiw-evidence-stack"><div><span class="ciiw-evidence-band ${evidenceBandClass(band)}" style="${ciiEvidenceBandStyle(band?.level)}">${h(band?.label || 'RED')} · ${h(band?.score ?? 0)}/${h(band?.max ?? 0)}</span><span class="ciiw-name-band ${nameBandClass(name)}" style="${ciiNodeNameBandStyle(nameBandClass(name))}">${h(nameLabel)}</span></div><small>${h(m1Label)} · ${h(m2Label)} · ${h(odLabel)}</small><small class="ciiw-confidence-reason">${h(confidenceReason(row))}</small></div>`;
}
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
  const haystack = [row?.sourceId, row?.source, row?.target, row?.kind, row?.confidence, row?.nodeName?.kind, row?.authority, ...(row?.identityReasons || []), ...(row?.changeFamilies || [])].join(' ').toLowerCase();
  return haystack.includes(search);
}
function decisionControl(row, decisions) {
  const current = effectiveDecision(row, decisions);
  if (row?.decision === 'LOCKED' || row?.workflowStatus === 'LOCKED') return '<span class="ciiw-pill">LOCKED</span>';
  return `<select data-ciiw-ms-decision="${h(row?.correspondenceId)}"><option value="">Review…</option><option value="LOCK" ${current === 'LOCK' ? 'selected' : ''}>Lock</option><option value="ACCEPT" ${current === 'ACCEPT' ? 'selected' : ''}>Accept</option><option value="REJECT" ${current === 'REJECT' ? 'selected' : ''}>Reject</option></select>`;
}
function correspondenceMap(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    const id = String(row?.[key] || ''); if (!id) continue;
    if (!map.has(id)) map.set(id, []); map.get(id).push(row);
  }
  return map;
}
function nodeNameDelta(deltas) {
  return (deltas || []).find((row) => row?.category === 'NODE_NAME' && row?.property === 'Node name / to-name') || null;
}
function auditBlocker(row, operations) {
  const operationBlockers = [...new Set((operations || []).flatMap((item) => item?.blockers || []))];
  if (operationBlockers.length) return operationBlockers.join(' · ');
  if (!row?.identityBound) return row?.candidateStatus === 'AMBIGUOUS'
    ? 'AMBIGUOUS_REGION'
    : (row?.candidateStatus === 'UNRESOLVED' ? 'INSUFFICIENT_EVIDENCE' : 'IDENTITY_NOT_BOUND');
  return '';
}
function writerLabel(operations) {
  if (!(operations || []).length) return '—';
  const actions = [...new Set(operations.map((item) => item?.action || '—'))];
  const statuses = [...new Set(operations.map((item) => item?.status || '—'))];
  return `${actions.join('|')} · ${statuses.join('|')}`;
}
function bmLabel(operations) {
  const bound = (operations || []).filter((item) => item?.bm001Acceptance?.status === 'BOUND');
  return bound.length ? `BOUND · ${bound.length}` : '—';
}

export function ciiSourceTargetAuditRows(preview) {
  const deltaMap = correspondenceMap(preview?.engineeringDeltas?.rows || [], 'correspondenceId');
  const operations = [
    ...(preview?.transferPlan?.operations || []),
    ...(preview?.transferPlan?.excludedOperations || []),
  ];
  const operationMap = correspondenceMap(operations.map((row) => ({ ...row, correspondenceId: row?.matchAuthority?.correspondenceId })), 'correspondenceId');
  return Object.freeze(reviewRows(preview).map((row) => {
    const deltas = deltaMap.get(row.correspondenceId) || []; const name = nodeNameDelta(deltas); const ops = operationMap.get(row.correspondenceId) || [];
    return Object.freeze({
      ...row,
      sourceNodeName: name?.sourceValue ?? '', targetNodeName: name?.targetValue ?? '',
      nodeNameChanged: Boolean(name?.changed), writer: writerLabel(ops), bm001: bmLabel(ops),
      blocker: auditBlocker(row, ops), proofRule: row?.authority || confidenceReason(row),
    });
  }));
}
function auditSummary(preview, rows) {
  const nodes = rows.filter((row) => row.kind === 'NODE');
  const ops = [...(preview?.transferPlan?.operations || []), ...(preview?.transferPlan?.excludedOperations || [])];
  const nodeNameOps = ops.filter((item) => String(item?.property || '').toLowerCase().includes('node name') && item?.action !== 'KEEP');
  const bmBound = nodeNameOps.filter((item) => item?.bm001Acceptance?.status === 'BOUND');
  return Object.freeze({
    rowCount: rows.length, nodePairCount: nodes.length, boundNodePairCount: nodes.filter((row) => row.identityBound).length,
    nodeNameChangeCount: nodes.filter((row) => row.nodeNameChanged).length,
    writerNodeNameCandidateCount: nodeNameOps.length, bm001BoundOperationCount: bmBound.length,
  });
}
function sourceTargetAuditMarkup(preview, rows) {
  const summary = auditSummary(preview, rows);
  return `<section class="ciiw-ms-source-target-audit" data-ciiw-ms-source-target-audit="1"><header><div><b>Correspondence · Source vs Target</b><span>Anchor seeds → bound correspondence → engineering change → writer action</span></div><span class="ciiw-corroboration">AUDIT</span></header><div class="ciiw-kpis"><div><b>${h(summary.nodePairCount)}</b><span>NODE pairs</span></div><div><b>${h(summary.boundNodePairCount)}</b><span>bound NODE pairs</span></div><div><b>${h(summary.nodeNameChangeCount)}</b><span>NodeName differences</span></div><div><b>${h(summary.writerNodeNameCandidateCount)}</b><span>writer candidates</span></div><div><b>${h(summary.bm001BoundOperationCount)}</b><span>BM-001-bound ops</span></div></div><p>These counts are deliberately separate. BM-001 row coverage is evidence coverage, not correspondence cardinality; the retained mutation benchmark is proved independently from T → TEXPECTED, not by counting anchors or BM rows.</p></section>`;
}

export function seedCiiMultiSourceReviewDecisions(preview, decisions = new Map()) {
  decisions.clear();
  for (const row of reviewRows(preview)) {
    const value = decisionFromRow(row);
    if (value) decisions.set(String(row.correspondenceId), value);
  }
  return decisions;
}
function memberReviewLedgers(preview) {
  return new Map((preview?.memberPreviews || []).map(({ sourceId, preview: member }) => [String(sourceId || ''), member?.review || null]));
}
export function ciiMultiSourceReviewBySource(preview, decisions) {
  const ledgers = memberReviewLedgers(preview); const result = {};
  for (const row of reviewRows(preview)) {
    const sourceId = String(row?.sourceId || ''); const memberId = String(row?.memberCorrespondenceId || '');
    if (!sourceId || !memberId) continue;
    if (!result[sourceId]) result[sourceId] = {
      ...(ledgers.get(sourceId) || {}),
      reviewedCorrespondenceIds: [], lockedCorrespondenceIds: [], rejectedCorrespondenceIds: [],
    };
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
  if (count) return Object.freeze({ count, changed: true, locked, message: `${count} ${label} multi-source correspondence rows marked Accept. Apply approvals to Transfer Preview.` });
  return Object.freeze({ count: 0, changed: false, locked,
    message: `No ${label} correspondence rows are eligible. ${locked} reviewed anchor row(s) are already LOCKED; REVIEW/UNRESOLVED rows require explicit decisions. Transfer Preview was not changed.` });
}

export function ciiMultiSourceReviewMarkup(preview, decisions = new Map(), filters = {}) {
  const auditRows = ciiSourceTargetAuditRows(preview); const rows = auditRows.filter((row) => filterRow(row, filters));
  if (!reviewRows(preview).length) return '<p>No correspondence rows were produced. Recheck the per-source base authority and correspondence blockers.</p>';
  if (!rows.length) return `${sourceTargetAuditMarkup(preview, auditRows)}<p>No correspondence rows match the current filters.</p>`;
  return `${sourceTargetAuditMarkup(preview, auditRows)}<table class="ciiw-grid" data-ciiw-ms-review-table="1"><thead><tr><th>Decision</th><th>Source</th><th>Kind</th><th>Confidence</th><th>SOURCE node</th><th>TARGET node</th><th>SOURCE NodeName</th><th>TARGET NodeName</th><th>Evidence / proof</th><th>Changed</th><th>Writer / BM-001</th><th>Blocker</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${decisionControl(row, decisions)}</td><td><b>${h(row.sourceId)}</b></td><td>${h(row.kind || '—')}</td><td><span class="ciiw-confidence ${String(row.confidence || 'review').toLowerCase()}">${h(row.confidence || '—')}</span><small>${h(row.workflowStatus || row.decision || '—')}</small></td><td>${h(row.source || '—')}</td><td>${h(row.target || '—')}</td><td>${h(row.sourceNodeName || '—')}</td><td>${h(row.targetNodeName || '—')}</td><td>${evidenceMarkup(row)}<small><b>Authority:</b> ${h(row.proofRule || '—')}</small></td><td>${row.changeCount ? `<b>${h(row.changeCount)}</b><small>${h((row.changeFamilies || []).join(', '))}</small>` : '—'}</td><td>${h(row.writer)}<small>${h(row.bm001)}</small></td><td>${h(row.blocker || '—')}</td></tr>`).join('')}</tbody></table>`;
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

export const _test = Object.freeze({ decisionFromRow, effectiveDecision, filterRow, memberReviewLedgers, auditBlocker, writerLabel, bmLabel, auditSummary, nodeNameDelta });
