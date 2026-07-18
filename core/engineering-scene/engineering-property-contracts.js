import { freezeJsonValue } from './engineering-json-value.js';

export const ENGINEERING_PROPERTY_FIELD_SCHEMA = 'EngineeringPropertyField.v1';
export const ENGINEERING_PROPERTY_AGGREGATE_SCHEMA = 'EngineeringPropertyAggregate.v1';
export const ENGINEERING_PROPERTY_SCOPE = Object.freeze({
  SCENE: 'SCENE',
  ENTITY: 'ENTITY',
  SELECTION: 'SELECTION',
  REFERENCE: 'REFERENCE',
});
export const ENGINEERING_PROPERTY_TYPE = Object.freeze({
  NUMBER: 'number',
  TEXT: 'text',
  ENUM: 'enum',
  BOOLEAN: 'boolean',
});
export const ENGINEERING_PROPERTY_AGGREGATE_STATE = Object.freeze({
  UNIFORM: 'uniform',
  MIXED: 'mixed',
  UNAVAILABLE: 'unavailable',
  NOT_APPLICABLE: 'not-applicable',
});

function assertPropertyValue(type, value, key) {
  if (value == null) return;
  if (type === 'number' && (!Number.isFinite(value) || typeof value !== 'number')) {
    throw new TypeError(`Property "${key}" requires a finite numeric value.`);
  }
  if (type === 'boolean' && typeof value !== 'boolean') {
    throw new TypeError(`Property "${key}" requires a boolean value.`);
  }
  if (['text', 'enum'].includes(type) && typeof value !== 'string') {
    throw new TypeError(`Property "${key}" requires a string value.`);
  }
}

export function createEngineeringPropertyField(input = {}) {
  const { key, label = key, type = 'text', scope = 'ENTITY', value = null } = input;
  if (!String(key || '').trim()) throw new TypeError('Property key is required.');
  if (!Object.values(ENGINEERING_PROPERTY_TYPE).includes(type)) throw new TypeError(`Property "${key}" has unsupported type "${type}".`);
  if (!Object.values(ENGINEERING_PROPERTY_SCOPE).includes(scope)) throw new TypeError(`Property "${key}" has unsupported scope "${scope}".`);
  if (type === 'enum' && (!Array.isArray(input.options) || input.options.length === 0)) {
    throw new TypeError(`Property "${key}" is enum but declares no options.`);
  }
  assertPropertyValue(type, value, key);
  return freezeJsonValue({
    schema: ENGINEERING_PROPERTY_FIELD_SCHEMA,
    key: String(key),
    label: String(label || key),
    type,
    scope,
    unit: input.unit == null ? null : String(input.unit),
    value,
    options: input.options == null ? null : [...input.options],
    min: input.min == null ? null : Number(input.min),
    max: input.max == null ? null : Number(input.max),
    editable: input.editable !== false,
    source: input.source == null ? null : String(input.source),
  });
}

export function createEngineeringPropertyAggregate(input = {}) {
  const state = input.state || 'uniform';
  if (!String(input.key || '').trim()) throw new TypeError('Property aggregate key is required.');
  if (!Object.values(ENGINEERING_PROPERTY_AGGREGATE_STATE).includes(state)) {
    throw new TypeError(`Property aggregate has unsupported state "${state}".`);
  }
  const value = state === 'uniform' ? input.value : null;
  return freezeJsonValue({
    schema: ENGINEERING_PROPERTY_AGGREGATE_SCHEMA,
    key: String(input.key),
    state,
    value,
    selectedCount: Number.isInteger(input.selectedCount) ? input.selectedCount : 0,
  });
}
