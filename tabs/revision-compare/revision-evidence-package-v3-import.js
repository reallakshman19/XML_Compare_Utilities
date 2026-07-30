/** Verification adapter for RevisionCompareEvidencePackage.v3 signature attachments. */
import { deepFreeze } from './revision-contract-utils.js';
import {
  REVISION_COMPARE_EVIDENCE_PACKAGE_FIELDS,
  REVISION_COMPARE_EVIDENCE_PACKAGE_ID_PREFIX,
  REVISION_COMPARE_EVIDENCE_PACKAGE_V2_SCHEMA,
  REVISION_COMPARE_EVIDENCE_PACKAGE_V3_SCHEMA,
  canonicalRevisionCompareEvidenceValue,
  revisionCompareEvidencePackageHashMaterial,
} from './revision-evidence-package.js';
import { verifyRevisionCompareEvidencePackageV2 } from './revision-evidence-package-v2-import.js';
import {
  REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_IDENTITY_STATUS,
  REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_STATUS,
  REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_TRUST_STATUS,
  verifyRevisionEvidencePackageResponsivenessSignature,
} from './revision-evidence-package-responsiveness-signature.js';
import { REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_STATUS } from './revision-evidence-package-responsiveness-receipt.js';
import { sha256Text } from './revision-hash.js';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const PAYLOAD_FIELDS = Object.freeze([
  'sessionManifest', 'scopeBasisManifest', 'audit', 'reviewSession', 'decisionLedger',
  'responsivenessReceipt', 'responsivenessSignatureReceipt',
]);
const IDENTITY_FIELDS = Object.freeze([
  'sessionId', 'basisId', 'auditId', 'reviewSessionId', 'decisionLedgerId',
  'revADocumentId', 'revBDocumentId', 'engineVersion',
  'responsivenessReceiptId', 'responsivenessReceiptContentSha256',
  'responsivenessSignatureReceiptId', 'responsivenessSignatureReceiptContentSha256',
  'responsivenessSignaturePublicKeySha256',
]);
const STATUS_FIELDS = Object.freeze([
  'basisStatus', 'auditValidationStatus', 'reviewStatus', 'decisionStatus',
  'responsivenessReceiptStatus', 'responsivenessSignatureStatus',
  'responsivenessSignatureIdentityStatus', 'responsivenessSignatureTrustStatus',
]);

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, allowed, label) {
  if (!plainObject(value)) throw new TypeError(`${label} must be a plain JSON object.`);
  const actual = Object.keys(value).sort(); const expected = [...allowed].sort();
  if (actual.join('|') !== expected.join('|')) throw new TypeError(`${label} contains unsupported or missing fields.`);
}
function sameJson(left, right) {
  return JSON.stringify(canonicalRevisionCompareEvidenceValue(left, 'left'))
    === JSON.stringify(canonicalRevisionCompareEvidenceValue(right, 'right'));
}

async function verifyEnvelope(parsed, cryptoRef) {
  exactKeys(parsed, REVISION_COMPARE_EVIDENCE_PACKAGE_FIELDS, 'Evidence package');
  if (parsed.schema !== REVISION_COMPARE_EVIDENCE_PACKAGE_V3_SCHEMA) throw new TypeError(`Evidence package schema must be ${REVISION_COMPARE_EVIDENCE_PACKAGE_V3_SCHEMA}.`);
  if (!Object.hasOwn(parsed.payload ?? {}, 'responsivenessSignatureReceipt')) {
    throw new TypeError(`Evidence package schema must be ${REVISION_COMPARE_EVIDENCE_PACKAGE_V2_SCHEMA} unless a responsivenessSignatureReceipt attachment is present.`);
  }
  exactKeys(parsed.payload, PAYLOAD_FIELDS, 'Evidence package payload');
  exactKeys(parsed.validation, ['status', 'errors'], 'Package validation');
  if (parsed.validation.status !== 'READY' || !Array.isArray(parsed.validation.errors) || parsed.validation.errors.length) throw new TypeError('Package validation must be READY.');
  if (!HASH_PATTERN.test(parsed.contentSha256 ?? '')) throw new TypeError('contentSha256 must be a lowercase 64-character SHA-256.');
  if (parsed.packageId !== `${REVISION_COMPARE_EVIDENCE_PACKAGE_ID_PREFIX}${parsed.contentSha256}`) throw new TypeError('packageId does not match contentSha256.');
  const frozen = deepFreeze(canonicalRevisionCompareEvidenceValue(parsed, REVISION_COMPARE_EVIDENCE_PACKAGE_V3_SCHEMA));
  if (await sha256Text(JSON.stringify(revisionCompareEvidencePackageHashMaterial(frozen)), cryptoRef) !== frozen.contentSha256) {
    throw new TypeError('Evidence package canonical SHA-256 does not match contentSha256.');
  }
  return frozen;
}

