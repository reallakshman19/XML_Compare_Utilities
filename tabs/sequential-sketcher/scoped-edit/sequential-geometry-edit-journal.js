/** Immutable branch-local geometry edit journal for accepted Sequential moves. */
import { immutableJson, isIsoTimestamp } from '../../../contracts/contract-values.js';
import {
  sameSequentialContractValue,
  sequentialSemanticFingerprint,
} from './sequential-command-contracts.js';

export const SEQUENTIAL_GEOMETRY_EDIT_JOURNAL_SCHEMA =
  'SequentialGeometryEditJournal.v1';
export const SEQUENTIAL_GEOMETRY_EDIT_ENTRY_SCHEMA =
  'SequentialGeometryEditEntry.v1';
export const SEQUENTIAL_GEOMETRY_EDIT_REJECTION = Object.freeze({
  JOURNAL_INVALID: 'SEQUENTIAL_GEOMETRY_EDIT_JOURNAL_INVALID',
  BASE_STALE: 'SEQUENTIAL_GEOMETRY_EDIT_BASE_STALE',
  ENTRY_INVALID: 'SEQUENTIAL_GEOMETRY_EDIT_ENTRY_INVALID',
  OPERATION_REPLAY: 'SEQUENTIAL_GEOMETRY_EDIT_OPERATION_REPLAY',
});

