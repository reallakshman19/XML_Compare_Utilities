import { buildSupportReportBundle } from './support-report-engine.js?v=20260910-support-report-field-provenance-14&trace=20260910-support-report-json-trace-18&rca=20260910-bore-site-zone-19';
import { supportReportToCsv } from './support-report-export.js?v=20260910-support-report-typicality-columns-1';
import {
  buildSupportReportTypicalityComparison,
  projectTypicalityOntoSupportReportBundle,
} from './support-report-typicality-projection.js?v=20260910-support-report-typicality-ui-2';
import {
  SUPPORT_REPORT_TYPICALITY_FIXED_POLICIES,
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  SUPPORT_REPORT_TYPICALITY_UI_SETTINGS,
  profileOverrideFromEntries,
  profileValue,
} from './support-report-typicality-profile.js?v=20260910-support-report-typicality-profile-ui-1';
import { renderSupportReportWorkspace } from './support-report-view.js?v=20260910-support-report-typicality-columns-1&trace=20260910-support-report-json-trace-18';
import { supportReportToXlsxBytes } from './support-report-xlsx.js?v=20260910-support-report-typicality-columns-1';
import { parseSupportReportClashXml } from './support-report-clash-safety.js?v=20260909-support-report-parser-primitives-8&location=20260910-support-report-location-17&typicality=20260910-support-report-typicality-17';
import { assertSupportReportEvidenceReady } from './support-report-build-gate.js?v=20260909-support-report-empty-block-7';
import {
  supportReportCompleteness,
  supportReportExportFileName,
} from './support-report-ui-state.js?v=20260910-support-report-ui-completeness-16';
import { buildSupportSteelRelationshipBundle } from './support-steel-evidence-bundle.js?v=20260909-support-report-1';
import { parseSupportSteelJson } from './support-steel-source-utils.js?v=20260717-startup-parse-hotfix-1';

const POPUP_SELECTOR = '[data-ssrb-popup="1"]';
const TAB_KEY = 'support-report';
const SUPPORT_REPORT_FAMILY_PATTERN = '^/((?:PS|SL)-[A-Z0-9_-]+)';
const mounted = new WeakSet();
const stateByPopup = new WeakMap();
let observer = null;

export function installSupportReportAddon() {
  const doc = globalThis.document;
  if (!doc || observer) return () => {};
  mountAll(doc);
  observer = new MutationObserver(() => mountAll(doc));
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  return () => { observer?.disconnect(); observer = null; };
}

function mountAll(doc) {
  for (const popup of doc.querySelectorAll(POPUP_SELECTOR)) mount(popup);
}

