import {
  deleteProfileRowsCommand,
  moveTable2RowsCommand,
  moveTable3DepthRowsCommand,
  moveTable3MarkerRowsCommand,
} from './pipeline-3d-model-cad-batch-commands.js';

function validEdits(detail = {}) {
  return Array.isArray(detail.edits) ? detail.edits.filter((edit) => edit?.id) : [];
}

export function executePipelineCadBatchMove(controller, detail = {}) {
  if (!controller?.model) return false;
  const edits = validEdits(detail);
  if (!edits.length) return false;
  if (detail.graph === 'table2x') {
    return controller.execute(moveTable2RowsCommand(controller.model, edits), 'move-table2-selection');
  }
  if (detail.entityType === 'marker') {
    return controller.execute(moveTable3MarkerRowsCommand(controller.model, edits), 'move-table3-marker-selection');
  }
  return controller.execute(moveTable3DepthRowsCommand(controller.model, edits), 'move-table3-depth-selection');
}

export function executePipelineCadBatchDelete(controller, detail = {}) {
  if (!controller?.model) return false;
  const ids = [...new Set((detail.entityIds || []).map(String).filter((id) => controller.model.findRow?.(id)))];
  if (!ids.length) return false;
  return controller.execute(deleteProfileRowsCommand(controller.model, ids), 'delete-profile-selection');
}

export function clearPipelineCadBatchOverrides(graph) {
  graph?.visualOverrides?.clear?.();
  graph?.depthOverrides?.clear?.();
  graph?.markerOverrides?.clear?.();
  graph?.groupDrag && (graph.groupDrag = null);
  graph?.render?.();
}

export const _test = Object.freeze({ validEdits });
