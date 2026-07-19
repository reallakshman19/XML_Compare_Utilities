/** Read-only Engineering SVG implementation of RevisionCompareViewerFactory.v1. */
import {
  createEngineeringSvgSceneSource,
  createEngineeringSvgWorkspace,
} from '../../core/engineering-svg/index.js';
import {
  createRevisionCompareEngineeringSvgScene,
  createRevisionCompareSvgFitScene,
  createRevisionCompareSvgPaneScene,
  revisionCompareSvgSceneCompatibilityKey,
} from './revision-compare-engineering-svg-scene.js';
import { applyRevisionCompareSvgStatus } from './revision-compare-svg-styles.js';
import {
  createRevisionCompareSvgViewport,
  normalizeRevisionCompareSvgViewportState,
} from './revision-compare-svg-viewport.js';

export const REVISION_COMPARE_SVG_VIEWER_SNAPSHOT_SCHEMA = 'RevisionCompareSvgViewerSnapshot.v2';
const LEGACY_SNAPSHOT_SCHEMA = 'RevisionCompareSvgViewerSnapshot.v1';

function requiredHost(value) {
  if (!value?.ownerDocument?.createElementNS) throw new TypeError('Revision Compare SVG viewer requires a DOM host.');
  return value;
}

function viewport(host, fallback = { width: 1200, height: 720 }) {
  const width = Number(host?.clientWidth);
  const height = Number(host?.clientHeight);
  return Object.freeze({
    width: Number.isFinite(width) && width > 0 ? width : fallback.width,
    height: Number.isFinite(height) && height > 0 ? height : fallback.height,
  });
}

