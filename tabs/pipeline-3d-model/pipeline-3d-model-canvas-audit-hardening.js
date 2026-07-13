import { InteractiveGraph } from './pipeline-3d-model-interactive-graph.js';
import { Table2XCanvas } from './pipeline-3d-model-table2x-canvas.js';
import { Table3XCanvas } from './pipeline-3d-model-table3x-canvas.js';
import { PipelineCadController } from './pipeline-3d-model-cad-controller.js';

const RENDER_PATCH = Symbol.for('pipeline3d.canvas-audit.render.v1');
const MODEL_PATCH = Symbol.for('pipeline3d.canvas-audit.model.v1');
const DESTROY_PATCH = Symbol.for('pipeline3d.canvas-audit.destroy.v1');
const CONTROLLER_PATCH = Symbol.for('pipeline3d.canvas-audit.controller.v1');
const RENDER_STATE = new WeakMap();
const ACTIVE_MANAGERS = new Set();
const OBSERVERS = new WeakMap();

function renderState(graph) {
  let state = RENDER_STATE.get(graph);
  if (!state) {
    state = { frameId: null, destroyed: false };
    RENDER_STATE.set(graph, state);
  }
  return state;
}

function scheduleFrame(callback) {
  const request = globalThis.requestAnimationFrame;
  if (typeof request !== 'function') {
    callback();
    return null;
  }
  return request.call(globalThis, callback);
}

function cancelFrame(frameId) {
  if (frameId == null) return;
  globalThis.cancelAnimationFrame?.(frameId);
}

function freezeNode(node, graphName) {
  return Object.freeze({ ...node, graph: graphName });
}

function buildEdges(nodes, graphName) {
  return Object.freeze(nodes.slice(1).map((nodeB, index) => Object.freeze({
    id: `${nodes[index].id}->${nodeB.id}`,
    graph: graphName,
    nodeA: nodes[index],
    nodeB,
  })));
}

function graphGeometry(graph) {
  if (graph instanceof Table2XCanvas) {
    const nodes = Object.freeze((graph.currentNodes?.() || []).map((node) => freezeNode(node, 'table2x')));
    return { nodes, edges: buildEdges(nodes, 'table2x') };
  }
  if (graph instanceof Table3XCanvas) {
    const depths = (graph.depthNodes?.() || []).map((node) => freezeNode(node, 'table3x'));
    const markers = (graph.markerNodes?.() || []).map((node) => freezeNode(node, 'table3x'));
    return { nodes: Object.freeze([...depths, ...markers]), edges: buildEdges(depths, 'table3x') };
  }
  return { nodes: Object.freeze([]), edges: Object.freeze([]) };
}

export function syncPipelineCanvasGeometry(graph) {
  const geometry = graphGeometry(graph);
  graph.nodes = geometry.nodes;
  graph.edges = geometry.edges;
  return geometry;
}

function patchRender(GraphClass) {
  const prototype = GraphClass.prototype;
  if (prototype[RENDER_PATCH]) return;
  Object.defineProperty(prototype, RENDER_PATCH, { value: true });
  const paint = prototype.render;
  prototype.render = function renderWhenDirty() {
    const state = renderState(this);
    if (state.destroyed) return false;
    this.isDirty = true;
    if (state.frameId != null) return false;
    state.frameId = scheduleFrame(() => {
      state.frameId = null;
      this.renderFrame = null;
      if (!this.isDirty || state.destroyed) return;
      this.isDirty = false;
      syncPipelineCanvasGeometry(this);
      paint.call(this);
    });
    this.renderFrame = state.frameId;
    return true;
  };
}

function patchSetModel(GraphClass) {
  const prototype = GraphClass.prototype;
  if (prototype[MODEL_PATCH]) return;
  Object.defineProperty(prototype, MODEL_PATCH, { value: true });
  const setModel = prototype.setModel;
  prototype.setModel = function setAuditedModel(...args) {
    const result = setModel.apply(this, args);
    syncPipelineCanvasGeometry(this);
    return result;
  };
}

function patchDestroy() {
  const prototype = InteractiveGraph.prototype;
  if (prototype[DESTROY_PATCH]) return;
  Object.defineProperty(prototype, DESTROY_PATCH, { value: true });
  const destroy = prototype.destroy;
  prototype.destroy = function destroyAuditedGraph() {
    const state = renderState(this);
    state.destroyed = true;
    cancelFrame(state.frameId);
    state.frameId = null;
    this.renderFrame = null;
    this.isDirty = false;
    return destroy.call(this);
  };
}

function dispatchCustomEvent(target, type, detail) {
  if (!target?.dispatchEvent || typeof globalThis.CustomEvent !== 'function') return false;
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  return true;
}

function bindEvent(target, type, listener, cleanup) {
  target?.addEventListener?.(type, listener);
  cleanup.push(() => target?.removeEventListener?.(type, listener));
}

export class PipelineCanvasManager extends EventTarget {
  constructor(controller, graphs = {}) {
    super();
    this.controller = controller || null;
    this.graphs = { table2x: graphs.table2x || null, table3x: graphs.table3x || null };
    this.nodes = Object.freeze([]);
    this.edges = Object.freeze([]);
    this.cleanup = [];
    this.previewFrame = null;
    this.pendingPreview = null;
    this.destroyed = false;
    this.bindGraphs();
    this.bindController();
    this.syncGeometry();
    ACTIVE_MANAGERS.add(this);
    installPipelineCanvasLifecycleObserver(controller?.dialog?.ownerDocument || globalThis.document);
  }

