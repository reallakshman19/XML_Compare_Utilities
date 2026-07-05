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

export function renderPsFamilyTable(headers, rows, limit = 80) {
  const shown = (rows || []).slice(0, limit);
  return `<div class="psmap-table-wrap"><table class="psmap-table"><thead><tr>${headers.map((item) => `<th>${h(item.label)}</th>`).join('')}</tr></thead><tbody>${shown.map((row) => `<tr>${headers.map((item) => `<td>${h(item.value(row))}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows?.length > limit ? `<div class="psmap-help-text">Showing first ${limit} of ${rows.length} rows.</div>` : ''}</div>`;
}

function section(title, body) {
  return `<div class="psmap-card"><div class="psmap-card-head"><b>${h(title)}</b></div><div class="psmap-card-body">${body}</div></div>`;
}

export function renderPsFamilyReports(audit) {
  if (!audit) return '';
  return [
    section('Coverage', renderPsFamilyTable([
      { label: 'Expected Member', value: (row) => row.expectedMember },
      { label: 'Status', value: (row) => row.status },
      { label: 'Clashes', value: (row) => list(row.clashNames) },
      { label: 'POSFamily', value: (row) => row.posFamilyId },
      { label: 'Line Family', value: (row) => row.lineFamily || list(row.lineFamilies) },
      { label: 'Pipe / Full Line', value: (row) => row.pipe || list(row.fullLineTags) },
      { label: 'Support Text', value: (row) => row.supportText },
    ], audit.coverageRows)),
    section('Clash Rows', renderPsFamilyTable([
      { label: 'Clash', value: (row) => row.clashName },
      { label: 'Source', value: (row) => row.source.familyRoot },
      { label: 'Source Object', value: (row) => row.source.objectName },
      { label: 'Against Member', value: (row) => row.against.memberName },
      { label: 'Status', value: (row) => row.familyStatus },
      { label: 'POSFamily', value: (row) => row.elementDetail.posFamilyId },
      { label: 'Line Family', value: (row) => row.elementDetail.lineFamily || row.against.pipe?.lineFamily },
      { label: 'Branch Node', value: (row) => row.against.pipe?.fullBranchNode },
      { label: 'Distance', value: (row) => row.distance },
    ], audit.clashRows)),
    section('Missing', renderPsFamilyTable([
      { label: 'Expected Member', value: (row) => row.expectedMember },
      { label: 'POSFamily', value: (row) => row.posFamilyId },
      { label: 'Line Family', value: (row) => row.lineFamily },
      { label: 'Pipe', value: (row) => row.pipe },
      { label: 'Position', value: (row) => pos(row.position) },
      { label: 'Remarks', value: (row) => row.remarks },
    ], audit.missingRows)),
    section('Out-of-Family', renderPsFamilyTable([
      { label: 'Clash', value: (row) => row.clashName },
      { label: 'Source', value: (row) => row.source.familyRoot },
      { label: 'Against Member', value: (row) => row.against.memberName },
      { label: 'Against Root', value: (row) => row.against.familyRoot },
      { label: 'Line Family', value: (row) => row.against.pipe?.lineFamily },
      { label: 'Branch Node', value: (row) => row.against.pipe?.fullBranchNode },
    ], audit.outOfFamilyRows)),
    section('Duplicates', renderPsFamilyTable([
      { label: 'Member', value: (row) => row.member },
      { label: 'Count', value: (row) => row.clashCount },
      { label: 'Clash Rows', value: (row) => list(row.clashNames) },
      { label: 'Source Objects', value: (row) => list(row.sourceObjects) },
    ], audit.duplicateRows)),
    section('Line Families', renderPsFamilyTable([
      { label: 'Line Family', value: (row) => row.lineFamily },
      { label: 'Full Line Tags', value: (row) => list(row.fullLineTags) },
      { label: 'Branches', value: (row) => list(row.branches) },
      { label: 'Members', value: (row) => list(row.members) },
      { label: 'Clash Rows', value: (row) => list(row.clashNames) },
    ], audit.lineFamilyRows)),
    section('POSFamilies', renderPsFamilyTable([
      { label: 'POSFamily', value: (row) => row.posFamilyId },
      { label: 'Count', value: (row) => row.elementCount },
      { label: 'Sources', value: (row) => list(row.sourceFamilies) },
      { label: 'Line Families', value: (row) => list(row.lineFamilies) },
      { label: 'Center', value: (row) => pos(row.center) },
      { label: 'Members', value: (row) => list(row.members) },
    ], audit.posFamilyRows)),
    section('Source vs POSFamily Count', renderPsFamilyTable([
      { label: 'Source', value: (row) => row.source },
      { label: 'POSFamily Count', value: (row) => row.posFamilyCount },
      { label: 'Element Count', value: (row) => row.elementCount },
      { label: 'Found', value: (row) => row.foundElementCount },
      { label: 'Missing', value: (row) => row.missingElementCount },
      { label: 'Clash Count', value: (row) => row.clashCount },
      { label: 'Line Families', value: (row) => list(row.lineFamilies) },
    ], audit.sourceVsPosFamilyRows)),
    section('Diagnostics', renderPsFamilyTable([
      { label: 'Level', value: (row) => row.level },
      { label: 'Code', value: (row) => row.code },
      { label: 'Message', value: (row) => row.message },
    ], audit.diagnostics || [])),
  ].join('');
}
