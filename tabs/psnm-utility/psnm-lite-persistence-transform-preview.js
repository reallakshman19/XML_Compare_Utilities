import { psnmTransformNodeToPs } from './psnm-axis-transform-core.js';
const STORAGE_KEY = 'psnm.workbench.lastSourceSetup.v1';
const STYLE_ID = 'psnm-lite-persist-transform-style';
let restoreInProgress = false;
let saveTimer = null;
let renderTimer = null;

function h(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function num(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function fmt(value, decimals = 3) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : '-';
}

function splitLines(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !/^-{3,}$/.test(line));
}

function splitCells(line) {
  const raw = String(line || '').trim();
  if (!raw) return [];
  if (raw.includes('\t')) return raw.split('\t').map((cell) => cell.trim());
  return raw.split(/ {2,}/).map((cell) => cell.trim()).filter(Boolean);
}

function normHeader(value) {
  return String(value ?? '').toLowerCase().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function readSnapshot() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed?.version === 1 ? parsed : { version: 1 };
  } catch {
    return { version: 1 };
  }
}

function parsePsPosition(text) {
  const src = String(text || '').replace(/,/g, ' ');
  const out = { e: NaN, u: NaN, s: NaN };
  for (const match of src.matchAll(/\b([EWSNUD])\s*(-?\d+(?:\.\d+)?)\s*(?:mm)?\b/gi)) {
    const axis = match[1].toUpperCase();
    const value = Number(match[2]);
    if (axis === 'E') out.e = value;
    else if (axis === 'W') out.e = -value;
    else if (axis === 'S') out.s = value;
    else if (axis === 'N') out.s = -value;
    else if (axis === 'U') out.u = value;
    else if (axis === 'D') out.u = -value;
  }
  return out;
}

function parseXyz(text) {
  const parts = String(text || '').split(',').map((part) => num(part));
  if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) return { x: parts[0], y: parts[1], z: parts[2] };
  return { x: NaN, y: NaN, z: NaN };
}

function parseTable2(text) {
  const lines = splitLines(text);
  if (!lines.length) return [];
  const firstCells = splitCells(lines[0]);
  const headers = firstCells.map(normHeader);
  const hasHeader = headers.some((header) => ['node', 'node no', 'node number', 'x', 'raw x', 'y', 'raw y', 'z', 'raw z', 'position', 'position(x,y,z)', 'position(x,y,z) transformed'].includes(header));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = [];
  const headerIndex = (names) => headers.findIndex((header) => names.includes(header));
  const idxNode = headerIndex(['node', 'node no', 'node number']);
  const idxX = headerIndex(['x', 'raw x', 'node x', 'coord x']);
  const idxY = headerIndex(['y', 'raw y', 'node y', 'coord y']);
  const idxZ = headerIndex(['z', 'raw z', 'node z', 'coord z']);
  const idxPos = headerIndex(['position', 'position(x,y,z)', 'position(x,y,z) transformed', 'transformed position']);
  const idxBore = headerIndex(['bore', 'nb', 'dn', 'nominal bore', 'bore mm', 'bore(mm)']);

  for (const [index, line] of dataLines.entries()) {
    const cells = splitCells(line);
    if (!cells.length) continue;
    let node = '';
    let x = NaN;
    let y = NaN;
    let z = NaN;
    let bore = NaN;
    if (hasHeader) {
      node = String(cells[idxNode] ?? cells[0] ?? '').trim();
      if (idxX >= 0 && idxY >= 0 && idxZ >= 0) {
        x = num(cells[idxX]);
        y = num(cells[idxY]);
        z = num(cells[idxZ]);
      } else if (idxPos >= 0) {
        const xyz = parseXyz(cells[idxPos]);
        x = xyz.x; y = xyz.y; z = xyz.z;
      }
      if (idxBore >= 0) bore = num(cells[idxBore]);
    } else {
      node = String(cells[0] ?? '').trim();
      x = num(cells[1]);
      y = num(cells[2]);
      z = num(cells[3]);
      bore = num(cells[4]);
    }
    if (!node || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    rows.push({ node, occurrenceId: `${node}#${String(index + 1).padStart(3, '0')}`, x, y, z, bore: Number.isFinite(bore) ? bore : null });
  }
  return rows;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.psnm-lite-note{font-size:12px;color:#cfe4ff;border:1px solid rgba(143,197,255,.16);background:#0b1220;border-radius:10px;padding:10px}.psnm-transform-preview-table{width:100%;border-collapse:collapse;font-size:12px}.psnm-transform-preview-table th,.psnm-transform-preview-table td{border-bottom:1px solid rgba(143,197,255,.12);padding:7px 8px;text-align:left;white-space:nowrap}.psnm-transform-preview-table th{position:sticky;top:0;background:#1e293b;color:#9fc9ff}.psnm-lite-metrics{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:8px}.psnm-lite-metric{background:#0b1220;border:1px solid rgba(143,197,255,.15);border-radius:10px;padding:9px}.psnm-lite-metric b{display:block;color:#8fc5ff}.psnm-lite-scroll{overflow:auto;max-height:320px}`;
  document.head.appendChild(style);
}

function findModal(target) {
  return target?.closest?.('[data-psnm="modal"]') || document.querySelector('[data-psnm="modal"]');
}

function liveModal() {
  return document.querySelector('[data-psnm="modal"]');
}

function sourceValues(modal) {
  const out = {};
  modal.querySelectorAll('[data-source]').forEach((el) => { out[el.dataset.source] = el.value; });
  return out;
}

function setupValues(modal) {
  const out = {};
  modal.querySelectorAll('[data-setup]').forEach((el) => {
    const key = el.dataset.setup;
    if (key === 'anchorPsRowId' || key === 'anchorNodeRowId') return;
    out[key] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return out;
}

function saveFromModal(modal) {
  if (!modal || restoreInProgress) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const current = liveModal() || modal;
      const previous = readSnapshot();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...previous,
        version: 1,
        savedAt: new Date().toISOString(),
        source: sourceValues(current),
        setup: setupValues(current),
        manualAnchors: previous.manualAnchors || null,
      }));
    } catch {}
  }, 150);
}

