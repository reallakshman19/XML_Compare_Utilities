import { buildCleanXml, parseAvevaXmlToTables } from './inputxml-workspace-cleanxml.js';
import { dtxrRowsFromJsonTraceSnapshot, dtxrRowsToTableText, parseDtxrTable } from './inputxml-workspace-dtxr.js';
import { buildAccdbSideloadTables } from './inputxml-workspace-sideload.js';
import { rowsToTabText } from './inputxml-workspace-table.js';
import { applyXmlCompareSideload } from '../../xml-compare/XmlCompareSideloadEnricher.js';
import { convertCategorizedInputXml, categorizedFileName } from '../../xml-compare/CategorizedInputXmlConverter.js';
import { renderXmlCiiTopology5BPanel } from '../model-converters/xml-cii-topology-5b-panel.js';
import { renderXmlCiiTopology5CPanel } from '../model-converters/xml-cii-topology-5c-panel.js';
import { renderXmlCiiInputXmlCompare5DPanel } from '../model-converters/xml-cii-inputxml-compare-5d-panel.js';
import { bindXmlCiiJsonTracePanel, renderXmlCiiJsonTracePanel } from '../model-converters/json-trace/json-trace-panel.js';
import { bindXmlCiiSupportMapperPhase, xmlCiiRenderSupportMapperPhase } from '../model-converters/converters/xmltocii2019_helper/support-types-panel.js';

/**
 * InputXML Workspace UI tile/modal.
 * Inputs: pasted/uploaded XML, staged JSON, DTXR tables, ACCDB-helper tables, and InputXML files.
 * Outputs: CleanXML, enriched InputXML, 5C InputXML, categorized XML, 5D topology comparison.
 * Fallback: all tabs accept paste input when helper/browse sources are unavailable.
 */

const ACTIVATE = 'click';
const MODAL_STYLE_ID = 'inputxml-workspace-style';
const POPUP_TITLE_ID = 'inputxml-workspace-title';
const TABS = Object.freeze([
  ['clean', '1 Clean XML / Table to CleanXML'],
  ['enrich', '2 InputXML Enrichment'],
  ['xml-to-inputxml', '3 XML to InputXML'],
  ['categorized', '4 Create Categorized XML'],
  ['compare5d', '5 InputXML Compare Topo-wise'],
  ['misc', '6 Misc'],
]);
const CLEAN_SUBTABS = Object.freeze([
  ['cleanxml', 'CleanXML'],
  ['dtxr', 'DTXR'],
]);

const h = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const text = (value) => String(value ?? '').trim();

