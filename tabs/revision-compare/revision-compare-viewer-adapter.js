/** The sole qualified bridge from Revision Compare contracts to the read-only Workbench renderer. */
import { createWorkbenchViewer } from '../../workbench3d/viewer/workbench-viewer.js';

function differenceIndex(audit) {
  const index = new Map();
  for (const row of audit?.differenceRows ?? []) {
    if (row.visualRefs.sourceObjectId) index.set(row.visualRefs.sourceObjectId, row.differenceId);
    if (row.visualRefs.targetObjectId) index.set(row.visualRefs.targetObjectId, row.differenceId);
  }
  return index;
}
function relatedObjectIds(row) { return [row?.visualRefs?.sourceObjectId, row?.visualRefs?.targetObjectId].filter(Boolean); }
function picked(context, pick) {
  if (!pick?.objectId) { context.options.onPick?.(null); return; }
  context.options.onPick?.(differenceIndex(context.audit).get(pick.objectId) ?? null);
}
async function createViewer(context, hostElement) {
  try {
    const created = await context.viewerFactory(hostElement, {
      onPick: (pick) => picked(context, pick), onRuntimeError: (error) => context.options.onError?.(error),
    });
    if (context.disposed || context.host !== hostElement) { created.dispose(); return null; }
    context.viewer = created; context.failure = null; return created;
  } catch (error) { context.failure = error; context.options.onError?.(error); return null; }
}
async function ensureViewer(context, hostElement) {
  if (context.disposed) return null;
  if (context.viewer) { context.viewer.reattach?.(hostElement); context.host = hostElement; return context.viewer; }
  if (context.pending && context.host === hostElement) return context.pending;
  context.host = hostElement; context.pending = createViewer(context, hostElement).finally(() => { context.pending = null; });
  return context.pending;
}
function applySelection(context) {
  if (!context.viewer) return;
  const row = context.audit?.differenceRows.find((item) => item.differenceId === context.selectedDifferenceId);
  const ids = relatedObjectIds(row); context.viewer.setSelection(ids[0] ?? null, ids.slice(1));
}
function applyAudit(context) {
  if (!context.viewer || !context.audit) return;
  context.viewer.setModels({ source: context.audit.visualModels.revA, target: context.audit.visualModels.revB });
  context.viewer.setStatuses(new Map(Object.entries(context.audit.visualModels.statusByObjectId)));
  context.viewer.setMode(context.presentationMode); context.viewer.setVerticalAxis?.(context.audit.visualModels.revA.verticalAxis); applySelection(context);
}
async function renderViewer(context, hostElement, audit) {
  context.audit = audit; const active = await ensureViewer(context, hostElement);
  if (!active) return false; applyAudit(context); return true;
}
function clearViewer(context) {
  context.viewer?.dispose();
  Object.assign(context, { viewer: null, host: null, pending: null, audit: null, failure: null, selectedDifferenceId: null });
}
function evidence(context) {
  return Object.freeze({
    mounted: Boolean(context.viewer), failed: Boolean(context.failure), error: context.failure?.message ?? null,
    presentationMode: context.presentationMode, selectedDifferenceId: context.selectedDifferenceId,
    viewer: context.viewer?.getStateSnapshot?.() ?? null,
  });
}
export function createRevisionCompareViewerAdapter(options = {}) {
  const context = {
    options, viewerFactory: options.viewerFactory ?? createWorkbenchViewer, viewer: null, host: null,
    pending: null, failure: null, audit: null, presentationMode: 'overlay', selectedDifferenceId: null, disposed: false,
  };
  return Object.freeze({
    render: (host, audit) => renderViewer(context, host, audit),
    setPresentationMode: (mode) => { context.presentationMode = mode === 'side-by-side' ? 'side-by-side' : 'overlay'; context.viewer?.setMode(context.presentationMode); },
    selectDifference: (id) => { context.selectedDifferenceId = id ?? null; applySelection(context); },
    fitSelected: () => { if (context.viewer && context.selectedDifferenceId) context.viewer.fitSelection(); },
    fitAll: () => context.viewer?.fitAll(), clear: () => clearViewer(context),
    dispose: () => { if (context.disposed) return; clearViewer(context); context.disposed = true; }, evidence: () => evidence(context),
  });
}
export const _test = Object.freeze({ differenceIndex, relatedObjectIds });
