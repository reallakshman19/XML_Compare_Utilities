import { CII_WORKSPACE_SCHEMAS, CII_WORKSPACE_STAGES, deepFreeze } from './cii-workspace-contracts.js';

const INTERNAL_APPLY_AUTHORITY = Symbol('CII_WORKSPACE_APPLY_AUTHORITY_RESERVED');

export function createUnavailableCiiWorkspaceStage(stageId, capability) {
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.stage,
    stageId: String(stageId), capability: String(capability), status: 'NOT_IMPLEMENTED', actionEnabled: false,
    blockers: Object.freeze([`${capability} is reserved for a later qualified CII Workspace slice.`]),
    nextQualificationSlice: 'CII_TARGET_WRITER_AUTHORITY',
  });
}

export function createCiiWorkspaceStageModel() {
  return deepFreeze(CII_WORKSPACE_STAGES.map((stage) => {
    if (stage.id === '06') return { ...stage, ...createUnavailableCiiWorkspaceStage('06', 'Apply to target CII') };
    if (stage.id === '07') return { ...stage, schema: CII_WORKSPACE_SCHEMAS.stage, status: 'ACTIVE_AUDIT_ONLY', actionEnabled: true, modifiedTargetCiiExportEnabled: false };
    return { ...stage, schema: CII_WORKSPACE_SCHEMAS.stage, status: 'ACTIVE', actionEnabled: true };
  }));
}

function assertApplyAuthority(plan, authority) {
  if (authority !== INTERNAL_APPLY_AUTHORITY) throw new Error('CII_APPLY_AUTHORITY_REQUIRED');
  if (plan?.schema !== CII_WORKSPACE_SCHEMAS.transferPlan || plan?.status !== 'READY') throw new Error('READY_CII_TRANSFER_PLAN_REQUIRED');
}

export function attemptCiiTargetApply(plan, authority) {
  assertApplyAuthority(plan, authority);
  throw new Error('CII_TARGET_APPLY_NOT_IMPLEMENTED');
}

export function canExportModifiedTargetCii() { return false; }
