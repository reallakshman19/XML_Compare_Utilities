/** Behavioral certification for a supplied Topology read-only host factory. */
import { immutableJson } from '../../contracts/contract-values.js';
import { validateEngineeringScene } from '../../core/engineering-scene/engineering-contract-validation.js';
import { assertEngineeringScope } from '../../core/engineering-scope/engineering-scope-contracts.js';
import { isScopedEditDeeplyFrozen } from '../../core/scoped-edit-runtime/scoped-edit-host.js';
import { semanticHash } from './topology-validator-values.js';
import { TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1 } from './topology-scoped-edit-read-model.js';
import { TOPOLOGY_SECTIONAL_SCOPE_UNSUPPORTED } from './topology-scoped-edit-scope-adapter.js';
import { TOPOLOGY_READ_ONLY_HOST_DESTROYED } from './topology-scoped-edit-read-only-host.js';

export const TOPOLOGY_SCOPED_EDIT_READ_ONLY_HOST_CONFORMANCE_V1 =
  'TopologyScopedEditReadOnlyHostConformance.v1';

const DEFAULT_SCALES = Object.freeze({ scene: 1000, selection: 500, structural: 500,
  sectional: 250, geometry: 1000, authorized: 1000, boundary: 1000, excluded: 1000,
  stale: 500, mismatch: 500, corruption: 250, remount: 100 });

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} is required.`);
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function expectCode(action, expected, label) {
  try { action(); }
  catch (error) {
    const accepted = Array.isArray(expected) ? expected : [expected];
    if (accepted.includes(error.code)) return error.code;
    throw new Error(`${label} rejected with ${error.code || error.name}, expected ${accepted.join('|')}.`);
  }
  throw new Error(`${label} did not reject.`);
}

function fixture(input) {
  const required = ['hostFactory', 'authorityGet', 'authoritySet', 'sentinelSnapshot'];
  required.forEach((name) => requiredFunction(input[name], name));
  if (input.readModelA0?.schema !== TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1
    || input.readModelA1?.schema !== TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1) {
    throw new TypeError('Conformance requires A0 and A1 Topology read models.');
  }
  return input;
}

function hostFor(f, readModel = f.readModelA0) {
  return f.hostFactory({ readModel, core: f.core, authorityProvider: f.authorityGet,
    sentinels: f.sentinels });
}

function inputSnapshot(f) {
  return semanticHash({ readModelA0: f.readModelA0, readModelA1: f.readModelA1,
    selectionRequests: f.selectionRequests, structuralRequests: f.structuralRequests,
    sectionalRequest: f.sectionalRequest, overflowRequest: f.overflowRequest, envelopes: f.envelopes,
    corruptions: f.corruptedProjections });
}

function sceneChecks(f, host, scales, variants) {
  const sourceBefore = semanticHash(f.readModelA0.canonicalTopology);
  for (let index = 0; index < scales.scene; index += 1) {
    const scene = host.scene();
    validateEngineeringScene(scene);
    if (!isScopedEditDeeplyFrozen(scene)) throw new Error('Scene is not deeply immutable.');
    const expectedCoordinates = f.readModelA0.coordinateSystem;
    for (const key of ['unit', 'frame', 'verticalAxis', 'handedness']) {
      if (scene.coordinateSystem[key] !== expectedCoordinates[key]) {
        throw new Error(`Scene coordinate ${key} differs from accepted read-model evidence.`);
      }
    }
    JSON.parse(JSON.stringify(scene));
    variants.add(JSON.stringify(scene));
  }
  return sourceBefore === semanticHash(f.readModelA0.canonicalTopology);
}

function repeatedScopes(host, requests, count, variantMap, sceneCount) {
  for (let index = 0; index < count; index += 1) {
    const requestIndex = index % requests.length;
    const scope = assertEngineeringScope(host.resolveScope(requests[requestIndex]));
    const evidence = requiredFunction(host.resolveScopeEvidence, 'host.resolveScopeEvidence')(
      requests[requestIndex]);
    const partition = [...evidence.editableEntityIds, ...evidence.boundaryEntityIds,
      ...evidence.excludedEntityIds];
    if (partition.length !== sceneCount || new Set(partition).size !== sceneCount) {
      throw new Error('Resolved Topology scope partition is incomplete or overlapping.');
    }
    const variants = variantMap.get(requestIndex) ?? new Set();
    variants.add(JSON.stringify(scope));
    variantMap.set(requestIndex, variants);
  }
}

function sectionalChecks(f, host, count) {
  const codes = new Set();
  for (let index = 0; index < count; index += 1) {
    codes.add(expectCode(() => host.resolveScope(f.sectionalRequest),
      TOPOLOGY_SECTIONAL_SCOPE_UNSUPPORTED, 'sectional scope'));
  }
  return codes;
}

function geometryChecks(f, host, count) {
  for (let index = 0; index < count; index += 1) {
    const id = f.geometryIds[index % f.geometryIds.length];
    const geometry = host.entityGeometry(id);
    if (geometry.entityId !== id || !geometry.anchor.every(Number.isFinite)) {
      throw new Error(`Invalid geometry for ${id}.`);
    }
  }
  return expectCode(() => host.entityGeometry(f.unknownGeometryId),
    f.expectedCodes.unknownGeometry, 'unknown geometry');
}

function authorizedChecks(f, host, count, variants, replayOrders) {
  const current = f.readModelA0.journalProjection.projection;
  for (let index = 0; index < count; index += 1) {
    const candidate = host.appendEditCommand(current, f.envelopes.authorized);
    if (candidate.envelopes.length !== current.envelopes.length + 1
      || JSON.stringify(candidate.initialState) !== JSON.stringify(current.initialState)
      || current.envelopes.some((entry, offset) => JSON.stringify(entry) !== JSON.stringify(candidate.envelopes[offset]))) {
      throw new Error('Dry-run append did not preserve exact journal history and initial state.');
    }
    variants.add(JSON.stringify(candidate));
    replayOrders.add(candidate.activeCommandIds.join('|'));
  }
}

function rejectionLoop(count, action, expected, label) {
  const variants = new Set();
  for (let index = 0; index < count; index += 1) variants.add(expectCode(action, expected, label));
  return variants;
}

function staleChecks(f, host, count) {
  const codes = new Set();
  f.authoritySet(f.readModelA1.authorityId);
  try {
    for (let index = 0; index < count; index += 1) codes.add(expectCode(
      () => host.scene(), f.expectedCodes.stale, 'stale authority'));
  } finally { f.authoritySet(f.readModelA0.authorityId); }
  return codes;
}

function corruptionChecks(f, host, count) {
  const codes = new Set();
  for (let index = 0; index < count; index += 1) {
    const projection = f.corruptedProjections[index % f.corruptedProjections.length];
    codes.add(expectCode(() => host.appendEditCommand(projection, f.envelopes.authorized),
      f.expectedCodes.projectionCorruption, 'projection corruption'));
  }
  return codes;
}

function destroyChecks(f, count, sceneJson) {
  let cycles = 0;
  for (let index = 0; index < count; index += 1) {
    const host = hostFor(f), first = host.destroy(), second = host.destroy();
    if (!sameJson(first, second)) throw new Error('destroy() is not idempotent.');
    for (const action of [() => host.scene(), () => host.resolveScope(f.selectionRequests[0]),
      () => host.entityGeometry(f.geometryIds[0]),
      () => host.appendEditCommand(f.readModelA0.journalProjection.projection, f.envelopes.authorized)]) {
      expectCode(action, TOPOLOGY_READ_ONLY_HOST_DESTROYED, 'post-destroy access');
    }
    const remounted = hostFor(f);
    if (JSON.stringify(remounted.scene()) !== sceneJson) throw new Error('Remounted scene differs.');
    remounted.destroy(); cycles += 1;
  }
  return cycles;
}

function variantCounts(selection, structural) {
  return { selection: [...selection.values()].map((set) => set.size),
    structural: [...structural.values()].map((set) => set.size) };
}

function certifyVariants(scene, scope, candidate, replay) {
  if (scene.size !== 1 || candidate.size !== 1 || replay.size !== 1
    || scope.selection.some((count) => count !== 1)
    || scope.structural.some((count) => count !== 1)) {
    throw new Error('Topology read-only conformance produced nondeterministic variants.');
  }
}

function certifySentinels(before, after) {
  const keys = ['storageAccess', 'recoveryAcceptance', 'writerAcquisition', 'controllerMutation',
    'rendererRefresh', 'selectionPublication', 'productionAcceptance'];
  for (const key of keys) if (after[key] !== before[key]) throw new Error(`Forbidden side effect observed: ${key}.`);
}

export function runTopologyScopedEditReadOnlyHostConformance(input = {}) {
  const f = fixture(input), scales = Object.freeze({ ...DEFAULT_SCALES, ...input.scales });
  if (!isScopedEditDeeplyFrozen(f.readModelA0) || !isScopedEditDeeplyFrozen(f.readModelA1)) {
    throw new TypeError('Conformance read models must be deeply immutable.');
  }
  JSON.parse(JSON.stringify(f.readModelA0));
  f.authoritySet(f.readModelA0.authorityId);
  const beforeInputs = inputSnapshot(f), beforeSentinels = f.sentinelSnapshot();
  const host = hostFor(f), sceneVariants = new Set(), selectionVariants = new Map();
  const structuralVariants = new Map(), candidateVariants = new Set(), replayOrders = new Set();
  const sourceUnchanged = sceneChecks(f, host, scales, sceneVariants);
  repeatedScopes(host, f.selectionRequests, scales.selection, selectionVariants, host.scene().entities.length);
  repeatedScopes(host, f.structuralRequests, scales.structural, structuralVariants, host.scene().entities.length);
  const sectionalCodes = sectionalChecks(f, host, scales.sectional);
  const budgetCode = expectCode(() => host.resolveScope(f.overflowRequest),
    f.expectedCodes.budget, 'scope budget overflow');
  const unknownGeometryCode = geometryChecks(f, host, scales.geometry);
  authorizedChecks(f, host, scales.authorized, candidateVariants, replayOrders);
  const current = f.readModelA0.journalProjection.projection;
  const boundaryCodes = rejectionLoop(scales.boundary,
    () => host.appendEditCommand(current, f.envelopes.boundary),
    f.expectedCodes.boundary, 'boundary target');
  const excludedCodes = rejectionLoop(scales.excluded,
    () => host.appendEditCommand(current, f.envelopes.excluded),
    f.expectedCodes.excluded, 'excluded target');
  const mismatchCodes = rejectionLoop(scales.mismatch,
    () => host.appendEditCommand(current, f.envelopes.mismatch),
    f.expectedCodes.mismatch, 'command mismatch');
  const unsupportedCodes = rejectionLoop(scales.mismatch,
    () => host.appendEditCommand(current, f.envelopes.unsupported),
    f.expectedCodes.unsupported, 'unsupported command');
  const mixedCodes = rejectionLoop(scales.mismatch,
    () => host.appendEditCommand(current, f.envelopes.mixedTransaction),
    f.expectedCodes.mixed, 'mixed transaction');
  const staleCodes = staleChecks(f, host, scales.stale);
  const corruptionCodes = corruptionChecks(f, host, scales.corruption);
  const sceneJson = JSON.stringify(host.scene()), destroyRemountCount = destroyChecks(f, scales.remount, sceneJson);
  host.destroy();
  const scopeVariants = variantCounts(selectionVariants, structuralVariants);
  certifyVariants(sceneVariants, scopeVariants, candidateVariants, replayOrders);
  const afterSentinels = f.sentinelSnapshot();
  certifySentinels(beforeSentinels, afterSentinels);
  if (!sourceUnchanged || beforeInputs !== inputSnapshot(f)) throw new Error('Conformance mutated source inputs.');
  return immutableJson({ schema: TOPOLOGY_SCOPED_EDIT_READ_ONLY_HOST_CONFORMANCE_V1,
    valid: true, scales, counts: { scene: scales.scene, selection: scales.selection,
      structural: scales.structural, sectional: scales.sectional, geometry: scales.geometry,
      authorizedDryRun: scales.authorized, boundaryRejection: scales.boundary,
      excludedRejection: scales.excluded, staleRejection: scales.stale,
      mismatchRejection: scales.mismatch, unsupportedRejection: scales.mismatch,
      mixedTransactionRejection: scales.mismatch, projectionCorruption: scales.corruption,
      destroyRemount: destroyRemountCount }, variants: { scene: sceneVariants.size,
      selectionPerRequest: scopeVariants.selection, structuralPerRequest: scopeVariants.structural,
      candidate: candidateVariants.size, replayOrder: replayOrders.size },
    rejections: { sectional: [...sectionalCodes], budget: budgetCode, unknownGeometry: unknownGeometryCode,
      boundary: [...boundaryCodes], excluded: [...excludedCodes], mismatch: [...mismatchCodes],
      unsupported: [...unsupportedCodes], mixedTransaction: [...mixedCodes], stale: [...staleCodes], projectionCorruption: [...corruptionCodes] },
    sideEffects: afterSentinels, sourceMutations: 0, inputMutations: 0,
  }, 'Topology scoped-edit read-only host conformance report');
}
