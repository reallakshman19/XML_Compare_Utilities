import { GraphTool } from './pipeline-3d-model-interactive-graph.js';
import { Table2XCanvas } from './pipeline-3d-model-table2x-canvas.js';
import { Table3XCanvas } from './pipeline-3d-model-table3x-canvas.js';
import { PipelineCadController } from './pipeline-3d-model-cad-controller.js';
import { deleteProfileRowCommand } from './pipeline-3d-model-cad-commands.js';
import {
  describePipelineCadSnapSettings,
  loadPipelineCadSnapSettings,
  normalizePipelineCadSnapSettings,
  savePipelineCadSnapSettings,
  snapTable2Elevation,
  snapTable2Station,
  snapTable3Cumulative,
  snapTable3Depth,
} from './pipeline-3d-model-cad-snap.js';
import {
  PipelineCadShortcut,
  pipelineCadShortcutLabel,
  resolvePipelineCadShortcut,
} from './pipeline-3d-model-cad-shortcuts.js';

const AUTHORING_PATCH = Symbol.for('pipeline3d.cad.authoring.patch.v1');
const STYLE_ID = 'pipeline-3d-cad-authoring-style';
const STAGE_SELECTOR = '[data-p3d-cad-stage]';

function ensureSnapState(graph) {
  if (!graph.snapSettings) graph.snapSettings = normalizePipelineCadSnapSettings();
  return graph.snapSettings;
}

function setSnapSettings(settings) {
  this.snapSettings = normalizePipelineCadSnapSettings({ ...ensureSnapState(this), ...(settings || {}) });
  this.dispatchGraphEvent?.('snapSettingsChanged', { graph: this instanceof Table3XCanvas ? 'table3x' : 'table2x', settings: this.snapSettings });
  this.render?.();
  return this.snapSettings;
}

function patchTable2Canvas() {
  const prototype = Table2XCanvas.prototype;
  if (prototype[AUTHORING_PATCH]) return;
  Object.defineProperty(prototype, AUTHORING_PATCH, { value: true });
  prototype.setSnapSettings = setSnapSettings;
  prototype.getSnapSettings = function getSnapSettings() { return ensureSnapState(this); };

  const originalSetModel = prototype.setModel;
  prototype.setModel = function patchedSetModel(...args) {
    ensureSnapState(this);
    if (this.canvas) this.canvas.__pipelineCadGraph = this;
    return originalSetModel.apply(this, args);
  };

  const originalMove = prototype.onPrimaryPointerMove;
  prototype.onPrimaryPointerMove = function patchedMove(event, screen, world) {
    const snappedWorld = this.draggingId
      ? { ...world, y: snapTable2Elevation(world.y, ensureSnapState(this)) }
      : world;
    return originalMove.call(this, event, screen, snappedWorld);
  };

  const originalUp = prototype.onPrimaryPointerUp;
  prototype.onPrimaryPointerUp = function patchedUp(event, screen, world) {
    const snappedWorld = this.draggingId
      ? { ...world, y: snapTable2Elevation(world.y, ensureSnapState(this)) }
      : world;
    return originalUp.call(this, event, screen, snappedWorld);
  };

  const originalDispatch = prototype.dispatchGraphEvent;
  prototype.dispatchGraphEvent = function patchedDispatch(type, detail = {}) {
    if (type === 'nodeAdded' && detail.graph === 'table2x') {
      const start = this.renderSnapshot?.find?.((row) => row.id === detail.insertAfterId);
      const end = this.renderSnapshot?.find?.((row) => row.id === detail.insertBeforeId);
      const stationValue = snapTable2Station(detail.stationValue, this.model, ensureSnapState(this), {
        excludeIds: [detail.insertAfterId, detail.insertBeforeId],
        min: Math.min(start?.x ?? detail.stationValue, end?.x ?? detail.stationValue),
        max: Math.max(start?.x ?? detail.stationValue, end?.x ?? detail.stationValue),
      });
      let elevationValue = detail.elevationValue;
      if (start && end && Math.abs(end.x - start.x) > 1e-9) {
        const ratio = (stationValue - start.x) / (end.x - start.x);
        elevationValue = start.y + ratio * (end.y - start.y);
      }
      detail = {
        ...detail,
        stationValue,
        elevationValue: snapTable2Elevation(elevationValue, ensureSnapState(this)),
        snapApplied: true,
      };
    }
    return originalDispatch.call(this, type, detail);
  };
}

