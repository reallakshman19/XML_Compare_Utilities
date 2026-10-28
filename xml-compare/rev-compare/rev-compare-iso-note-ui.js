// A review-only presenter for the two-partition ISO Note template.
// No revision semantics, auto-transfer affordances, or similarity thresholds.
export const REV_COMPARE_ISO_NOTE_UI_SCHEMA = 'rev-compare-iso-note-ui/v1';
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const cell = value => '<td>' + esc(value ?? '') + '</td>';
const short = value => String(value ?? '') || '—';
const status = value => '<b>' + esc(short(value)) + '</b>';
const txt = (value, max = 300) => {
  const s = String(value ?? '');
  return '<span title="' + esc(s) + '">' + esc(s.length > max ? s.slice(0, max) + '…' : s || '—') + '</span>';
};
const metric = (label, value, meaning) => '<tr><th>' + esc(label) + '</th>' + cell(value) + cell(meaning) + '</tr>';
const table = (headers, rows, className) => '<div class="xmlc-rev-compare-grid-wrapper" style="overflow-x:auto;max-height:540px;overflow-y:auto"><table class="xmlc-rev-compare-grid ' + esc(className || '') + '"><thead><tr>' +
  headers.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';

function summaryPanel(audit) {
  const s = audit.summary;
  return '<section class="xml-compare-panel xmlc-transfer-card" aria-label="ISO engineering summary"><div class="xml-compare-panel-title">1. Engineering identity and coverage summary</div>' +
    '<p><strong>Comparison mode:</strong> S1 PS Mapping → S2 ISO Notes. These are different tables, not revisions. The source of truth is normalized pipeline + full support number, not 60% text similarity.</p>' +
    table(['Measure', 'Count', 'Meaning'], [
      metric('Distinct S1 pipelines', s.sourcePipelineCount, 'Identity scope, not a revision count'),
      metric('Distinct S2 pipelines', s.targetPipelineCount, 'Compare only when pipeline scope overlaps'),
      metric('Shared pipelines', s.commonPipelineCount, 'Unmatched results may be outside extract scope'),
      metric('Composite duplicate S1/S2 rows', s.sourceCompositeDuplicates + ' / ' + s.targetCompositeDuplicates, 'Only identical pipeline + full support number count as duplicates'),
      metric('S1 PS Mapping rows', s.mappingRows, 'Source A / PS_MAPPING_S1'),
      metric('S2 ISO Note rows', s.noteRows, 'Target B / ISO_NOTES_S2'),
      metric('Exact identity pairs', s.identityMatches, 'Same normalized pipeline AND complete PS number'),
      metric('S1 only', s.s1Only, 'No corresponding ISO note on the same pipeline; outside scope or missing reference'),
      metric('S2 only', s.s2Only, 'No corresponding PS Mapping record on the same pipeline; outside scope or missing reference'),
      metric('Identity review', s.identityReviews, 'Placeholder, missing ID, or duplicate identity — never automatically matched'),
      metric('Typed gap matched', s.gapMatches, 'Only equal REST/pipe, GUIDE, or LINE STOP mm clearances'),
      metric('Typed gap mismatched', s.gapMismatches, 'Two typed mm values disagree'),
      metric('Typed gap review', s.gapReviews, 'Unspecified or different clearance types; manual verification'),
      metric('Rest/gap not specified', s.gapNotSpecified, 'No comparable numeric gap evidence'),
      metric('Restraints covered', s.restraintCovered, 'Recognized restraint keywords on both sides, not geometric proof'),
      metric('Restraints missing in DTXR', s.restraintMissing, 'ISONOTE has required restraint not demonstrated by DTXR'),
      metric('Extra DTXR restraints', s.restraintExtra, 'DTXR has restraint keyword absent from positive note requirements'),
      metric('Restraint review', s.restraintReviews, 'Negated, ambiguous, or incomplete restraint evidence'),
      metric('Traceable findings', audit.findingCount, 'Unique findings with rule IDs and original S1/S2 references'),
    ], 'xmlc-iso-note-summary-table') + '</section>';
}

