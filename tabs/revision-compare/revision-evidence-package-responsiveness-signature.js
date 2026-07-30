/** Bounded attachment of one cryptographically verified responsiveness signature receipt. */
import { deepFreeze } from './revision-contract-utils.js';
import {
  REVISION_RESPONSIVENESS_SIGNATURE_RECEIPT_SCHEMA,
  verifyRevisionResponsivenessSignatureReceipt,
} from './revision-responsiveness-receipt-signature.js';

export const REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_STATUS = 'CRYPTOGRAPHICALLY_VERIFIED_AT_EXPORT';
export const REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_IDENTITY_STATUS = 'EXTERNALLY_ASSERTED';
export const REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_TRUST_STATUS = 'NOT_ESTABLISHED';

function requireSignatureReceipt(value) {
  if (value?.schema !== REVISION_RESPONSIVENESS_SIGNATURE_RECEIPT_SCHEMA) {
    throw new TypeError('Evidence-package signature attachment requires a verified RevisionResponsivenessExternalSignatureReceipt.v1.');
  }
  if (!/^[a-f0-9]{64}$/.test(value.contentSha256 ?? '')) {
    throw new TypeError('Attached responsiveness signature receipt requires a full lowercase contentSha256.');
  }
  return value;
}

function subjectMatches(signatureReceipt, responsivenessReceipt) {
  const subject = signatureReceipt?.subject;
  return Boolean(subject && responsivenessReceipt
    && subject.responsivenessReceiptId === responsivenessReceipt.receiptId
    && subject.responsivenessReceiptContentSha256 === responsivenessReceipt.contentSha256
    && subject.sessionId === responsivenessReceipt.session?.sessionId
    && subject.auditId === responsivenessReceipt.audit?.auditId
    && subject.basisId === responsivenessReceipt.audit?.basisId
    && subject.runId === responsivenessReceipt.observation?.runId);
}

export function createRevisionEvidencePackageResponsivenessSignatureAttachment(value, responsivenessReceipt) {
  if (!value?.signatureReceipt) return null;
  const signatureReceipt = requireSignatureReceipt(value.signatureReceipt);
  if (value.signatureStatus !== 'VERIFIED' || !subjectMatches(signatureReceipt, responsivenessReceipt)) {
    throw new TypeError('Responsiveness signature attachment must be verified for the attached responsiveness receipt.');
  }
  return deepFreeze(signatureReceipt);
}

export function revisionEvidencePackageResponsivenessSignatureIdentity(signatureReceipt) {
  if (!signatureReceipt) return null;
  return deepFreeze({
    responsivenessSignatureReceiptId: signatureReceipt.receiptId,
    responsivenessSignatureReceiptContentSha256: signatureReceipt.contentSha256,
    responsivenessSignaturePublicKeySha256: signatureReceipt.signature.publicKeySha256,
  });
}

export async function verifyRevisionEvidencePackageResponsivenessSignature(signatureReceipt, responsivenessReceipt, cryptoRef) {
  const receipt = await verifyRevisionResponsivenessSignatureReceipt(
    requireSignatureReceipt(signatureReceipt), responsivenessReceipt, cryptoRef,
  );
  return deepFreeze({
    status: 'VERIFIED', cryptographicStatus: 'VALID',
    receiptId: receipt.receiptId, contentSha256: receipt.contentSha256,
    publicKeySha256: receipt.signature.publicKeySha256,
    identityStatus: REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_IDENTITY_STATUS,
    trustStatus: REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_TRUST_STATUS,
    receipt,
  });
}
