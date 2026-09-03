import { deepFreeze } from './cii-workspace-contracts.js';
import {
  buildCiiWriter2NodeNameRelocationPlan,
  CII_WRITER_2_NODENAME_RELOCATION_POLICY,
} from './cii-workspace-writer2-nodename-relocation.js';
import {
  CII_MS_SOURCE_SET_SHA256,
  CII_MS_TARGET_SHA256,
  ciiMsBm001GroupedKey,
  parseCiiMsBm001,
} from './cii-workspace-multisource-nodename-authority.js';

const NODE_PROPERTY = 'Node name / to-name';
const APPROVED = new Set(['REVIEWED', 'LOCKED']);
function text(value) { return String(value ?? '').trim(); }
function operationId(operation) { return text(operation?.operationId); }
function sameIds(left, right) {
  const a = [...left].sort(); const b = [...right].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function expectedGroups() { return new Set(parseCiiMsBm001().map((row) => ciiMsBm001GroupedKey(row.sourceNames, row.targetName))); }
function isQualifiedExpectedApply(operation, groups) {
  return operation?.scopeDecision === 'APPLY'
    && operation?.family === 'NODE_NAME'
    && operation?.property === NODE_PROPERTY
    && ['CREATE', 'DELETE'].includes(operation?.action)
    && operation?.status === 'PREVIEW_READY'
    && operation?.policyAuthority === CII_WRITER_2_NODENAME_RELOCATION_POLICY
    && APPROVED.has(operation?.matchAuthority?.status)
    && operation?.bm001Acceptance?.benchmark === 'BM-001'
    && operation?.bm001Acceptance?.status === 'BOUND'
    && groups.has(text(operation?.bm001Acceptance?.groupedKey));
}
function custodyBlockers(transferPlan, targetDocument) {
  const blockers = []; const scope = transferPlan?.transferScope;
  if (transferPlan?.sourceAuthorityKind !== 'SOURCE_SET') blockers.push('CII_MS_WRITER2_SOURCE_SET_AUTHORITY_REQUIRED');
  if (text(transferPlan?.sourceSetSha256) !== CII_MS_SOURCE_SET_SHA256) blockers.push('CII_MS_WRITER2_SOURCE_SET_HASH_MISMATCH');
  if (text(transferPlan?.targetAuthority?.originalSha256) !== CII_MS_TARGET_SHA256) blockers.push('CII_MS_WRITER2_ORIGINAL_TARGET_HASH_MISMATCH');
  if (text(transferPlan?.targetAuthority?.normalizedSha256) !== text(targetDocument?.contentSha256)) blockers.push('CII_MS_WRITER2_NORMALIZED_TARGET_HASH_MISMATCH');
  if (scope?.status !== 'BOUND' || scope?.mode !== 'EXPLICIT_APPLY_EXCLUDE' || scope?.authority !== 'USER_EXPLICIT_OPERATION_SCOPE') {
    blockers.push('CII_MS_WRITER2_BOUND_SCOPE_REQUIRED');
  }
  if (scope?.sourceAuthorityKind !== 'SOURCE_SET' || text(scope?.sourceSetSha256) !== CII_MS_SOURCE_SET_SHA256) {
    blockers.push('CII_MS_WRITER2_SCOPE_SOURCE_SET_HASH_MISMATCH');
  }
  if (text(scope?.targetSha256) !== CII_MS_TARGET_SHA256) blockers.push('CII_MS_WRITER2_SCOPE_TARGET_HASH_MISMATCH');
  const applied = (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY' && operation?.action !== 'KEEP');
  const excluded = (transferPlan?.excludedOperations || []).filter((operation) => operation?.scopeDecision === 'EXCLUDE' && operation?.action !== 'KEEP');
  const candidateIds = [...applied, ...excluded].map(operationId).filter(Boolean);
  if (!sameIds(candidateIds, scope?.candidateOperationIds || [])) blockers.push('CII_MS_WRITER2_SCOPE_CANDIDATE_SET_MISMATCH');
  if (!sameIds(applied.map(operationId), scope?.appliedOperationIds || [])) blockers.push('CII_MS_WRITER2_SCOPE_APPLY_SET_MISMATCH');
  if (!sameIds(excluded.map(operationId), scope?.excludedOperationIds || [])) blockers.push('CII_MS_WRITER2_SCOPE_EXCLUDE_SET_MISMATCH');
  return blockers;
}

export function ciiWriter2SourceSetNodeNameReadiness(transferPlan, targetDocument) {
  const blockers = [...(transferPlan?.blockers || []), ...custodyBlockers(transferPlan, targetDocument)];
  if (transferPlan?.status !== 'PREVIEW_READY') blockers.push('CII_MS_WRITER2_TRANSFER_PLAN_NOT_PREVIEW_READY');
  const groups = expectedGroups();
  const applied = (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY');
  const qualified = applied.filter((operation) => isQualifiedExpectedApply(operation, groups));
  for (const operation of applied) if (!isQualifiedExpectedApply(operation, groups)) {
    blockers.push(`CII_MS_WRITER2_UNAUTHORIZED_APPLY:${operationId(operation) || 'unknown'}`);
  }
  if (!qualified.length) blockers.push('CII_MS_WRITER2_NO_EXPECTED_NODENAME_MUTATIONS');
  const uniqueBeforePlan = [...new Set(blockers)];
  const planForRelocation = deepFreeze({ ...transferPlan, blockers: deepFreeze(uniqueBeforePlan) });
  const relocationPlan = buildCiiWriter2NodeNameRelocationPlan({ targetDocument, transferPlan: planForRelocation });
  if (!relocationPlan.ready) blockers.push(...relocationPlan.blockers);
  const unique = deepFreeze([...new Set(blockers)]);
  return deepFreeze({
    schema: 'CIIWorkspaceWriter2SourceSetNodeNameReadiness.v1',
    status: unique.length ? 'BLOCKED' : 'READY', ready: unique.length === 0,
    mutationCount: qualified.length, mutationOperationCount: qualified.length,
    familyMutationCounts: deepFreeze({ nodeName: qualified.length, sifDelete: 0, hangerDelete: 0, restraintDelete: 0 }),
    blockers: unique,
    components: deepFreeze({ nodeName: relocationPlan, sifDelete: null, hangerDeleteAll: null, hangerPartialDelete: null, restraintDelete: null }),
    sourceSetSha256: text(transferPlan?.sourceSetSha256), originalTargetSha256: text(transferPlan?.targetAuthority?.originalSha256),
  });
}

export const _test = Object.freeze({ sameIds, isQualifiedExpectedApply, custodyBlockers });
