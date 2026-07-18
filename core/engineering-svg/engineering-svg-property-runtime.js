import {
  createEngineeringPropertyAggregate,
  createEngineeringPropertyField,
  freezeJsonValue,
} from '../engineering-scene/index.js';

export const ENGINEERING_SVG_PROPERTY_VIEW_SCHEMA = 'EngineeringSvgPropertyView.v1';

function descriptorSignature(field) {
  return JSON.stringify({
    key: field.key,
    label: field.label,
    type: field.type,
    scope: field.scope,
    unit: field.unit,
    options: field.options,
    min: field.min,
    max: field.max,
    editable: field.editable,
  });
}

function fieldsForKey(propertySets, key, ownerId) {
  const owned = propertySets.flatMap((set) => (
    set.ownerIds.includes(ownerId) ? set.fields.filter((field) => field.key === key) : []
  ));
  if (owned.length) return owned;
  return propertySets.flatMap((set) => set.fields.filter((field) => (
    field.key === key && ['SCENE', 'SELECTION', 'REFERENCE'].includes(field.scope)
  )));
}

function resolveField(propertySets, key, ownerId) {
  const candidates = fieldsForKey(propertySets, key, ownerId);
  if (!candidates.length) return null;
  const signature = descriptorSignature(candidates[0]);
  if (candidates.some((field) => descriptorSignature(field) !== signature)) {
    throw new TypeError(`Property "${key}" has conflicting descriptors for owner "${ownerId}".`);
  }
  if (candidates.some((field) => !Object.is(field.value, candidates[0].value))) {
    throw new TypeError(`Property "${key}" has conflicting values for owner "${ownerId}".`);
  }
  return candidates[0];
}

function aggregateState(fields) {
  if (fields.every((field) => field == null)) return 'not-applicable';
  if (fields.some((field) => field == null)) return 'unavailable';
  return fields.every((field) => Object.is(field.value, fields[0].value)) ? 'uniform' : 'mixed';
}

function descriptorWithoutValue(field) {
  return createEngineeringPropertyField({ ...field, value: null });
}

function propertyKeys(propertySets) {
  return [...new Set(propertySets.flatMap((set) => set.fields.map((field) => field.key)))].sort();
}

export function aggregateEngineeringSvgProperties(selectedIds, propertySets) {
  if (!Array.isArray(selectedIds) || !Array.isArray(propertySets)) {
    throw new TypeError('Property aggregation requires selected IDs and property sets.');
  }
  const owners = selectedIds.length ? selectedIds : [''];
  return freezeJsonValue(propertyKeys(propertySets).map((key) => {
    const fields = owners.map((ownerId) => resolveField(propertySets, key, ownerId));
    const representative = fields.find(Boolean) || propertySets.flatMap((set) => set.fields).find((field) => field.key === key);
    const state = aggregateState(fields);
    const aggregateInput = { key, state, selectedCount: selectedIds.length };
    if (state === 'uniform') aggregateInput.value = fields[0].value;
    return {
      schema: ENGINEERING_SVG_PROPERTY_VIEW_SCHEMA,
      field: descriptorWithoutValue(representative),
      aggregate: createEngineeringPropertyAggregate(aggregateInput),
    };
  }));
}

export function validateEngineeringSvgPropertyChanges(intent, propertySets) {
  const changes = intent.changes.properties;
  if (changes == null) return intent;
  Object.entries(changes).forEach(([key, value]) => {
    intent.entityIds.forEach((ownerId) => {
      const field = resolveField(propertySets, key, ownerId);
      if (!field) throw new TypeError(`Property "${key}" is unavailable for entity "${ownerId}".`);
      if (!field.editable) throw new TypeError(`Property "${key}" is read-only for entity "${ownerId}".`);
      createEngineeringPropertyField({ ...field, value });
    });
  });
  return intent;
}
