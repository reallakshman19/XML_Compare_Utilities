// Enhances the Pipeline 3D Model Key Plan preview after Run.
// The base popup renders the Table-1 sheet transform SVG. This module overlays/replaces
// that preview with the generated Coordinate-tab geometry so node numbers and marker
// labels are visible without changing the converter or XML generation flow.

const STYLE_ID = 'pipeline-3d-model-keyplan-preview-overrides-style';
const VIEWER_SELECTOR = '.p3d-keyplan-viewer';
const CANVAS_SELECTOR = '.p3d-keyplan-canvas';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function hashText(text) {
  let hash = 0;
  const value = String(text || '');
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export function parseCoordinateTabText(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split('\t').map((cell) => cell.trim().toLowerCase());
  const nodeIndex = header.findIndex((cell) => cell.includes('nodenumber'));
  const xIndex = header.findIndex((cell) => /^x\b|x\(mm\)/i.test(cell));
  const yIndex = header.findIndex((cell) => /^y\b|y\(mm\)/i.test(cell));
  const zIndex = header.findIndex((cell) => /^z\b|z\(mm\)/i.test(cell));
  const nameIndex = header.findIndex((cell) => cell.includes('nodename'));
  if (nodeIndex < 0 || xIndex < 0 || yIndex < 0) return [];

  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const nodeNumber = Number(cells[nodeIndex]);
    const x = Number(cells[xIndex]);
    const y = Number(cells[yIndex]);
    const z = zIndex >= 0 ? Number(cells[zIndex]) : NaN;
    return {
      nodeNumber,
      x,
      y,
      z: Number.isFinite(z) ? z : null,
      name: nameIndex >= 0 ? String(cells[nameIndex] || '').trim() : '',
    };
  }).filter((row) => Number.isFinite(row.nodeNumber) && Number.isFinite(row.x) && Number.isFinite(row.y));
}

function isMarkerRow(row) {
  const name = String(row?.name || '').trim();
  if (!name) return false;
  if (/^sta\s+/i.test(name)) return false;
  if (/^n\d+$/i.test(name)) return false;
  return true;
}

