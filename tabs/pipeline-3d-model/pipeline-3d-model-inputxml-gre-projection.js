import {
  PIPELINE_GRE_BEND_CANDIDATE_LINEAGE_SCHEMA,
  PIPELINE_GRE_BEND_COMPONENT_SCHEMA,
  PIPELINE_GRE_BEND_ELEMENT_LINEAGE_SCHEMA,
  PIPELINE_GRE_BEND_MATERIALIZATION_PLAN_SCHEMA,
  PIPELINE_GRE_BEND_MATERIALIZED_ELEMENT_SCHEMA,
  PIPELINE_GRE_BEND_MATERIALIZED_MODEL_SCHEMA,
  PIPELINE_GRE_BEND_MATERIALIZED_NODE_SCHEMA,
  PIPELINE_GRE_BEND_NODE_ALLOCATION_PLAN_SCHEMA,
  PIPELINE_GRE_BEND_NODE_ALLOCATION_SCHEMA,
} from './pipeline-3d-model-gre-bend-materialization-contracts.js';

import {
  PIPELINE_INPUTXML_GRE_BEND_PROJECTION_SCHEMA,
  PIPELINE_INPUTXML_GRE_PROJECTED_ELEMENT_SCHEMA,
  PIPELINE_INPUTXML_GRE_SOURCE_CONSERVATION_SCHEMA,
  createPipelineInputXmlGreProjectionDiagnostic as diagnostic,
  createPipelineInputXmlGreProjectionPlan,
  freezePipelineInputXmlGreProjectionValue as freeze,
  safePipelineInputXmlGreProjectionInput as safe,
} from './pipeline-3d-model-inputxml-gre-projection-contracts.js';
export {
  PIPELINE_INPUTXML_GRE_BEND_PROJECTION_SCHEMA,
  PIPELINE_INPUTXML_GRE_PROJECTED_ELEMENT_SCHEMA,
  PIPELINE_INPUTXML_GRE_PROJECTION_BLOCKER_ORDER,
  PIPELINE_INPUTXML_GRE_PROJECTION_PLAN_SCHEMA,
  PIPELINE_INPUTXML_GRE_SOURCE_CONSERVATION_SCHEMA,
  buildPipelineInputXmlGreProjectionPlanJson,
} from './pipeline-3d-model-inputxml-gre-projection-contracts.js';

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const text = (value) => typeof value === 'string' ? value.trim() : '';
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function readyRecord(value, schema) {
  return plain(value) && value.schema === schema && value.ready === true
    && Array.isArray(value.diagnostics) && value.diagnostics.length === 0
    && Array.isArray(value.blockerCodes) && value.blockerCodes.length === 0;
}
function indexUnique(values, key, errors, code) {
  const result = Object.create(null);
  (Array.isArray(values) ? values : []).forEach((item) => {
    const identity = item?.[key];
    if (identity === undefined || identity === null || identity === '' || Object.hasOwn(result, identity)) {
      errors.push(diagnostic(code, { key, identity }));
    } else result[identity] = item;
  });
  return result;
}
function point(value) {
  return plain(value) && ['x', 'y', 'z'].every((axis) => finite(value[axis]));
}
function exactPoint(left, right) {
  return point(left) && point(right) && ['x', 'y', 'z'].every((axis) => left[axis] === right[axis]);
}
function exactState(plan, errors) {
  const model = plan?.materializedModel;
  if (!readyRecord(plan, PIPELINE_GRE_BEND_MATERIALIZATION_PLAN_SCHEMA)
    || !readyRecord(model, PIPELINE_GRE_BEND_MATERIALIZED_MODEL_SCHEMA)
    || !readyRecord(plan?.nodeAllocationPlan, PIPELINE_GRE_BEND_NODE_ALLOCATION_PLAN_SCHEMA)
    || !Array.isArray(plan.candidateLineage) || !Array.isArray(plan.elementLineage)
    || !Array.isArray(plan.appliedCandidateIds) || !plain(plan.coverage)) {
    errors.push(diagnostic('PIPELINE_INPUTXML_GRE_MATERIALIZATION_UNAUTHENTICATED'));
  }
  return plain(model) ? model : { sourceRows: [], nodes: [], elements: [], bendComponents: [] };
}
function validateNodes(plan, model, errors) {
  const nodes = Array.isArray(model.nodes) ? model.nodes : [];
  const byId = indexUnique(nodes, 'materializedNodeId', errors, 'PIPELINE_INPUTXML_GRE_NODE_IDENTITY_INVALID');
  const byNumber = indexUnique(nodes, 'nodeNumber', errors, 'PIPELINE_INPUTXML_GRE_NODE_IDENTITY_INVALID');
  nodes.forEach((node) => {
    if (!readyRecord(node, PIPELINE_GRE_BEND_MATERIALIZED_NODE_SCHEMA)
      || !Number.isSafeInteger(node.nodeNumber) || node.nodeNumber <= 0 || !point(node.coordinates)
      || typeof node.active !== 'boolean' || typeof node.inserted !== 'boolean') {
      errors.push(diagnostic('PIPELINE_INPUTXML_GRE_NODE_IDENTITY_INVALID', {
        materializedNodeId: node?.materializedNodeId,
      }));
    }
  });
  const originals = nodes.filter((node) => node.inserted === false);
  const rows = Array.isArray(model.sourceRows) ? model.sourceRows : [];
  rows.forEach((row, rowIndex) => {
    const node = originals.find((item) => item.sourceNodeNumber === row?.nodeNumber);
    if (!node || node.nodeNumber !== row.nodeNumber || !exactPoint(node.coordinates, row)) {
      errors.push(diagnostic('PIPELINE_INPUTXML_GRE_NODE_IDENTITY_INVALID', { rowIndex }));
    }
  });
  const allocations = plan?.nodeAllocationPlan?.allocations || [];
  const allocationByNode = indexUnique(allocations, 'materializedNodeId', errors,
    'PIPELINE_INPUTXML_GRE_NODE_ALLOCATION_INVALID');
  nodes.filter((node) => node.inserted === true).forEach((node) => {
    const allocation = allocationByNode[node.materializedNodeId];
    if (!readyRecord(allocation, PIPELINE_GRE_BEND_NODE_ALLOCATION_SCHEMA)
      || allocation.nodeNumber !== node.nodeNumber || allocation.nodeRole !== node.nodeRole
      || allocation.candidateId !== node.candidateId) {
      errors.push(diagnostic('PIPELINE_INPUTXML_GRE_NODE_ALLOCATION_INVALID', {
        materializedNodeId: node.materializedNodeId,
      }));
    }
  });
  if (allocations.length !== nodes.filter((node) => node.inserted === true).length) {
    errors.push(diagnostic('PIPELINE_INPUTXML_GRE_NODE_ALLOCATION_INVALID'));
  }
  return { nodes, byId, byNumber };
}
function projectedElement(element, index, nodeById) {
  const from = nodeById[element.fromMaterializedNodeId], to = nodeById[element.toMaterializedNodeId];
  return freeze({ schema: PIPELINE_INPUTXML_GRE_PROJECTED_ELEMENT_SCHEMA, id: `E${index + 1}`, index,
    materializedElementId: element.materializedElementId, elementKind: element.elementKind,
    analysisSectionId: element.analysisSectionId, candidateId: element.candidateId || '',
    fromMaterializedNodeId: from.materializedNodeId, toMaterializedNodeId: to.materializedNodeId,
    fromNode: from.nodeNumber, toNode: to.nodeNumber,
    fromX: from.coordinates.x, fromY: from.coordinates.y, fromZ: from.coordinates.z,
    toX: to.coordinates.x, toY: to.coordinates.y, toZ: to.coordinates.z,
    deltaX: to.coordinates.x - from.coordinates.x, deltaY: to.coordinates.y - from.coordinates.y,
    deltaZ: to.coordinates.z - from.coordinates.z,
    sourceElementIndexes: Object.freeze([...element.sourceElementIndexes]),
    lineageDisposition: element.lineageDisposition, bend: null,
    sourceAuthority: element.sourceAuthority, sourceReference: element.sourceReference });
}
function validateElements(model, nodes, errors) {
  const elements = Array.isArray(model.elements) ? model.elements : [];
  const byId = indexUnique(elements, 'materializedElementId', errors,
    'PIPELINE_INPUTXML_GRE_ELEMENT_IDENTITY_INVALID');
  const inactive = new Set(nodes.nodes.filter((node) => node.active === false).map((node) => node.materializedNodeId));
  const projected = [];
  elements.forEach((element, index) => {
    const from = nodes.byId[element?.fromMaterializedNodeId], to = nodes.byId[element?.toMaterializedNodeId];
    if (!readyRecord(element, PIPELINE_GRE_BEND_MATERIALIZED_ELEMENT_SCHEMA)
      || element.orderIndex !== index || !from || !to || from.active !== true || to.active !== true
      || inactive.has(element.fromMaterializedNodeId) || inactive.has(element.toMaterializedNodeId)
      || !Array.isArray(element.sourceElementIndexes) || !element.sourceElementIndexes.length) {
      errors.push(diagnostic(inactive.has(element?.fromMaterializedNodeId)
        || inactive.has(element?.toMaterializedNodeId)
        ? 'PIPELINE_INPUTXML_GRE_INACTIVE_CORNER_REAPPEARED'
        : 'PIPELINE_INPUTXML_GRE_ELEMENT_IDENTITY_INVALID', { materializedElementId: element?.materializedElementId }));
    } else projected.push(projectedElement(element, index, nodes.byId));
  });
  return { elements, byId, projected };
}
function validateLineage(plan, model, elements, errors) {
  const sourceCount = Math.max(0, (model.sourceRows || []).length - 1);
  const lineage = Array.isArray(plan.elementLineage) ? plan.elementLineage : [];
  const byIndex = indexUnique(lineage, 'sourceElementIndex', errors,
    'PIPELINE_INPUTXML_GRE_LINEAGE_CONSERVATION_INVALID');
  const conservation = [];
  for (let index = 0; index < sourceCount; index += 1) {
    const item = byIndex[index];
    const expected = elements.elements.filter((element) => element.sourceElementIndexes.includes(index))
      .map((element) => element.materializedElementId);
    if (!readyRecord(item, PIPELINE_GRE_BEND_ELEMENT_LINEAGE_SCHEMA) || item.sourceElementId !== `E${index + 1}`
      || !same(item.successorElementIds, expected)) {
      errors.push(diagnostic('PIPELINE_INPUTXML_GRE_LINEAGE_CONSERVATION_INVALID', { sourceElementIndex: index }));
    } else conservation.push(freeze({ schema: PIPELINE_INPUTXML_GRE_SOURCE_CONSERVATION_SCHEMA,
      sourceElementIndex: index, sourceElementId: item.sourceElementId,
      successorMaterializedElementIds: Object.freeze([...expected]), emittedElementIds: Object.freeze(expected.map((id) =>
        elements.projected.find((element) => element.materializedElementId === id)?.id).filter(Boolean)) }));
  }
  if (lineage.length !== sourceCount || elements.elements.some((element) => element.sourceElementIndexes.some((index) =>
    !byIndex[index]?.successorElementIds?.includes(element.materializedElementId)))) {
    errors.push(diagnostic('PIPELINE_INPUTXML_GRE_LINEAGE_CONSERVATION_INVALID'));
  }
  return conservation;
}
function bendProjection(component, bendElement, projectedElementValue, nodeById) {
  const incoming = nodeById[component.incomingTangencyNodeId];
  const outgoing = nodeById[component.outgoingTangencyNodeId];
  const inactive = nodeById[component.inactiveCornerReferenceId];
  const [incomingIndex, outgoingIndex] = component.sourceElementIndexes;
  return freeze({ schema: PIPELINE_INPUTXML_GRE_BEND_PROJECTION_SCHEMA,
    candidateId: component.candidateId, bendComponentId: component.componentId,
    ownerProjectionElementId: projectedElementValue.id,
    ownerMaterializedElementId: bendElement.materializedElementId,
    incomingSourceElementIndex: incomingIndex, incomingSourceElementId: `E${incomingIndex + 1}`,
    outgoingSourceElementIndex: outgoingIndex, outgoingSourceElementId: `E${outgoingIndex + 1}`,
    incomingTangencyNodeId: incoming.materializedNodeId, incomingTangencyNodeNumber: incoming.nodeNumber,
    outgoingTangencyNodeId: outgoing.materializedNodeId, outgoingTangencyNodeNumber: outgoing.nodeNumber,
    inactiveCornerReferenceId: inactive.materializedNodeId, inactiveCornerNodeNumber: inactive.nodeNumber,
    radiusMm: component.bendRadiusMm, turnAngleDeg: component.turnAngleDeg,
    fittingThicknessMm: component.localThicknessMm, bendBreakLengthApplication: component.bendBreakLengthApplication,
    vendorId: component.vendorId, seriesId: component.seriesId,
    qualificationEvidenceId: component.qualificationEvidenceId,
    requirementReference: component.requirementReference,
    sourceAuthority: component.sourceAuthority, sourceReference: component.sourceReference });
}
function validateBends(plan, model, nodes, elements, errors) {
  const components = Array.isArray(model.bendComponents) ? model.bendComponents : [];
  const lineageByCandidate = indexUnique(plan.candidateLineage || [], 'candidateId', errors,
    'PIPELINE_INPUTXML_GRE_BEND_OWNERSHIP_INVALID');
  const projections = [], owners = new Set();
  components.forEach((component) => {
    const bendElements = elements.elements.filter((element) => element.elementKind === 'GRE_BEND'
      && element.candidateId === component?.candidateId);
    const bendElement = bendElements[0], projected = elements.projected.find((item) =>
      item.materializedElementId === bendElement?.materializedElementId);
    const incoming = nodes.byId[component?.incomingTangencyNodeId];
    const outgoing = nodes.byId[component?.outgoingTangencyNodeId];
    const inactive = nodes.byId[component?.inactiveCornerReferenceId];
    const lineage = lineageByCandidate[component?.candidateId];
    const sourceIndexes = component?.sourceElementIndexes || [];
    const valid = readyRecord(component, PIPELINE_GRE_BEND_COMPONENT_SCHEMA) && bendElements.length === 1
      && projected && !owners.has(projected.id) && incoming?.nodeRole === 'GRE_INCOMING_TANGENCY'
      && outgoing?.nodeRole === 'GRE_OUTGOING_TANGENCY' && inactive?.nodeRole === 'INACTIVE_CORNER_REFERENCE'
      && inactive.active === false && bendElement.fromMaterializedNodeId === incoming.materializedNodeId
      && bendElement.toMaterializedNodeId === outgoing.materializedNodeId
      && sourceIndexes.length === 2 && sourceIndexes[1] === sourceIndexes[0] + 1
      && same(bendElement.sourceElementIndexes, sourceIndexes)
      && readyRecord(lineage, PIPELINE_GRE_BEND_CANDIDATE_LINEAGE_SCHEMA)
      && lineage.bendElementId === bendElement.materializedElementId
      && lineage.bendComponentId === component.componentId
      && lineage.inactiveCornerReferenceId === inactive.materializedNodeId
      && lineage.insertedNodeIds.includes(incoming.materializedNodeId)
      && lineage.insertedNodeIds.includes(outgoing.materializedNodeId);
    if (!valid) errors.push(diagnostic('PIPELINE_INPUTXML_GRE_BEND_OWNERSHIP_INVALID', {
      candidateId: component?.candidateId,
    }));
    else {
      owners.add(projected.id);
      projections.push(bendProjection(component, bendElement, projected, nodes.byId));
    }
  });
  const bendElementCount = elements.elements.filter((element) => element.elementKind === 'GRE_BEND').length;
  if (bendElementCount !== components.length || projections.length !== components.length
    || (plan.candidateLineage || []).length !== components.length
    || !same([...plan.appliedCandidateIds].sort(compare), components.map((item) => item.candidateId).sort(compare))) {
    errors.push(diagnostic('PIPELINE_INPUTXML_GRE_BEND_OWNERSHIP_INVALID'));
  }
  return projections;
}
function attachBends(projected, bends) {
  const byOwner = Object.fromEntries(bends.map((bend) => [bend.ownerProjectionElementId, bend]));
  return Object.freeze(projected.map((element) => freeze({ ...element, bend: byOwner[element.id] || null })));
}
export function buildPipelineInputXmlGreProjectionPlan(input = {}) {
  const safeValue = safe(input), source = safeValue.source, errors = [...safeValue.diagnostics];
  const plan = source.materializationPlan, model = exactState(plan, errors);
  const nodes = validateNodes(plan || {}, model, errors);
  const elements = validateElements(model, nodes, errors);
  const conservation = validateLineage(plan || {}, model, elements, errors);
  const bends = validateBends(plan || {}, model, nodes, elements, errors);
  const projected = attachBends(elements.projected, bends);
  const coverage = freeze({ sourceNodeCount: (model.sourceRows || []).length,
    activeNodeCount: nodes.nodes.filter((node) => node.active === true).length,
    inactiveCornerCount: nodes.nodes.filter((node) => node.nodeRole === 'INACTIVE_CORNER_REFERENCE').length,
    sourceElementCount: Math.max(0, (model.sourceRows || []).length - 1),
    materializedElementCount: elements.elements.length, projectedElementCount: projected.length,
    bendComponentCount: (model.bendComponents || []).length, bendProjectionCount: bends.length });
  if (coverage.projectedElementCount !== coverage.materializedElementCount
    || coverage.bendProjectionCount !== coverage.bendComponentCount
    || conservation.length !== coverage.sourceElementCount
    || coverage.inactiveCornerCount !== coverage.bendComponentCount) {
    errors.push(diagnostic('PIPELINE_INPUTXML_GRE_PROJECTION_COVERAGE_INVALID', coverage));
  }
  return createPipelineInputXmlGreProjectionPlan({
    sourceMaterializationPlanSchema: text(plan?.schema),
    sourceMaterializedModelSchema: text(model?.schema),
    projectedElements: projected, bendProjections: bends,
    sourceElementConservation: conservation,
    inactiveCornerReferences: model.inactiveCornerReferences || [],
    notApplicableCandidateIds: plan?.notApplicableCandidateIds || [], coverage,
  }, errors);
}
