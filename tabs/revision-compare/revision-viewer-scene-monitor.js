/** Owned, bounded-lifecycle DOM monitor for Revision Compare WebGL renderer evidence. */
import {
  REVISION_VIEWER_SCENE_PENDING_LIMIT_MS,
  REVISION_VIEWER_SCENE_REFRESH_MS,
  revisionViewerSceneStatus,
  timedOutRevisionViewerSceneStatus,
} from './revision-viewer-scene-status.js';

function timerFunction(value, fallback, label) {
  const result = value ?? fallback;
  if (typeof result !== 'function') throw new TypeError(`${label} must be a function.`);
  return result;
}

function positiveInteger(value, fallback) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function setText(root, selector, value) {
  const element = root?.querySelector?.(selector);
  if (element) element.textContent = String(value ?? '');
}

function applySceneStatus(root, model) {
  const host = root?.querySelector?.('[data-revc-scene-status]');
  if (!host) return false;
  host.setAttribute('data-status', model.status.toLowerCase());
  const state = host.querySelector('[data-revc-scene-state]');
  if (state) {
    state.textContent = model.status;
    state.setAttribute('data-status', model.status.toLowerCase());
  }
  setText(host, '[data-revc-scene-source]', model.expected.source);
  setText(host, '[data-revc-scene-target]', model.expected.target);
  setText(host, '[data-revc-scene-instances]', model.rendered.instances);
  setText(host, '[data-revc-scene-batches]', model.rendered.batches);
  setText(host, '[data-revc-scene-runtime]', model.rendered.runtimeRevision ?? '—');
  setText(host, '[data-revc-scene-selection]', model.selectedObjectId ?? 'None');
  setText(host, '[data-revc-scene-picks]', model.pickCount);
  setText(host, '[data-revc-scene-last-pick]', model.lastPickedObjectId ?? 'None');
  setText(host, '[data-revc-scene-message]', model.message);
  return true;
}

function identity(model) {
  return JSON.stringify([
    model.status, model.reason, model.expected, model.rendered,
    model.selectedObjectId, model.pickCount, model.lastPickedObjectId, model.message,
  ]);
}

function stopTimer(context) {
  if (context.timer == null) return;
  context.clearTimer(context.timer);
  context.timer = null;
}

function schedule(context, generation) {
  stopTimer(context);
  context.timer = context.setTimer(() => sample(context, generation), context.intervalMs);
}

function currentModel(context) {
  const model = revisionViewerSceneStatus(context.audit, context.adapter.evidence());
  const elapsed = Math.max(0, context.clock() - context.startedAt);
  return elapsed >= context.pendingLimitMs ? timedOutRevisionViewerSceneStatus(model, elapsed) : model;
}

function sample(context, generation) {
  if (context.destroyed || !context.active || generation !== context.generation) return;
  context.timer = null;
  let model;
  try {
    model = currentModel(context);
  } catch (error) {
    model = Object.freeze({
      status: 'FAILED', reason: 'MONITOR_FAILURE', terminal: true,
      expected: { source: 0, target: 0, total: 0 },
      rendered: { instances: 0, batches: 0, runtimeRevision: null },
      selectedObjectId: null, pickCount: 0, lastPickedObjectId: null,
      message: error?.message || String(error),
    });
  }
  context.sampleCount += 1;
  const nextIdentity = identity(model);
  if (nextIdentity !== context.lastIdentity) {
    applySceneStatus(context.root, model);
    context.lastIdentity = nextIdentity;
    context.lastModel = model;
  }
  if (!model.terminal && model.requestedBackend !== 'SVG') schedule(context, generation);
}

function stop(context) {
  context.generation += 1;
  context.active = false;
  stopTimer(context);
  context.root = null;
  context.audit = null;
  context.adapter = null;
  context.lastIdentity = '';
  return true;
}

export function createRevisionViewerSceneMonitor(options = {}) {
  const context = {
    intervalMs: positiveInteger(options.intervalMs, REVISION_VIEWER_SCENE_REFRESH_MS),
    pendingLimitMs: positiveInteger(options.pendingLimitMs, REVISION_VIEWER_SCENE_PENDING_LIMIT_MS),
    clock: timerFunction(options.clock, () => Date.now(), 'Scene monitor clock'),
    setTimer: timerFunction(options.setTimer, (callback, delay) => setTimeout(callback, delay), 'Scene monitor setTimer'),
    clearTimer: timerFunction(options.clearTimer, (timer) => clearTimeout(timer), 'Scene monitor clearTimer'),
    generation: 0, timer: null, active: false, destroyed: false,
    root: null, audit: null, adapter: null, startedAt: 0,
    lastIdentity: '', lastModel: null, sampleCount: 0,
  };
  return Object.freeze({
    start(root, audit, adapter) {
      if (context.destroyed) throw new Error('Revision viewer scene monitor is destroyed.');
      if (!root?.querySelector) throw new TypeError('Scene monitor root is required.');
      if (!audit?.visualModels) throw new TypeError('Scene monitor audit visual models are required.');
      if (typeof adapter?.evidence !== 'function') throw new TypeError('Scene monitor viewer adapter is required.');
      stop(context);
      context.active = true;
      context.root = root;
      context.audit = audit;
      context.adapter = adapter;
      context.startedAt = context.clock();
      const generation = context.generation;
      sample(context, generation);
      return true;
    },
    stop: () => stop(context),
    evidence: () => Object.freeze({
      active: context.active,
      destroyed: context.destroyed,
      sampleCount: context.sampleCount,
      status: context.lastModel?.status ?? 'INACTIVE',
      reason: context.lastModel?.reason ?? null,
    }),
    destroy() {
      if (context.destroyed) return false;
      stop(context);
      context.destroyed = true;
      context.lastModel = null;
      return true;
    },
  });
}
