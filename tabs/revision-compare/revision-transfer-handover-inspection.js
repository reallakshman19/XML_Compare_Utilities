/** Fail-closed verification for imported canonical transfer handover bundles. */
import { assertJsonSafe, deepFreeze, stableStringify } from './revision-contract-utils.js';
import { REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA, serializeRevisionCompareEvidencePackage } from './revision-evidence-package.js';
import { verifyRevisionCompareEvidencePackageJson } from './revision-evidence-package-import.js';
import { sha256Text } from './revision-hash.js';
import {
  REVISION_COMPARE_TRANSFER_OPERATION_ID_PREFIX, REVISION_COMPARE_TRANSFER_OPERATION_SCHEMA,
  REVISION_COMPARE_TRANSFER_PLAN_ID_PREFIX, REVISION_COMPARE_TRANSFER_PLAN_SCHEMA,
  REVISION_COMPARE_TRANSFER_SELECTION_SCHEMA, serializeRevisionCompareTransferPlan,
} from './revision-transfer-contracts.js';
import { REVISION_COMPARE_TRANSFER_DIRECTION } from './revision-transfer-policy.js';
import { REVISION_COMPARE_TRANSFER_RESULT_SCHEMA, createRevisionCompareTransferResult } from './revision-transfer-result.js';
import { REVISION_COMPARE_TRANSFER_AUDIT_SCHEMA, REVISION_COMPARE_TRANSFER_PROOF_SCHEMA } from './revision-transfer-verifier.js';
import {
  REVISION_COMPARE_TRANSFER_ARTIFACT_SCHEMA, REVISION_COMPARE_TRANSFER_MANIFEST_SCHEMA,
  createRevisionCompareTransferArtifacts,
} from './revision-transfer-artifacts.js';
import { REVISION_COMPARE_TARGET_STATE } from './revision-transfer-address.js';
import {
  REVISION_COMPARE_TRANSFER_COMPLETION_DECLARATION, REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA,
  REVISION_COMPARE_TRANSFER_COMPLETION_TRUST_STATEMENT, normalizeRevisionCompareTransferCompletionDeclarant,
  validateRevisionCompareTransferCompletionReportIdentity,
} from './revision-transfer-completion.js';
import {
  REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA, serializeRevisionCompareTransferHandoverBundle,
  validateRevisionCompareTransferHandoverBundleIdentity,
} from './revision-transfer-handover.js';

export const REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES = 134_217_728;
export const REVISION_COMPARE_HANDOVER_ARTIFACT_ROLES = Object.freeze([
  'PATCHED_TARGET', 'TRANSFER_AUDIT', 'TRANSFER_PROOF', 'TRANSFER_MANIFEST',
]);
const PROOF_INVARIANTS = Object.freeze([
  'jsonReparseSucceeded', 'supportedRootAndProfile', 'operationReconciliation',
  'protectedFieldsUnchanged', 'entityCountUnchanged', 'entityIdentitiesUnchanged',
  'arrayLengthsAndOrderUnchanged', 'hierarchyAndTopologyUnchanged', 'schemaAndEnvelopeUnchanged',
  'unknownFieldsRetained', 'unselectedValuesUnchanged', 'objectKeyOrderPreserved',
  'everyMutationCoveredExactlyOnce',
]);
const PREFIX = Object.freeze({
  result: 'revision-transfer-result:', audit: 'revision-transfer-audit:',
  proof: 'revision-transfer-proof:', manifest: 'revision-transfer-manifest:',
});

