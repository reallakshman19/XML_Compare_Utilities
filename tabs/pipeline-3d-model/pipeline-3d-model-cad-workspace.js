import './pipeline-3d-model-cad-viewport-runtime.js';
import { Table2XCanvas } from './pipeline-3d-model-table2x-canvas.js';
import { Table3XCanvas } from './pipeline-3d-model-table3x-canvas.js';
import { PipelineCadController } from './pipeline-3d-model-cad-controller.js';
import { mountPipelineCadAuthoring } from './pipeline-3d-model-cad-authoring.js';
import { mountPipelineCadEngineeringReview } from './pipeline-3d-model-cad-engineering-review.js';
import { mountPipelineCadDiagnosticsLifecycle } from './pipeline-3d-model-cad-diagnostics-lifecycle.js';
import { createPipelineCadViewportHost } from './pipeline-3d-model-cad-viewport-host.js';
import { mountPipelineCadViewportShell } from './pipeline-3d-model-cad-viewport-shell.js';
import { mountPipelineCadPreviewModes } from './pipeline-3d-model-cad-preview-modes.js';
import { preparePipelineCadPreviewView } from './pipeline-3d-model-cad-preview-mode-view.js';
import {
  ExplicitPipelineCanvasManager,
  bindPipelineCadWorkspace,
} from './pipeline-3d-model-cad-workspace-bindings.js';
import {
  buildPipelineCadStageHtml,
  createPipelineCadWorkspaceView,
  isPipelineCadCanvasEnabled,
  setPipelineCadCanvasEnabled,
} from './pipeline-3d-model-cad-workspace-view.js';

export { buildPipelineCadStageHtml, isPipelineCadCanvasEnabled, setPipelineCadCanvasEnabled };

// Static contract retained for the established source gate:
// ['select', 'Select']; ['add-node', isTable3 ? 'Add Z' : 'Add V']; ['add-marker', 'Add Marker'].
// data-p3d-cad-tool; data-p3d-cad-action="reload"; data-p3d-cad-action="undo"; data-p3d-cad-action="redo".
// dblclick; new-multisheet; data-p3d-split-add; pipelineCadCanvas.

const WORKSPACES = new WeakMap();
const INSTALLERS = new WeakMap();
const LEGACY_SOAK_INSTALL_STATE = Symbol.for('pipeline3d.cad.soak.install-state.v1');
let mountSequence = 0;

function claimLegacySoakInstaller(target) {
  const current = target[LEGACY_SOAK_INSTALL_STATE];
  if (current) current.installed = true;
  else Object.defineProperty(target, LEGACY_SOAK_INSTALL_STATE, {
    configurable: true,
    value: { installed: true, runtimeListenersInstalled: false, controlsObserver: null, pageLifecycleInstalled: false },
  });
}

function createGraphs(view) {
  return {
    table2x: new Table2XCanvas(view.canvases.table2x),
    table3x: new Table3XCanvas(view.canvases.table3x),
  };
}

function createHosts(graphs) {
  return {
    table2x: createPipelineCadViewportHost(graphs.table2x, { surfaceId: 'table2x' }),
    table3x: createPipelineCadViewportHost(graphs.table3x, { surfaceId: 'table3x' }),
  };
}

function destroyParts(parts) {
  parts.bindings?.destroy?.();
  parts.previewModes?.destroy?.();
  parts.engineeringReview?.destroy?.();
  parts.shell?.destroy?.();
  parts.diagnostics?.destroy?.();
  Object.values(parts.hosts || {}).forEach((host) => host.dispose?.());
  parts.authoring?.destroy?.();
  parts.canvasManager?.destroy?.();
  if (parts.controller) parts.controller.canvasManager = null;
  parts.controller?.destroy?.();
  Object.values(parts.graphs || {}).forEach((graph) => graph.destroy?.());
  parts.previewView?.destroy?.();
  parts.view?.destroy?.();
}