function mount(popup) {
  if (mounted.has(popup)) return;
  const tabs = popup.querySelector('.ssrb-tabs');
  const workspace = popup.querySelector('.ssrb-workspace');
  if (!tabs || !workspace) return;

  // Query-versioned ESM imports can create more than one addon module instance.
  // DOM ownership is therefore the cross-instance idempotence authority, not this
  // module's WeakSet alone. Preserve a complete existing mount; repair an orphaned
  // half-mount before creating a new coherent tab/panel pair.
  const existingButton = popup.querySelector(`[data-ssrb-tab="${TAB_KEY}"]`);
  const existingPanel = popup.querySelector(`[data-ssrb-panel="${TAB_KEY}"]`);
  if (existingButton && existingPanel) {
    mounted.add(popup);
    return;
  }
  existingButton?.remove();
  existingPanel?.remove();

  mounted.add(popup);
  stateByPopup.set(popup, { report: null });

  const button = popup.ownerDocument.createElement('button');
  button.type = 'button';
  button.dataset.ssrbTab = TAB_KEY;
  button.textContent = 'Support Report';
  tabs.appendChild(button);

  const panel = popup.ownerDocument.createElement('section');
  panel.dataset.ssrbPanel = TAB_KEY;
  panel.hidden = true;
  panel.innerHTML = renderPanel();
  workspace.appendChild(panel);

  button.addEventListener('click', () => showPanel(popup));
  popup.querySelector('[data-ssr-file]')?.addEventListener('change', () => void readXmlFile(popup, 'primary'));
  popup.querySelector('[data-ssr-typical-file]')?.addEventListener('change', () => void readXmlFile(popup, 'typical'));
  popup.querySelector('[data-ssr-model-file]')?.addEventListener('change', () => void readModelFile(popup));
  popup.querySelector('[data-ssr-xml]')?.addEventListener('input', () => invalidate(popup, 'Primary XML changed; rebuild the Support Report.'));
  popup.querySelector('[data-ssr-typical-xml]')?.addEventListener('input', () => invalidate(popup, 'Typical-structure reference XML changed; rebuild the Support Report.'));
  popup.querySelector('[data-ssrb-input="model"]')?.addEventListener('input', () => {
    syncModelStatus(popup, 'Shared combined staged model changed; rebuild the Support Report.');
    invalidate(popup, 'Combined staged model changed; rebuild the Support Report.');
  });
  popup.querySelectorAll('[data-ssrb-rule]').forEach((node) => {
    const eventName = node.type === 'checkbox' || node.tagName === 'SELECT' ? 'change' : 'input';
    node.addEventListener(eventName, () => invalidate(popup, 'Relationship rules changed; rebuild the Support Report.'));
  });
  popup.querySelectorAll('[data-ssr-typical-setting]').forEach((node) => {
    const eventName = node.type === 'checkbox' || node.tagName === 'SELECT' ? 'change' : 'input';
    node.addEventListener(eventName, () => invalidate(popup, 'Typicality matching configuration changed; rebuild the Support Report.'));
  });
  popup.querySelector('[data-ssr-build]')?.addEventListener('click', () => run(popup));
  popup.querySelector('[data-ssr-download-xlsx]')?.addEventListener('click', () => void downloadXlsx(popup));
  popup.querySelector('[data-ssr-download]')?.addEventListener('click', () => downloadCsv(popup));
  popup.querySelector('[data-ssr-copy]')?.addEventListener('click', () => void copyCsv(popup));
}

