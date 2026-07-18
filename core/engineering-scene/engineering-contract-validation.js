import { assertJsonValue, isPlainObject } from './engineering-json-value.js';
import {
  ENGINEERING_COORDINATE_SYSTEM_SCHEMA,
  ENGINEERING_GEOMETRY_KIND,
  ENGINEERING_GEOMETRY_SCHEMA,
  ENGINEERING_POINT_SCHEMA,
} from './engineering-geometry-contracts.js';
import { ENGINEERING_SCENE_ENTITY_SCHEMA, ENGINEERING_SCENE_SCHEMA } from './engineering-scene-contracts.js';
import { isEngineeringRevisionToken } from './engineering-revision-contracts.js';
import { ENGINEERING_EDIT_INTENT_SCHEMA } from './engineering-edit-intent-contracts.js';
import { ENGINEERING_COMMAND_RESULT_SCHEMA, ENGINEERING_COMMAND_STATUS } from './engineering-command-result-contracts.js';
import {
  ENGINEERING_PROPERTY_FIELD_SCHEMA,
  ENGINEERING_PROPERTY_SCOPE,
  ENGINEERING_PROPERTY_TYPE,
} from './engineering-property-contracts.js';

function pointErrors(point, path) {
  const errors = [];
  if (point?.schema !== ENGINEERING_POINT_SCHEMA) errors.push(`${path}.schema is invalid`);
  for (const axis of ['x', 'y', 'z']) {
    if (typeof point?.[axis] !== 'number' || !Number.isFinite(point[axis])) errors.push(`${path}.${axis} must be finite`);
  }
  return errors;
}

function geometryErrors(geometry, path) {
  if (geometry == null) return [];
  const errors = [];
  if (geometry.schema !== ENGINEERING_GEOMETRY_SCHEMA) errors.push(`${path}.schema is invalid`);
  if (geometry.kind === ENGINEERING_GEOMETRY_KIND.POINT) errors.push(...pointErrors(geometry.position, `${path}.position`));
  else if (geometry.kind === ENGINEERING_GEOMETRY_KIND.SEGMENT) {
    errors.push(...pointErrors(geometry.start, `${path}.start`), ...pointErrors(geometry.end, `${path}.end`));
  } else if (geometry.kind === ENGINEERING_GEOMETRY_KIND.POLYLINE) {
    if (!Array.isArray(geometry.points) || geometry.points.length < 2) errors.push(`${path}.points requires at least two points`);
    else geometry.points.forEach((point, index) => errors.push(...pointErrors(point, `${path}.points[${index}]`)));
  } else errors.push(`${path}.kind is unsupported`);
  return errors;
}

function entityErrors(entity, path) {
  const errors = [];
  if (entity?.schema !== ENGINEERING_SCENE_ENTITY_SCHEMA) errors.push(`${path}.schema is invalid`);
  if (!String(entity?.id || '').trim()) errors.push(`${path}.id is required`);
  if (!String(entity?.kind || '').trim()) errors.push(`${path}.kind is required`);
  if (!isPlainObject(entity?.domainRef)) errors.push(`${path}.domainRef must be a plain object`);
  errors.push(...geometryErrors(entity?.geometry, `${path}.geometry`));
  return errors;
}

function coordinateSystemErrors(value) {
  const errors = [];
  if (value?.schema !== ENGINEERING_COORDINATE_SYSTEM_SCHEMA) errors.push('coordinateSystem.schema is invalid');
  if (!String(value?.unit || '').trim()) errors.push('coordinateSystem.unit is required');
  if (!String(value?.frame || '').trim()) errors.push('coordinateSystem.frame is required');
  if (!['X', 'Y', 'Z'].includes(value?.verticalAxis)) errors.push('coordinateSystem.verticalAxis is invalid');
  if (!['left', 'right'].includes(value?.handedness)) errors.push('coordinateSystem.handedness is invalid');
  return errors;
}

function throwErrors(label, errors) {
  if (errors.length) throw new TypeError(`Invalid ${label}: ${errors.join('; ')}`);
}

export function validateEngineeringScene(scene) {
  assertJsonValue(scene);
  const errors = [];
  if (scene?.schema !== ENGINEERING_SCENE_SCHEMA) errors.push(`schema must be "${ENGINEERING_SCENE_SCHEMA}"`);
  if (!String(scene?.sceneId || '').trim()) errors.push('sceneId is required');
  if (!isEngineeringRevisionToken(scene?.revision)) errors.push('revision token is invalid');
  errors.push(...coordinateSystemErrors(scene?.coordinateSystem));
  if (!Array.isArray(scene?.entities)) errors.push('entities must be an array');
  else {
    const ids = new Set();
    scene.entities.forEach((entity, index) => {
      errors.push(...entityErrors(entity, `entities[${index}]`));
      if (ids.has(entity?.id)) errors.push(`entities[${index}].id duplicates "${entity.id}"`);
      ids.add(entity?.id);
    });
  }
  throwErrors('EngineeringScene', errors);
  return scene;
}

export function validateEngineeringPropertyField(field) {
  assertJsonValue(field);
  const errors = [];
  if (field?.schema !== ENGINEERING_PROPERTY_FIELD_SCHEMA) errors.push('schema is invalid');
  if (!String(field?.key || '').trim()) errors.push('key is required');
  if (!Object.values(ENGINEERING_PROPERTY_SCOPE).includes(field?.scope)) errors.push('scope is invalid');
  if (!Object.values(ENGINEERING_PROPERTY_TYPE).includes(field?.type)) errors.push('type is invalid');
  if (field?.type === 'enum' && (!Array.isArray(field.options) || field.options.length === 0)) errors.push('enum options are required');
  throwErrors('EngineeringPropertyField', errors);
  return field;
}

export function validateEngineeringEditIntent(intent) {
  assertJsonValue(intent);
  const errors = [];
  if (intent?.schema !== ENGINEERING_EDIT_INTENT_SCHEMA) errors.push('schema is invalid');
  if (!String(intent?.operationId || '').trim()) errors.push('operationId is required');
  if (!isEngineeringRevisionToken(intent?.baseRevision)) errors.push('baseRevision is invalid');
  if (!Array.isArray(intent?.entityIds) || intent.entityIds.length === 0) errors.push('entityIds are required');
  if (!isPlainObject(intent?.changes)) errors.push('changes must be a plain object');
  throwErrors('EngineeringEditIntent', errors);
  return intent;
}

export function validateEngineeringCommandResult(result) {
  assertJsonValue(result);
  const errors = [];
  if (result?.schema !== ENGINEERING_COMMAND_RESULT_SCHEMA) errors.push('schema is invalid');
  if (!Object.values(ENGINEERING_COMMAND_STATUS).includes(result?.status)) errors.push('status is invalid');
  if (result?.status === 'committed' && !isEngineeringRevisionToken(result?.resultingRevision)) errors.push('resultingRevision is invalid');
  if (result?.status === 'rejected' && !String(result?.code || '').trim()) errors.push('rejection code is required');
  throwErrors('EngineeringCommandResult', errors);
  return result;
}
