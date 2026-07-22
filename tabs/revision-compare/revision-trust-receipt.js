/** Strict detached RSA-PSS verification for one retained sign-off report. */
import { assertJsonSafe, deepFreeze, stableStringify } from './revision-contract-utils.js';
import { sha256Bytes, sha256Text } from './revision-hash.js';

export const REVISION_COMPARE_TRUST_RECEIPT_SCHEMA = 'RevisionCompareExternalSignatureReceipt.v1';
export const REVISION_COMPARE_TRUST_PAYLOAD_SCHEMA = 'RevisionCompareSignOffSignaturePayload.v1';
export const REVISION_COMPARE_TRUST_STATE_SCHEMA = 'RevisionCompareTrustReceiptState.v1';
export const REVISION_COMPARE_TRUST_RECEIPT_ID_PREFIX = 'revision-trust-receipt:';
export const REVISION_COMPARE_TRUST_ALGORITHM = 'RSA_PSS_SHA256';
export const REVISION_COMPARE_TRUST_MAX_BYTES = 256 * 1024;
export const REVISION_COMPARE_TRUST_STATEMENT = 'The detached signature is cryptographically valid for the identified completion report and supplied public key. Signer identity, organizational authority, certificate trust and approval are not established.';
export const REVISION_COMPARE_TRUST_STATUS = Object.freeze({
  IDLE: 'IDLE', IMPORTING: 'IMPORTING', VERIFIED_CURRENT: 'VERIFIED_CURRENT',
  VERIFIED_HISTORICAL: 'VERIFIED_HISTORICAL', FAILED: 'FAILED',
});

const ROOT_FIELDS = ['schema', 'receiptId', 'contentSha256', 'subject', 'signerClaim', 'signature', 'trustBoundary'];
const SUBJECT_FIELDS = ['signOffReportId', 'signOffContentSha256', 'evidencePackageId', 'evidencePackageContentSha256', 'sessionId'];
const CLAIM_FIELDS = ['displayName', 'role', 'organization', 'issuer', 'keyId'];
const SIGNATURE_FIELDS = ['algorithm', 'publicKeyJwk', 'publicKeySha256', 'signedPayloadSha256', 'signatureBase64Url', 'signedAt'];
const BOUNDARY_FIELDS = ['identityStatus', 'trustStatus'];
const JWK_FIELDS = ['kty', 'n', 'e', 'alg', 'ext', 'key_ops'];
const PRIVATE_JWK_FIELDS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'];
const SHA256 = /^[a-f0-9]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function exactFields(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be a plain object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must be a plain object.`);
  const actual = Object.keys(value).sort(); const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} contains unsupported or missing fields.`);
  }
}

function assertPlainJson(value, label, seen = new WeakSet()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach((item, index) => assertPlainJson(item, `${label}[${index}]`, seen)); return; }
  if (!value || typeof value !== 'object') throw new TypeError(`${label} is not JSON-safe.`);
  if (seen.has(value)) throw new TypeError(`${label} must not contain cycles.`); seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must contain plain objects only.`);
  Object.entries(value).forEach(([key, item]) => assertPlainJson(item, `${label}.${key}`, seen)); seen.delete(value);
}

function requiredText(value, label, maximum = 240) {
  if (typeof value !== 'string' || !value || value !== value.trim()) throw new TypeError(`${label} must be a trimmed non-empty string.`);
  if (value.length > maximum) throw new RangeError(`${label} is limited to ${maximum} characters.`);
  return value;
}

function optionalText(value, label, maximum = 240) {
  if (value === null) return null;
  if (typeof value !== 'string' || value !== value.trim()) throw new TypeError(`${label} must be null or a trimmed string.`);
  if (value.length > maximum) throw new RangeError(`${label} is limited to ${maximum} characters.`);
  return value;
}

function sha(value, label) {
  if (typeof value !== 'string' || !SHA256.test(value)) throw new TypeError(`${label} must be a lowercase SHA-256 value.`);
  return value;
}

function isoTimestamp(value, label) {
  if (typeof value !== 'string' || !value) throw new TypeError(`${label} must be an ISO timestamp.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) throw new TypeError(`${label} must be an exact ISO timestamp.`);
  return value;
}

function bytesToBase64Url(bytes) {
  let binary = ''; bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlBytes(value, label) {
  if (typeof value !== 'string' || !value || !BASE64URL.test(value) || value.includes('=')) {
    throw new TypeError(`${label} must be unpadded base64url.`);
  }
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  let binary; try { binary = atob(padded); } catch { throw new TypeError(`${label} is malformed base64url.`); }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== value) throw new TypeError(`${label} is not canonical base64url.`);
  return bytes;
}

