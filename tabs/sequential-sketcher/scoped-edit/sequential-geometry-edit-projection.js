/** Deterministic effective scene and topology projection from geometry journal authority. */
import {
  createEngineeringScene,
  validateEngineeringScene,
} from '../../../core/engineering-scene/index.js';
import { translateEngineeringGeometry } from '../../../core/engineering-svg/engineering-svg-precision-geometry.js';
import {
  sameSequentialContractValue,
  sequentialSemanticFingerprint,
} from './sequential-command-contracts.js';
import {
  assertSequentialGeometryEditJournal,
  SEQUENTIAL_GEOMETRY_EDIT_ENTRY_SCHEMA,
} from './sequential-geometry-edit-journal.js';

export const SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION = Object.freeze({
  ENTRY_STALE: 'SEQUENTIAL_GEOMETRY_EDIT_ENTRY_STALE',
  TARGET_INVALID: 'SEQUENTIAL_GEOMETRY_EDIT_TARGET_INVALID',
  TRANSFORM_INVALID: 'SEQUENTIAL_GEOMETRY_EDIT_TRANSFORM_INVALID',
});

function fail(code, message, Constructor = RangeError) {
  const error = new Constructor(message); error.code = code; throw error;
}
function add(point, delta) {
  return { x: point.x + delta.x, y: point.y + delta.y, z: point.z + delta.z };
}
function byId(rows, key) { return new Map(rows.map((row) => [row[key], row])); }
function assertEntry(entry) {
  if (entry?.schema !== SEQUENTIAL_GEOMETRY_EDIT_ENTRY_SCHEMA
    || entry.type !== 'MOVE_COMPONENT') {
    fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TARGET_INVALID,
      'Effective projection requires one canonical MOVE_COMPONENT entry.', TypeError);
  }
  return entry;
}
function assertPositionTransform(before, after, delta, label) {
  const expected = add(before.position, delta);
  if (!sameSequentialContractValue(expected, after.position)) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TRANSFORM_INVALID,
      `${label} after position is not the exact journal translation.`);
  }
}
function assertGeometryTransform(before, after, delta) {
  const expected = translateEngineeringGeometry(before.geometry, delta);
  if (!sameSequentialContractValue(expected, after.geometry)) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TRANSFORM_INVALID,
      `Geometry part ${before.geometryPartId} is not the exact journal translation.`);
  }
}
function entryMaps(entry) {
  return {
    beforeParts: byId(entry.before.geometryParts, 'geometryPartId'),
    afterParts: byId(entry.after.geometryParts, 'geometryPartId'),
    beforePorts: byId(entry.before.ports, 'portId'),
    afterPorts: byId(entry.after.ports, 'portId'),
    beforeNodes: byId(entry.before.nodes, 'nodeId'),
    afterNodes: byId(entry.after.nodes, 'nodeId'),
  };
}
function validateEntryPairs(entry, maps) {
  for (const before of maps.beforeParts.values()) {
    const after = maps.afterParts.get(before.geometryPartId);
    if (!after) fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TRANSFORM_INVALID,
      `Geometry part after record is missing: ${before.geometryPartId}`);
    assertGeometryTransform(before, after, entry.delta);
  }
  for (const before of maps.beforePorts.values()) {
    const after = maps.afterPorts.get(before.portId);
    if (!after) fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TRANSFORM_INVALID,
      `Port after record is missing: ${before.portId}`);
    assertPositionTransform(before, after, entry.delta, `Port ${before.portId}`);
  }
  for (const before of maps.beforeNodes.values()) {
    const after = maps.afterNodes.get(before.nodeId);
    if (!after) fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TRANSFORM_INVALID,
      `Node after record is missing: ${before.nodeId}`);
    assertPositionTransform(before, after, entry.delta, `Node ${before.nodeId}`);
  }
}
function projectSceneEntry(scene, entry) {
  const maps = entryMaps(assertEntry(entry));
  validateEntryPairs(entry, maps);
  const entities = scene.entities.map((entity) => {
    const before = maps.beforeParts.get(entity.id);
    if (!before) return entity;
    if (entity.domainRef?.category !== 'confirmed'
      || entity.domainRef?.componentId !== entry.componentId
      || !sameSequentialContractValue(entity.geometry, before.geometry)) {
      fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.ENTRY_STALE,
        `Scene geometry is stale for journal part ${entity.id}.`);
    }
    return {
      ...entity,
      geometry: maps.afterParts.get(entity.id).geometry,
      metadata: {
        ...entity.metadata,
        sequentialGeometryEdit: {
          entryId: entry.entryId, operationId: entry.operationId,
          componentId: entry.componentId,
        },
      },
    };
  });
  if (maps.beforeParts.size !== entities.filter((row) => maps.beforeParts.has(row.id)).length) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.ENTRY_STALE,
      `Scene is missing geometry for journal component ${entry.componentId}.`);
  }
  return createEngineeringScene({ ...scene, entities });
}
export function applySequentialGeometryEditJournalToScene(
  sceneInput,
  journalInput,
  options = {},
) {
  const original = validateEngineeringScene(sceneInput);
  let scene = original;
  for (const entry of journalInput.entries || []) scene = projectSceneEntry(scene, entry);
  const revision = options.revision || scene.revision;
  const sceneId = String(options.sceneId || scene.sceneId);
  return createEngineeringScene({
    ...scene,
    sceneId,
    revision,
    metadata: {
      ...scene.metadata,
      sequentialGeometryEdit: {
        journalHeadFingerprint: journalInput.headFingerprint,
        entryCount: journalInput.entries?.length || 0,
      },
    },
  });
}
function currentTopologyMaps(snapshot) {
  return {
    components: byId(snapshot.components, 'componentId'),
    parts: byId(snapshot.geometryParts, 'geometryPartId'),
    ports: byId(snapshot.ports, 'portId'),
    nodes: byId(snapshot.nodes, 'nodeId'),
  };
}
function validateTopologyEntry(snapshot, entry, maps) {
  const component = maps.components.get(entry.componentId);
  if (!component || component.supportAttachmentIds.length
    || snapshot.componentBoundaryCuts.some((row) => row.componentId === entry.componentId)) {
    fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.TARGET_INVALID,
      `Journal component is no longer an isolated unsupported target: ${entry.componentId}`);
  }
  const evidence = entryMaps(assertEntry(entry));
  validateEntryPairs(entry, evidence);
  for (const before of evidence.beforeParts.values()) {
    const current = maps.parts.get(before.geometryPartId);
    if (current?.componentId !== entry.componentId
      || !sameSequentialContractValue(current.geometry, before.geometry)) {
      fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.ENTRY_STALE,
        `Topology geometry is stale for ${before.geometryPartId}.`);
    }
  }
  for (const before of evidence.beforePorts.values()) {
    const current = maps.ports.get(before.portId);
    if (current?.componentId !== entry.componentId
      || !sameSequentialContractValue(current.position, before.position)) {
      fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.ENTRY_STALE,
        `Topology port is stale for ${before.portId}.`);
    }
  }
  for (const before of evidence.beforeNodes.values()) {
    const current = maps.nodes.get(before.nodeId);
    if (!current || current.incidentComponentIds.some((id) => id !== entry.componentId)
      || !sameSequentialContractValue(current.position, before.position)) {
      fail(SEQUENTIAL_GEOMETRY_EDIT_PROJECTION_REJECTION.ENTRY_STALE,
        `Topology node is stale or shared: ${before.nodeId}.`);
    }
  }
  return evidence;
}
function projectTopologyEntry(snapshot, entry) {
  const maps = currentTopologyMaps(snapshot);
  const evidence = validateTopologyEntry(snapshot, entry, maps);
  return {
    ...snapshot,
    geometryParts: snapshot.geometryParts.map((row) => (
      evidence.afterParts.has(row.geometryPartId)
        ? { ...row, geometry: evidence.afterParts.get(row.geometryPartId).geometry }
        : row
    )),
    ports: snapshot.ports.map((row) => (
      evidence.afterPorts.has(row.portId)
        ? { ...row, position: evidence.afterPorts.get(row.portId).position }
        : row
    )),
    nodes: snapshot.nodes.map((row) => (
      evidence.afterNodes.has(row.nodeId)
        ? { ...row, position: evidence.afterNodes.get(row.nodeId).position,
          positionProvenance: 'GEOMETRY_EDIT_JOURNAL' }
        : row
    )),
  };
}
export function applySequentialGeometryEditJournalToTopology(snapshotInput, journalInput) {
  const journal = assertSequentialGeometryEditJournal(journalInput, snapshotInput);
  let snapshot = snapshotInput;
  for (const entry of journal.entries) snapshot = projectTopologyEntry(snapshot, entry);
  return Object.freeze({
    ...snapshot,
    geometryEditJournalFingerprint: journal.headFingerprint,
    effectiveGeometryFingerprint: sequentialSemanticFingerprint('SSKEFFECTIVEGEOMETRY', {
      nodes: snapshot.nodes.map((row) => [row.nodeId, row.position]),
      ports: snapshot.ports.map((row) => [row.portId, row.position]),
      geometryParts: snapshot.geometryParts,
      journalHeadFingerprint: journal.headFingerprint,
    }),
  });
}