  syncGeometry() {
    const geometries = Object.values(this.graphs).filter(Boolean).map(syncPipelineCanvasGeometry);
    this.nodes = Object.freeze(geometries.flatMap((geometry) => geometry.nodes));
    this.edges = Object.freeze(geometries.flatMap((geometry) => geometry.edges));
    return { nodes: this.nodes, edges: this.edges };
  }

  emit(type, detail = {}) {
    const payload = Object.freeze({ ...detail, nodes: this.nodes, edges: this.edges });
    dispatchCustomEvent(this, type, payload);
    const canvases = new Set(Object.values(this.graphs).map((graph) => graph?.canvas).filter(Boolean));
    canvases.forEach((canvas) => dispatchCustomEvent(canvas, type, payload));
  }

  queuePreview(detail) {
    this.pendingPreview = { detail };
    if (this.previewFrame != null) return;
    this.previewFrame = scheduleFrame(() => {
      this.previewFrame = null;
      const pending = this.pendingPreview;
      this.pendingPreview = null;
      if (!pending || this.destroyed) return;
      this.syncGeometry();
      this.emit('canvas:nodeMoved', { ...pending.detail, preview: true, committed: false });
      this.emit('canvas:geometryUpdated', { reason: 'node-preview', graph: pending.detail.graph });
    });
  }

  cancelPreview() {
    cancelFrame(this.previewFrame);
    this.previewFrame = null;
    this.pendingPreview = null;
  }

  bindGraphs() {
    Object.values(this.graphs).filter(Boolean).forEach((graph) => {
      bindEvent(graph, 'nodePreviewMoved', (event) => this.queuePreview(event.detail || {}), this.cleanup);
      bindEvent(graph, 'nodeMoved', (event) => {
        this.cancelPreview();
        this.syncGeometry();
        this.emit('canvas:nodeMoved', { ...(event.detail || {}), preview: false, committed: true });
      }, this.cleanup);
    });
  }

  bindController() {
    const refresh = (event) => {
      this.syncGeometry();
      this.emit('canvas:geometryUpdated', { reason: event.type, ...(event.detail || {}) });
    };
    ['modelChanged', 'commandCommitted', 'graphsReloaded', 'historyApplied']
      .forEach((type) => bindEvent(this.controller, type, refresh, this.cleanup));
  }

  destroy() {
    if (this.destroyed) return false;
    this.destroyed = true;
    this.cancelPreview();
    this.cleanup.splice(0).forEach((dispose) => dispose());
    ACTIVE_MANAGERS.delete(this);
    return true;
  }
}

function patchController() {
  const prototype = PipelineCadController.prototype;
  if (prototype[CONTROLLER_PATCH]) return;
  Object.defineProperty(prototype, CONTROLLER_PATCH, { value: true });
  const attachGraphs = prototype.attachGraphs;
  prototype.attachGraphs = function attachAuditedGraphs(...args) {
    this.canvasManager?.destroy?.();
    const result = attachGraphs.apply(this, args);
    this.canvasManager = new PipelineCanvasManager(this, this.graphs);
    return result;
  };
  const destroy = prototype.destroy;
  prototype.destroy = function destroyAuditedController() {
    const manager = this.canvasManager;
    this.canvasManager = null;
    manager?.destroy?.();
    return destroy.call(this);
  };
}

function managerIsDetached(manager, doc) {
  const dialog = manager?.controller?.dialog;
  if (!dialog) return false;
  if (typeof dialog.isConnected === 'boolean') return !dialog.isConnected;
  return Boolean(doc?.documentElement?.contains) && !doc.documentElement.contains(dialog);
}

function destroyManagerHost(manager) {
  const graphs = Object.values(manager.graphs).filter(Boolean);
  manager.controller?.destroy?.();
  graphs.forEach((graph) => graph.destroy?.());
}

export function pruneDetachedPipelineCanvasManagers(doc = globalThis.document) {
  let destroyed = 0;
  [...ACTIVE_MANAGERS].forEach((manager) => {
    if (!managerIsDetached(manager, doc)) return;
    destroyManagerHost(manager);
    destroyed += 1;
  });
  return destroyed;
}

export function installPipelineCanvasLifecycleObserver(doc = globalThis.document) {
  if (!doc?.body || OBSERVERS.has(doc)) return OBSERVERS.get(doc) || null;
  const MutationObserverCtor = doc.defaultView?.MutationObserver || globalThis.MutationObserver;
  if (typeof MutationObserverCtor !== 'function') return null;
  const observer = new MutationObserverCtor(() => pruneDetachedPipelineCanvasManagers(doc));
  observer.observe(doc.body, { childList: true, subtree: true });
  OBSERVERS.set(doc, observer);
  return observer;
}

export function installPipelineCanvasAuditHardening() {
  patchRender(Table2XCanvas);
  patchRender(Table3XCanvas);
  patchSetModel(Table2XCanvas);
  patchSetModel(Table3XCanvas);
  patchDestroy();
  patchController();
}

installPipelineCanvasAuditHardening();
if (globalThis.document?.body) installPipelineCanvasLifecycleObserver(globalThis.document);
else globalThis.document?.addEventListener?.('DOMContentLoaded', () => installPipelineCanvasLifecycleObserver(globalThis.document), { once: true });
