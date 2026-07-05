function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function list(value) {
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}

function pos(value) {
  if (!value) return '';
  return `E ${value.e ?? ''} / S ${value.s ?? ''} / U ${value.u ?? ''}`;
}

function section(title, body) {
  return `<div class="psmap-card"><div class="psmap-card-head"><b>${h(title)}</b></div><div class="psmap-card-body">${body}</div></div>`;
}

function readinessStatus(readiness) {
  if (!readiness) return 'Not checked';
  return readiness.blocking ? 'Blocking issues found' : 'Ready with no blocking errors';
}

export function renderPsFamilyReadiness(readiness) {
  if (!readiness) return section('Input Readiness', '<div class="psmap-help-text">Click Check Readiness before running the audit.</div>');
  const s = readiness.summary;
  const diagnostics = (readiness.diagnostics || []).slice(0, 8);
  const counts = `<div class="psmap-grid-2">
    <div><b>Status</b><br>${h(readinessStatus(readiness))}</div>
    <div><b>Source family</b><br>${h(s.sourceFamily || 'Unknown')}</div>
    <div><b>XML / Expected / Detail rows</b><br>${s.xmlClashCount} / ${s.expectedCount} / ${s.detailCount}</div>
    <div><b>Positions parsed / missing / POSFamilies</b><br>${s.positionParsedCount} / ${s.positionMissingCount} / ${s.posFamilyCount}</div>
    <div><b>Errors / Warnings / Info</b><br>${s.errorCount} / ${s.warnCount} / ${s.infoCount}</div>
  </div>`;
  const diag = renderPsFamilyTable([
    { label: 'Level', value: (row) => row.level },
    { label: 'Code', value: (row) => row.code },
    { label: 'Message', value: (row) => row.message },
  ], diagnostics, 8);
  return section('Input Readiness', `${counts}${diagnostics.length ? diag : '<div class="psmap-help-text">No readiness diagnostics.</div>'}`);
}

export function renderPsFamilySummary(audit) {
  if (!audit) return '<div class="psmap-help-text">Load inputs and run audit.</div>';
  const s = audit.summary;
  return `<div class="psmap-grid-2">
    <div><b>Source family</b><br>${h(s.sourceFamily)}</div>
    <div><b>Coverage</b><br>${h(s.coveragePct)}%</div>
    <div><b>Expected / Found / Missing</b><br>${s.expectedCount} / ${s.foundExactCount} / ${s.missingCount}</div>
    <div><b>Out-of-family / Duplicate / Unexpected / POSFamily</b><br>${s.outOfFamilyCount} / ${s.duplicateMemberCount} / ${s.unexpectedInFamilyCount} / ${s.posFamilyCount}</div>
  </div>`;
}

function visibleCellText(headers, row) {
  return headers.map((item) => String(item.value(row) ?? '')).join(' ').toLowerCase();
}

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
  return `<div class="psmap-help-text" data-psfa-filter-count="1">${h(count)}</div><div class="psmap-table-wrap"><table class="psmap-table"><thead><tr>${headers.map((item) => `<th>${h(item.label)}</th>`).join('')}</tr></thead><tbody>${shown.map((row) => `<tr>${headers.map((item) => `<td>${h(item.value(row))}</td>`).join('')}</tr>`).join('')}</tbody></table>${matched.length > limit ? `<div class="psmap-help-text">Showing first ${limit} of ${matched.length} matched rows.</div>` : ''}</div>`;
}

function renderCoverage(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Expected Member', value: (row) => row.expectedMember },
    { label: 'Status', value: (row) => row.status },
    { label: 'Clashes', value: (row) => list(row.clashNames) },
    { label: 'POSFamily', value: (row) => row.posFamilyId },
    { label: 'Line Family', value: (row) => row.lineFamily || list(row.lineFamilies) },
    { label: 'Pipe / Full Line', value: (row) => row.pipe || list(row.fullLineTags) },
    { label: 'Support Text', value: (row) => row.supportText },
  ], audit.coverageRows, 80, searchText);
}

function renderClashRows(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Clash', value: (row) => row.clashName },
    { label: 'Source', value: (row) => row.source.familyRoot },
    { label: 'Source Object', value: (row) => row.source.objectName },
    { label: 'Against Member', value: (row) => row.against.memberName },
    { label: 'Status', value: (row) => row.familyStatus },
    { label: 'POSFamily', value: (row) => row.elementDetail.posFamilyId },
    { label: 'Line Family', value: (row) => row.elementDetail.lineFamily || row.against.pipe?.lineFamily },
    { label: 'Branch Node', value: (row) => row.against.pipe?.fullBranchNode },
    { label: 'Distance', value: (row) => row.distance },
  ], audit.clashRows, 80, searchText);
}

