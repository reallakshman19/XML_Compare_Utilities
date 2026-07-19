/** Read-only Engineering SVG implementation of RevisionCompareViewerFactory.v1. */
import {
  createEngineeringSvgSceneSource,
  createEngineeringSvgWorkspace,
} from '../../core/engineering-svg/index.js';
import {
  createRevisionCompareEngineeringSvgScene,
  createRevisionCompareSvgFitScene,
} from './revision-compare-engineering-svg-scene.js';
import { applyRevisionCompareSvgStatus } from './revision-compare-svg-styles.js';

export const REVISION_COMPARE_SVG_VIEWER_SNAPSHOT_SCHEMA = 'RevisionCompareSvgViewerSnapshot.v1';

function requiredHost(value) {
  if (!value?.ownerDocument?.createElementNS) throw new TypeError('Revision Compare SVG viewer requires a DOM host.');
  return value;
}

function viewport(host) {
  const width = Number(host.clientWidth) > 0 ? Number(host.clientWidth) : 1200;
  const height = Number(host.clientHeight) > 0 ? Number(host.clientHeight) : 720;
  return Object.freeze({ width, height });
}

function jsonSnapshot(value) {
  if (!value || value.schema !== REVISION_COMPARE_SVG_VIEWER_SNAPSHOT_SCHEMA) return null;
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

function statusObject(value) {
  if (value instanceof Map) return Object.fromEntries(value);
  return value && typeof value === 'object' ? { ...value } : {};
}

function fitIds(context) {
  return context.fitScope === 'selection' && context.selectedIds.length ? context.selectedIds : null;
}

function sceneForView(context) {
  return createRevisionCompareSvgFitScene(context.baseScene, fitIds(context));
}

function decorate(context) {
  if (!context.workspace || !context.baseScene) return;
  for (const entity of context.baseScene.entities) {
    const side = entity.domainRef.side;
    applyRevisionCompareSvgStatus(context.workspace.getEntityNode(entity.id), context.statusByObjectId[entity.id], side);
  }
}

function publishScene(context, reason) {
  if (!context.baseScene) return;
  const next = sceneForView(context);
  if (context.sceneSource) context.sceneSource.setSnapshot(next, reason);
  else context.sceneSource = createEngineeringSvgSceneSource(next);
  decorate(context);
}

function disconnectRuntime(context) {
  context.unsubscribeSelection?.();
  context.unsubscribeSelection = null;
  context.resizeObserver?.disconnect?.();
  context.resizeObserver = null;
  context.workspace?.destroy();
  context.workspace = null;
}

function observeResize(context) {
  const Observer = context.callbacks.resizeObserverFactory ?? globalThis.ResizeObserver;
  if (typeof Observer !== 'function') return;
  context.resizeObserver = new Observer(() => {
    if (!context.workspace || context.disposed) return;
    context.workspace.setViewport(viewport(context.host));
    decorate(context);
  });
  context.resizeObserver.observe(context.host);
}

function mount(context) {
  if (!context.sceneSource || context.workspace) return;
  context.workspace = createEngineeringSvgWorkspace({
    host: context.host,
    sceneSource: context.sceneSource,
    projection: 'ISO',
    viewport: viewport(context.host),
    selectedIds: context.selectedIds,
    padding: 28,
  });
  context.workspace.root.setAttribute('data-revc-svg-overlay-root', '1');
  context.workspace.root.setAttribute('aria-label', 'Revision comparison SVG overlay preview');
  context.unsubscribeSelection = context.workspace.subscribeSelection((event) => {
    context.selectedIds = [...event.selectedIds];
    if (event.reason === 'pointer' || event.reason === 'keyboard' || event.reason === 'pointer-empty') {
      context.callbacks.onPick?.({ objectId: event.selectedIds[0] ?? null });
    }
  });
  observeResize(context);
  decorate(context);
}

function setModels(context, nextModels) {
  const projection = createRevisionCompareEngineeringSvgScene({
    models: nextModels,
    statusByObjectId: context.statusByObjectId,
  });
  context.models = nextModels;
  context.baseScene = projection.scene;
  context.omissions = projection.omissions;
  publishScene(context, 'revision-compare-models');
  mount(context);
}

function setStatuses(context, value) {
  context.statusByObjectId = statusObject(value);
  decorate(context);
}

function setSelection(context, primaryObjectId, relatedObjectIds = []) {
  context.selectedIds = [primaryObjectId, ...relatedObjectIds].filter(Boolean);
  context.workspace?.setSelection(context.selectedIds, 'revision-compare');
}

function fit(context, scope) {
  if (!context.baseScene) return false;
  context.fitScope = scope === 'selection' && context.selectedIds.length ? 'selection' : 'all';
  context.fitCounts[context.fitScope] += 1;
  publishScene(context, `revision-compare-fit-${context.fitScope}`);
  return true;
}

function reattach(context, nextHost) {
  const host = requiredHost(nextHost);
  if (host === context.host) return false;
  disconnectRuntime(context);
  context.host = host;
  mount(context);
  return true;
}

function snapshot(context) {
  return Object.freeze({
    schema: REVISION_COMPARE_SVG_VIEWER_SNAPSHOT_SCHEMA,
    backend: 'SVG',
    sceneId: context.baseScene?.sceneId ?? null,
    revision: context.baseScene?.revision ?? null,
    mode: 'overlay',
    verticalAxis: context.verticalAxis,
    selectedIds: Object.freeze([...context.selectedIds]),
    fitScope: context.fitScope,
    fitCounts: Object.freeze({ ...context.fitCounts }),
    entityCount: context.baseScene?.entities.length ?? 0,
    omissions: Object.freeze(context.omissions.map((item) => ({ ...item }))),
  });
}

export async function createRevisionCompareEngineeringSvgViewer(host, callbacks = {}) {
  const initial = jsonSnapshot(callbacks.initialSnapshot);
  const context = {
    host: requiredHost(host), callbacks, models: null, baseScene: null, sceneSource: null,
    workspace: null, unsubscribeSelection: null, resizeObserver: null, statusByObjectId: {},
    selectedIds: initial?.selectedIds ?? [], fitScope: initial?.fitScope === 'selection' ? 'selection' : 'all',
    fitCounts: { all: initial?.fitCounts?.all ?? 0, selection: initial?.fitCounts?.selection ?? 0 },
    verticalAxis: initial?.verticalAxis ?? 'Z', omissions: [], disposed: false,
  };
  return Object.freeze({
    setModels: (models) => setModels(context, models),
    setStatuses: (statuses) => setStatuses(context, statuses),
    setMode: () => 'overlay',
    setSelection: (primary, related) => setSelection(context, primary, related),
    setVerticalAxis: (axis) => { context.verticalAxis = ['X', 'Y', 'Z'].includes(axis) ? axis : context.verticalAxis; },
    fitAll: () => fit(context, 'all'),
    fitSelection: () => fit(context, 'selection'),
    reattach: (nextHost) => reattach(context, nextHost),
    getStateSnapshot: () => snapshot(context),
    dispose() {
      if (context.disposed) return false;
      context.disposed = true;
      disconnectRuntime(context);
      context.sceneSource?.dispose();
      context.sceneSource = null;
      context.baseScene = null;
      return true;
    },
  });
}