function modulusBits(bytes) {
  if (!bytes.length || bytes[0] === 0) return 0;
  return ((bytes.length - 1) * 8) + Math.floor(Math.log2(bytes[0])) + 1;
}

function validatePublicJwk(value) {
  exactFields(value, JWK_FIELDS, 'signature.publicKeyJwk');
  if (PRIVATE_JWK_FIELDS.some((field) => Object.hasOwn(value, field))) throw new TypeError('Private RSA JWK fields are prohibited.');
  if (value.kty !== 'RSA' || value.alg !== 'PS256' || value.ext !== true) throw new TypeError('The public JWK must be RSA, PS256 and extractable public evidence.');
  if (!Array.isArray(value.key_ops) || value.key_ops.length !== 1 || value.key_ops[0] !== 'verify') throw new TypeError('The public JWK key_ops must be exactly ["verify"].');
  const modulus = base64UrlBytes(value.n, 'signature.publicKeyJwk.n');
  const exponent = base64UrlBytes(value.e, 'signature.publicKeyJwk.e');
  if (modulusBits(modulus) < 2048) throw new TypeError('The RSA modulus must be at least 2048 bits.');
  if (exponent.length !== 3 || exponent[0] !== 1 || exponent[1] !== 0 || exponent[2] !== 1) throw new TypeError('The RSA public exponent must be 65537.');
  return { jwk: JSON.parse(stableStringify(value)), modulusBytes: modulus.length };
}

function validateSubject(subject) {
  exactFields(subject, SUBJECT_FIELDS, 'subject');
  return {
    signOffReportId: requiredText(subject.signOffReportId, 'subject.signOffReportId'),
    signOffContentSha256: sha(subject.signOffContentSha256, 'subject.signOffContentSha256'),
    evidencePackageId: requiredText(subject.evidencePackageId, 'subject.evidencePackageId'),
    evidencePackageContentSha256: sha(subject.evidencePackageContentSha256, 'subject.evidencePackageContentSha256'),
    sessionId: requiredText(subject.sessionId, 'subject.sessionId'),
  };
}

function validateClaim(claim) {
  exactFields(claim, CLAIM_FIELDS, 'signerClaim');
  return {
    displayName: requiredText(claim.displayName, 'signerClaim.displayName', 160),
    role: requiredText(claim.role, 'signerClaim.role', 160),
    organization: optionalText(claim.organization, 'signerClaim.organization', 200),
    issuer: optionalText(claim.issuer, 'signerClaim.issuer', 200),
    keyId: requiredText(claim.keyId, 'signerClaim.keyId', 160),
  };
}

export function revisionCompareSignOffSignatureSubject(report) {
  if (report?.schema !== 'RevisionCompareSignOffReport.v1') throw new TypeError('A retained RevisionCompareSignOffReport.v1 is required.');
  return deepFreeze(validateSubject({
    signOffReportId: report.reportId, signOffContentSha256: report.contentSha256,
    evidencePackageId: report.sourceEvidence?.packageId,
    evidencePackageContentSha256: report.sourceEvidence?.packageContentSha256,
    sessionId: report.sourceEvidence?.sessionId,
  }));
}

export function revisionCompareSignOffSignaturePayload(subject) {
  return deepFreeze({ schema: REVISION_COMPARE_TRUST_PAYLOAD_SCHEMA, ...validateSubject(subject) });
}

export function serializeRevisionCompareSignOffSignaturePayload(subject) {
  return stableStringify(revisionCompareSignOffSignaturePayload(subject));
}

export function revisionCompareTrustReceiptHashMaterial(receipt) {
  return deepFreeze(JSON.parse(stableStringify({
    schema: receipt?.schema, subject: receipt?.subject, signerClaim: receipt?.signerClaim,
    signature: receipt?.signature, trustBoundary: receipt?.trustBoundary,
  })));
}

function validateReceiptStructure(input) {
  assertPlainJson(input, 'receipt'); exactFields(input, ROOT_FIELDS, 'receipt');
  if (input.schema !== REVISION_COMPARE_TRUST_RECEIPT_SCHEMA) throw new TypeError(`Receipt schema must be ${REVISION_COMPARE_TRUST_RECEIPT_SCHEMA}.`);
  const subject = validateSubject(input.subject); const signerClaim = validateClaim(input.signerClaim);
  exactFields(input.signature, SIGNATURE_FIELDS, 'signature'); exactFields(input.trustBoundary, BOUNDARY_FIELDS, 'trustBoundary');
  if (input.signature.algorithm !== REVISION_COMPARE_TRUST_ALGORITHM) throw new TypeError('Only RSA_PSS_SHA256 is supported.');
  if (input.trustBoundary.identityStatus !== 'EXTERNALLY_ASSERTED' || input.trustBoundary.trustStatus !== 'NOT_ESTABLISHED') throw new TypeError('The receipt trust boundary is invalid.');
  const key = validatePublicJwk(input.signature.publicKeyJwk);
  return { subject, signerClaim, key, signatureBytes: base64UrlBytes(input.signature.signatureBase64Url, 'signature.signatureBase64Url') };
}

