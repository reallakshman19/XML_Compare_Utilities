/** Lifecycle owner for certified-node stretch preview, request import and supervised application. */
import { createSequentialNodeStretchApplicationService } from './sequential-node-stretch-application.js';
import { createSequentialNodeStretchApplicationPanel } from './sequential-node-stretch-application-panel.js';
import { createSequentialNodeStretchDraftStore } from './sequential-node-stretch-draft.js';
import { createSequentialNodeStretchPanel } from './sequential-node-stretch-panel.js';
import {
  createSequentialNodeStretchRequestPlan,
  parseSequentialNodeStretchRequestText,
  sequentialNodeStretchRequestPreviewInput,
} from './sequential-node-stretch-request-adapter.js';
import { createSequentialNodeStretchRequestPanel } from './sequential-node-stretch-request-panel.js';
import {
  createSequentialNodeStretchTarget,
  selectSequentialNodeStretchComponent,
  validateSequentialNodeStretchTarget,
} from './sequential-node-stretch-target.js';

export const SEQUENTIAL_NODE_STRETCH_FEATURE_SCHEMA = 'SequentialNodeStretchFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}

function requiredMethods(value, names, label) {
  names.forEach((name) => requiredFunction(value?.[name], `${label}.${name}`)); return value;
}

function targetInput(state) {
  return { readModel: state.readModel(), scene: state.readScene() };
}

function exactTarget(state) {
  if (!state.target) throw new RangeError('Select one qualified port-bearing node before stretch preview.');
  state.target = validateSequentialNodeStretchTarget(state.target, {
    selection: state.selection,
    ...targetInput(state),
  });
  return state.target;
}

function renderPreview(state, preview, notice = null) {
  state.panel.setPreview(preview, notice);
  state.applicationPanel.setPreview(preview);
  state.onDraftChanged(state.draftStore.getDraft());
  return preview;
}

function stagePreview(state, nodeId, input = {}) {
  if (!state.target || state.target.nodeId !== nodeId) selectNode(state, nodeId);
  const preview = state.draftStore.stage({ ...input, target: exactTarget(state) });
  return renderPreview(state, preview, 'Node stretch preview created. Nothing was published.');
}

function cancelPreview(state, reason = 'cancelled') {
  if (state.destroyed) return null;
  state.draftStore.cancel(reason);
  state.applicationPanel.invalidate(`Node stretch application invalidated: ${reason}.`);
  state.panel.setPreview(null, `Node stretch preview cleared: ${reason}.`);
  state.onDraftChanged(null); return null;
}

function selectNode(state, nodeId) {
  if (!state.selection) throw new RangeError('Select a confirmed component before a stretch node.');
  cancelPreview(state, 'node-change');
  state.target = createSequentialNodeStretchTarget({
    selection: state.selection,
    nodeId,
    ...targetInput(state),
  });
  return state.target;
}

function selectComponent(state, objectId) {
  if (state.destroyed) throw new Error('Node stretch feature is destroyed.');
  clearTarget(state, 'component-change');
  state.selection = selectSequentialNodeStretchComponent({ objectId, ...targetInput(state) });
  state.panel.setSelection(state.selection);
  const first = state.selection.nodes[0];
  state.target = createSequentialNodeStretchTarget({
    selection: state.selection,
    nodeId: first.nodeId,
    ...targetInput(state),
  });
  return state.selection;
}

function clearTarget(state, reason = null) {
  if (state.destroyed) return null;
  if (state.draftStore.getPreview()) cancelPreview(state, reason || 'target-cleared');
  else state.applicationPanel.invalidate(reason || 'Node stretch target cleared.');
  state.selection = null; state.target = null; state.panel.clear(reason);
  state.onDraftChanged(null); return null;
}

function setFeatureActive(state, value) {
  state.active = value === true && !state.destroyed;
  if (!state.active) clearTarget(state, 'Node stretch cleared because mode or Draft Edit 3D closed.');
  state.panel.setActive(state.active); state.requestPanel.setActive(state.active);
  state.applicationPanel.setActive(state.active); return state.active;
}

function currentSelection(state) {
  return Object.freeze({
    selectedObjectId: state.selection?.selectedObjectId || null,
    sequentialNodeId: state.target?.nodeId || null,
  });
}

async function readRequestFile(file) {
  if (!file || typeof file.text !== 'function') throw new TypeError('Validator request file is required.');
  return parseSequentialNodeStretchRequestText(await file.text());
}

