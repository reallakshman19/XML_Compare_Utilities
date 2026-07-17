import { SnapshotCommand } from './pipeline-3d-model-cad-commands.js';

function uniqueIds(ids = []) {
  return [...new Set((ids || []).map(String).filter(Boolean))];
}

function normalizedEdits(edits = [], valueKey) {
  const next = new Map();
  for (const edit of edits || []) {
    const id = String(edit?.id || '');
    const value = Number(edit?.[valueKey]);
    if (id && Number.isFinite(value)) next.set(id, Object.freeze({ id, [valueKey]: value }));
  }
  return Object.freeze([...next.values()]);
}

function requireBatch(values, label) {
  if (!values.length) throw new TypeError(`${label} requires at least one valid row.`);
  return values;
}

export function deleteProfileRowsCommand(model, ids = []) {
  const rowIds = requireBatch(uniqueIds(ids), 'Batch delete');
  return new SnapshotCommand(model, `Delete ${rowIds.length} profile rows`, (target) => {
    for (const id of rowIds) {
      if (target.findRow?.(id)) target.deleteRow(id);
    }
  });
}

export function moveTable2RowsCommand(model, edits = []) {
  const rows = requireBatch(normalizedEdits(edits, 'elevation'), 'Table 2 batch move');
  return new SnapshotCommand(model, `Move ${rows.length} Table 2 rows`, (target) => {
    for (const row of rows) {
      if (target.findRow?.(row.id)) target.moveTable2Elevation(row.id, row.elevation);
    }
  });
}

export function moveTable3DepthRowsCommand(model, edits = []) {
  const rows = requireBatch(normalizedEdits(edits, 'z'), 'Table 3 depth batch move');
  return new SnapshotCommand(model, `Move ${rows.length} Table 3 depth rows`, (target) => {
    for (const row of rows) {
      if (target.findRow?.(row.id)) target.moveDepth(row.id, row.z);
    }
  });
}

export function moveTable3MarkerRowsCommand(model, edits = []) {
  const rows = requireBatch(normalizedEdits(edits, 'absoluteH'), 'Table 3 marker batch move');
  return new SnapshotCommand(model, `Move ${rows.length} Table 3 markers`, (target) => {
    for (const row of rows) {
      if (target.findRow?.(row.id)) target.moveMarker(row.id, row.absoluteH);
    }
  });
}

export const _test = Object.freeze({ normalizedEdits, uniqueIds });
