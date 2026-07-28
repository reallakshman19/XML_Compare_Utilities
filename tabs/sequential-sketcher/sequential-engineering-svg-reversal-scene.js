/** Read-only EngineeringScene projection of native Sequential reversal candidates. */
import {
  createEngineeringSceneEntity,
  createPointGeometry,
} from '../../core/engineering-scene/index.js';

function text(value) { return String(value || '').trim(); }
function point(value) {
  if (!value || !['x', 'y', 'z'].every((axis) => Number.isFinite(value[axis]))) return null;
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}
function propertyId(entityId) { return `ssk:properties:${entityId}`; }

function omission(omissions, candidate, reason) {
  omissions.push(Object.freeze({
    category: 'reversalCandidate',
    id: text(candidate?.candidateId) || null,
    reason,
  }));
  return null;
}

function reversalEntity(candidate, omissions) {
  const candidateId = text(candidate?.candidateId);
  const componentId = text(candidate?.componentId);
  const entryPortId = text(candidate?.entryPortId);
  if (!candidateId || !componentId || !entryPortId) {
    return omission(omissions, candidate, 'REVERSAL_CANDIDATE_IDENTITY_MISSING');
  }
  const position = point(candidate.sourcePosition);
  if (!position) return omission(omissions, candidate, 'REVERSAL_ENTRY_PORT_POSITION_MISSING');
  const id = `ssk:reversal:${candidateId}`;
  return createEngineeringSceneEntity({
    id,
    kind: 'point',
    domainType: 'SEQUENTIAL_REVERSAL_CANDIDATE',
    geometry: createPointGeometry(position),
    domainRef: {
      owner: 'sequential-sketcher',
      category: 'reversalCandidate',
      candidateId,
      componentId,
      entryPortId,
    },
    propertySetIds: [propertyId(id)],
    editCapabilities: [],
    layer: 'sequential-reversal-candidate',
    renderOrder: 35,
    contributesToFit: false,
    metadata: {
      sequential: {
        category: 'reversalCandidate',
        status: 'NOT_CONFIRMED',
        candidate,
      },
    },
  });
}

export function buildSequentialReversalSceneEntities(authority, omissions = []) {
  return Object.freeze((authority?.reversalCandidates || [])
    .map((candidate) => reversalEntity(candidate, omissions))
    .filter(Boolean));
}

export const _test = Object.freeze({ point, reversalEntity });
