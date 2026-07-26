/** Read-only four-method Topology host; no persistence, acceptance, renderer or gesture access. */
import { immutableJson, requiredContractText } from '../../contracts/contract-values.js';
import {
  SCOPED_EDIT_ENTITY_GEOMETRY_V1,
  validateScopedEditEntityGeometry,
} from '../../core/scoped-edit-runtime/scoped-edit-contracts.js';
import { assertScopedEditHostContract } from '../../core/scoped-edit-runtime/scoped-edit-host.js';
import { TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1 } from './topology-scoped-edit-read-model.js';
import { buildTopologyScopedEditEngineeringScene } from './topology-scoped-edit-scene-adapter.js';
import { createTopologyScopedEditDryRun } from './topology-scoped-edit-journal-projection.js';
import { resolveTopologyScopedEditScope, STALE_TOPOLOGY_SCOPE_AUTHORITY } from './topology-scoped-edit-scope-adapter.js';

export const TOPOLOGY_READ_ONLY_HOST_DESTROYED = 'TOPOLOGY_READ_ONLY_HOST_DESTROYED';
export const STALE_TOPOLOGY_HOST_AUTHORITY = 'STALE_TOPOLOGY_HOST_AUTHORITY';
export const TOPOLOGY_READ_ONLY_HOST_REJECTION = Object.freeze({
  UNKNOWN_ENTITY: 'TOPOLOGY_HOST_UNKNOWN_ENTITY',
  GEOMETRY_UNSUPPORTED: 'TOPOLOGY_HOST_GEOMETRY_UNSUPPORTED',
  GEOMETRY_INVALID: 'TOPOLOGY_HOST_GEOMETRY_INVALID',
});

function fail(code, message, Constructor = RangeError) {
  const error = new Constructor(message);
  error.code = code;
  throw error;
}

function requiredCore(core) {
  if (typeof core?.appendTopologyEditCommand !== 'function') {
    throw new TypeError('Topology read-only host requires the pure appendTopologyEditCommand replay core.');
  }
  return core;
}

function hostState(input) {
  if (input.readModel?.schema !== TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1) {
    throw new TypeError(`Topology host requires ${TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1}.`);
  }
  const provider = input.authorityProvider ?? (() => input.readModel.authorityId);
  if (typeof provider !== 'function') throw new TypeError('authorityProvider must be a function.');
  const scene = buildTopologyScopedEditEngineeringScene(input.readModel);
  return { readModel: input.readModel, core: requiredCore(input.core), provider, scene,
    entityIndex: new Map(scene.entities.map((entity) => [entity.id, entity])), destroyed: false };
}

function assertLive(state, staleCode = STALE_TOPOLOGY_HOST_AUTHORITY) {
  if (state.destroyed) fail(TOPOLOGY_READ_ONLY_HOST_DESTROYED,
    'Topology read-only host is unavailable after destroy().');
  const current = requiredContractText(state.provider(), 'current Topology authorityId');
  if (current !== state.readModel.authorityId) fail(staleCode,
    `Topology host authority ${state.readModel.authorityId} is stale against ${current}.`);
}

function pointAnchor(entity) {
  const geometry = entity.geometry;
  if (geometry?.kind !== 'point') fail(TOPOLOGY_READ_ONLY_HOST_REJECTION.GEOMETRY_UNSUPPORTED,
    `Entity ${entity.id} does not expose authoritative point-anchor geometry.`);
  const point = geometry.position;
  if (![point?.x, point?.y, point?.z].every(Number.isFinite)) {
    fail(TOPOLOGY_READ_ONLY_HOST_REJECTION.GEOMETRY_INVALID,
      `Entity ${entity.id} geometry is not finite.`, TypeError);
  }
  return [point.x, point.y, point.z];
}

function readGeometry(state, entityIdInput) {
  assertLive(state);
  const entityId = requiredContractText(entityIdInput, 'entityId');
  const entity = state.entityIndex.get(entityId);
  if (!entity) fail(TOPOLOGY_READ_ONLY_HOST_REJECTION.UNKNOWN_ENTITY,
    `Topology scene entity ${entityId} does not exist.`);
  return validateScopedEditEntityGeometry({ schema: SCOPED_EDIT_ENTITY_GEOMETRY_V1,
    entityId, anchor: pointAnchor(entity) });
}

function scopeEvidence(state, request) {
  assertLive(state, STALE_TOPOLOGY_SCOPE_AUTHORITY);
  return resolveTopologyScopedEditScope({ readModel: state.readModel, scene: state.scene, request });
}

function dryRun(state, currentProjection, envelope) {
  assertLive(state);
  return createTopologyScopedEditDryRun({ readModel: state.readModel,
    currentProjection, envelope, core: state.core });
}

function destroy(state) {
  if (!state.destroyed) state.destroyed = true;
  return immutableJson({ destroyed: true, authorityId: state.readModel.authorityId },
    'Topology read-only host destroy evidence');
}

export function createTopologyScopedEditReadOnlyHost(input = {}) {
  const state = hostState(input);
  const host = Object.freeze({
    scene() { assertLive(state); return state.scene; },
    resolveScope(request) { return scopeEvidence(state, request).scope; },
    resolveScopeEvidence(request) { return scopeEvidence(state, request); },
    entityGeometry(entityId) { return readGeometry(state, entityId); },
    appendEditCommand(currentProjection, envelope) {
      return dryRun(state, currentProjection, envelope).candidateProjection;
    },
    dryRun(currentProjection, envelope) { return dryRun(state, currentProjection, envelope); },
    destroy() { return destroy(state); },
  });
  assertScopedEditHostContract(host);
  return host;
}
