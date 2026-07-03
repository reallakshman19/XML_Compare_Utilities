import { renderXmlCompareSideloadPopupHtml } from './XmlCompareSideloadPopup.js';
import { renderXmlCompareEnrichmentConfigPopupHtml } from './XmlCompareEnrichmentConfig.js';
import { renderXmlCompareWorkspaceShellHtml } from './XmlCompareWorkspaceShell.js?v=20260703-approved-connector-1';

const clean = (value) => String(value ?? '').trim();
const number = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};
export function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
export function bytes(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1048576).toFixed(2)} MB`;
}
function loadedFileCard(label, file, text, sideModel) {
  const loaded = Boolean(file || text);
  const name = clean(file?.name || sideModel?.fileName || 'No file loaded');
  const profile = clean(sideModel?.profile || 'unknown');
  return `<article class="xml-compare-load-card ${loaded ? 'is-loaded' : 'is-empty'}"><b>${label === 'a' ? 'Source A' : 'Target B'} ${loaded ? 'loaded' : 'not loaded'}</b><span>${esc(name)}</span><small>${loaded ? `${esc(bytes(file?.size || text.length))} · ${text.length.toLocaleString()} chars · profile ${esc(profile)}` : 'Choose a file to begin.'}</small></article>`;
}
function loadedFileStrip(state, workspace) {
  return `<div class="xml-compare-load-strip">${loadedFileCard('a', state.fileA, state.textA, workspace.source)}${loadedFileCard('b', state.fileB, state.textB, workspace.target)}</div>`;
}
function issueRow(issue, state) {
  const selected = state.selectedIssueId === issue.componentId;
  const hidden = state.hiddenComponentIds.has(issue.componentId);
  return `<tr data-xml-compare-topology-row data-component-id="${esc(issue.componentId)}" class="${selected ? 'is-selected' : ''} ${hidden ? 'is-hidden' : ''}"><td>${esc(issue.severity || '')}</td><td>${esc(issue.code || '')}</td><td>${esc(issue.datasetId || '')}</td><td>${esc(issue.component?.label || issue.componentId || '')}</td><td>${issue.distanceMm != null ? esc(number(issue.distanceMm).toFixed(1)) : '—'}</td></tr>`;
}
function filters(state) {
  return `<div class="xml-compare-topology-filters"><select data-xml-compare-topology-filter="severity"><option value="ALL" ${state.filters.severity === 'ALL' ? 'selected' : ''}>All severities</option><option value="ERROR" ${state.filters.severity === 'ERROR' ? 'selected' : ''}>Errors</option><option value="WARNING" ${state.filters.severity === 'WARNING' ? 'selected' : ''}>Warnings</option></select><input data-xml-compare-topology-filter="search" value="${esc(state.filters.search)}" placeholder="Search issues"></div>`;
}
function summary(report) {
  if (!report) return '<div class="xml-compare-empty">Load XML files to build a comparison report.</div>';
  const s = report.topologyIssues.summary;
  return `<div class="xml-compare-summary-grid"><div><b>Dataset A</b><span>${esc(report.datasets.A.fileName || 'XML A')}</span></div><div><b>Dataset B</b><span>${esc(report.datasets.B.fileName || 'XML B')}</span></div><div><b>Issues</b><span>${s.issueCount}</span></div><div><b>Errors</b><span>${s.severityCounts.ERROR || 0}</span></div><div><b>Warnings</b><span>${s.severityCounts.WARNING || 0}</span></div></div>`;
}
function issueDetails(report, state) {
  const issue = (report?.topologyIssues?.issues || []).find((item) => item.componentId === state.selectedIssueId);
  if (!issue) return '<div class="xml-compare-empty">Select an issue to inspect it here.</div>';
  return `<div class="xml-compare-detail-card"><div><b>Code</b><span>${esc(issue.code)}</span></div><div><b>Severity</b><span>${esc(issue.severity)}</span></div><div><b>Dataset</b><span>${esc(issue.datasetId)}</span></div><div><b>Component</b><span>${esc(issue.component?.label || issue.componentId)}</span></div><div><b>Message</b><span>${esc(issue.message || '')}</span></div></div>`;
}
function topologyPanel(issues, state) {
  const rows = issues.map((issue) => issueRow(issue, state)).join('') || '<tr><td colspan="5">No topology issues.</td></tr>';
  return `<section class="xml-compare-panel"><div class="xml-compare-panel-title">Topology issues</div>${filters(state)}<div class="xml-compare-topology-actions"><button type="button" data-xml-compare-topology-action="show-all">Show all</button><button type="button" data-xml-compare-topology-action="hide-filtered">Hide filtered</button><button type="button" data-xml-compare-action="export-filtered-csv" ${state.report ? '' : 'disabled'}>Export filtered CSV</button></div><div class="xml-compare-table-scroll"><table class="xml-compare-topology-table"><thead><tr><th>Severity</th><th>Code</th><th>Dataset</th><th>Component</th><th>Δ mm</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function toolbar(state) {
  return `<div class="xml-compare-toolbar"><label class="xml-compare-file-btn ${state.fileA ? 'is-loaded' : ''}">${state.fileA ? `✓ ${esc(state.fileA.name)}` : 'Source A'}<input type="file" data-xml-compare-load="a" accept=".xml,.XML,.json,.JSON"></label><label class="xml-compare-file-btn ${state.fileB ? 'is-loaded' : ''}">${state.fileB ? `✓ ${esc(state.fileB.name)}` : 'Target B'}<input type="file" data-xml-compare-load="b" accept=".xml,.XML,.json,.JSON"></label><button type="button" data-xml-compare-action="compare">Compare</button><button type="button" data-xml-compare-action="open-sideload-a">Sideload Source A</button><button type="button" data-xml-compare-action="open-sideload-b">Sideload Target B</button><button type="button" data-xml-compare-action="open-enrichment">Enrichment Config</button><button type="button" data-xml-compare-action="download-input-readiness-json">Download Input Readiness JSON</button><button type="button" data-xml-compare-action="download-readiness-gate-json">Download Readiness Gate JSON</button><button type="button" data-xml-compare-action="export-filtered-csv" ${state.report ? '' : 'disabled'}>Export CSV</button></div>`;
}
export function renderXmlCompareTabView({ state, workspace, issues }) {
  return `<div class="xml-compare-tab"><header class="xml-compare-header"><h2>Source-target XML comparison workspace</h2><p>Load XML or enriched staged JSON, inspect source and target records, approve connector links explicitly, then validate approved matches.</p></header>${toolbar(state)}<div class="xml-compare-status ${esc(state.status.kind)}">${esc(state.status.message)}</div>${loadedFileStrip(state, workspace)}${renderXmlCompareWorkspaceShellHtml(workspace)}<main class="xml-compare-layout"><section class="xml-compare-panel"><div class="xml-compare-panel-title">Summary</div>${summary(state.report)}</section>${topologyPanel(issues, state)}<section class="xml-compare-panel"><div class="xml-compare-panel-title">Details</div>${issueDetails(state.report, state)}</section></main>${renderXmlCompareSideloadPopupHtml(state.sideload)}${renderXmlCompareEnrichmentConfigPopupHtml(state.enrichmentConfig)}</div>`;
}
export const _test = Object.freeze({ clean, number, loadedFileCard, issueRow, filters, summary, issueDetails, topologyPanel, toolbar });