function renderPanel() {
  return `<section class="ssrb-card ssrb-results-card"><header><div><span class="ssrb-step">R</span><b>Build Support Report from Navisworks clash evidence</b></div><span class="ssrb-panel-note">Primary clash XML establishes pipe, secondary family and physical support location. Optional staged JSON enriches current PS/SL identity and native attributes. Optional second XML enables auditable typical-structure comparison.</span></header><div class="ssrb-input-grid">${xmlSourceCard()}${typicalSourceCard()}${modelSourceCard()}</div>${typicalityConfigCard()}<div class="ssrb-build-grid"><div><h3>SupportReportBundle.v1</h3><p>Rows use the governed family + pipe + physical clash-location model. Typicality is derived evidence only; spreadsheet row order and absolute global translation are never correspondence keys.</p><div class="ssrb-dialog-actions"><button type="button" class="ssrb-primary" data-ssr-build="1">Build Support Report</button><button type="button" class="ssrb-primary" data-ssr-download-xlsx="1" disabled>Download XLSX</button><button type="button" data-ssr-download="1" disabled>Download CSV</button><button type="button" data-ssr-copy="1" disabled>Copy CSV</button></div></div><div class="ssrb-run-state" data-ssr-run-state><b>Not built</b><span>Load the primary XML. Staged JSON and typical-structure reference XML are optional evidence sources.</span></div></div><div data-ssr-results>${renderSupportReportWorkspace(null)}</div></section>`;
}
function xmlSourceCard() {
  return `<div class="ssrb-source-card"><div class="ssrb-source-head"><b>Primary Support Report clash XML</b><label class="ssrb-file-button">Choose XML<input type="file" accept=".xml,text/xml,application/xml" data-ssr-file="1"></label></div><span>Navisworks clash/clearance XML used to build the operational Support Report and governed physical locations.</span><textarea rows="12" data-ssr-xml spellcheck="false" placeholder="Paste primary SupportreportXML.xml"></textarea><small data-ssr-file-status>No primary Support Report XML selected</small></div>`;
}
function typicalSourceCard() {
  return `<div class="ssrb-source-card"><div class="ssrb-source-head"><b>Typical-structure reference XML</b><label class="ssrb-file-button">Choose second XML<input type="file" accept=".xml,text/xml,application/xml" data-ssr-typical-file="1"></label></div><span>Optional second-area XML. When present, family structural matching and row-independent piping-support correspondence add comparison columns 22–24.</span><textarea rows="12" data-ssr-typical-xml spellcheck="false" placeholder="Optional: paste reference/second SupportreportXML.xml"></textarea><small data-ssr-typical-file-status>No reference XML selected · legacy 21-column mode</small></div>`;
}
function modelSourceCard() {
  return `<div class="ssrb-source-card"><div class="ssrb-source-head"><b>Staged JSON trace source (optional)</b><label class="ssrb-file-button">Choose JSON<input type="file" accept=".json,application/json" data-ssr-model-file="1"></label></div><span>Uses the same combined staged-model source as the Input tab. Direct PS/SL identity is preferred; JSON trace records match and POS basis.</span><small data-ssr-model-status>No staged JSON imported from Support Report. Existing Input-tab model, if any, will still be used.</small></div>`;
}
function typicalityConfigCard() {
  const sections = new Map();
  for (const setting of SUPPORT_REPORT_TYPICALITY_UI_SETTINGS) {
    if (!sections.has(setting.section)) sections.set(setting.section, []);
    sections.get(setting.section).push(setting);
  }
  const controls = [...sections.entries()].map(([section, settings]) => `<div class="ssrb-source-card"><b>${h(section)}</b>${settings.map(renderTypicalitySetting).join('')}</div>`).join('');
  const policies = SUPPORT_REPORT_TYPICALITY_FIXED_POLICIES.map((policy) => `<div><b>${h(policy.label)}</b>: ${h(policy.value)} ${infoIcon(policy.help)}</div>`).join('');
  return `<details class="ssrb-card" data-ssr-typical-config><summary><b>Typicality matching configuration</b> ${infoIcon('Editable values below feed the comparison profile used in the audit. Defaults are provisional and remain visible rather than hidden in code.')}</summary><p>Active comparison controls. Changing any value invalidates the current report and requires rebuild.</p><div class="ssrb-input-grid">${controls}</div><div class="ssrb-source-card"><b>Declared matcher policies / next structured-sequence seam</b>${policies}</div></details>`;
}
function renderTypicalitySetting(setting) {
  const value = profileValue(SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL, setting.path);
  const common = `data-ssr-typical-setting="${h(setting.path)}" aria-label="${h(setting.label)}"`;
  const control = setting.type === 'checkbox'
    ? `<input type="checkbox" ${common}${value ? ' checked' : ''}>`
    : `<input type="number" ${common} value="${h(value)}"${setting.min != null ? ` min="${h(setting.min)}"` : ''}${setting.max != null ? ` max="${h(setting.max)}"` : ''}${setting.step != null ? ` step="${h(setting.step)}"` : ''}>`;
  return `<label style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:center;margin:.45rem 0"><span>${h(setting.label)}${setting.unit ? ` (${h(setting.unit)})` : ''} ${infoIcon(setting.help)}</span>${control}</label>`;
}
function infoIcon(help) {
  return `<span role="img" aria-label="Information: ${h(help)}" title="${h(help)}" style="cursor:help;text-decoration:underline dotted">(i)</span>`;
}

async function readXmlFile(popup, kind) {
  const typical = kind === 'typical';
  const input = popup.querySelector(typical ? '[data-ssr-typical-file]' : '[data-ssr-file]');
  const file = input?.files?.[0];
  if (!file) return;
  const textarea = popup.querySelector(typical ? '[data-ssr-typical-xml]' : '[data-ssr-xml]');
  if (textarea) textarea.value = await file.text();
  const status = popup.querySelector(typical ? '[data-ssr-typical-file-status]' : '[data-ssr-file-status]');
  if (status) status.textContent = `${file.name} · ${file.size} bytes`;
  invalidate(popup, typical
    ? 'Typical-structure reference XML changed; rebuild the Support Report.'
    : 'Primary XML changed; rebuild the Support Report.');
}

