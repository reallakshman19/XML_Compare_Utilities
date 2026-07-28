/** Lifecycle owner for support selection, move preparation and supervised history transitions. */
import { createSequentialDraftEditSupportMoveApplyService } from './sequential-draft-edit-support-move-apply.js';
import { createSequentialDraftEditSupportMoveDraftStore } from './sequential-draft-edit-support-move-draft.js';
import { createSequentialDraftEditSupportMovePanel } from './sequential-draft-edit-support-move-panel.js';
import { createSequentialSupportAdjustmentHistoryService } from './sequential-support-adjustment-history-service.js';
import {
  selectSequentialDraftEditSupportMoveTarget,
  validateSequentialDraftEditSupportMoveTarget,
} from './sequential-draft-edit-support-move-target.js';
import { sequentialSupportAdjustmentHistoryCapabilities } from '../support/sequential-support-adjustment-history.js';

export const SEQUENTIAL_DRAFT_EDIT_SUPPORT_MOVE_FEATURE_SCHEMA =
  'SequentialDraftEditSupportMoveFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function requiredBoundary(value) {
  for (const name of [
    'readCurrentState', 'readHistory', 'publishCandidate', 'publishHistoryCandidate',
  ]) requiredFunction(value?.[name], `supportAdjustmentBoundary.${name}`);
  return value;
}

export function createSequentialDraftEditSupportMoveFeature(options = {}) {
  const readScene = requiredFunction(options.readScene, 'readScene');
  const readModel = requiredFunction(options.readModel, 'readModel');
  const adjustmentBoundary = requiredBoundary(options.supportAdjustmentBoundary);
  const onDraftChanged = requiredFunction(options.onDraftChanged, 'onDraftChanged');
  const now = requiredFunction(options.now, 'support adjustment now');
  const draftStore = createSequentialDraftEditSupportMoveDraftStore();
  const applyService = createSequentialDraftEditSupportMoveApplyService({
    readCurrentState: adjustmentBoundary.readCurrentState,
    publishCandidate: adjustmentBoundary.publishCandidate,
    now,
  });
  const historyService = createSequentialSupportAdjustmentHistoryService({
    readCurrentState: adjustmentBoundary.readCurrentState,
    readHistory: adjustmentBoundary.readHistory,
    publishHistoryCandidate: adjustmentBoundary.publishHistoryCandidate,
    now,
  });
  let target = null;
  let prepared = null;
  let active = false;
  let destroyed = false;

  function historyState() {
    const history = adjustmentBoundary.readHistory();
    return history ? sequentialSupportAdjustmentHistoryCapabilities(history) : null;
  }
  function syncHistory() { panel.setHistoryState(historyState()); }
  function targetInput() {
    return {
      readModel: readModel(),
      scene: readScene(),
      currentState: adjustmentBoundary.readCurrentState(),
    };
  }
  function exactTarget() {
    if (!target) throw new RangeError('Select one exact confirmed support before previewing a move draft.');
    target = validateSequentialDraftEditSupportMoveTarget(target, targetInput());
    return target;
  }
  function cancel(reason = 'cancelled') {
    if (destroyed) return null;
    draftStore.cancel(reason); prepared = null;
    panel.setPreview(null); panel.setPrepared(null); syncHistory();
    onDraftChanged(null);
    return null;
  }
  function preview(input = {}) {
    const current = exactTarget();
    const draftPreview = draftStore.stage({ ...input, target: current });
    prepared = applyService.prepare(draftPreview);
    panel.setPreview(draftPreview); panel.setPrepared(prepared); syncHistory();
    onDraftChanged(draftPreview);
    return Object.freeze({ preview: draftPreview, prepared });
  }
  function prepareHistory(input = {}) {
    draftStore.cancel('support-history-prepare');
    target = null; panel.clearTarget(); onDraftChanged(null);
    prepared = historyService.prepare(input);
    panel.setPrepared(prepared); syncHistory();
    return prepared;
  }
  function apply() {
    if (!prepared) throw new RangeError('Prepare and review one exact support operation before Apply.');
    const acceptance = prepared.schema === 'SequentialPreparedSupportAdjustmentHistory.v1'
      ? historyService.accept(prepared)
      : applyService.accept(prepared);
    if (acceptance.accepted) {
      draftStore.cancel('support-operation-applied'); prepared = null; target = null;
      panel.setPreview(null); panel.setPrepared(null); syncHistory();
      onDraftChanged(null);
    }
    return acceptance;
  }
  const panel = createSequentialDraftEditSupportMovePanel({
    root: options.root,
    onPreview: preview,
    onPrepareHistory: prepareHistory,
    onApply: apply,
    onCancel: cancel,
  });
  syncHistory();

  function select(objectId) {
    if (destroyed) throw new Error('Support move feature is destroyed.');
    cancel('target-change');
    target = selectSequentialDraftEditSupportMoveTarget({ objectId, ...targetInput() });
    panel.setTarget(target); syncHistory();
    return target;
  }
  function clearTarget(reason = null) {
    if (destroyed) return null;
    cancel(reason || 'target-cleared');
    target = null;
    panel.clearTarget(reason); syncHistory();
    return null;
  }
  function setActive(value) {
    active = value === true && !destroyed;
    if (!active) clearTarget('Support operation cleared because Draft Edit 3D closed.');
    panel.setActive(active); syncHistory();
    return active;
  }
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_SUPPORT_MOVE_FEATURE_SCHEMA,
    setActive,
    select,
    clearTarget,
    cancel,
    prepareHistory,
    apply,
    invalidate: clearTarget,
    getDraft: draftStore.getDraft,
    getPreview: draftStore.getPreview,
    getPrepared: () => prepared,
    getState: () => Object.freeze({
      active,
      targetId: target?.supportMoveTargetId || null,
      supportId: target?.supportId || null,
      operationId: draftStore.getPreview()?.operationId || null,
      preparedId: prepared?.preparedId || null,
      history: historyState(),
      panel: panel.getState(),
      destroyed,
    }),
    destroy() {
      if (destroyed) return false;
      destroyed = true; target = null; prepared = null; active = false;
      panel.destroy(); draftStore.destroy(); onDraftChanged(null);
      return true;
    },
  });
}
