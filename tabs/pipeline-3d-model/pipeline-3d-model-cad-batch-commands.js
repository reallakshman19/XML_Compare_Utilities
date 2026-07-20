import { SnapshotCommand } from './pipeline-3d-model-cad-commands.js';

export const PIPELINE_CAD_BATCH_OPERATION = Object.freeze({
  TABLE2_ELEVATION: 'TABLE2_GEOMETRY_ELEVATION',
  TABLE3_MARKER_POSITION: 'TABLE3_MARKER_EVIDENCE_POSITION',
  DELETE: 'DELETE_PROFILE_ROWS',
});

function uniqueChanges(changes, valueKey) {
  const seen = new Set();
  return Object.freeze((changes || []).map((change) => {
    const id = String(change?.id ?? '').trim();
    const value = Number(change?.[valueKey]);
    if (!id || !Number.isFinite(value)) throw new TypeError(`Batch ${valueKey} changes require id and finite value.`);
    if (seen.has(id)) throw new Error(`Duplicate batch entity: ${id}`);
    seen.add(id);
    return Object.freeze({ id, [valueKey]: value });
  }));
}

function requireRows(model, changes, sourceTable) {
  for (const change of changes) {
    const row = model.findRow(change.id);
    if (!row || row.sourceTable !== sourceTable) {
      throw new Error(`Batch entity ${change.id} is not compatible with ${sourceTable}.`);
    }
  }
}

export function moveTable2ElevationRowsCommand(model, changes) {
  const rows = uniqueChanges(changes, 'elevationValue');
  if (!rows.length) throw new Error('Table 2 batch move requires at least one row.');
  requireRows(model, rows, 'table2a');
  return new SnapshotCommand(model, `Move ${rows.length} Table 2 elevations`, (target) => {
    rows.forEach((row) => target.moveTable2Elevation(row.id, row.elevationValue));
  });
}

export function moveTable3MarkerRowsCommand(model, changes) {
  const rows = uniqueChanges(changes, 'absoluteH');
  if (!rows.length) throw new Error('Table 3 marker batch move requires at least one row.');
  requireRows(model, rows, 'table3c');
  return new SnapshotCommand(model, `Move ${rows.length} Table 3 markers`, (target) => {
    rows.forEach((row) => target.moveMarker(row.id, row.absoluteH));
    target.table3MarkerRows.sort((left, right) => (left.absoluteH ?? Infinity) - (right.absoluteH ?? Infinity));
  });
}

function validateDeleteRows(model, ids) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!unique.length) throw new Error('Batch deletion requires at least one entity.');
  const rows = unique.map((id) => model.findRow(id));
  if (rows.some((row) => !row)) throw new Error('Batch deletion contains an unknown profile row.');
  if (rows.some((row) => !['table2a', 'table3b', 'table3c'].includes(row.sourceTable))) {
    throw new Error('Batch deletion contains a non-editable authority row.');
  }
  const deleting = new Set(unique);
  const anchors = model.table2Rows.filter((row) => !deleting.has(row.id)
    && Number.isFinite(row.stationValue) && Number.isFinite(row.basisH));
  if (anchors.length < 2) throw new Error('Batch deletion would invalidate Table 2 station authority.');
  return Object.freeze(unique);
}

export function deleteProfileRowsCommand(model, ids) {
  const rowIds = validateDeleteRows(model, ids);
  return new SnapshotCommand(model, `Delete ${rowIds.length} profile rows`, (target) => {
    rowIds.forEach((id) => target.deleteRow(id));
  });
}

export const _test = Object.freeze({ uniqueChanges, validateDeleteRows });
