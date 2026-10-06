import { deepFreeze, stableId } from './cii-workspace-contracts.js';
import { scoreCiiEdgeCandidate } from './cii-workspace-evidence.js';

function confidence(evidence) {
  if (evidence.hardFail) return 'CONFLICT';
  if (evidence.identityConfidence === 'HIGH') return 'HIGH';
  if (['MEDIUM', 'REVIEW'].includes(evidence.identityConfidence)) return 'REVIEW';
  return 'UNRESOLVED';
}

function elementRow(operation, options) {
  if (operation.op === 'MATCH') {
    const evidence = scoreCiiEdgeCandidate(operation.refEdge, operation.targetEdge, options);
    return deepFreeze({
      correspondenceId: stableId('element', operation.refEdge.elementId, operation.targetEdge.elementId),
      kind: 'ELEMENT',
      sourceElementId: operation.refEdge.elementId,
      targetElementIds: Object.freeze([operation.targetEdge.elementId]),
      status: confidence(evidence),
      authority: 'PATH_SEQUENCE_ALIGNMENT',
      evidence,
    });
  }
  if (operation.op === 'DELETE_REFERENCE') {
    return deepFreeze({
      correspondenceId: stableId('delete', operation.refEdge?.elementId),
      kind: 'ELEMENT',
      sourceElementId: operation.refEdge?.elementId || null,
      targetElementIds: Object.freeze([]),
      status: 'DELETED',
      authority: 'PATH_SEQUENCE_ALIGNMENT',
    });
  }
  if (operation.op === 'INSERT_TARGET') {
    return deepFreeze({
      correspondenceId: stableId('insert-element', operation.targetEdge?.elementId),
      kind: 'ELEMENT',
      sourceElementId: null,
      targetElementIds: Object.freeze(operation.targetEdge?.elementId ? [operation.targetEdge.elementId] : []),
      status: 'INSERTED',
      authority: 'PATH_SEQUENCE_ALIGNMENT',
    });
  }
  return null;
}

function matchedEndpointEvidence(operation, endpoint, options) {
  if (operation?.op !== 'MATCH') return null;
  const evidence = scoreCiiEdgeCandidate(operation.refEdge, operation.targetEdge, options);
  const m1 = evidence.methods?.m1Spatial; const m2 = evidence.methods?.m2Network;
  const index = endpoint === 'FROM' ? 0 : 1; const distance = Number(m1?.endpointDistancesMm?.[index]);
  const tolerance = Number(m1?.toleranceMm);
  const supported = evidence.hardFail !== true && m1?.available === true && m1?.basis === 'REGISTERED'
    && m1?.orientation === 'DIRECT' && Number.isFinite(distance) && Number.isFinite(tolerance) && distance <= tolerance
    && m2?.pass === true && evidence.dimensions?.diameter?.pass === true;
  return deepFreeze({ identitySupported: supported, endpoint, endpointDistanceMm: Number.isFinite(distance) ? distance : null,
    toleranceMm: Number.isFinite(tolerance) ? tolerance : null, m1Pass: m1?.pass === true, m2Pass: m2?.pass === true,
    diameterPass: evidence.dimensions?.diameter?.pass === true, orientation: m1?.orientation || null, elementEvidence: evidence });
}
function boundaryIdentity(sourceNodeId, targetNodeId, supports) {
  const rows = supports.filter(Boolean); const supported = rows.length > 0 && rows.every((row) => row.identitySupported === true);
  return deepFreeze({ identitySupported: supported, sourceNodeId, targetNodeId,
    supportingSides: deepFreeze(rows.map((row) => row.endpoint)), supportCount: rows.length,
    reason: supported ? 'REGISTERED_ENDPOINT_M2_OD_SUPPORTED' : 'BOUNDARY_ENDPOINT_EVIDENCE_INSUFFICIENT' });
}
function matchMatchBoundary(left, right, options) {
  const sourceNodeId = String(left.refEdge?.routeTo ?? ''); const targetNodeId = String(left.targetEdge?.routeTo ?? '');
  if (!sourceNodeId || !targetNodeId || String(right.refEdge?.routeFrom ?? '') !== sourceNodeId
    || String(right.targetEdge?.routeFrom ?? '') !== targetNodeId) return null;
  const leftEvidence = scoreCiiEdgeCandidate(left.refEdge, left.targetEdge, options);
  const rightEvidence = scoreCiiEdgeCandidate(right.refEdge, right.targetEdge, options);
  if (leftEvidence.hardFail || rightEvidence.hardFail) return null;
  const local = boundaryIdentity(sourceNodeId, targetNodeId,
    [matchedEndpointEvidence(left, 'TO', options), matchedEndpointEvidence(right, 'FROM', options)]);
  const status = leftEvidence.identityConfidence === 'HIGH' && rightEvidence.identityConfidence === 'HIGH' ? 'HIGH' : 'REVIEW';
  return { sourceNodeId, targetNodeId, status,
    evidence: { leftElement: leftEvidence, rightElement: rightEvidence, boundaryIdentity: local } };
}
function matchInsertBoundary(match, insert, side, options) {
  const left = side === 'LEFT'; const sourceNodeId = String(left ? match.refEdge?.routeTo : match.refEdge?.routeFrom ?? '');
  const targetNodeId = String(left ? match.targetEdge?.routeTo : match.targetEdge?.routeFrom ?? '');
  const insertNodeId = String(left ? insert.targetEdge?.routeFrom : insert.targetEdge?.routeTo ?? '');
  if (!sourceNodeId || !targetNodeId || insertNodeId !== targetNodeId) return null;
  const matched = matchedEndpointEvidence(match, left ? 'TO' : 'FROM', options);
  const local = boundaryIdentity(sourceNodeId, targetNodeId, [matched]);
  if (!local.identitySupported) return null;
  return { sourceNodeId, targetNodeId, status: 'REVIEW',
    evidence: { leftElement: left ? matched.elementEvidence : null, rightElement: left ? null : matched.elementEvidence,
      boundaryIdentity: local } };
}
function boundaryRow(left, right, options) {
  let projected = null;
  if (left?.op === 'MATCH' && right?.op === 'MATCH') projected = matchMatchBoundary(left, right, options);
  else if (left?.op === 'MATCH' && right?.op === 'INSERT_TARGET') projected = matchInsertBoundary(left, right, 'LEFT', options);
  else if (left?.op === 'INSERT_TARGET' && right?.op === 'MATCH') projected = matchInsertBoundary(right, left, 'RIGHT', options);
  if (!projected) return null;
  return deepFreeze({ correspondenceId: stableId('node', projected.sourceNodeId, projected.targetNodeId), kind: 'NODE',
    sourceNodeId: projected.sourceNodeId, targetNodeId: projected.targetNodeId, status: projected.status,
    authority: 'ADJACENT_MATCH_BOUNDARY', evidence: deepFreeze(projected.evidence) });
}

export function deriveCiiAlignmentCorrespondence(alignment, options = {}) {
  const operations = Array.isArray(alignment?.operations) ? alignment.operations : [];
  const elementRows = operations.map((operation) => elementRow(operation, options)).filter(Boolean);
  const nodeRows = [];
  for (let index = 0; index < operations.length - 1; index += 1) {
    const row = boundaryRow(operations[index], operations[index + 1], options);
    if (row && !nodeRows.some((item) => item.correspondenceId === row.correspondenceId)) nodeRows.push(row);
  }
  return deepFreeze({ elementRows: Object.freeze(elementRows), nodeRows: Object.freeze(nodeRows) });
}
