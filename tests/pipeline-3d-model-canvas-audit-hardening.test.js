import assert from 'node:assert/strict';
import { PipelineCadController } from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-controller.js';
import { Table2XCanvas } from '../tabs/pipeline-3d-model/pipeline-3d-model-table2x-canvas.js';
import {
  PipelineCanvasManager,
  pruneDetachedPipelineCanvasManagers,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-canvas-audit-hardening.js';

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  };
}

const RAW = Object.freeze({
  table2a: `H(coor)\tV(coor)\t[H vs V] Length\tStation Text\tElevation Text
659.791\t—\t—\t0+000.0\t231.32
668.540\t-715.825 → -650.258\t65.567\t0+006.7\t230.95
680.803\t-715.825 → -650.258\t65.567\t0+019.0\t230.82`,
  table3a: `From H(coor)\tTo H(coor)\tText Position X\tHLength Text
661.791\t682.337\t671.704\t20.5`,
  table3b: `From H(coor)\tTo H(coor)\tText Position X\tZ Text
682.337\t732.683\t708.374\t1.5M`,
  table3c: `Text Position X\tMarker Text
688.135\tPM-001`,
});

function createContext() {
  return {
    clearCount: 0,
    setTransform() {},
    clearRect() { this.clearCount += 1; },
    fillRect() {},
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    fillText() {},
    setLineDash() {},
  };
}

class FakeCanvas extends EventTarget {
  constructor() {
    super();
    this.width = 0;
    this.height = 0;
    this.style = {};
    this.context = createContext();
    this.listeners = new Map();
  }

  getContext() { return this.context; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 500 }; }
  setPointerCapture() {}
  releasePointerCapture() {}

  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener, options) {
    super.removeEventListener(type, listener, options);
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type) { return this.listeners.get(type)?.size || 0; }
}

class FakeTextArea extends EventTarget {
  constructor(value, slotName) {
    super();
    this.value = value;
    this.slotName = slotName;
  }

  matches(selector) {
    return selector === '[data-p3d-split$="-raw"]' && this.slotName.endsWith('-raw');
  }
}

class FakeDialog extends EventTarget {
  constructor() {
    super();
    this.isConnected = true;
    this.ownerDocument = null;
    this.elements = Object.fromEntries(Object.entries(RAW).map(([name, value]) => [
      `[data-p3d-split="${name}-raw"]`,
      new FakeTextArea(value, `${name}-raw`),
    ]));
  }

  querySelector(selector) { return this.elements[selector] || null; }
}

function installFrameHarness() {
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  const frames = new Map();
  let nextId = 1;
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextId;
    nextId += 1;
    frames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  return {
    frames,
    flush() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(16));
    },
    restore() {
      globalThis.requestAnimationFrame = previousRequest;
      globalThis.cancelAnimationFrame = previousCancel;
    },
  };
}

const frameHarness = installFrameHarness();
try {
  const dialog = new FakeDialog();
  const canvas = new FakeCanvas();
  const graph = new Table2XCanvas(canvas, { width: 1000, height: 500 });
  const controller = new PipelineCadController(dialog);
  controller.attachGraphs({ table2x: graph });

  assert.ok(controller.canvasManager instanceof PipelineCanvasManager);
  assert.equal(Array.isArray(controller.canvasManager.nodes), true);
  assert.equal(controller.canvasManager.nodes.length, 3);
  assert.equal(controller.canvasManager.edges.length, 2);

  assert.equal(graph.isDirty, true);
  assert.equal(frameHarness.frames.size, 1, 'initial paints must coalesce into one animation frame');
  graph.render();
  graph.render();
  assert.equal(frameHarness.frames.size, 1, 'repeated dirty renders must not create a constant loop');
  frameHarness.flush();
  assert.equal(canvas.context.clearCount, 1);
  assert.equal(graph.isDirty, false);

  let previewMove = null;
  let committedMove = null;
  let geometryUpdates = 0;
  canvas.addEventListener('canvas:nodeMoved', (event) => {
    if (event.detail.preview) previewMove = event.detail;
    if (event.detail.committed) committedMove = event.detail;
  });
  canvas.addEventListener('canvas:geometryUpdated', () => { geometryUpdates += 1; });

  const node = graph.currentNodes()[1];
  const screen = graph.worldToScreen(node);
  const rawElement = dialog.querySelector('[data-p3d-split="table2a-raw"]');
  const rawBeforeDrag = rawElement.value;
  graph.onPrimaryPointerDown({ button: 0 }, screen, node);
  graph.onPrimaryPointerMove({}, screen, { x: node.x, y: node.y + 2 });
  assert.equal(rawElement.value, rawBeforeDrag, 'pointermove must not mutate raw textarea state');
  frameHarness.flush();
  assert.equal(previewMove?.preview, true);
  assert.ok(geometryUpdates >= 1);

  graph.onPrimaryPointerUp({}, screen, { x: node.x, y: node.y + 2 });
  assert.notEqual(rawElement.value, rawBeforeDrag, 'pointer release must commit the model back to raw data');
  assert.equal(committedMove?.committed, true);
  assert.equal(controller.canvasManager.nodes.find((item) => item.id === node.id)?.y, node.y + 2);

  assert.ok(canvas.listenerCount('pointermove') > 0);
  dialog.isConnected = false;
  assert.equal(pruneDetachedPipelineCanvasManagers(), 1);
  assert.equal(controller.canvasManager, null);
  assert.equal(canvas.listenerCount('pointermove'), 0, 'detached popup teardown must remove canvas listeners');
  assert.equal(graph.isDirty, false);
  assert.equal(frameHarness.frames.size, 0);
} finally {
  frameHarness.restore();
}

console.log('pipeline-3d-model canvas audit hardening tests passed');
