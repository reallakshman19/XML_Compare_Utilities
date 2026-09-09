import { buildSupportReportBundle } from './support-report-engine.js?v=20260909-support-report-1';
import { supportReportToCsv } from './support-report-export.js?v=20260909-support-report-1';
import { renderSupportReportWorkspace } from './support-report-view.js?v=20260909-support-report-1';
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
  popup.querySelector('[data-ssr-file]')?.addEventListener('change', () => void readXmlFile(popup));
  popup.querySelector('[data-ssr-xml]')?.addEventListener('input', () => invalidate(popup, 'XML changed; rebuild the Support Report.'));
  popup.querySelector('[data-ssrb-input="model"]')?.addEventListener('input', () => invalidate(popup, 'Combined staged model changed; rebuild the Support Report.'));
  popup.querySelectorAll('[data-ssrb-rule]').forEach((node) => {
    const eventName = node.type === 'checkbox' || node.tagName === 'SELECT' ? 'change' : 'input';
    node.addEventListener(eventName, () => invalidate(popup, 'Relationship rules changed; rebuild the Support Report.'));
  });
  popup.querySelector('[data-ssr-build]')?.addEventListener('click', () => run(popup));
  popup.querySelector('[data-ssr-download]')?.addEventListener('click', () => downloadCsv(popup));
  popup.querySelector('[data-ssr-copy]')?.addEventListener('click', () => void copyCsv(popup));
}

function renderPanel() {
  return `<section class="ssrb-card ssrb-results-card"><header><div><span class="ssrb-step">R</span><b>Build Support Report from Navisworks clash evidence</b></div><span class="ssrb-panel-note">Clash XML establishes line ↔ secondary-support evidence. The staged-model relationship bundle enriches complete PS/SL primary-support membership and native attributes.</span></header><div class="ssrb-input-grid" style="grid-template-columns:minmax(0,1fr)"><div class="ssrb-source-card"><div class="ssrb-source-head"><b>Support Report clash XML</b><label class="ssrb-file-button">Choose XML<input type="file" accept=".xml,text/xml,application/xml" data-ssr-file="1"></label></div><span>Navisworks clash/clearance XML containing pipe-side PS/SL members and secondary-support family objects.</span><textarea rows="12" data-ssr-xml spellcheck="false" placeholder="Paste SupportreportXML.xml"></textarea><small data-ssr-file-status>No Support Report XML selected</small></div></div><div class="ssrb-build-grid"><div><h3>SupportReportBundle.v1</h3><p>Rows are grouped by secondary support family + full pipe line tag. If the combined staged model is loaded, the report rebuilds family evidence with PS + SL support-family recognition and recovers native members that do not appear in the clash XML.</p><div class="ssrb-dialog-actions"><button type="button" class="ssrb-primary" data-ssr-build="1">Build Support Report</button><button type="button" data-ssr-copy="1" disabled>Copy CSV</button><button type="button" data-ssr-download="1" disabled>Download CSV</button></div></div><div class="ssrb-run-state" data-ssr-run-state><b>Not built</b><span>XML-only mode is allowed. Load the combined staged model for complete PS/SL enrichment.</span></div></div><div data-ssr-results>${renderSupportReportWorkspace(null)}</div></section>`;
}

async function readXmlFile(popup) {
  const input = popup.querySelector('[data-ssr-file]');
  const file = input?.files?.[0];
  if (!file) return;
  popup.querySelector('[data-ssr-xml]').value = await file.text();
  popup.querySelector('[data-ssr-file-status]').textContent = `${file.name} · ${file.size} bytes`;
  invalidate(popup, 'XML changed; rebuild the Support Report.');
}

function run(popup) {
  const state = stateByPopup.get(popup);
  const host = popup.querySelector('[data-ssr-results]');
  const runState = popup.querySelector('[data-ssr-run-state]');
  try {
    const xmlText = popup.querySelector('[data-ssr-xml]')?.value || '';
    if (!xmlText.trim()) throw new Error('Support Report clash XML is required.');
    const modelText = popup.querySelector('[data-ssrb-input="model"]')?.value || '';
    let relationshipBundle = null;
    if (modelText.trim()) {
      const combinedInput = parseSupportSteelJson(modelText, 'Combined staged model source');
      relationshipBundle = buildSupportSteelRelationshipBundle({
        combinedInput,
        config: supportReportRules(popup),
      });
    }
    const report = buildSupportReportBundle({ clashXmlText: xmlText, relationshipBundle });
    state.report = report;
    host.innerHTML = renderSupportReportWorkspace(report);
    runState.innerHTML = `<b>Support Report ready</b><span>${report.summary.clashEvidenceCount} clash rows → ${report.summary.reportRowCount} report rows · ${report.summary.enrichedRowCount} enriched · ${report.summary.nativeOnlyMemberCount} native-only members recovered</span>`;
    setExportEnabled(popup, true);
  } catch (error) {
    state.report = null;
    host.innerHTML = `<div class="ssrb-empty"><b>Support Report blocked</b><br>${h(error.message || error)}</div>`;
    runState.innerHTML = `<b>Build blocked</b><span>${h(error.message || error)}</span>`;
    setExportEnabled(popup, false);
  }
}

function readExistingRules(popup) {
  const values = {};
  popup.querySelectorAll('[data-ssrb-rule]').forEach((node) => {
    const key = node.dataset.ssrbRule;
    values[key] = node.type === 'checkbox' ? node.checked : node.type === 'number' ? Number(node.value) : node.value;
  });
  return values;
}

function supportReportRules(popup) {
  return {
    ...readExistingRules(popup),
    supportFamilyPattern: SUPPORT_REPORT_FAMILY_PATTERN,
  };
}

function invalidate(popup, message) {
  const state = stateByPopup.get(popup);
  if (state) state.report = null;
  const runState = popup.querySelector('[data-ssr-run-state]');
  if (runState) runState.innerHTML = `<b>Inputs changed</b><span>${h(message)}</span>`;
  setExportEnabled(popup, false);
}

function setExportEnabled(popup, enabled) {
  for (const node of popup.querySelectorAll('[data-ssr-copy], [data-ssr-download]')) {
    node.disabled = !enabled;
    node.setAttribute('aria-disabled', String(!enabled));
  }
}

async function copyCsv(popup) {
  const report = stateByPopup.get(popup)?.report;
  if (!report) return;
  await globalThis.navigator?.clipboard?.writeText(reportCsv(report));
}

function downloadCsv(popup) {
  const report = stateByPopup.get(popup)?.report;
  if (!report) return;
  const blob = new Blob([`\uFEFF${reportCsv(report)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = popup.ownerDocument.createElement('a');
  anchor.href = url;
  anchor.download = 'support-report.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportCsv(report) {
  return supportReportToCsv(report, {
    includeOrdinalRow: true,
    legacyBlankPrimarySupportHeader: true,
  });
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

installSupportReportAddon();