function stageRequestPreview(state, input = {}) {
  const plan = createSequentialNodeStretchRequestPlan(input);
  const previewInput = sequentialNodeStretchRequestPreviewInput(plan);
  selectComponent(state, previewInput.selectedObjectId);
  selectNode(state, previewInput.sequentialNodeId);
  const preview = stagePreview(state, previewInput.sequentialNodeId, previewInput.stageInput);
  state.requestPanel.setRequest(input.request,
    `Request preview created for ${previewInput.sequentialNodeId}. Nothing was published.`);
  return Object.freeze({ plan, preview });
}

function createApplication(state) {
  const boundary = state.geometryEditBoundary;
  state.applicationService = createSequentialNodeStretchApplicationService({
    readCurrentState: boundary.readCurrentState,
    readView: boundary.readView,
    readJournal: boundary.readJournal,
    publishCandidate: boundary.publishCandidate,
    now: state.applicationNow,
  });
  return createSequentialNodeStretchApplicationPanel({
    root: state.root,
    onPrepare: state.applicationService.prepare,
    onAccept: state.applicationService.accept,
    onCommitted: () => clearTarget(state, 'accepted-node-stretch'),
  });
}

function createRequestPanel(state) {
  return createSequentialNodeStretchRequestPanel({
    root: state.root,
    onReadRequest: readRequestFile,
    onCurrentSelection: () => currentSelection(state),
    onPreviewRequest: (input) => stageRequestPreview(state, input),
  });
}

function destroyFeature(state) {
  if (state.destroyed) return false;
  state.window?.removeEventListener('keydown', state.keyHandler);
  state.selection = null; state.target = null; state.active = false;
  state.requestPanel.destroy(); state.applicationPanel.destroy();
  state.panel.destroy(); state.draftStore.destroy();
  state.onDraftChanged(null); state.destroyed = true; return true;
}

function initializeState(options) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Node stretch feature requires a root.');
  const state = {
    root, window: root.ownerDocument.defaultView,
    readScene: requiredFunction(options.readScene, 'readScene'),
    readModel: requiredFunction(options.readModel, 'readModel'),
    onDraftChanged: requiredFunction(options.onDraftChanged, 'onDraftChanged'),
    geometryEditBoundary: requiredMethods(options.geometryEditBoundary,
      ['readCurrentState', 'readView', 'readJournal', 'publishCandidate'], 'geometryEditBoundary'),
    applicationNow: requiredFunction(options.applicationNow, 'applicationNow'),
    draftStore: createSequentialNodeStretchDraftStore(),
    selection: null, target: null, active: false, destroyed: false,
  };
  state.panel = createSequentialNodeStretchPanel({
    root,
    onPreview: (nodeId, input) => stagePreview(state, nodeId, input),
    onCancel: (reason) => cancelPreview(state, reason),
    onNodeChange: (nodeId) => { if (nodeId) selectNode(state, nodeId); },
  });
  state.applicationPanel = createApplication(state);
  state.requestPanel = createRequestPanel(state);
  state.keyHandler = (event) => {
    if (event.key === 'Escape' && (state.selection || state.draftStore.getPreview())) {
      cancelPreview(state, 'escape');
    }
  };
  state.window?.addEventListener('keydown', state.keyHandler);
  return state;
}

function stateSnapshot(state) {
  return Object.freeze({
    active: state.active,
    componentId: state.selection?.componentId || null,
    nodeId: state.target?.nodeId || null,
    operationId: state.draftStore.getPreview()?.operationId || null,
    panel: state.panel.getState(),
    request: state.requestPanel.getState(),
    application: state.applicationPanel.getState(),
    destroyed: state.destroyed,
  });
}

export function createSequentialNodeStretchFeature(options = {}) {
  const state = initializeState(options);
  return Object.freeze({
    schema: SEQUENTIAL_NODE_STRETCH_FEATURE_SCHEMA,
    setActive: (value) => setFeatureActive(state, value),
    select: (objectId) => selectComponent(state, objectId),
    selectNode: (nodeId) => selectNode(state, nodeId),
    importRequest: (input) => stageRequestPreview(state, input),
    clearTarget: (reason) => clearTarget(state, reason),
    cancel: (reason) => cancelPreview(state, reason),
    invalidate: (reason) => clearTarget(state, reason),
    getDraft: state.draftStore.getDraft,
    getPreview: state.draftStore.getPreview,
    getState: () => stateSnapshot(state),
    destroy: () => destroyFeature(state),
  });
}