function equal(left, right) { return stableStringify(left) === stableStringify(right); }
function byteSize(text) { return new TextEncoder().encode(String(text)).byteLength; }
function without(value, keys) { return Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => !keys.includes(key))); }
function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be a plain JSON object.`);
  if (Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) throw new TypeError(`${label} contains unsupported or missing fields.`);
}
function requireReady(value, label) {
  if (value?.status !== 'READY' || !Array.isArray(value.errors) || value.errors.length) throw new Error(`${label} must be READY with no errors.`);
}
async function verifyIdentity(value, key, prefix, cryptoRef) {
  const hash = await sha256Text(stableStringify(without(value, [key, 'contentSha256'])), cryptoRef);
  if (value?.contentSha256 !== hash || value?.[key] !== `${prefix}${hash}`) throw new Error(`${value?.schema ?? key} identity does not recompute.`);
}
function operationPath(operation) {
  const parent = operation.targetCanonicalPath === '/' ? '' : operation.targetCanonicalPath;
  return `${parent}${operation.fieldPath}` || '/';
}
function expectedChange(operation) {
  const present = operation.expectedTargetState === REVISION_COMPARE_TARGET_STATE.PRESENT;
  return {
    path: operationPath(operation), kind: present ? 'REPLACED' : 'ADDED',
    before: present ? { state: 'PRESENT', value: operation.beforeValue } : { state: 'ABSENT' },
    after: { state: 'PRESENT', value: operation.afterValue },
  };
}

async function verifyEvidencePackage(value, declaredAt, cryptoRef) {
  if (value?.schema !== REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA) throw new TypeError(`Embedded ${REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA} is required.`);
  const status = value.authorityStatus;
  if (value.validation?.status !== 'READY' || value.validation?.errors?.length
      || status?.basisStatus !== 'CURRENT' || status.auditValidationStatus !== 'READY'
      || status.reviewStatus !== 'CURRENT' || status.decisionStatus !== 'CURRENT') {
    throw new Error('Embedded evidence package must contain current READY authorities.');
  }
  await verifyRevisionCompareEvidencePackageJson(
    serializeRevisionCompareEvidencePackage(value), 'embedded-evidence-package.json', declaredAt, cryptoRef,
  );
}
async function verifyOperation(operation, plan, cryptoRef) {
  if (operation?.schema !== REVISION_COMPARE_TRANSFER_OPERATION_SCHEMA) throw new TypeError(`Every operation must use ${REVISION_COMPARE_TRANSFER_OPERATION_SCHEMA}.`);
  if (operation.status !== 'READY' || !Array.isArray(operation.blockers) || operation.blockers.length) {
    throw new Error(`Transfer operation ${operation.operationId ?? 'unknown'} must be READY with no blockers.`);
  }
  const source = plan.sourceDocument; const target = plan.receiverDocument; const address = operation.targetAddress;
  if (operation.sourceDocumentId !== source.documentId || operation.sourceDocumentSha256 !== source.contentSha256
      || operation.targetDocumentId !== target.documentId || operation.targetDocumentSha256 !== target.contentSha256) {
    throw new Error('Transfer operation document authority does not match the plan.');
  }
  if (address?.targetEntityId !== operation.targetEntityId || address.entityCanonicalPath !== operation.targetCanonicalPath
      || address.fieldPath !== operation.fieldPath || address.expectedTargetState !== operation.expectedTargetState) {
    throw new Error(`Transfer operation ${operation.operationId} target address does not reconcile.`);
  }
  const hash = await sha256Text(stableStringify(without(operation, ['operationId', 'status', 'blockers'])), cryptoRef);
  if (operation.operationId !== `${REVISION_COMPARE_TRANSFER_OPERATION_ID_PREFIX}${hash}`) throw new Error(`Transfer operation ${operation.operationId} identity does not recompute.`);
}
async function verifyPlan(plan, evidence, cryptoRef) {
  if (plan?.schema !== REVISION_COMPARE_TRANSFER_PLAN_SCHEMA || plan.direction !== REVISION_COMPARE_TRANSFER_DIRECTION) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_PLAN_SCHEMA} is required.`);
  if (plan.status !== 'READY') throw new Error('Transfer plan must be READY.');
  if (plan.planId !== `${REVISION_COMPARE_TRANSFER_PLAN_ID_PREFIX}${plan.contentSha256}`
      || !Array.isArray(plan.blockers) || plan.blockers.length || !Array.isArray(plan.operations) || !plan.operations.length) {
    throw new Error('Transfer plan identity, operations or blockers are invalid.');
  }
  if (plan.selection?.schema !== REVISION_COMPARE_TRANSFER_SELECTION_SCHEMA
      || plan.selection.direction !== REVISION_COMPARE_TRANSFER_DIRECTION) throw new Error('Transfer plan selection is invalid.');
  await verifyIdentity(plan, 'planId', REVISION_COMPARE_TRANSFER_PLAN_ID_PREFIX, cryptoRef);
  for (const operation of plan.operations) await verifyOperation(operation, plan, cryptoRef);
  const ids = plan.operations.map((item) => item.operationId); const paths = plan.operations.map(operationPath);
  if (new Set(ids).size !== ids.length || new Set(paths).size !== paths.length) throw new Error('Transfer plan operation IDs and target paths must be unique.');
  const summary = plan.summary; const replace = plan.operations.filter((item) => item.operationType === 'REPLACE_EXISTING_PROPERTY').length;
  if (summary?.selectedItemCount !== plan.selection.items.length || summary.operationCount !== plan.operations.length || summary.readyOperationCount !== plan.operations.length
      || summary.blockedOperationCount !== 0 || summary.replaceExistingCount !== replace
      || summary.addMissingCount !== plan.operations.length - replace) throw new Error('Transfer plan summary does not reconcile.');
  const payload = evidence.payload; const revA = payload.sessionManifest.revisions.revA.document;
  const revB = payload.sessionManifest.revisions.revB.document; const basis = payload.scopeBasisManifest.basis;
  if (plan.sourceDocument.documentId !== revA.documentId || plan.sourceDocument.contentSha256 !== revA.sourceHash
      || plan.receiverDocument.documentId !== revB.documentId || plan.receiverDocument.contentSha256 !== revB.sourceHash
      || plan.scope?.proposalId !== payload.scopeBasisManifest.proposal.proposalId || plan.scope?.basisStatus !== 'CURRENT'
      || plan.comparisonBasis?.basisId !== basis.basisId || plan.audit?.auditId !== payload.audit.auditId
      || plan.reviewSession?.reviewSessionId !== payload.reviewSession.reviewSessionId
      || plan.decisionLedger?.ledgerId !== payload.decisionLedger.ledgerId
      || plan.reviewSession?.revision !== payload.reviewSession.revision
      || plan.decisionLedger?.revision !== payload.decisionLedger.revision) {
    throw new Error('Transfer plan does not reconcile with packaged source authorities.');
  }
}
async function verifyResult(result, plan, cryptoRef) {
  if (result?.schema !== REVISION_COMPARE_TRANSFER_RESULT_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_RESULT_SCHEMA} is required.`);
  const patchedHash = await sha256Text(result.patchedTargetText, cryptoRef);
  if (patchedHash !== result.patchedTargetSha256
      || result.patchedTargetDocumentId !== `revision-patched:${plan.receiverDocument.documentId}:${patchedHash}`) {
    throw new Error('Patched-target text, hash or document identity does not recompute.');
  }
  const expected = await createRevisionCompareTransferResult({
    written: {
      plan, validatedOperations: plan.operations.map((operation) => ({ operation })),
      patchedTargetDocumentId: result.patchedTargetDocumentId,
      patchedTargetSha256: result.patchedTargetSha256, patchedTargetText: result.patchedTargetText,
    },
    createdAt: result.createdAt,
  }, { cryptoRef });
  if (!equal(result, expected)) throw new Error('Transfer result does not equal the deterministic result contract.');
}
function expectedAuditRow(operation) {
  const row = {
    operationId: operation.operationId, sourceEntityId: operation.sourceEntityId,
    targetEntityId: operation.targetEntityId, targetCanonicalPath: operation.targetCanonicalPath,
    fieldPath: operation.fieldPath, operationType: operation.operationType,
    expectedTargetState: operation.expectedTargetState, proposedValue: operation.afterValue,
    actualValue: operation.afterValue, status: 'APPLIED', reason: 'Verified exact planned mutation.',
    evidenceReferences: operation.evidenceReferences,
  };
  if (operation.expectedTargetState === REVISION_COMPARE_TARGET_STATE.PRESENT) row.beforeValue = operation.beforeValue;
  return row;
}
async function verifyAudit(audit, plan, result, cryptoRef) {
  if (audit?.schema !== REVISION_COMPARE_TRANSFER_AUDIT_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_AUDIT_SCHEMA} is required.`);
  requireReady(audit, 'Transfer audit'); await verifyIdentity(audit, 'auditId', PREFIX.audit, cryptoRef);
  const rows = plan.operations.map(expectedAuditRow);
  const summary = { operationCount: rows.length, appliedCount: rows.length, skippedCount: 0, blockedCount: 0 };
  if (audit.planId !== plan.planId || audit.planContentSha256 !== plan.contentSha256
      || audit.createdAt !== result.createdAt || !equal(audit.rows, rows) || !equal(audit.summary, summary)) {
    throw new Error('Transfer audit does not reconcile with the plan and result.');
  }
}
async function verifyProof(proof, plan, result, cryptoRef) {
  if (proof?.schema !== REVISION_COMPARE_TRANSFER_PROOF_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_PROOF_SCHEMA} is required.`);
  requireReady(proof, 'Transfer proof'); await verifyIdentity(proof, 'proofId', PREFIX.proof, cryptoRef);
  exactKeys(proof.invariants, PROOF_INVARIANTS, 'Transfer proof invariants');
  if (PROOF_INVARIANTS.some((key) => proof.invariants[key] !== true)) throw new Error('Every required transfer-proof invariant must be present and true.');
  const planHash = await sha256Text(serializeRevisionCompareTransferPlan(plan), cryptoRef);
  const expected = plan.operations.map(expectedChange).sort((a, b) => a.path.localeCompare(b.path));
  const actual = [...(proof.actualChanges ?? [])].sort((a, b) => a.path.localeCompare(b.path));
  if (proof.planId !== plan.planId || proof.planContentSha256 !== plan.contentSha256
      || proof.serializedPlanSha256 !== planHash || proof.createdAt !== result.createdAt
      || proof.originalTargetDocumentId !== result.targetDocumentId || proof.originalTargetSha256 !== result.originalTargetSha256
      || proof.patchedTargetDocumentId !== result.patchedTargetDocumentId || proof.patchedTargetSha256 !== result.patchedTargetSha256
      || !equal(actual, expected)) throw new Error('Transfer proof does not reconcile with the plan and result.');
}
function descriptorReference(item) {
  return {
    descriptorSchema: item.descriptorSchema, filename: item.filename, schema: item.schema,
    mimeType: item.mimeType, contentSha256: item.contentSha256, sizeBytes: item.sizeBytes,
  };
}
async function verifyArtifacts(payload, cryptoRef) {
  const artifacts = payload.transferArtifacts;
  if (!Array.isArray(artifacts) || artifacts.length !== 4) throw new Error('Exactly four embedded transfer artifacts are required in governing order.');
  const schemas = [payload.transferPlan.receiverDocument.profile, REVISION_COMPARE_TRANSFER_AUDIT_SCHEMA,
    REVISION_COMPARE_TRANSFER_PROOF_SCHEMA, REVISION_COMPARE_TRANSFER_MANIFEST_SCHEMA];
  for (let index = 0; index < artifacts.length; index += 1) {
    const item = artifacts[index]; const role = REVISION_COMPARE_HANDOVER_ARTIFACT_ROLES[index];
    if (item?.descriptorSchema !== REVISION_COMPARE_TRANSFER_ARTIFACT_SCHEMA || item.schema !== schemas[index]
        || item.mimeType !== 'application/json' || typeof item.filename !== 'string' || !item.filename
        || typeof item.text !== 'string') throw new Error(`${role} artifact descriptor is invalid.`);
    if (await sha256Text(item.text, cryptoRef) !== item.contentSha256) throw new Error(`${role} artifact SHA-256 does not match.`);
    if (byteSize(item.text) !== item.sizeBytes) throw new Error(`${role} artifact UTF-8 size does not match.`);
  }
  const expected = await createRevisionCompareTransferArtifacts({
    result: payload.transferResult, audit: payload.transferAudit, proof: payload.transferProof,
    targetFileName: payload.transferPlan.receiverDocument.fileName,
    patchedTargetSchema: payload.transferPlan.receiverDocument.profile,
  }, { cryptoRef });
  if (!equal(payload.transferManifest, expected.manifest)) throw new Error('Transfer manifest does not equal deterministic manifest material.');
  for (let index = 0; index < artifacts.length; index += 1) {
    if (!equal(artifacts[index], expected.artifacts[index])) throw new Error(`${REVISION_COMPARE_HANDOVER_ARTIFACT_ROLES[index]} artifact does not equal governing retained bytes.`);
  }
  return expected.artifacts.map(descriptorReference);
}
function exactTimestamp(value) {
  const parsed = typeof value === 'string' && value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) throw new Error('Completion declaredAt must be an exact ISO timestamp.');
}
async function verifyCompletion(report, payload, cryptoRef) {
  if (report?.schema !== REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA} is required.`);
  await validateRevisionCompareTransferCompletionReportIdentity(report, cryptoRef);
  normalizeRevisionCompareTransferCompletionDeclarant(report.declaration); exactTimestamp(report.declaration.declaredAt);
  if (report.declaration.statement !== REVISION_COMPARE_TRANSFER_COMPLETION_DECLARATION
      || report.trustBoundary.statement !== REVISION_COMPARE_TRANSFER_COMPLETION_TRUST_STATEMENT
      || report.trustBoundary.identityStatus !== 'SELF_DECLARED' || report.trustBoundary.authorityStatus !== 'NOT_ESTABLISHED'
      || report.trustBoundary.authenticityStatus !== 'NOT_ESTABLISHED') throw new Error('Completion declaration or trust boundary is invalid.');
  const count = payload.transferPlan.operations.length; const completion = report.completion;
  if (completion?.status !== 'COMPLETE' || completion.operationCount !== count || completion.appliedOperationCount !== count
      || completion.skippedOperationCount !== 0 || completion.blockedOperationCount !== 0
      || !Array.isArray(completion.blockers) || completion.blockers.length
      || report.validation?.status !== 'READY' || !Array.isArray(report.validation?.errors) || report.validation.errors.length) {
    throw new Error('Completion report is not READY, COMPLETE and operation-conserving.');
  }
}
function verifyCrossLinks(bundle) {
  const { identity, payload } = bundle; const evidence = payload.evidencePackage; const plan = payload.transferPlan;
  const result = payload.transferResult; const audit = payload.transferAudit; const proof = payload.transferProof;
  const manifest = payload.transferManifest; const report = payload.completionReport;
  if (identity.sessionId !== evidence.identity.sessionId || identity.evidencePackageId !== evidence.packageId
      || identity.completionReportId !== report.reportId || identity.planId !== plan.planId || identity.resultId !== result.resultId
      || identity.originalTargetSha256 !== result.originalTargetSha256 || identity.patchedTargetSha256 !== result.patchedTargetSha256) {
    throw new Error('Handover identity does not reconcile with embedded authorities.');
  }
  const source = report.sourceEvidence; const transfer = report.transferEvidence;
  if (source.packageId !== evidence.packageId || source.packageContentSha256 !== evidence.contentSha256
      || source.sessionId !== evidence.identity.sessionId || source.basisId !== evidence.identity.basisId
      || source.auditId !== evidence.identity.auditId || source.reviewSessionId !== evidence.identity.reviewSessionId
      || source.decisionLedgerId !== evidence.identity.decisionLedgerId
      || source.reviewRevision !== evidence.payload.reviewSession.revision
      || source.decisionRevision !== evidence.payload.decisionLedger.revision) {
    throw new Error('Completion source evidence does not reconcile.');
  }
  if (result.planId !== plan.planId || result.planContentSha256 !== plan.contentSha256
      || audit.planId !== plan.planId || audit.planContentSha256 !== plan.contentSha256
      || proof.planId !== plan.planId || proof.planContentSha256 !== plan.contentSha256
      || manifest.planId !== plan.planId || manifest.resultId !== result.resultId
      || audit.createdAt !== result.createdAt || proof.createdAt !== result.createdAt || manifest.createdAt !== result.createdAt) {
    throw new Error('Transfer authorities do not reconcile with plan, result and creation identity.');
  }
  if (transfer.planId !== plan.planId || transfer.planContentSha256 !== plan.contentSha256
      || transfer.resultId !== result.resultId || transfer.resultContentSha256 !== result.contentSha256
      || transfer.originalTargetDocumentId !== result.targetDocumentId || transfer.originalTargetSha256 !== result.originalTargetSha256
      || transfer.patchedTargetDocumentId !== result.patchedTargetDocumentId || transfer.patchedTargetSha256 !== result.patchedTargetSha256
      || transfer.transferAuditContentSha256 !== audit.contentSha256 || transfer.transferProofContentSha256 !== proof.contentSha256
      || transfer.transferManifestContentSha256 !== manifest.contentSha256) throw new Error('Completion transfer evidence does not reconcile.');
}

