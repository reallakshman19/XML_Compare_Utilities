import {
  WorkbenchViewportCapability,
  normalizeWorkbenchViewportRange,
  positionWorkbenchPalette,
} from '../../core/workbench-viewport/index.js';
import { createUniversalLoadedPreviewBundle } from './universal-loaded-preview-bundle.js';
import {
  createLinewiseUniversalWorkspaceViewModel,
  createUniversalWorkspaceViewModel,
} from './universal-workspace-view-model.js';
import { renderUniversalXmlCategorizerWorkspaceHtml } from './universal-xml-categorizer-shell.js';
import { createUniversalTreeViewportHost } from './universal-tree-viewport-host.js';
import { createUniversalPivotViewportHost } from './universal-pivot-viewport-host.js';
import {
  createUniversalViewportState,
  persistUniversalViewportUiState,
  selectPivotIdentity,
  selectTreeIdentity,
} from './universal-viewport-state.js';
import { createUniversalViewportShellModel } from './universal-viewport-shell-model.js';
import {
  renderUniversalViewportActions,
  renderUniversalViewportInspector,
  renderUniversalViewportShell,
} from './universal-viewport-shell-view.js';

export const UNIVERSAL_VIEWPORT_LIFECYCLE_SCHEMA = 'universal-viewport-lifecycle/v1';
let mountSequence = 0;

function viewModelFor(context) {
  if (!context?.usableLoaded) return createLinewiseUniversalWorkspaceViewModel(context?.profile);
  const previewBundle = createUniversalLoadedPreviewBundle({
    profile: context.profile,
    sourceInputs: context.sourceInputs,
    targetRows: context.targetRows,
  });
  return createUniversalWorkspaceViewModel({ profile: context.profile, previewBundle });
}

function seedHost(signature, surfaceId, capabilities) {
  return {
    namespace: 'xml-builder', surfaceId, modeId: signature, capabilities,
    statusSegments: () => [surfaceId],
  };
}

function seedHosts(signature) {
  const base = [WorkbenchViewportCapability.FIT, WorkbenchViewportCapability.RANGE,
    WorkbenchViewportCapability.CROSSHAIR,
    WorkbenchViewportCapability.SELECT_SURFACE];
  return {
    tree: seedHost(signature, 'tree', base),
    pivot: seedHost(signature, 'pivot', base),
  };
}

function activeHost(lifecycle) {
  return lifecycle.state.mode === 'pivot' ? lifecycle.hosts.pivot : lifecycle.hosts.tree;
}

function shellModel(lifecycle) {
  return createUniversalViewportShellModel({
    state: lifecycle.state,
    hosts: lifecycle.hosts,
    context: lifecycle.context,
  });
}

