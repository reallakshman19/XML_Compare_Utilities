function text(value) { return String(value ?? '').trim(); }
function numericNodeSort(left, right) {
  const a = Number(left); const b = Number(right);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}
function unique(values) { return [...new Set((values || []).map(text).filter(Boolean))]; }
function sourceNodeIds(document) {
  const ids = new Set(Object.keys(document?.nodeNames || {}).map(text).filter(Boolean));
  for (const element of document?.parsed?.elements || []) {
    const from = text(element?.from); const to = text(element?.to);
    if (from) ids.add(from); if (to) ids.add(to);
  }
  return [...ids].sort(numericNodeSort);
}
function nodeRows(memberPreview) {
  return (memberPreview?.compareReview?.rows || []).filter((row) => row?.kind === 'NODE' && text(row?.source));
}
function decision(row) { return text(row?.decision || (row?.workflowStatus === 'LOCKED' ? 'LOCKED' : 'REVIEW')); }
function classification(rows) {
  if (!rows.length) return 'UNEMITTED';
  if (rows.some((row) => row?.identityBound === true)) return 'BOUND';
  if (rows.some((row) => row?.confidence === 'UNRESOLVED' || ['UNRESOLVED', 'CONFLICT'].includes(row?.workflowStatus))) return 'UNRESOLVED';
  return 'REVIEW';
}
function auditRow(sourceId, sourceDocument, targetDocument, sourceNodeId, rows) {
  const targetNodeIds = unique(rows.map((row) => row?.target)).sort(numericNodeSort);
  const targetNodeNames = targetNodeIds.map((nodeId) => text(targetDocument?.nodeNames?.[nodeId])).filter(Boolean);
  const changeFamilies = unique(rows.flatMap((row) => row?.changeFamilies || [])).sort();
  return Object.freeze({
    auditRowId: `${sourceId}:${sourceNodeId}`,
    sourceId,
    sourceNodeId,
    sourceNodeName: text(sourceDocument?.nodeNames?.[sourceNodeId]),
    status: classification(rows),
    emittedRowCount: rows.length,
    targetNodeIds: Object.freeze(targetNodeIds),
    targetNodeNames: Object.freeze(targetNodeNames),
    confidence: Object.freeze(unique(rows.map((row) => row?.confidence)).sort()),
    workflowStatus: Object.freeze(unique(rows.map((row) => row?.workflowStatus)).sort()),
    authority: Object.freeze(unique(rows.map((row) => row?.authority)).sort()),
    evidenceBasis: Object.freeze(unique(rows.map((row) => row?.identityEvidenceBasis)).sort()),
    decisions: Object.freeze(unique(rows.map(decision)).sort()),
    changedRowCount: rows.reduce((sum, row) => sum + Number(row?.changeCount || 0), 0),
    changeFamilies: Object.freeze(changeFamilies),
  });
}
function memberAudit(sourceId, memberPreview) {
  const sourceDocument = memberPreview?.sourceDocument || {};
  const targetDocument = memberPreview?.targetDocument || {};
  const emittedBySource = new Map();
  for (const row of nodeRows(memberPreview)) {
    const sourceNodeId = text(row.source);
    if (!emittedBySource.has(sourceNodeId)) emittedBySource.set(sourceNodeId, []);
    emittedBySource.get(sourceNodeId).push(row);
  }
  const rows = sourceNodeIds(sourceDocument).map((nodeId) => auditRow(sourceId, sourceDocument, targetDocument, nodeId, emittedBySource.get(nodeId) || []));
  const summary = Object.freeze({
    sourceId,
    totalSourceNodes: rows.length,
    emittedSourceNodes: rows.filter((row) => row.emittedRowCount > 0).length,
    boundSourceNodes: rows.filter((row) => row.status === 'BOUND').length,
    reviewSourceNodes: rows.filter((row) => row.status === 'REVIEW').length,
    unresolvedSourceNodes: rows.filter((row) => row.status === 'UNRESOLVED').length,
    unemittedSourceNodes: rows.filter((row) => row.status === 'UNEMITTED').length,
    multiEmissionSourceNodes: rows.filter((row) => row.emittedRowCount > 1).length,
  });
  return Object.freeze({ sourceId, rows: Object.freeze(rows), summary });
}
function aggregateSummary(members) {
  const keys = ['totalSourceNodes', 'emittedSourceNodes', 'boundSourceNodes', 'reviewSourceNodes', 'unresolvedSourceNodes', 'unemittedSourceNodes', 'multiEmissionSourceNodes'];
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, members.reduce((sum, member) => sum + Number(member.summary[key] || 0), 0)])));
}

