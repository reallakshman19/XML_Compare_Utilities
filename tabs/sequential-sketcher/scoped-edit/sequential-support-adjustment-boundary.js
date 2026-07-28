/** Branch-keyed support-adjustment publication boundary; construction authority remains untouched. */
import {
  createSequentialAdjustedEngineeringSvgOwnerSnapshot,
} from '../sequential-engineering-svg-owner-bridge.js';
import {
  assertSequentialAdjustedSupportProjection,
  applySequentialSupportAdjustmentRegister,
  sequentialSupportProjectionFingerprint,
} from '../support/sequential-support-adjusted-projection.js';
import {
  assertSequentialSupportAdjustmentHistory,
  createSequentialSupportAdjustmentHistory,
  recordSequentialSupportAdjustmentRegister,
  sequentialSupportAdjustmentHistoryCapabilities,
  transitionSequentialSupportAdjustmentHistory,
} from '../support/sequential-support-adjustment-history.js';
import {
  sameSequentialContractValue,
  sequentialSemanticFingerprint,
} from './sequential-command-contracts.js';
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

  function currentHistory(snapshot) {
    const id = branchId(snapshot);
    const base = snapshot?.supportProjection || null;
    if (!id || !base) return null;
    const baseProjectionFingerprint = sequentialSupportProjectionFingerprint(base);
    const stored = byBranch.get(id);
    if (stored?.baseProjectionFingerprint === baseProjectionFingerprint) {
      return assertSequentialSupportAdjustmentHistory(stored.history, {
        constructionFingerprint: base.constructionFingerprint,
        baseProjectionFingerprint,
      });
    }
    const history = createSequentialSupportAdjustmentHistory({
      constructionFingerprint: base.constructionFingerprint,
      baseProjectionFingerprint,
    });
    byBranch.set(id, Object.freeze({ baseProjectionFingerprint, history }));
    return history;
  }
  function readHistory() {
    if (destroyed) throw new Error('Support adjustment boundary is destroyed.');
    return currentHistory(readBaseOwnerSnapshot());
  }
  function effectiveOwnerSnapshot() {
    if (destroyed) return null;
    const snapshot = readBaseOwnerSnapshot();
    const history = currentHistory(snapshot);
    return history
      ? createSequentialAdjustedEngineeringSvgOwnerSnapshot(snapshot, history.currentRegister)
      : snapshot;
  }
  function readCurrentState() {
    if (destroyed) throw new Error('Support adjustment boundary is destroyed.');
    const baseState = readBaseState();
    const baseSnapshot = readBaseOwnerSnapshot();
    const history = currentHistory(baseSnapshot);
    if (!history) return baseState;
    const baseSupportProjection = baseSnapshot.supportProjection;
    const supportProjection = applySequentialSupportAdjustmentRegister(
      baseSupportProjection,
      history.currentRegister,
    );
    return {
      ...baseState,
      baseSupportProjection,
      supportAdjustmentHistory: history,
      supportAdjustmentRegister: history.currentRegister,
      supportProjection,
      ownerSnapshot: adjustedCommandOwner(baseState.ownerSnapshot, history.currentRegister),
    };
  }
  function readView() {
    const ownerSnapshot = effectiveOwnerSnapshot();
    if (!ownerSnapshot) return Object.freeze({ ownerSnapshot: null, readModel: null, scene: null });
    const readModel = createSequentialScopedEditReadModel(ownerSnapshot);
    const scene = buildSequentialScopedEditEngineeringScene(readModel);
    return Object.freeze({ ownerSnapshot, readModel, scene });
  }
  function currentPublicationAuthority(input) {
    const before = readCurrentState();
    const authority = deriveSequentialEditAuthority(before);
    if (!sameSequentialContractValue(authority, input.expectedAuthority)) {
      throw new RangeError('Prepared support adjustment is stale against current edit authority.');
    }
    return Object.freeze({ before, authority, base: before.baseSupportProjection,
      history: before.supportAdjustmentHistory });
  }
  function store(authority, base, history) {
    const baseProjectionFingerprint = sequentialSupportProjectionFingerprint(base);
    byBranch.set(authority.branchId, Object.freeze({ baseProjectionFingerprint, history }));
  }
  function publishCandidate(input = {}) {
    if (destroyed) throw new Error('Support adjustment boundary is destroyed.');
    const current = currentPublicationAuthority(input);
    const candidate = input.candidate;
    if (candidate?.schema !== 'SequentialPreparedSupportAdjustmentCandidate.v1') {
      throw new TypeError('Support adjustment publication requires a prepared candidate.');
    }
    const baseProjectionFingerprint = sequentialSupportProjectionFingerprint(current.base);
    if (candidate.expectedBaseProjectionFingerprint !== baseProjectionFingerprint
      || candidate.expectedRegisterHeadFingerprint
        !== current.history.currentRegister.headFingerprint) {
      throw new RangeError('Prepared support adjustment base or register authority is stale.');
    }
    const history = recordSequentialSupportAdjustmentRegister(
      current.history,
      candidate.register,
    );
    const entry = history.currentRegister.entries.at(-1) || null;
    if (!entry || !sameSequentialContractValue(entry, candidate.entry)) {
      throw new RangeError('Prepared support adjustment entry is not the canonical register tail.');
    }
    assertSequentialAdjustedSupportProjection(
      current.base,
      history.currentRegister,
      candidate.supportProjection,
    );
    store(current.authority, current.base, history);
    const publication = Object.freeze({
      schema: 'SequentialSupportAdjustmentPublication.v1',
      committed: true,
      preparedId: input.preparedId,
      adjustmentId: entry.adjustmentId,
      expectedAuthorityId: current.authority.authorityId,
      registerHeadFingerprint: history.currentRegister.headFingerprint,
      historyFingerprint: history.historyFingerprint,
      effectiveProjectionFingerprint: sequentialSupportProjectionFingerprint(
        candidate.supportProjection,
      ),
    });
    onPublished(publication);
    return publication;
  }
  function publishHistoryCandidate(input = {}) {
    if (destroyed) throw new Error('Support adjustment boundary is destroyed.');
    const current = currentPublicationAuthority(input);
    const candidate = input.candidate;
    if (candidate?.schema !== 'SequentialPreparedSupportAdjustmentHistoryCandidate.v1') {
      throw new TypeError('Support history publication requires a prepared history candidate.');
    }
    const preparedMaterial = {
      schema: 'SequentialPreparedSupportAdjustmentHistory.v1',
      expectedAuthority: input.expectedAuthority,
      candidate,
    };
    if (input.preparedId !== sequentialSemanticFingerprint('SSUPPORTHISTORYPREP', preparedMaterial)) {
      throw new RangeError('Prepared support history ID differs from canonical candidate evidence.');
    }
    const baseProjectionFingerprint = sequentialSupportProjectionFingerprint(current.base);
    if (candidate.expectedBaseProjectionFingerprint !== baseProjectionFingerprint
      || candidate.expectedHistoryFingerprint !== current.history.historyFingerprint
      || candidate.expectedCurrentRegisterHeadFingerprint
        !== current.history.currentRegister.headFingerprint) {
      throw new RangeError('Prepared support history base, history or register authority is stale.');
    }
    const transition = transitionSequentialSupportAdjustmentHistory(
      current.history,
      candidate.action,
    );
    if (!sameSequentialContractValue(transition.history, candidate.history)
      || !sameSequentialContractValue(transition.affectedEntry, candidate.affectedEntry)) {
      throw new RangeError('Prepared support history differs from canonical transition regeneration.');
    }
    assertSequentialAdjustedSupportProjection(
      current.base,
      transition.history.currentRegister,
      candidate.supportProjection,
    );
    store(current.authority, current.base, transition.history);
    const publication = Object.freeze({
      schema: 'SequentialSupportAdjustmentHistoryPublication.v1',
      committed: true,
      preparedId: input.preparedId,
      action: candidate.action,
      affectedAdjustmentId: candidate.affectedEntry?.adjustmentId || null,
      expectedAuthorityId: current.authority.authorityId,
      registerHeadFingerprint: transition.history.currentRegister.headFingerprint,
      historyFingerprint: transition.history.historyFingerprint,
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
    readHistory,
    readEffectiveOwnerSnapshot: effectiveOwnerSnapshot,
    readView,
    publishCandidate,
    publishHistoryCandidate,
    getState: () => Object.freeze({
      branchCount: byBranch.size,
      branches: Object.freeze([...byBranch.entries()].map(([id, stored]) => Object.freeze({
        branchId: id,
        constructionFingerprint: stored.history.constructionFingerprint,
        baseProjectionFingerprint: stored.baseProjectionFingerprint,
        ...sequentialSupportAdjustmentHistoryCapabilities(stored.history),
      }))),
      destroyed,
    }),
    destroy() {
      if (destroyed) return false;
      destroyed = true; byBranch.clear(); return true;
    },
  });
}
