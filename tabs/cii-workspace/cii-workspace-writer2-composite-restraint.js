import { deepFreeze } from './cii-workspace-contracts.js';
import { createCiiPhysicalFile } from './cii-workspace-physical-file.js';
import { isCiiSha256Hex, sha256CiiByteString } from './cii-workspace-byte-sha256.js';
import { applyCiiWriter2CompositeWithHangerDeleteAll } from './cii-workspace-writer2-composite-hanger.js';
import { applyCiiWriter2RestraintDeleteCompaction } from './cii-workspace-writer2-restraint-delete-write.js';
import { CII_WRITER_2_SIF_CREATE_BLOCKER } from './cii-workspace-writer2-sif-delete.js';
import { CII_WRITER_2_HANGER_CREATE_BLOCKER } from './cii-workspace-writer2-hanger-delete.js';
import { CII_WRITER_2_RESTRAINT_CREATE_BLOCKER } from './cii-workspace-writer2-restraint-delete-compaction-plan.js';

export const CII_WRITER_2_RESTRAINT_COMPOSITE_AUTHORITY = 'CII_WRITER_2_RESTRAINT_ONE_TARGET0_COMPOSITE';
export const CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY = 'WRITER_2_RESTRAINT_BLOCK_DELETE';

const NODE_PROPERTY = 'Node name / to-name';
const SIF_PROPERTY = 'SIF/Tee record presence';
const HANGER_PROPERTY = 'Hanger presence';
const RESTRAINT_PROPERTY = 'Qualified restraint slot mutation';
const SCOPE_MODE = 'EXPLICIT_APPLY_EXCLUDE';
const SCOPE_AUTHORITY = 'USER_EXPLICIT_OPERATION_SCOPE';
const TARGET0_HASH_AUTHORITY = 'SHA256_ORIGINAL_TARGET0_BYTES';
const POSTIMAGE_HASH_AUTHORITY = 'SHA256_WRITER2_POSTIMAGE_BYTES';
const POSTIMAGE_REPRESENTATION_AUTHORITY = 'CII_PHYSICAL_POSTIMAGE_REINTAKE_EQUIVALENCE';
const ALLOWED_RESTRAINT_CLAIM_KINDS = new Set([
  'CONTROL_RESTRAINT_BLOCK_COUNT',
  'ELEMENT_RESTRAINT_POINTER',
  'RESTRAINT_SECTION_PAYLOAD',
]);

