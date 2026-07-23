/** Sole Revision Compare bridge to interchangeable read-only viewer backends. */
import { createEngineeringViewerController } from '../../core/engineering-viewer/index.js';
import { createWorkbenchViewer } from '../../workbench3d/viewer/workbench-viewer.js';
import { createRevisionCompareEngineeringSvgViewer } from './revision-compare-engineering-svg-viewer.js';
import { deepFreeze } from './revision-contract-utils.js';
import {
  REVISION_COMPARE_VIEWER_BACKEND,
  normalizeRevisionCompareViewerBackend,
} from './revision-compare-viewer-backend.js';
import { createRevisionCompareViewerFactory } from './revision-compare-viewer-contract.js';
import {
  REVISION_COMPARE_DEFAULT_VIEWER_POLICY,
  createRevisionCompareViewerPolicy,
} from './revision-compare-viewer-policy.js';

function indexAudit(context, audit) {
  context.differenceByObjectId = new Map();
  context.rowByDifferenceId = new Map();
  for (const row of audit?.differenceRows ?? []) {
    context.rowByDifferenceId.set(row.differenceId, row);
    if (row.visualRefs.sourceObjectId) context.differenceByObjectId.set(row.visualRefs.sourceObjectId, row.differenceId);
    if (row.visualRefs.targetObjectId) context.differenceByObjectId.set(row.visualRefs.targetObjectId, row.differenceId);
  }
}
function rowById(context, id) { return context.rowByDifferenceId.get(id) ?? null; }
function relatedObjectIds(row) { return [row?.visualRefs?.sourceObjectId, row?.visualRefs?.targetObjectId].filter(Boolean); }
function previewObjectIds(context) {
  if (!context.previewSourceDifferenceId || context.previewSourceDifferenceId !== context.selectedDifferenceId) return null;
  const source = rowById(context, context.previewSourceDifferenceId);
  const target = rowById(context, context.previewTargetDifferenceId);
  return [source?.visualRefs?.sourceObjectId, target?.visualRefs?.targetObjectId].filter(Boolean);
}
function picked(context, pick) {
  if (!pick?.objectId) { context.options.onPick?.(null); return; }
  context.options.onPick?.(context.differenceByObjectId.get(pick.objectId) ?? null);
}
function jsonCopy(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}
function safeSnapshot(viewer) { return jsonCopy(viewer?.getStateSnapshot?.() ?? null); }

function applySelection(context) {
  const ids = previewObjectIds(context) ?? relatedObjectIds(rowById(context, context.selectedDifferenceId));
  context.controller.setSelection(ids[0] ?? null, ids.slice(1));
}

function presentation(context) {
  return Object.freeze({ audit: context.audit, mode: context.presentationMode });
}

function applyPresentation(viewer, value) {
  viewer.setModels({ source: value.audit.visualModels.revA, target: value.audit.visualModels.revB });
  viewer.setStatuses(new Map(Object.entries(value.audit.visualModels.statusByObjectId)));
  viewer.setMode(value.mode);
  viewer.setVerticalAxis(value.audit.visualModels.revA.verticalAxis);
}

async function renderViewer(context, hostElement, audit) {
  context.audit = audit; indexAudit(context, audit);
  context.host = hostElement;
  applySelection(context);
  return context.controller.render(hostElement, presentation(context));
}

function clearViewer(context) {
  context.controller.clear();
  Object.assign(context, { audit: null, host: null, selectedDifferenceId: null,
    previewSourceDifferenceId: null, previewTargetDifferenceId: null });
  context.differenceByObjectId.clear(); context.rowByDifferenceId.clear();
}

function setBackend(context, value) {
  const backend = normalizeRevisionCompareViewerBackend(value);
  if (!context.policy.retainedBackends.includes(backend)) throw new TypeError(`Viewer backend ${backend} is not retained by policy.`);
  return context.controller.setBackend(backend);
}

function setPresentationMode(context, value) {
  context.presentationMode = value === 'side-by-side' ? 'side-by-side' : 'overlay';
  if (!context.audit || !context.host || !context.controller.evidence().mounted) return true;
  context.controller.render(context.host, presentation(context));
  return !context.controller.evidence().failed;
}

function evidence(context) {
  const lifecycle = context.controller.evidence();
  return deepFreeze({
    mounted: lifecycle.mounted, failed: lifecycle.failed, error: lifecycle.error,
    viewerBackend: lifecycle.requestedBackend, activeBackend: lifecycle.activeBackend,
    presentationMode: context.presentationMode, selectedDifferenceId: context.selectedDifferenceId,
    previewSourceDifferenceId: context.previewSourceDifferenceId, previewTargetDifferenceId: context.previewTargetDifferenceId,
    policy: context.policy, mountRequests: lifecycle.mountRequests,
    snapshots: lifecycle.snapshots, viewer: lifecycle.viewer,
  });
}

export function createRevisionCompareViewerAdapter(options = {}) {
  const webglFactory = options.webglViewerFactory ?? options.viewerFactory ?? createWorkbenchViewer;
  const policy = createRevisionCompareViewerPolicy(options.viewerPolicy ?? REVISION_COMPARE_DEFAULT_VIEWER_POLICY);
  const context = {
    options, policy, controller: null, host: null, audit: null,
    presentationMode: policy.defaultSvgPresentation,
    selectedDifferenceId: null, previewSourceDifferenceId: null, previewTargetDifferenceId: null,
    differenceByObjectId: new Map(), rowByDifferenceId: new Map(), disposed: false,
  };
  context.controller = createEngineeringViewerController({
    backendIds: policy.retainedBackends,
    initialBackend: policy.defaultBackend,
    factories: {
      WEBGL: createRevisionCompareViewerFactory(webglFactory, 'Revision Compare WebGL viewer'),
      SVG: createRevisionCompareViewerFactory(
        options.svgViewerFactory ?? createRevisionCompareEngineeringSvgViewer,
        'Revision Compare Engineering SVG viewer',
      ),
    },
    applyPresentation,
    onPick: (pick) => picked(context, pick),
    onError: options.onError ?? null,
  });
  return Object.freeze({
    render: (host, audit) => renderViewer(context, host, audit),
    setBackend: (backend) => setBackend(context, backend),
    setPresentationMode: (mode) => setPresentationMode(context, mode),
    selectDifference: (id) => { context.selectedDifferenceId = id ?? null; if (context.previewSourceDifferenceId !== context.selectedDifferenceId) { context.previewSourceDifferenceId = null; context.previewTargetDifferenceId = null; } applySelection(context); },
    previewPair: (sourceDifferenceId, targetDifferenceId) => { context.previewSourceDifferenceId = sourceDifferenceId ?? null; context.previewTargetDifferenceId = targetDifferenceId ?? null; applySelection(context); },
    clearPreview: () => { context.previewSourceDifferenceId = null; context.previewTargetDifferenceId = null; applySelection(context); },
    fitSelected: () => (context.selectedDifferenceId ? context.controller.fitSelection() : false),
    fitAll: () => context.controller.fitAll(),
    clear: () => clearViewer(context),
    dispose: () => {
      if (context.disposed) return false;
      clearViewer(context);
      context.disposed = true;
      return context.controller.dispose();
    },
    evidence: () => evidence(context),
  });
}
export const _test = Object.freeze({ jsonCopy, previewObjectIds, relatedObjectIds, safeSnapshot });
