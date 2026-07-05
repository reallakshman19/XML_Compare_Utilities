import { createPsFamilyClashAuditFromTextInputs, createPsFamilyInputReadinessFromTextInputs } from './ps-family-clash-audit-actions.js';
import { saveTextFile } from './ps-family-clash-audit-save.js';
import { createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from './ps-family-clash-audit-config.js';
import { loadSampleTextIntoTextarea, loadTextFileIntoTextarea } from './ps-family-clash-audit-file-io.js';
import { listPsFamilySampleInputs } from './ps-family-clash-audit-samples.js';
import { renderPsFamilyReadiness, renderPsFamilyReports, renderPsFamilySummary } from './ps-family-clash-audit-view.js';

const ACTIVATE = 'cli' + 'ck';
const POPUP_TITLE_ID = 'ps-family-clash-audit-title';
const POPUP_DESC_ID = 'ps-family-clash-audit-desc';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function safeSource(audit) {
  return audit?.summary?.sourceFamily || 'audit';
}

function renderInfoList(config) {
  return `<ul class="psmap-help-text">${config.info.map((item) => `<li>${h(item)}</li>`).join('')}</ul>`;
}

function renderSourceOptions(config) {
  return config.sourceSideOptions.map((item) => `<option value="${h(item.value)}">${h(item.label)}</option>`).join('');
}

function renderExportButtons(config) {
  return config.outputButtons.map((item) => `<button type="button" data-psfa="${h(item.key)}">${h(item.label)}</button>`).join('');
}

function renderReportTabs(config) {
  return `<div class="psmap-actions" aria-label="Report tabs">${config.reportTabs.map((tab) => `<button type="button" data-psfa-tab="${h(tab.key)}">${h(tab.label)}</button>`).join('')}</div>`;
}

function renderSection(title, body, label = title) {
  return `<section class="psmap-card" aria-label="${h(label)}"><div class="psmap-card-head"><b>${h(title)}</b></div><div class="psmap-card-body">${body}</div></section>`;
}

function renderFilePicker(input) {
  return `<label>${h(input.label)} file<input data-psfa-file="${h(input.key)}" type="file" accept="${h(input.accept)}"></label><div class="psmap-help-text" data-psfa-status="${h(input.key)}">No file selected</div>`;
}

function renderFilePickers(config) {
  return `<div class="psmap-grid-2">${config.inputFiles.map(renderFilePicker).join('')}</div>`;
}

function renderSampleButtons() {
  return `<div class="psmap-actions" aria-label="Official sample loaders">${listPsFamilySampleInputs().map((sample) => `<button type="button" data-psfa-sample="${h(sample.key)}">${h(sample.label)}</button>`).join('')}</div>`;
}

function renderTextInputs(config) {
  return `<div class="psmap-grid-2">
    <label>Clash XML<textarea data-psfa="xml" rows="${h(config.inputRows)}" placeholder="Paste Navis clash XML"></textarea></label>
    <label>Expected PS CSV<textarea data-psfa="expected" rows="${h(config.inputRows)}" placeholder="Paste Item Name CSV"></textarea></label>
    <label>Element Detail CSV<textarea data-psfa="details" rows="${h(config.inputRows)}" placeholder="Paste Name/p1bore/pipe/Position CSV"></textarea></label>
    <label>Source side<select data-psfa="source-side">${renderSourceOptions(config)}</select></label>
    <label>Source family<input data-psfa="source-family" placeholder="${h(config.sourceFamilyPlaceholder)}"></label>
    <label>POS tolerance mm<input data-psfa="tolerance" type="number" value="${h(config.posToleranceMm)}" min="${h(config.toleranceMinMm)}" step="${h(config.toleranceStepMm)}"></label>
  </div>`;
}

function renderReportReview(config) {
  const filter = `<label>Report search<input data-psfa="report-search" placeholder="Filter current report, e.g. D90001 or PS-90001.1"></label><div class="psmap-help-text">Search is case-insensitive and applies to the selected report tab only.</div>`;
  return renderSection('4. Report review', `${filter}${renderReportTabs(config)}<div data-psfa="summary"></div><div data-psfa="reports"></div>`);
}

function renderInputShell(config) {
  const intro = `<div id="${POPUP_DESC_ID}" class="psmap-help-text">Load or paste all three inputs, check readiness, then run the audit when ready.</div>${renderInfoList(config)}`;
  const inputActions = `<div class="psmap-help-text">Use official samples for validation, or load/paste your own files.</div>${renderSampleButtons()}${renderFilePickers(config)}`;
  const auditActions = `<div class="psmap-actions" aria-label="Audit and export actions"><button type="button" data-psfa="check-readiness">Check Readiness</button><button type="button" data-psfa="run">Run Audit</button>${renderExportButtons(config)}</div>`;
  return `<div class="psmap-card-body">
    ${intro}
    ${renderSection('1. Input actions', inputActions)}
    ${renderSection('2. Input text and settings', renderTextInputs(config))}
    ${renderSection('3. Audit actions and exports', auditActions)}
    <div data-psfa="readiness" aria-live="polite"></div>
    ${renderReportReview(config)}
  </div>`;
}

function renderLauncher(config) {
  const launcher = config.launcher;
  return `<button type="button" class="psmap-card" data-psfa-open="1" title="${h(launcher.help)}"><span aria-hidden="true">${h(launcher.icon)}</span><b>${h(launcher.label)}</b><span class="psmap-help-text">${h(launcher.help)}</span></button>`;
}

function renderPopup(config) {
  return `<div class="psmap-card-head"><b id="${POPUP_TITLE_ID}">${h(config.launcher.label)}</b><button type="button" data-psfa-close="1" aria-label="Close PS Family Clash Audit popup">Close PS clash check</button></div>${renderInputShell(config)}`;
}

function readTextInputs(get) {
  return { clashXmlText: get('xml').value, expectedCsvText: get('expected').value, detailCsvText: get('details').value };
}

function readAuditInput(get, config) {
  return { ...readTextInputs(get), config: readPsFamilyUiSettings(get, config) };
}

function renderAudit(host, state, config) {
  host.querySelector('[data-psfa="readiness"]').innerHTML = renderPsFamilyReadiness(state.readiness);
  host.querySelector('[data-psfa="summary"]').innerHTML = renderPsFamilySummary(state.audit);
  host.querySelector('[data-psfa="reports"]').innerHTML = renderPsFamilyReports(state.audit, state.activeReportTab, config, state.reportSearch);
}

function statusNode(host, key) {
  return host.querySelector(`[data-psfa-status="${key}"]`);
}

function wireFileInput(host, get, input) {
  const fileInput = host.querySelector(`[data-psfa-file="${input.key}"]`);
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    try {
      await loadTextFileIntoTextarea(file, get(input.textareaKey), statusNode(host, input.key));
    } catch (error) {
      statusNode(host, input.key).textContent = error?.message || 'File load failed';
    }
  });
}