function text(value) { return String(value ?? '').trim(); }
function operationId(operation) { return text(operation?.operationId); }
function sorted(values) {
  return [...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}
function exactIds(values, code) {
  if (!Array.isArray(values)) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_${code}_ARRAY_REQUIRED`);
  const ids = values.map(text);
  if (ids.some((id) => !id)) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_${code}_ID_REQUIRED`);
  if (new Set(ids).size !== ids.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_${code}_DUPLICATE_ID`);
  return Object.freeze(sorted(ids));
}
function sameStrings(left, right) {
  const a = sorted(left || []); const b = sorted(right || []);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function isMutable(operation) { return operation?.action !== 'KEEP'; }
function isNodeMutation(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'NODE_NAME'
    && operation?.property === NODE_PROPERTY && ['CREATE', 'DELETE'].includes(operation?.action);
}
function isSifDelete(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'SIF_TEE'
    && operation?.property === SIF_PROPERTY && operation?.action === 'DELETE';
}
function isSifCreate(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'SIF_TEE'
    && operation?.property === SIF_PROPERTY && operation?.action === 'CREATE';
}
function isHangerDelete(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'HANGER'
    && operation?.property === HANGER_PROPERTY && operation?.action === 'DELETE';
}
function isHangerCreate(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'HANGER'
    && operation?.property === HANGER_PROPERTY && operation?.action === 'CREATE';
}
function isRestraintDelete(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'RESTRAINT'
    && operation?.property === RESTRAINT_PROPERTY && operation?.action === 'DELETE';
}
function isRestraintCreate(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'RESTRAINT'
    && operation?.property === RESTRAINT_PROPERTY && operation?.action === 'CREATE';
}
function isExistingCompositeMutation(operation) {
  return isNodeMutation(operation) || isSifDelete(operation) || isHangerDelete(operation);
}
function supportedApply(operation) {
  return isExistingCompositeMutation(operation) || isRestraintDelete(operation);
}
function appliedOperations(transferPlan) {
  return (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY');
}
function target0Custody(targetDocument) {
  const original = String(targetDocument?.physicalFile?.originalByteString ?? '');
  const declared = text(targetDocument?.contentSha256);
  if (targetDocument?.writer1CByteEligible !== true || targetDocument?.physicalFile?.writer1CByteEligible !== true) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_ORIGINAL_BYTE_AUTHORITY_REQUIRED');
  }
  if (!isCiiSha256Hex(declared)) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_TARGET0_SHA256_FORMAT_REQUIRED');
  if (!original || Number(targetDocument?.physicalFile?.byteLength) !== original.length) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_TARGET0_BYTE_LENGTH_MISMATCH');
  }
  if (targetDocument?.byteLength != null && Number(targetDocument.byteLength) !== original.length) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_TARGET0_DOCUMENT_BYTE_LENGTH_MISMATCH');
  }
  const actual = sha256CiiByteString(original);
  if (actual !== declared) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_TARGET0_SHA256_MISMATCH');
  return deepFreeze({ authority: TARGET0_HASH_AUTHORITY, contentSha256: actual, byteLength: original.length });
}
function assertBoundScopeCustody(transferPlan, targetDocument) {
  const scope = transferPlan?.transferScope;
  if (scope?.status !== 'BOUND' || scope?.mode !== SCOPE_MODE || scope?.authority !== SCOPE_AUTHORITY || !text(scope?.scopeId)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_CANONICAL_BOUND_SCOPE_REQUIRED');
  }
  if (!Array.isArray(transferPlan?.operations) || !Array.isArray(transferPlan?.excludedOperations)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_OPERATION_CONTAINERS_REQUIRED');
  }
  const all = [...transferPlan.operations, ...transferPlan.excludedOperations];
  const allIds = exactIds(all.map(operationId), 'PLAN_OPERATION');
  const appliedRows = transferPlan.operations.filter((item) => item?.scopeDecision === 'APPLY' && isMutable(item));
  const excludedRows = transferPlan.excludedOperations.filter((item) => item?.scopeDecision === 'EXCLUDE' && isMutable(item));
  const appliedIds = exactIds(appliedRows.map(operationId), 'PLAN_APPLY');
  const excludedIds = exactIds(excludedRows.map(operationId), 'PLAN_EXCLUDE');
  if (appliedIds.some((id) => excludedIds.includes(id))) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_PLAN_APPLY_EXCLUDE_OVERLAP');
  const candidateIds = Object.freeze(sorted([...appliedIds, ...excludedIds]));
  const scopeAppliedIds = exactIds(scope.appliedOperationIds, 'SCOPE_APPLY');
  const scopeExcludedIds = exactIds(scope.excludedOperationIds, 'SCOPE_EXCLUDE');
  const scopeCandidateIds = exactIds(scope.candidateOperationIds, 'SCOPE_CANDIDATE');
  if (!sameStrings(appliedIds, scopeAppliedIds)) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_SCOPE_APPLY_SET_MISMATCH');
  if (!sameStrings(excludedIds, scopeExcludedIds)) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_SCOPE_EXCLUDE_SET_MISMATCH');
  if (!sameStrings(candidateIds, scopeCandidateIds)) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_SCOPE_CANDIDATE_SET_MISMATCH');
  if (allIds.length !== all.length) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_PLAN_OPERATION_CARDINALITY_MISMATCH');
  const sourceSha = text(transferPlan?.sourceDocument?.contentSha256);
  const targetSha = text(transferPlan?.targetDocument?.contentSha256);
  if (!isCiiSha256Hex(sourceSha) || sourceSha !== text(scope.sourceSha256)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_SCOPE_SOURCE_HASH_MISMATCH');
  }
  if (!targetSha || targetSha !== text(scope.targetSha256) || targetSha !== text(targetDocument?.contentSha256)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_SCOPE_TARGET_HASH_MISMATCH');
  }
  return deepFreeze({
    parentScopeId: text(scope.scopeId), sourceSha256: sourceSha, targetSha256: targetSha,
    candidateOperationIds: candidateIds, appliedOperationIds: appliedIds, excludedOperationIds: excludedIds,
  });
}
function projectCanonicalSubscope(transferPlan, predicate, family, parentCustody) {
  const projectedApply = []; const siblingExcludes = []; const keeps = [];
  for (const operation of transferPlan?.operations || []) {
    if (operation?.scopeDecision === 'APPLY' && isMutable(operation)) {
      if (predicate(operation)) projectedApply.push(operation);
      else siblingExcludes.push(deepFreeze({ ...operation, scopeDecision: 'EXCLUDE' }));
    } else if (operation?.action === 'KEEP' && operation?.scopeDecision === 'KEEP') {
      keeps.push(operation);
    } else {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_PROJECTED_OPERATION_CONTAINER_INVALID:${operationId(operation) || 'UNKNOWN'}`);
    }
  }
  const inheritedExcluded = [...(transferPlan?.excludedOperations || [])];
  for (const operation of inheritedExcluded) {
    if (!isMutable(operation) || operation?.scopeDecision !== 'EXCLUDE') {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_PROJECTED_EXCLUDE_CONTAINER_INVALID:${operationId(operation) || 'UNKNOWN'}`);
    }
  }
  const projectedExcluded = [...inheritedExcluded, ...siblingExcludes];
  exactIds([...keeps, ...projectedApply, ...projectedExcluded].map(operationId), 'PROJECTED_OPERATION');
  const appliedIds = exactIds(projectedApply.map(operationId), 'PROJECTED_APPLY');
  const excludedIds = exactIds(projectedExcluded.map(operationId), 'PROJECTED_EXCLUDE');
  if (appliedIds.some((id) => excludedIds.includes(id))) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_PROJECTED_APPLY_EXCLUDE_OVERLAP');
  const candidateIds = Object.freeze(sorted([...appliedIds, ...excludedIds]));
  const childScopeId = `${parentCustody.parentScopeId}::${family}`;
  return deepFreeze({
    ...transferPlan,
    operations: deepFreeze([...keeps, ...projectedApply]),
    excludedOperations: deepFreeze(projectedExcluded),
    transferScope: deepFreeze({
      status: 'BOUND', mode: SCOPE_MODE, authority: SCOPE_AUTHORITY, scopeId: childScopeId,
      sourceSha256: parentCustody.sourceSha256, targetSha256: parentCustody.targetSha256,
      candidateOperationIds: candidateIds, appliedOperationIds: appliedIds, excludedOperationIds: excludedIds,
    }),
    familyProjection: deepFreeze({
      schema: 'CIIWorkspaceWriter2FamilyProjection.v1', status: 'DERIVED_CANONICAL_BOUND_SUBSCOPE',
      authority: 'PARENT_TRANSFER_SCOPE_CANONICAL_SUBSCOPE', family,
      parentScopeId: parentCustody.parentScopeId, projectedScopeId: childScopeId,
      parentAppliedOperationIds: parentCustody.appliedOperationIds,
      projectedAppliedOperationIds: appliedIds,
      siblingAppliedOperationIds: deepFreeze(sorted(siblingExcludes.map(operationId))),
    }),
  });
}
function normalizeClaim(claim, authorityFamily, original) {
  const byteStart = Number(claim?.byteStart); const byteEnd = Number(claim?.byteEnd);
  if (!Number.isSafeInteger(byteStart) || !Number.isSafeInteger(byteEnd)
    || byteStart < 0 || byteEnd < byteStart || byteEnd > original.length) {
    throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_CLAIM_SPAN_INVALID:${authorityFamily}:${claim?.kind || 'UNKNOWN'}`);
  }
  const beforeField = String(claim?.beforeField ?? ''); const afterField = String(claim?.afterField ?? '');
  if (original.slice(byteStart, byteEnd) !== beforeField) {
    throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_CLAIM_PREIMAGE_MISMATCH:${authorityFamily}:${claim?.kind || 'UNKNOWN'}:${byteStart}`);
  }
  return deepFreeze({ ...claim, authorityFamily, byteStart, byteEnd, beforeField, afterField });
}
function arbitrateClaims(claims, original) {
  const rows = claims.map((item) => normalizeClaim(item.claim, item.authorityFamily, original))
    .filter((item) => item.beforeField !== item.afterField)
    .sort((a, b) => a.byteStart - b.byteStart || a.byteEnd - b.byteEnd || a.authorityFamily.localeCompare(b.authorityFamily));
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].byteStart < rows[index - 1].byteEnd) {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_ORIGINAL_SPAN_OVERLAP:${rows[index - 1].authorityFamily}:${rows[index - 1].kind}:${rows[index].authorityFamily}:${rows[index].kind}`);
    }
  }
  return deepFreeze(rows);
}
function applyClaims(original, claims) {
  let cursor = 0; let output = '';
  for (const claim of claims) {
    if (original.slice(claim.byteStart, claim.byteEnd) !== claim.beforeField) {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_STALE_PREIMAGE:${claim.authorityFamily}:${claim.kind}:${claim.byteStart}`);
    }
    output += original.slice(cursor, claim.byteStart) + claim.afterField;
    cursor = claim.byteEnd;
  }
  return output + original.slice(cursor);
}
function byteStringToBytes(value) {
  const input = String(value ?? ''); const out = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code > 0xff) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_NON_BYTE_CODE_UNIT:${index}:${code}`);
    out[index] = code;
  }
  return out;
}
function representationCustody(physicalFile) {
  return deepFreeze({
    authority: POSTIMAGE_REPRESENTATION_AUTHORITY,
    byteLength: Number(physicalFile.byteLength), textLength: String(physicalFile.text ?? '').length,
    textEncodingAuthority: physicalFile.textEncodingAuthority, lineCount: (physicalFile.lines || []).length,
    lineEndingStyle: physicalFile.lineEndings?.style || null,
    finalLineTerminated: physicalFile.lineEndings?.finalLineTerminated === true,
  });
}