export async function verifyRevisionCompareTransferHandoverBundle(bundle, options = {}) {
  const cryptoRef = options.cryptoRef ?? globalThis.crypto;
  if (bundle?.schema !== REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA} is required.`);
  exactKeys(bundle, ['schema', 'identity', 'payload', 'validation', 'bundleId', 'contentSha256'], 'Transfer handover bundle');
  exactKeys(bundle.identity, ['sessionId', 'evidencePackageId', 'completionReportId', 'planId', 'resultId', 'originalTargetSha256', 'patchedTargetSha256'], 'Handover identity');
  exactKeys(bundle.payload, ['evidencePackage', 'transferPlan', 'transferResult', 'transferAudit', 'transferProof', 'transferManifest', 'transferArtifacts', 'completionReport'], 'Handover payload');
  if (bundle.validation?.status !== 'READY' || !Array.isArray(bundle.validation?.errors) || bundle.validation.errors.length) throw new Error('Transfer handover bundle validation is not READY.');
  await validateRevisionCompareTransferHandoverBundleIdentity(bundle, cryptoRef);
  const payload = bundle.payload; await verifyEvidencePackage(payload.evidencePackage, payload.completionReport?.declaration?.declaredAt, cryptoRef);
  await verifyPlan(payload.transferPlan, payload.evidencePackage, cryptoRef);
  await verifyResult(payload.transferResult, payload.transferPlan, cryptoRef);
  await verifyAudit(payload.transferAudit, payload.transferPlan, payload.transferResult, cryptoRef);
  await verifyProof(payload.transferProof, payload.transferPlan, payload.transferResult, cryptoRef);
  if (payload.transferManifest?.schema !== REVISION_COMPARE_TRANSFER_MANIFEST_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_MANIFEST_SCHEMA} is required.`);
  await verifyIdentity(payload.transferManifest, 'manifestId', PREFIX.manifest, cryptoRef);
  await verifyCompletion(payload.completionReport, payload, cryptoRef); verifyCrossLinks(bundle);
  const descriptors = await verifyArtifacts(payload, cryptoRef);
  if (!equal(payload.completionReport.transferEvidence?.artifactDescriptors, descriptors)) throw new Error('Completion artifact descriptors do not match the exact embedded artifacts.');
  const output = deepFreeze(JSON.parse(JSON.stringify(bundle))); assertJsonSafe(output, REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA);
  return output;
}
export async function verifyRevisionCompareTransferHandoverText(text, options = {}) {
  if (typeof text !== 'string' || !text) throw new TypeError('A non-empty UTF-8 handover JSON text is required.');
  if (text.charCodeAt(0) === 0xFEFF) throw new Error('A UTF-8 byte-order mark is not allowed.');
  if (byteSize(text) > REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES) throw new RangeError('Transfer handover exceeds the 128 MiB input limit.');
  let bundle;
  try { bundle = JSON.parse(text); } catch (error) { throw new SyntaxError(`Transfer handover JSON is invalid: ${error.message}`); }
  if (bundle?.schema !== REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA} is required.`);
  if (text !== serializeRevisionCompareTransferHandoverBundle(bundle)) throw new Error('Transfer handover JSON is not the exact canonical serialization.');
  return verifyRevisionCompareTransferHandoverBundle(bundle, options);
}
export const _test = Object.freeze({ byteSize, descriptorReference, equal, expectedChange, operationPath });
