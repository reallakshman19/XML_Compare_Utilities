import { createPipelineGreBendAbortedMaterializationPlan, createPipelineGreBendComponent, createPipelineGreBendMaterializationDiagnostic, createPipelineGreBendMaterializationPlan, createPipelineGreBendMaterializedElement, createPipelineGreBendMaterializedModel, createPipelineGreBendMaterializedNode } from './pipeline-3d-model-gre-bend-materialization-contracts.js';
import { indexPipelineGreBendNodeAllocations, resolvePipelineGreBendNodeAllocationPlan } from './pipeline-3d-model-gre-bend-node-allocation.js';
import { buildPipelineGreBendCandidateLineage, buildPipelineGreBendElementLineage, validatePipelineGreBendMaterializedTopology, validatePipelineGreBendSharedSegments } from './pipeline-3d-model-gre-bend-lineage.js';
const EPSILON_MM = 1e-6, POINT_DECIMALS = 12;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0, text = (value) => typeof value === 'string' ? value.trim() : '';
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value)), diagnostic = (code, message, details = {}) => createPipelineGreBendMaterializationDiagnostic(code, message, details);
const finite = (value) => typeof value === 'number' && Number.isFinite(value), normalize = (value) => { const result = Number(value.toFixed(POINT_DECIMALS)); return Object.is(result, -0) ? 0 : result; };
const distance = (a, b) => Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y), Number(b.z) - Number(a.z)), point = (value) => ({ x: normalize(Number(value.x)), y: normalize(Number(value.y)), z: normalize(Number(value.z)) }); function authenticate(input, errors) {
  const geometry = input.greBendGeometryPlan, bend = input.bendResolution, routing = input.sectionProfileRoutingPlan;
  const geometryValid = plain(geometry) && geometry.schema === 'PipelineGreBendGeometryPlan.v1' && geometry.ready === true
    && Array.isArray(geometry.candidatePlans) && Array.isArray(geometry.blockerCodes) && geometry.blockerCodes.length === 0
    && Array.isArray(geometry.sharedSegmentConflicts) && geometry.sharedSegmentConflicts.length === 0
    && geometry.bendResolutionSchema === 'PipelineBendResolution.v3' && geometry.sectionProfileRoutingPlanSchema === 'PipelineSectionProfileRoutingPlan.v1'
    && geometry.greVendorSeriesPlanSchema === 'PipelineGreVendorSeriesPlan.v1';
  const bendValid = plain(bend) && bend.schema === 'PipelineBendResolution.v3' && Array.isArray(bend.candidates) && Array.isArray(bend.geometryRows);
  const routingValid = plain(routing) && routing.schema === 'PipelineSectionProfileRoutingPlan.v1' && routing.ready === true
    && Array.isArray(routing.candidateOwnership) && Array.isArray(routing.blockerCodes) && routing.blockerCodes.length === 0;
  if (!geometryValid) errors.push(diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_GEOMETRY_PLAN_INVALID',
    'One ready blocker-free GRE bend geometry plan is required.'));
  if (!bendValid) errors.push(diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_INPUT_INVALID',
    'Canonical PipelineBendResolution.v3 evidence is required.'));
  if (!routingValid) errors.push(diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_OWNERSHIP_INVALID',
    'One ready blocker-free section-profile routing plan is required.'));
  return { geometry: geometryValid ? geometry : { candidatePlans: [], notApplicableCandidateIds: [] }, bend: bendValid ? bend : { candidates: [], geometryRows: [] },
    routing: routingValid ? routing : { candidateOwnership: [], analysisSections: [] } };
}
function uniqueIndex(items, key, code, errors) {
  const result = Object.create(null);
  for (const item of items) {
    const id = text(item?.[key]);
    if (!id || result[id]) errors.push(diagnostic(code, 'Upstream identities must be unique.', { identity: id }));
    else result[id] = item;
  }
  return result;
}
function sectionOwner(sections, elementIndex) {
  let owner = null;
  [...(sections || [])].sort((a, b) => a.startElementIndex - b.startElementIndex).forEach((section) => {
    if (Number.isInteger(section.startElementIndex) && section.startElementIndex <= elementIndex) owner = section;
  });
  return owner;
}
function sameNumber(left, right) { return finite(left) && finite(right) && Math.abs(left - right) <= EPSILON_MM; }
function finitePoint(value) { return plain(value) && finite(value.x) && finite(value.y) && finite(value.z); }
function pointOnSegment(value, start, end, expected, errors, candidateId, role) {
  if (!finitePoint(value) || !finitePoint(start) || !finitePoint(end)) {
    errors.push(diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_CANDIDATE_INVALID',
      'Materialization points and source rows must contain finite coordinates.', { candidateId, role }));
    return;
  }
  const length = distance(start, end), along = distance(start, value), remainder = distance(value, end);
  if (!sameNumber(along, expected) || Math.abs(along + remainder - length) > EPSILON_MM) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_POINT_ORDER_INVALID',
    'Authenticated break or tangency point is not on its owning source element.',
    { candidateId, role, expectedDistanceMm: expected, actualDistanceMm: along }));
}
function candidateContext(candidate, bendIndex, ownerIndex, rows, sections, allocations, errors) {
  const id = text(candidate.candidateId), bend = bendIndex[id], owner = ownerIndex[id];
  if (!bend || text(bend.id) !== id || bend.incomingElementIndex !== candidate.incomingElementIndex
    || bend.outgoingElementIndex !== candidate.outgoingElementIndex || bend.previousNode !== candidate.previousNode
    || bend.cornerNode !== candidate.cornerNode || bend.nextNode !== candidate.nextNode
    || !sameNumber(bend.turnAngleDeg, candidate.turnAngleDeg) || !sameNumber(bend.radiusMm, candidate.bendRadiusMm)
    || !sameNumber(bend.tangentMm, candidate.tangentLengthMm)) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_CANDIDATE_INVALID',
    'Geometry-plan candidate identity must exactly match PipelineBendResolution.v3.', { candidateId: id }));
  const incomingOwner = sectionOwner(sections, candidate.incomingElementIndex);
  const outgoingOwner = sectionOwner(sections, candidate.outgoingElementIndex);
  if (!owner || owner.ready !== true || (owner.blockerCodes || []).length || owner.profileId !== 'gre'
    || owner.analysisSectionId !== candidate.analysisSectionId) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_OWNERSHIP_INVALID', 'Candidate requires exact ready GRE routing ownership.', { candidateId: id }));
  if (incomingOwner?.analysisSectionId !== candidate.analysisSectionId
    || outgoingOwner?.analysisSectionId !== candidate.analysisSectionId) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_SECTION_BOUNDARY_CONFLICT',
    'A GRE bend candidate cannot cross a canonical analysis-section boundary.', { candidateId: id }));
  if (candidate.status !== 'PLANNED' || candidate.ready !== true || (candidate.blockerCodes || []).length
    || (candidate.diagnostics || []).some((item) => item?.severity === 'BLOCKING') || candidate.profileId !== 'gre'
    || candidate.geometryFits !== true || candidate.breakEnvelopeFits !== true || candidate.sharedSegmentFits !== true) errors.push(
    diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_CANDIDATE_INVALID',
      'Only ready PLANNED GRE geometry candidates may be materialized.', { candidateId: id }));
  if (!text(candidate.vendorId) || !text(candidate.seriesId) || !text(candidate.qualificationEvidenceId)
    || !text(candidate.sourceAuthority) || !text(candidate.sourceReference)) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_VENDOR_IDENTITY_CONFLICT',
    'Qualified section-local GRE vendor identity and provenance are required.', { candidateId: id }));
  if (!['EACH_LEG_FROM_CORNER', 'EACH_LEG_FROM_TANGENCY'].includes(candidate.bendBreakLengthApplication)) errors.push(
    diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_BREAK_APPLICATION_INVALID',
      'Break-length application must be authenticated by the geometry plan.', { candidateId: id }));
  const incoming = candidate.incomingElementIndex, outgoing = candidate.outgoingElementIndex;
  const previous = rows[incoming], corner = rows[outgoing], next = rows[outgoing + 1];
  const incomingLength = finitePoint(previous) && finitePoint(corner) ? distance(previous, corner) : NaN;
  const outgoingLength = finitePoint(corner) && finitePoint(next) ? distance(corner, next) : NaN;
  const tangent = candidate.tangentLengthMm, inBreak = candidate.incomingBreakDistanceFromCornerMm;
  const outBreak = candidate.outgoingBreakDistanceFromCornerMm;
  if (![incomingLength, outgoingLength, tangent, inBreak, outBreak].every(finite)
    || inBreak + EPSILON_MM < tangent || outBreak + EPSILON_MM < tangent) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_POINT_ORDER_INVALID',
    'Break points must not fall between tangency and the inactive corner.', { candidateId: id }));
  pointOnSegment(candidate.incomingBreakPoint, previous, corner, incomingLength - inBreak, errors, id, 'GRE_INCOMING_BREAK');
  pointOnSegment(candidate.incomingTangencyPoint, previous, corner, incomingLength - tangent, errors, id, 'GRE_INCOMING_TANGENCY');
  pointOnSegment(candidate.outgoingTangencyPoint, corner, next, tangent, errors, id, 'GRE_OUTGOING_TANGENCY');
  pointOnSegment(candidate.outgoingBreakPoint, corner, next, outBreak, errors, id, 'GRE_OUTGOING_BREAK');
  const roleAllocations = Object.fromEntries(['GRE_INCOMING_BREAK', 'GRE_INCOMING_TANGENCY',
    'GRE_OUTGOING_TANGENCY', 'GRE_OUTGOING_BREAK'].map((role) => [role, allocations[`${id}:${role}`]]));
  if (Object.values(roleAllocations).some((item) => !item)) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_NODE_ALLOCATION_CONFLICT',
    'Every GRE candidate requires four authenticated inserted-node allocations.', { candidateId: id }));
  return { candidate, bend, owner, previous, corner, next, incomingLength, outgoingLength, allocations: roleAllocations };
}
function originalNodes(rows, sections, contexts, errors) {
  const corners = new Map(contexts.map((context) => [context.candidate.cornerNode, context]));
  return rows.map((row, rowIndex) => {
    if (!finitePoint(row) || !Number.isSafeInteger(row.nodeNumber)) errors.push(diagnostic(
      'PIPELINE_GRE_BEND_MATERIALIZATION_INPUT_INVALID', 'Canonical geometry rows require finite coordinates and node numbers.',
      { rowIndex }));
    const context = corners.get(row.nodeNumber), sourceIndexes = [rowIndex - 1, rowIndex]
      .filter((index) => index >= 0 && index < rows.length - 1);
    const owner = context?.owner || sectionOwner(sections, Math.min(rowIndex, rows.length - 2));
    return createPipelineGreBendMaterializedNode({ materializedNodeId: `route-node:${row.nodeNumber}`,
      nodeNumber: row.nodeNumber, nodeRole: context ? 'INACTIVE_CORNER_REFERENCE' : 'ORIGINAL_ROUTE_NODE',
      coordinates: { x: row.x, y: row.y, z: row.z }, analysisSectionId: owner?.analysisSectionId || '',
      candidateId: context?.candidate.candidateId || '', sourceNodeNumber: row.nodeNumber,
      sourceElementIndexes: Object.freeze(sourceIndexes), sourceRow: row,
      sourceAuthority: 'PIPELINE_BEND_RESOLUTION_GEOMETRY_ROWS', sourceReference: `geometryRows[${rowIndex}]`,
      inserted: false, active: !context });
  });
}
function insertedNodes(contexts) {
  const fields = { GRE_INCOMING_BREAK: 'incomingBreakPoint', GRE_INCOMING_TANGENCY: 'incomingTangencyPoint',
    GRE_OUTGOING_TANGENCY: 'outgoingTangencyPoint', GRE_OUTGOING_BREAK: 'outgoingBreakPoint' };
  return contexts.flatMap((context) => Object.entries(fields).map(([role, field]) => {
    const allocation = context.allocations[role], incoming = role.startsWith('GRE_INCOMING');
    return createPipelineGreBendMaterializedNode({ materializedNodeId: allocation.materializedNodeId,
      nodeNumber: allocation.nodeNumber, nodeRole: role, coordinates: point(context.candidate[field]),
      analysisSectionId: context.candidate.analysisSectionId, candidateId: context.candidate.candidateId,
      sourceNodeNumber: null, sourceElementIndexes: Object.freeze([incoming
        ? context.candidate.incomingElementIndex : context.candidate.outgoingElementIndex]),
      sourceAuthority: context.candidate.sourceAuthority, sourceReference: context.candidate.sourceReference,
      inserted: true, active: true });
  }));
}
function cutsBySegment(contexts) {
  const result = Object.create(null), add = (index, item) => { (result[index] ||= []).push(item); };
  for (const context of contexts) {
    const c = context.candidate, a = context.allocations;
    add(c.incomingElementIndex, { nodeId: a.GRE_INCOMING_BREAK.materializedNodeId,
      position: context.incomingLength - c.incomingBreakDistanceFromCornerMm,
      role: 'GRE_INCOMING_BREAK', candidateId: c.candidateId, context });
    add(c.incomingElementIndex, { nodeId: a.GRE_INCOMING_TANGENCY.materializedNodeId,
      position: context.incomingLength - c.tangentLengthMm,
      role: 'GRE_INCOMING_TANGENCY', candidateId: c.candidateId, context });
    add(c.outgoingElementIndex, { nodeId: a.GRE_OUTGOING_TANGENCY.materializedNodeId,
      position: c.tangentLengthMm, role: 'GRE_OUTGOING_TANGENCY', candidateId: c.candidateId, context });
    add(c.outgoingElementIndex, { nodeId: a.GRE_OUTGOING_BREAK.materializedNodeId,
      position: c.outgoingBreakDistanceFromCornerMm,
      role: 'GRE_OUTGOING_BREAK', candidateId: c.candidateId, context });
  }
  return result;
}
const roleRank = { ORIGINAL_ROUTE_NODE: 0, GRE_OUTGOING_TANGENCY: 10, GRE_OUTGOING_BREAK: 20,
  GRE_INCOMING_BREAK: 30, GRE_INCOMING_TANGENCY: 40 };
