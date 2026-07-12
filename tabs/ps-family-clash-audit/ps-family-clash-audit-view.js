function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function list(value) { return Array.isArray(value) ? value.join(', ') : (value ?? ''); }
function point(value) { return value ? `X ${value.x ?? ''} / Y ${value.y ?? ''} / Z ${value.z ?? ''}` : ''; }
function section(title, body) { return `<div class="psmap-card"><div class="psmap-card-head"><b>${h(title)}</b></div><div class="psmap-card-body">${body}</div></div>`; }
function readinessStatus(readiness) { if (!readiness) return 'Not checked'; return readiness.blocking ? 'Blocking issues found' : 'Ready with no blocking errors'; }
function visibleCellText(headers, row) { return headers.map((item) => String(item.value(row) ?? '')).join(' ').toLowerCase(); }

export function filterPsFamilyRows(headers, rows, searchText = '') {
  const term = String(searchText || '').trim().toLowerCase();
  if (!term) return rows || [];
  return (rows || []).filter((row) => visibleCellText(headers, row).includes(term));
}

function tableCountText(shownCount, matchedCount, totalCount, hasSearch, limit) {
  if (hasSearch) return `Showing ${shownCount} of ${matchedCount} matched rows from ${totalCount} total rows.`;
  if (totalCount > limit) return `Showing ${shownCount} of ${totalCount} rows.`;
  return `Showing ${shownCount} of ${totalCount} rows.`;
}

