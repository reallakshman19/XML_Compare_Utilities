import { freezeJsonValue } from './engineering-json-value.js';
import { createEngineeringCoordinateSystem } from './engineering-geometry-contracts.js';
import { assertEngineeringRevisionToken } from './engineering-revision-contracts.js';

export const ENGINEERING_SCENE_SCHEMA = 'EngineeringScene.v1';
export const ENGINEERING_SCENE_ENTITY_SCHEMA = 'EngineeringSceneEntity.v1';
export const ENGINEERING_SCENE_PROJECTION = Object.freeze(['ISO', 'XY', 'XZ', 'YZ']);

function text(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function stringList(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`);
  return values.map((value, index) => text(value, `${label}[${index}]`));
}

export function createEngineeringSceneEntity(input = {}) {
  if (!input.domainRef) throw new TypeError('Scene entity domainRef is required.');
  return freezeJsonValue({
    schema: ENGINEERING_SCENE_ENTITY_SCHEMA,
    id: text(input.id, 'Scene entity id'),
    kind: text(input.kind, 'Scene entity kind'),
    domainType: text(input.domainType || input.kind, 'Scene entity domainType'),
    geometry: input.geometry ?? null,
    domainRef: input.domainRef,
    propertySetIds: stringList(input.propertySetIds || [], 'propertySetIds'),
    editCapabilities: stringList(input.editCapabilities || [], 'editCapabilities'),
    layer: String(input.layer || 'authoritative'),
    renderOrder: Number.isFinite(input.renderOrder) ? input.renderOrder : 0,
    visible: input.visible !== false,
    selectable: input.selectable !== false,
    metadata: input.metadata ?? {},
  });
}

export function createEngineeringScene(input = {}) {
  const revision = assertEngineeringRevisionToken(input.revision);
  const projections = input.projections || ENGINEERING_SCENE_PROJECTION;
  if (!Array.isArray(input.entities)) throw new TypeError('Engineering scene entities must be an array.');
  projections.forEach((projection) => {
    if (!ENGINEERING_SCENE_PROJECTION.includes(projection)) throw new TypeError(`Unsupported scene projection "${projection}".`);
  });
  return freezeJsonValue({
    schema: ENGINEERING_SCENE_SCHEMA,
    sceneId: text(input.sceneId, 'Engineering scene id'),
    revision,
    coordinateSystem: createEngineeringCoordinateSystem(input.coordinateSystem),
    entities: input.entities.map((entity) => createEngineeringSceneEntity(entity)),
    projections: [...projections],
    capabilities: input.capabilities ?? {},
    metadata: input.metadata ?? {},
  });
}
