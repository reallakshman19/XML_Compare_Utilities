import { freezeJsonValue, isPlainObject } from './engineering-json-value.js';
import { assertEngineeringRevisionToken } from './engineering-revision-contracts.js';

export const ENGINEERING_EDIT_INTENT_SCHEMA = 'EngineeringEditIntent.v1';
export const ENGINEERING_EDIT_INTENT_TYPE = Object.freeze({
  MOVE_ENTITY: 'MOVE_ENTITY',
  SET_PROPERTIES: 'SET_PROPERTIES',
  APPLY_CHANGES: 'APPLY_CHANGES',
});

function requiredText(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function entityIds(values) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('Edit intent requires at least one entity id.');
  const result = values.map((value, index) => requiredText(value, `entityIds[${index}]`));
  if (new Set(result).size !== result.length) throw new TypeError('Edit intent entity ids must be unique.');
  return result;
}

function assertChanges(changes, source) {
  if (!isPlainObject(changes)) throw new TypeError('Edit intent changes must be a plain object.');
  const geometry = changes.geometry ?? null;
  const properties = changes.properties ?? null;
  if (geometry == null && properties == null) throw new TypeError('Edit intent requires geometry or property changes.');
  if (properties != null && !isPlainObject(properties)) throw new TypeError('Property changes must be a plain object.');
  if (geometry != null && source?.interaction === 'pointer' && !geometry.constraint) {
    throw new TypeError('Pointer-originated geometry changes require an explicit constraint.');
  }
}

export function createEngineeringEditIntent(input = {}) {
  const type = input.type || ENGINEERING_EDIT_INTENT_TYPE.APPLY_CHANGES;
  if (!Object.values(ENGINEERING_EDIT_INTENT_TYPE).includes(type)) throw new TypeError(`Unsupported edit-intent type "${type}".`);
  const baseRevision = assertEngineeringRevisionToken(input.baseRevision, 'baseRevision');
  const source = input.source ?? {};
  assertChanges(input.changes, source);
  return freezeJsonValue({
    schema: ENGINEERING_EDIT_INTENT_SCHEMA,
    type,
    operationId: requiredText(input.operationId, 'operationId'),
    baseRevision,
    entityIds: entityIds(input.entityIds),
    changes: input.changes,
    source,
  });
}