export function renderPsFamilyTable(headers, rows, limit = 80, searchText = '') {
  const totalRows = rows || [];
  const matched = filterPsFamilyRows(headers, totalRows, searchText);
  const shown = matched.slice(0, limit);
  const hasSearch = Boolean(String(searchText || '').trim());
  const count = tableCountText(shown.length, matched.length, totalRows.length, hasSearch, limit);
  const head = headers.map((item) => `<th>${h(item.label)}</th>`).join('');
  const body = shown.map((row) => `<tr>${headers.map((item) => `<td>${h(item.value(row))}</td>`).join('')}</tr>`).join('');
  return `<div class="psmap-help-text" data-psfa-filter-count="1">${h(count)}</div><div class="psmap-table-wrap"><table class="psmap-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function renderPsFamilyReadiness(readiness) {
  if (!readiness) return section('Input Readiness', '<div class="psmap-help-text">Click Check Readiness before running the audit.</div>');
  const s = readiness.summary;
  const diagnostics = (readiness.diagnostics || []).slice(0, 8);
  const counts = `<div class="psmap-grid-2"><div><b>Status</b><br>${h(readinessStatus(readiness))}</div><div><b>Detected family</b><br>${h(s.sourceFamily || 'Unknown')}</div><div><b>Structure contacts / Support chain</b><br>${s.structureContactCount || 0} / ${s.supportChainCount || 0}</div><div><b>Legacy clash / Expected / Detail</b><br>${s.xmlClashCount || 0} / ${s.expectedCount || 0} / ${s.detailCount || 0}</div><div><b>Errors / Warnings / Info</b><br>${s.errorCount} / ${s.warnCount} / ${s.infoCount}</div></div>`;
  const diag = renderPsFamilyTable([{ label: 'Level', value: (row) => row.level }, { label: 'Code', value: (row) => row.code }, { label: 'Message', value: (row) => row.message }], diagnostics, 8);
  return section('Input Readiness', `${counts}${diagnostics.length ? diag : '<div class="psmap-help-text">No readiness diagnostics.</div>'}`);
}

export function renderPsFamilySummary(audit) {
  if (!audit) return '<div class="psmap-help-text">Load inputs and run audit.</div>';
  const s = audit.summary;
  return `<div class="psmap-grid-2"><div><b>Source family</b><br>${h(s.sourceFamily || 'SupportChange')}</div><div><b>SupportGroups</b><br>${s.supportGroupCount || 0}</div><div><b>Exceptions</b><br>${s.supportExceptionCount || 0}</div><div><b>Legacy clash rows</b><br>${s.clashCount || 0}</div></div>`;
}

function renderSupportSummary(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Line', value: (row) => row.line }, { label: 'BranchNode', value: (row) => row.branchNode },
    { label: 'LineFamily', value: (row) => row.lineFamily }, { label: 'PSRoot', value: (row) => row.psRoot },
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'Supports', value: (row) => list(row.supportMembers) },
    { label: 'Evidence', value: (row) => list(row.evidenceClashes) }, { label: 'Status', value: (row) => row.status },
  ], audit.supportSummaryRows || [], 80, searchText);
}

function renderLineSupportTree(audit, searchText) {
  const rows = (audit.lineSupportTreeRows || []).map((row) => ({ supportGroup: row.supportGroup, tree: row.treeText }));
  return renderPsFamilyTable([{ label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'Tree', value: (row) => row.tree }], rows, 80, searchText);
}

function renderStructureContacts(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'StructuralGroup', value: (row) => row.structuralGroup },
    { label: 'Support', value: (row) => row.support }, { label: 'LineFamily', value: (row) => row.lineFamily },
    { label: 'BranchNode', value: (row) => row.branchNode }, { label: 'Clash', value: (row) => row.contactClash },
    { label: 'Distance', value: (row) => row.distance }, { label: 'Point', value: (row) => point(row.point) },
  ], audit.structureContactRows || [], 80, searchText);
}

function renderSupportChain(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'SupportA', value: (row) => row.supportA },
    { label: 'SupportB', value: (row) => row.supportB }, { label: 'LineFamily', value: (row) => row.lineFamily },
    { label: 'BranchNode', value: (row) => row.branchNode }, { label: 'Clash', value: (row) => row.supportClash },
  ], audit.supportChainRows || [], 80, searchText);
}

function renderSupportMembers(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'Representative', value: (row) => row.representativeSupport },
    { label: 'MemberType', value: (row) => row.memberType }, { label: 'Support', value: (row) => row.support },
    { label: 'ConnectedTo', value: (row) => list(row.connectedTo) }, { label: 'Evidence', value: (row) => list(row.evidenceClashes) },
    { label: 'CoverageRole', value: (row) => row.coverageRole }, { label: 'Remarks', value: (row) => row.remarks },
  ], audit.supportMemberRows || [], 80, searchText);
}

function renderExceptions(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Code', value: (row) => row.exceptionCode }, { label: 'Severity', value: (row) => row.severity },
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'StructuralGroup', value: (row) => row.structuralGroup },
    { label: 'Support', value: (row) => row.support }, { label: 'SupportA', value: (row) => row.supportA },
    { label: 'SupportB', value: (row) => row.supportB }, { label: 'Reason', value: (row) => row.reason },
  ], audit.supportExceptionRows || [], 80, searchText);
}

function renderEvidence(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'SourceInput', value: (row) => row.sourceInput }, { label: 'ClashName', value: (row) => row.clashName },
    { label: 'ObjectAType', value: (row) => row.objectAType }, { label: 'ObjectBType', value: (row) => row.objectBType },
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'ParsedEdge', value: (row) => row.parsedEdge },
  ], audit.inputEvidenceRows || [], 80, searchText);
}

function renderMatrix(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'SupportGroup', value: (row) => row.supportGroup }, { label: 'From', value: (row) => row.from },
    { label: 'To', value: (row) => row.to }, { label: 'EdgeType', value: (row) => row.edgeType },
    { label: 'Clash', value: (row) => row.clash }, { label: 'Status', value: (row) => row.status },
  ], audit.connectivityMatrixRows || [], 80, searchText);
}

function renderClashRows(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Clash', value: (row) => row.clashName }, { label: 'Source', value: (row) => row.source.familyRoot },
    { label: 'Source Object', value: (row) => row.source.objectName }, { label: 'Against Member', value: (row) => row.against.memberName },
    { label: 'Status', value: (row) => row.familyStatus }, { label: 'Line Family', value: (row) => row.against.pipe?.lineFamily },
    { label: 'Branch Node', value: (row) => row.against.pipe?.fullBranchNode },
  ], audit.clashRows || [], 80, searchText);
}

function renderCoverage(audit, searchText) { return renderPsFamilyTable([{ label: 'Expected Member', value: (row) => row.expectedMember }, { label: 'Status', value: (row) => row.status }], audit.coverageRows || [], 80, searchText); }
function renderDiagnostics(audit, searchText) { return renderPsFamilyTable([{ label: 'Level', value: (row) => row.level }, { label: 'Code', value: (row) => row.code }, { label: 'Message', value: (row) => row.message }], audit.diagnostics || [], 80, searchText); }

export const PS_FAMILY_REPORT_RENDERERS = Object.freeze({
  supportSummary: renderSupportSummary,
  lineSupportTree: renderLineSupportTree,
  supportExceptions: renderExceptions,
  inputEvidence: renderEvidence,
  structureContacts: renderStructureContacts,
  supportChain: renderSupportChain,
  supportMembers: renderSupportMembers,
  connectivityMatrix: renderMatrix,
  clashRows: renderClashRows,
  coverage: renderCoverage,
  psClashReport: renderSupportMembers,
  diagnostics: renderDiagnostics,
  hierarchy: renderEvidence,
  missing: renderCoverage,
  outOfFamily: renderClashRows,
  duplicates: renderCoverage,
  lineFamilies: renderCoverage,
  posFamilies: renderCoverage,
  sourceVsPosFamily: renderCoverage,
});

function renderSimpleReport(audit, key, searchText) { return PS_FAMILY_REPORT_RENDERERS[key] ? PS_FAMILY_REPORT_RENDERERS[key](audit, searchText) : renderSupportSummary(audit, searchText); }

export function renderPsFamilyReports(audit, activeTab, config, searchText = '') {
  if (!audit) return '';
  const tab = config.reportTabs.find((item) => item.key === activeTab) || config.reportTabs[0];
  return section(tab.label, renderSimpleReport(audit, tab.key, searchText));
}