async function readModelFile(popup) {
  const file = popup.querySelector('[data-ssr-model-file]')?.files?.[0];
  if (!file) return;
  const text = await file.text();
  const sharedInput = popup.querySelector('[data-ssrb-input="model"]');
  if (!sharedInput) throw new Error('Combined staged model input is unavailable.');
  sharedInput.value = text;
  const sharedStatus = popup.querySelector('[data-ssrb-file-status="model"]');
  if (sharedStatus) sharedStatus.textContent = `${file.name} · ${file.size} bytes · loaded from Support Report`;
  popup.querySelector('[data-ssr-model-status]').textContent = `${file.name} · ${file.size} bytes · shared with Input tab`;
  invalidate(popup, 'Staged JSON changed; rebuild the Support Report.');
}

function syncModelStatus(popup, message) {
  const status = popup.querySelector('[data-ssr-model-status]');
  if (status) status.textContent = message;
}

function run(popup) {
  const state = stateByPopup.get(popup);
  const host = popup.querySelector('[data-ssr-results]');
  const runState = popup.querySelector('[data-ssr-run-state]');
  try {
    const xmlText = popup.querySelector('[data-ssr-xml]')?.value || '';
    if (!xmlText.trim()) throw new Error('Primary Support Report clash XML is required.');
    const modelText = popup.querySelector('[data-ssrb-input="model"]')?.value || '';
    let relationshipBundle = null;
    if (modelText.trim()) {
      const combinedInput = parseSupportSteelJson(modelText, 'Combined staged model source');
      relationshipBundle = buildSupportSteelRelationshipBundle({ combinedInput, config: supportReportRules(popup) });
    }
    const clashEvidence = assertSupportReportEvidenceReady(parseSupportReportClashXml(xmlText));
    let report = buildSupportReportBundle({ clashEvidence, relationshipBundle });
    const referenceXmlText = popup.querySelector('[data-ssr-typical-xml]')?.value || '';
    if (referenceXmlText.trim()) {
      const referenceEvidence = assertSupportReportEvidenceReady(parseSupportReportClashXml(referenceXmlText));
      const referenceReport = buildSupportReportBundle({ clashEvidence: referenceEvidence });
      const typicalityAudit = buildSupportReportTypicalityComparison(clashEvidence, referenceEvidence, {
        leftReportBundle: report,
        rightReportBundle: referenceReport,
        profile: readTypicalityProfile(popup),
      });
      report = projectTypicalityOntoSupportReportBundle(report, typicalityAudit, clashEvidence);
    }
    state.report = report;
    host.innerHTML = renderSupportReportWorkspace(report);
    runState.innerHTML = renderReadyState(report);
    setExportEnabled(popup, true);
  } catch (error) {
    state.report = null;
    host.innerHTML = `<div class="ssrb-empty"><b>Support Report blocked</b><br>${h(error.message || error)}</div>`;
    runState.innerHTML = `<b>Build blocked</b><span>${h(error.message || error)}</span>`;
    setExportEnabled(popup, false);
  }
}

function renderReadyState(report) {
  const summary = report?.summary || {};
  const completeness = supportReportCompleteness(report);
  const metrics = `${summary.clashEvidenceCount || 0} clash rows → ${summary.reportRowCount || 0} report rows · ${summary.enrichedRowCount || 0} enriched · ${summary.multiLocationRowCount || 0} multi-location rows`;
  const comparison = comparisonReadyText(report);
  if (!completeness.partial) return `<b>Support Report ready</b><span>${metrics} · no XML-only rows remain${comparison}</span>`;
  return `<b>Support Report ready — partial enrichment</b><span>${metrics} · ${completeness.xmlOnlyRowCount} XML-only row${completeness.xmlOnlyRowCount === 1 ? '' : 's'} remain${comparison}. Exports are evidence-review artifacts and may contain unresolved native fields.</span>`;
}

