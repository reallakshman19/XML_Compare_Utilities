from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one anchor in {path}, found {count}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_regex_once(path, pattern, replacement):
    text = path.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise RuntimeError(f"Expected one regex anchor in {path}, found {count}: {pattern}")
    path.write_text(updated, encoding="utf-8")


view = ROOT / "xml-compare/XmlCompareLinewiseWorkflowView.js"
replace_once(
    view,
    "import { currentElement, currentLine, previewText, regexSandboxResult } from './XmlCompareLinewiseWorkflowActions.js';",
    "import { currentElement, currentLine, regexSandboxResult } from './XmlCompareLinewiseWorkflowActions.js';\nimport { linewiseCategorizedText, linewisePreviewText } from './XmlCompareLinewiseProducerAdoption.js';",
)
replace_once(
    view,
    "import { createLinewiseWorkflowState, linewiseLineIdOptions } from './XmlCompareLinewiseWorkflowState.js';",
    "import { createLinewiseWorkflowState, linewiseLineIdOptions } from './XmlCompareLinewiseWorkflowState.js';\nimport { renderLinewiseProducerStatusHtml } from './XmlCompareLinewiseProducerStatusView.js';",
)
replace_once(
    view,
    "export const XML_COMPARE_LINEWISE_WORKFLOW_VIEW_SCHEMA = 'xml-compare-linewise-workflow-view/v4-sideload-diagnostics';",
    "export const XML_COMPARE_LINEWISE_WORKFLOW_VIEW_SCHEMA = 'xml-compare-linewise-workflow-view/v5-producer-adoption';",
)
replace_once(
    view,
    ".xml-compare-linewise-choice{display:flex;flex-wrap:wrap;gap:12px;color:#cbd5e1;font-size:12px}.xml-compare-linewise-warning{color:#fde68a}",
    ".xml-compare-linewise-choice{display:flex;flex-wrap:wrap;gap:12px;color:#cbd5e1;font-size:12px}.xml-compare-linewise-warning{color:#fde68a}.xml-compare-linewise-producer-status{margin-top:12px;border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:9px;background:rgba(2,6,23,.38)}.xml-compare-linewise-producer-status.is-ok{border-color:rgba(34,197,94,.38)}.xml-compare-linewise-producer-status.is-error{border-color:rgba(248,113,113,.45)}.xml-compare-linewise-producer-status.is-pending{border-color:rgba(251,191,36,.4)}",
)
replace_once(
    view,
    "${sideloadReportHtml(state)}${renderXmlCompareSideloadDiagnosticsHtml(state.lastSideloadReport,{mode:'linewise'})}</div>`; }",
    "${sideloadReportHtml(state)}${renderXmlCompareSideloadDiagnosticsHtml(state.lastSideloadReport,{mode:'linewise'})}${renderLinewiseProducerStatusHtml(state.producerAdoption)}</div>`; }",
)
replace_regex_once(
    view,
    r"^function previewTab\(state\) \{.*$",
    "function previewTab(state) { const text = linewisePreviewText(state, state.producerAdoption), categorized = linewiseCategorizedText(state, state.producerAdoption), blocked = state.previewMode==='categorized' && !categorized && ['running','failed'].includes(state.producerAdoption?.status); return `<section class=\"xml-compare-linewise-card\"><h4>5 Categorized XML preview</h4><div class=\"xml-compare-linewise-choice\"><label><input type=\"radio\" name=\"xml-compare-preview-mode\" value=\"categorized\" ${state.previewMode==='categorized'?'checked':''}> CategorizedInputXML</label><label><input type=\"radio\" name=\"xml-compare-preview-mode\" value=\"input\" ${state.previewMode==='input'?'checked':''}> Enriched/InputXML</label><label><input type=\"radio\" name=\"xml-compare-preview-mode\" value=\"element\" ${state.previewMode==='element'?'checked':''}> Selected element only</label></div>${blocked?'<p class=\"xml-compare-linewise-warning\">Categorized preview is blocked until worker categorization succeeds. Enriched/InputXML remains available.</p>':''}<pre class=\"xml-compare-linewise-pre\">${esc(text.slice(0,60000))}${text.length>60000?'\\n... preview truncated ...':''}</pre><div class=\"xml-compare-linewise-actions\"><button type=\"button\" data-xml-compare-linewise-action=\"copy-preview\" ${text?'':'disabled'}>Copy Preview</button><button type=\"button\" data-xml-compare-linewise-action=\"download-preview\" ${text?'':'disabled'}>Download Preview</button><button type=\"button\" data-xml-compare-linewise-tab=\"canvas\" ${state.text?'':'disabled'}>Next: Load Canvas</button></div>${renderLinewiseProducerStatusHtml(state.producerAdoption)}</section>`; }",
)
replace_regex_once(
    view,
    r"^function canvasTab\(state\) \{.*$",
    "function canvasTab(state) { const categorized = linewiseCategorizedText(state, state.producerAdoption), disabled = categorized?'':'disabled'; return `<section class=\"xml-compare-linewise-card\"><h4>6 Load categorized XML to compare canvas</h4><div class=\"xml-compare-linewise-grid\"><div class=\"xml-compare-linewise-card\"><h4>Current output</h4><button type=\"button\" data-xml-compare-linewise-action=\"load-categorized-a\" ${disabled}>Load Categorized as Source A</button><br><br><button type=\"button\" data-xml-compare-linewise-action=\"load-categorized-b\" ${disabled}>Load Categorized as Target B</button></div><div class=\"xml-compare-linewise-card\"><h4>Exports</h4><button type=\"button\" data-xml-compare-linewise-action=\"export-categorized\" ${disabled}>Export Categorized XML</button><br><br><button type=\"button\" data-xml-compare-linewise-action=\"export-input\" ${state.text?'':'disabled'}>Export Enriched/InputXML</button><br><br><button type=\"button\" data-xml-compare-linewise-action=\"export-audit\" ${state.model?'':'disabled'}>Export line-wise audit JSON</button></div></div>${renderLinewiseProducerStatusHtml(state.producerAdoption)}${state.lastCanvasStatus?`<div class=\"xml-compare-linewise-result\">${esc(state.lastCanvasStatus)}</div>`:''}</section>`; }",
)
replace_regex_once(
    view,
    r"^export function renderLinewiseWorkflowPopupHtml\(input = \{\}\) \{.*$",
    "export function renderLinewiseWorkflowPopupHtml(input = {}) { const state = { ...createLinewiseWorkflowState(input), producerAdoption: input.producerAdoption || {} }; if (!state.open) return ''; return `${linewiseModalStyleHtml()}<div class=\"xml-compare-categorized-backdrop\" data-xml-compare-categorized-popup><button type=\"button\" class=\"xml-compare-categorized-backdrop-close\" data-xml-compare-categorized-close aria-label=\"Close Line-wise XML Enrichment dialog\">Close overlay</button><section class=\"xml-compare-categorized-dialog\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Line-wise XML Enrichment Categorized XML\" tabindex=\"-1\"><header><div><div class=\"xml-compare-categorized-title-row\"><h3>Line-wise XML Enrichment / Categorized XML</h3>${renderLinewiseInfoRuleButtonHtml(state.infoRuleOpen)}</div><p>Import XML → optional sideload → categorized enriched XML → load Source/Target canvas compare.</p></div><button type=\"button\" data-xml-compare-categorized-close>Close</button></header>${navHtml(state)}<main class=\"xml-compare-linewise-body\">${bodyHtml(state)}</main><footer class=\"xml-compare-linewise-footer\">${statusHtml(state)}<button type=\"button\" data-xml-compare-categorized-close>Close</button></footer>${renderLinewiseInfoRuleModalHtml(state.infoRuleOpen)}</section></div>`; }",
)