function subjectMatchesReport(subject, report) {
  return stableStringify(subject) === stableStringify(revisionCompareSignOffSignatureSubject(report));
}

async function verifyHashes(input, structure, cryptoRef) {
  const receiptHash = await sha256Text(stableStringify(revisionCompareTrustReceiptHashMaterial(input)), cryptoRef);
  if (sha(input.contentSha256, 'contentSha256') !== receiptHash) throw new TypeError('Receipt content SHA-256 does not match canonical receipt material.');
  if (input.receiptId !== `${REVISION_COMPARE_TRUST_RECEIPT_ID_PREFIX}${receiptHash}`) throw new TypeError('Receipt ID does not match the receipt content SHA-256.');
  const payloadText = serializeRevisionCompareSignOffSignaturePayload(structure.subject);
  if (sha(input.signature.signedPayloadSha256, 'signature.signedPayloadSha256') !== await sha256Text(payloadText, cryptoRef)) throw new TypeError('Signed-payload SHA-256 does not match the canonical subject payload.');
  if (sha(input.signature.publicKeySha256, 'signature.publicKeySha256') !== await sha256Text(stableStringify(structure.key.jwk), cryptoRef)) throw new TypeError('Public-JWK SHA-256 does not match the supplied public key.');
  return payloadText;
}

async function verifyRsaPss(input, structure, payloadText, cryptoRef) {
  const subtle = cryptoRef?.subtle; if (!subtle?.importKey || !subtle?.verify) throw new Error('Web Crypto RSA-PSS verification is unavailable.');
  if (structure.signatureBytes.length !== structure.key.modulusBytes) throw new TypeError('The detached signature length does not match the RSA modulus.');
  let key; try { key = await subtle.importKey('jwk', structure.key.jwk, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['verify']); }
  catch { throw new TypeError('The supplied public RSA JWK cannot be imported for RSA-PSS verification.'); }
  const algorithm = key.algorithm;
  if (algorithm?.name !== 'RSA-PSS' || algorithm?.modulusLength < 2048) throw new TypeError('The imported RSA key does not satisfy the fixed profile.');
  const valid = await subtle.verify({ name: 'RSA-PSS', saltLength: 32 }, key, structure.signatureBytes, new TextEncoder().encode(payloadText));
  if (!valid) throw new Error('The detached RSA-PSS signature is invalid for the identified completion report.');
}

export async function verifyRevisionCompareTrustReceipt(receipt, report, cryptoRef) {
  const before = stableStringify(receipt); const structure = validateReceiptStructure(receipt);
  if (!subjectMatchesReport(structure.subject, report)) throw new TypeError('The receipt subject does not match the retained completion report.');
  const payloadText = await verifyHashes(receipt, structure, cryptoRef);
  await verifyRsaPss(receipt, structure, payloadText, cryptoRef);
  if (stableStringify(receipt) !== before) throw new Error('Receipt verification mutated the supplied evidence.');
  const canonical = JSON.parse(stableStringify(receipt)); assertJsonSafe(canonical, REVISION_COMPARE_TRUST_RECEIPT_SCHEMA);
  return deepFreeze(canonical);
}

export async function verifyRevisionCompareTrustReceiptJson(text, report, cryptoRef) {
  let value; try { value = JSON.parse(String(text)); } catch { throw new TypeError('External signature receipt JSON is invalid.'); }
  return verifyRevisionCompareTrustReceipt(value, report, cryptoRef);
}

export function createRevisionCompareTrustReceiptState() {
  return deepFreeze({
    schema: REVISION_COMPARE_TRUST_STATE_SCHEMA, status: REVISION_COMPARE_TRUST_STATUS.IDLE,
    requestGeneration: 0, fileName: '', receipt: null, receiptId: null, contentSha256: null,
    publicKeySha256: null, cryptographicStatus: 'NOT_VERIFIED', identityStatus: 'EXTERNALLY_ASSERTED',
    trustStatus: 'NOT_ESTABLISHED', error: null,
  });
}