function comparisonReadyText(report) {
  const audit = report?.typicalityAudit;
  if (!audit) return ' · legacy 21-column mode';
  const matches = audit.matches || [];
  const typical = matches.filter((item) => item.result === 'TYPICAL').length;
  const review = matches.filter((item) => item.result === 'REVIEW').length;
  const ambiguous = matches.filter((item) => item.result === 'AMBIGUOUS').length;
  return ` · typicality: ${typical} typical, ${review} review, ${ambiguous} ambiguous · comparison columns 22–24 enabled · profile ${audit.profileId || 'unknown'}`;
}

function readExistingRules(popup) {
  const values = {};
  popup.querySelectorAll('[data-ssrb-rule]').forEach((node) => {
    const key = node.dataset.ssrbRule;
    values[key] = node.type === 'checkbox' ? node.checked : node.type === 'number' ? Number(node.value) : node.value;
  });
  return values;
}
function readTypicalityProfile(popup) {
  const entries = [...popup.querySelectorAll('[data-ssr-typical-setting]')].map((node) => {
    const value = node.type === 'checkbox' ? node.checked : Number(node.value);
    if (node.type !== 'checkbox' && !Number.isFinite(value)) throw new Error(`Invalid typicality setting: ${node.dataset.ssrTypicalSetting}`);
    return { path: node.dataset.ssrTypicalSetting, value };
  });
  return profileOverrideFromEntries(entries);
}
function supportReportRules(popup) { return { ...readExistingRules(popup), supportFamilyPattern: SUPPORT_REPORT_FAMILY_PATTERN }; }

function invalidate(popup, message) {
  const state = stateByPopup.get(popup);
  if (state) state.report = null;
  const runState = popup.querySelector('[data-ssr-run-state]');
  if (runState) runState.innerHTML = `<b>Inputs changed</b><span>${h(message)}</span>`;
  setExportEnabled(popup, false);
}
function setExportEnabled(popup, enabled) {
  for (const node of popup.querySelectorAll('[data-ssr-copy], [data-ssr-download], [data-ssr-download-xlsx]')) {
    node.disabled = !enabled;
    node.setAttribute('aria-disabled', String(!enabled));
  }
}
async function copyCsv(popup) {
  const report = stateByPopup.get(popup)?.report;
  if (report) await globalThis.navigator?.clipboard?.writeText(reportCsv(report));
}
async function downloadXlsx(popup) {
  const report = stateByPopup.get(popup)?.report;
  if (!report) return;
  const runState = popup.querySelector('[data-ssr-run-state]');
  try {
    const bytes = await supportReportToXlsxBytes(report);
    downloadBlob(popup, supportReportExportFileName(report, 'xlsx'), bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (error) {
    if (runState) runState.innerHTML = `<b>XLSX export blocked</b><span>${h(error.message || error)}</span>`;
  }
}
function downloadCsv(popup) {
  const report = stateByPopup.get(popup)?.report;
  if (report) downloadBlob(popup, supportReportExportFileName(report, 'csv'), `\uFEFF${reportCsv(report)}`, 'text/csv;charset=utf-8');
}
function downloadBlob(popup, name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = popup.ownerDocument.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
function reportCsv(report) {
  return supportReportToCsv(report, { includeOrdinalRow: true, legacyBlankPrimarySupportHeader: true });
}
function showPanel(popup) {
  popup.querySelectorAll('[data-ssrb-panel]').forEach((panel) => { panel.hidden = panel.dataset.ssrbPanel !== TAB_KEY; });
  popup.querySelectorAll('[data-ssrb-tab]').forEach((button) => {
    const active = button.dataset.ssrbTab === TAB_KEY;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}
function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export const _test = Object.freeze({
  comparisonReadyText,
  infoIcon,
  readTypicalityProfile,
  renderPanel,
  renderTypicalitySetting,
  typicalityConfigCard,
});

installSupportReportAddon();
