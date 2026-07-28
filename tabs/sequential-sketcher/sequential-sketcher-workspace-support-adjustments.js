/** In-memory workspace ownership for base/effective support projection and adjustment register. */
import {
  createSequentialSupportAdjustmentRegister,
  assertSequentialSupportAdjustmentRegister,
} from './support/sequential-support-adjustment-register.js';
import {
  applySequentialSupportAdjustmentRegister,
  assertSequentialAdjustedSupportProjection,
  sequentialSupportProjectionFingerprint,
} from './support/sequential-support-adjusted-projection.js';

export const SEQUENTIAL_WORKSPACE_SUPPORT_ADJUSTMENTS_SCHEMA =
  'SequentialWorkspaceSupportAdjustments.v1';

function baseProjection(value) {
  if (value == null) return null;
  if (value.schema !== 'SequentialConfirmedSupportProjection.v1') {
    throw new TypeError('Workspace base support projection must use SequentialConfirmedSupportProjection.v1.');
  }
  return value;
}
function emptyRegister(base) {
  return base ? createSequentialSupportAdjustmentRegister({
    constructionFingerprint: base.constructionFingerprint,
  }) : null;
}
function setState(model, base, register, effective) {
  model.baseSupportProjection = base;
  model.supportAdjustmentRegister = register;
  model.supportProjection = effective;
  return Object.freeze({ baseSupportProjection: base, supportAdjustmentRegister: register,
    supportProjection: effective });
}

export function initializeSequentialWorkspaceSupportAdjustments(model) {
  if (!model || typeof model !== 'object') throw new TypeError('Workspace support owner requires a model.');
  return setState(model, null, null, null);
}
export function clearSequentialWorkspaceSupportAdjustments(model) {
  return setState(model, null, null, null);
}
export function installSequentialWorkspaceBaseSupport(model, projectionValue) {
  const base = baseProjection(projectionValue);
  const register = emptyRegister(base);
  const effective = base ? applySequentialSupportAdjustmentRegister(base, register) : null;
  return setState(model, base, register, effective);
}
export function restoreSequentialWorkspaceSupportAdjustments(model, snapshot = {}) {
  const base = baseProjection(snapshot.baseSupportProjection || snapshot.supportProjection || null);
  if (!base) return clearSequentialWorkspaceSupportAdjustments(model);
  const register = snapshot.supportAdjustmentRegister
    ? assertSequentialSupportAdjustmentRegister(
      snapshot.supportAdjustmentRegister,
      base.constructionFingerprint,
    ) : emptyRegister(base);
  const effective = snapshot.supportAdjustmentRegister && snapshot.supportProjection
    ? assertSequentialAdjustedSupportProjection(base, register, snapshot.supportProjection)
    : applySequentialSupportAdjustmentRegister(base, register);
  return setState(model, base, register, effective);
}
export function snapshotSequentialWorkspaceSupportAdjustments(model) {
  return Object.freeze({
    baseSupportProjection: model.baseSupportProjection || null,
    supportAdjustmentRegister: model.supportAdjustmentRegister || null,
    supportProjection: model.supportProjection || null,
  });
}
export function publishSequentialWorkspaceSupportAdjustment(model, candidate = {}) {
  if (candidate.schema !== 'SequentialPreparedSupportAdjustmentCandidate.v1') {
    throw new TypeError('Workspace support publication requires a prepared support adjustment candidate.');
  }
  const base = baseProjection(model.baseSupportProjection);
  const currentRegister = assertSequentialSupportAdjustmentRegister(
    model.supportAdjustmentRegister,
    base?.constructionFingerprint,
  );
  if (!base
    || candidate.expectedBaseProjectionFingerprint !== sequentialSupportProjectionFingerprint(base)
    || candidate.expectedRegisterHeadFingerprint !== currentRegister.headFingerprint) {
    throw new RangeError('Prepared support adjustment is stale against workspace support authority.');
  }
  const register = assertSequentialSupportAdjustmentRegister(
    candidate.register,
    base.constructionFingerprint,
  );
  const effective = assertSequentialAdjustedSupportProjection(
    base,
    register,
    candidate.supportProjection,
  );
  setState(model, base, register, effective);
  return Object.freeze({
    schema: 'SequentialSupportAdjustmentPublication.v1',
    committed: true,
    adjustmentId: candidate.entry.adjustmentId,
    registerHeadFingerprint: register.headFingerprint,
    effectiveProjectionFingerprint: sequentialSupportProjectionFingerprint(effective),
  });
}