export function reconcileRevisionCompareTrustReceiptState(state, signOff) {
  const current = state ?? createRevisionCompareTrustReceiptState();
  if (!current.receipt) return current;
  const report = signOff?.report;
  if (!report || current.receipt.subject.signOffReportId !== report.reportId) return createRevisionCompareTrustReceiptState();
  const status = signOff.status === 'CREATED'
    ? REVISION_COMPARE_TRUST_STATUS.VERIFIED_CURRENT : REVISION_COMPARE_TRUST_STATUS.VERIFIED_HISTORICAL;
  return deepFreeze({ ...current, status, cryptographicStatus: 'VALID', error: null });
}

function appendText(documentRef, parent, tag, text, selector = null) {
  const node = documentRef.createElement(tag); node.textContent = String(text ?? '');
  if (selector) node.setAttribute(selector, ''); parent.appendChild(node); return node;
}

function appendFact(documentRef, facts, label, value, selector) {
  appendText(documentRef, facts, 'dt', label); appendText(documentRef, facts, 'dd', value, selector);
}

export function renderRevisionCompareTrustReceiptSection(root, state) {
  const host = root.querySelector('.revc-review-side'); if (!host) return null;
  const documentRef = root.ownerDocument; const lifecycle = state.trustReceipt ?? createRevisionCompareTrustReceiptState();
  const section = documentRef.createElement('section'); section.className = 'revc-review-session';
  section.setAttribute('data-revc-trust-status', lifecycle.status.toLowerCase());
  appendText(documentRef, section, 'h2', 'External signature verification');
  const report = state.signOff?.report;
  if (report) {
    const target = documentRef.createElement('dl');
    appendFact(documentRef, target, 'Target report ID', report.reportId, 'data-revc-trust-target-report-id');
    appendFact(documentRef, target, 'Target report SHA-256', report.contentSha256, 'data-revc-trust-target-report-sha');
    section.appendChild(target);
  }
  const label = appendText(documentRef, section, 'label', 'Import external signature receipt');
  const input = documentRef.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
  input.setAttribute('data-revc-trust-import', ''); input.disabled = !report; label.appendChild(input);
  if (!report) appendText(documentRef, section, 'p', 'Create or retain a completion report before importing an external signature receipt.');
  if (lifecycle.error) appendText(documentRef, section, 'p', lifecycle.error, 'data-revc-trust-error');
  if (lifecycle.receipt) {
    const receipt = lifecycle.receipt; const facts = documentRef.createElement('dl');
    appendFact(documentRef, facts, 'Receipt ID', receipt.receiptId, 'data-revc-trust-receipt-id');
    appendFact(documentRef, facts, 'Receipt SHA-256', receipt.contentSha256, 'data-revc-trust-receipt-sha');
    appendFact(documentRef, facts, 'Sign-off report ID', receipt.subject.signOffReportId, 'data-revc-trust-sign-off-id');
    appendFact(documentRef, facts, 'Sign-off report SHA-256', receipt.subject.signOffContentSha256, 'data-revc-trust-sign-off-sha');
    appendFact(documentRef, facts, 'Evidence-package ID', receipt.subject.evidencePackageId, 'data-revc-trust-package-id');
    appendFact(documentRef, facts, 'Public-key SHA-256', receipt.signature.publicKeySha256, 'data-revc-trust-public-key-sha');
    appendFact(documentRef, facts, 'Algorithm', receipt.signature.algorithm, 'data-revc-trust-algorithm');
    appendFact(documentRef, facts, 'External signer claim', `${receipt.signerClaim.displayName} · ${receipt.signerClaim.role}`, 'data-revc-trust-signer-claim');
    appendFact(documentRef, facts, 'Organization claim', receipt.signerClaim.organization ?? '—');
    appendFact(documentRef, facts, 'Issuer claim', receipt.signerClaim.issuer ?? '—');
    appendFact(documentRef, facts, 'Key ID claim', receipt.signerClaim.keyId);
    appendFact(documentRef, facts, 'Signed at', receipt.signature.signedAt, 'data-revc-trust-signed-at');
    appendFact(documentRef, facts, 'Cryptographic result', 'VALID', 'data-revc-trust-cryptographic-result');
    const relationship = state.signOff?.status === 'CREATED' && report?.reportId === receipt.subject.signOffReportId ? 'CURRENT' : 'HISTORICAL';
    appendFact(documentRef, facts, 'Relationship', relationship, 'data-revc-trust-relationship');
    section.appendChild(facts); appendText(documentRef, section, 'p', REVISION_COMPARE_TRUST_STATEMENT, 'data-revc-trust-boundary');
  }
  host.appendChild(section); return section;
}
