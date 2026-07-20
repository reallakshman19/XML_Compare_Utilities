import {
  PIPELINE_CAD_BATCH_OPERATION,
  deleteProfileRowsCommand,
  moveTable2ElevationRowsCommand,
  moveTable3MarkerRowsCommand,
} from './pipeline-3d-model-cad-batch-commands.js';

export const PIPELINE_CAD_BATCH_RESULT_SCHEMA = 'PipelineCadBatchResult.v1';

function result(input) {
  return Object.freeze({ schema: PIPELINE_CAD_BATCH_RESULT_SCHEMA, committed: false, skippedIds: Object.freeze([]), ...input });
}

function reject(controller, graph, reason, detail = {}) {
  graph?.clearBatchPreview?.();
  const evidence = result({ reason, operation: detail.operation || null, skippedIds: Object.freeze([...(detail.skippedIds || [])]) });
  controller.dispatchEvent?.(new CustomEvent('batchCommandRejected', { detail: evidence }));
  return evidence;
}

function commandForMove(model, detail) {
  if (detail.graph === 'table2x' && detail.entityType === 'elevation-node') {
    return {
      operation: PIPELINE_CAD_BATCH_OPERATION.TABLE2_ELEVATION,
      command: moveTable2ElevationRowsCommand(model, detail.changes),
    };
  }
  if (detail.graph === 'table3x' && detail.entityType === 'marker') {
    return {
      operation: PIPELINE_CAD_BATCH_OPERATION.TABLE3_MARKER_POSITION,
      command: moveTable3MarkerRowsCommand(model, detail.changes),
    };
  }
  throw new Error('Grouped Table 3 depth/Z movement is not permitted by current Pipeline authority.');
}

function commitMove(state, detail) {
  const graph = state.graphs[detail.graph];
  if (!state.controller.model || !graph || !detail.changes?.length) {
    return reject(state.controller, graph, 'EMPTY_OR_INVALID_BATCH', detail);
  }
  try {
    const planned = commandForMove(state.controller.model, detail);
    state.controller.execute(planned.command, `batch:${planned.operation}`);
    graph.clearBatchPreview?.();
    const evidence = result({
      committed: true,
      reason: 'COMMITTED',
      operation: planned.operation,
      entityIds: Object.freeze(detail.changes.map((change) => change.id)),
      skippedIds: Object.freeze([...(detail.skippedIds || [])].sort()),
    });
    state.controller.dispatchEvent?.(new CustomEvent('batchCommandCommitted', { detail: evidence }));
    return evidence;
  } catch (error) {
    return reject(state.controller, graph, error.message, detail);
  }
}

function deleteSelection(state, selection) {
  const graph = state.graphs[selection?.graph];
  if (!selection?.count || !graph || !state.controller.model) {
    return reject(state.controller, graph, 'EMPTY_OR_INVALID_BATCH', { operation: PIPELINE_CAD_BATCH_OPERATION.DELETE });
  }
  try {
    const command = deleteProfileRowsCommand(state.controller.model, selection.selectedIds);
    state.controller.execute(command, 'batch:DELETE_PROFILE_ROWS');
    graph.clearPipelineCadSelection?.('batch-delete');
    const evidence = result({
      committed: true,
      reason: 'COMMITTED',
      operation: PIPELINE_CAD_BATCH_OPERATION.DELETE,
      entityIds: selection.selectedIds,
    });
    state.controller.dispatchEvent?.(new CustomEvent('batchCommandCommitted', { detail: evidence }));
    return evidence;
  } catch (error) {
    return reject(state.controller, graph, error.message, { operation: PIPELINE_CAD_BATCH_OPERATION.DELETE });
  }
}

export function createPipelineCadBatchController(options = {}) {
  const { controller, graphs } = options;
  if (!controller || !graphs?.table2x || !graphs?.table3x) {
    throw new TypeError('Pipeline CAD batch controller requires controller and both graphs.');
  }
  const state = { controller, graphs, cleanup: [], destroyed: false };
  Object.values(graphs).forEach((graph) => {
    const listener = (event) => commitMove(state, event.detail || {});
    graph.addEventListener('batchMoveRequested', listener);
    state.cleanup.push(() => graph.removeEventListener('batchMoveRequested', listener));
  });
  return Object.freeze({
    commitMove: (detail) => commitMove(state, detail),
    deleteSelection: (selection) => deleteSelection(state, selection),
    destroy() {
      if (state.destroyed) return false;
      state.destroyed = true;
      state.cleanup.splice(0).forEach((dispose) => dispose());
      return true;
    },
  });
}