function refreshShell(lifecycle) {
  const model = shellModel(lifecycle);
  lifecycle.popup.querySelector('[data-uxc-preview-surfaces]').dataset.mode = lifecycle.state.mode;
  lifecycle.popup.querySelectorAll('[data-uxc-mode]').forEach((button) => {
    const active = button.dataset.uxcMode === lifecycle.state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  lifecycle.popup.querySelector('.uxc-viewport-toolbar').innerHTML = renderUniversalViewportActions(model);
  lifecycle.popup.querySelector('.uxc-viewport-inspector').outerHTML = renderUniversalViewportInspector(model);
  lifecycle.popup.querySelector('[data-uxc-viewport-shell]').dataset.mode = lifecycle.state.mode;
  updateSelection(lifecycle);
}

function updateSelection(lifecycle) {
  const state = lifecycle.state;
  lifecycle.popup.querySelectorAll('[data-uxc-tree-id]').forEach((row) => {
    const id = row.dataset.uxcTreeId;
    const selected = id === state.selectedTreeId;
    const matched = state.selectionIndex.pivotByTree[id]?.includes(state.selectedPivotId);
    row.classList.toggle('is-selected', selected);
    row.classList.toggle('is-related', Boolean(matched));
    row.setAttribute('aria-pressed', String(selected));
  });
  lifecycle.popup.querySelectorAll('[data-uxc-pivot-id]').forEach((row) => {
    const id = row.dataset.uxcPivotId;
    const selected = id === state.selectedPivotId;
    const matched = state.selectionIndex.treeByPivot[id] === state.selectedTreeId && Boolean(state.selectedTreeId);
    row.classList.toggle('is-selected', selected);
    row.classList.toggle('is-related', Boolean(matched));
    row.setAttribute('aria-selected', String(selected));
  });
}

function selectFromTarget(lifecycle, target) {
  const tree = target.closest?.('[data-uxc-tree-id]');
  const pivot = target.closest?.('[data-uxc-pivot-id]');
  if (!tree && !pivot) return false;
  if (tree) selectTreeIdentity(lifecycle.state, tree.dataset.uxcTreeId);
  if (pivot) selectPivotIdentity(lifecycle.state, pivot.dataset.uxcPivotId);
  persistUniversalViewportUiState(lifecycle.state, lifecycle.storage);
  updateSelection(lifecycle);
  if (lifecycle.state.selectedTreeId) lifecycle.hosts.tree.reveal(lifecycle.state.selectedTreeId);
  if (lifecycle.state.selectedPivotId) lifecycle.hosts.pivot.reveal(lifecycle.state.selectedPivotId);
  refreshShell(lifecycle);
  return true;
}

function actionHost(lifecycle) {
  return activeHost(lifecycle);
}

function applyAction(lifecycle, action, trigger) {
  const host = actionHost(lifecycle);
  if (action === 'fit') host.fit();
  else if (action === 'range') positionWorkbenchPalette(lifecycle.rangePalette, trigger, lifecycle.document);
  else if (action === 'zoom-x-in') host.zoomBy(1.2, 1);
  else if (action === 'zoom-x-out') host.zoomBy(1 / 1.2, 1);
  else if (action === 'zoom-y-in') host.zoomBy(1, 1.2);
  else if (action === 'zoom-y-out') host.zoomBy(1, 1 / 1.2);
  else if (action === 'crosshair') host.applyViewTransform({ crosshair: !host.readViewTransform().crosshair });
  refreshStatus(lifecycle);
}

function refreshStatus(lifecycle, pointer = '') {
  const host = activeHost(lifecycle);
  const segments = host.statusSegments();
  lifecycle.popup.querySelector('[data-uxc-viewport-status]').textContent = [...segments, pointer].filter(Boolean).join(' · ');
}

function applyRange(lifecycle, form) {
  const values = Object.fromEntries(new FormData(form));
  const range = normalizeWorkbenchViewportRange(values);
  const error = form.querySelector('[data-uxc-range-error]');
  if (!range) {
    error.textContent = 'Maximum values must be greater than minimum values.';
    return false;
  }
  activeHost(lifecycle).applyRange(range);
  error.textContent = '';
  form.hidden = true;
  refreshStatus(lifecycle);
  return true;
}

function bindSurface(lifecycle, surface, host) {
  let drag = null;
  surface.addEventListener('wheel', (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    host.zoomBy(event.shiftKey ? factor : 1, event.shiftKey ? 1 : factor);
  }, { signal: lifecycle.signal, passive: false });
  surface.addEventListener('pointerdown', (event) => {
    if (event.button !== 1 && !event.altKey) return;
    drag = { x: event.clientX, y: event.clientY };
    surface.setPointerCapture?.(event.pointerId);
  }, { signal: lifecycle.signal });
  surface.addEventListener('pointermove', (event) => {
    const rect = surface.getBoundingClientRect();
    const world = host.screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    refreshStatus(lifecycle, host.formatPointer(world));
    if (!drag) return;
    host.panBy(event.clientX - drag.x, event.clientY - drag.y);
    drag = { x: event.clientX, y: event.clientY };
  }, { signal: lifecycle.signal });
  surface.addEventListener('pointerup', () => { drag = null; }, { signal: lifecycle.signal });
  surface.addEventListener('pointercancel', () => { drag = null; }, { signal: lifecycle.signal });
}

function bindLifecycle(lifecycle) {
  const popup = lifecycle.popup;
  popup.addEventListener('click', (event) => {
    if (event.target.matches?.('.universal-xml-categorizer-backdrop') || event.target.closest?.('[data-universal-categorizer-close]')) return lifecycle.destroy();
    const mode = event.target.closest?.('[data-uxc-mode]')?.dataset.uxcMode;
    if (mode) {
      lifecycle.state.mode = mode;
      persistUniversalViewportUiState(lifecycle.state, lifecycle.storage);
      refreshShell(lifecycle);
      return;
    }
    const actionButton = event.target.closest?.('[data-uxc-view-action]');
    if (actionButton) applyAction(lifecycle, actionButton.dataset.uxcViewAction, actionButton);
    else selectFromTarget(lifecycle, event.target);
  }, { signal: lifecycle.signal });
  popup.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') lifecycle.destroy();
    if ((event.key === 'Enter' || event.key === ' ') && selectFromTarget(lifecycle, event.target)) event.preventDefault();
  }, { signal: lifecycle.signal });
  lifecycle.rangePalette.addEventListener('submit', (event) => {
    event.preventDefault();
    applyRange(lifecycle, event.currentTarget);
  }, { signal: lifecycle.signal });
  lifecycle.rangePalette.querySelector('[data-uxc-range-cancel]').addEventListener('click', () => {
    lifecycle.rangePalette.hidden = true;
  }, { signal: lifecycle.signal });
  bindSurface(lifecycle, lifecycle.treeSurface, lifecycle.hosts.tree);
  bindSurface(lifecycle, lifecycle.pivotSurface, lifecycle.hosts.pivot);
}