function loadSnapshot() {
  const parsed = readSnapshot();
  if (parsed?.version !== 1) return null;
  // A previous version silently replaced the two-row workbench sample with
  // the separate axis benchmark and persisted it as the live source. Do not
  // re-import that automatically generated benchmark on subsequent opens.
  const legacyBenchmark = parsed.benchmarkDefaultsVersion === '20260610-axis-benchmark-1';
  const ps = String(parsed.source?.table1Text || '');
  const nodes = String(parsed.source?.table2Text || '');
  if (legacyBenchmark && /^PS Name\tE\tN\tU\tbore\s*\nPS-01\t/i.test(ps)
      && /^Node\tX\tY\tZ\tdia\s*\n10\t/i.test(nodes)) return null;
  return parsed;
}

function restoreIntoModal(modal) {
  const current = modal || liveModal();
  const saved = loadSnapshot();
  if (!current || !saved) return;
  restoreInProgress = true;
  current.querySelectorAll('[data-source]').forEach((el) => {
    if (Object.prototype.hasOwnProperty.call(saved.source || {}, el.dataset.source)) {
      el.value = saved.source[el.dataset.source] ?? '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  current.querySelectorAll('[data-setup]').forEach((el) => {
    const key = el.dataset.setup;
    if (key === 'anchorPsRowId' || key === 'anchorNodeRowId') return;
    if (!Object.prototype.hasOwnProperty.call(saved.setup || {}, key)) return;
    if (el.type === 'checkbox') el.checked = saved.setup[key] === true;
    else el.value = saved.setup[key];
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  restoreInProgress = false;
  schedulePreview();
}

function setupPanelElement(modal) {
  return modal?.querySelector('[data-psnm-panel="setup"]');
}

// The displayed transform and row positions come from the same resolved
// Master-table state as Run Match. Never derive an independent raw-source XYZ
// transform or mislabel an axis permutation as E=X, U=Y, S=Z.
export function PSNM_previewMasterTransformRows(context, limit = 300) {
  if (!context?.masterReady || !context?.transform) return [];
  return (context.masterRows || []).slice(0, limit).filter(row =>
    [row.x, row.y, row.z].every(Number.isFinite)).map(row => ({
    ...row,
    transformed: psnmTransformNodeToPs({ x: row.x, y: row.y, z: row.z }, context.transform),
  }));
}

function renderTransformPreview(modal = null) {
  const current = modal && modal.isConnected ? modal : liveModal();
  if (!current) return;
  installStyle();
  const setupPanel = setupPanelElement(current);
  if (!setupPanel) return;
  let panel = current.querySelector('[data-psnm-transform-preview]');
  if (!panel || !panel.isConnected) {
    panel = document.createElement('section');
    panel.className = 'psnm-card';
    panel.dataset.psnmTransformPreview = '1';
    setupPanel.appendChild(panel);
  }
  const context = current.__psnmPreviewContext;
  const transform = context?.transform;
  const rows = PSNM_previewMasterTransformRows(context);
  if (!context?.masterReady || !transform) {
    const markup = '<div class="psnm-card-head"><b>Master Node Transform Preview</b></div><div class="psnm-card-body"><div class="psnm-lite-note">Resolve Master Tables, then choose an Anchor pair to preview the exact transform used by Run Match.</div></div>';
    if (panel.innerHTML !== markup) panel.innerHTML = markup;
    return;
  }
  const offsets = transform.offsets || {};
  const axes = transform.axes || { e: 'x', u: 'y', s: 'z' };
  const signs = transform.signs || { e: 1, u: 1, s: 1 };
  const formula = transform.axisFormula || ['e','u','s'].map(axis =>
    axis.toUpperCase() + '=' + (signs[axis] === -1 ? '-' : '') + String(axes[axis] || '?').toUpperCase()
      + (Number(offsets[axis]) >= 0 ? '+' : '') + fmt(offsets[axis])).join('; ');
  const body = rows.length ? rows.map(row =>
    '<tr><td>' + h(row.node) + '</td><td>' + h(row.occurrenceId) + '</td>'
    + '<td>' + fmt(row.x) + '</td><td>' + fmt(row.y) + '</td><td>' + fmt(row.z) + '</td>'
    + '<td>' + fmt(row.transformed.e) + '</td><td>' + fmt(row.transformed.u) + '</td><td>' + fmt(row.transformed.s) + '</td>'
    + '<td>' + h(row.bore ?? '-') + '</td></tr>').join('')
    : '<tr><td colspan="9">No valid resolved Master Node coordinates to preview.</td></tr>';
  const markup = '<div class="psnm-card-head"><b>Master Node Transform Preview</b><span class="psnm-badge">'
    + rows.length + ' row(s)</span></div><div class="psnm-card-body"><div class="psnm-lite-note"><b>Selected transform used by Run Match:</b> '
    + h(formula) + '</div><div class="psnm-lite-metrics"><div class="psnm-lite-metric"><b>'
    + fmt(offsets.e) + '</b><span>offset E</span></div><div class="psnm-lite-metric"><b>'
    + fmt(offsets.u) + '</b><span>offset U</span></div><div class="psnm-lite-metric"><b>'
    + fmt(offsets.s) + '</b><span>offset S</span></div></div><div class="psnm-lite-scroll"><table class="psnm-transform-preview-table">'
    + '<thead><tr><th>Node</th><th>Occurrence</th><th>Master X</th><th>Master Y</th><th>Master Z</th>'
    + '<th>Node E</th><th>Node U</th><th>Node S</th><th>Bore</th></tr></thead><tbody>'
    + body + '</tbody></table></div></div>';
  if (panel.innerHTML !== markup) panel.innerHTML = markup;
}

function schedulePreview() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => renderTransformPreview(liveModal()), 120);
}

function scheduleRestoreAndPreview() {
  setTimeout(() => restoreIntoModal(liveModal()), 0);
  setTimeout(() => renderTransformPreview(liveModal()), 160);
  setTimeout(() => renderTransformPreview(liveModal()), 350);
}

document.addEventListener('click', (event) => {
  const open = event.target.closest?.('[data-psnm-action="open"]');
  if (open) {
    scheduleRestoreAndPreview();
    return;
  }
  if (event.target.closest('[data-psnm-tab="setup"], [data-psnm-action="resolveMasters"]')) schedulePreview();
}, false);

document.addEventListener('input', (event) => {
  const modal = findModal(event.target);
  if (!modal) return;
  if (event.target.closest('[data-source], [data-setup]')) {
    saveFromModal(modal);
    schedulePreview();
  }
}, false);

document.addEventListener('change', (event) => {
  const modal = findModal(event.target);
  if (!modal) return;
  if (event.target.closest('[data-source], [data-setup]')) {
    saveFromModal(modal);
    schedulePreview();
  }
}, false);

installStyle();

export function PSNM_litePersistenceTransformPreviewInstalled() {
  return true;
}
