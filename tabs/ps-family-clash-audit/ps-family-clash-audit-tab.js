import { createPsFamilyClashAuditFromTextInputs } from './ps-family-clash-audit-actions.js';
import { createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from './ps-family-clash-audit-config.js';
import { renderPsFamilyReports, renderPsFamilySummary } from './ps-family-clash-audit-view.js';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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

function renderInputShell(config) {
  return `<div class="psmap-card-head"><b>${h(config.appTitle)}</b></div>
    <div class="psmap-card-body">
      <div class="psmap-help-text">Clash XML + expected PS CSV + element-detail CSV → audit reports.</div>
      ${renderInfoList(config)}
      <div class="psmap-grid-2">
        <label>Clash XML<textarea data-psfa="xml" rows="${h(config.inputRows)}" placeholder="Paste Navis clash XML"></textarea></label>
        <label>Expected PS CSV<textarea data-psfa="expected" rows="${h(config.inputRows)}" placeholder="Paste Item Name CSV"></textarea></label>
        <label>Element Detail CSV<textarea data-psfa="details" rows="${h(config.inputRows)}" placeholder="Paste Name/p1bore/pipe/Position CSV"></textarea></label>
        <label>Source side<select data-psfa="source-side">${renderSourceOptions(config)}</select></label>
        <label>POS tolerance mm<input data-psfa="tolerance" type="number" value="${h(config.posToleranceMm)}" min="${h(config.toleranceMinMm)}" step="${h(config.toleranceStepMm)}"></label>
      </div>
      <div class="psmap-actions"><button type="button" data-psfa="run">Run Audit</button>${renderExportButtons(config)}</div>
      <div data-psfa="summary"></div><div data-psfa="reports"></div>
    </div>`;
}

function readTextInputs(get) {
  return {
    clashXmlText: get('xml').value,
    expectedCsvText: get('expected').value,
    detailCsvText: get('details').value,
  };
}

function renderAudit(host, audit) {
  host.querySelector('[data-psfa="summary"]').innerHTML = renderPsFamilySummary(audit);
  host.querySelector('[data-psfa="reports"]').innerHTML = renderPsFamilyReports(audit);
}

function wireRunButton(host, get, state, config) {
  get('run').addEventListener('click', () => {
    state.audit = createPsFamilyClashAuditFromTextInputs({
      ...readTextInputs(get),
      config: readPsFamilyUiSettings(get, config),
    });
    renderAudit(host, state.audit);
  });
}

function wireExportButton(get, state, config, button) {
  get(button.key).addEventListener('click', () => {
    if (!state.audit) return;
    const exports = createPsFamilyAuditExports(state.audit);
    downloadText(`ps-family-${button.suffix}-${safeSource(state.audit)}.${button.mime === 'application/json' ? 'json' : 'csv'}`, exports[button.exportKey], button.mime);
  });
}

function wireExportButtons(get, state, config) {
  config.outputButtons.forEach((button) => wireExportButton(get, state, config, button));
}

export function installPsFamilyClashAuditTile(container, ctx = {}) {
  const config = resolvePsFamilyClashAuditConfig(ctx.psFamilyClashAuditConfig || {});
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-ps-family-clash-audit]')) return null;
  const state = { audit: null };
  const host = document.createElement('section');
  host.className = 'psmap-card';
  host.setAttribute('data-ps-family-clash-audit', '1');
  host.innerHTML = renderInputShell(config);
  utilitiesRoot.appendChild(host);
  const get = (name) => host.querySelector(`[data-psfa="${name}"]`);
  wireRunButton(host, get, state, config);
  wireExportButtons(get, state, config);
  renderAudit(host, state.audit);
  return () => host.remove();
}

export const _test = Object.freeze({
  renderInputShell,
  readTextInputs,
  readPsFamilyUiSettings,
  PS_FAMILY_CLASH_AUDIT_CONFIG,
});