export function mountUniversalViewportLifecycle(options = {}) {
  const doc = options.document || globalThis.document;
  if (!doc?.body) throw new TypeError('XML Builder viewport requires a document body.');
  const context = options.context;
  const viewModel = viewModelFor(context);
  const state = createUniversalViewportState({
    signature: context.signature,
    tree: viewModel.samplePreview.tree,
    pivot: viewModel.samplePreview.pivot,
    storage: options.storage,
  });
  const seed = seedHosts(context.signature);
  const initialModel = createUniversalViewportShellModel({ state, hosts: seed, context });
  const viewportHtml = renderUniversalViewportShell(initialModel, viewModel, state);
  doc.body.insertAdjacentHTML('beforeend', renderUniversalXmlCategorizerWorkspaceHtml(viewModel, {
    contextStatus: context.status, viewportHtml,
  }));
  const popup = doc.querySelector('[data-xml-compare-universal-categorizer-popup]:last-of-type');
  const controller = new AbortController();
  const treeSurface = popup.querySelector('[data-uxc-surface="tree"]');
  const pivotSurface = popup.querySelector('[data-uxc-surface="pivot"]');
  const hosts = {
    tree: createUniversalTreeViewportHost({ surface: treeSurface, tree: viewModel.samplePreview.tree, signature: context.signature, storage: options.storage }),
    pivot: createUniversalPivotViewportHost({ surface: pivotSurface, pivot: viewModel.samplePreview.pivot, signature: context.signature, storage: options.storage }),
  };
  let destroyed = false;
  const lifecycle = {
    schema: UNIVERSAL_VIEWPORT_LIFECYCLE_SCHEMA,
    mountId: ++mountSequence,
    document: doc,
    popup, context, viewModel, state, hosts, treeSurface, pivotSurface,
    rangePalette: popup.querySelector('[data-uxc-range-palette]'),
    storage: options.storage || globalThis.localStorage,
    signal: controller.signal,
    destroy() {
      if (destroyed) return false;
      destroyed = true;
      controller.abort();
      hosts.tree.dispose();
      hosts.pivot.dispose();
      popup.remove();
      return true;
    },
  };
  popup.dataset.uxcViewportMountId = String(lifecycle.mountId);
  bindLifecycle(lifecycle);
  refreshShell(lifecycle);
  return Object.freeze(lifecycle);
}

export const _test = Object.freeze({ viewModelFor, seedHosts, applyRange });