function jsonSnapshot(value) {
  if (![REVISION_COMPARE_SVG_VIEWER_SNAPSHOT_SCHEMA, LEGACY_SNAPSHOT_SCHEMA].includes(value?.schema)) return null;
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

function statusObject(value) {
  if (value instanceof Map) return Object.fromEntries(value);
  return value && typeof value === 'object' ? { ...value } : {};
}

function normalizedMode(value) { return value === 'side-by-side' ? 'side-by-side' : 'overlay'; }
function fitIds(context) { return context.fitScope === 'selection' ? context.fitEntityIds : null; }
function fitScene(context) { return createRevisionCompareSvgFitScene(context.baseScene, fitIds(context)); }

function surfaceScene(context, surface) {
  const scene = fitScene(context);
  return surface.side ? createRevisionCompareSvgPaneScene(scene, surface.side) : scene;
}

function hiddenForSurface(entity, surface) {
  return Boolean(surface.side && entity.domainRef.side !== surface.side);
}

function decorateSurface(context, surface) {
  for (const entity of context.baseScene?.entities ?? []) {
    const node = surface.workspace.getEntityNode(entity.id);
    if (!node) continue;
    if (hiddenForSurface(entity, surface)) {
      node.setAttribute('data-revc-hidden-fit-authority', '1');
      node.setAttribute('aria-hidden', 'true');
      node.style.opacity = '0';
      node.style.pointerEvents = 'none';
      node.removeAttribute('data-revc-diff-status');
      continue;
    }
    node.removeAttribute('data-revc-hidden-fit-authority');
    node.removeAttribute('aria-hidden');
    node.style.opacity = '';
    applyRevisionCompareSvgStatus(node, context.statusByObjectId[entity.id], entity.domainRef.side);
  }
}

function syncSelection(context, source = null) {
  if (context.syncingSelection) return;
  context.syncingSelection = true;
  try {
    for (const surface of context.runtime?.surfaces ?? []) {
      if (surface.workspace !== source) surface.workspace.setSelection(context.selectedIds, 'revision-compare');
    }
  } finally {
    context.syncingSelection = false;
  }
}

function onSurfaceSelection(context, surface, event) {
  if (context.syncingSelection) return;
  context.selectedIds = [...event.selectedIds];
  syncSelection(context, surface.workspace);
  if (['pointer', 'keyboard', 'pointer-empty'].includes(event.reason)) {
    context.callbacks.onPick?.({ objectId: event.selectedIds[0] ?? null });
  }
}

function workspaceOptions(context, host, sceneSource) {
  return { host, sceneSource, projection: 'ISO', viewport: viewport(host), selectedIds: context.selectedIds, padding: 28 };
}

function createSurface(context, host, id, side = null) {
  const sceneSource = createEngineeringSvgSceneSource(surfaceScene(context, { side }));
  const factory = context.callbacks.workspaceFactory ?? createEngineeringSvgWorkspace;
  const workspace = factory(workspaceOptions(context, host, sceneSource));
  const surface = { id, side, host, sceneSource, workspace, unsubscribeSelection: null };
  const root = workspace.root;
  if (side) {
    root.setAttribute('data-revc-svg-pane-root', '1');
    root.setAttribute('data-revc-svg-pane', side);
    root.setAttribute('aria-label', `Revision comparison Rev ${side} ${side === 'A' ? 'source' : 'target'} pane`);
  } else {
    root.setAttribute('data-revc-svg-overlay-root', '1');
    root.setAttribute('aria-label', 'Revision comparison SVG overlay preview');
  }
  surface.unsubscribeSelection = workspace.subscribeSelection((event) => onSurfaceSelection(context, surface, event));
  return surface;
}

function paneElement(documentRef, side) {
  const section = documentRef.createElement('section');
  section.className = 'revc-svg-pane';
  section.setAttribute('data-revc-svg-pane-shell', side);
  const heading = documentRef.createElement('h3');
  heading.textContent = side === 'A' ? 'Rev A · Source' : 'Rev B · Target';
  const host = documentRef.createElement('div');
  host.className = 'revc-svg-pane-host';
  section.append(heading, host);
  return { section, host };
}

function sideBySideElements(context) {
  const documentRef = context.host.ownerDocument;
  const container = documentRef.createElement('div');
  container.className = 'revc-svg-side-by-side';
  container.setAttribute('data-revc-svg-side-by-side', '1');
  const source = paneElement(documentRef, 'A');
  const target = paneElement(documentRef, 'B');
  container.append(source.section, target.section);
  context.host.appendChild(container);
  return { container, source, target };
}

function commonViewport(runtime) {
  const sizes = runtime.surfaces.map((surface) => viewport(surface.host, { width: 600, height: 720 }));
  return Object.freeze({
    width: Math.max(...sizes.map((item) => item.width)),
    height: Math.max(...sizes.map((item) => item.height)),
  });
}

function refreshRuntime(context) {
  const runtime = context.runtime;
  if (!runtime) return;
  const nextViewport = commonViewport(runtime);
  for (const surface of runtime.surfaces) {
    surface.workspace.setViewport(nextViewport);
    decorateSurface(context, surface);
  }
  runtime.viewport.refreshBases();
}

function observeRuntime(context) {
  const Observer = context.callbacks.resizeObserverFactory ?? globalThis.ResizeObserver;
  if (typeof Observer !== 'function') return null;
  const observer = new Observer(() => { if (!context.disposed) refreshRuntime(context); });
  observer.observe(context.host);
  return observer;
}

function mount(context) {
  if (!context.baseScene || context.runtime) return;
  const runtime = { mode: context.mode, surfaces: [], container: null, viewport: null, resizeObserver: null };
  context.runtime = runtime;
  try {
    if (context.mode === 'overlay') {
      runtime.surfaces.push(createSurface(context, context.host, 'overlay'));
    } else {
      const elements = sideBySideElements(context);
      runtime.container = elements.container;
      runtime.surfaces.push(createSurface(context, elements.source.host, 'source', 'A'));
      runtime.surfaces.push(createSurface(context, elements.target.host, 'target', 'B'));
    }
    runtime.viewport = createRevisionCompareSvgViewport({
      initialState: context.viewportHistory[context.mode],
      onChange: (state) => { context.viewportHistory[context.mode] = state; },
    });
    for (const surface of runtime.surfaces) runtime.viewport.attachSurface(surface.id, surface.workspace.root);
    runtime.resizeObserver = observeRuntime(context);
    for (const surface of runtime.surfaces) decorateSurface(context, surface);
  } catch (error) {
    disconnectRuntime(context);
    throw error;
  }
}

function disconnectRuntime(context) {
  const runtime = context.runtime;
  if (!runtime) return false;
  if (runtime.viewport) context.viewportHistory[runtime.mode] = runtime.viewport.getState();
  runtime.resizeObserver?.disconnect?.();
  runtime.viewport?.dispose();
  for (const surface of runtime.surfaces) {
    surface.unsubscribeSelection?.();
    surface.workspace?.destroy();
    surface.sceneSource?.dispose();
  }
  runtime.container?.remove();
  context.runtime = null;
  return true;
}

function publishScene(context, reason) {
  if (!context.runtime || !context.baseScene) return;
  for (const surface of context.runtime.surfaces) surface.sceneSource.setSnapshot(surfaceScene(context, surface), reason);
  for (const surface of context.runtime.surfaces) decorateSurface(context, surface);
  context.runtime.viewport.refreshBases();
}

function applyCompatibleSnapshot(context, key) {
  const initial = context.initialSnapshot;
  if (!initial || initial.sceneCompatibilityKey !== key) {
    context.viewportHistory = { overlay: normalizeRevisionCompareSvgViewportState(), 'side-by-side': normalizeRevisionCompareSvgViewportState() };
    context.fitScope = 'all'; context.fitEntityIds = []; context.initialFitCount += 1;
    return false;
  }
  context.mode = normalizedMode(initial.mode);
  context.selectedIds = [...(initial.selectedIds ?? [])];
  context.fitScope = initial.fitScope === 'selection' ? 'selection' : 'all';
  context.fitCounts = { all: initial.fitCounts?.all ?? 0, selection: initial.fitCounts?.selection ?? 0, noGeometry: initial.fitCounts?.noGeometry ?? 0 };
  context.viewportHistory = {
    overlay: normalizeRevisionCompareSvgViewportState(initial.viewportHistory?.overlay),
    'side-by-side': normalizeRevisionCompareSvgViewportState(initial.viewportHistory?.['side-by-side']),
  };
  return true;
}

function setModels(context, nextModels) {
  const projection = createRevisionCompareEngineeringSvgScene({ models: nextModels, statusByObjectId: context.statusByObjectId });
  const key = revisionCompareSvgSceneCompatibilityKey(projection.scene);
  const changed = key !== context.sceneCompatibilityKey;
  if (changed) disconnectRuntime(context);
  context.models = nextModels; context.baseScene = projection.scene; context.omissions = projection.omissions;
  context.entityById = new Map(context.baseScene.entities.map((entity) => [entity.id, entity]));
  if (!context.sceneCompatibilityKey) applyCompatibleSnapshot(context, key);
  else if (changed) applyCompatibleSnapshot(context, null);
  context.sceneCompatibilityKey = key; context.initialSnapshot = null;
  mount(context); publishScene(context, 'revision-compare-models'); syncSelection(context);
}

function setStatuses(context, value) {
  context.statusByObjectId = statusObject(value);
  for (const surface of context.runtime?.surfaces ?? []) decorateSurface(context, surface);
}

function setMode(context, value) {
  const mode = normalizedMode(value);
  if (mode === context.mode) return mode;
  disconnectRuntime(context); context.mode = mode; mount(context); syncSelection(context); return mode;
}

function setSelection(context, primaryObjectId, relatedObjectIds = []) {
  context.selectedIds = [primaryObjectId, ...relatedObjectIds].filter(Boolean);
  syncSelection(context);
}

function fit(context, scope) {
  if (!context.baseScene) return false;
  if (scope === 'selection') {
    const ids = context.selectedIds.filter((id) => context.entityById.has(id));
    if (!ids.length) {
      context.fitCounts.noGeometry += 1; context.lastFitResult = 'no-geometry'; return false;
    }
    context.fitScope = 'selection'; context.fitEntityIds = ids; context.fitCounts.selection += 1;
  } else {
    context.fitScope = 'all'; context.fitEntityIds = []; context.fitCounts.all += 1;
  }
  context.lastFitResult = 'applied'; publishScene(context, `revision-compare-fit-${context.fitScope}`);
  context.runtime?.viewport.reset(`fit-${context.fitScope}`); return true;
}

function reattach(context, nextHost) {
  const host = requiredHost(nextHost);
  if (host === context.host) return false;
  disconnectRuntime(context); context.host = host; mount(context); syncSelection(context); return true;
}

function sideCounts(context) {
  const counts = { A: 0, B: 0 };
  for (const entity of context.baseScene?.entities ?? []) counts[entity.domainRef.side] += 1;
  return counts;
}

function snapshot(context) {
  const runtime = context.runtime;
  if (runtime?.viewport) context.viewportHistory[context.mode] = runtime.viewport.getState();
  const counts = sideCounts(context);
  return Object.freeze({
    schema: REVISION_COMPARE_SVG_VIEWER_SNAPSHOT_SCHEMA, backend: 'SVG', mode: context.mode,
    sceneId: context.baseScene?.sceneId ?? null, revision: context.baseScene?.revision ?? null,
    sceneCompatibilityKey: context.sceneCompatibilityKey, verticalAxis: context.verticalAxis,
    selectedIds: Object.freeze([...context.selectedIds]), fitScope: context.fitScope,
    fitCounts: Object.freeze({ ...context.fitCounts }), lastFitResult: context.lastFitResult,
    viewportHistory: Object.freeze({ ...context.viewportHistory }), entityCount: context.baseScene?.entities.length ?? 0,
    visibleEntityCounts: Object.freeze(context.mode === 'overlay' ? { overlay: counts.A + counts.B } : { source: counts.A, target: counts.B }),
    hiddenFitAuthorityCounts: Object.freeze(context.mode === 'side-by-side' ? { source: counts.B, target: counts.A } : {}),
    omissions: Object.freeze(context.omissions.map((item) => ({ ...item }))),
    resources: Object.freeze({ roots: runtime?.surfaces.length ?? 0, observers: runtime?.resizeObserver ? 1 : 0,
      selectionSubscriptions: runtime?.surfaces.length ?? 0, viewportListeners: runtime?.viewport.getResourceCounts().listeners ?? 0 }),
    initialFitCount: context.initialFitCount,
  });
}

export async function createRevisionCompareEngineeringSvgViewer(host, callbacks = {}) {
  const initial = jsonSnapshot(callbacks.initialSnapshot);
  const context = {
    host: requiredHost(host), callbacks, initialSnapshot: initial, models: null, baseScene: null,
    entityById: new Map(), runtime: null, statusByObjectId: {}, selectedIds: initial?.selectedIds ?? [],
    mode: normalizedMode(initial?.mode), fitScope: initial?.fitScope === 'selection' ? 'selection' : 'all', fitEntityIds: [],
    fitCounts: { all: initial?.fitCounts?.all ?? 0, selection: initial?.fitCounts?.selection ?? 0, noGeometry: initial?.fitCounts?.noGeometry ?? 0 },
    viewportHistory: { overlay: normalizeRevisionCompareSvgViewportState(initial?.viewportHistory?.overlay),
      'side-by-side': normalizeRevisionCompareSvgViewportState(initial?.viewportHistory?.['side-by-side']) },
    sceneCompatibilityKey: null, verticalAxis: initial?.verticalAxis ?? 'Z', omissions: [], lastFitResult: null,
    initialFitCount: 0, syncingSelection: false, disposed: false,
  };
  return Object.freeze({
    setModels: (models) => setModels(context, models), setStatuses: (statuses) => setStatuses(context, statuses),
    setMode: (mode) => setMode(context, mode), setSelection: (primary, related) => setSelection(context, primary, related),
    setVerticalAxis: (axis) => { context.verticalAxis = ['X', 'Y', 'Z'].includes(axis) ? axis : context.verticalAxis; },
    fitAll: () => fit(context, 'all'), fitSelection: () => fit(context, 'selection'),
    reattach: (nextHost) => reattach(context, nextHost), getStateSnapshot: () => snapshot(context),
    dispose() { if (context.disposed) return false; context.disposed = true; disconnectRuntime(context); context.baseScene = null; return true; },
  });
}