function buildFitViewBox(rows) {
  const xs = rows.map((row) => row.x);
  const ys = rows.map((row) => row.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const padX = spanX * 0.08;
  const padY = spanY * 0.12;
  return [minX - padX, minY - padY, spanX + padX * 2, spanY + padY * 2].join(' ');
}

function pointElements(rows) {
  return rows.map((row, index) => {
    const marker = isMarkerRow(row);
    const nodeLabelY = row.y - 12;
    const markerLabelY = row.y + 24;
    return `<g class="p3d-keyplan-point ${marker ? 'p3d-keyplan-marker' : ''}" data-node="${esc(row.nodeNumber)}">
<circle cx="${row.x}" cy="${row.y}" r="${marker ? 2600 : 1700}"/>
<text class="p3d-keyplan-node-label" x="${row.x}" y="${nodeLabelY}" text-anchor="middle">${esc(row.nodeNumber)}</text>
${marker ? `<text class="p3d-keyplan-marker-label" x="${row.x}" y="${markerLabelY}" text-anchor="middle">${esc(row.name)}</text>` : ''}
${index === 0 ? `<text class="p3d-keyplan-end-label" x="${row.x}" y="${row.y + 4200}" text-anchor="middle">START</text>` : ''}
${index === rows.length - 1 ? `<text class="p3d-keyplan-end-label" x="${row.x}" y="${row.y + 4200}" text-anchor="middle">END</text>` : ''}
</g>`;
  }).join('\n');
}

export function renderCoordinateKeyPlanViewer(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return '';
  const fitViewBox = buildFitViewBox(rows);
  const polyline = rows.map((row) => `${row.x},${row.y}`).join(' ');
  const markerCount = rows.filter(isMarkerRow).length;
  const nodeCount = rows.length;
  return `<div class="p3d-keyplan-viewer show-nodes show-markers" data-fit-viewbox="${esc(fitViewBox)}">
<div class="p3d-keyplan-toolbar" aria-label="Key plan navigation">
<button type="button" data-p3d-keyplan-action="fit">Fit</button>
<button type="button" data-p3d-keyplan-action="zoom-in">Zoom +</button>
<button type="button" data-p3d-keyplan-action="zoom-out">Zoom -</button>
<button type="button" data-p3d-keyplan-action="pan-left">←</button>
<button type="button" data-p3d-keyplan-action="pan-up">↑</button>
<button type="button" data-p3d-keyplan-action="pan-down">↓</button>
<button type="button" data-p3d-keyplan-action="pan-right">→</button>
<label><input type="checkbox" data-p3d-keyplan-toggle="nodes" checked> Node numbers</label>
<label><input type="checkbox" data-p3d-keyplan-toggle="markers" checked> Markers</label>
<span class="p3d-keyplan-counts">${nodeCount} nodes · ${markerCount} markers</span>
</div>
<svg class="p3d-keyplan-canvas" xmlns="http://www.w3.org/2000/svg" viewBox="${esc(fitViewBox)}" data-fit-viewbox="${esc(fitViewBox)}" width="100%" height="520" role="img" aria-label="Generated pipeline coordinate key plan">
<rect class="p3d-keyplan-bg" x="-100000000" y="-100000000" width="200000000" height="200000000"/>
<polyline class="p3d-keyplan-route" points="${esc(polyline)}"/>
${pointElements(rows)}
</svg>
<div class="p3d-keyplan-hint">Mouse wheel zooms. Drag the plan to pan. Fit restores the generated coordinate geometry.</div>
</div>`;
}

function ensureStyle(doc = globalThis.document) {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.p3d-keyplan-viewer{background:#020617;border:1px solid rgba(148,163,184,.28);border-radius:10px;overflow:hidden;display:grid;grid-template-rows:auto minmax(260px,1fr) auto;gap:0}
.p3d-keyplan-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;background:rgba(15,23,42,.92);border-bottom:1px solid rgba(148,163,184,.22);font-size:12px;color:#cbd5e1}
.p3d-keyplan-toolbar button{background:#1e293b;color:#e2e8f0;border:1px solid rgba(148,163,184,.34);border-radius:7px;padding:5px 9px;cursor:pointer;font-size:12px}
.p3d-keyplan-toolbar button:hover{background:#334155}
.p3d-keyplan-toolbar label{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;color:#dbeafe}
.p3d-keyplan-counts{margin-left:auto;color:#94a3b8;font-family:monospace}
.p3d-keyplan-canvas{display:block;min-height:360px;max-height:62vh;background:#0b1220;cursor:grab;touch-action:none}
.p3d-keyplan-canvas.is-dragging{cursor:grabbing}
.p3d-keyplan-bg{fill:#0b1220}
.p3d-keyplan-route{fill:none;stroke:#38bdf8;stroke-width:1900;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.p3d-keyplan-point circle{fill:#0f172a;stroke:#93c5fd;stroke-width:1.5;vector-effect:non-scaling-stroke}
.p3d-keyplan-marker circle{fill:#7f1d1d;stroke:#fca5a5;stroke-width:2;vector-effect:non-scaling-stroke}
.p3d-keyplan-node-label,.p3d-keyplan-marker-label,.p3d-keyplan-end-label{font-family:monospace;font-size:12px;paint-order:stroke;stroke:#020617;stroke-width:4px;stroke-linejoin:round;vector-effect:non-scaling-stroke;pointer-events:none}
.p3d-keyplan-node-label{fill:#dbeafe}
.p3d-keyplan-marker-label{fill:#fde68a;font-weight:700}
.p3d-keyplan-end-label{fill:#bbf7d0;font-size:11px;font-weight:700}
.p3d-keyplan-viewer:not(.show-nodes) .p3d-keyplan-node-label{display:none}
.p3d-keyplan-viewer:not(.show-markers) .p3d-keyplan-marker-label{display:none}
.p3d-keyplan-hint{padding:6px 10px;color:#94a3b8;background:rgba(15,23,42,.78);border-top:1px solid rgba(148,163,184,.18);font-size:11px}
@media (max-width:900px){.p3d-keyplan-counts{width:100%;margin-left:0}.p3d-keyplan-canvas{height:420px}}
`;
  doc.head?.appendChild(style);
}

function parseViewBox(svg) {
  const values = String(svg?.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
  return values;
}

function setViewBox(svg, values) {
  svg.setAttribute('viewBox', values.map((value) => Number(value).toFixed(3)).join(' '));
}

function zoomViewer(viewer, factor) {
  const svg = viewer.querySelector(CANVAS_SELECTOR);
  const viewBox = parseViewBox(svg);
  if (!svg || !viewBox) return;
  const [x, y, w, h] = viewBox;
  const nextW = w * factor;
  const nextH = h * factor;
  setViewBox(svg, [x + (w - nextW) / 2, y + (h - nextH) / 2, nextW, nextH]);
}

function panViewer(viewer, dxFactor, dyFactor) {
  const svg = viewer.querySelector(CANVAS_SELECTOR);
  const viewBox = parseViewBox(svg);
  if (!svg || !viewBox) return;
  const [x, y, w, h] = viewBox;
  setViewBox(svg, [x + w * dxFactor, y + h * dyFactor, w, h]);
}

function fitViewer(viewer) {
  const svg = viewer.querySelector(CANVAS_SELECTOR);
  const fit = viewer.dataset.fitViewbox || svg?.dataset.fitViewbox;
  if (svg && fit) svg.setAttribute('viewBox', fit);
}

function enhanceKeyPlan(keyPlan) {
  const output = keyPlan.closest('.p3d-output');
  const coordinatePre = output?.querySelector('[data-p3d="coordinate-output"]');
  const coordinateText = coordinatePre?.textContent || '';
  const hash = hashText(coordinateText);
  if (!coordinateText || keyPlan.dataset.p3dCoordinatePreviewHash === hash) return;
  const rows = parseCoordinateTabText(coordinateText);
  if (rows.length < 2) return;
  keyPlan.dataset.p3dCoordinatePreviewHash = hash;
  keyPlan.innerHTML = renderCoordinateKeyPlanViewer(rows);
}

function enhanceAll(doc = globalThis.document) {
  ensureStyle(doc);
  doc?.querySelectorAll?.('[data-p3d="keyplan"]').forEach(enhanceKeyPlan);
}

function wireNavigation(doc = globalThis.document) {
  if (!doc || doc.__pipeline3dKeyplanPreviewNavigation) return;
  doc.__pipeline3dKeyplanPreviewNavigation = true;

  doc.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-p3d-keyplan-action]') : null;
    if (!button) return;
    const viewer = button.closest(VIEWER_SELECTOR);
    if (!viewer) return;
    const action = button.dataset.p3dKeyplanAction;
    if (action === 'fit') fitViewer(viewer);
    else if (action === 'zoom-in') zoomViewer(viewer, 0.78);
    else if (action === 'zoom-out') zoomViewer(viewer, 1.28);
    else if (action === 'pan-left') panViewer(viewer, -0.18, 0);
    else if (action === 'pan-right') panViewer(viewer, 0.18, 0);
    else if (action === 'pan-up') panViewer(viewer, 0, -0.18);
    else if (action === 'pan-down') panViewer(viewer, 0, 0.18);
  });

  doc.addEventListener('change', (event) => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-p3d-keyplan-toggle]') : null;
    if (!toggle) return;
    const viewer = toggle.closest(VIEWER_SELECTOR);
    if (!viewer) return;
    const enabled = Boolean(toggle.checked);
    if (toggle.dataset.p3dKeyplanToggle === 'nodes') viewer.classList.toggle('show-nodes', enabled);
    if (toggle.dataset.p3dKeyplanToggle === 'markers') viewer.classList.toggle('show-markers', enabled);
  });

  doc.addEventListener('wheel', (event) => {
    const svg = event.target instanceof Element ? event.target.closest(CANVAS_SELECTOR) : null;
    if (!svg) return;
    event.preventDefault();
    const viewer = svg.closest(VIEWER_SELECTOR);
    if (viewer) zoomViewer(viewer, event.deltaY < 0 ? 0.88 : 1.14);
  }, { passive: false });

  let drag = null;
  doc.addEventListener('pointerdown', (event) => {
    const svg = event.target instanceof Element ? event.target.closest(CANVAS_SELECTOR) : null;
    if (!svg) return;
    const viewBox = parseViewBox(svg);
    if (!viewBox) return;
    svg.classList.add('is-dragging');
    svg.setPointerCapture?.(event.pointerId);
    drag = { svg, startX: event.clientX, startY: event.clientY, viewBox };
  });
  doc.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = drag.svg.getBoundingClientRect();
    const [, , w, h] = drag.viewBox;
    const dx = ((event.clientX - drag.startX) / Math.max(rect.width, 1)) * w;
    const dy = ((event.clientY - drag.startY) / Math.max(rect.height, 1)) * h;
    setViewBox(drag.svg, [drag.viewBox[0] - dx, drag.viewBox[1] - dy, w, h]);
  });
  doc.addEventListener('pointerup', () => {
    if (drag?.svg) drag.svg.classList.remove('is-dragging');
    drag = null;
  });
}

function installObserver(doc = globalThis.document) {
  if (!doc || doc.__pipeline3dKeyplanPreviewObserver) return;
  ensureStyle(doc);
  wireNavigation(doc);
  const observer = new MutationObserver(() => queueMicrotask(() => enhanceAll(doc)));
  observer.observe(doc.body || doc.documentElement, { childList: true, subtree: true, characterData: true });
  doc.__pipeline3dKeyplanPreviewObserver = observer;
  queueMicrotask(() => enhanceAll(doc));
}

if (typeof document !== 'undefined') installObserver(document);

export const _test = { parseCoordinateTabText, renderCoordinateKeyPlanViewer, isMarkerRow, hashText };