export function ciiMultiSourceCorrespondenceAudit(preview) {
  const members = (preview?.memberPreviews || []).map(({ sourceId, preview: member }) => memberAudit(text(sourceId), member));
  const rows = members.flatMap((member) => member.rows);
  return Object.freeze({
    schema: 'CIIWorkspaceMultiSourceCorrespondenceAudit.v1',
    sourceSetSha256: text(preview?.sourceSetSha256),
    targetSha256: text(preview?.targetAuthority?.originalSha256 || preview?.memberPreviews?.[0]?.preview?.targetDocument?.contentSha256),
    summary: aggregateSummary(members),
    members: Object.freeze(members),
    rows: Object.freeze(rows),
  });
}
function csvCell(value) {
  const textValue = Array.isArray(value) ? value.join(' | ') : text(value);
  return /[",\n\r]/.test(textValue) ? `"${textValue.replaceAll('"', '""')}"` : textValue;
}
export function ciiMultiSourceCorrespondenceAuditCsv(audit) {
  const columns = [
    ['SOURCE', 'sourceId'], ['SOURCE node', 'sourceNodeId'], ['SOURCE Node Name', 'sourceNodeName'], ['Status', 'status'],
    ['Emitted rows', 'emittedRowCount'], ['TARGET nodes', 'targetNodeIds'], ['TARGET Node Names', 'targetNodeNames'],
    ['Confidence', 'confidence'], ['Workflow status', 'workflowStatus'], ['Authority', 'authority'], ['Evidence basis', 'evidenceBasis'],
    ['Decision', 'decisions'], ['Changed rows', 'changedRowCount'], ['Change families', 'changeFamilies'], ['Audit row ID', 'auditRowId'],
  ];
  const lines = [columns.map(([label]) => csvCell(label)).join(',')];
  for (const row of audit?.rows || []) lines.push(columns.map(([, key]) => csvCell(row[key])).join(','));
  return `${lines.join('\n')}\n`;
}
export function ciiMultiSourceCorrespondenceAuditJson(audit) { return `${JSON.stringify(audit, null, 2)}\n`; }
function h(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
export function ciiMultiSourceCorrespondenceAuditMarkup(audit, options = {}) {
  const displayLimit = Math.max(1, Number(options.displayLimit || 500));
  const rows = (audit?.rows || []).slice(0, displayLimit); const summary = audit?.summary || {};
  const truncated = (audit?.rows || []).length > rows.length;
  return `<section class="ciiw-base-set" data-ciiw-ms-correspondence-audit="1"><header><div><b>Correspondence · Source vs Target audit</b><span>Source-first census: every SOURCE node is retained, including nodes never emitted by correspondence.</span></div><span class="ciiw-corroboration">AUDIT</span></header><div class="ciiw-kpis"><div><b>${h(summary.totalSourceNodes || 0)}</b><span>Source nodes</span></div><div><b>${h(summary.emittedSourceNodes || 0)}</b><span>Emitted</span></div><div><b>${h(summary.boundSourceNodes || 0)}</b><span>Bound</span></div><div><b>${h((summary.reviewSourceNodes || 0) + (summary.unresolvedSourceNodes || 0))}</b><span>Review / unresolved</span></div><div><b>${h(summary.unemittedSourceNodes || 0)}</b><span>Unemitted</span></div></div><div class="ciiw-transfer-scope-actions"><button type="button" data-ciiw-ms-correspondence-audit-csv>Export Source↔Target CSV</button><button type="button" data-ciiw-ms-correspondence-audit-json>Export Source↔Target JSON</button></div>${truncated ? `<p><b>UI preview limited to ${h(rows.length)} rows.</b> Exports contain all ${h(audit.rows.length)} source nodes.</p>` : ''}<table class="ciiw-grid"><thead><tr><th>Source</th><th>SOURCE node</th><th>SOURCE name</th><th>Status</th><th>Rows</th><th>TARGET node(s)</th><th>TARGET name(s)</th><th>Confidence</th><th>Authority / evidence</th><th>Decision</th><th>Changed</th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${h(row.sourceId)}</b></td><td>${h(row.sourceNodeId)}</td><td>${h(row.sourceNodeName || '—')}</td><td><b>${h(row.status)}</b></td><td>${h(row.emittedRowCount)}</td><td>${h(row.targetNodeIds.join(' · ') || '—')}</td><td>${h(row.targetNodeNames.join(' · ') || '—')}</td><td>${h(row.confidence.join(' · ') || '—')}<small>${h(row.workflowStatus.join(' · ') || '—')}</small></td><td>${h(row.authority.join(' · ') || '—')}<small>${h(row.evidenceBasis.join(' · ') || '—')}</small></td><td>${h(row.decisions.join(' · ') || '—')}</td><td>${h(row.changedRowCount)}<small>${h(row.changeFamilies.join(', ') || '—')}</small></td></tr>`).join('')}</tbody></table></section>`;
}

export const _test = Object.freeze({ sourceNodeIds, nodeRows, classification, auditRow, memberAudit, aggregateSummary, csvCell });
