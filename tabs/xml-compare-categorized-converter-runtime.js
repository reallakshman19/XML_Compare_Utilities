import { convertCategorizedInputXml, inputXmlToCategorizedInputXml } from '../xml-compare/CategorizedInputXmlConverter.js';
import { applyXmlCompareSideload, buildXmlCompareSideloadFileName } from '../xml-compare/XmlCompareSideloadEnricher.js';
import { buildXmlCompareLinewiseWorkspaceModel, selectedElement, selectedLine } from '../xml-compare/XmlCompareLinewiseWorkspaceModel.js';

const STYLE_ID = 'xml-compare-categorized-converter-style';
const BUTTON_ATTR = 'data-xml-compare-categorized-open';
const POPUP_ATTR = 'data-xml-compare-categorized-popup';
const STEPS = Object.freeze([
  ['import', '1 Import XML', '.xml or .txt'],
  ['sideload', '2 Sideload', 'optional line/node facts'],
  ['lineview', '3 Line View', 'line → element → block'],
  ['derived', '4 Categorize', 'derived facts + blocks'],
  ['preview', '5 Preview', 'categorized XML'],
  ['canvas', '6 Load Canvas', 'Source A / Target B'],
  ['enrichment', '7 Config', 'regex/token sandbox'],
]);

const state = {
  file: null,
  text: '',
  model: null,
  tab: 'import',
  lineIndex: 0,
  elementIndex: 0,
  previewMode: 'categorized',
  lastCategorized: '',
  lastEnriched: '',
  lastSideloadReport: null,
  lastCanvasStatus: '',
  canvasSide: 'a',
  sideload: { lineIdText: '', nodeNameText: '', restraintTagText: '', coordinateText: '' },
  regexSandbox: {
    previewSide: 'imported',
    sample: '',
    regex: '([0-9]{5})',
    group: '1',
    tokenPosition: '4',
    delimiter: '-',
  },
};

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();
const info = (text) => `<span class="xml-compare-linewise-info" title="${esc(text)}">(i)</span>`;

function currentLine() { return selectedLine(state.model, state.lineIndex); }
function currentElement() { return selectedElement(currentLine(), state.elementIndex); }
function sideLabel(side) { return side === 'b' ? 'Target B' : 'Source A'; }
function exportBaseName() { return clean(state.file?.name || 'input.xml').replace(/\.(xml|txt)$/i, ''); }
function downloadText(name, text, type = 'application/xml;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function rebuildModel() {
  state.model = buildXmlCompareLinewiseWorkspaceModel(state.text, state.file?.name || '');
  state.lineIndex = 0;
  state.elementIndex = 0;
  state.lastCategorized = '';
  state.lastEnriched = '';
  state.regexSandbox.sample = lineIdOptions()[0]?.value || '';
}
function go(tab) { state.tab = tab; renderPopup(); }

function injectStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }
  style.textContent = `
.xml-compare-categorized-btn{border:1px solid rgba(168,85,247,.42);border-radius:8px;background:rgba(88,28,135,.34);color:#f3e8ff;font-weight:850}
.xml-compare-categorized-backdrop{position:fixed;inset:0;z-index:70;background:rgba(2,6,23,.72);display:grid;place-items:center}
.xml-compare-categorized-dialog{width:min(1240px,calc(100vw - 28px));height:min(860px,calc(100vh - 28px));display:grid;grid-template-rows:auto auto 1fr auto;border:1px solid rgba(216,180,254,.42);border-radius:18px;background:#0f172a;color:#dbeafe;box-shadow:0 24px 80px rgba(0,0,0,.54);overflow:hidden}
.xml-compare-categorized-dialog header{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(148,163,184,.18);background:linear-gradient(90deg,rgba(88,28,135,.30),rgba(15,23,42,.55))}
.xml-compare-categorized-dialog h3{margin:0;color:#f3e8ff}.xml-compare-categorized-dialog p{margin:4px 0 0;color:#94a3b8}
.xml-compare-categorized-dialog button{border:1px solid rgba(216,180,254,.35);border-radius:10px;background:rgba(30,41,59,.92);color:#f3e8ff;padding:7px 10px;font-weight:800}.xml-compare-categorized-dialog button:disabled{opacity:.5}
.xml-compare-flow-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(2,6,23,.34)}
.xml-compare-flow-step{appearance:none;text-align:left;border:1px solid rgba(96,165,250,.18)!important;border-radius:12px!important;padding:9px!important;background:rgba(15,23,42,.64)!important;color:#dbeafe!important}.xml-compare-flow-step b{display:block;color:#bfdbfe}.xml-compare-flow-step small{display:block;color:#94a3b8;font-weight:700}.xml-compare-flow-step.is-active{background:rgba(88,28,135,.72)!important;border-color:rgba(216,180,254,.72)!important}
.xml-compare-linewise-body{min-height:0;overflow:auto;padding:12px}.xml-compare-linewise-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.xml-compare-linewise-three{display:grid;grid-template-columns:240px 280px 1fr;gap:10px;min-height:520px}
.xml-compare-linewise-card{border:1px solid rgba(148,163,184,.18);border-radius:14px;background:rgba(2,6,23,.34);padding:12px;min-width:0}.xml-compare-linewise-card h4{margin:0 0 8px;color:#bfdbfe}.xml-compare-linewise-card small,.xml-compare-linewise-note{display:block;color:#94a3b8;line-height:1.42}
.xml-compare-linewise-status{border:1px solid rgba(34,197,94,.28);border-radius:10px;background:rgba(6,78,59,.20);padding:9px;color:#bbf7d0;font-size:12px}.xml-compare-linewise-stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px}.xml-compare-linewise-stats div{border:1px solid rgba(96,165,250,.18);border-radius:10px;padding:8px;background:rgba(15,23,42,.58)}.xml-compare-linewise-stats b{display:block;color:#e0f2fe;font-size:18px}
.xml-compare-linewise-sideload{display:grid;grid-template-columns:1fr 1fr;gap:10px}.xml-compare-linewise-sideload label,.xml-compare-linewise-form label{display:grid;gap:5px;color:#bfdbfe;font-weight:800;font-size:12px}.xml-compare-linewise-form input,.xml-compare-linewise-form select,.xml-compare-linewise-sideload textarea{border:1px solid rgba(96,165,250,.25);border-radius:10px;background:#020617;color:#dbeafe;padding:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}.xml-compare-linewise-sideload textarea{min-height:130px;resize:vertical}
.xml-compare-linewise-list{border:1px solid rgba(148,163,184,.16);border-radius:12px;overflow:auto;background:rgba(2,6,23,.28)}.xml-compare-linewise-list button{display:block;width:100%;text-align:left;border:0!important;border-bottom:1px solid rgba(148,163,184,.10)!important;border-radius:0!important;background:transparent!important;color:#dbeafe!important;padding:8px 10px!important}.xml-compare-linewise-list button.is-active{background:rgba(59,130,246,.18)!important;color:#bfdbfe!important}
.xml-compare-linewise-table{width:100%;border-collapse:collapse;font-size:12px}.xml-compare-linewise-table th,.xml-compare-linewise-table td{border-bottom:1px solid rgba(148,163,184,.13);padding:7px;text-align:left;vertical-align:top}.xml-compare-linewise-table th{color:#93c5fd}.xml-compare-linewise-pre{white-space:pre-wrap;overflow:auto;max-height:500px;border:1px solid rgba(148,163,184,.16);border-radius:12px;background:#020617;color:#dbeafe;padding:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}
.xml-compare-linewise-footer{display:flex;gap:8px;justify-content:flex-end;padding:10px 14px;border-top:1px solid rgba(148,163,184,.18);background:rgba(2,6,23,.32)}.xml-compare-linewise-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.xml-compare-linewise-choice{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.xml-compare-linewise-choice label{display:flex;gap:6px;align-items:center;color:#dbeafe}
.xml-compare-linewise-result{border:1px solid rgba(34,197,94,.22);border-radius:12px;background:rgba(6,78,59,.16);padding:10px;color:#bbf7d0}.xml-compare-linewise-warning{border:1px solid rgba(251,191,36,.30);border-radius:12px;background:rgba(113,63,18,.18);padding:10px;color:#fde68a}.xml-compare-linewise-info{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid rgba(147,197,253,.45);border-radius:999px;color:#bfdbfe;font-size:10px;font-weight:900;background:rgba(30,41,59,.76);cursor:help}
@media(max-width:1100px){.xml-compare-flow-strip{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:760px){.xml-compare-flow-strip,.xml-compare-linewise-grid,.xml-compare-linewise-sideload,.xml-compare-linewise-three{grid-template-columns:1fr}.xml-compare-linewise-stats{grid-template-columns:1fr 1fr}}
`;
}