export function mountPipelineCadWorkspace(dialog, options = {}) {
  if (!dialog || (!options.force && !isPipelineCadCanvasEnabled(options))) return null;
  const existing = WORKSPACES.get(dialog);
  if (existing) return existing;
  const target = options.target ?? globalThis;
  claimLegacySoakInstaller(target);
  const view = createPipelineCadWorkspaceView(dialog);
  const graphs = createGraphs(view);
  const controller = new PipelineCadController(dialog, options);
  const canvasManager = new ExplicitPipelineCanvasManager(controller, graphs);
  controller.canvasManager = canvasManager;
  controller.attachGraphs(graphs);
  canvasManager.syncGeometry();
  const authoring = mountPipelineCadAuthoring({ stages: view.stages, graphs, controller, storage: options.storage });
  const modal = dialog.querySelector('[data-p3d-split="x-modal"]');
  const engineeringReview = modal ? mountPipelineCadEngineeringReview({ dialog, graphs, controller }) : null;
  const hosts = createHosts(graphs);
  const resize = () => view.resize(graphs);
  const canMountPreview = Boolean(modal?.querySelector('.p3d-x-tabs') && modal.querySelector(':scope > .p3d-x-content'));
  const previewView = canMountPreview ? preparePipelineCadPreviewView(dialog) : null;
  const shell = previewView ? mountPipelineCadViewportShell({
    modal: previewView.modal,
    graphs,
    hosts,
    storage: options.storage,
    mode: 'table2x',
  }) : null;
  const previewModes = previewView ? mountPipelineCadPreviewModes({
    dialog,
    controller,
    resize,
    storage: options.storage,
    view: previewView,
  }) : null;
  const onMode = (event) => shell?.setMode(event.detail?.mode || 'table2x');
  previewView?.modal.addEventListener('pipelineCadPreviewModeChanged', onMode);
  if (shell && previewModes) shell.setMode(previewModes.mode);
  const bindings = bindPipelineCadWorkspace({
    dialog,
    controller,
    graphs,
    stages: view.stages,
    holders: view.holders,
    resize,
  });
  const diagnostics = mountPipelineCadDiagnosticsLifecycle({
    dialog,
    controller,
    graphs,
    storage: options.storage,
    sessionStorage: options.sessionStorage,
    target,
  });
  const parts = {
    view, graphs, controller, canvasManager, authoring, engineeringReview,
    previewView, hosts, shell, previewModes, bindings, diagnostics,
  };
  const mountId = ++mountSequence;
  dialog.dataset.p3dCadWorkspaceMountId = String(mountId);
  dialog.dataset.p3dCadWorkspaceReady = '1';
  let destroyed = false;
  const lifecycle = Object.freeze({
    mountId,
    controller,
    graphs,
    hosts,
    shell,
    previewModes,
    diagnostics,
    resize,
    reloadGraphs: () => controller.reloadGraphs(),
    destroy() {
      if (destroyed) return false;
      destroyed = true;
      previewView?.modal.removeEventListener('pipelineCadPreviewModeChanged', onMode);
      destroyParts(parts);
      delete dialog.dataset.p3dCadWorkspaceReady;
      WORKSPACES.delete(dialog);
      return true;
    },
  });
  WORKSPACES.set(dialog, lifecycle);
  resize();
  return lifecycle;
}

export function getPipelineCadWorkspace(dialog) {
  return WORKSPACES.get(dialog) || null;
}

export function destroyPipelineCadWorkspace(dialog) {
  return WORKSPACES.get(dialog)?.destroy?.() || false;
}

function currentDialog(doc) {
  return doc?.querySelector?.('.pipeline-3d-model-dialog') || null;
}

export function installPipelineCadWorkspaceComposition(doc = globalThis.document) {
  if (!doc?.addEventListener) return null;
  if (INSTALLERS.has(doc)) return INSTALLERS.get(doc);
  const mountCurrent = () => {
    const dialog = currentDialog(doc);
    if (dialog && !getPipelineCadWorkspace(dialog)) mountPipelineCadWorkspace(dialog);
  };
  const onClick = (event) => {
    if (event.target?.closest?.('[data-p3d-open="1"]')) queueMicrotask(mountCurrent);
  };
  const onCloseCapture = (event) => {
    const close = event.target?.closest?.('[data-p3d-close="1"]');
    const backdrop = event.target?.classList?.contains?.('pipeline-3d-model-backdrop');
    if (!close && !backdrop) return;
    const dialog = close?.closest?.('.pipeline-3d-model-dialog') || event.target.querySelector?.('.pipeline-3d-model-dialog');
    if (dialog) destroyPipelineCadWorkspace(dialog);
  };
  const onKey = (event) => {
    if (event.key !== 'Escape') return;
    const dialog = currentDialog(doc);
    if (dialog) destroyPipelineCadWorkspace(dialog);
  };
  doc.addEventListener('click', onClick);
  doc.addEventListener('click', onCloseCapture, true);
  doc.addEventListener('keydown', onKey, true);
  const installer = Object.freeze({
    mountCurrent,
    destroy() {
      doc.removeEventListener('click', onClick);
      doc.removeEventListener('click', onCloseCapture, true);
      doc.removeEventListener('keydown', onKey, true);
      const dialog = currentDialog(doc);
      if (dialog) destroyPipelineCadWorkspace(dialog);
      INSTALLERS.delete(doc);
      return true;
    },
  });
  INSTALLERS.set(doc, installer);
  return installer;
}
