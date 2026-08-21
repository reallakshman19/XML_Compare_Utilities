import { deepFreeze } from './cii-workspace-contracts.js';
import { applyCiiWriter2NodeNameRelocation } from './cii-workspace-writer2-nodename-write.js';
import { applyCiiWriter2SifDeleteRelocation } from './cii-workspace-writer2-sif-delete-write.js';

const NODE_PROPERTY = 'Node name / to-name';
const SIF_PROPERTY = 'SIF/Tee record presence';

function isNodeMutation(operation) {
  return operation?.scopeDecision === 'APPLY'
    && operation?.family === 'NODE_NAME'
    && operation?.property === NODE_PROPERTY
    && ['CREATE', 'DELETE'].includes(operation?.action);
}
function isSifDelete(operation) {
  return operation?.scopeDecision === 'APPLY'
    && operation?.family === 'SIF_TEE'
    && operation?.property === SIF_PROPERTY
    && operation?.action === 'DELETE';
}
function supportedApply(operation) { return isNodeMutation(operation) || isSifDelete(operation); }
function projectTransferPlan(transferPlan, predicate) {
  const operations = (transferPlan?.operations || []).map((operation) => {
    if (operation?.scopeDecision !== 'APPLY') return operation;
    if (predicate(operation)) return operation;
    return deepFreeze({ ...operation, scopeDecision: 'EXCLUDE' });
  });
  return deepFreeze({
    ...transferPlan,
    operations: deepFreeze(operations),
    transferScope: deepFreeze({ ...(transferPlan?.transferScope || {}), status: 'BOUND' }),
  });
}
function originalBytes(targetDocument) {
  const original = String(targetDocument?.physicalFile?.originalByteString ?? '');
  if (!original || targetDocument?.writer1CByteEligible !== true) throw new Error('CII_WRITER_2_COMPOSITE_ORIGINAL_BYTE_AUTHORITY_REQUIRED');
  return original;
}
function normalizeClaim(claim, authorityFamily, original) {
  const byteStart = Number(claim?.byteStart); const byteEnd = Number(claim?.byteEnd);
  if (!Number.isSafeInteger(byteStart) || !Number.isSafeInteger(byteEnd) || byteStart < 0 || byteEnd < byteStart || byteEnd > original.length) {
    throw new Error(`CII_WRITER_2_COMPOSITE_CLAIM_SPAN_INVALID:${authorityFamily}:${claim?.kind || 'UNKNOWN'}`);
  }
  const beforeField = String(claim?.beforeField ?? ''); const afterField = String(claim?.afterField ?? '');
  if (original.slice(byteStart, byteEnd) !== beforeField) {
    throw new Error(`CII_WRITER_2_COMPOSITE_CLAIM_PREIMAGE_MISMATCH:${authorityFamily}:${claim?.kind || 'UNKNOWN'}:${byteStart}`);
  }
  return deepFreeze({
    ...claim, authorityFamily, byteStart, byteEnd, beforeField, afterField,
  });
}
function arbitrateClaims(claims, original) {
  const sorted = claims.map((item) => normalizeClaim(item.claim, item.authorityFamily, original))
    .filter((item) => item.beforeField !== item.afterField)
    .sort((a, b) => a.byteStart - b.byteStart || a.byteEnd - b.byteEnd || a.authorityFamily.localeCompare(b.authorityFamily));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]; const current = sorted[index];
    if (current.byteStart < previous.byteEnd) {
      throw new Error(`CII_WRITER_2_COMPOSITE_ORIGINAL_SPAN_OVERLAP:${previous.authorityFamily}:${previous.kind}:${current.authorityFamily}:${current.kind}`);
    }
  }
  return deepFreeze(sorted);
}
function applyClaims(original, claims) {
  let cursor = 0; let output = '';
  for (const claim of claims) {
    if (original.slice(claim.byteStart, claim.byteEnd) !== claim.beforeField) {
      throw new Error(`CII_WRITER_2_COMPOSITE_STALE_PREIMAGE:${claim.authorityFamily}:${claim.kind}:${claim.byteStart}`);
    }
    output += original.slice(cursor, claim.byteStart) + claim.afterField;
    cursor = claim.byteEnd;
  }
  return output + original.slice(cursor);
}
function byteStringToBytes(value) {
  const text = String(value ?? ''); const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) out[index] = text.charCodeAt(index) & 0xff;
  return out;
}
function appliedOperations(transferPlan) {
  return (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY');
}

export function applyCiiWriter2Composite({ targetDocument, targetGraph, transferPlan }) {
  const original = originalBytes(targetDocument);
  if (transferPlan?.status !== 'PREVIEW_READY') throw new Error('CII_WRITER_2_COMPOSITE_TRANSFER_PLAN_NOT_PREVIEW_READY');
  if (transferPlan?.transferScope?.status !== 'BOUND') throw new Error('CII_WRITER_2_COMPOSITE_BOUND_TRANSFER_SCOPE_REQUIRED');
  if ((transferPlan?.blockers || []).length) throw new Error(`CII_WRITER_2_COMPOSITE_TRANSFER_BLOCKED:${transferPlan.blockers.join('|')}`);
  const applied = appliedOperations(transferPlan);
  if (!applied.length) throw new Error('CII_WRITER_2_COMPOSITE_NO_MUTATIONS');
  const unsupported = applied.filter((operation) => !supportedApply(operation));
  if (unsupported.length) {
    throw new Error(`CII_WRITER_2_COMPOSITE_UNSUPPORTED_APPLY:${unsupported.map((item) => item.operationId || 'unknown').join(',')}`);
  }
  const nodeCount = applied.filter(isNodeMutation).length;
  const sifDeleteCount = applied.filter(isSifDelete).length;
  const nodePlan = nodeCount ? projectTransferPlan(transferPlan, isNodeMutation) : null;
  const sifPlan = sifDeleteCount ? projectTransferPlan(transferPlan, isSifDelete) : null;
  const nodeResult = nodePlan ? applyCiiWriter2NodeNameRelocation({ targetDocument, transferPlan: nodePlan }) : null;
  const sifResult = sifPlan ? applyCiiWriter2SifDeleteRelocation({ targetDocument, targetGraph, transferPlan: sifPlan }) : null;
  const candidateClaims = [
    ...(nodeResult?.mutations || []).map((claim) => ({ authorityFamily: 'WRITER_2_NODENAME', claim })),
    ...(sifResult?.mutations || []).map((claim) => ({ authorityFamily: 'WRITER_2_SIF_DELETE', claim })),
  ];
  const mutations = arbitrateClaims(candidateClaims, original);
  if (!mutations.length) throw new Error('CII_WRITER_2_COMPOSITE_NO_PHYSICAL_MUTATIONS');
  const byteString = applyClaims(original, mutations); const bytes = byteStringToBytes(byteString);
  return deepFreeze({
    schema: 'CIIWorkspaceWriter2CompositeResult.v1', status: 'APPLIED', writer: 'WRITER_2', mode: 'ONE_ORIGINAL_PREIMAGE_COMPOSITE',
    byteString, bytes, text: new TextDecoder('utf-8').decode(bytes), byteLengthBefore: original.length, byteLengthAfter: byteString.length,
    mutationCount: mutations.length, mutations,
    familyMutationCounts: deepFreeze({ nodeNameOperations: nodeCount, sifDeleteOperations: sifDeleteCount,
      nodeNameClaims: nodeResult?.mutations?.length || 0, sifDeleteClaims: sifResult?.mutations?.length || 0 }),
    components: deepFreeze({ nodeName: nodeResult, sifDelete: sifResult }),
  });
}

export const _test = deepFreeze({ isNodeMutation, isSifDelete, supportedApply, projectTransferPlan, normalizeClaim, arbitrateClaims, applyClaims });
