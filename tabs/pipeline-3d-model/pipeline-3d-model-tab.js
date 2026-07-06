import { buildCombinedCoordinateTable } from './pipeline-3d-model-geometry.js';
import { buildCoordinateRows, coordinateRowsToTabText, buildPipeline3dModelXml } from './pipeline-3d-model-xml-builder.js';
import { CONFIG_FIELDS, fieldLabel, loadConfigValues, saveConfigValues } from './pipeline-3d-model-config.js';
import { SAMPLE_TABLE_1, SAMPLE_TABLE_2, SAMPLE_TABLE_3 } from './pipeline-3d-model-samples.js';

const ACTIVATE = 'click';
const POPUP_TITLE_ID = 'pipeline-3d-model-title';
const MODAL_STYLE_ID = 'pipeline-3d-model-modal-style';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function ensureModalStyle(doc = globalThis.document) {
  if (!doc || doc.getElementById(MODAL_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = MODAL_STYLE_ID;
  style.textContent = `
.pipeline-3d-model-launcher{height:160px;width:220px;border:1px solid rgba(143,197,255,.25);border-radius:18px;background:linear-gradient(145deg,#10213a,#0b1220);color:#e8f2ff;cursor:pointer;box-shadow:0 12px 34px rgba(0,0,0,.28);display:grid!important;grid-template-columns:1fr;place-items:center;text-align:center;padding:16px;margin-top:18px;gap:4px;box-sizing:border-box}
.pipeline-3d-model-launcher-icon{display:block;font-size:40px;line-height:1;margin:0 0 6px}.pipeline-3d-model-launcher b{font-size:15px;color:#e0f2fe}.pipeline-3d-model-launcher .psmap-help-text{color:#94a3b8;font-size:12px;line-height:1.35}
.pipeline-3d-model-backdrop{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:22px;background:rgba(2,6,23,.78);box-sizing:border-box}
.pipeline-3d-model-dialog{width:min(1240px,calc(100vw - 36px));height:min(860px,calc(100vh - 36px));display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;border:1px solid rgba(125,211,252,.38)!important;border-radius:18px!important;background:#0f172a!important;color:#dbeafe;box-shadow:0 24px 80px rgba(0,0,0,.58)}
.pipeline-3d-model-dialog>.psmap-card-head{position:sticky;top:0;z-index:2;align-items:flex-start;background:linear-gradient(90deg,rgba(8,47,73,.40),rgba(15,23,42,.90));border-bottom:1px solid rgba(148,163,184,.18)}
.pipeline-3d-model-dialog>.psmap-card-body{min-height:0;overflow:auto;padding:14px}
.p3d-close{position:absolute;top:14px;right:16px}
.p3d-input-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}
.p3d-input-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#94a3b8}
.p3d-input-grid textarea{min-height:160px;font-family:monospace;font-size:12px;background:#0b1220;color:#e2e8f0;border:1px solid rgba(148,163,184,.28);border-radius:8px;padding:6px}
.p3d-branch-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.p3d-branch-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#94a3b8}
.p3d-branch-grid input{background:#0b1220;color:#e2e8f0;border:1px solid rgba(148,163,184,.28);border-radius:8px;padding:6px}
.p3d-actions{display:flex;gap:10px;margin-bottom:14px}
.p3d-actions button{background:#1d4ed8;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px}
.p3d-actions button:hover{background:#2563eb}
.p3d-output pre{background:#0b1220;border:1px solid rgba(148,163,184,.28);border-radius:8px;padding:10px;max-height:260px;overflow:auto;font-size:11px;white-space:pre}
.p3d-output h4{margin:14px 0 6px;color:#e0f2fe}
`;
  doc.head?.appendChild(style);
}

function renderLauncher() {
  return `<button type="button" class="psmap-card psmap-tile pipeline-3d-model-launcher" data-p3d-open="1" title="Build a Coordinate-tab table and CII(2019) Custom Input XML from pipeline geometry tables">
<span class="pipeline-3d-model-launcher-icon" aria-hidden="true">📐</span>
<b>Pipeline 3D Model</b>
<span class="psmap-help-text">Tables 1-3 → Coordinate tab → CII(2019) XML</span>
</button>`;
}

function renderBranchForm() {
  return `<div class="p3d-branch-grid">${CONFIG_FIELDS.map(
    (field) => `<label>${h(fieldLabel(field))}<input data-p3d-field="${h(field.key)}" placeholder="${h(fieldLabel(field))}"></label>`,
  ).join('')}</div>`;
}

function renderPopup() {
  return `<div class="psmap-card-head"><b id="${POPUP_TITLE_ID}">Pipeline 3D Model</b>
<button type="button" class="p3d-close" data-p3d-close="1" aria-label="Close Pipeline 3D Model">Close</button></div>
<div class="psmap-card-body">
<div class="psmap-help-text">Paste the 3 input tables below, fill in branch details, then Run.</div>
<div class="p3d-input-grid">
<label>Table 1 — Point / X / Y / Z<textarea data-p3d="table1" placeholder="IP3-IP Start	0	0	0"></textarea></label>
<label>Table 2 — Horizontal (m) vs Grade Elevation (m)<textarea data-p3d="table2" placeholder="0.0	231.32"></textarea></label>
<label>Table 3 — Marker segment lengths / cumulative distances<textarea data-p3d="table3" placeholder="20.5, 34.3, 16.0, ..."></textarea></label>
</div>
<h4>Line / Branch Info</h4>
${renderBranchForm()}
<div class="p3d-actions">
<button type="button" data-p3d="new">New (Load Sample)</button>
<button type="button" data-p3d="run">Run</button>
<button type="button" data-p3d="download-coordinate">Download Coordinate Tab (.tsv)</button>
<button type="button" data-p3d="download-xml">Download XML</button>
</div>
<div class="p3d-output">
<h4>Coordinate Tab Output</h4>
<pre data-p3d="coordinate-output">Run to generate.</pre>
<h4>CII(2019) Custom Input XML</h4>
<pre data-p3d="xml-output">Run to generate.</pre>
</div>
</div>`;
}

function readBranchInfo(get) {
  const value = (key) => get(`field-${key}`)?.value?.trim() || '';
  return {
    branchName: value('lineNo') || 'B1',
    lineNo: value('lineNo'),
    boreMm: value('boreMm'),
    wallThickness: value('wallThickness'),
    p1: value('p1'),
    t1: value('t1'),
    t2: value('t2'),
    t3: value('t3'),
    fluidDensity: value('fluidDensity'),
    materialCode: value('materialCode'),
  };
}

function applyConfigValues(get, values) {
  CONFIG_FIELDS.forEach((field) => {
    const input = get(`field-${field.key}`);
    if (input) input.value = values[field.key] ?? '';
  });
}

function readConfigValues(get) {
  const values = {};
  CONFIG_FIELDS.forEach((field) => {
    values[field.key] = get(`field-${field.key}`)?.value ?? '';
  });
  return values;
}

function wireConfigPersistence(dialog, get) {
  CONFIG_FIELDS.forEach((field) => {
    const input = get(`field-${field.key}`);
    if (input) input.addEventListener('input', () => saveConfigValues(readConfigValues(get)));
  });
}

function saveTextFile(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function runConversion(host, get, state) {
  const table1Text = get('table1').value;
  const table2Text = get('table2').value;
  const table3Text = get('table3').value;
  const branchInfo = readBranchInfo(get);

  const combined = buildCombinedCoordinateTable({ table1Text, table2Text, table3Text });
  const coordinateRows = buildCoordinateRows(combined, branchInfo.branchName);
  const coordinateText = coordinateRowsToTabText(coordinateRows);
  const xmlText = buildPipeline3dModelXml(branchInfo, coordinateRows);

  state.coordinateText = coordinateText;
  state.xmlText = xmlText;
  host.querySelector('[data-p3d="coordinate-output"]').textContent = coordinateText;
  host.querySelector('[data-p3d="xml-output"]').textContent = xmlText;
}

function closePopup(modal, onClose) {
  modal.remove();
  onClose();
}

function mountPopup(root, onClose) {
  ensureModalStyle();
  const state = { coordinateText: '', xmlText: '' };
  const modal = document.createElement('div');
  modal.className = 'pipeline-3d-model-backdrop';
  const dialog = document.createElement('section');
  dialog.className = 'psmap-card pipeline-3d-model-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', POPUP_TITLE_ID);
  dialog.innerHTML = renderPopup();
  modal.appendChild(dialog);
  (document.body || root).appendChild(modal);

  const get = (name) =>
    name.startsWith('field-') ? dialog.querySelector(`[data-p3d-field="${name.slice(6)}"]`) : dialog.querySelector(`[data-p3d="${name}"]`);

  dialog.querySelector('[data-p3d-close="1"]').addEventListener(ACTIVATE, () => closePopup(modal, onClose));
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopup(modal, onClose);
  });
  modal.addEventListener(ACTIVATE, (event) => {
    if (event.target === modal) closePopup(modal, onClose);
  });

  applyConfigValues(get, loadConfigValues());
  wireConfigPersistence(dialog, get);

  dialog.querySelector('[data-p3d="new"]').addEventListener(ACTIVATE, () => {
    get('table1').value = SAMPLE_TABLE_1;
    get('table2').value = SAMPLE_TABLE_2;
    get('table3').value = SAMPLE_TABLE_3;
  });
  dialog.querySelector('[data-p3d="run"]').addEventListener(ACTIVATE, () => {
    saveConfigValues(readConfigValues(get));
    runConversion(dialog, get, state);
  });
  dialog.querySelector('[data-p3d="download-coordinate"]').addEventListener(ACTIVATE, () => {
    if (!state.coordinateText) return;
    saveTextFile('pipeline-coordinate-tab.tsv', state.coordinateText, 'text/tab-separated-values');
  });
  dialog.querySelector('[data-p3d="download-xml"]').addEventListener(ACTIVATE, () => {
    if (!state.xmlText) return;
    saveTextFile('pipeline-3d-model.xml', state.xmlText, 'application/xml');
  });

  if (typeof dialog.focus === 'function') dialog.focus();
  return modal;
}

export function installPipeline3dModelTile(container) {
  ensureModalStyle(container?.ownerDocument || globalThis.document);
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-pipeline-3d-model-launcher]')) return null;
  const launcher = document.createElement('section');
  launcher.setAttribute('data-pipeline-3d-model-launcher', '1');
  launcher.innerHTML = renderLauncher();
  utilitiesRoot.appendChild(launcher);
  let popup = null;
  launcher.querySelector('[data-p3d-open="1"]').addEventListener(ACTIVATE, () => {
    if (popup) return;
    popup = mountPopup(utilitiesRoot, () => {
      popup = null;
    });
  });
  return () => {
    if (popup) popup.remove();
    launcher.remove();
  };
}

export const _test = Object.freeze({ renderPopup, renderLauncher, readBranchInfo, ensureModalStyle });