function ensureModalStyle(doc = globalThis.document) {
  if (!doc || doc.getElementById(MODAL_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = MODAL_STYLE_ID;
  style.textContent = `
.inputxml-workspace-launcher{height:160px;width:220px;border:1px solid rgba(125,211,252,.32);border-radius:16px;background:#111827;color:#e5eefb;cursor:pointer;box-shadow:0 12px 34px rgba(0,0,0,.25);display:grid!important;grid-template-columns:1fr;place-items:center;text-align:center;padding:16px;margin-top:18px;gap:5px;box-sizing:border-box}
.inputxml-workspace-launcher b{font-size:15px;color:#e0f2fe}.inputxml-workspace-launcher span{color:#9fb3ca;font-size:12px;line-height:1.35}
.ixw-backdrop{position:fixed;inset:0;z-index:94;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.78);box-sizing:border-box}
.ixw-dialog{width:min(1500px,calc(100vw - 34px));height:min(920px,calc(100vh - 34px));display:grid;grid-template-rows:auto auto minmax(0,1fr);overflow:hidden;border:1px solid rgba(125,211,252,.36)!important;border-radius:14px!important;background:#0f172a!important;color:#dbeafe;box-shadow:0 24px 80px rgba(0,0,0,.56)}
.ixw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(148,163,184,.18);background:#111827}
.ixw-head b{font-size:16px;color:#f8fafc}.ixw-head span{display:block;color:#9fb3ca;font-size:12px;margin-top:3px}
.ixw-close,.ixw-btn{background:#1f2937;color:#e5eefb;border:1px solid rgba(148,163,184,.34);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px}
.ixw-btn.primary{background:#1d4ed8;border-color:#2563eb;color:#fff}.ixw-btn:disabled{opacity:.46;cursor:not-allowed}
.ixw-tabs,.ixw-subtabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.14);background:#0b1220}
.ixw-tab,.ixw-subtab{background:#111827;color:#a9bfd8;border:1px solid rgba(148,163,184,.2);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px}.ixw-tab.active,.ixw-subtab.active{background:#1e3a5f;color:#e0f2fe;border-color:#38bdf8}
.ixw-body{min-height:0;overflow:auto;padding:12px}.ixw-grid{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:12px;align-items:start}.ixw-grid.three{grid-template-columns:1fr 1fr 1fr}
.ixw-panel{border:1px solid rgba(148,163,184,.22);border-radius:8px;background:#111827;padding:10px;margin-bottom:10px}
.ixw-title{font-size:12px;font-weight:700;color:#dbeafe;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}.ixw-note{font-size:12px;color:#9fb3ca;line-height:1.4;margin:4px 0 8px}
.ixw-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
.ixw-textarea{width:100%;min-height:170px;box-sizing:border-box;background:#020617;color:#e5eefb;border:1px solid rgba(148,163,184,.32);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace}
.ixw-textarea.small{min-height:92px}.ixw-textarea.tall{min-height:430px}.ixw-output{white-space:pre;overflow:auto;max-height:360px;background:#020617;color:#dbeafe;border:1px solid rgba(148,163,184,.24);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace}
.ixw-status{font-size:12px;color:#bbf7d0}.ixw-error{font-size:12px;color:#fecaca}.ixw-table{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}.ixw-table th,.ixw-table td{border-bottom:1px solid rgba(148,163,184,.16);padding:6px;text-align:left}.ixw-table th{color:#bfdbfe;background:#0b1220;position:sticky;top:0}
@media(max-width:900px){.ixw-grid,.ixw-grid.three{grid-template-columns:1fr}.ixw-dialog{height:calc(100vh - 24px);width:calc(100vw - 24px)}}
`;
  doc.head?.appendChild(style);
}

function renderLauncher() {
  return `<button type="button" class="psmap-card psmap-tile inputxml-workspace-launcher" data-ixw-open="1" title="Open InputXML Workspace">
<b>InputXML Workspace</b>
<span>CleanXML, enrichment, XML→InputXML, categorized XML, and topo compare</span>
</button>`;
}

function defaultState() {
  return {
    activeTab: 'clean',
    cleanSubtab: 'cleanxml',
    sourceXmlText: '',
    sourceName: 'pasted.xml',
    cleanXmlText: '',
    cleanTables: null,
    dtxrTableText: '',
    dtxrRows: [],
    jsonTraceDtxrRows: [],
    supportConfigJson: '{}',
    enrichment: {},
    categorizedDirection: 'input-to-categorized',
    categorizedInputText: '',
    categorizedOutputText: '',
    status: '',
    error: '',
  };
}

function tablePreview(rows = [], columns = [], emptyText = 'No rows.') {
  if (!rows.length) return `<div class="ixw-note">${h(emptyText)}</div>`;
  const visible = rows.slice(0, 300);
  return `<div style="overflow:auto;max-height:300px;"><table class="ixw-table"><thead><tr>${columns.map((column) => `<th>${h(column.label || column.key)}</th>`).join('')}</tr></thead><tbody>${visible.map((row) => `<tr>${columns.map((column) => `<td>${h(row?.[column.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function cleanSummary(state) {
  const tables = state.cleanTables;
  if (!tables) return 'No CleanXML result yet.';
  return `${tables.branches.length} branch(es), ${tables.nodes.length} node row(s), ${tables.dtxr.length} DTXR annotated node(s), ${tables.supports.length} restraint row(s).`;
}

function renderCleanXmlSubtab(state) {
  const nodeCols = [
    { key: 'branchName', label: 'Branch' },
    { key: 'nodeNumberRaw', label: 'Node' },
    { key: 'nodeName', label: 'Node Name' },
    { key: 'componentType', label: 'Resolved Role' },
    { key: 'sourceComponentType', label: 'Source Type' },
    { key: 'componentRefNo', label: 'Ref' },
    { key: 'resolverBasis', label: 'Basis' },
  ];
  return `<div class="ixw-grid">
    <section class="ixw-panel">
      <div class="ixw-title">Source XML</div>
      <div class="ixw-toolbar">
        <input type="file" accept=".xml,.XML,text/xml,application/xml" data-ixw-file="sourceXml">
        <button class="ixw-btn primary" data-ixw-action="build-cleanxml">Build CleanXML</button>
        <button class="ixw-btn" data-ixw-action="use-cleanxml-5c" ${state.cleanXmlText ? '' : 'disabled'}>Use in Tab 3</button>
      </div>
      <textarea class="ixw-textarea tall" spellcheck="false" data-ixw-field="sourceXmlText" placeholder="Paste Aveva XML or node-based XML here.">${h(state.sourceXmlText)}</textarea>
      <div class="${state.error ? 'ixw-error' : 'ixw-status'}">${h(state.error || state.status)}</div>
    </section>
    <section class="ixw-panel">
      <div class="ixw-title">CleanXML Result</div>
      <div class="ixw-note">${h(cleanSummary(state))}</div>
      <div class="ixw-toolbar">
        <button class="ixw-btn" data-ixw-action="download-cleanxml" ${state.cleanXmlText ? '' : 'disabled'}>Download CleanXML</button>
        <button class="ixw-btn" data-ixw-action="copy-cleanxml" ${state.cleanXmlText ? '' : 'disabled'}>Copy CleanXML</button>
      </div>
      <textarea class="ixw-textarea tall" readonly spellcheck="false">${h(state.cleanXmlText)}</textarea>
      <div class="ixw-title" style="margin-top:10px;">Resolved Node Table</div>
      ${tablePreview(state.cleanTables?.nodes || [], nodeCols)}
    </section>
  </div>`;
}

function renderDtxrSubtab(state) {
  const dtxrCols = [
    { key: 'psNo', label: 'PS No.(Item Name)' },
    { key: 'branch', label: 'Branch(Pipe)' },
    { key: 'bore', label: 'Bore' },
    { key: 'pos', label: 'POS' },
    { key: 'dtxr', label: 'DTXR' },
    { key: 'cmpSupGap', label: 'CMPSUPGAP' },
    { key: 'source', label: 'Source' },
  ];
  return `<div class="ixw-grid">
    <section class="ixw-panel">
      <div class="ixw-title">DTXR Table Paste</div>
      <div class="ixw-note">Accepted columns: PS No.(Item Name), Branch(Pipe), Bore, POS, DTXR, CMPSUPGAP.</div>
      <div class="ixw-toolbar">
        <button class="ixw-btn primary" data-ixw-action="parse-dtxr-table">Parse DTXR Table</button>
        <button class="ixw-btn" data-ixw-action="use-json-trace-dtxr">Use JSON Trace DTXR</button>
      </div>
      <textarea class="ixw-textarea" spellcheck="false" data-ixw-field="dtxrTableText" placeholder="PS No.(Item Name)	Branch(Pipe)	Bore	POS	DTXR	CMPSUPGAP">${h(state.dtxrTableText)}</textarea>
      <div class="ixw-title" style="margin-top:10px;">Parsed DTXR Rows</div>
      ${tablePreview([...state.dtxrRows, ...state.jsonTraceDtxrRows], dtxrCols, 'No DTXR rows parsed yet.')}
    </section>
    <section class="ixw-panel">
      <div class="ixw-title">Json Trace</div>
      <div class="ixw-note">Browse staged JSON and mark it as the JSON Trace staged source. CleanXML can consume parsed DTXR rows from this state.</div>
      <div data-ixw-json-trace-host>${renderXmlCiiJsonTracePanel(jsonTraceServices(state))}</div>
    </section>
  </div>`;
}

function renderCleanTab(state) {
  return `<div class="ixw-subtabs">${CLEAN_SUBTABS.map(([id, label]) => `<button type="button" class="ixw-subtab ${state.cleanSubtab === id ? 'active' : ''}" data-ixw-clean-subtab="${h(id)}">${h(label)}</button>`).join('')}</div>${state.cleanSubtab === 'dtxr' ? renderDtxrSubtab(state) : renderCleanXmlSubtab(state)}`;
}

function renderEnrichmentTab(state) {
  const output = state.enrichment || {};
  return `<div class="ixw-grid three">
    <section class="ixw-panel">
      <div class="ixw-title">InputXML</div>
      <textarea class="ixw-textarea" data-ixw-field="enrichInputXml" spellcheck="false" placeholder="Paste InputXML to enrich">${h(output.inputXmlText || '')}</textarea>
      <div class="ixw-title" style="margin-top:10px;">INPUT_BASIC_ELEMENT_DATA</div>
      <textarea class="ixw-textarea" data-ixw-field="basicText" spellcheck="false" placeholder="Paste helper table export">${h(output.basicText || '')}</textarea>
      <div class="ixw-note">Only sideload/enrichment columns are projected: ELEMENTID, FROM_NODE, TO_NODE, FROM_NODE_NAME, TO_NODE_NAME, LINE_NO, REST_PTR, ELEMENT_NAME.</div>
    </section>
    <section class="ixw-panel">
      <div class="ixw-title">ACCDB Helper Tables</div>
      <textarea class="ixw-textarea small" data-ixw-field="restraintsText" spellcheck="false" placeholder="INPUT_RESTRAINTS">${h(output.restraintsText || '')}</textarea>
      <textarea class="ixw-textarea small" data-ixw-field="nodalText" spellcheck="false" placeholder="INPUT_NODAL_COORDINATES">${h(output.nodalText || '')}</textarea>
      <textarea class="ixw-textarea small" data-ixw-field="userNodalText" spellcheck="false" placeholder="INPUT_USER_NODAL_COORDINATES">${h(output.userNodalText || '')}</textarea>
      <div class="ixw-toolbar">
        <button class="ixw-btn primary" data-ixw-action="generate-sideload">Generate sideload</button>
        <button class="ixw-btn" data-ixw-action="apply-sideload" ${output.lineIdText ? '' : 'disabled'}>Apply enrichment</button>
      </div>
      <div class="ixw-note">${h(output.sideloadStatus || '')}</div>
    </section>
    <section class="ixw-panel">
      <div class="ixw-title">Generated Sideload Inputs</div>
      <textarea class="ixw-textarea small" readonly>${h(output.lineIdText || '')}</textarea>
      <textarea class="ixw-textarea small" readonly>${h(output.nodeNameText || '')}</textarea>
      <textarea class="ixw-textarea small" readonly>${h(output.restraintTagText || '')}</textarea>
      <textarea class="ixw-textarea small" readonly>${h(output.coordinateText || '')}</textarea>
      <div class="ixw-title" style="margin-top:10px;">Enriched InputXML</div>
      <textarea class="ixw-textarea" readonly>${h(output.enrichedXmlText || '')}</textarea>
    </section>
  </div>`;
}

function renderCategorizedTab(state) {
  return `<div class="ixw-grid">
    <section class="ixw-panel">
      <div class="ixw-title">Categorized XML Conversion</div>
      <label class="ixw-note">Direction
        <select data-ixw-field="categorizedDirection" style="margin-left:8px;background:#020617;color:#dbeafe;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:5px;">
          <option value="input-to-categorized" ${state.categorizedDirection === 'input-to-categorized' ? 'selected' : ''}>InputXML to Categorized XML</option>
          <option value="categorized-to-input" ${state.categorizedDirection === 'categorized-to-input' ? 'selected' : ''}>Categorized XML to InputXML</option>
        </select>
      </label>
      <textarea class="ixw-textarea tall" data-ixw-field="categorizedInputText" spellcheck="false" placeholder="Paste InputXML or Categorized XML">${h(state.categorizedInputText)}</textarea>
      <div class="ixw-toolbar">
        <button class="ixw-btn primary" data-ixw-action="run-categorized">Convert</button>
        <button class="ixw-btn" data-ixw-action="download-categorized" ${state.categorizedOutputText ? '' : 'disabled'}>Download</button>
      </div>
    </section>
    <section class="ixw-panel">
      <div class="ixw-title">Output</div>
      <textarea class="ixw-textarea tall" readonly>${h(state.categorizedOutputText)}</textarea>
    </section>
  </div>`;
}

function renderMiscTab(state) {
  return `<div class="ixw-grid">
    <section class="ixw-panel">
      <div class="ixw-title">Shared Config / Support Types</div>
      <textarea class="ixw-textarea small" data-option-key="supportConfigJson" data-ixw-field="supportConfigJson" spellcheck="false">${h(state.supportConfigJson)}</textarea>
      <div data-ixw-support-host>${xmlCiiRenderSupportMapperPhase()}</div>
    </section>
    <section class="ixw-panel">
      <div class="ixw-title">Ported 5B Topology</div>
      <div data-ixw-5b-host></div>
    </section>
  </div>`;
}

function renderBody(state) {
  if (state.activeTab === 'clean') return renderCleanTab(state);
  if (state.activeTab === 'enrich') return renderEnrichmentTab(state);
  if (state.activeTab === 'xml-to-inputxml') return `<div data-ixw-5c-host></div>`;
  if (state.activeTab === 'categorized') return renderCategorizedTab(state);
  if (state.activeTab === 'compare5d') return `<div data-ixw-5d-host></div>`;
  if (state.activeTab === 'misc') return renderMiscTab(state);
  return '';
}

function renderPopup(state) {
  return `<div class="ixw-head">
    <div><b id="${POPUP_TITLE_ID}">InputXML Workspace</b><span>CleanXML, enrichment, XML to InputXML, categorized XML, topology compare, and shared configuration.</span></div>
    <button type="button" class="ixw-close" data-ixw-close="1">Close</button>
  </div>
  <div class="ixw-tabs">${TABS.map(([id, label]) => `<button type="button" class="ixw-tab ${state.activeTab === id ? 'active' : ''}" data-ixw-tab="${h(id)}">${h(label)}</button>`).join('')}</div>
  <div class="ixw-body">${renderBody(state)}</div>`;
}

function collect(dialog, state) {
  dialog.querySelectorAll('[data-ixw-field]').forEach((field) => {
    const key = field.getAttribute('data-ixw-field');
    if (!key) return;
    if (['enrichInputXml', 'basicText', 'restraintsText', 'nodalText', 'userNodalText'].includes(key)) {
      state.enrichment[key === 'enrichInputXml' ? 'inputXmlText' : key] = field.value;
    } else {
      state[key] = field.value;
    }
  });
  return state;
}

function saveTextFile(filename, value, mime = 'text/plain') {
  const blob = new Blob([String(value ?? '')], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(String(value ?? ''));
  const area = document.createElement('textarea');
  area.value = String(value ?? '');
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return undefined;
}

function jsonTraceSnapshot() {
  try {
    const live = window.xmlCiiJsonTraceState?.getSnapshot?.();
    if (live && typeof live === 'object') return live;
  } catch {}
  try {
    const raw = localStorage.getItem('xmlCii.jsonTrace.v1');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildXmlTraceRows(state) {
  const rows = [];
  for (const node of state.cleanTables?.nodes || []) {
    if (node.dtxrPos) rows.push({ type: 'dtxr-pos', nodeNumber: node.nodeNumberRaw, branchName: node.branchName, componentType: node.componentType, position: node.position ? [node.position.x, node.position.y, node.position.z].join(' ') : '', finalValue: node.dtxrPos, status: 'applied', method: node.resolverBasis });
    if (node.dtxrPs) rows.push({ type: 'dtxr-ps', nodeNumber: node.nodeNumberRaw, branchName: node.branchName, componentType: node.componentType, finalValue: node.dtxrPs, status: 'applied', method: node.resolverBasis });
  }
  return rows;
}

function jsonTraceServices(state) {
  return {
    useJsonTraceSource: true,
    getCurrentXmlText: () => state.cleanXmlText || state.sourceXmlText || '',
    buildXmlNodeTrace: () => buildXmlTraceRows(state),
    setUseJsonTraceSource: () => {},
  };
}

function rerender(dialog, state) {
  dialog.innerHTML = renderPopup(state);
  bindPopup(dialog, state);
  bindRenderedPanels(dialog, state);
}

function buildCurrentDtxrRows(state) {
  return [...(state.dtxrRows || []), ...(state.jsonTraceDtxrRows || [])];
}

function handleAction(dialog, state, action) {
  collect(dialog, state);
  state.error = '';
  try {
    if (action === 'build-cleanxml') {
      const result = buildCleanXml(state.sourceXmlText, { sourceName: state.sourceName, dtxrRows: buildCurrentDtxrRows(state) });
      state.cleanTables = result.tables;
      state.cleanXmlText = result.cleanXmlText;
      state.status = `CleanXML built: ${cleanSummary(state)}`;
    } else if (action === 'parse-dtxr-table') {
      state.dtxrRows = parseDtxrTable(state.dtxrTableText);
      state.status = `Parsed ${state.dtxrRows.length} DTXR table row(s).`;
    } else if (action === 'use-json-trace-dtxr') {
      state.jsonTraceDtxrRows = dtxrRowsFromJsonTraceSnapshot(jsonTraceSnapshot());
      if (!state.dtxrTableText && state.jsonTraceDtxrRows.length) state.dtxrTableText = dtxrRowsToTableText(state.jsonTraceDtxrRows);
      state.status = `Loaded ${state.jsonTraceDtxrRows.length} DTXR row(s) from JSON Trace.`;
    } else if (action === 'use-cleanxml-5c') {
      state.activeTab = 'xml-to-inputxml';
      state.status = 'CleanXML selected for Tab 3 XML to InputXML.';
    } else if (action === 'download-cleanxml') {
      saveTextFile('inputxml-workspace-cleanxml.xml', state.cleanXmlText, 'application/xml');
    } else if (action === 'copy-cleanxml') {
      copyText(state.cleanXmlText);
      state.status = 'CleanXML copied.';
    } else if (action === 'generate-sideload') {
      state.enrichment = { ...state.enrichment, ...buildAccdbSideloadTables(state.enrichment) };
      state.enrichment.sideloadStatus = `Generated sideload: ${JSON.stringify(state.enrichment.diagnostics)}`;
    } else if (action === 'apply-sideload') {
      const result = applyXmlCompareSideload(state.enrichment.inputXmlText || '', state.enrichment);
      state.enrichment.enrichedXmlText = result.xmlText;
      state.enrichment.sideloadStatus = `Applied: ${JSON.stringify(result.report)}`;
    } else if (action === 'run-categorized') {
      state.categorizedOutputText = convertCategorizedInputXml(state.categorizedInputText, state.categorizedDirection, { sourceName: 'InputXML Workspace' });
      state.status = 'Categorized conversion complete.';
    } else if (action === 'download-categorized') {
      saveTextFile(categorizedFileName('inputxml-workspace.xml', state.categorizedDirection), state.categorizedOutputText, 'application/xml');
    }
  } catch (error) {
    state.error = error?.message || String(error);
  }
  rerender(dialog, state);
}

function bindFileInputs(dialog, state) {
  dialog.querySelector('[data-ixw-file="sourceXml"]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.sourceXmlText = await file.text();
    state.sourceName = file.name;
    state.status = `Loaded ${file.name}.`;
    rerender(dialog, state);
  });
}

function bindPopup(dialog, state) {
  dialog.querySelectorAll('[data-ixw-tab]').forEach((button) => button.addEventListener(ACTIVATE, () => {
    collect(dialog, state);
    state.activeTab = button.getAttribute('data-ixw-tab') || 'clean';
    rerender(dialog, state);
  }));
  dialog.querySelectorAll('[data-ixw-clean-subtab]').forEach((button) => button.addEventListener(ACTIVATE, () => {
    collect(dialog, state);
    state.cleanSubtab = button.getAttribute('data-ixw-clean-subtab') || 'cleanxml';
    rerender(dialog, state);
  }));
  dialog.querySelectorAll('[data-ixw-action]').forEach((button) => button.addEventListener(ACTIVATE, () => handleAction(dialog, state, button.getAttribute('data-ixw-action'))));
  bindFileInputs(dialog, state);
}

function bindRenderedPanels(dialog, state) {
  const jsonHost = dialog.querySelector('[data-ixw-json-trace-host]');
  if (jsonHost) bindXmlCiiJsonTracePanel(jsonHost, jsonTraceServices(state));
  const host5c = dialog.querySelector('[data-ixw-5c-host]');
  if (host5c) renderXmlCiiTopology5CPanel(host5c, { root: dialog, workflowXmlText: state.cleanXmlText || state.sourceXmlText || '', supportConfigJson: state.supportConfigJson || '{}' });
  const host5d = dialog.querySelector('[data-ixw-5d-host]');
  if (host5d) renderXmlCiiInputXmlCompare5DPanel(host5d, { root: dialog });
  const host5b = dialog.querySelector('[data-ixw-5b-host]');
  if (host5b) renderXmlCiiTopology5BPanel(host5b, { root: dialog });
  const supportHost = dialog.querySelector('[data-ixw-support-host]');
  if (supportHost) bindXmlCiiSupportMapperPhase(supportHost, {
    config: (() => { try { return JSON.parse(state.supportConfigJson || '{}'); } catch { return {}; } })(),
    onSaveConfig: (config) => {
      state.supportConfigJson = JSON.stringify(config, null, 2);
      const input = dialog.querySelector('[data-ixw-field="supportConfigJson"]');
      if (input) input.value = state.supportConfigJson;
    },
  });
}

function mountPopup(root, onClose) {
  ensureModalStyle();
  const state = defaultState();
  const modal = document.createElement('div');
  modal.className = 'ixw-backdrop';
  const dialog = document.createElement('section');
  dialog.className = 'psmap-card ixw-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', POPUP_TITLE_ID);
  modal.appendChild(dialog);
  (document.body || root).appendChild(modal);
  rerender(dialog, state);
  dialog.querySelector('[data-ixw-close="1"]')?.addEventListener(ACTIVATE, () => {
    modal.remove();
    onClose();
  });
  modal.addEventListener(ACTIVATE, (event) => {
    if (event.target === modal) {
      modal.remove();
      onClose();
    }
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      modal.remove();
      onClose();
    }
  });
  return modal;
}

export function installInputXmlWorkspaceTile(container) {
  ensureModalStyle(container?.ownerDocument || globalThis.document);
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-inputxml-workspace-launcher]')) return null;
  const launcher = document.createElement('section');
  launcher.setAttribute('data-inputxml-workspace-launcher', '1');
  launcher.innerHTML = renderLauncher();
  utilitiesRoot.appendChild(launcher);
  let popup = null;
  launcher.querySelector('[data-ixw-open="1"]').addEventListener(ACTIVATE, () => {
    if (popup) return;
    popup = mountPopup(utilitiesRoot, () => { popup = null; });
  });
  return () => {
    if (popup) popup.remove();
    launcher.remove();
  };
}

export const _test = Object.freeze({ defaultState, renderLauncher, renderPopup, cleanSummary, buildXmlTraceRows, jsonTraceServices, tablePreview });
