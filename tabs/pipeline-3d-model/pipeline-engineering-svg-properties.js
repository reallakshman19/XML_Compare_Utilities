import {
  createEngineeringPropertyField,
  createEngineeringPropertySet,
} from '../../core/engineering-scene/index.js';

const PROCESS_FIELDS = Object.freeze([
  ['branchName', 'Branch name'],
  ['lineNo', 'Line number'],
  ['boreMm', 'Bore'],
  ['wallThickness', 'Wall thickness'],
  ['p1', 'Design pressure'],
  ['t1', 'Temperature case 1'],
  ['t2', 'Temperature case 2'],
  ['t3', 'Temperature case 3'],
  ['fluidDensity', 'Fluid density'],
  ['materialCode', 'Material code'],
  ['corrosionAllowance', 'Corrosion allowance'],
  ['insulationThickness', 'Insulation thickness'],
  ['insulationDensity', 'Insulation density'],
  ['hydroPressure', 'Hydrotest pressure'],
]);

function textField(key, label, value, scope = 'ENTITY') {
  return createEngineeringPropertyField({
    key, label, type: 'text', scope, value: String(value ?? ''), editable: false,
    source: 'pipeline-3d-model',
  });
}

function numberField(key, label, value, unit = null, scope = 'ENTITY') {
  return createEngineeringPropertyField({
    key, label, type: 'number', scope, value: value ?? null, unit, editable: false,
    source: 'pipeline-3d-model',
  });
}

function pointFields(prefix, label, point) {
  if (!point) return [];
  return [
    numberField(`${prefix}X`, `${label} X`, point.x, 'mm'),
    numberField(`${prefix}Y`, `${label} Y`, point.y, 'mm'),
    numberField(`${prefix}Z`, `${label} Z`, point.z, 'mm'),
  ];
}

function optionalNumber(fields, key, label, value, unit = null) {
  if (value !== null && value !== undefined) fields.push(numberField(key, label, value, unit));
}

function optionalText(fields, key, label, value) {
  if (String(value ?? '')) fields.push(textField(key, label, value));
}

function rowFields(entity, evidence) {
  const fields = [
    numberField('nodeNumber', 'InputXML node', evidence.nodeNumber),
    ...pointFields('', 'Position', evidence.point),
  ];
  optionalText(fields, 'nodeName', 'Node name', evidence.nodeName);
  optionalNumber(fields, 'station', 'Route distance', evidence.horizontal, 'm');
  optionalNumber(fields, 'gradeElevation', 'Grade elevation', evidence.grade, 'm');
  optionalText(fields, 'elevationAuthority', 'Elevation authority', evidence.elevationAuthority);
  if (evidence.eventSources?.length) fields.push(textField('eventSources', 'Propagation sources', evidence.eventSources.join(', ')));
  if (evidence.markerEvidence?.length) {
    fields.push(textField('markerEvidence', 'Marker evidence', JSON.stringify(evidence.markerEvidence)));
  }
  return fields;
}

function segmentFields(entity, evidence) {
  const fields = [
    numberField('fromNode', 'From node', evidence.fromNode),
    numberField('toNode', 'To node', evidence.toNode),
    ...pointFields('start', 'Start', evidence.start),
    ...pointFields('end', 'End', evidence.end),
    ...pointFields('delta', 'InputXML delta', evidence.delta),
  ];
  optionalNumber(fields, 'inputXmlElement', 'InputXML element', evidence.xmlElement?.elementNumber);
  optionalText(fields, 'fromName', 'From name', evidence.xmlElement?.fromName);
  optionalText(fields, 'toName', 'To name', evidence.xmlElement?.toName);
  return fields;
}

export function buildPipelineEngineeringSvgEntityPropertySet(entity, revision) {
  const evidence = entity.metadata?.pipeline || {};
  const fields = [
    textField('entityId', 'Entity ID', entity.id),
    textField('entityCategory', 'Entity category', entity.domainRef.category),
    textField('domainType', 'Domain type', entity.domainType),
    textField('geometryKind', 'Geometry kind', entity.geometry.kind),
    textField('branchName', 'Branch name', entity.domainRef.branchName),
    ...(entity.domainRef.category === 'routeSegments'
      ? segmentFields(entity, evidence) : rowFields(entity, evidence)),
  ];
  return createEngineeringPropertySet({
    id: `pipeline:properties:${entity.id}`,
    revision,
    ownerIds: [entity.id],
    fields,
    metadata: { owner: 'pipeline-3d-model', scope: 'ENTITY', readOnly: true },
  });
}

export function buildPipelineEngineeringSvgScenePropertySet(scene, branchInfo = {}) {
  const fields = PROCESS_FIELDS.map(([key, label]) => textField(key, label, branchInfo[key], 'SCENE'));
  return createEngineeringPropertySet({
    id: `pipeline:scene-properties:${scene.sceneId}`,
    revision: scene.revision,
    ownerIds: [scene.sceneId],
    fields,
    metadata: { owner: 'pipeline-3d-model', scope: 'SCENE', readOnly: true },
  });
}

export function buildPipelineEngineeringSvgPropertySets(scene, selectedIds, branchInfo = {}) {
  const requested = new Set(selectedIds.map(String));
  const entities = scene.entities.filter((entity) => requested.has(entity.id));
  if (entities.length !== requested.size) {
    const found = new Set(entities.map((entity) => entity.id));
    const missing = [...requested].filter((id) => !found.has(id)).sort();
    throw new Error(`Pipeline engineering SVG property owners are missing: ${missing.join(', ')}.`);
  }
  return Object.freeze([
    buildPipelineEngineeringSvgScenePropertySet(scene, branchInfo),
    ...entities.map((entity) => buildPipelineEngineeringSvgEntityPropertySet(entity, scene.revision)),
  ]);
}

export const _test = Object.freeze({ PROCESS_FIELDS, pointFields, rowFields, segmentFields });