function patchTable3Canvas() {
  const prototype = Table3XCanvas.prototype;
  if (prototype[AUTHORING_PATCH]) return;
  Object.defineProperty(prototype, AUTHORING_PATCH, { value: true });
  prototype.setSnapSettings = setSnapSettings;
  prototype.getSnapSettings = function getSnapSettings() { return ensureSnapState(this); };

  const originalSetModel = prototype.setModel;
  prototype.setModel = function patchedSetModel(...args) {
    ensureSnapState(this);
    if (this.canvas) this.canvas.__pipelineCadGraph = this;
    return originalSetModel.apply(this, args);
  };

  const snapWorld = function snapWorldForInteraction(world) {
    const settings = ensureSnapState(this);
    const next = { ...world };
    const markerInteraction = this.dragging?.type === 'marker' || this.tool === GraphTool.ADD_MARKER;
    const depthInteraction = this.dragging?.type === 'depth-node' || this.tool === GraphTool.ADD_NODE;
    if (markerInteraction || depthInteraction) next.x = snapTable3Cumulative(world.x, this.model, settings);
    if (depthInteraction) next.y = snapTable3Depth(world.y, settings);
    return next;
  };

  const originalDown = prototype.onPrimaryPointerDown;
  prototype.onPrimaryPointerDown = function patchedDown(event, screen, world) {
    return originalDown.call(this, event, screen, snapWorld.call(this, world));
  };
  const originalMove = prototype.onPrimaryPointerMove;
  prototype.onPrimaryPointerMove = function patchedMove(event, screen, world) {
    return originalMove.call(this, event, screen, snapWorld.call(this, world));
  };
  const originalUp = prototype.onPrimaryPointerUp;
  prototype.onPrimaryPointerUp = function patchedUp(event, screen, world) {
    return originalUp.call(this, event, screen, snapWorld.call(this, world));
  };
}

function clearGraphSelection(graph) {
  if (graph instanceof Table2XCanvas) {
    graph.selectedId = null;
    graph.draggingId = null;
  } else if (graph instanceof Table3XCanvas) {
    graph.selected = null;
    graph.dragging = null;
  }
  graph.render?.();
}

function patchController() {
  const prototype = PipelineCadController.prototype;
  if (prototype[AUTHORING_PATCH]) return;
  Object.defineProperty(prototype, AUTHORING_PATCH, { value: true });

  const originalAttach = prototype.attachGraphs;
  prototype.attachGraphs = function patchedAttach(graphs) {
    const result = originalAttach.call(this, graphs);
    for (const graph of Object.values(this.graphs || {}).filter(Boolean)) {
      if (graph.canvas) {
        graph.canvas.__pipelineCadGraph = graph;
        graph.canvas.__pipelineCadController = this;
      }
    }
    if (!this.__pipelineCadSelectionListener) {
      this.selection = null;
      this.__pipelineCadSelectionListener = (event) => {
        this.selection = event.detail?.entityId ? { ...event.detail } : null;
      };
      this.addEventListener('selectionChanged', this.__pipelineCadSelectionListener);
    }
    return result;
  };

  prototype.selectEntity = function selectEntity(detail) {
    const graph = this.graphs?.[detail?.graph];
    if (!graph || !detail?.entityId) return false;
    if (detail.graph === 'table2x') graph.selectedId = detail.entityId;
    else graph.selected = { id: detail.entityId, type: detail.entityType };
    graph.dispatchGraphEvent?.('selectionChanged', detail);
    graph.render?.();
    return true;
  };

  prototype.deleteSelection = function deleteSelection() {
    const selection = this.selection;
    if (!selection?.entityId || !this.model?.findRow?.(selection.entityId)) return false;
    const changed = this.execute(deleteProfileRowCommand(this.model, selection.entityId), 'delete-selected-profile-row');
    if (!changed) return false;
    for (const graph of Object.values(this.graphs || {}).filter(Boolean)) clearGraphSelection(graph);
    this.selection = null;
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: {} }));
    return true;
  };
}

export function installPipelineCadAuthoringPatches() {
  patchTable2Canvas();
  patchTable3Canvas();
  patchController();
}

function ensureStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.p3d-cad-toolbar button[data-p3d-cad-snap][aria-pressed="true"]{background:#a78bfa;color:#2e1065;border-color:#c4b5fd;font-weight:700}
.p3d-cad-context-menu{position:absolute;z-index:20;display:flex;min-width:120px;flex-direction:column;gap:3px;padding:5px;border:1px solid rgba(148,163,184,.45);border-radius:7px;background:#0f172a;box-shadow:0 10px 28px rgba(0,0,0,.48)}
.p3d-cad-context-menu[hidden]{display:none}
.p3d-cad-context-menu button{border:1px solid rgba(148,163,184,.3);border-radius:5px;background:#1e293b;color:#e2e8f0;padding:6px 9px;text-align:left;font-size:11px;cursor:pointer}
.p3d-cad-context-menu button:hover{background:#334155}
.p3d-cad-snap-hint{color:#c4b5fd;font:10px monospace;white-space:nowrap}
`;
  doc.head.appendChild(style);
}

function setActiveTool(stage, graph, tool) {
  graph.setTool?.(tool);
  stage.querySelectorAll?.('[data-p3d-cad-tool]')?.forEach?.((button) => {
    button.setAttribute('aria-pressed', button.dataset.p3dCadTool === tool ? 'true' : 'false');
  });
}

function updateSnapControls(stage, graph, storage) {
  const settings = ensureSnapState(graph);
  stage.querySelectorAll?.('[data-p3d-cad-snap]')?.forEach?.((button) => {
    const enabled = button.dataset.p3dCadSnap === 'grid' ? settings.gridEnabled : settings.stationEnabled;
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  });
  const hint = stage.querySelector?.('[data-p3d-cad-snap-hint]');
  if (hint) hint.textContent = describePipelineCadSnapSettings(settings);
  savePipelineCadSnapSettings(stage.dataset.p3dCadStage, settings, storage);
}

function executeShortcut(action, context) {
  const { stage, graph, graphName, controller, storage } = context;
  if (!action) return false;
  if (action === PipelineCadShortcut.SELECT) setActiveTool(stage, graph, GraphTool.SELECT);
  else if (action === PipelineCadShortcut.ADD_NODE) setActiveTool(stage, graph, GraphTool.ADD_NODE);
  else if (action === PipelineCadShortcut.ADD_MARKER && graphName === 'table3x') setActiveTool(stage, graph, GraphTool.ADD_MARKER);
  else if (action === PipelineCadShortcut.PAN) setActiveTool(stage, graph, GraphTool.PAN);
  else if (action === PipelineCadShortcut.FIT) graph.fitToBounds?.();
  else if (action === PipelineCadShortcut.RELOAD) controller.reloadGraphs?.();
  else if (action === PipelineCadShortcut.UNDO) controller.undo?.();
  else if (action === PipelineCadShortcut.REDO) controller.redo?.();
  else if (action === PipelineCadShortcut.DELETE_SELECTION) controller.deleteSelection?.();
  else if (action === PipelineCadShortcut.TOGGLE_GRID_SNAP) {
    graph.setSnapSettings?.({ gridEnabled: !ensureSnapState(graph).gridEnabled });
    updateSnapControls(stage, graph, storage);
  } else if (action === PipelineCadShortcut.TOGGLE_STATION_SNAP) {
    graph.setSnapSettings?.({ stationEnabled: !ensureSnapState(graph).stationEnabled });
    updateSnapControls(stage, graph, storage);
  } else return false;
  const status = stage.querySelector?.('[data-p3d-cad-status]');
  if (status) status.textContent = pipelineCadShortcutLabel(action);
  return true;
}

function createContextMenu(stage) {
  const doc = stage.ownerDocument || globalThis.document;
  const menu = doc.createElement('div');
  menu.className = 'p3d-cad-context-menu';
  menu.hidden = true;
  menu.innerHTML = '<button type="button" data-p3d-cad-context-action="edit">Edit value / label</button><button type="button" data-p3d-cad-context-action="delete">Delete</button>';
  stage.appendChild(menu);
  return menu;
}

export function enhancePipelineCadStage(stage, options = {}) {
  if (!stage || stage.dataset.p3dCadAuthoring === '1') return false;
  const canvas = stage.querySelector?.('[data-p3d-cad-canvas]');
  const graph = canvas?.__pipelineCadGraph;
  const controller = canvas?.__pipelineCadController;
  if (!canvas || !graph || !controller) return false;
  stage.dataset.p3dCadAuthoring = '1';
  const graphName = stage.dataset.p3dCadStage;
  const storage = options.storage ?? globalThis.localStorage;
  graph.setSnapSettings?.(loadPipelineCadSnapSettings(graphName, storage));

  const toolbar = stage.querySelector?.('.p3d-cad-toolbar');
  const separator = toolbar?.querySelector?.('.p3d-cad-toolbar-separator');
  if (toolbar && separator && !toolbar.querySelector('[data-p3d-cad-snap]')) {
    separator.insertAdjacentHTML('beforebegin', '<button type="button" data-p3d-cad-snap="grid" aria-pressed="false" title="Toggle numeric grid snapping (G)">Grid Snap</button><button type="button" data-p3d-cad-snap="station" aria-pressed="false" title="Snap horizontal movement to known stations (S)">Station Snap</button><span class="p3d-cad-snap-hint" data-p3d-cad-snap-hint></span>');
  }
  updateSnapControls(stage, graph, storage);

  const menu = createContextMenu(stage);
  let contextHit = null;
  let contextClient = null;
  const hideMenu = () => { menu.hidden = true; contextHit = null; contextClient = null; };

  const onToolbarClick = (event) => {
    const button = event.target?.closest?.('[data-p3d-cad-snap]');
    if (!button) return;
    const key = button.dataset.p3dCadSnap === 'grid' ? 'gridEnabled' : 'stationEnabled';
    graph.setSnapSettings?.({ [key]: !ensureSnapState(graph)[key] });
    updateSnapControls(stage, graph, storage);
  };

  const onKeyDown = (event) => {
    const action = resolvePipelineCadShortcut(event, graphName);
    if (!action) return;
    if (executeShortcut(action, { stage, graph, graphName, controller, storage })) event.preventDefault();
  };

  const onContextMenu = (event) => {
    const screen = graph.eventToScreen?.(event);
    const hit = screen ? graph.hitTest?.(screen) : null;
    if (!hit) { hideMenu(); return; }
    event.preventDefault();
    contextHit = { graph: graphName, entityId: hit.node.id, entityType: hit.type };
    contextClient = { clientX: event.clientX, clientY: event.clientY };
    controller.selectEntity?.(contextHit);
    menu.style.left = `${Math.max(4, screen.x)}px`;
    menu.style.top = `${Math.max(42, screen.y)}px`;
    menu.hidden = false;
  };

  const onMenuClick = (event) => {
    const action = event.target?.closest?.('[data-p3d-cad-context-action]')?.dataset?.p3dCadContextAction;
    if (!action || !contextHit) return;
    if (action === 'delete') controller.deleteSelection?.();
    else if (action === 'edit') {
      const MouseEventCtor = globalThis.MouseEvent;
      if (typeof MouseEventCtor === 'function' && contextClient) {
        canvas.dispatchEvent(new MouseEventCtor('dblclick', { bubbles: true, clientX: contextClient.clientX, clientY: contextClient.clientY }));
      }
    }
    hideMenu();
  };

  const onDocumentPointer = (event) => {
    if (!menu.hidden && !menu.contains(event.target)) hideMenu();
  };
  const onSelection = (event) => {
    const detail = event.detail || {};
    if (detail.graph !== graphName || !detail.entityId) return;
    const row = controller.model?.findRow?.(detail.entityId);
    const status = stage.querySelector?.('[data-p3d-cad-status]');
    if (!status || !row) return;
    const identity = row.markerText || row.stationText || row.zText || detail.entityId;
    status.textContent = `Selected ${identity} · ${detail.entityType}`;
  };

  toolbar?.addEventListener?.('click', onToolbarClick);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('contextmenu', onContextMenu);
  menu.addEventListener('click', onMenuClick);
  (stage.ownerDocument || globalThis.document)?.addEventListener?.('pointerdown', onDocumentPointer);
  controller.addEventListener('selectionChanged', onSelection);
  stage.__pipelineCadAuthoringCleanup = () => {
    toolbar?.removeEventListener?.('click', onToolbarClick);
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('contextmenu', onContextMenu);
    menu.removeEventListener('click', onMenuClick);
    (stage.ownerDocument || globalThis.document)?.removeEventListener?.('pointerdown', onDocumentPointer);
    controller.removeEventListener('selectionChanged', onSelection);
  };
  return true;
}

export function installPipelineCadAuthoringObserver(doc = globalThis.document) {
  installPipelineCadAuthoringPatches();
  if (!doc?.body || doc.body.dataset.p3dCadAuthoringObserver === '1') return null;
  doc.body.dataset.p3dCadAuthoringObserver = '1';
  ensureStyle(doc);
  const enhanceAll = () => doc.querySelectorAll(STAGE_SELECTOR).forEach((stage) => enhancePipelineCadStage(stage));
  queueMicrotask(enhanceAll);
  const MutationObserverCtor = globalThis.MutationObserver;
  if (typeof MutationObserverCtor !== 'function') return null;
  const observer = new MutationObserverCtor(enhanceAll);
  observer.observe(doc.body, { childList: true, subtree: true });
  return observer;
}

installPipelineCadAuthoringPatches();
if (globalThis.document?.body) installPipelineCadAuthoringObserver(globalThis.document);
else globalThis.document?.addEventListener?.('DOMContentLoaded', () => installPipelineCadAuthoringObserver(globalThis.document), { once: true });
