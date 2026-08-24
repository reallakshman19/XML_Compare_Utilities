import { stableStringify } from './cii-workspace-contracts.js';
import { createCiiPhysicalFile } from './cii-workspace-physical-file.js';
import { isCiiSha256Hex, sha256CiiByteString } from './cii-workspace-byte-sha256.js';
import { buildCiiWriter2NodeNameRelocationPlan } from './cii-workspace-writer2-nodename-relocation.js';
import { buildCiiWriter2SifDeleteRelocationPlan, CII_WRITER_2_SIF_CREATE_BLOCKER } from './cii-workspace-writer2-sif-delete.js';
import { buildCiiWriter2HangerDeletePlan, CII_WRITER_2_HANGER_CREATE_BLOCKER } from './cii-workspace-writer2-hanger-delete.js';
import { buildCiiWriter2RestraintDeleteCompactionPlan, CII_WRITER_2_RESTRAINT_CREATE_BLOCKER } from './cii-workspace-writer2-restraint-delete-compaction-plan.js';
import { _test as legacyValidatorTest } from './cii-workspace-writer2-composite-hanger-validation.js';
import { _test as hangerPartialValidatorTest } from './cii-workspace-writer2-hanger-partial-validation.js';
import { _test as restraintValidatorTest } from './cii-workspace-writer2-restraint-delete-validation.js';

// Deliberately duplicated authority identities: this validator must not import the new W2.12 Writer module.
const CII_WRITER_2_RESTRAINT_COMPOSITE_AUTHORITY = 'CII_WRITER_2_RESTRAINT_ONE_TARGET0_COMPOSITE';
const CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY = 'WRITER_2_RESTRAINT_BLOCK_DELETE';
const NODE_PROPERTY = 'Node name / to-name';
const SIF_PROPERTY = 'SIF/Tee record presence';
const HANGER_PROPERTY = 'Hanger presence';
const RESTRAINT_PROPERTY = 'Qualified restraint slot mutation';
const SCOPE_MODE = 'EXPLICIT_APPLY_EXCLUDE';
const SCOPE_AUTHORITY = 'USER_EXPLICIT_OPERATION_SCOPE';
const PARTIAL_HANGER_FAMILY = 'WRITER_2_HANGER_PARTIAL_DELETE';
const DELETE_ALL_HANGER_FAMILY = 'WRITER_2_HANGER_DELETE_ALL';
const TARGET0_HASH_AUTHORITY = 'SHA256_ORIGINAL_TARGET0_BYTES';
const POSTIMAGE_HASH_AUTHORITY = 'SHA256_WRITER2_POSTIMAGE_BYTES';
const POSTIMAGE_REPRESENTATION_AUTHORITY = 'CII_PHYSICAL_POSTIMAGE_REINTAKE_EQUIVALENCE';

