/** Branch-keyed support-adjustment publication boundary; construction authority remains untouched. */
import {
  createSequentialAdjustedEngineeringSvgOwnerSnapshot,
} from '../sequential-engineering-svg-owner-bridge.js';
import {
  createSequentialSupportAdjustmentRegister,
  assertSequentialSupportAdjustmentRegister,
} from '../support/sequential-support-adjustment-register.js';
import {
  applySequentialSupportAdjustmentRegister,
  assertSequentialAdjustedSupportProjection,
  sequentialSupportProjectionFingerprint,
} from '../support/sequential-support-adjusted-projection.js';
import { sameSequentialContractValue } from './sequential-command-contracts.js';
import { deriveSequentialEditAuthority } from './sequential-edit-authority.js';
import { createSequentialScopedEditReadModel } from './sequential-scoped-edit-read-model.js';
import { buildSequentialScopedEditEngineeringScene } from './sequential-scoped-edit-scene-adapter.js';

export const SEQUENTIAL_SUPPORT_ADJUSTMENT_BOUNDARY_SCHEMA =
  'SequentialSupportAdjustmentBoundary.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function branchId(snapshot) { return String(snapshot?.session?.rootBranchId || '').trim(); }
function adjustedCommandOwner(ownerSnapshot, register) {
  if (!ownerSnapshot?.revision || !register) return ownerSnapshot || null;
  return Object.freeze({
    ...ownerSnapshot,
    revision: Object.freeze({
      schema: 'SequentialSupportAdjustmentOwnerRevision.v1',
      ownerRevision: ownerSnapshot.revision,
      registerHeadFingerprint: register.headFingerprint,
    }),
  });
}

export function createSequentialSupportAdjustmentBoundary(options = {}) {
  const readBaseState = requiredFunction(options.readBaseState, 'readBaseState');
  const readBaseOwnerSnapshot = requiredFunction(
    options.readBaseOwnerSnapshot,
    'readBaseOwnerSnapshot',
  );
  const onPublished = requiredFunction(options.onPublished, 'onPublished');
  const byBranch = new Map();
  let destroyed = false;

  function currentRegister(snapshot) {
    const id = branchId(snapshot);
    const base = snapshot?.supportProjection || null;
    if (!id || !base) return null;
    const stored = byBranch.get(id);
    if (stored?.constructionFingerprint === base.constructionFingerprint) {
      return assertSequentialSupportAdjustmentRegister(stored, base.constructionFingerprint);
    }
    const register = createSequentialSupportAdjustmentRegister({
      constructionFingerprint: base.constructionFingerprint,
    });
    byBranch.set(id, register);
    return register;
  }
  function effectiveOwnerSnapshot() {
    if (destroyed) return null;
    const snapshot = readBaseOwnerSnapshot();
    const register = currentRegister(snapshot);
    return register
      ? createSequentialAdjustedEngineeringSvgOwnerSnapshot(snapshot, register)
      : snapshot;
  }
  function readCurrentState() {
    if (destroyed) throw new Error('Support adjustment boundary is destroyed.');
    const baseState = readBaseState();
    const baseSnapshot = readBaseOwnerSnapshot();
    const register = currentRegister(baseSnapshot);
    if (!register) return baseState;
    const baseSupportProjection = baseSnapshot.supportProjection;
    const supportProjection = applySequentialSupportAdjustmentRegister(
      baseSupportProjection,
      register,
    );
    return {
      ...baseState,
      baseSupportProjection,
      supportAdjustmentRegister: register,
      supportProjection,
      ownerSnapshot: adjustedCommandOwner(baseState.ownerSnapshot, register),
    };
  }
  function readView() {
    const ownerSnapshot = effectiveOwnerSnapshot();
    if (!ownerSnapshot) return Object.freeze({ ownerSnapshot: null, readModel: null, scene: null });
    const readModel = createSequentialScopedEditReadModel(ownerSnapshot);
    const scene = buildSequentialScopedEditEngineeringScene(readModel);
    return Object.freeze({ ownerSnapshot, readModel, scene });
  }
  function publishCandidate(input = {}) {
    if (destroyed) throw new Error('Support adjustment boundary is destroyed.');
    const before = readCurrentState();
    const authority = deriveSequentialEditAuthority(before);
    if (!sameSequentialContractValue(authority, input.expectedAuthority)) {
      throw new RangeError('Prepared support adjustment is stale against current edit authority.');
    }
    const candidate = input.candidate;
    if (candidate?.schema !== 'SequentialPreparedSupportAdjustmentCandidate.v1') {
      throw new TypeError('Support adjustment publication requires a prepared candidate.');
    }
    const base = before.baseSupportProjection;
    const current = assertSequentialSupportAdjustmentRegister(
      before.supportAdjustmentRegister,
      base.constructionFingerprint,
    );
    if (candidate.expectedBaseProjectionFingerprint
        !== sequentialSupportProjectionFingerprint(base)
      || candidate.expectedRegisterHeadFingerprint !== current.headFingerprint) {
      throw new RangeError('Prepared support adjustment base or register authority is stale.');
    }
    const register = assertSequentialSupportAdjustmentRegister(
      candidate.register,
      base.constructionFingerprint,
    );
    const entry = register.entries.at(-1) || null;
    if (!entry || !sameSequentialContractValue(entry, candidate.entry)) {
      throw new RangeError('Prepared support adjustment entry is not the canonical register tail.');
    }
    assertSequentialAdjustedSupportProjection(base, register, candidate.supportProjection);
    byBranch.set(authority.branchId, register);
    const publication = Object.freeze({
      schema: 'SequentialSupportAdjustmentPublication.v1',
      committed: true,
      preparedId: input.preparedId,
      adjustmentId: entry.adjustmentId,
      expectedAuthorityId: authority.authorityId,
      registerHeadFingerprint: register.headFingerprint,
      effectiveProjectionFingerprint: sequentialSupportProjectionFingerprint(
        candidate.supportProjection,
      ),
    });
    onPublished(publication);
    return publication;
  }
  return Object.freeze({
    schema: SEQUENTIAL_SUPPORT_ADJUSTMENT_BOUNDARY_SCHEMA,
    readCurrentState,
    readEffectiveOwnerSnapshot: effectiveOwnerSnapshot,
    readView,
    publishCandidate,
    getState: () => Object.freeze({
      branchCount: byBranch.size,
      branches: Object.freeze([...byBranch.entries()].map(([id, register]) => Object.freeze({
        branchId: id,
        constructionFingerprint: register.constructionFingerprint,
        registerHeadFingerprint: register.headFingerprint,
        adjustmentCount: register.entries.length,
      }))),
      destroyed,
    }),
    destroy() {
      if (destroyed) return false;
      destroyed = true; byBranch.clear(); return true;
    },
  });
}