function intervalKind(left, right, length) {
  if (left.candidateId && left.candidateId === right.candidateId
    && left.role === 'GRE_INCOMING_BREAK' && right.role === 'GRE_INCOMING_TANGENCY') return {
    kind: 'GRE_INCOMING_TRANSITION', disposition: length <= EPSILON_MM
      ? 'COINCIDENT_ZERO_LENGTH_AUTHORIZED' : 'SPLIT_BY_INCOMING_TANGENCY' };
  if (left.candidateId && left.candidateId === right.candidateId
    && left.role === 'GRE_OUTGOING_TANGENCY' && right.role === 'GRE_OUTGOING_BREAK') return {
    kind: 'GRE_OUTGOING_TRANSITION', disposition: length <= EPSILON_MM
      ? 'COINCIDENT_ZERO_LENGTH_AUTHORIZED' : 'SPLIT_BY_OUTGOING_TANGENCY' };
  if (length <= EPSILON_MM && left.candidateId !== right.candidateId) return {
    kind: 'SPLIT_STRAIGHT', disposition: 'COINCIDENT_ENVELOPE_CONTACT' };
  const affected = left.role !== 'ORIGINAL_ROUTE_NODE' || right.role !== 'ORIGINAL_ROUTE_NODE';
  const disposition = right.role === 'GRE_INCOMING_BREAK' ? 'SPLIT_BY_INCOMING_BREAK'
    : left.role === 'GRE_OUTGOING_BREAK' ? 'SPLIT_BY_OUTGOING_BREAK' : affected ? 'SPLIT_BY_INCOMING_TANGENCY' : 'UNCHANGED';
  return { kind: affected ? 'SPLIT_STRAIGHT' : 'UNCHANGED_STRAIGHT', disposition };
}
function segmentElements(rows, sections, cuts, nodeIndex) {
  const result = [];
  for (let index = 0; index < rows.length - 1; index += 1) {
    const length = distance(rows[index], rows[index + 1]), points = [];
    const start = nodeIndex[`route-node:${rows[index].nodeNumber}`], end = nodeIndex[`route-node:${rows[index + 1].nodeNumber}`];
    if (start?.active) points.push({ nodeId: start.materializedNodeId, position: 0, role: 'ORIGINAL_ROUTE_NODE', candidateId: '' });
    points.push(...(cuts[index] || []));
    if (end?.active) points.push({ nodeId: end.materializedNodeId, position: length, role: 'ORIGINAL_ROUTE_NODE', candidateId: '' });
    points.sort((a, b) => a.position - b.position || (roleRank[a.role] || 99) - (roleRank[b.role] || 99)
      || compare(a.candidateId, b.candidateId));
    for (let part = 0; part < points.length - 1; part += 1) {
      const left = points[part], right = points[part + 1], span = Math.max(0, right.position - left.position);
      const resolved = intervalKind(left, right, span);
      const candidateId = left.candidateId === right.candidateId ? left.candidateId : (!left.candidateId ? right.candidateId : !right.candidateId ? left.candidateId : '');
      const context = candidateId ? (left.context || right.context) : null;
      const local = resolved.kind.includes('TRANSITION') ? context?.candidate.bendLocalThicknessMm ?? null : null;
      result.push(createPipelineGreBendMaterializedElement({ materializedElementId: `gre-element:E${index + 1}:${part + 1}`,
        elementKind: resolved.kind, fromMaterializedNodeId: left.nodeId, toMaterializedNodeId: right.nodeId,
        analysisSectionId: sectionOwner(sections, index)?.analysisSectionId || '', candidateId,
        sourceElementIndexes: Object.freeze([index]), lineageDisposition: resolved.disposition,
        outsideDiameterMm: null, wallThicknessMm: null, localThicknessMm: local,
        vendorId: local !== null ? context?.candidate.vendorId || '' : '', seriesId: local !== null ? context?.candidate.seriesId || '' : '',
        requirementReference: local !== null ? context?.candidate.requirementReference || '' : '',
        sourceAuthority: context?.candidate.sourceAuthority || 'PIPELINE_BEND_RESOLUTION_GEOMETRY_ROWS',
        sourceReference: context?.candidate.sourceReference || `E${index + 1}`, lengthMm: normalize(span), orderIndex: 0 }));
    }
  }
  return result;
}
function bendEvidence(context) {
  const c = context.candidate, incoming = context.allocations.GRE_INCOMING_TANGENCY.materializedNodeId;
  const outgoing = context.allocations.GRE_OUTGOING_TANGENCY.materializedNodeId;
  const inactive = `route-node:${c.cornerNode}`, componentId = `gre-bend-component:${c.candidateId}`;
  const length = c.bendRadiusMm * c.turnAngleDeg * Math.PI / 180;
  const element = createPipelineGreBendMaterializedElement({ materializedElementId: `gre-bend:${c.candidateId}`,
    elementKind: 'GRE_BEND', fromMaterializedNodeId: incoming, toMaterializedNodeId: outgoing,
    analysisSectionId: c.analysisSectionId, candidateId: c.candidateId,
    sourceElementIndexes: Object.freeze([c.incomingElementIndex, c.outgoingElementIndex]),
    lineageDisposition: 'REPLACED_BY_GRE_BEND', outsideDiameterMm: null, wallThicknessMm: null,
    localThicknessMm: c.bendLocalThicknessMm, vendorId: c.vendorId, seriesId: c.seriesId,
    requirementReference: c.requirementReference, sourceAuthority: c.sourceAuthority,
    sourceReference: c.sourceReference, lengthMm: normalize(length), orderIndex: 0 });
  const component = createPipelineGreBendComponent({ componentId, candidateId: c.candidateId,
    analysisSectionId: c.analysisSectionId, incomingTangencyNodeId: incoming, outgoingTangencyNodeId: outgoing,
    inactiveCornerReferenceId: inactive, bendRadiusMm: c.bendRadiusMm, turnAngleDeg: c.turnAngleDeg,
    bendBreakLengthApplication: c.bendBreakLengthApplication, localThicknessMm: c.bendLocalThicknessMm,
    vendorId: c.vendorId, seriesId: c.seriesId, qualificationEvidenceId: c.qualificationEvidenceId,
    requirementReference: c.requirementReference, sourceElementIndexes: Object.freeze([c.incomingElementIndex, c.outgoingElementIndex]),
    sourceAuthority: c.sourceAuthority, sourceReference: c.sourceReference, semanticArcOnly: true, sampledNodeIds: Object.freeze([]) });
  return { element, component, inactive, componentId };
}
function orderedElements(straights, bends) {
  const byIncoming = Object.fromEntries(bends.map((item) => [item.context.candidate.incomingElementIndex, item]));
  const grouped = Object.create(null), result = []; straights.forEach((item) => {
    const index = item.sourceElementIndexes[0]; (grouped[index] ||= []).push(item); });
  const sourceCount = Math.max(-1, ...straights.map((item) => item.sourceElementIndexes[0])) + 1;
  for (let index = 0; index < sourceCount; index += 1) {
    result.push(...(grouped[index] || []));
    if (byIncoming[index]) result.push(byIncoming[index].element);
  }
  return result.map((item, orderIndex) => createPipelineGreBendMaterializedElement({ ...item, orderIndex }));
}
export function resolvePipelineGreBendMaterializationPlan(input = {}) {
  const errors = [], source = authenticate(plain(input) ? input : {}, errors);
  const bendIndex = uniqueIndex(source.bend.candidates, 'id', 'PIPELINE_GRE_BEND_MATERIALIZATION_CANDIDATE_INVALID', errors);
  const ownerIndex = uniqueIndex(source.routing.candidateOwnership, 'candidateId', 'PIPELINE_GRE_BEND_MATERIALIZATION_OWNERSHIP_INVALID', errors);
  const nodeAllocationPlan = resolvePipelineGreBendNodeAllocationPlan({ greBendGeometryPlan: source.geometry,
    bendResolution: source.bend, nodeAllocationPolicy: input?.nodeAllocationPolicy });
  errors.push(...nodeAllocationPlan.diagnostics);
  const allocations = indexPipelineGreBendNodeAllocations(nodeAllocationPlan);
  const candidates = [...source.geometry.candidatePlans].sort((a, b) => a.incomingElementIndex - b.incomingElementIndex || compare(a.candidateId, b.candidateId));
  const contexts = candidates.map((candidate) => candidateContext(candidate, bendIndex, ownerIndex,
    source.bend.geometryRows, source.routing.analysisSections, allocations, errors));
  errors.push(...validatePipelineGreBendSharedSegments(contexts).diagnostics);
  for (const id of source.geometry.notApplicableCandidateIds || []) if (!['normal-metallic', 'asme-b31.4'].includes(ownerIndex[id]?.profileId)) errors.push(diagnostic('PIPELINE_GRE_BEND_MATERIALIZATION_OWNERSHIP_INVALID', 'Not-applicable candidates require exact metallic profile ownership.', { candidateId: id }));
  const covered = new Set([...candidates.map((item) => item.candidateId), ...(source.geometry.notApplicableCandidateIds || [])]);
  if (covered.size !== source.bend.candidates.length || source.bend.candidates.some((item) => !covered.has(item.id))) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_COVERAGE_INVALID',
    'Every bend candidate must be applied once or declared not applicable.',
    { bendCandidateCount: source.bend.candidates.length, coveredCandidateCount: covered.size }));
  if (errors.length) return createPipelineGreBendAbortedMaterializationPlan({ sourceGeometryPlanSchema: text(source.geometry.schema),
    sourceBendResolutionSchema: text(source.bend.schema), sourceRoutingPlanSchema: text(source.routing.schema), nodeAllocationPlan,
    notApplicableCandidateIds: source.geometry.notApplicableCandidateIds }, errors);
  const original = originalNodes(source.bend.geometryRows, source.routing.analysisSections, contexts, errors);
  const inserted = insertedNodes(contexts), nodes = [...original, ...inserted];
  const nodeIndex = Object.fromEntries(nodes.map((item) => [item.materializedNodeId, item]));
  const straights = segmentElements(source.bend.geometryRows, source.routing.analysisSections, cutsBySegment(contexts), nodeIndex);
  const bends = contexts.map((context) => ({ context, ...bendEvidence(context) }));
  const elements = orderedElements(straights, bends), components = bends.map((item) => item.component);
  const elementEvidence = buildPipelineGreBendElementLineage({ sourceRows: source.bend.geometryRows,
    materializedElements: elements });
  const candidateContexts = bends.map((item) => ({ candidate: item.context.candidate,
    insertedNodeIds: Object.values(item.context.allocations).map((allocation) => allocation.materializedNodeId),
    bendElementId: item.element.materializedElementId, bendComponentId: item.componentId,
    inactiveCornerReferenceId: item.inactive,
    successorElementIds: elements.filter((element) => element.candidateId === item.context.candidate.candidateId)
      .map((element) => element.materializedElementId) }));
  const candidateEvidence = buildPipelineGreBendCandidateLineage(candidateContexts);
  const topology = validatePipelineGreBendMaterializedTopology({ nodes, elements, components });
  errors.push(...elementEvidence.diagnostics, ...candidateEvidence.diagnostics, ...topology.diagnostics);
  const coverage = { sourceNodeCount: source.bend.geometryRows.length, originalNodeCount: original.length,
    insertedNodeCount: inserted.length, sourceElementCount: Math.max(0, source.bend.geometryRows.length - 1),
    materializedElementCount: elements.length, appliedCandidateCount: contexts.length,
    notApplicableCandidateCount: (source.geometry.notApplicableCandidateIds || []).length,
    inactiveCornerCount: bends.length, coveredSourceElementCount: elementEvidence.coveredSourceElementCount,
    coveredSuccessorElementCount: elementEvidence.coveredSuccessorElementCount };
  if (coverage.insertedNodeCount !== contexts.length * 4 || coverage.inactiveCornerCount !== contexts.length
    || coverage.coveredSourceElementCount !== coverage.sourceElementCount
    || coverage.coveredSuccessorElementCount !== coverage.materializedElementCount) errors.push(diagnostic(
    'PIPELINE_GRE_BEND_MATERIALIZATION_COVERAGE_INVALID', 'Materialized topology coverage is incomplete.', coverage));
  const model = createPipelineGreBendMaterializedModel({ serializationNormalization: `ROUND_INSERTED_POINTS_${POINT_DECIMALS}_DECIMALS`, sourceRows: source.bend.geometryRows,
    nodes: Object.freeze(nodes), elements: Object.freeze(elements),
    bendComponents: Object.freeze(components), inactiveCornerReferences: Object.freeze(bends.map((item) => item.inactive)),
    sourceAuthority: 'PIPELINE_GRE_BEND_GEOMETRY_PLAN', sourceReference: text(source.geometry.schema) }, errors); errors.push(...model.diagnostics);
  if (errors.length) return createPipelineGreBendAbortedMaterializationPlan({ sourceGeometryPlanSchema: text(source.geometry.schema),
    sourceBendResolutionSchema: text(source.bend.schema), sourceRoutingPlanSchema: text(source.routing.schema), nodeAllocationPlan,
    notApplicableCandidateIds: source.geometry.notApplicableCandidateIds, coverage }, errors);
  return createPipelineGreBendMaterializationPlan({ sourceGeometryPlanSchema: text(source.geometry.schema),
    sourceBendResolutionSchema: text(source.bend.schema), sourceRoutingPlanSchema: text(source.routing.schema),
    nodeAllocationPlan, materializedModel: model, candidateLineage: candidateEvidence.candidateLineage,
    elementLineage: elementEvidence.elementLineage, appliedCandidateIds: Object.freeze(contexts.map((item) => item.candidate.candidateId)),
    notApplicableCandidateIds: Object.freeze([...(source.geometry.notApplicableCandidateIds || [])].sort(compare)),
    inactiveCornerReferences: model.inactiveCornerReferences, coverage });
}
