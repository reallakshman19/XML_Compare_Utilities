/** Fail-closed verification for imported canonical transfer handover bundles. */
import { assertJsonSafe, deepFreeze, stableStringify } from './revision-contract-utils.js';
import {
  canonicalRevisionCompareEvidenceValue, REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA,
  revisionCompareEvidencePackageHashMaterial,
} from './revision-evidence-package.js';
import { sha256Text } from './revision-hash.js';
import {
  REVISION_COMPARE_TRANSFER_COMPLETION_DECLARATION,
  REVISION_COMPARE_TRANSFER_COMPLETION_TRUST_STATEMENT,
  validateRevisionCompareTransferCompletionReportIdentity,
} from './revision-transfer-completion.js';
import {
  REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA,
  serializeRevisionCompareTransferHandoverBundle,
  validateRevisionCompareTransferHandoverBundleIdentity,
} from './revision-transfer-handover.js';

export const REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES = 134_217_728;
const IDENTITY = Object.freeze({
  plan: ['planId', 'revision-transfer-plan:'], result: ['resultId', 'revision-transfer-result:'],
  audit: ['auditId', 'revision-transfer-audit:'], proof: ['proofId', 'revision-transfer-proof:'],
  manifest: ['manifestId', 'revision-transfer-manifest:'],
});
function byteSize(value) { return new TextEncoder().encode(String(value)).byteLength; }
function equal(left, right) { return stableStringify(left) === stableStringify(right); }
function without(value, keys) { return Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => !keys.includes(key))); }
async function verifyIdentity(value, key, prefix, cryptoRef) {
  const hash = await sha256Text(stableStringify(without(value, [key, 'contentSha256'])), cryptoRef);
  if (value?.contentSha256 !== hash || value?.[key] !== `${prefix}${hash}`) throw new Error(`${value?.schema ?? key} identity does not recompute.`);
}
async function verifyEvidencePackage(value, cryptoRef) {
  if (value?.schema !== REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA) throw new TypeError('Embedded RevisionCompareEvidencePackage.v1 is required.');
  const hash = await sha256Text(JSON.stringify(revisionCompareEvidencePackageHashMaterial(value)), cryptoRef);
  if (value.contentSha256 !== hash || value.packageId !== `revision-evidence-package:${hash}`) throw new Error('Embedded evidence-package identity does not recompute.');
  const identity = value.identity; const payload = value.payload; const audit = payload?.audit;
  if (identity?.sessionId !== payload?.sessionManifest?.session?.sessionId || identity?.basisId !== payload?.scopeBasisManifest?.basis?.basisId || identity?.auditId !== audit?.auditId || identity?.reviewSessionId !== payload?.reviewSession?.reviewSessionId || identity?.decisionLedgerId !== payload?.decisionLedger?.ledgerId) throw new Error('Evidence-package payload identities do not reconcile.');
  if (identity?.revADocumentId !== audit?.revADocumentId || identity?.revBDocumentId !== audit?.revBDocumentId || identity?.engineVersion !== audit?.engineVersion) throw new Error('Evidence-package audit identities do not reconcile.');
  if (value.validation?.status !== 'READY' || value.validation?.errors?.length || value.authorityStatus?.basisStatus !== 'CURRENT') throw new Error('Evidence package is not current and READY.');
}
function operationPath(operation) { const parent = operation.targetCanonicalPath === '/' ? '' : operation.targetCanonicalPath; return `${parent}${operation.fieldPath}` || '/'; }
function verifyOperations(plan, result, audit, proof) {
  const planIds = plan.operations.map((item) => item.operationId); const auditIds = audit.rows.map((item) => item.operationId);
  if (new Set(planIds).size !== planIds.length || !equal(planIds, result.appliedOperations) || !equal(planIds, auditIds)) throw new Error('Operation IDs do not reconcile.');
  if (result.summary?.planOperationCount !== planIds.length || result.summary?.appliedOperationCount !== planIds.length || result.summary?.skippedOperationCount !== 0 || result.summary?.blockedOperationCount !== 0) throw new Error('Transfer-result operation counts do not reconcile.');
  if (audit.summary?.operationCount !== planIds.length || audit.summary?.appliedCount !== planIds.length || audit.summary?.skippedCount !== 0 || audit.summary?.blockedCount !== 0) throw new Error('Transfer-audit operation counts do not reconcile.');
  const expected = plan.operations.map(operationPath).sort(); const actual = (proof.actualChanges ?? []).map((item) => item.path).sort();
  if (!equal(expected, actual)) throw new Error('Proof mutation paths do not reconcile with the transfer plan.');
  if (Object.values(proof.invariants ?? {}).length === 0 || Object.values(proof.invariants).some((value) => value !== true)) throw new Error('Every transfer-proof invariant must be true.');
}
function reference(artifact) { return { filename: artifact.filename, schema: artifact.schema, mimeType: artifact.mimeType, contentSha256: artifact.contentSha256, sizeBytes: artifact.sizeBytes }; }
async function verifyArtifacts(payload, cryptoRef) {
  const artifacts = payload.transferArtifacts; if (!Array.isArray(artifacts) || artifacts.length !== 4) throw new Error('Exactly four embedded transfer artifacts are required.');
  for (const artifact of artifacts) {
    if (artifact?.descriptorSchema !== 'RevisionCompareTransferArtifact.v1' || typeof artifact.text !== 'string') throw new Error('Embedded transfer artifact descriptor is invalid.');
    if (await sha256Text(artifact.text, cryptoRef) !== artifact.contentSha256) throw new Error(`Embedded transfer artifact SHA-256 mismatch for ${artifact.filename}.`);
    if (byteSize(artifact.text) !== artifact.sizeBytes) throw new Error(`Embedded transfer artifact byte-size mismatch for ${artifact.filename}.`);
  }
  const [patched, auditArtifact, proofArtifact, manifestArtifact] = artifacts;
  if (patched.text !== payload.transferResult.patchedTargetText || patched.contentSha256 !== payload.transferResult.patchedTargetSha256) throw new Error('Patched-target artifact does not match the transfer result.');
  for (const [artifact, value, label] of [[auditArtifact, payload.transferAudit, 'audit'], [proofArtifact, payload.transferProof, 'proof'], [manifestArtifact, payload.transferManifest, 'manifest']]) {
    let parsed; try { parsed = JSON.parse(artifact.text); } catch { throw new Error(`Embedded ${label} artifact is not valid JSON.`); }
    if (!equal(parsed, value)) throw new Error(`Embedded ${label} artifact does not match retained evidence.`);
  }
  const manifest = payload.transferManifest;
  if (!equal(manifest.artifacts, artifacts.slice(0, 3).map(reference))) throw new Error('Transfer manifest descriptors do not match embedded artifacts.');
  const self = manifest.manifestArtifact;
  if (self?.filename !== manifestArtifact.filename || self?.schema !== manifestArtifact.schema || self?.mimeType !== manifestArtifact.mimeType || self?.contentHashPolicy !== 'CANONICAL_MANIFEST_MATERIAL' || self?.byteHashDescriptorSchema !== 'RevisionCompareTransferArtifact.v1') throw new Error('Transfer manifest self-reference does not match its artifact.');
  return artifacts;
}
function verifyCrossLinks(bundle) {
  const { identity, payload } = bundle; const { transferPlan: plan, transferResult: result, transferAudit: audit, transferProof: proof, transferManifest: manifest, completionReport: report, evidencePackage: evidence } = payload;
  if (identity.sessionId !== evidence.identity?.sessionId || identity.evidencePackageId !== evidence.packageId || identity.completionReportId !== report.reportId || identity.planId !== plan.planId || identity.resultId !== result.resultId) throw new Error('Handover container identities do not match embedded authorities.');
  if (identity.originalTargetSha256 !== result.originalTargetSha256 || identity.patchedTargetSha256 !== result.patchedTargetSha256) throw new Error('Handover target hashes do not match the transfer result.');
  if (result.planId !== plan.planId || result.planContentSha256 !== plan.contentSha256 || audit.planId !== plan.planId || audit.planContentSha256 !== plan.contentSha256 || proof.planId !== plan.planId || proof.planContentSha256 !== plan.contentSha256 || manifest.planId !== plan.planId || manifest.resultId !== result.resultId) throw new Error('Transfer authorities do not reconcile with the plan and result.');
  const reportTransfer = report.transferEvidence;
  if (report.sourceEvidence?.packageId !== evidence.packageId || report.sourceEvidence?.packageContentSha256 !== evidence.contentSha256 || reportTransfer?.planId !== plan.planId || reportTransfer?.planContentSha256 !== plan.contentSha256 || reportTransfer?.resultId !== result.resultId || reportTransfer?.resultContentSha256 !== result.contentSha256) throw new Error('Completion report does not reconcile with embedded evidence.');
  if (reportTransfer?.originalTargetSha256 !== result.originalTargetSha256 || reportTransfer?.patchedTargetSha256 !== result.patchedTargetSha256 || reportTransfer?.transferAuditContentSha256 !== audit.contentSha256 || reportTransfer?.transferProofContentSha256 !== proof.contentSha256 || reportTransfer?.transferManifestContentSha256 !== manifest.contentSha256) throw new Error('Completion report transfer hashes do not reconcile.');
  if (report.declaration?.statement !== REVISION_COMPARE_TRANSFER_COMPLETION_DECLARATION || report.trustBoundary?.statement !== REVISION_COMPARE_TRANSFER_COMPLETION_TRUST_STATEMENT) throw new Error('Completion fixed statements do not match the governing contract.');
  if (report.completion?.status !== 'COMPLETE' || report.validation?.status !== 'READY' || report.completion?.blockers?.length) throw new Error('Completion report is not READY and COMPLETE.');
  verifyOperations(plan, result, audit, proof);
}
export async function verifyRevisionCompareTransferHandoverText(text, options = {}) {
  if (typeof text !== 'string' || !text) throw new TypeError('A non-empty UTF-8 handover JSON text is required.');
  if (text.charCodeAt(0) === 0xFEFF) throw new Error('A UTF-8 byte-order mark is not allowed.');
  const size = byteSize(text); if (size > REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES) throw new RangeError('Transfer handover exceeds the 128 MiB input limit.');
  let bundle; try { bundle = JSON.parse(text); } catch (error) { throw new Error(`Transfer handover JSON is invalid: ${error.message}`); }
  if (bundle?.schema !== REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA} is required.`);
  if (text !== serializeRevisionCompareTransferHandoverBundle(bundle)) throw new Error('Transfer handover JSON is not the exact canonical serialization.');
  const cryptoRef = options.cryptoRef ?? globalThis.crypto; await validateRevisionCompareTransferHandoverBundleIdentity(bundle, cryptoRef);
  if (bundle.validation?.status !== 'READY' || bundle.validation?.errors?.length) throw new Error('Transfer handover bundle validation is not READY.');
  await verifyEvidencePackage(bundle.payload?.evidencePackage, cryptoRef);
  await verifyIdentity(bundle.payload?.transferPlan, ...IDENTITY.plan, cryptoRef); await verifyIdentity(bundle.payload?.transferResult, ...IDENTITY.result, cryptoRef);
  await verifyIdentity(bundle.payload?.transferAudit, ...IDENTITY.audit, cryptoRef); await verifyIdentity(bundle.payload?.transferProof, ...IDENTITY.proof, cryptoRef); await verifyIdentity(bundle.payload?.transferManifest, ...IDENTITY.manifest, cryptoRef);
  await validateRevisionCompareTransferCompletionReportIdentity(bundle.payload?.completionReport, cryptoRef); verifyCrossLinks(bundle); const artifacts = await verifyArtifacts(bundle.payload, cryptoRef);
  if (!equal(bundle.payload.completionReport.transferEvidence?.artifactDescriptors, artifacts.map((item) => ({ descriptorSchema: item.descriptorSchema, ...reference(item) })))) throw new Error('Completion report artifact descriptors do not match embedded artifacts.');
  const output = deepFreeze(canonicalRevisionCompareEvidenceValue(bundle, 'importedTransferHandover')); assertJsonSafe(output, REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA); return output;
}
export const _test = Object.freeze({ byteSize, equal, operationPath, reference });