function statusHtml() {
  const model = state.model;
  return `<div class="xml-compare-linewise-status">${model ? `Loaded ${esc(state.file?.name || 'XML text')} · ${esc(model.format)} · ${model.lineCount} line(s), ${model.elementCount} element(s)` : 'No file imported.'}${state.lastCanvasStatus ? ` · ${esc(state.lastCanvasStatus)}` : ''}</div>`;
}
function workflowNav() { return `<nav class="xml-compare-flow-strip" aria-label="Line-wise XML workflow">${STEPS.map(([id, title, subtitle]) => `<button type="button" data-xml-compare-linewise-tab="${id}" class="xml-compare-flow-step ${state.tab === id ? 'is-active' : ''}"><b>${esc(title)}</b><small>${esc(subtitle)}</small></button>`).join('')}</nav>`; }
function primaryNextHtml() { return `<div class="xml-compare-linewise-actions"><button type="button" data-xml-compare-linewise-tab="sideload" ${state.text ? '' : 'disabled'}>Next: optional Sideload</button><button type="button" data-xml-compare-linewise-tab="preview" ${state.text ? '' : 'disabled'}>Skip to Categorized Preview</button></div>`; }
function importTab() {
  const model = state.model;
  return `<div class="xml-compare-linewise-grid"><section class="xml-compare-linewise-card"><h4>1 Import XML / TXT</h4><label class="xml-compare-linewise-file">InputXML or CategorizedInputXML file<input type="file" accept=".xml,.XML,.txt,.TXT,text/xml,application/xml,text/plain" data-xml-compare-categorized-import></label><small>After import, stay here to confirm the parsed model. Then continue to sideload or preview.</small><div class="xml-compare-linewise-actions" style="margin-top:12px;margin-bottom:12px"><button type="button" data-xml-compare-linewise-action="load-categorized-a" ${state.text ? '' : 'disabled'}>Load Categorized as Source A</button><button type="button" data-xml-compare-linewise-action="load-categorized-b" ${state.text ? '' : 'disabled'}>Load Categorized as Target B</button></div>${primaryNextHtml()}</section><section class="xml-compare-linewise-card"><h4>Parsed model</h4>${statusHtml()}<div class="xml-compare-linewise-stats" style="margin-top:10px"><div><b>${model?.lineCount || 0}</b><small>Lines</small></div><div><b>${model?.elementCount || 0}</b><small>Elements</small></div><div><b>${model?.nodeBlockCount || 0}</b><small>Node blocks</small></div><div><b>${esc(model?.format || '—')}</b><small>Detected format</small></div></div></section></div>`;
}
function sideloadReportHtml() {
  const r = state.lastSideloadReport;
  if (!r) return '<small>No sideload run yet.</small>';
  const rows = [['LINE_ID rows', r.lineIdRows], ['LINE_ID applied', r.lineIdsApplied], ['FROM/TO name rows', r.nodeNameRows], ['FROM/TO names applied', r.nodeNamesApplied], ['Restraint tag rows', r.tagRows], ['Restraint tags applied', r.tagsApplied], ['Node coordinate rows', r.coordinateRows], ['Global coordinates applied', r.coordinatesApplied], ['Coordinate nodes resolved', r.coordinateNodesResolved]];
  return `<table class="xml-compare-linewise-table"><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v ?? 0)}</td></tr>`).join('')}</tbody></table>`;
}
function sideloadTab() {
  return `<div class="xml-compare-linewise-card"><h4>2 Optional sideload enrichment</h4><small>Paste sideload facts only if available. Empty tables are allowed; continue directly to preview when no sideload is required.</small><div class="xml-compare-linewise-sideload" style="margin-top:10px"><label>1. FROM_NODE, TO_NODE, LINE_ID<textarea data-xml-compare-linewise-sideload="lineIdText" placeholder="FROM_NODE&#9;TO_NODE&#9;LINE_ID">${esc(state.sideload.lineIdText)}</textarea></label><label>2. FROM_NODE, TO_NODE, FROM_NAME, TO_NAME<textarea data-xml-compare-linewise-sideload="nodeNameText" placeholder="FROM_NODE&#9;TO_NODE&#9;FROM_NAME&#9;TO_NAME">${esc(state.sideload.nodeNameText)}</textarea></label><label>3. FROM_NODE, TO_NODE, NODE, TYPE, STIFFNESS, GAP, MU, CNODE, TAG<textarea data-xml-compare-linewise-sideload="restraintTagText" placeholder="FROM_NODE&#9;TO_NODE&#9;NODE&#9;TYPE&#9;STIFFNESS&#9;GAP&#9;MU&#9;CNODE&#9;TAG">${esc(state.sideload.restraintTagText)}</textarea></label><label>4. NODE, GLOBAL_X, GLOBAL_Y, GLOBAL_Z<textarea data-xml-compare-linewise-sideload="coordinateText" placeholder="NODE&#9;GLOBAL_X&#9;GLOBAL_Y&#9;GLOBAL_Z">${esc(state.sideload.coordinateText)}</textarea></label></div><div class="xml-compare-linewise-actions"><button type="button" data-xml-compare-linewise-action="apply-sideload" ${state.text ? '' : 'disabled'}>Apply Sideload → Rebuild Model</button><button type="button" data-xml-compare-linewise-tab="preview" ${state.text ? '' : 'disabled'}>Continue to Categorized Preview</button></div><div style="margin-top:10px">${sideloadReportHtml()}</div></div>`;
}
function lineButton(item, index) { return `<button type="button" data-xml-compare-linewise-line="${index}" class="${index === state.lineIndex ? 'is-active' : ''}">▶ ${esc(item.lineId)}<br><small>${item.elements.length} element(s)</small></button>`; }
function elementButton(item, index) { return `<button type="button" data-xml-compare-linewise-element="${index}" class="${index === state.elementIndex ? 'is-active' : ''}">${esc(item.elementKey || `Element ${index + 1}`)}<br><small>${esc([item.fromNode, item.toNode].filter(Boolean).join(' → ') || 'no nodes')}</small></button>`; }
function elementTable(element) {
  if (!element) return '<small>No selected element.</small>';
  const rows = [['Line ID', currentLine()?.lineId], ['Element key', element.elementKey], ['From node', element.fromNode], ['To node', element.toNode], ['Blocks', (element.blockNames || []).join(', ')], ['Node block counts', JSON.stringify(element.nodeBlockCounts || {})]];
  return `<table class="xml-compare-linewise-table"><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v || '—')}</td></tr>`).join('')}</tbody></table><pre class="xml-compare-linewise-pre" style="margin-top:10px">${esc(element.originalElement || '')}</pre>`;
}
function lineViewTab() {
  const line = currentLine();
  const element = currentElement();
  return `<div class="xml-compare-linewise-three"><section class="xml-compare-linewise-list"><h4 style="padding:8px 10px;margin:0">Lines</h4>${(state.model?.lines || []).map(lineButton).join('') || '<small style="padding:10px">No lines loaded.</small>'}</section><section class="xml-compare-linewise-list"><h4 style="padding:8px 10px;margin:0">Elements</h4>${(line?.elements || []).map(elementButton).join('') || '<small style="padding:10px">No elements loaded.</small>'}</section><section class="xml-compare-linewise-card"><h4>Selected element</h4>${elementTable(element)}</section></div>`;
}
function derivedTab() {
  const line = currentLine();
  const rows = (line?.elements || []).map((el) => `<tr><td>${esc(el.elementKey)}</td><td>${esc((el.blockNames || []).join(', ') || '—')}</td><td><pre class="xml-compare-linewise-pre" style="max-height:120px;margin:0">${esc(JSON.stringify(el.derivedFacts || {}, null, 2))}</pre></td></tr>`).join('');
  return `<section class="xml-compare-linewise-card"><h4>4 Derived facts and blocks</h4><small>Review categorized facts generated from the selected line.</small><table class="xml-compare-linewise-table" style="margin-top:10px"><thead><tr><th>Element</th><th>Blocks</th><th>Derived facts</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No elements at selected line.</td></tr>'}</tbody></table></section>`;
}
function ensureCategorized() { if (!state.text.trim()) return ''; if (state.model?.format === 'CategorizedInputXML') return state.text; state.lastCategorized = inputXmlToCategorizedInputXml(state.text, { sourceName: state.file?.name || 'InputXML' }); return state.lastCategorized; }
function ensureInputXml() { if (!state.text.trim()) return ''; if (state.model?.format === 'CategorizedInputXML') return convertCategorizedInputXml(state.text, 'categorized-to-input', { sourceName: state.file?.name || 'CategorizedInputXML' }); return state.text; }
function previewText() { if (state.previewMode === 'input') return ensureInputXml(); if (state.previewMode === 'element') return currentElement()?.originalElement || ''; return ensureCategorized(); }
function previewTab() {
  const text = previewText();
  return `<section class="xml-compare-linewise-card"><h4>5 Categorized XML preview</h4><div class="xml-compare-linewise-choice" style="margin-bottom:10px"><label><input type="radio" name="xml-compare-preview-mode" value="categorized" ${state.previewMode === 'categorized' ? 'checked' : ''}> CategorizedInputXML</label><label><input type="radio" name="xml-compare-preview-mode" value="input" ${state.previewMode === 'input' ? 'checked' : ''}> Enriched/InputXML</label><label><input type="radio" name="xml-compare-preview-mode" value="element" ${state.previewMode === 'element' ? 'checked' : ''}> Selected element only</label></div><pre class="xml-compare-linewise-pre">${esc(text.slice(0, 60000))}${text.length > 60000 ? '\n... preview truncated ...' : ''}</pre><div class="xml-compare-linewise-actions"><button type="button" data-xml-compare-linewise-action="copy-preview" ${text ? '' : 'disabled'}>Copy Preview</button><button type="button" data-xml-compare-linewise-action="download-preview" ${text ? '' : 'disabled'}>Download Preview</button><button type="button" data-xml-compare-linewise-tab="canvas" ${state.text ? '' : 'disabled'}>Next: Load Canvas</button></div></section>`;
}
function canvasTab() {
  return `<section class="xml-compare-linewise-card"><h4>6 Load categorized XML to compare canvas</h4><div class="xml-compare-linewise-grid"><div class="xml-compare-linewise-card"><h4>Current output</h4><button type="button" data-xml-compare-linewise-action="load-categorized-a" ${state.text ? '' : 'disabled'}>Load Categorized as Source A</button><br><br><button type="button" data-xml-compare-linewise-action="load-categorized-b" ${state.text ? '' : 'disabled'}>Load Categorized as Target B</button></div><div class="xml-compare-linewise-card"><h4>Exports</h4><button type="button" data-xml-compare-linewise-action="export-categorized" ${state.text ? '' : 'disabled'}>Export Categorized XML</button><br><br><button type="button" data-xml-compare-linewise-action="export-input" ${state.text ? '' : 'disabled'}>Export Enriched/InputXML</button><br><br><button type="button" data-xml-compare-linewise-action="export-audit" ${state.model ? '' : 'disabled'}>Export line-wise audit JSON</button></div></div>${state.lastCanvasStatus ? `<div class="xml-compare-linewise-result" style="margin-top:10px">${esc(state.lastCanvasStatus)}</div>` : ''}</section>`;
}
function lineIdOptions() {
  const seen = new Set();
  const out = [];
  for (const line of state.model?.lines || []) {
    const value = clean(line.lineId);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: value });
  }
  return out;
}
function selectedSandboxLineId() {
  const options = lineIdOptions();
  if (!options.length) return '';
  if (options.some((o) => o.value === state.regexSandbox.sample)) return state.regexSandbox.sample;
  state.regexSandbox.sample = options[0].value;
  return state.regexSandbox.sample;
}
function regexSandboxResult() {
  const cfg = state.regexSandbox;
  const sample = selectedSandboxLineId();
  let regexValue = '', regexError = '';
  try {
    const re = new RegExp(cfg.regex, 'i');
    const match = re.exec(sample);
    regexValue = match?.[Number(cfg.group) || 0] || '';
  } catch (error) { regexError = error?.message || String(error); }
  const tokens = clean(sample).replace(/^\/+/, '').replace(/\/B\d+$/i, '').split(cfg.delimiter || '-').map((item) => item.trim()).filter(Boolean);
  const tokenValue = tokens[Math.max(0, (Number(cfg.tokenPosition) || 1) - 1)] || '';
  return { sample, regexValue, regexError, tokenValue, selected: regexValue || tokenValue, tokens };
}
function selectHtml(id, label, value, options, tip = '') {
  const opts = options.length ? options : [{ value: '', label: 'No imported line IDs loaded' }];
  return `<label>${esc(label)} ${tip ? info(tip) : ''}<select data-xml-compare-regex-sandbox="${esc(id)}">${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
}
function inputHtml(id, label, value, tip = '') { return `<label>${esc(label)} ${tip ? info(tip) : ''}<input data-xml-compare-regex-sandbox="${esc(id)}" value="${esc(value)}"></label>`; }
function enrichmentTab() {
  const options = lineIdOptions();
  const r = regexSandboxResult();
  const sourceOptions = [{ value: 'imported', label: 'Imported XML model' }];
  return `<section class="xml-compare-linewise-card"><h4>7 Enrichment Config tab</h4><small>Integrated config sandbox. Test extraction against real imported line IDs.</small><div class="xml-compare-linewise-grid" style="margin-top:10px"><div class="xml-compare-linewise-card xml-compare-linewise-form"><h4>PipingClass / Rating regex tester</h4>${selectHtml('previewSide', 'Source side', state.regexSandbox.previewSide, sourceOptions, 'The integrated workflow currently previews the XML imported in step 1.')}${selectHtml('sample', 'Example Branch / Line ID', r.sample, options, 'Loaded line IDs are taken from the imported XML model, not from a hard-coded sample.')}${inputHtml('regex', 'Regex', state.regexSandbox.regex, 'Regex is applied first. Example: ([0-9]{5}) finds a five-digit class/rating token.')}${inputHtml('group', 'Group', state.regexSandbox.group, 'Capture group number to use from the regex match. Group 1 means the first bracketed expression.')}${inputHtml('tokenPosition', 'Token position', state.regexSandbox.tokenPosition, 'Fallback token number after splitting the line ID. With delimiter -, position 4 gives P8810212.')}${inputHtml('delimiter', 'Token delimiter', state.regexSandbox.delimiter, 'Character used to split the line ID for fallback token extraction.')}</div><div class="xml-compare-linewise-card"><h4>Live result</h4><table class="xml-compare-linewise-table"><tbody><tr><th>Regex group</th><td>${esc(r.regexValue || '—')}</td></tr><tr><th>Regex error</th><td>${esc(r.regexError || '—')}</td></tr><tr><th>Token value</th><td>${esc(r.tokenValue || '—')}</td></tr><tr><th>Selected result</th><td>${esc(r.selected || '—')}</td></tr><tr><th>Tokens</th><td>${esc(r.tokens.join(' | ') || '—')}</td></tr></tbody></table>${options.length ? '' : '<p class="xml-compare-linewise-warning" style="margin-top:10px">Import XML in step 1 to populate this dropdown with real line IDs.</p>'}</div></div></section>`;
}
function bodyHtml() { if (state.tab === 'sideload') return sideloadTab(); if (state.tab === 'lineview') return lineViewTab(); if (state.tab === 'derived') return derivedTab(); if (state.tab === 'preview') return previewTab(); if (state.tab === 'canvas') return canvasTab(); if (state.tab === 'enrichment') return enrichmentTab(); return importTab(); }
function popupHtml() { return `<div class="xml-compare-categorized-backdrop" ${POPUP_ATTR}><section class="xml-compare-categorized-dialog" role="dialog" aria-modal="true" aria-label="Line-wise XML Enrichment Categorized XML"><header><div><h3>Line-wise XML Enrichment / Categorized XML</h3><p>Import XML → optional sideload → categorized enriched XML → load Source/Target canvas compare.</p></div><button type="button" data-xml-compare-categorized-close>Close</button></header>${workflowNav()}<main class="xml-compare-linewise-body">${bodyHtml()}</main><footer class="xml-compare-linewise-footer">${statusHtml()}<button type="button" data-xml-compare-categorized-close>Close</button></footer></section></div>`; }
function renderPopup() { const existing = document.querySelector(`[${POPUP_ATTR}]`); if (existing) existing.outerHTML = popupHtml(); }
function openPopup() { injectStyle(); document.querySelector(`[${POPUP_ATTR}]`)?.remove(); document.body.insertAdjacentHTML('beforeend', popupHtml()); }
function closePopup() { document.querySelector(`[${POPUP_ATTR}]`)?.remove(); }
function injectButton() {
  const tab = document.querySelector('.xml-compare-tab');
  const toolbar = tab?.querySelector('.xml-compare-toolbar');
  if (!toolbar || toolbar.querySelector(`[${BUTTON_ATTR}]`)) return;
  injectStyle();
  const enrichment = toolbar.querySelector('[data-xml-compare-action="open-enrichment"]');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'xml-compare-categorized-btn';
  button.setAttribute(BUTTON_ATTR, '');
  button.textContent = 'Line-wise XML Enrichment / Categorized XML';
  if (enrichment) enrichment.insertAdjacentElement('afterend', button);
  else toolbar.append(button);
}
async function importFile(input) { const file = input.files?.[0]; if (!file) return; state.file = file; state.text = await file.text(); rebuildModel(); state.tab = 'import'; renderPopup(); }
function applySideload() { if (!state.text.trim()) return; const result = applyXmlCompareSideload(state.text, { lineIdText: state.sideload.lineIdText, nodeNameText: state.sideload.nodeNameText, restraintTagText: state.sideload.restraintTagText, coordinateText: state.sideload.coordinateText }); state.text = result.xmlText; state.lastEnriched = result.xmlText; state.lastSideloadReport = result.report || result.stats || null; state.file = { name: buildXmlCompareSideloadFileName(state.file?.name || 'input.xml') }; rebuildModel(); state.tab = 'sideload'; renderPopup(); }
function auditJson() { return JSON.stringify({ schema: 'xml-compare-linewise-audit/v1', fileName: state.file?.name || '', format: state.model?.format || '', lineCount: state.model?.lineCount || 0, elementCount: state.model?.elementCount || 0, lines: (state.model?.lines || []).map((line) => ({ lineId: line.lineId, elements: line.elements.map((el) => ({ fromNode: el.fromNode, toNode: el.toNode, elementKey: el.elementKey, blocks: el.blockNames, derivedFacts: el.derivedFacts, nodeBlockCounts: el.nodeBlockCounts, childCounts: el.childCounts })) })) }, null, 2); }
function setInputFile(input, file) { const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); }
function loadTextToCanvas(side, text, fileName) { const input = document.querySelector(`input[data-xml-compare-load="${side}"]`); if (!input) { state.lastCanvasStatus = `Canvas file input for ${sideLabel(side)} not found.`; renderPopup(); return; } setInputFile(input, new File([text], fileName, { type: 'application/xml' })); state.lastCanvasStatus = `Loaded ${fileName} to ${sideLabel(side)} canvas input.`; renderPopup(); }
function loadCategorizedToCanvas(side) { const text = ensureCategorized(); if (text) loadTextToCanvas(side, text, `${exportBaseName()}_categorized_enriched.xml`); }
function exportAction(kind) { if (kind === 'export-categorized') downloadText(`${exportBaseName()}_categorized_enriched.xml`, ensureCategorized()); else if (kind === 'export-input') downloadText(`${exportBaseName()}_enriched_input.xml`, ensureInputXml()); else if (kind === 'export-audit') downloadText(`${exportBaseName()}_linewise_audit.json`, auditJson(), 'application/json;charset=utf-8'); else if (kind === 'download-preview') downloadText(`${exportBaseName()}_preview.xml`, previewText()); else if (kind === 'copy-preview') navigator.clipboard?.writeText(previewText()); else if (kind === 'load-categorized-a') loadCategorizedToCanvas('a'); else if (kind === 'load-categorized-b') loadCategorizedToCanvas('b'); }
function clickHandler(event) { const open = event.target.closest(`[${BUTTON_ATTR}]`); if (open) { event.preventDefault(); openPopup(); return; } if (event.target.closest('[data-xml-compare-categorized-close]')) { event.preventDefault(); closePopup(); return; } const tab = event.target.closest('[data-xml-compare-linewise-tab]')?.dataset.xmlCompareLinewiseTab; if (tab) { event.preventDefault(); go(tab); return; } const line = event.target.closest('[data-xml-compare-linewise-line]')?.dataset.xmlCompareLinewiseLine; if (line != null) { event.preventDefault(); state.lineIndex = Number(line) || 0; state.elementIndex = 0; renderPopup(); return; } const el = event.target.closest('[data-xml-compare-linewise-element]')?.dataset.xmlCompareLinewiseElement; if (el != null) { event.preventDefault(); state.elementIndex = Number(el) || 0; renderPopup(); return; } const action = event.target.closest('[data-xml-compare-linewise-action]')?.dataset.xmlCompareLinewiseAction; if (action) { event.preventDefault(); if (action === 'apply-sideload') applySideload(); else exportAction(action); } }
function changeHandler(event) { const input = event.target.closest('[data-xml-compare-categorized-import]'); if (input) { importFile(input).catch((error) => { state.tab = 'import'; renderPopup(); console.error('[XML Compare Line-wise] import failed', error); }); return; } const sideload = event.target.closest('[data-xml-compare-linewise-sideload]'); if (sideload) { state.sideload[sideload.dataset.xmlCompareLinewiseSideload] = sideload.value; return; } const preview = event.target.closest('[name="xml-compare-preview-mode"]'); if (preview) { state.previewMode = preview.value; renderPopup(); return; } const canvas = event.target.closest('[name="xml-compare-canvas-side"]'); if (canvas) { state.canvasSide = canvas.value === 'b' ? 'b' : 'a'; renderPopup(); return; } const regex = event.target.closest('[data-xml-compare-regex-sandbox]'); if (regex) { state.regexSandbox[regex.dataset.xmlCompareRegexSandbox] = regex.value; renderPopup(); } }
function install() { if (typeof document === 'undefined') return; document.addEventListener('click', clickHandler, { capture: true }); document.addEventListener('change', changeHandler, { capture: true }); document.addEventListener('input', changeHandler, { capture: true }); injectButton(); new MutationObserver(() => injectButton()).observe(document.body, { childList: true, subtree: true }); }
install();
