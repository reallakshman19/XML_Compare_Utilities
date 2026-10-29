import { renderXmlCompareSideloadPopupHtml } from './XmlCompareSideloadPopup.js';
import { renderXmlCompareEnrichmentConfigPopupHtml } from './XmlCompareEnrichmentConfig.js';
import { renderXmlCompareLoadDiagnosticsPanelHtml } from './XmlCompareLoadDiagnosticsPanel.js';
import { renderLinewiseWorkflowPopupHtml, renderLinewiseWorkflowToolbarButtonHtml } from './XmlCompareLinewiseWorkflowView.js';
import { renderUniversalXmlCategorizerButtonHtml } from './universal-categorizer/universal-xml-categorizer-shell.js';
import { renderXmlCompareWorkspaceShellHtml } from './XmlCompareWorkspaceShell.js?v=20260704-transfer-review-1';
import { detectXmlCompareProfile } from './XmlCompareProfileDetector.js';
import { isIsoNoteEngineeringInput } from './rev-compare/rev-compare-iso-note-mode.js';
import { renderIsoNoteMappingCompareHtml } from './XmlCompareIsoNoteDirectCompare.js';

const clean = (value) => String(value ?? '').trim();
const number = (value, fallback = 0) => { const next = Number(value); return Number.isFinite(next) ? next : fallback; };
export function esc(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
export function bytes(value) { const size = Number(value || 0); if (!Number.isFinite(size) || size <= 0) return '0 B'; if (size < 1024) return `${size} B`; if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1048576).toFixed(2)} MB`; }
function loadedFileCard(label, file, text, sideModel) { const loaded = Boolean(file || text), name = clean(file?.name || sideModel?.fileName || 'No file loaded'), profile = clean(sideModel?.profile || 'unknown'); return `<article class="xml-compare-load-card ${loaded ? 'is-loaded' : 'is-empty'}"><b>${label === 'a' ? 'Source A' : 'Target B'} ${loaded ? 'loaded' : 'not loaded'}</b><span>${esc(name)}</span><small>${loaded ? `${esc(bytes(file?.size || text.length))} - ${text.length.toLocaleString()} chars - profile ${esc(profile)}` : 'Choose a file to begin.'}</small></article>`; }
function loadedFileStrip(state, workspace) { return `<div class="xml-compare-load-strip">${loadedFileCard('a', state.fileA, state.textA, workspace.source)}${loadedFileCard('b', state.fileB, state.textB, workspace.target)}</div>`; }
function issueRow(issue, state) { const selected = state.selectedIssueId === issue.componentId, hidden = state.hiddenComponentIds.has(issue.componentId); return `<tr data-xml-compare-topology-row data-component-id="${esc(issue.componentId)}" class="${selected ? 'is-selected' : ''} ${hidden ? 'is-hidden' : ''}"><td>${esc(issue.severity || '')}</td><td>${esc(issue.code || '')}</td><td>${esc(issue.datasetId || '')}</td><td>${esc(issue.component?.label || issue.componentId || '')}</td><td>${issue.distanceMm != null ? esc(number(issue.distanceMm).toFixed(1)) : '-'}</td></tr>`; }
function filters(state) { return `<div class="xml-compare-topology-filters"><select data-xml-compare-topology-filter="severity"><option value="ALL" ${state.filters.severity === 'ALL' ? 'selected' : ''}>All severities</option><option value="ERROR" ${state.filters.severity === 'ERROR' ? 'selected' : ''}>Errors</option><option value="WARNING" ${state.filters.severity === 'WARNING' ? 'selected' : ''}>Warnings</option></select><input data-xml-compare-topology-filter="search" value="${esc(state.filters.search)}" placeholder="Search issues"></div>`; }
function summary(report) { if (!report) return '<div class="xml-compare-empty">Load XML files to build a comparison report.</div>'; const s = report.topologyIssues.summary; return `<div class="xml-compare-summary-grid"><div><b>Dataset A</b><span>${esc(report.datasets.A.fileName || 'XML A')}</span></div><div><b>Dataset B</b><span>${esc(report.datasets.B.fileName || 'XML B')}</span></div><div><b>Issues</b><span>${s.issueCount}</span></div><div><b>Errors</b><span>${s.severityCounts.ERROR || 0}</span></div><div><b>Warnings</b><span>${s.severityCounts.WARNING || 0}</span></div></div>`; }
function issueDetails(report, state) { const issue = (report?.topologyIssues?.issues || []).find((item) => item.componentId === state.selectedIssueId); if (!issue) return '<div class="xml-compare-empty">Select an issue to inspect it here.</div>'; return `<div class="xml-compare-detail-card"><div><b>Code</b><span>${esc(issue.code)}</span></div><div><b>Severity</b><span>${esc(issue.severity)}</span></div><div><b>Dataset</b><span>${esc(issue.datasetId)}</span></div><div><b>Component</b><span>${esc(issue.component?.label || issue.componentId)}</span></div><div><b>Message</b><span>${esc(issue.message || '')}</span></div></div>`; }
function topologyPanel(issues, state) { const rows = issues.map((issue) => issueRow(issue, state)).join('') || '<tr><td colspan="5">No topology issues.</td></tr>'; return `<section class="xml-compare-panel"><div class="xml-compare-panel-title">Topology check</div>${filters(state)}<div class="xml-compare-topology-actions"><button type="button" data-xml-compare-topology-action="show-all">Show all</button><button type="button" data-xml-compare-topology-action="hide-filtered">Hide filtered</button><button type="button" data-xml-compare-action="export-filtered-csv" ${state.report ? '' : 'disabled'}>Export filtered CSV</button></div><div class="xml-compare-table-scroll"><table class="xml-compare-topology-table"><thead><tr><th>Severity</th><th>Code</th><th>Dataset</th><th>Component</th><th>Delta mm</th></tr></thead><tbody>${rows}</tbody></table></div></section>`; }
function xmlInputPreview(value = '') {
  const xml = String(value || '');
  return { large: xml.length > 400000, text: xml.length > 400000 ? xml.slice(0, 2048) : xml, chars: xml.length };
}
function renderIsoAuditConnectorEvidence(report, auditLinks) {
  if (!report?.ok || !auditLinks?.readOnly || !Array.isArray(auditLinks.links)) return '';
  const rows = auditLinks.links.slice(0, 120).map((link) =>
    '<tr><td>' + esc(link.pipeline) + '</td><td>' + esc(link.supportId) +
    '</td><td>' + esc(link.s1Ref) + '</td><td>' + esc(link.s2Ref) +
    '</td><td>IDENTITY VERIFIED · REVIEW ONLY</td></tr>').join('');
  return '<section class="xml-compare-panel" data-xml-compare-iso-audit-links>' +
    '<h3>ISO automatically identified connections · ' + esc(auditLinks.linkedCount) + '</h3>' +
    '<p>Read-only links from exact normalized pipeline and full support ID; NOT approved transfer connectors. Verify engineering gaps and restraints independently.</p>' +
    '<div style="max-height:260px;overflow:auto"><table class="xml-compare-topology-table">' +
    '<thead><tr><th>Pipeline</th><th>Support ID</th><th>S1 source reference</th><th>S2 source reference</th><th>Authority</th></tr></thead><tbody>' +
    rows + '</tbody></table></div></section>';
}
function isoInputRolesActive(state = {}) {
  const source = String(state.textA || ''), target = String(state.textB || '');
  return isIsoNoteEngineeringInput(source, target) ||
    /<IsoNoteXml\b/i.test(source) || /<IsoNoteXml\b/i.test(target);
}
function inputPairNotice(state = {}) {
  const source = String(state.textA || ''), target = String(state.textB || '');
  if (!source.trim() || !target.trim() || source !== target) return '';
  const combined = isIsoNoteEngineeringInput(source, target);
  return '<div class="xmlc-import-pair-notice" role="status" data-xml-compare-input-pair-notice>' +
    (combined
      ? '<b>Same combined ISO XML in both slots.</b> The XML contains separate S1 and S2 partitions. Source A is used for PS Mapping and Target B for ISO Notes. Exact identity connections are review-only; this is not a revision-to-revision comparison.'
      : '<b>Source and Target have identical content.</b> For a two-file comparison, load a different Target B. No difference can be inferred between identical XML inputs.') +
    '</div>';
}
function renderXmlInputCard(state, side = 'a', isoMode = false) {
  const sourceSide = side !== 'b', file = sourceSide ? state.fileA : state.fileB;
  const xml = String(sourceSide ? state.textA || '' : state.textB || '');
  const preview = xmlInputPreview(xml), loaded = Boolean(xml.trim()), name = String(file?.name || '');
  const label = sourceSide ? 'Source A' : 'Target B';
  const role = isoMode
    ? (sourceSide ? 'PS Mapping · S1' : 'ISO Notes · S2')
    : (sourceSide ? 'Source input / property donor' : 'Target input / receiver');
  const detected = loaded ? detectXmlCompareProfile({ name, text: xml }).type : 'not detected';
  const field = sourceSide ? 'textA' : 'textB';
  const sideLabel = sourceSide ? 'Source' : 'Target';
  return '<article class="xmlc-import-card" data-xml-compare-import-side="' + side + '">' +
    '<header class="xmlc-import-card-header"><div><b>' + label +
    '</b><span>' + role + '</span></div><strong class="xmlc-import-readiness">' +
    (loaded ? 'XML loaded' : 'No XML loaded') + '</strong></header>' +
    '<div class="xmlc-import-actions"><label class="xmlc-import-upload">Choose ' + sideLabel +
    ' XML<input type="file" data-xml-compare-load="' + side +
    '" aria-label="Choose ' + sideLabel + ' XML file" accept=".xml,.XML,.json,.JSON"></label>' +
    '<button type="button" data-xml-compare-action="clear-input-' + side +
    '"' + (loaded ? '' : ' disabled') + '>Clear ' + sideLabel + '</button></div>' +
    '<div class="xmlc-import-file-meta"><b>' + esc(name || (loaded ? 'Pasted XML text' : 'Choose a file or paste XML below')) +
    '</b><small>' + (loaded ? esc(bytes(file?.size || xml.length)) + ' · ' +
    esc(xml.length.toLocaleString()) + ' characters · ' + esc(detected) :
    'Empty · ready to import') + '</small></div>' +
    '<details class="xmlc-import-preview"><summary>' + (loaded ? 'Inspect XML / edit small input' : 'Paste XML text instead') +
    '</summary>' + (preview.large ? '<small role="status">Full XML retained (' +
    esc(preview.chars.toLocaleString()) +
    ' characters). Showing first 2,048 characters read-only.</small>' : '') +
    '<textarea data-xml-compare-field="' + field +
    '"' + (preview.large ? ' readonly aria-label="' + sideLabel + ' XML preview; full XML loaded"' : '') +
    ' spellcheck="false" placeholder="Paste ' + sideLabel +
    ' XML here">' + esc(preview.text) + '</textarea></details></article>';
}
function importSection(state) {
  const isoMode = isoInputRolesActive(state);
  return '<section class="wb3d-card xmlc-import-workflow" data-xml-compare-import-workflow>' +
    '<div class="xmlc-import-intro"><div><h3>1. Load your XML inputs</h3>' +
    '<p>' + (isoMode
      ? 'ISO workflow: S1 PS Mapping → S2 ISO Notes. Each slot has its own file and status.'
      : 'Compare two XML inputs. Source A and Target B are independent; each can be replaced or cleared.') +
    '</p></div><small>Load → Match → Review</small></div>' +
    '<div class="wb3d-import-grid xmlc-import-grid">' +
    renderXmlInputCard(state, 'a', isoMode) +
    renderXmlInputCard(state, 'b', isoMode) + '</div>' +
    inputPairNotice(state) +
    '<div class="xmlc-import-next"><div><strong>2. Find connections</strong>' +
    '<small>ISO audit uses exact normalized pipeline + full support ID; topology comparison is separate.</small></div>' +
    '<button type="button" class="wb3d-btn wb3d-btn-primary" data-xml-compare-action="compare-iso-note-mapping" title="Read-only PS Mapping to ISO Notes engineering audit">Compare PS Mapping ↔ ISO Notes</button>' +
    '<button type="button" class="wb3d-btn" data-xml-compare-action="compare">Run XML topology check</button></div>' +
    '<details class="xmlc-import-advanced"><summary>Advanced comparison settings</summary>' +
    '<div class="wb3d-toolbar xmlc-import-settings">' +
    '<label>Short/consume tol mm <input type="number" data-xml-compare-config="shortElementToleranceMm" value="' +
    esc(state.config?.shortElementToleranceMm ?? 6) + '" step="1"></label>' +
    '<label>Length tol mm <input type="number" data-xml-compare-config="lengthToleranceMm" value="' +
    esc(state.config?.lengthToleranceMm ?? 6) + '" step="1"></label>' +
    '<label>Min score <input type="number" data-xml-compare-config="minCandidateScore" value="' +
    esc(state.config?.minCandidateScore ?? 40) + '" step="1"></label>' +
    '<label>Ambiguity gap <input type="number" data-xml-compare-config="ambiguityGap" value="' +
    esc(state.config?.ambiguityGap ?? 8) + '" step="1"></label>' +
    '<label class="wb3d-check"><input type="checkbox" data-xml-compare-config="canonicalNormalization" ' +
    ((state.config?.canonicalNormalization ?? true) ? 'checked' : '') +
    '> canonical normalization (raw when off)</label></div></details>' +
    '<div class="xml-compare-toolbar xmlc-import-tools">' +
    '<b>Import & tools</b>' +
    renderLinewiseWorkflowToolbarButtonHtml() +
    renderUniversalXmlCategorizerButtonHtml() +
    '<details><summary>Other utilities and exports</summary><div class="xmlc-import-tools-more">' +
    '<button type="button" data-xml-compare-action="open-sideload-a">Sideload Source A</button>' +
    '<button type="button" data-xml-compare-action="open-sideload-b">Sideload Target B</button>' +
    '<button type="button" data-xml-compare-action="open-enrichment">Enrichment Config</button>' +
    '<button type="button" data-xml-compare-action="download-input-readiness-json">Download Input Readiness JSON</button>' +
    '<button type="button" data-xml-compare-action="download-readiness-gate-json">Download Readiness Gate JSON</button>' +
    '<button type="button" data-xml-compare-action="export-filtered-csv" ' +
    (state.report ? '' : 'disabled') + '>Export CSV</button></div></details></div></section>';
}
function dashboardSection(state) {
  if (!state.report) return '<section class="wb3d-card" style="margin-bottom: 20px;"><h3>Variance dashboard</h3><p class="wb3d-muted" style="color: #64748b; font-size: 11px;">Run a compare to populate the dashboard.</p></section>';
  const s = state.report.topologyIssues.summary;
  const plain = (label, value) => `<div class="wb3d-tile" style="background: #0d1e36; padding: 10px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; border: 1px solid #1e293b;"><strong>${value ?? 0}</strong><span style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${label}</span></div>`;
  const clickable = (label, value, status) => `
    <button class="wb3d-tile ${status ? `wb3d-tile-${status}` : ''} ${state.filters.severity === status ? 'is-active' : ''}" data-xml-compare-severity-filter="${status || 'ALL'}" style="background: #0d1e36; padding: 10px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; border: 1px solid #1e293b; color: inherit; cursor: pointer;">
      <strong>${value ?? 0}</strong><span style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${label}</span>
    </button>`;
  return `
  <section class="wb3d-card" style="margin-bottom: 20px;">
    <h3>Variance dashboard <span class="wb3d-muted">tiles filter the topology table below</span></h3>
    <div class="wb3d-tiles" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 10px;">
      ${plain('Dataset A components', state.report.datasets.A.componentCount)}
      ${plain('Dataset B components', state.report.datasets.B.componentCount)}
      ${clickable('Total Issues', s.issueCount, 'ALL')}
      ${clickable('Errors', s.severityCounts.ERROR || 0, 'ERROR')}
      ${clickable('Warnings', s.severityCounts.WARNING || 0, 'WARNING')}
    </div>
  </section>`;
}

function toolbar(state) { return importSection(state); }
export function renderXmlCompareTabView({ state, workspace, issues }) { return `<div class="xml-compare-tab"><header class="xml-compare-header"><h2>Source-target XML comparison workspace</h2><p>Load XML or enriched staged JSON, inspect source and target records, approve connector links explicitly, then validate approved matches.</p></header>${importSection(state)}<div class="xml-compare-status ${esc(state.status.kind)}">${esc(state.status.message)}</div>${renderXmlCompareLoadDiagnosticsPanelHtml(state.loadDiagnostics)}${renderIsoNoteMappingCompareHtml(state.isoNoteComparison, state.isoNoteLinkedCount)}${renderIsoAuditConnectorEvidence(state.isoNoteComparison, state.isoNoteAuditLinks)}${renderXmlCompareWorkspaceShellHtml({ ...workspace, isoNoteAuditLinks: state.isoNoteAuditLinks })}<main class="xml-compare-layout">${dashboardSection(state)}${topologyPanel(issues, state)}<section class="xml-compare-panel"><div class="xml-compare-panel-title">Details</div>${issueDetails(state.report, state)}</section></main>${renderXmlCompareSideloadPopupHtml(state.sideload)}${renderXmlCompareEnrichmentConfigPopupHtml(state.enrichmentConfig, { workspace, state })}${renderLinewiseWorkflowPopupHtml({ ...state.linewiseWorkflow, producerAdoption: state.linewiseProducerAdoption })}</div>`; }
export const _test = Object.freeze({ clean, number, loadedFileCard, issueRow, filters, summary, issueDetails, topologyPanel, importSection, dashboardSection, toolbar, xmlInputPreview, renderIsoAuditConnectorEvidence, isoInputRolesActive, inputPairNotice, renderXmlInputCard });