export function applyCiiWriter2CompositeWithRestraintDelete({ targetDocument, targetGraph, transferPlan }) {
  const target0HashCustody = target0Custody(targetDocument);
  const original = String(targetDocument?.physicalFile?.originalByteString ?? '');
  if (transferPlan?.status !== 'PREVIEW_READY') throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_TRANSFER_PLAN_NOT_PREVIEW_READY');
  if ((transferPlan?.blockers || []).length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_TRANSFER_BLOCKED:${transferPlan.blockers.join('|')}`);
  const parentCustody = assertBoundScopeCustody(transferPlan, targetDocument);
  const applied = appliedOperations(transferPlan);
  if (!applied.length) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_NO_MUTATIONS');

  const sifCreates = applied.filter(isSifCreate);
  if (sifCreates.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_${CII_WRITER_2_SIF_CREATE_BLOCKER}:${sifCreates.map(operationId).join(',')}`);
  const hangerCreates = applied.filter(isHangerCreate);
  if (hangerCreates.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_${CII_WRITER_2_HANGER_CREATE_BLOCKER}:${hangerCreates.map(operationId).join(',')}`);
  const restraintCreates = applied.filter(isRestraintCreate);
  if (restraintCreates.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_${CII_WRITER_2_RESTRAINT_CREATE_BLOCKER}:${restraintCreates.map(operationId).join(',')}`);
  const unsupported = applied.filter((operation) => !supportedApply(operation));
  if (unsupported.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_UNSUPPORTED_APPLY:${unsupported.map(operationId).join(',')}`);

  const nodeCount = applied.filter(isNodeMutation).length;
  const sifDeleteCount = applied.filter(isSifDelete).length;
  const hangerDeleteCount = applied.filter(isHangerDelete).length;
  const restraintDeleteCount = applied.filter(isRestraintDelete).length;
  if (!restraintDeleteCount) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_OPERATION_REQUIRED');

  const existingCount = nodeCount + sifDeleteCount + hangerDeleteCount;
  const existingPlan = existingCount
    ? projectCanonicalSubscope(transferPlan, isExistingCompositeMutation, 'WRITER_2_EXISTING_NODE_SIF_HANGER_COMPOSITE', parentCustody)
    : null;
  const restraintPlan = projectCanonicalSubscope(transferPlan, isRestraintDelete, CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY, parentCustody);

  // Both component transactions dry-run from exactly the same untouched TARGET0.
  const existingComposite = existingPlan
    ? applyCiiWriter2CompositeWithHangerDeleteAll({ targetDocument, targetGraph, transferPlan: existingPlan })
    : null;
  const restraintDelete = applyCiiWriter2RestraintDeleteCompaction({ targetDocument, transferPlan: restraintPlan });
  if (text(restraintDelete?.target0HashCustody?.contentSha256) !== target0HashCustody.contentSha256) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_COMPONENT_TARGET0_HASH_MISMATCH');
  }
  for (const claim of restraintDelete?.mutations || []) {
    if (!ALLOWED_RESTRAINT_CLAIM_KINDS.has(claim?.kind)) {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_UNEXPECTED_COMPONENT_CLAIM:${claim?.kind || 'UNKNOWN'}`);
    }
  }

  const candidates = [
    ...(existingComposite?.mutations || []).map((claim) => ({ authorityFamily: claim.authorityFamily, claim })),
    ...(restraintDelete?.mutations || []).map((claim) => ({ authorityFamily: CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY, claim })),
  ];
  const mutations = arbitrateClaims(candidates, original);
  if (!mutations.length) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_NO_PHYSICAL_MUTATIONS');
  const byteString = applyClaims(original, mutations);
  const bytes = byteStringToBytes(byteString);
  const canonical = createCiiPhysicalFile(bytes);
  if (canonical.originalByteString !== byteString) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_POSTIMAGE_REINTAKE_BYTE_MISMATCH');
  const postimageHashCustody = deepFreeze({
    authority: POSTIMAGE_HASH_AUTHORITY, contentSha256: sha256CiiByteString(byteString), byteLength: byteString.length,
  });

  return Object.freeze({
    schema: 'CIIWorkspaceWriter2CompositeRestraintResult.v1', status: 'APPLIED', writer: 'WRITER_2',
    mode: 'ONE_ORIGINAL_PREIMAGE_COMPOSITE', authority: CII_WRITER_2_RESTRAINT_COMPOSITE_AUTHORITY,
    byteString, bytes, text: canonical.text,
    byteLengthBefore: original.length, byteLengthAfter: byteString.length,
    mutationCount: mutations.length, mutations,
    target0HashCustody, postimageHashCustody, postimageRepresentationCustody: representationCustody(canonical),
    parentScopeCustody: parentCustody,
    familyMutationCounts: deepFreeze({
      nodeNameOperations: nodeCount, sifDeleteOperations: sifDeleteCount, hangerDeleteOperations: hangerDeleteCount,
      restraintDeleteOperations: restraintDeleteCount,
      existingCompositeClaims: existingComposite?.mutations?.length || 0,
      restraintDeleteClaims: restraintDelete?.mutations?.length || 0,
    }),
    components: Object.freeze({ existingComposite, restraintDelete }),
  });
}

export const _test = deepFreeze({
  text, operationId, sorted, exactIds, sameStrings,
  isNodeMutation, isSifDelete, isSifCreate, isHangerDelete, isHangerCreate,
  isRestraintDelete, isRestraintCreate, isExistingCompositeMutation, supportedApply,
  target0Custody, assertBoundScopeCustody, projectCanonicalSubscope,
  normalizeClaim, arbitrateClaims, applyClaims, byteStringToBytes, representationCustody,
});
