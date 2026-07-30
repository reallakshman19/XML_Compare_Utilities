/** Deterministic read-only receipt for one bend review-package verification. */

import { stableStringify } from '../adapters/bend-geometry-audit.js';
import {
  BEND_REVIEW_PACKAGE_SIGNATURE_ALGORITHM,
  computeWorkbenchEvidenceSignature,
} from './bend-review-package.js';

export const BEND_REVIEW_VERIFICATION_RECEIPT_CONTRACT = 'WorkbenchBendReviewVerificationReceipt.v1';
export const BEND_REVIEW_VERIFICATION_RECEIPT_AUTHORITY = 'READ_ONLY_VERIFICATION_RECEIPT';

function text(value) { return String(value ?? '').trim(); }
function packageReference(manifest) {
  return Object.freeze({
    contract: text(manifest?.contract),
    packageSignature: text(manifest?.packageSignature),
    disposition: text(manifest?.disposition),
  });
}
function differenceRows(rows) {
  return Object.freeze((Array.isArray(rows) ? rows : []).map((row) => Object.freeze({
    field: text(row?.field),
    imported: text(row?.imported) || '—',
    current: text(row?.current) || '—',
  })).sort((a, b) => a.field.localeCompare(b.field)
    || a.imported.localeCompare(b.imported) || a.current.localeCompare(b.current)));
}

export function buildBendReviewVerificationReceipt({ importedManifest, currentManifest, verification } = {}) {
  const differences = differenceRows(verification?.differences);
  const payload = Object.freeze({
    importedPackage: packageReference(importedManifest),
    currentPackage: packageReference(currentManifest),
    verification: Object.freeze({
      status: text(verification?.status) || 'INVALID_PACKAGE',
      code: text(verification?.code) || 'VERIFICATION_UNAVAILABLE',
      differenceCount: differences.length,
      differences,
    }),
  });
  return Object.freeze({
    contract: BEND_REVIEW_VERIFICATION_RECEIPT_CONTRACT,
    signatureAlgorithm: BEND_REVIEW_PACKAGE_SIGNATURE_ALGORITHM,
    receiptSignature: computeWorkbenchEvidenceSignature('wb3d-verify', payload),
    deterministic: true,
    authority: BEND_REVIEW_VERIFICATION_RECEIPT_AUTHORITY,
    payload,
  });
}

export function serializeBendReviewVerificationReceipt(receipt = {}) {
  return stableStringify(receipt);
}