function fail(code, message, Constructor = RangeError) {
  const error = new Constructor(message); error.code = code; throw error;
}
function text(value, label) {
  const result = String(value ?? '').trim();
  if (!result) fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.ENTRY_INVALID,
    `${label} is required.`, TypeError);
  return result;
}
function finitePoint(value, label) {
  if (!value || !['x', 'y', 'z'].every((axis) => Number.isFinite(value[axis]))) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.ENTRY_INVALID,
      `${label} must contain finite X/Y/Z coordinates.`, TypeError);
  }
  return { x: value.x, y: value.y, z: value.z };
}
function sortedRows(values, key, label) {
  if (!Array.isArray(values)) fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.ENTRY_INVALID,
    `${label} must be an array.`, TypeError);
  const rows = [...values].sort((left, right) => String(left[key]).localeCompare(String(right[key])));
  const ids = rows.map((row) => text(row?.[key], `${label} ${key}`));
  if (new Set(ids).size !== ids.length) fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.ENTRY_INVALID,
    `${label} must have unique ${key} values.`);
  return rows;
}
function positionRows(values, key, label) {
  return sortedRows(values, key, label).map((row) => ({
    [key]: text(row[key], `${label} ${key}`),
    position: finitePoint(row.position, `${label} position`),
  }));
}
function geometryRows(values, label) {
  return sortedRows(values, 'geometryPartId', label).map((row) => ({
    geometryPartId: text(row.geometryPartId, `${label} geometryPartId`),
    geometry: row.geometry,
  }));
}
function sameRowIds(left, right, key) {
  return left.length === right.length
    && left.every((row, index) => row[key] === right[index][key]);
}
function pairedState(beforeInput, afterInput) {
  const before = {
    geometryParts: geometryRows(beforeInput.geometryParts, 'before geometry parts'),
    ports: positionRows(beforeInput.ports, 'portId', 'before ports'),
    nodes: positionRows(beforeInput.nodes, 'nodeId', 'before nodes'),
  };
  const after = {
    geometryParts: geometryRows(afterInput.geometryParts, 'after geometry parts'),
    ports: positionRows(afterInput.ports, 'portId', 'after ports'),
    nodes: positionRows(afterInput.nodes, 'nodeId', 'after nodes'),
  };
  const exact = sameRowIds(before.geometryParts, after.geometryParts, 'geometryPartId')
    && sameRowIds(before.ports, after.ports, 'portId')
    && sameRowIds(before.nodes, after.nodes, 'nodeId');
  if (!exact || !before.geometryParts.length) fail(
    SEQUENTIAL_GEOMETRY_EDIT_REJECTION.ENTRY_INVALID,
    'Geometry entry before/after identity sets must match and contain geometry.',
  );
  return { before, after };
}
function operatorRecord(value = {}) {
  const appliedAt = text(value.appliedAt, 'appliedAt');
  if (!isIsoTimestamp(appliedAt)) fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.ENTRY_INVALID,
    'Geometry edit appliedAt must be an exact ISO timestamp.', TypeError);
  return {
    actorId: text(value.actorId, 'actorId'),
    reason: text(value.reason, 'reason'),
    evidenceNote: String(value.evidenceNote || '').trim() || null,
    appliedAt,
  };
}
function baseMaterial(snapshot) {
  return {
    branch: snapshot.branch,
    confirmedConstructionFingerprint: snapshot.authority.confirmedConstructionFingerprint,
    components: snapshot.components.map((row) => ({
      componentId: row.componentId, canonicalType: row.canonicalType,
      portIds: row.portIds, nodeIds: row.nodeIds, geometryPartIds: row.geometryPartIds,
    })),
    ports: snapshot.ports.map((row) => ({
      portId: row.portId, componentId: row.componentId, nodeId: row.nodeId,
      position: row.position,
    })),
    nodes: snapshot.nodes.map((row) => ({
      nodeId: row.nodeId, incidentComponentIds: row.incidentComponentIds,
      position: row.position,
    })),
    geometryParts: snapshot.geometryParts.map((row) => ({
      geometryPartId: row.geometryPartId, componentId: row.componentId,
      geometry: row.geometry,
    })),
    internalEdges: snapshot.internalEdges,
    committedConnections: snapshot.committedConnections,
    repairs: snapshot.repairs,
  };
}
export function sequentialGeometryEditBaseFingerprint(snapshot) {
  if (snapshot?.schema !== 'SequentialEditableTopologySnapshot.v1') {
    throw new TypeError('Geometry edit base requires SequentialEditableTopologySnapshot.v1.');
  }
  return sequentialSemanticFingerprint('SSKGEOMETRYBASE', baseMaterial(snapshot));
}
function journalHead(material) {
  return sequentialSemanticFingerprint('SSKGEOMETRYJOURNAL', material);
}
function entryMaterial(input, journal) {
  const state = pairedState(input.before || {}, input.after || {});
  return {
    schema: SEQUENTIAL_GEOMETRY_EDIT_ENTRY_SCHEMA,
    sequence: journal.entries.length + 1,
    previousHeadFingerprint: journal.headFingerprint,
    type: 'MOVE_COMPONENT',
    componentId: text(input.componentId, 'componentId'),
    targetId: text(input.targetId, 'targetId'),
    operationId: text(input.operationId, 'operationId'),
    eligibilityId: text(input.eligibilityId, 'eligibilityId'),
    rawDelta: finitePoint(input.rawDelta, 'rawDelta'),
    delta: finitePoint(input.delta, 'delta'),
    snapSelection: input.snapSelection || null,
    before: state.before,
    after: state.after,
    ancestry: input.ancestry || {},
    operator: operatorRecord(input.operator),
  };
}
function canonicalEntry(input, journal) {
  const material = entryMaterial(input, journal);
  return immutableJson({
    ...material,
    entryId: sequentialSemanticFingerprint('SSKGEOMETRYENTRY', material),
  }, 'Sequential geometry edit entry');
}
export function createSequentialGeometryEditJournal(input = {}) {
  const material = {
    schema: SEQUENTIAL_GEOMETRY_EDIT_JOURNAL_SCHEMA,
    branchId: text(input.branchId, 'geometry journal branchId'),
    confirmedConstructionFingerprint: text(
      input.confirmedConstructionFingerprint,
      'confirmedConstructionFingerprint',
    ),
    baseFingerprint: text(input.baseFingerprint, 'geometry journal baseFingerprint'),
    entries: [],
  };
  return immutableJson({ ...material, headFingerprint: journalHead(material) },
    'Sequential geometry edit journal');
}
export function assertSequentialGeometryEditJournal(value, snapshot = null) {
  if (value?.schema !== SEQUENTIAL_GEOMETRY_EDIT_JOURNAL_SCHEMA) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.JOURNAL_INVALID,
      `Geometry journal must use ${SEQUENTIAL_GEOMETRY_EDIT_JOURNAL_SCHEMA}.`, TypeError);
  }
  const seed = createSequentialGeometryEditJournal(value);
  let rebuilt = seed;
  value.entries.forEach((entry) => {
    rebuilt = appendSequentialGeometryEdit(rebuilt, entry, null).journal;
  });
  if (!sameSequentialContractValue(rebuilt, value)) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.JOURNAL_INVALID,
      'Geometry journal differs from canonical regeneration.');
  }
  if (snapshot) {
    const base = sequentialGeometryEditBaseFingerprint(snapshot);
    if (value.branchId !== snapshot.branch.branchId
      || value.confirmedConstructionFingerprint
        !== snapshot.authority.confirmedConstructionFingerprint
      || value.baseFingerprint !== base) {
      fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.BASE_STALE,
        'Geometry journal base authority is stale.');
    }
  }
  return value;
}
export function appendSequentialGeometryEdit(journalInput, input = {}, snapshot = null) {
  const journal = snapshot
    ? assertSequentialGeometryEditJournal(journalInput, snapshot)
    : journalInput;
  if (journal?.schema !== SEQUENTIAL_GEOMETRY_EDIT_JOURNAL_SCHEMA) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.JOURNAL_INVALID,
      'Geometry journal is invalid.', TypeError);
  }
  if (journal.entries.some((row) => row.operationId === input.operationId)) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_REJECTION.OPERATION_REPLAY,
      `Geometry operation has already been recorded: ${input.operationId}`);
  }
  const entry = canonicalEntry(input, journal);
  const entries = [...journal.entries, entry];
  const material = {
    schema: journal.schema, branchId: journal.branchId,
    confirmedConstructionFingerprint: journal.confirmedConstructionFingerprint,
    baseFingerprint: journal.baseFingerprint, entries,
  };
  return Object.freeze({
    entry,
    journal: immutableJson({ ...material, headFingerprint: journalHead(material) },
      'Sequential geometry edit journal'),
  });
}