function renderMissing(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Expected Member', value: (row) => row.expectedMember },
    { label: 'POSFamily', value: (row) => row.posFamilyId },
    { label: 'Line Family', value: (row) => row.lineFamily },
    { label: 'Pipe', value: (row) => row.pipe },
    { label: 'Position', value: (row) => pos(row.position) },
    { label: 'Remarks', value: (row) => row.remarks },
  ], audit.missingRows, 80, searchText);
}

function renderOutOfFamily(audit, searchText) {
  return renderPsFamilyTable([
    { label: 'Clash', value: (row) => row.clashName },
    { label: 'Source', value: (row) => row.source.familyRoot },
    { label: 'Against Member', value: (row) => row.against.memberName },
    { label: 'Against Root', value: (row) => row.against.familyRoot },
    { label: 'Line Family', value: (row) => row.against.pipe?.lineFamily },
    { label: 'Branch Node', value: (row) => row.against.pipe?.fullBranchNode },
  ], audit.outOfFamilyRows, 80, searchText);
}

function renderSimpleReport(audit, key, searchText) {
  return PS_FAMILY_REPORT_RENDERERS[key] ? PS_FAMILY_REPORT_RENDERERS[key](audit, searchText) : renderCoverage(audit, searchText);
}

export const PS_FAMILY_REPORT_RENDERERS = Object.freeze({
  coverage: renderCoverage,
  clashRows: renderClashRows,
  missing: renderMissing,
  outOfFamily: renderOutOfFamily,
  duplicates: (audit, searchText) => renderPsFamilyTable([
    { label: 'Member', value: (row) => row.member },
    { label: 'Count', value: (row) => row.clashCount },
    { label: 'Clash Rows', value: (row) => list(row.clashNames) },
    { label: 'Source Objects', value: (row) => list(row.sourceObjects) },
  ], audit.duplicateRows, 80, searchText),
  lineFamilies: (audit, searchText) => renderPsFamilyTable([
    { label: 'Line Family', value: (row) => row.lineFamily },
    { label: 'Full Line Tags', value: (row) => list(row.fullLineTags) },
    { label: 'Branches', value: (row) => list(row.branches) },
    { label: 'Members', value: (row) => list(row.members) },
    { label: 'Clash Rows', value: (row) => list(row.clashNames) },
  ], audit.lineFamilyRows, 80, searchText),
  posFamilies: (audit, searchText) => renderPsFamilyTable([
    { label: 'POSFamily', value: (row) => row.posFamilyId },
    { label: 'Count', value: (row) => row.elementCount },
    { label: 'Sources', value: (row) => list(row.sourceFamilies) },
    { label: 'Line Families', value: (row) => list(row.lineFamilies) },
    { label: 'Center', value: (row) => pos(row.center) },
    { label: 'Members', value: (row) => list(row.members) },
  ], audit.posFamilyRows, 80, searchText),
  sourceVsPosFamily: (audit, searchText) => renderPsFamilyTable([
    { label: 'Source', value: (row) => row.source },
    { label: 'POSFamily Count', value: (row) => row.posFamilyCount },
    { label: 'Element Count', value: (row) => row.elementCount },
    { label: 'Found', value: (row) => row.foundElementCount },
    { label: 'Missing', value: (row) => row.missingElementCount },
    { label: 'Clash Count', value: (row) => row.clashCount },
    { label: 'Line Families', value: (row) => list(row.lineFamilies) },
  ], audit.sourceVsPosFamilyRows, 80, searchText),
  diagnostics: (audit, searchText) => renderPsFamilyTable([
    { label: 'Level', value: (row) => row.level },
    { label: 'Code', value: (row) => row.code },
    { label: 'Message', value: (row) => row.message },
  ], audit.diagnostics || [], 80, searchText),
});

export function renderPsFamilyReports(audit, activeTab, config, searchText = '') {
  if (!audit) return '';
  const tab = config.reportTabs.find((item) => item.key === activeTab) || config.reportTabs[0];
  return section(tab.label, renderSimpleReport(audit, tab.key, searchText));
}
