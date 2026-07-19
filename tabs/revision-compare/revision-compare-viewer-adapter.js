/** Sole Revision Compare bridge to interchangeable read-only viewer backends. */
import { createWorkbenchViewer } from '../../workbench3d/viewer/workbench-viewer.js';
import { createRevisionCompareEngineeringSvgViewer } from './revision-compare-engineering-svg-viewer.js';
import {
  REVISION_COMPARE_VIEWER_BACKEND,
  normalizeRevisionCompareViewerBackend,
} from './revision-compare-viewer-backend.js';
import { createRevisionCompareViewerFactory } from './revision-compare-viewer-contract.js';

function differenceIndex(audit) {
  const index = new Map();
  for (const row of audit?.differenceRows ?? []) {
    if (row.visualRefs.sourceObjectId) index.set(row.visualRefs.sourceObjectId, row.differenceId);
    if (row.visualRefs.targetObjectId) index.set(row.visualRefs.targetObjectId, row.differenceId);
  }
  return index;
}
function rowById(audit, id) { return audit?.differenceRows.find((item) => item.differenceId === id) ?? null; }
function relatedObjectIds(row) { return [row?.visualRefs?.sourceObjectId, row?.visualRefs?.targetObjectId].filter(Boolean); }
function previewObjectIds(context) {
  if (!context.previewSourceDifferenceId || context.previewSourceDifferenceId !== context.selectedDifferenceId) return null;
  const source = rowById(context.audit, context.previewSourceDifferenceId); const target = rowById(context.audit, context.previewTargetDifferenceId);
  return [source?.visualRefs?.sourceObjectId, target?.visualRefs?.targetObjectId].filter(Boolean);
}
function picked(context, pick) {
  if (!pick?.objectId) { context.options.onPick?.(null); return; }
  context.options.onPick?.(differenceIndex(context.audit).get(pick.objectId) ?? null);
}
function safeSnapshot(viewer) {
  try { return JSON.parse(JSON.stringify(viewer?.getStateSnapshot?.() ?? null)); } catch { return null; }
}
function disposeActive(context) {
  if (!context.viewer) return false;
  const snapshot = safeSnapshot(context.viewer);
  if (snapshot) context.snapshots[context.activeBackend] = snapshot;
  context.viewer.dispose();
  Object.assign(context, { viewer: null, activeBackend: null, host: null });
  return true;
}
function factoryFor(context, backend) { return context.factories[backend]; }
async function createViewer(context, hostElement, generation) {
  const backend = context.requestedBackend;
  try {
    const created = await factoryFor(context, backend)(hostElement, {
      onPick: (pick) => picked(context, pick),
      onRuntimeError: (error) => context.options.onError?.(error),
      initialSnapshot: context.snapshots[backend] ?? null,
    });
    if (context.disposed || generation !== context.generation || context.requestedBackend !== backend) {
      created.dispose(); return null;
    }
    context.viewer = created; context.activeBackend = backend; context.host = hostElement; context.failure = null;
    return created;
  } catch (error) {
    if (generation === context.generation) context.failure = error;
    context.options.onError?.(error); return null;
  }
}
async function ensureViewer(context, hostElement) {
  if (context.disposed) return null;
  if (context.viewer && context.activeBackend !== context.requestedBackend) disposeActive(context);
  if (context.viewer) { context.viewer.reattach(hostElement); context.host = hostElement; return context.viewer; }
  if (context.pending?.generation === context.generation) return context.pending.promise;
  const generation = context.generation;
  const record = { generation, promise: null };
  record.promise = createViewer(context, hostElement, generation).finally(() => {
    if (context.pending === record) context.pending = null;
  });
  context.pending = record;
  return record.promise;
}
function applySelection(context) {
  if (!context.viewer) return;
  const ids = previewObjectIds(context) ?? relatedObjectIds(rowById(context.audit, context.selectedDifferenceId));
  context.viewer.setSelection(ids[0] ?? null, ids.slice(1));
}
function applyAudit(context) {
  if (!context.viewer || !context.audit) return;
  context.viewer.setModels({ source: context.audit.visualModels.revA, target: context.audit.visualModels.revB });
  context.viewer.setStatuses(new Map(Object.entries(context.audit.visualModels.statusByObjectId)));
  context.viewer.setMode(context.presentationMode); context.viewer.setVerticalAxis(context.audit.visualModels.revA.verticalAxis); applySelection(context);
}
async function renderViewer(context, hostElement, audit) {
  context.audit = audit; const active = await ensureViewer(context, hostElement); if (!active) return false; applyAudit(context); return true;
}
function clearViewer(context) {
  context.generation += 1;
  context.pending = null;
  disposeActive(context);
  Object.assign(context, { audit: null, failure: null, selectedDifferenceId: null, previewSourceDifferenceId: null, previewTargetDifferenceId: null });
}
function setBackend(context, value) {
  const backend = normalizeRevisionCompareViewerBackend(value);
  if (backend === context.requestedBackend) return false;
  context.requestedBackend = backend; context.generation += 1; disposeActive(context); context.failure = null;
  if (backend === REVISION_COMPARE_VIEWER_BACKEND.SVG) context.presentationMode = 'overlay';
  return true;
}
function evidence(context) {
  return Object.freeze({
    mounted: Boolean(context.viewer), failed: Boolean(context.failure), error: context.failure?.message ?? null,
    viewerBackend: context.requestedBackend, activeBackend: context.activeBackend,
    presentationMode: context.presentationMode, selectedDifferenceId: context.selectedDifferenceId,
    previewSourceDifferenceId: context.previewSourceDifferenceId, previewTargetDifferenceId: context.previewTargetDifferenceId,
    viewer: context.viewer?.getStateSnapshot?.() ?? null,
  });
}
export function createRevisionCompareViewerAdapter(options = {}) {
  const webglFactory = options.webglViewerFactory ?? options.viewerFactory ?? createWorkbenchViewer;
  const context = {
    options,
    factories: {
      WEBGL: createRevisionCompareViewerFactory(webglFactory, 'Revision Compare WebGL viewer'),
      SVG: createRevisionCompareViewerFactory(options.svgViewerFactory ?? createRevisionCompareEngineeringSvgViewer, 'Revision Compare SVG viewer'),
    },
    viewer: null, host: null, pending: null, failure: null, audit: null, presentationMode: 'overlay',
    requestedBackend: REVISION_COMPARE_VIEWER_BACKEND.WEBGL, activeBackend: null, snapshots: {}, generation: 0,
    selectedDifferenceId: null, previewSourceDifferenceId: null, previewTargetDifferenceId: null, disposed: false,
  };
  return Object.freeze({
    render: (host, audit) => renderViewer(context, host, audit),
    setBackend: (backend) => setBackend(context, backend),
    setPresentationMode: (mode) => { context.presentationMode = mode === 'side-by-side' && context.requestedBackend !== REVISION_COMPARE_VIEWER_BACKEND.SVG ? 'side-by-side' : 'overlay'; context.viewer?.setMode(context.presentationMode); },
    selectDifference: (id) => { context.selectedDifferenceId = id ?? null; if (context.previewSourceDifferenceId !== context.selectedDifferenceId) { context.previewSourceDifferenceId = null; context.previewTargetDifferenceId = null; } applySelection(context); },
    previewPair: (sourceDifferenceId, targetDifferenceId) => { context.previewSourceDifferenceId = sourceDifferenceId ?? null; context.previewTargetDifferenceId = targetDifferenceId ?? null; applySelection(context); },
    clearPreview: () => { context.previewSourceDifferenceId = null; context.previewTargetDifferenceId = null; applySelection(context); },
    fitSelected: () => { if (context.viewer && context.selectedDifferenceId) context.viewer.fitSelection(); },
    fitAll: () => context.viewer?.fitAll(), clear: () => clearViewer(context),
    dispose: () => { if (context.disposed) return false; clearViewer(context); context.disposed = true; return true; }, evidence: () => evidence(context),
  });
}
export const _test = Object.freeze({ differenceIndex, previewObjectIds, relatedObjectIds, safeSnapshot });