tab_view = ROOT / "xml-compare/XmlCompareTabView.js"
replace_once(
    tab_view,
    "${renderLinewiseWorkflowPopupHtml(state.linewiseWorkflow)}",
    "${renderLinewiseWorkflowPopupHtml({ ...state.linewiseWorkflow, producerAdoption: state.linewiseProducerAdoption })}",
)


tab = ROOT / "tabs/xml-compare-tab.js"
replace_once(
    tab,
    "import { applyLinewiseAction, applyLinewiseSideload, ensureCategorized, ensureInputXml, importLinewiseText, linewiseAuditJson, linewiseCategorizedCanvasPayload, previewText } from '../xml-compare/XmlCompareLinewiseWorkflowActions.js';",
    "import { applyLinewiseAction, ensureInputXml, importLinewiseText, linewiseAuditJson } from '../xml-compare/XmlCompareLinewiseWorkflowActions.js';\nimport { createLinewiseProducerAdoptionState, failLinewiseProducerRun, finishLinewiseProducerRun, linewiseCategorizedCanvasPayload, linewiseCategorizedText, linewisePreviewText, linewiseProducerReceiptJson, startLinewiseProducerRun } from '../xml-compare/XmlCompareLinewiseProducerAdoption.js';\nimport { createCategorizedInputXmlWorkerClient } from '../xml-compare/categorized-inputxml-worker/index.js';",
)
replace_once(
    tab,
    "linewiseWorkflow: createLinewiseWorkflowState(), sideload:",
    "linewiseWorkflow: createLinewiseWorkflowState(), linewiseProducerAdoption: createLinewiseProducerAdoptionState(), linewiseWorkerClient: null, linewiseProducerAbort: null, sideload:",
)
replace_once(
    tab,
    "async function importLinewiseFile(input, state, container) { const file = input.files?.[0]; if (!file) return true;",
    "async function importLinewiseFile(input, state, container) { const file = input.files?.[0]; if (!file) return true; cancelLinewiseProducerRun(state, 'new-import'); state.linewiseProducerAdoption = createLinewiseProducerAdoptionState();",
)
replace_regex_once(
    tab,
    r"^function loadLinewiseToCanvas\(state, side\) \{.*$",
    "function loadLinewiseToCanvas(state, side) { const payload = linewiseCategorizedCanvasPayload(state.linewiseWorkflow, state.linewiseProducerAdoption, side); if (!payload.ready) { state.linewiseWorkflow = createLinewiseWorkflowState({ ...state.linewiseWorkflow, lastCanvasStatus: payload.status }); return false; } const file = storeTextAsLoaded(payload.side, payload.fileName, payload.text, state); state.linewiseWorkflow = createLinewiseWorkflowState({ ...state.linewiseWorkflow, lastCanvasStatus: payload.status }); recordLoadSuccess(state, file, payload.side, payload.text); return true; }",
)
replace_once(
    tab,
    "linewiseApply(state, { type: 'set-linewise-sideload-field', field: sideload.dataset.xmlCompareLinewiseSideload, value: sideload.value }); render(container, state);",
    "linewiseApply(state, { type: 'set-linewise-sideload-field', field: sideload.dataset.xmlCompareLinewiseSideload, value: sideload.value }); state.linewiseProducerAdoption = createLinewiseProducerAdoptionState(); render(container, state);",
)
helper = """function linewiseWorkerClient(state) { if (!state.linewiseWorkerClient) state.linewiseWorkerClient = createCategorizedInputXmlWorkerClient({ clientId: 'xml-compare-linewise' }); return state.linewiseWorkerClient; }
function cancelLinewiseProducerRun(state, reason = 'superseded') { state.linewiseProducerAbort?.abort?.(reason); state.linewiseProducerAbort = null; }
async function runLinewiseSideloadThroughWorker(state, container) {
  cancelLinewiseProducerRun(state);
  const started = startLinewiseProducerRun(state.linewiseWorkflow);
  state.linewiseWorkflow = started.linewiseState;
  state.linewiseProducerAdoption = started.adoption;
  render(container, state);
  if (!started.request) return 'nav';
  const controller = new AbortController();
  state.linewiseProducerAbort = controller;
  try {
    const result = await linewiseWorkerClient(state).producer.categorizeInputXml(started.request, { signal: controller.signal, timeoutMs: 30000 });
    if (state.linewiseProducerAbort !== controller) return 'nav';
    state.linewiseProducerAdoption = finishLinewiseProducerRun(state.linewiseProducerAdoption, result);
  } catch (error) {
    if (state.linewiseProducerAbort !== controller) return 'nav';
    state.linewiseProducerAdoption = failLinewiseProducerRun(state.linewiseProducerAdoption, error);
  } finally {
    if (state.linewiseProducerAbort === controller) state.linewiseProducerAbort = null;
  }
  const result = state.linewiseProducerAdoption.result;
  const message = state.linewiseProducerAdoption.status === 'success'
    ? `Worker categorized ${result?.summary?.categorizedElements || 0} element(s).`
    : `Categorization failed: ${state.linewiseProducerAdoption.error?.message || 'Unknown error.'}`;
  state.linewiseWorkflow = createLinewiseWorkflowState({ ...state.linewiseWorkflow, lastCanvasStatus: message });
  render(container, state);
  return 'nav';
}
"""
replace_once(tab, "function handleLinewiseClick(event, state, container) {", helper + "async function handleLinewiseClick(event, state, container) {")
replace_regex_once(
    tab,
    r"^async function handleLinewiseClick\(event, state, container\) \{.*$",
    "async function handleLinewiseClick(event, state, container) { const open = event.target.closest('[data-xml-compare-categorized-open]'); if (open && container.contains(open)) { linewiseApply(state, { type: 'open-linewise-workflow' }); render(container, state); return 'nav'; } if (event.target.closest('[data-xml-compare-categorized-close]')) { cancelLinewiseProducerRun(state, 'workflow-close'); linewiseApply(state, { type: 'close-linewise-workflow' }); render(container, state); return 'nav'; } const info = event.target.closest('[data-xml-compare-linewise-info-action]')?.dataset.xmlCompareLinewiseInfoAction; if (info) { linewiseApply(state, { type: info === 'open-info-rule' ? 'open-linewise-info-rule' : 'close-linewise-info-rule' }); render(container, state); return 'nav'; } const tab = event.target.closest('[data-xml-compare-linewise-tab]')?.dataset.xmlCompareLinewiseTab; if (tab) { linewiseApply(state, { type: 'set-linewise-tab', tab }); render(container, state); return 'nav'; } const line = event.target.closest('[data-xml-compare-linewise-line]')?.dataset.xmlCompareLinewiseLine; if (line != null) { linewiseApply(state, { type: 'set-linewise-line-index', index: line }); render(container, state); return 'nav'; } const el = event.target.closest('[data-xml-compare-linewise-element]')?.dataset.xmlCompareLinewiseElement; if (el != null) { linewiseApply(state, { type: 'set-linewise-element-index', index: el }); render(container, state); return 'nav'; } const action = event.target.closest('[data-xml-compare-linewise-action]')?.dataset.xmlCompareLinewiseAction; if (!action) return false; if (action === 'apply-sideload') return runLinewiseSideloadThroughWorker(state, container); const preview = linewisePreviewText(state.linewiseWorkflow, state.linewiseProducerAdoption), categorized = linewiseCategorizedText(state.linewiseWorkflow, state.linewiseProducerAdoption); if (action === 'copy-preview' && preview) navigator.clipboard?.writeText?.(preview); else if (action === 'download-preview' && preview) downloadText(`${state.linewiseWorkflow.fileName || 'linewise'}_preview.xml`, preview, 'application/xml;charset=utf-8'); else if (action === 'export-categorized' && categorized) downloadText(`${state.linewiseWorkflow.fileName || 'linewise'}_categorized_enriched.xml`, categorized, 'application/xml;charset=utf-8'); else if (action === 'export-input') downloadText(`${state.linewiseWorkflow.fileName || 'linewise'}_enriched_input.xml`, ensureInputXml(state.linewiseWorkflow), 'application/xml;charset=utf-8'); else if (action === 'export-audit') downloadText(`${state.linewiseWorkflow.fileName || 'linewise'}_linewise_audit.json`, linewiseAuditJson(state.linewiseWorkflow), 'application/json;charset=utf-8'); else if (action === 'export-producer-receipt') downloadText(`${state.linewiseWorkflow.fileName || 'linewise'}_producer_receipt.json`, linewiseProducerReceiptJson(state.linewiseWorkflow, state.linewiseProducerAdoption), 'application/json;charset=utf-8'); else if (action === 'load-categorized-a') loadLinewiseToCanvas(state, 'a'); else if (action === 'load-categorized-b') loadLinewiseToCanvas(state, 'b'); render(container, state); return 'nav'; }",
)
replace_once(
    tab,
    "function handleClick(event, state, container) { const linewise = handleLinewiseClick(event, state, container);",
    "async function handleClick(event, state, container) { const linewise = await handleLinewiseClick(event, state, container);",
)
replace_once(
    tab,
    "container.addEventListener('click', (event) => { if (event.target.closest('[data-xml-compare-load]') || event.target.closest('.xml-compare-file-btn')) return; const result = handleClick(event, state, container); if (result === true) render(container, state); }, { signal });",
    "container.addEventListener('click', async (event) => { if (event.target.closest('[data-xml-compare-load]') || event.target.closest('.xml-compare-file-btn')) return; const result = await handleClick(event, state, container); if (result === true) render(container, state); }, { signal });",
)
replace_once(
    tab,
    "return () => { ctrl.abort(); container.innerHTML = ''; };",
    "return () => { cancelLinewiseProducerRun(state, 'tab-unmount'); state.linewiseWorkerClient?.close?.(); state.linewiseWorkerClient = null; ctrl.abort(); container.innerHTML = ''; };",
)
replace_once(
    tab,
    "handleLinewiseClick, handleLinewiseChange, loadLinewiseToCanvas, handleExternalLoad",
    "handleLinewiseClick, handleLinewiseChange, loadLinewiseToCanvas, linewiseWorkerClient, cancelLinewiseProducerRun, runLinewiseSideloadThroughWorker, handleExternalLoad",
)

print("XML Compare line-wise producer adoption patch applied")