async function v2Projection(value, cryptoRef) {
  const { responsivenessSignatureReceipt: _signature, ...payload } = value.payload;
  const {
    responsivenessSignatureReceiptId: _id,
    responsivenessSignatureReceiptContentSha256: _hash,
    responsivenessSignaturePublicKeySha256: _key,
    ...identity
  } = value.identity;
  const {
    responsivenessSignatureStatus: _status,
    responsivenessSignatureIdentityStatus: _identity,
    responsivenessSignatureTrustStatus: _trust,
    ...authorityStatus
  } = value.authorityStatus;
  const material = revisionCompareEvidencePackageHashMaterial({
    schema: REVISION_COMPARE_EVIDENCE_PACKAGE_V2_SCHEMA, identity, authorityStatus, payload, validation: value.validation,
  });
  const contentSha256 = await sha256Text(JSON.stringify(material), cryptoRef);
  return canonicalRevisionCompareEvidenceValue({
    ...material, packageId: `${REVISION_COMPARE_EVIDENCE_PACKAGE_ID_PREFIX}${contentSha256}`, contentSha256,
  }, REVISION_COMPARE_EVIDENCE_PACKAGE_V2_SCHEMA);
}

function verifyBinding(value, verified, signature) {
  exactKeys(value.identity, IDENTITY_FIELDS, 'Package identity'); exactKeys(value.authorityStatus, STATUS_FIELDS, 'Package authorityStatus');
  const responsiveness = verified.responsivenessReceiptVerification;
  const expectedIdentity = {
    sessionId: verified.session.sessionId, basisId: verified.basis.basisId, auditId: verified.audit.auditId,
    reviewSessionId: value.payload.reviewSession.reviewSessionId, decisionLedgerId: value.payload.decisionLedger.ledgerId,
    revADocumentId: verified.audit.revADocumentId, revBDocumentId: verified.audit.revBDocumentId, engineVersion: verified.audit.engineVersion,
    responsivenessReceiptId: responsiveness.receiptId, responsivenessReceiptContentSha256: responsiveness.contentSha256,
    responsivenessSignatureReceiptId: signature.receiptId,
    responsivenessSignatureReceiptContentSha256: signature.contentSha256,
    responsivenessSignaturePublicKeySha256: signature.publicKeySha256,
  };
  if (!sameJson(value.identity, expectedIdentity)) throw new TypeError('Package identity does not equal its nested authority, responsiveness and signature identities.');
  const expectedStatus = {
    basisStatus: 'CURRENT', auditValidationStatus: 'READY', reviewStatus: value.payload.reviewSession.status,
    decisionStatus: value.payload.decisionLedger.status,
    responsivenessReceiptStatus: REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_STATUS,
    responsivenessSignatureStatus: REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_STATUS,
    responsivenessSignatureIdentityStatus: REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_IDENTITY_STATUS,
    responsivenessSignatureTrustStatus: REVISION_EVIDENCE_PACKAGE_RESPONSIVENESS_SIGNATURE_TRUST_STATUS,
  };
  if (!sameJson(value.authorityStatus, expectedStatus)) throw new TypeError('Package authorityStatus does not equal its nested authority, responsiveness and signature statuses.');
}

export async function verifyRevisionCompareEvidencePackageV3(parsed, fileName, importedAt, cryptoRef, verifyV1Json) {
  const frozen = await verifyEnvelope(parsed, cryptoRef);
  const projection = await v2Projection(frozen, cryptoRef);
  const verified = await verifyRevisionCompareEvidencePackageV2(projection, fileName, importedAt, cryptoRef, verifyV1Json);
  const signature = await verifyRevisionEvidencePackageResponsivenessSignature(
    frozen.payload.responsivenessSignatureReceipt,
    verified.responsivenessReceiptVerification.receipt,
    cryptoRef,
  );
  verifyBinding(frozen, verified, signature);
  return deepFreeze({
    ...verified,
    responsivenessSignatureVerification: signature,
    receipt: {
      ...verified.receipt, packageId: frozen.packageId, contentSha256: frozen.contentSha256,
      responsivenessSignatureReceiptAttached: true,
      responsivenessSignatureReceiptId: signature.receiptId,
      responsivenessSignatureReceiptContentSha256: signature.contentSha256,
      responsivenessSignaturePublicKeySha256: signature.publicKeySha256,
      responsivenessSignatureCryptographicStatus: signature.cryptographicStatus,
      responsivenessSignatureIdentityStatus: signature.identityStatus,
      responsivenessSignatureTrustStatus: signature.trustStatus,
    },
  });
}
