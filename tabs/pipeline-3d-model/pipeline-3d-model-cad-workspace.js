import { GraphTool } from './pipeline-3d-model-interactive-graph.js';
import { Table2XCanvas } from './pipeline-3d-model-table2x-canvas.js';
import { Table3XCanvas } from './pipeline-3d-model-table3x-canvas.js';
import { PipelineCadController } from './pipeline-3d-model-cad-controller.js';

export const PIPELINE_CAD_CANVAS_STORAGE_KEY = 'pipeline3dCadCanvas';
const STYLE_ID = 'pipeline-3d-cad-workspace-style';
const WORKSPACES = new WeakMap();
const PATCHED_DIALOGS = new WeakSet();

function truthyFlag(value) {
  return ['1', 'true', 'enabled', 'on', 'yes'].includes(String(value ?? '').toLowerCase());
}

export function isPipelineCadCanvasEnabled(options = {}) {
  const location = options.location ?? globalThis.location;
  const storage = options.storage ?? globalThis.localStorage;
  try {
    const params = new URLSearchParams(location?.search || '');
    if (truthyFlag(params.get('pipelineCadCanvas'))) return true;
  } catch {
    // Invalid or unavailable location is treated as no query flag.
  }
  try {
    return truthyFlag(storage?.getItem?.(PIPELINE_CAD_CANVAS_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function setPipelineCadCanvasEnabled(enabled, storage = globalThis.localStorage) {
  try {
    if (enabled) storage?.setItem?.(PIPELINE_CAD_CANVAS_STORAGE_KEY, '1');
    else storage?.removeItem?.(PIPELINE_CAD_CANVAS_STORAGE_KEY);
  } catch {
    // Feature preference is best-effort only.
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

export function buildPipelineCadStageHtml(graphName) {
  const isTable3 = graphName === 'table3x';
  const tools = [
    ['select', 'Select'],
    ['add-node', isTable3 ? 'Add Z' : 'Add V'],
    ...(isTable3 ? [['add-marker', 'Add Marker']] : []),
    ['delete', 'Delete'],
    ['pan', 'Pan'],
  ];
  return `<div class="p3d-cad-stage" data-p3d-cad-stage="${escapeHtml(graphName)}">
  <svg data-p3d-cad-sentinel="1" aria-hidden="true" width="0" height="0" style="display:none"></svg>
  <div class="p3d-cad-toolbar" role="toolbar" aria-label="${isTable3 ? 'Table 3X' : 'Table 2X'} CAD tools">
    ${tools.map(([tool, label], index) => `<button type="button" data-p3d-cad-tool="${tool}" aria-pressed="${index === 0 ? 'true' : 'false'}">${label}</button>`).join('')}
    <span class="p3d-cad-toolbar-separator" aria-hidden="true"></span>
    <button type="button" data-p3d-cad-action="fit">Fit</button>
    <button type="button" data-p3d-cad-action="reload">Reload Graph</button>
    <button type="button" data-p3d-cad-action="undo" disabled>Undo</button>
    <button type="button" data-p3d-cad-action="redo" disabled>Redo</button>
  </div>
  <canvas data-p3d-cad-canvas="${escapeHtml(graphName)}" tabindex="0" aria-label="${isTable3 ? 'Interactive Table 3X depth and marker graph' : 'Interactive Table 2X elevation graph'}"></canvas>
  <input class="p3d-cad-inline-editor" data-p3d-cad-inline-editor="${escapeHtml(graphName)}" hidden aria-label="Edit selected graph value">
  <div class="p3d-cad-status" data-p3d-cad-status="${escapeHtml(graphName)}">CAD Canvas shadow mode</div>
</div>`;
}

function ensureStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.p3d-cad-stage{position:relative;width:100%;height:100%;min-height:340px;background:#0b1220;overflow:hidden}
.p3d-cad-stage canvas{display:block;width:100%;height:100%;min-height:340px;outline:none;cursor:crosshair;touch-action:none}
.p3d-cad-stage canvas:focus{box-shadow:inset 0 0 0 2px rgba(56,189,248,.72)}
.p3d-cad-toolbar{position:absolute;z-index:3;left:12px;top:12px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;max-width:calc(100% - 24px);padding:6px;border:1px solid rgba(148,163,184,.35);border-radius:8px;background:rgba(15,23,42,.92);box-shadow:0 8px 24px rgba(0,0,0,.28)}
.p3d-cad-toolbar button{border:1px solid rgba(148,163,184,.35);border-radius:6px;background:#1e293b;color:#e2e8f0;padding:5px 9px;font-size:11px;cursor:pointer}
.p3d-cad-toolbar button[aria-pressed="true"]{background:#38bdf8;color:#082f49;border-color:#7dd3fc;font-weight:700}
.p3d-cad-toolbar button:disabled{opacity:.42;cursor:not-allowed}
.p3d-cad-toolbar-separator{width:1px;height:22px;background:rgba(148,163,184,.35);margin:0 2px}
.p3d-cad-inline-editor{position:absolute;z-index:5;width:120px;box-sizing:border-box;border:1px solid #38bdf8;border-radius:5px;background:#020617;color:#f8fafc;padding:5px 7px;font:12px monospace;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.p3d-cad-status{position:absolute;z-index:2;right:10px;bottom:8px;max-width:70%;padding:3px 7px;border-radius:4px;background:rgba(2,6,23,.72);color:#94a3b8;font:10px monospace;pointer-events:none}
.p3d-cad-status[data-state="error"]{color:#fecaca;background:rgba(69,10,10,.82)}
.p3d-cad-dirty-row{background:rgba(245,158,11,.24)!important;box-shadow:inset 3px 0 0 #f59e0b}
`;
  doc.head.appendChild(style);
}

function toolFromName(name) {
  return Object.values(GraphTool).includes(name) ? name : GraphTool.SELECT;
}

function sizeGraph(graph, holder) {
  const rect = holder?.getBoundingClientRect?.() || {};
  const width = Math.max(640, Math.round(rect.width || holder?.clientWidth || 1000));
  const height = Math.max(340, Math.round(rect.height || holder?.clientHeight || 500));
  graph.setSize(width, height);
}

function currentEditValue(controller, hit) {
  const row = controller.model?.findRow?.(hit?.node?.id);
  if (!row) return '';
  if (hit.type === 'marker') return row.markerText || '';
  if (hit.type === 'depth-node') return row.zText || '';
  return Number.isFinite(row.elevationValue) ? row.elevationValue.toFixed(2) : row.elevationText || '';
}

function bindInlineEditor({ stage, canvas, graph, graphName, controller, cleanup }) {
  const editor = stage.querySelector('[data-p3d-cad-inline-editor]');
  if (!editor) return;
  let active = null;

  const close = () => {
    active = null;
    editor.hidden = true;
    delete editor.dataset.entityId;
    delete editor.dataset.entityType;
  };

  const onDoubleClick = (event) => {
    const screen = graph.eventToScreen(event);
    const hit = graph.hitTest(screen);
    if (!hit) return;
    active = { graph: graphName, entityId: hit.node.id, entityType: hit.type };
    editor.value = currentEditValue(controller, hit);
    editor.style.left = `${Math.max(6, screen.x - 60)}px`;
    editor.style.top = `${Math.max(48, screen.y - 16)}px`;
    editor.hidden = false;
    editor.focus();
    editor.select();
    event.preventDefault();
  };

  const commit = () => {
    if (!active) return;
    try {
      controller.renameEntity({ ...active, value: editor.value });
      close();
    } catch (error) {
      const status = stage.querySelector('[data-p3d-cad-status]');
      if (status) {
        status.dataset.state = 'error';
        status.textContent = error instanceof Error ? error.message : String(error);
      }
      editor.focus();
      editor.select();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
      canvas.focus();
    }
  };

  const onBlur = () => {
    if (active) commit();
  };

  canvas.addEventListener('dblclick', onDoubleClick);
  editor.addEventListener('keydown', onKeyDown);
  editor.addEventListener('blur', onBlur);
  cleanup.push(() => {
    canvas.removeEventListener('dblclick', onDoubleClick);
    editor.removeEventListener('keydown', onKeyDown);
    editor.removeEventListener('blur', onBlur);
  });
}

function bindToolbar({ stage, graph, controller, resize, cleanup }) {
  const toolbar = stage.querySelector('.p3d-cad-toolbar');
  if (!toolbar) return;
  const updateHistoryButtons = (detail = {}) => {
    const undo = toolbar.querySelector('[data-p3d-cad-action="undo"]');
    const redo = toolbar.querySelector('[data-p3d-cad-action="redo"]');
    if (undo) undo.disabled = detail.canUndo ?? !controller.history.canUndo;
    if (redo) redo.disabled = detail.canRedo ?? !controller.history.canRedo;
  };
  const onClick = (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;
    const tool = button.dataset.p3dCadTool;
    const action = button.dataset.p3dCadAction;
    if (tool) {
      graph.setTool(toolFromName(tool));
      toolbar.querySelectorAll('[data-p3d-cad-tool]').forEach((candidate) => candidate.setAttribute('aria-pressed', candidate === button ? 'true' : 'false'));
    } else if (action === 'fit') {
      graph.fitToBounds();
    } else if (action === 'reload') {
      controller.reloadGraphs();
    } else if (action === 'undo') {
      controller.undo();
    } else if (action === 'redo') {
      controller.redo();
    }
    resize();
  };
  const onHistory = (event) => updateHistoryButtons(event.detail);
  toolbar.addEventListener('click', onClick);
  controller.addEventListener('historyChanged', onHistory);
  updateHistoryButtons();
  cleanup.push(() => {
    toolbar.removeEventListener('click', onClick);
    controller.removeEventListener('historyChanged', onHistory);
  });
}

function bindStatus(stage, controller, cleanup) {
  const status = stage.querySelector('[data-p3d-cad-status]');
  if (!status) return;
  const set = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const onError = (event) => set(event.detail?.error?.message || 'Raw profile data is incomplete.', 'error');
  const onCommit = (event) => set(`${event.detail.reason} · revision ${event.detail.revision}`);
  const onReload = (event) => set(`Graph reloaded · revision ${event.detail.revision}`);
  const onModel = (event) => set(`Raw data loaded · revision ${event.detail.revision}`);
  controller.addEventListener('validationError', onError);
  controller.addEventListener('commandCommitted', onCommit);
  controller.addEventListener('graphsReloaded', onReload);
  controller.addEventListener('modelChanged', onModel);
  cleanup.push(() => {
    controller.removeEventListener('validationError', onError);
    controller.removeEventListener('commandCommitted', onCommit);
    controller.removeEventListener('graphsReloaded', onReload);
    controller.removeEventListener('modelChanged', onModel);
  });
  if (controller.lastError) onError({ detail: { error: controller.lastError } });
}

function installEditableGridGuard(dialog, cleanup) {
  let forwarding = false;
  const onInputCapture = (event) => {
    if (forwarding) return;
    const target = event.target;
    const cell = target?.closest?.('[data-p3d-split-cell]');
    if (!cell) return;
    const panel = cell.closest('[data-p3d-split-panel]');
    const name = panel?.dataset?.p3dSplitPanel;
    const holder = panel?.querySelector?.(`[data-p3d-split-preview="${name}"]`);
    const raw = panel?.querySelector?.(`[data-p3d-split="${name}"]`);
    if (!name || !holder || !raw) return;
    const headerCells = Array.from(holder.querySelectorAll('thead th')).slice(1, -1).map((th) => String(th.textContent || '').trim());
    const bodyRows = Array.from(holder.querySelectorAll('[data-p3d-split-row]')).map((row) =>
      headerCells.map((_, index) => row.querySelector(`[data-p3d-split-cell$=":${index}"]`)?.value?.trim() || ''),
    );
    raw.value = [headerCells.join('\t'), ...bodyRows.map((row) => row.join('\t'))].join('\n');
    event.stopImmediatePropagation();
    forwarding = true;
    try {
      raw.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      forwarding = false;
    }
  };
  dialog.addEventListener('input', onInputCapture, true);
  cleanup.push(() => dialog.removeEventListener('input', onInputCapture, true));
}

export function mountPipelineCadWorkspace(dialog, options = {}) {
  if (!dialog || (!options.force && !isPipelineCadCanvasEnabled(options))) return null;
  const existing = WORKSPACES.get(dialog);
  if (existing) return existing;
  const table2Holder = dialog.querySelector('[data-p3d-split="table2x-preview"]');
  const table3Holder = dialog.querySelector('[data-p3d-split="table3x-preview"]');
  if (!table2Holder || !table3Holder) return null;

  ensureStyle(dialog.ownerDocument || globalThis.document);
  table2Holder.innerHTML = buildPipelineCadStageHtml('table2x');
  table3Holder.innerHTML = buildPipelineCadStageHtml('table3x');
  const table2Stage = table2Holder.querySelector('[data-p3d-cad-stage="table2x"]');
  const table3Stage = table3Holder.querySelector('[data-p3d-cad-stage="table3x"]');
  const table2CanvasElement = table2Stage.querySelector('[data-p3d-cad-canvas="table2x"]');
  const table3CanvasElement = table3Stage.querySelector('[data-p3d-cad-canvas="table3x"]');
  const table2x = new Table2XCanvas(table2CanvasElement);
  const table3x = new Table3XCanvas(table3CanvasElement);
  const controller = new PipelineCadController(dialog, options);
  controller.attachGraphs({ table2x, table3x });
  const cleanup = [];

  const resize = () => {
    sizeGraph(table2x, table2Holder);
    sizeGraph(table3x, table3Holder);
  };
  bindToolbar({ stage: table2Stage, graph: table2x, controller, resize, cleanup });
  bindToolbar({ stage: table3Stage, graph: table3x, controller, resize, cleanup });
  bindInlineEditor({ stage: table2Stage, canvas: table2CanvasElement, graph: table2x, graphName: 'table2x', controller, cleanup });
  bindInlineEditor({ stage: table3Stage, canvas: table3CanvasElement, graph: table3x, graphName: 'table3x', controller, cleanup });
  bindStatus(table2Stage, controller, cleanup);
  bindStatus(table3Stage, controller, cleanup);
  installEditableGridGuard(dialog, cleanup);

  let resizeObserver = null;
  const ResizeObserverCtor = globalThis.ResizeObserver;
  if (typeof ResizeObserverCtor === 'function') {
    resizeObserver = new ResizeObserverCtor(resize);
    resizeObserver.observe(table2Holder);
    resizeObserver.observe(table3Holder);
  } else {
    globalThis.addEventListener?.('resize', resize);
    cleanup.push(() => globalThis.removeEventListener?.('resize', resize));
  }

  const interceptPreviewActions = (event) => {
    if (!isPipelineCadCanvasEnabled(options)) return;
    const preview = event.target?.closest?.('[data-p3d-split="btn-preview-x"]');
    const reload = event.target?.closest?.('[data-p3d-split="x-reload"]');
    if (!preview && !reload) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (preview) {
      const modal = dialog.querySelector('[data-p3d-split="x-modal"]');
      if (modal) modal.style.display = 'flex';
      queueMicrotask(resize);
    } else {
      controller.reloadGraphs();
      resize();
    }
  };
  dialog.addEventListener('click', interceptPreviewActions, true);
  cleanup.push(() => dialog.removeEventListener('click', interceptPreviewActions, true));

  const onDialogClick = (event) => {
    if (event.target?.closest?.('.p3d-x-tab')) queueMicrotask(resize);
    const refreshTrigger = event.target?.closest?.('[data-p3d="new-multisheet"], [data-p3d="run"], [data-p3d-split-add], [data-p3d-split-delete]');
    if (refreshTrigger) {
      queueMicrotask(() => {
        controller.refreshFromRaw({ clearHistory: true, reloadGraphs: true, reason: 'dialog-data-action' });
        resize();
      });
    }
  };
  dialog.addEventListener('click', onDialogClick);
  cleanup.push(() => dialog.removeEventListener('click', onDialogClick));

  const workspace = {
    controller,
    graphs: { table2x, table3x },
    resize,
    reloadGraphs: () => controller.reloadGraphs(),
    destroy() {
      resizeObserver?.disconnect?.();
      cleanup.splice(0).forEach((dispose) => dispose());
      controller.destroy();
      table2x.destroy();
      table3x.destroy();
      WORKSPACES.delete(dialog);
    },
  };
  WORKSPACES.set(dialog, workspace);
  resize();
  return workspace;
}

function patchDialog(dialog) {
  if (!dialog || PATCHED_DIALOGS.has(dialog)) return;
  const table2Holder = dialog.querySelector('[data-p3d-split="table2x-preview"]');
  const table3Holder = dialog.querySelector('[data-p3d-split="table3x-preview"]');
  if (!table2Holder || !table3Holder) return;
  PATCHED_DIALOGS.add(dialog);
  if (isPipelineCadCanvasEnabled()) mountPipelineCadWorkspace(dialog);
}

export function installPipelineCadWorkspaceObserver(doc = globalThis.document) {
  if (!doc?.body || doc.body.dataset.p3dCadWorkspaceObserver === '1') return null;
  doc.body.dataset.p3dCadWorkspaceObserver = '1';
  ensureStyle(doc);
  const patchAll = () => doc.querySelectorAll('.pipeline-3d-model-dialog').forEach(patchDialog);
  patchAll();
  const MutationObserverCtor = globalThis.MutationObserver;
  if (typeof MutationObserverCtor !== 'function') return null;
  const observer = new MutationObserverCtor(patchAll);
  observer.observe(doc.body, { childList: true, subtree: true });
  return observer;
}

if (globalThis.document?.body) installPipelineCadWorkspaceObserver(globalThis.document);
else globalThis.document?.addEventListener?.('DOMContentLoaded', () => installPipelineCadWorkspaceObserver(globalThis.document), { once: true });
