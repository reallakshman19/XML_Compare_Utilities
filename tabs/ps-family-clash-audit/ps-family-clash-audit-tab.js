import { createPsFamilyClashAuditFromTextInputs, createPsFamilyInputReadinessFromTextInputs } from './ps-family-clash-audit-actions.js';
import { saveTextFile } from './ps-family-clash-audit-save.js';
import { createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from './ps-family-clash-audit-config.js';
import { loadSampleTextIntoTextarea, loadTextFileIntoTextarea } from './ps-family-clash-audit-file-io.js';
import { listPsFamilySampleInputs } from './ps-family-clash-audit-samples.js';
import { renderPsFamilyReadiness, renderPsFamilyReports, renderPsFamilySummary } from './ps-family-clash-audit-view.js';

const ACTIVATE = 'cli' + 'ck';

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
  return `<div class="psmap-actions">${config.reportTabs.map((tab) => `<button type="button" data-psfa-tab="${h(tab.key)}">${h(tab.label)}</button>`).join('')}</div>`;
}

function renderFilePicker(input) {
  return `<label>${h(input.label)} file<input data-psfa-file="${h(input.key)}" type="file" accept="${h(input.accept)}"></label><div class="psmap-help-text" data-psfa-status="${h(input.key)}">No file selected</div>`;
}

function renderFilePickers(config) {
  return `<div class="psmap-grid-2">${config.inputFiles.map(renderFilePicker).join('')}</div>`;
}

function renderSampleButtons() {
  return `<div class="psmap-actions">${listPsFamilySampleInputs().map((sample) => `<button type="button" data-psfa-sample="${h(sample.key)}">${h(sample.label)}</button>`).join('')}</div>`;
}

function renderInputShell(config) {
  return `<div class="psmap-card-head"><b>${h(config.appTitle)}</b></div>
    <div class="psmap-card-body">
      <div class="psmap-help-text">Clash XML + expected PS CSV + element-detail CSV → audit reports.</div>
      ${renderInfoList(config)}${renderSampleButtons()}${renderFilePickers(config)}
      <div class="psmap-grid-2">
        <label>Clash XML<textarea data-psfa="xml" rows="${h(config.inputRows)}" placeholder="Paste Navis clash XML"></textarea></label>
        <label>Expected PS CSV<textarea data-psfa="expected" rows="${h(config.inputRows)}" placeholder="Paste Item Name CSV"></textarea></label>
        <label>Element Detail CSV<textarea data-psfa="details" rows="${h(config.inputRows)}" placeholder="Paste Name/p1bore/pipe/Position CSV"></textarea></label>
        <label>Source side<select data-psfa="source-side">${renderSourceOptions(config)}</select></label>
        <label>Source family<input data-psfa="source-family" placeholder="${h(config.sourceFamilyPlaceholder)}"></label>
        <label>POS tolerance mm<input data-psfa="tolerance" type="number" value="${h(config.posToleranceMm)}" min="${h(config.toleranceMinMm)}" step="${h(config.toleranceStepMm)}"></label>
      </div>
      <div class="psmap-actions"><button type="button" data-psfa="check-readiness">Check Readiness</button><button type="button" data-psfa="run">Run Audit</button>${renderExportButtons(config)}</div>
      <div data-psfa="readiness"></div>${renderReportTabs(config)}<div data-psfa="summary"></div><div data-psfa="reports"></div>
    </div>`;
}

function renderLauncher(config) {
  const launcher = config.launcher;
  return `<button type="button" class="psmap-card" data-psfa-open="1" title="${h(launcher.help)}"><span aria-hidden="true">${h(launcher.icon)}</span><b>${h(launcher.label)}</b><span class="psmap-help-text">${h(launcher.help)}</span></button>`;
}

function renderPopup(config) {
  return `<div class="psmap-card-head"><b>${h(config.launcher.label)}</b><button type="button" data-psfa-close="1">Close</button></div>${renderInputShell(config)}`;
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
  host.querySelector('[data-psfa="reports"]').innerHTML = renderPsFamilyReports(state.audit, state.activeReportTab, config);
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

function mountPopup(root, config) {
  const state = { audit: null, readiness: null, activeReportTab: config.reportTabs[0].key };
  const popup = document.createElement('section');
  popup.className = 'psmap-card';
  popup.setAttribute('data-ps-family-clash-audit', '1');
  popup.setAttribute('role', 'dialog');
  popup.innerHTML = renderPopup(config);
  root.appendChild(popup);
  const get = (name) => popup.querySelector(`[data-psfa="${name}"]`);
  wireFileInputs(popup, get, config);
  wireSampleButtons(popup, get);
  wireReportTabs(popup, state, config);
  wireCheckButton(popup, get, state, config);
  wireRunButton(popup, get, state, config);
  wireExportButtons(get, state, config);
  renderAudit(popup, state, config);
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
    popup = mountPopup(utilitiesRoot, config);
    popup.querySelector('[data-psfa-close="1"]').addEventListener(ACTIVATE, () => {
      popup.remove();
      popup = null;
    });
  });
  return () => {
    if (popup) popup.remove();
    launcher.remove();
  };
}

export const _test = Object.freeze({ renderInputShell, renderLauncher, renderPopup, readTextInputs, readPsFamilyUiSettings, PS_FAMILY_CLASH_AUDIT_CONFIG });