function text(value) { return String(value ?? '').trim(); }
function operationId(operation) { return text(operation?.operationId); }
function sorted(values) { return [...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })); }
function exactIds(values, code) {
  if (!Array.isArray(values)) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_${code}_ARRAY_REQUIRED`);
  const ids = values.map(text);
  if (ids.some((id) => !id)) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_${code}_ID_REQUIRED`);
  if (new Set(ids).size !== ids.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_${code}_DUPLICATE_ID`);
  return Object.freeze(sorted(ids));
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
function supportedApply(operation) {
  return isNodeMutation(operation) || isSifDelete(operation) || isHangerDelete(operation) || isRestraintDelete(operation);
}
function appliedOperations(transferPlan) {
  return (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY');
}
function independentCanonicalSubscope(transferPlan, predicate, family, parentCustody) {
  const projectedApply = []; const siblingExcludes = []; const keeps = [];
  for (const operation of transferPlan?.operations || []) {
    if (operation?.scopeDecision === 'APPLY' && isMutable(operation)) {
      if (predicate(operation)) projectedApply.push(operation);
      else siblingExcludes.push(Object.freeze({ ...operation, scopeDecision: 'EXCLUDE' }));
    } else if (operation?.action === 'KEEP' && operation?.scopeDecision === 'KEEP') {
      keeps.push(operation);
    } else {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_PROJECTED_OPERATION_CONTAINER_INVALID:${operationId(operation) || 'UNKNOWN'}`);
    }
  }
  const inheritedExcluded = [...(transferPlan?.excludedOperations || [])];
  for (const operation of inheritedExcluded) {
    if (!isMutable(operation) || operation?.scopeDecision !== 'EXCLUDE') {
      throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_PROJECTED_EXCLUDE_CONTAINER_INVALID:${operationId(operation) || 'UNKNOWN'}`);
    }
  }
  const projectedExcluded = [...inheritedExcluded, ...siblingExcludes];
  exactIds([...keeps, ...projectedApply, ...projectedExcluded].map(operationId), 'PROJECTED_OPERATION');
  const appliedIds = exactIds(projectedApply.map(operationId), 'PROJECTED_APPLY');
  const excludedIds = exactIds(projectedExcluded.map(operationId), 'PROJECTED_EXCLUDE');
  if (appliedIds.some((id) => excludedIds.includes(id))) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_PROJECTED_APPLY_EXCLUDE_OVERLAP');
  }
  const candidateIds = Object.freeze(sorted([...appliedIds, ...excludedIds]));
  const scopeId = `${parentCustody.parentScopeId}::${family}`;
  return Object.freeze({
    ...transferPlan,
    operations: Object.freeze([...keeps, ...projectedApply]),
    excludedOperations: Object.freeze(projectedExcluded),
    transferScope: Object.freeze({
      status: 'BOUND', mode: SCOPE_MODE, authority: SCOPE_AUTHORITY, scopeId,
      sourceSha256: parentCustody.sourceSha256, targetSha256: parentCustody.targetSha256,
      candidateOperationIds: candidateIds, appliedOperationIds: appliedIds, excludedOperationIds: excludedIds,
    }),
    familyProjection: Object.freeze({
      schema: 'CIIWorkspaceWriter2FamilyProjection.v1', status: 'DERIVED_CANONICAL_BOUND_SUBSCOPE',
      authority: 'PARENT_TRANSFER_SCOPE_CANONICAL_SUBSCOPE', family,
      parentScopeId: parentCustody.parentScopeId, projectedScopeId: scopeId,
      parentAppliedOperationIds: parentCustody.appliedOperationIds,
      projectedAppliedOperationIds: appliedIds,
      siblingAppliedOperationIds: Object.freeze(sorted(siblingExcludes.map(operationId))),
    }),
  });
}
function independentTarget0Custody(before) {
  const original = String(before?.physicalFile?.originalByteString ?? '');
  const declared = text(before?.contentSha256);
  if (before?.writer1CByteEligible !== true || before?.physicalFile?.writer1CByteEligible !== true) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_ORIGINAL_BYTE_AUTHORITY_REQUIRED');
  }
  if (!isCiiSha256Hex(declared)) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_TARGET0_SHA256_FORMAT_REQUIRED');
  if (!original || Number(before?.physicalFile?.byteLength) !== original.length) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_TARGET0_BYTE_LENGTH_MISMATCH');
  }
  const actual = sha256CiiByteString(original);
  if (actual !== declared) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_TARGET0_SHA256_MISMATCH');
  return Object.freeze({ authority: TARGET0_HASH_AUTHORITY, contentSha256: actual, byteLength: original.length });
}
function restraintExpectedClaims(before, plan) {
  return [
    restraintValidatorTest.independentControlReplacement(before, plan),
    ...restraintValidatorTest.independentPointerReplacements(before, plan),
    restraintValidatorTest.independentRestraintReplacement(before, plan),
  ].filter((item) => item.beforeField !== item.afterField)
    .map((item) => ({ ...item, authorityFamily: CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY }));
}
function hangerExpectedClaims(before, plan) {
  if (plan?.compaction?.deleteAll === true && Number(plan.countAfter) === 0) {
    return legacyValidatorTest.hangerExpectedClaims(before, plan);
  }
  const partial = plan?.compaction?.partialMultiRecordDelete === true
    && Number(plan.countBefore) > 1 && Number(plan.countAfter) > 0 && Number(plan.countAfter) < Number(plan.countBefore);
  if (!partial) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_HANGER_SCOPE_UNQUALIFIED');
  const retained = hangerPartialValidatorTest.independentlyRetained(Number(plan.countBefore), plan.deletedRecordIndices);
  if (stableStringify(retained.retained) !== stableStringify(plan.retainedRecordIndices)
    || stableStringify(retained.oldToNew) !== stableStringify(plan.oldToNewRecordIndex)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_HANGER_RECORD_MAP_MISMATCH');
  }
  const counts = hangerPartialValidatorTest.expectedCounts(before, retained.retained.length);
  return hangerPartialValidatorTest.expectedReplacements(before, plan, retained.retained, counts)
    .map((claim) => ({ ...claim, authorityFamily: PARTIAL_HANGER_FAMILY }));
}
function expectedMutationTestimony(claims) {
  return claims.map((item) => ({
    authorityFamily: item.authorityFamily,
    kind: item.kind,
    byteStart: Number(item.byteStart), byteEnd: Number(item.byteEnd),
    beforeField: item.beforeField, afterField: item.afterField,
    ...(item.parsedElementIndex != null ? { parsedElementIndex: Number(item.parsedElementIndex) } : {}),
  }));
}
function actualMutationTestimony(writerResult) {
  return (writerResult?.mutations || []).map((item) => ({
    authorityFamily: item.authorityFamily,
    kind: item.kind,
    byteStart: Number(item.byteStart), byteEnd: Number(item.byteEnd),
    beforeField: item.beforeField, afterField: item.afterField,
    ...(item.parsedElementIndex != null ? { parsedElementIndex: Number(item.parsedElementIndex) } : {}),
  }));
}
function bytesFromByteString(value) {
  const input = String(value ?? ''); const out = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code > 0xff) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_NON_BYTE_CODE_UNIT:${index}:${code}`);
    out[index] = code;
  }
  return out;
}
function sameBytes(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}
function representationCustody(physical) {
  return Object.freeze({
    authority: POSTIMAGE_REPRESENTATION_AUTHORITY,
    byteLength: Number(physical.byteLength), textLength: String(physical.text ?? '').length,
    textEncodingAuthority: physical.textEncodingAuthority, lineCount: (physical.lines || []).length,
    lineEndingStyle: physical.lineEndings?.style || null,
    finalLineTerminated: physical.lineEndings?.finalLineTerminated === true,
  });
}