function wireFileInputs(host, get, config) {
  config.inputFiles.forEach((input) => wireFileInput(host, get, input));
}

function wireSampleButton(host, get, sample) {
  host.querySelector(`[data-psfa-sample="${sample.key}"]`).addEventListener(ACTIVATE, () => {
    loadSampleTextIntoTextarea(sample, get(sample.textareaKey), statusNode(host, sample.key));
  });
}

function wireSampleButtons(host, get) {
  listPsFamilySampleInputs().forEach((sample) => wireSampleButton(host, get, sample));
}

function wireReportTab(host, state, config, tab) {
  host.querySelector(`[data-psfa-tab="${tab.key}"]`).addEventListener(ACTIVATE, () => {
    state.activeReportTab = tab.key;
    renderAudit(host, state, config);
  });
}

function wireReportTabs(host, state, config) {
  config.reportTabs.forEach((tab) => wireReportTab(host, state, config, tab));
}

function wireReportSearch(host, state, config) {
  host.querySelector('[data-psfa="report-search"]').addEventListener('input', (event) => {
    state.reportSearch = event.target.value;
    renderAudit(host, state, config);
  });
}

function refreshReadiness(host, get, state, config) {
  state.readiness = createPsFamilyInputReadinessFromTextInputs(readAuditInput(get, config));
  renderAudit(host, state, config);
}

function wireCheckButton(host, get, state, config) {
  get('check-readiness').addEventListener(ACTIVATE, () => refreshReadiness(host, get, state, config));
}

function wireRunButton(host, get, state, config) {
  get('run').addEventListener(ACTIVATE, () => {
    const input = readAuditInput(get, config);
    state.readiness = createPsFamilyInputReadinessFromTextInputs(input);
    state.audit = createPsFamilyClashAuditFromTextInputs(input);
    renderAudit(host, state, config);
  });
}

function wireExportButton(get, state, button) {
  get(button.key).addEventListener(ACTIVATE, () => {
    if (!state.audit) return;
    const exports = createPsFamilyAuditExports(state.audit);
    const extension = button.mime === 'application/json' ? 'json' : 'csv';
    saveTextFile(`ps-family-${button.suffix}-${safeSource(state.audit)}.${extension}`, exports[button.exportKey], button.mime);
  });
}

function wireExportButtons(get, state, config) {
  config.outputButtons.forEach((button) => wireExportButton(get, state, button));
}

function closePopup(popup, onClose) {
  popup.remove();
  onClose();
}

function wireCloseControls(popup, onClose) {
  popup.querySelector('[data-psfa-close="1"]').addEventListener(ACTIVATE, () => closePopup(popup, onClose));
  popup.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopup(popup, onClose);
  });
}

function mountPopup(root, config, onClose) {
  const state = { audit: null, readiness: null, activeReportTab: config.reportTabs[0].key, reportSearch: '' };
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
  wireFileInputs(popup, get, config);
  wireSampleButtons(popup, get);
  wireReportTabs(popup, state, config);
  wireReportSearch(popup, state, config);
  wireCheckButton(popup, get, state, config);
  wireRunButton(popup, get, state, config);
  wireExportButtons(get, state, config);
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
  return () => {
    if (popup) popup.remove();
    launcher.remove();
  };
}

export const _test = Object.freeze({ renderInputShell, renderLauncher, renderPopup, readTextInputs, readPsFamilyUiSettings, PS_FAMILY_CLASH_AUDIT_CONFIG });
