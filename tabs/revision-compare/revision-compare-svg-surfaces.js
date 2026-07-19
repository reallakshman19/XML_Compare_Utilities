/** Owns overlay or linked side-by-side Engineering SVG workspace surfaces. */
import {
  createEngineeringSvgSceneSource,
  createEngineeringSvgWorkspace,
} from '../../core/engineering-svg/index.js';
import { applyRevisionCompareSvgStatus } from './revision-compare-svg-styles.js';
import { createRevisionCompareSvgViewport } from './revision-compare-svg-viewport.js';

function requiredHost(value) {
  if (!value?.ownerDocument?.createElementNS) throw new TypeError('Revision Compare SVG runtime requires a DOM host.');
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

function workspaceOptions(context, host, sceneSource) {
  return {
    host,
    sceneSource,
    projection: 'ISO',
    viewport: viewport(host),
    selectedIds: context.selectedIds,
    padding: 28,
  };
}

function hiddenForSurface(entity, surface) {
  return Boolean(surface.side && entity.domainRef.side !== surface.side);
}

function decorateSurface(context, surface) {
  for (const entity of context.entities()) {
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
    for (const surface of context.surfaces) {
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
  context.onSelection?.(context.selectedIds, event.reason);
}

function configureRoot(root, side) {
  if (side) {
    root.setAttribute('data-revc-svg-pane-root', '1');
    root.setAttribute('data-revc-svg-pane', side);
    root.setAttribute('aria-label', `Revision comparison Rev ${side} ${side === 'A' ? 'source' : 'target'} pane`);
    return;
  }
  root.setAttribute('data-revc-svg-overlay-root', '1');
  root.setAttribute('aria-label', 'Revision comparison SVG overlay preview');
}

function createSurface(context, host, id, side = null) {
  const sceneSource = createEngineeringSvgSceneSource(context.sceneForSide(side));
  const factory = context.workspaceFactory ?? createEngineeringSvgWorkspace;
  let workspace = null;
  let unsubscribeSelection = null;
  try {
    workspace = factory(workspaceOptions(context, host, sceneSource));
    const surface = { id, side, host, sceneSource, workspace, unsubscribeSelection: null };
    configureRoot(workspace.root, side);
    unsubscribeSelection = workspace.subscribeSelection((event) => onSurfaceSelection(context, surface, event));
    surface.unsubscribeSelection = unsubscribeSelection;
    return surface;
  } catch (error) {
    unsubscribeSelection?.();
    workspace?.destroy?.();
    sceneSource.dispose();
    throw error;
  }
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

function commonViewport(context) {
  const sizes = context.surfaces.map((surface) => viewport(surface.host, { width: 600, height: 720 }));
  return Object.freeze({
    width: Math.max(...sizes.map((item) => item.width)),
    height: Math.max(...sizes.map((item) => item.height)),
  });
}

function refresh(context) {
  const nextViewport = commonViewport(context);
  for (const surface of context.surfaces) {
    surface.workspace.setViewport(nextViewport);
    decorateSurface(context, surface);
  }
  context.viewportController.refreshBases();
}

function observe(context) {
  const Observer = context.resizeObserverFactory ?? globalThis.ResizeObserver;
  if (typeof Observer !== 'function') return null;
  const observer = new Observer(() => { if (!context.disposed) refresh(context); });
  observer.observe(context.host);
  return observer;
}

function mount(context) {
  if (context.mode === 'overlay') {
    context.surfaces.push(createSurface(context, context.host, 'overlay'));
  } else {
    const elements = sideBySideElements(context);
    context.container = elements.container;
    context.surfaces.push(createSurface(context, elements.source.host, 'source', 'A'));
    context.surfaces.push(createSurface(context, elements.target.host, 'target', 'B'));
  }
  context.viewportController = createRevisionCompareSvgViewport({
    initialState: context.initialViewportState,
    onChange: context.onViewportChange,
  });
  for (const surface of context.surfaces) {
    context.viewportController.attachSurface(surface.id, surface.workspace.root);
    decorateSurface(context, surface);
  }
  context.resizeObserver = observe(context);
}

function disposeContext(context) {
  if (context.disposed) return false;
  context.disposed = true;
  context.resizeObserver?.disconnect?.();
  context.viewportController?.dispose();
  for (const surface of context.surfaces) {
    surface.unsubscribeSelection?.();
    surface.workspace?.destroy();
    surface.sceneSource?.dispose();
  }
  context.surfaces.length = 0;
  context.container?.remove();
  return true;
}

export function createRevisionCompareSvgSurfaceRuntime(options = {}) {
  const context = {
    host: requiredHost(options.host),
    mode: options.mode === 'side-by-side' ? 'side-by-side' : 'overlay',
    sceneForSide: options.sceneForSide,
    entities: options.entities,
    selectedIds: [...(options.selectedIds ?? [])],
    statusByObjectId: { ...(options.statusByObjectId ?? {}) },
    workspaceFactory: options.workspaceFactory,
    resizeObserverFactory: options.resizeObserverFactory,
    initialViewportState: options.initialViewportState,
    onViewportChange: options.onViewportChange,
    onSelection: options.onSelection,
    surfaces: [], container: null, viewportController: null, resizeObserver: null,
    syncingSelection: false, disposed: false,
  };
  if (typeof context.sceneForSide !== 'function' || typeof context.entities !== 'function') {
    throw new TypeError('Revision Compare SVG runtime requires scene and entity providers.');
  }
  try { mount(context); } catch (error) { disposeContext(context); throw error; }
  return Object.freeze({
    setSceneForSide(provider, reason = 'revision-compare-scene') {
      context.sceneForSide = provider;
      for (const surface of context.surfaces) surface.sceneSource.setSnapshot(provider(surface.side), reason);
      for (const surface of context.surfaces) decorateSurface(context, surface);
      return context.viewportController.refreshBases();
    },
    setStatuses(value) {
      context.statusByObjectId = { ...(value ?? {}) };
      for (const surface of context.surfaces) decorateSurface(context, surface);
    },
    setSelection(ids) {
      context.selectedIds = [...(ids ?? [])];
      syncSelection(context);
    },
    resetViewport: (reason) => context.viewportController.reset(reason),
    getViewportState: () => context.viewportController.getState(),
    getEvidence() {
      const visible = {};
      const hidden = {};
      for (const surface of context.surfaces) {
        visible[surface.id] = context.entities().filter((entity) => !hiddenForSurface(entity, surface)).length;
        hidden[surface.id] = context.entities().filter((entity) => hiddenForSurface(entity, surface)).length;
      }
      return Object.freeze({
        mode: context.mode,
        roots: context.surfaces.length,
        observers: context.resizeObserver ? 1 : 0,
        selectionSubscriptions: context.surfaces.length,
        viewportListeners: context.viewportController.getResourceCounts().listeners,
        visibleEntityCounts: Object.freeze(visible),
        hiddenFitAuthorityCounts: Object.freeze(hidden),
      });
    },
    refresh: () => refresh(context),
    dispose: () => disposeContext(context),
  });
}