function identityPanel(audit) {
  const rows = audit.report.rows.filter(r => r.status !== 'MATCH').map(r => '<tr>' +
    cell(r.status) + cell(r.pipe) + cell(short(r.psNo)) + cell(short(r.nodeName)) +
    cell(short(r.s1Ref)) + cell(short(r.s2Ref)) +
    '<td>' + txt(r.reason) + '</td><td>' + txt(r.action.action) + '</td></tr>');
  return '<section class="xml-compare-panel xmlc-transfer-card" aria-label="ISO identity review"><div class="xml-compare-panel-title">2. Unmatched / ambiguous S1 and S2 records</div>' +
    '<p>The same PS number on a different pipeline is <strong>not</strong> a match; symbolic PS-XXXX values are review-only. <strong>OUT_OF_SCOPE_OR_MISSING_REFERENCE</strong> does not assert a missing physical support until dataset coverage is verified.</p>' +
    (rows.length ? table(['Identity', 'Normalized pipeline', 'PS NO (S1)', 'NODE_NAME (S2)', 'S1 ref', 'S2 ref', 'Identity reason', 'Review action'], rows, 'xmlc-iso-note-identity-grid') :
      '<p>No unmatched identities.</p>') + '</section>';
}
function pairPanel(audit) {
  const pairs = audit.report.rows.filter(r => r.status === 'MATCH');
  const rows = pairs.map(r => '<tr>' +
    cell(r.pipe) + cell(r.psNo) + cell(r.nodeName) + cell(short(r.s1Ref)) + cell(short(r.s2Ref)) +
    '<td>' + txt(r.dtxr) + '</td><td>' + txt(r.isoNote, 420) + '</td>' +
    cell(short(r.coverage.required)) + cell(short(r.coverage.provided)) +
    cell(short(r.coverage.missing)) + cell(short(r.coverage.extra)) +
    '<td>' + status(r.coverage.status) + '</td><td>' + txt(r.coverage.reason) + '</td>' +
    '<td>' + txt(r.supportGap) + '</td>' +
    cell(short(r.gap.s1RestMm) + ' / ' + short(r.gap.s2RestMm)) +
    cell(short(r.gap.s1GuideMm) + ' / ' + short(r.gap.s2GuideMm)) +
    cell(short(r.gap.s1LineStopMm) + ' / ' + short(r.gap.s2LineStopMm)) +
    '<td>' + status(r.gap.status) + '</td><td>' + txt(r.gap.reason) + '</td>' +
    cell(r.action.code) + '<td>' + txt(r.action.action) + '</td></tr>');
  return '<section class="xml-compare-panel xmlc-transfer-card" aria-label="ISO engineering delta"><div class="xml-compare-panel-title">3. Engineering delta grid — verified S1→S2 pairs</div>' +
    '<p><strong>Identity verified ≠ engineering verified.</strong> Gap values are in millimetres; loads in kN and axial displacement are not compared as gaps. REST, GUIDE and LINE STOP remain distinct.</p>' +
    (rows.length ? table(['Pipeline', 'PS NO', 'NODE_NAME', 'S1 ref', 'S2 ref', 'S1 DTXR', 'S2 raw ISONOTE', 'ISONOTE restraints', 'DTXR restraints', 'Missing', 'Extra', 'Coverage', 'Coverage reason', 'S1 Support Gap', 'REST S1/S2 mm', 'GUIDE S1/S2 mm', 'LINE STOP S1/S2 mm', 'Gap result', 'Gap reason', 'Review code', 'Review action'], rows, 'xmlc-iso-note-engineering-grid') :
      '<p>No exact S1→S2 identities to evaluate.</p>') + '</section>';
}
function evidencePanel(audit) {
  const rows = audit.findings.map(f => '<tr>' +
    cell(f.findingId) + cell(f.domain) + cell(f.kind) + '<td>' + status(f.status) + '</td>' +
    cell(f.rule) + cell(short(f.s1Ref)) + cell(short(f.s2Ref)) +
    '<td>' + txt(f.sourceRaw, 220) + '</td><td>' + txt(f.targetRaw, 220) + '</td>' +
    '<td>' + txt(f.explanation) + '</td>' + cell(f.actionCode) + '</tr>');
  return '<section class="xml-compare-panel xmlc-transfer-card" aria-label="ISO traceable findings"><div class="xml-compare-panel-title">4. Finding-level evidence and provenance</div>' +
    '<p>Each REST, GUIDE and LINE STOP finding has its own stable ID and independent original S1/S2 references. Download the CSV for full raw evidence and parser-rule provenance.</p>' +
    table(['Finding ID', 'Domain', 'Type', 'Status', 'Parser/rule', 'S1 ref', 'S2 ref', 'Raw S1 evidence', 'Raw S2 evidence', 'Finding reason', 'Review code'], rows, 'xmlc-iso-note-findings-grid') + '</section>';
}
export function renderIsoNoteRevCompareDashboardHtml(audit) {
  if (!audit || audit.mode !== 'iso-note-engineering') return '';
  const note = '<section class="xml-compare-panel xmlc-transfer-card" role="status"><div class="xml-compare-panel-title">Tab 3: ISO Note engineering audit — review only</div>' +
    '<p><strong>Source:</strong> ' + esc(audit.sourceRole) + ' &nbsp; <strong>Target:</strong> ' + esc(audit.targetRole) +
    '</p><p>Exact identity links and fuzzy candidate approvals are not permission to change model restraints, support gaps, or target XML. This audit generates evidence and review actions only.</p></section>';
  if (!audit.ok) return '<div class="xmlc-rev-compare-dashboard" data-xmlc-rev-compare-mode="iso-note-engineering">' +
    note + '<section class="xml-compare-panel xmlc-transfer-card" role="alert">' + esc(audit.message) + '</section></div>';
  return '<div class="xmlc-rev-compare-dashboard" data-xmlc-rev-compare-mode="iso-note-engineering">' + note +
    summaryPanel(audit) + identityPanel(audit) + pairPanel(audit) + evidencePanel(audit) +
    '<div class="xml-compare-transfer-apply-actions xmlc-transfer-output-actions">' +
    '<button type="button" class="xmlc-transfer-action is-export" data-xml-compare-action="export-rev-compare-json">Export engineering audit JSON</button>' +
    '<button type="button" class="xmlc-transfer-action is-ledger" data-xml-compare-action="export-rev-compare-csv">Export engineering findings CSV</button>' +
    '</div></div>';
}