export function validateCiiWriter2CompositeWithRestraintDelete({ before, after, targetGraph, transferPlan, writerResult }) {
  const target0HashCustody = independentTarget0Custody(before);
  const parentCheck = legacyValidatorTest.independentBoundScopeCustody(transferPlan, before);
  if (parentCheck.errors.length) {
    throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_PARENT_SCOPE:${parentCheck.errors.join('|')}`);
  }
  const applied = appliedOperations(transferPlan);
  if (!applied.length) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_NO_MUTATIONS');
  const sifCreates = applied.filter(isSifCreate);
  if (sifCreates.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_${CII_WRITER_2_SIF_CREATE_BLOCKER}:${sifCreates.map(operationId).join(',')}`);
  const hangerCreates = applied.filter(isHangerCreate);
  if (hangerCreates.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_${CII_WRITER_2_HANGER_CREATE_BLOCKER}:${hangerCreates.map(operationId).join(',')}`);
  const restraintCreates = applied.filter(isRestraintCreate);
  if (restraintCreates.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_${CII_WRITER_2_RESTRAINT_CREATE_BLOCKER}:${restraintCreates.map(operationId).join(',')}`);
  const unsupported = applied.filter((operation) => !supportedApply(operation));
  if (unsupported.length) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_UNSUPPORTED_APPLY:${unsupported.map(operationId).join(',')}`);

  const nodeOperations = applied.filter(isNodeMutation);
  const sifDeletes = applied.filter(isSifDelete);
  const hangerDeletes = applied.filter(isHangerDelete);
  const restraintDeletes = applied.filter(isRestraintDelete);
  if (!restraintDeletes.length) throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_RESTRAINT_OPERATION_REQUIRED');

  const nodePlan = nodeOperations.length ? buildCiiWriter2NodeNameRelocationPlan({
    targetDocument: before,
    transferPlan: independentCanonicalSubscope(transferPlan, isNodeMutation, 'WRITER_2_NODENAME', parentCheck.custody),
  }) : null;
  const sifPlan = sifDeletes.length ? buildCiiWriter2SifDeleteRelocationPlan({
    targetDocument: before, targetGraph,
    transferPlan: independentCanonicalSubscope(transferPlan, isSifDelete, 'WRITER_2_SIF_DELETE', parentCheck.custody),
  }) : null;
  const hangerScope = hangerDeletes.length
    ? independentCanonicalSubscope(transferPlan, isHangerDelete, 'WRITER_2_HANGER_DELETE', parentCheck.custody) : null;
  const hangerPlan = hangerScope ? buildCiiWriter2HangerDeletePlan({ targetDocument: before, transferPlan: hangerScope }) : null;
  const restraintScope = independentCanonicalSubscope(transferPlan, isRestraintDelete, CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY, parentCheck.custody);
  const restraintPlan = buildCiiWriter2RestraintDeleteCompactionPlan({ targetDocument: before, transferPlan: restraintScope });

  if (nodePlan && !nodePlan.ready) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_NODE_PLAN_BLOCKED:${nodePlan.blockers.join('|')}`);
  if (sifPlan && !sifPlan.ready) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_SIF_PLAN_BLOCKED:${sifPlan.blockers.join('|')}`);
  if (hangerPlan && !hangerPlan.ready) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_HANGER_PLAN_BLOCKED:${hangerPlan.blockers.join('|')}`);
  if (!restraintPlan.ready) throw new Error(`CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_RESTRAINT_PLAN_BLOCKED:${restraintPlan.blockers.join('|')}`);

  const original = String(before?.physicalFile?.originalByteString ?? '');
  const expectedClaims = [];
  if (nodePlan) expectedClaims.push(...legacyValidatorTest.nodeExpectedClaims(before, nodePlan));
  if (sifPlan) expectedClaims.push(...legacyValidatorTest.sifExpectedClaims(before, sifPlan));
  if (hangerPlan) expectedClaims.push(...hangerExpectedClaims(before, hangerPlan));
  expectedClaims.push(...restraintExpectedClaims(before, restraintPlan));
  const arbitrated = legacyValidatorTest.arbitrateExpected(expectedClaims, original);
  const expectedByteString = legacyValidatorTest.applyExpected(original, arbitrated);

  // Primary oracle: complete final bytes, before Writer testimony is considered.
  const actualByteString = String(after?.physicalFile?.originalByteString ?? '');
  if (actualByteString !== expectedByteString) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_EXACT_COMPLETE_POSTIMAGE_MISMATCH');
  }
  const expectedBytes = bytesFromByteString(expectedByteString);
  const expectedPhysical = createCiiPhysicalFile(expectedBytes);
  if (stableStringify(after?.physicalFile?.lines || []) !== stableStringify(expectedPhysical.lines)
    || stableStringify(after?.physicalFile?.lineEndings || {}) !== stableStringify(expectedPhysical.lineEndings)
    || String(after?.physicalFile?.text ?? '') !== expectedPhysical.text) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_POSTIMAGE_PHYSICAL_REPRESENTATION_MISMATCH');
  }
  const expectedSha = sha256CiiByteString(expectedByteString);
  if (!isCiiSha256Hex(after?.contentSha256) || text(after.contentSha256) !== expectedSha) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_POSTIMAGE_SHA256_MISMATCH');
  }

  if (writerResult?.schema !== 'CIIWorkspaceWriter2CompositeRestraintResult.v1'
    || writerResult?.status !== 'APPLIED'
    || writerResult?.writer !== 'WRITER_2'
    || writerResult?.mode !== 'ONE_ORIGINAL_PREIMAGE_COMPOSITE'
    || writerResult?.authority !== CII_WRITER_2_RESTRAINT_COMPOSITE_AUTHORITY) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_WRITER_AUTHORITY_MISMATCH');
  }
  if (writerResult.byteString !== expectedByteString || !sameBytes(writerResult.bytes, expectedBytes)
    || writerResult.text !== expectedPhysical.text) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_WRITER_REPRESENTATION_MISMATCH');
  }
  const expectedTestimony = expectedMutationTestimony(arbitrated);
  const actualTestimony = actualMutationTestimony(writerResult);
  if (Number(writerResult.mutationCount) !== arbitrated.length
    || stableStringify(actualTestimony) !== stableStringify(expectedTestimony)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_WRITER_MUTATION_TESTIMONY_MISMATCH');
  }
  if (stableStringify(writerResult.parentScopeCustody) !== stableStringify(parentCheck.custody)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_PARENT_SCOPE_TESTIMONY_MISMATCH');
  }
  if (stableStringify(writerResult?.components?.restraintDelete?.relocationPlan) !== stableStringify(restraintPlan)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_RESTRAINT_PLAN_TESTIMONY_MISMATCH');
  }
  const restraintExpected = expectedTestimony.filter((item) => item.authorityFamily === CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY);
  const restraintActual = (writerResult?.components?.restraintDelete?.mutations || []).map((item) => ({
    authorityFamily: CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY, kind: item.kind,
    byteStart: Number(item.byteStart), byteEnd: Number(item.byteEnd),
    beforeField: item.beforeField, afterField: item.afterField,
    ...(item.parsedElementIndex != null ? { parsedElementIndex: Number(item.parsedElementIndex) } : {}),
  }));
  if (Number(writerResult?.components?.restraintDelete?.mutationCount) !== restraintExpected.length
    || stableStringify(restraintActual) !== stableStringify(restraintExpected)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_RESTRAINT_COMPONENT_MUTATION_TESTIMONY_MISMATCH');
  }
  const existingExpected = expectedTestimony.filter((item) => item.authorityFamily !== CII_WRITER_2_RESTRAINT_COMPOSITE_FAMILY);
  const existingActual = (writerResult?.components?.existingComposite?.mutations || []).map((item) => ({
    authorityFamily: item.authorityFamily, kind: item.kind,
    byteStart: Number(item.byteStart), byteEnd: Number(item.byteEnd),
    beforeField: item.beforeField, afterField: item.afterField,
    ...(item.parsedElementIndex != null ? { parsedElementIndex: Number(item.parsedElementIndex) } : {}),
  }));
  if (existingExpected.length !== existingActual.length
    || stableStringify(existingExpected) !== stableStringify(existingActual)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_EXISTING_COMPONENT_TESTIMONY_MISMATCH');
  }
  const expectedTarget0HashCustody = Object.freeze({
    authority: TARGET0_HASH_AUTHORITY, contentSha256: target0HashCustody.contentSha256, byteLength: original.length,
  });
  if (stableStringify(writerResult.target0HashCustody) !== stableStringify(expectedTarget0HashCustody)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_TARGET0_HASH_TESTIMONY_MISMATCH');
  }
  const expectedPostimageHashCustody = Object.freeze({
    authority: POSTIMAGE_HASH_AUTHORITY, contentSha256: expectedSha, byteLength: expectedByteString.length,
  });
  if (stableStringify(writerResult.postimageHashCustody) !== stableStringify(expectedPostimageHashCustody)) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_POSTIMAGE_HASH_TESTIMONY_MISMATCH');
  }
  if (stableStringify(writerResult.postimageRepresentationCustody) !== stableStringify(representationCustody(expectedPhysical))) {
    throw new Error('CII_WRITER_2_COMPOSITE_RESTRAINT_VALIDATOR_REPRESENTATION_TESTIMONY_MISMATCH');
  }

  return Object.freeze({
    schema: 'CIIWorkspaceWriter2CompositeRestraintValidation.v1', status: 'PASS',
    authority: 'INDEPENDENT_COMPLETE_POSTIMAGE_RESTRAINT_COMPOSITE_VALIDATION',
    expectedSha256: expectedSha, expectedByteLength: expectedByteString.length,
    mutationCount: arbitrated.length,
    familyOperationCounts: Object.freeze({
      nodeName: nodeOperations.length, sifDelete: sifDeletes.length,
      hangerDelete: hangerDeletes.length, restraintDelete: restraintDeletes.length,
    }),
    checklist: Object.freeze([
      'INDEPENDENT_TARGET0_SHA256', 'INDEPENDENT_PARENT_SCOPE', 'INDEPENDENT_CANONICAL_CHILD_SCOPES',
      'INDEPENDENT_NODE_PLAN_AND_CLAIMS', 'INDEPENDENT_SIF_PLAN_AND_CLAIMS',
      'INDEPENDENT_HANGER_PLAN_AND_CLAIMS', 'INDEPENDENT_RESTRAINT_PLAN_AND_CLAIMS',
      'GLOBAL_ORIGINAL_COORDINATE_ARBITRATION', 'EXACT_COMPLETE_FINAL_BYTES',
      'POSTIMAGE_SHA256', 'POSTIMAGE_PHYSICAL_REINTAKE', 'WRITER_TESTIMONY_AFTER_BYTES',
    ]),
  });
}

export const _test = Object.freeze({
  text, operationId, sorted, exactIds,
  isNodeMutation, isSifDelete, isSifCreate, isHangerDelete, isHangerCreate,
  isRestraintDelete, isRestraintCreate, supportedApply, independentCanonicalSubscope,
  independentTarget0Custody, restraintExpectedClaims, hangerExpectedClaims,
  expectedMutationTestimony, actualMutationTestimony, bytesFromByteString, sameBytes, representationCustody,
  DELETE_ALL_HANGER_FAMILY,
});