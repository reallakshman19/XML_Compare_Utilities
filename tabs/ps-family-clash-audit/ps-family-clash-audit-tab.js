import { createPsFamilyClashAuditFromTextInputs, createPsFamilyInputReadinessFromTextInputs } from './ps-family-clash-audit-actions.js';
import { saveTextFile } from './ps-family-clash-audit-save.js';
import { createPsFamilyActiveReportExport, createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from './ps-family-clash-audit-config.js';
import { loadSampleTextIntoTextarea, loadTextFileIntoTextarea } from './ps-family-clash-audit-file-io.js';
import { listPsFamilySampleInputs } from './ps-family-clash-audit-samples.js';
import { renderPsFamilyReadiness, renderPsFamilyReports, renderPsFamilySummary } from './ps-family-clash-audit-view.js';

const ACTIVATE = 'cli' + 'ck';
const POPUP_TITLE_ID = 'ps-family-clash-audit-title';
const POPUP_DESC_ID = 'ps-family-clash-audit-desc';
const WORKSPACE_TABS = Object.freeze(['Input', 'Preview', 'Config', 'Run & Export', 'Reports'].map((label) => Object.freeze({ key: label.toLowerCase().replace(/ & export/, '').replace(/ /g, '-'), label })));

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function safeSource(audit) { return audit?.summary?.sourceFamily || 'audit'; }
function fileExtension(mime) { return mime === 'application/json' ? 'json' : 'csv'; }
function renderInfoList(config) { return `<ul class="psmap-help-text">${config.info.map((item) => `<li>${h(item)}</li>`).join('')}</ul>`; }
function renderSourceOptions(config) { return config.sourceSideOptions.map((item) => `<option value="${h(item.value)}">${h(item.label)}</option>`).join(''); }
function renderExportButtons(config) { return config.outputButtons.map((item) => `<button type="button" data-psfa="${h(item.key)}">${h(item.label)}</button>`).join(''); }
function renderReportTabs(config) { return `<div class="psmap-actions" aria-label="Report tabs">${config.reportTabs.map((tab) => `<button type="button" data-psfa-tab="${h(tab.key)}">${h(tab.label)}</button>`).join('')}</div>`; }
function renderWorkspaceTabs() {
  return `<div class="psmap-actions" aria-label="Primary workspace tabs">${WORKSPACE_TABS.map((tab, index) => `<button type="button" data-psfa-workspace-tab="${h(tab.key)}" aria-selected="${index === 0 ? 'true' : 'false'}">${h(tab.label)}</button>`).join('')}</div>`;
}
function renderSection(title, body, label = title) {
  return `<section class="psmap-card" aria-label="${h(label)}"><div class="psmap-card-head"><b>${h(title)}</b></div><div class="psmap-card-body">${body}</div></section>`;
}
function renderPanel(key, body, activeKey = 'input') { return `<section data-psfa-panel="${h(key)}" ${key === activeKey ? '' : 'hidden'}>${body}</section>`; }
function renderFilePicker(input) {
  return `<label>${h(input.label)} file<input data-psfa-file="${h(input.key)}" type="file" accept="${h(input.accept)}"></label><div class="psmap-help-text" data-psfa-status="${h(input.key)}">No file selected</div>`;
}
function renderFilePickers(config) { return `<div class="psmap-grid-2">${config.inputFiles.map(renderFilePicker).join('')}</div>`; }
function renderSampleButtons() {
  return `<div class="psmap-actions" aria-label="Official sample loaders">${listPsFamilySampleInputs().map((sample) => `<button type="button" data-psfa-sample="${h(sample.key)}">${h(sample.label)}</button>`).join('')}</div>`;
}
function renderTextAreas(config) {
  return `<div class="psmap-grid-2"><label>Clash XML<textarea data-psfa="xml" rows="${h(config.inputRows)}" placeholder="Paste Navis clash XML"></textarea></label><label>Expected PS CSV<textarea data-psfa="expected" rows="${h(config.inputRows)}" placeholder="Paste Item Name CSV"></textarea></label><label>Element Detail CSV<textarea data-psfa="details" rows="${h(config.inputRows)}" placeholder="Paste Name/p1bore/pipe/Position CSV"></textarea></label></div>`;
}
function renderInputPanel(config) {
  return renderSection('Input', `<div class="psmap-help-text">Load official samples, select files, or paste raw input text. Reports are isolated in the Reports tab.</div>${renderSampleButtons()}${renderFilePickers(config)}${renderTextAreas(config)}`);
}
function renderPreviewPanel() {
  const panel = (key, label) => `<div class="psmap-card"><div class="psmap-card-head"><b>${label}</b></div><div class="psmap-card-body" data-psfa-preview="${key}"></div></div>`;
  return renderSection('Preview', `<div class="psmap-help-text">Compact input previews only; no audit table is rendered here.</div><div class="psmap-grid-2">${panel('xml', 'Clash XML preview/count')}${panel('expected', 'Expected CSV preview/count')}${panel('details', 'Element Detail CSV preview/count')}</div>`);
}
function renderConfigPanel(config) {
  const controls = `<div class="psmap-grid-2"><label>Source side<select data-psfa="source-side">${renderSourceOptions(config)}</select></label><label>Source family override<input data-psfa="source-family" placeholder="${h(config.sourceFamilyPlaceholder)}"></label><label>POS tolerance mm<input data-psfa="tolerance" type="number" value="${h(config.posToleranceMm)}" min="${h(config.toleranceMinMm)}" step="${h(config.toleranceStepMm)}"></label></div>`;
  return renderSection('Config', `${controls}${renderInfoList(config)}`);
}
function renderRunPanel(config) {
  const actions = `<div class="psmap-actions" aria-label="Audit and export actions"><button type="button" data-psfa="check-readiness">Check Readiness</button><button type="button" data-psfa="run">Run Audit</button><button type="button" data-psfa="export-active">Export Active Report</button>${renderExportButtons(config)}</div>`;
  return renderSection('Run & Export', `${actions}<div data-psfa="readiness" aria-live="polite"></div>`);
}
function renderReportsPanel(config) {
  const filter = `<label>Report search<input data-psfa="report-search" placeholder="Filter current report, e.g. D90001 or PS-90001.1"></label><div class="psmap-help-text">Search is case-insensitive and applies to the selected report tab only.</div>`;
  return renderSection('Reports', `${filter}${renderReportTabs(config)}<div data-psfa="summary"></div><div class="psmap-table-wrap" data-psfa="reports"></div>`);
}
function renderStatusStrip() {
  return `<div class="psmap-grid-2" data-psfa="status-strip"><div><b>Readiness</b><br>Not checked</div><div><b>Source family</b><br>Unknown</div><div><b>XML / Expected / Detail</b><br>0 / 0 / 0</div><div><b>Errors / Warnings</b><br>0 / 0</div></div>`;
}
function renderInputShell(config) {
  return `<div class="psmap-card-body"><div id="${POPUP_DESC_ID}" class="psmap-help-text">Tabbed PS Family Clash Audit workspace: load inputs, preview, configure, run/export, then review reports.</div>${renderStatusStrip()}${renderWorkspaceTabs()}${renderPanel('input', renderInputPanel(config))}${renderPanel('preview', renderPreviewPanel())}${renderPanel('config', renderConfigPanel(config))}${renderPanel('run', renderRunPanel(config))}${renderPanel('reports', renderReportsPanel(config))}</div>`;
}
function renderLauncher(config) {
  const launcher = config.launcher;
  return `<button type="button" class="psmap-card" data-psfa-open="1" title="${h(launcher.help)}"><span aria-hidden="true">${h(launcher.icon)}</span><b>${h(launcher.label)}</b><span class="psmap-help-text">${h(launcher.help)}</span></button>`;
}
function renderPopup(config) {
  return `<div class="psmap-card-head"><div><b id="${POPUP_TITLE_ID}">${h(config.appTitle)}</b><div class="psmap-help-text">Navis clash XML + expected PS CSV + element detail CSV audit workspace.</div></div><button type="button" data-psfa-close="1" aria-label="Close PS Family Clash Audit popup">Close PS clash check</button></div>${renderInputShell(config)}`;
}
function readTextInputs(get) { return { clashXmlText: get('xml').value, expectedCsvText: get('expected').value, detailCsvText: get('details').value }; }
function readAuditInput(get, config) { return { ...readTextInputs(get), config: readPsFamilyUiSettings(get, config) }; }
function countText(value) {
  const text = String(value || '');
  return `${text ? text.split(/\r?\n/).length : 0} lines / ${text.length} chars`;
}
function previewHtml(label, text) { return `<div class="psmap-help-text">${h(label)}: ${h(countText(text))}</div><pre>${h(String(text || '').slice(0, 600))}</pre>`; }
function renderPreviews(host, get) {
  host.querySelector('[data-psfa-preview="xml"]').innerHTML = previewHtml('Clash XML', get('xml').value);
  host.querySelector('[data-psfa-preview="expected"]').innerHTML = previewHtml('Expected CSV', get('expected').value);
  host.querySelector('[data-psfa-preview="details"]').innerHTML = previewHtml('Element Detail CSV', get('details').value);
}
function renderStatus(host, readiness) {
  const s = readiness?.summary;
  const status = readiness ? (readiness.blocking ? 'Blocking issues found' : 'Ready with no blocking errors') : 'Not checked';
  host.querySelector('[data-psfa="status-strip"]').innerHTML = `<div><b>Readiness</b><br>${h(status)}</div><div><b>Source family</b><br>${h(s?.sourceFamily || 'Unknown')}</div><div><b>XML / Expected / Detail</b><br>${s?.xmlClashCount || 0} / ${s?.expectedCount || 0} / ${s?.detailCount || 0}</div><div><b>Errors / Warnings</b><br>${s?.errorCount || 0} / ${s?.warnCount || 0}</div>`;
}
function renderAudit(host, state, config) {
  renderStatus(host, state.readiness);
  host.querySelector('[data-psfa="readiness"]').innerHTML = renderPsFamilyReadiness(state.readiness);
  host.querySelector('[data-psfa="summary"]').innerHTML = renderPsFamilySummary(state.audit);
  host.querySelector('[data-psfa="reports"]').innerHTML = renderPsFamilyReports(state.audit, state.activeReportTab, config, state.reportSearch);
}
function statusNode(host, key) { return host.querySelector(`[data-psfa-status="${key}"]`); }
function wireFileInput(host, get, input) {
  host.querySelector(`[data-psfa-file="${input.key}"]`).addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    try { await loadTextFileIntoTextarea(file, get(input.textareaKey), statusNode(host, input.key)); renderPreviews(host, get); } catch (error) { statusNode(host, input.key).textContent = error?.message || 'File load failed'; }
  });
}
function wireFileInputs(host, get, config) { config.inputFiles.forEach((input) => wireFileInput(host, get, input)); }
function wireSampleButton(host, get, sample) {
  host.querySelector(`[data-psfa-sample="${sample.key}"]`).addEventListener(ACTIVATE, () => {
    loadSampleTextIntoTextarea(sample, get(sample.textareaKey), statusNode(host, sample.key));
    renderPreviews(host, get);
  });
}
function wireSampleButtons(host, get) { listPsFamilySampleInputs().forEach((sample) => wireSampleButton(host, get, sample)); }
function showWorkspacePanel(host, state, tabKey) {
  state.activeWorkspaceTab = tabKey;
  host.querySelectorAll('[data-psfa-panel]').forEach((panel) => { panel.hidden = panel.dataset.psfaPanel !== tabKey; });
  host.querySelectorAll('[data-psfa-workspace-tab]').forEach((button) => { button.setAttribute('aria-selected', String(button.dataset.psfaWorkspaceTab === tabKey)); });
}
function wireWorkspaceTabs(host, state) {
  host.querySelectorAll('[data-psfa-workspace-tab]').forEach((button) => button.addEventListener(ACTIVATE, () => showWorkspacePanel(host, state, button.dataset.psfaWorkspaceTab)));
}
function wireTextPreviewInputs(host, get) { ['xml', 'expected', 'details'].forEach((key) => get(key).addEventListener('input', () => renderPreviews(host, get))); }
function wireReportTab(host, state, config, tab) {
  host.querySelector(`[data-psfa-tab="${tab.key}"]`).addEventListener(ACTIVATE, () => { state.activeReportTab = tab.key; renderAudit(host, state, config); });
}
function wireReportTabs(host, state, config) { config.reportTabs.forEach((tab) => wireReportTab(host, state, config, tab)); }
function wireReportSearch(host, state, config) {
  host.querySelector('[data-psfa="report-search"]').addEventListener('input', (event) => { state.reportSearch = event.target.value; renderAudit(host, state, config); });
}
function refreshReadiness(host, get, state, config) {
  state.readiness = createPsFamilyInputReadinessFromTextInputs(readAuditInput(get, config));
  renderAudit(host, state, config);
}
function wireCheckButton(host, get, state, config) { get('check-readiness').addEventListener(ACTIVATE, () => refreshReadiness(host, get, state, config)); }
function wireRunButton(host, get, state, config) {
  get('run').addEventListener(ACTIVATE, () => {
    const input = readAuditInput(get, config);
    state.readiness = createPsFamilyInputReadinessFromTextInputs(input);
    state.audit = createPsFamilyClashAuditFromTextInputs(input);
    renderAudit(host, state, config);
  });
}
function wireActiveExportButton(get, state) {
  get('export-active').addEventListener(ACTIVATE, () => {
    if (!state.audit) return;
    const active = createPsFamilyActiveReportExport(state.audit, state.activeReportTab);
    saveTextFile(`ps-family-active-${active.suffix}-${safeSource(state.audit)}.csv`, active.text, active.mime);
  });
}
function wireExportButton(get, state, button) {
  get(button.key).addEventListener(ACTIVATE, () => {
    if (!state.audit) return;
    const exports = createPsFamilyAuditExports(state.audit);
    saveTextFile(`ps-family-${button.suffix}-${safeSource(state.audit)}.${fileExtension(button.mime)}`, exports[button.exportKey], button.mime);
  });
}
function wireExportButtons(get, state, config) { config.outputButtons.forEach((button) => wireExportButton(get, state, button)); }
function closePopup(popup, onClose) { popup.remove(); onClose(); }
function wireCloseControls(popup, onClose) {
  popup.querySelector('[data-psfa-close="1"]').addEventListener(ACTIVATE, () => closePopup(popup, onClose));
  popup.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePopup(popup, onClose); });
}
function mountPopup(root, config, onClose) {
  const state = { audit: null, readiness: null, activeWorkspaceTab: 'input', activeReportTab: config.reportTabs[0].key, reportSearch: '' };
  const popup = document.createElement('section');
  popup.className = 'psmap-card';
  popup.setAttribute('data-ps-family-clash-audit', '1');
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-labelledby', POPUP_TITLE_ID);
  popup.setAttribute('aria-describedby', POPUP_DESC_ID);
  popup.setAttribute('tabindex', '-1');
  popup.innerHTML = renderPopup(config);
  root.appendChild(popup);
  const get = (name) => popup.querySelector(`[data-psfa="${name}"]`);
  wireCloseControls(popup, onClose);
  wireWorkspaceTabs(popup, state);
  wireFileInputs(popup, get, config);
  wireSampleButtons(popup, get);
  wireTextPreviewInputs(popup, get);
  wireReportTabs(popup, state, config);
  wireReportSearch(popup, state, config);
  wireCheckButton(popup, get, state, config);
  wireRunButton(popup, get, state, config);
  wireActiveExportButton(get, state);
  wireExportButtons(get, state, config);
  renderPreviews(popup, get);
  renderAudit(popup, state, config);
  if (typeof popup.focus === 'function') popup.focus();
  return popup;
}
export function installPsFamilyClashAuditTile(container, ctx = {}) {
  const config = resolvePsFamilyClashAuditConfig(ctx.psFamilyClashAuditConfig || {});
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-ps-family-clash-audit-launcher]')) return null;
  const launcher = document.createElement('section');
  launcher.setAttribute('data-ps-family-clash-audit-launcher', '1');
  launcher.innerHTML = renderLauncher(config);
  utilitiesRoot.appendChild(launcher);
  let popup = null;
  launcher.querySelector('[data-psfa-open="1"]').addEventListener(ACTIVATE, () => {
    if (popup) return;
    popup = mountPopup(utilitiesRoot, config, () => { popup = null; });
  });
  return () => { if (popup) popup.remove(); launcher.remove(); };
}
export const _test = Object.freeze({ renderInputShell, renderLauncher, renderPopup, readTextInputs, readPsFamilyUiSettings, PS_FAMILY_CLASH_AUDIT_CONFIG, renderStatusStrip });
