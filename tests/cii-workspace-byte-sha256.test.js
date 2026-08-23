import assert from 'node:assert/strict';
import { isCiiSha256Hex, sha256CiiByteString } from '../tabs/cii-workspace/cii-workspace-byte-sha256.js';
import { _test as writerTest } from '../tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js';
import { _test as validatorTest } from '../tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js';

const vectors = Object.freeze([
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['The quick brown fox jumps over the lazy dog', 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'],
]);

for (const [input, expected] of vectors) {
  assert.equal(sha256CiiByteString(input), expected);
  assert.equal(isCiiSha256Hex(expected), true);
}

assert.equal(isCiiSha256Hex('ABC'), false);
assert.equal(isCiiSha256Hex('0'.repeat(63)), false);
assert.throws(() => sha256CiiByteString('\u20ac'), /CII_WORKSPACE_SHA256_NON_BYTE_CODE_UNIT/);

const canonicalBytes = 'abc';
const canonicalSha = sha256CiiByteString(canonicalBytes);
function target0(bytes = canonicalBytes, declaredSha = canonicalSha, physicalByteLength = bytes.length, documentByteLength = null) {
  const document = {
    contentSha256: declaredSha,
    physicalFile: Object.freeze({ originalByteString: bytes, byteLength: physicalByteLength }),
  };
  if (documentByteLength != null) document.byteLength = documentByteLength;
  return Object.freeze(document);
}
function transferPlan(targetSha) {
  return Object.freeze({
    targetDocument: Object.freeze({ contentSha256: targetSha }),
    transferScope: Object.freeze({ targetSha256: targetSha }),
  });
}
const expectedCustody = Object.freeze({ authority: 'SHA256_ORIGINAL_TARGET0_BYTES', contentSha256: canonicalSha, byteLength: canonicalBytes.length });
assert.deepEqual(writerTest.assertTarget0HashCustody(target0(), Object.freeze({ targetSha256: canonicalSha })), expectedCustody);
assert.deepEqual(validatorTest.independentlyValidateTarget0HashCustody(target0(), transferPlan(canonicalSha)), expectedCustody);

// F40: caller forges all declared TARGET hashes consistently, but they do not match TARGET0 bytes.
{
  const forgedSha = '0'.repeat(64); const forged = target0(canonicalBytes, forgedSha);
  assert.throws(() => writerTest.assertTarget0HashCustody(forged, Object.freeze({ targetSha256: forgedSha })), /TARGET0_SHA256_MISMATCH/);
  assert.throws(() => validatorTest.independentlyValidateTarget0HashCustody(forged, transferPlan(forgedSha)), /TARGET0_SHA256_MISMATCH/);
}
// F41: physical TARGET0 bytes drift while the originally valid digest remains declared.
{
  const stale = target0('abd', canonicalSha);
  assert.throws(() => writerTest.assertTarget0HashCustody(stale, Object.freeze({ targetSha256: canonicalSha })), /TARGET0_SHA256_MISMATCH/);
  assert.throws(() => validatorTest.independentlyValidateTarget0HashCustody(stale, transferPlan(canonicalSha)), /TARGET0_SHA256_MISMATCH/);
}
// F42: non-SHA placeholder labels are not cryptographic custody.
{
  const malformed = target0(canonicalBytes, 'target-sha');
  assert.throws(() => writerTest.assertTarget0HashCustody(malformed, Object.freeze({ targetSha256: 'target-sha' })), /TARGET0_SHA256_FORMAT_REQUIRED/);
  assert.throws(() => validatorTest.independentlyValidateTarget0HashCustody(malformed, transferPlan('target-sha')), /TARGET0_SHA256_FORMAT_REQUIRED/);
}
// F43: physical byte-length testimony must equal the untouched byte string.
{
  const wrongLength = target0(canonicalBytes, canonicalSha, 2);
  assert.throws(() => writerTest.assertTarget0HashCustody(wrongLength, Object.freeze({ targetSha256: canonicalSha })), /TARGET0_BYTE_LENGTH_MISMATCH/);
  assert.throws(() => validatorTest.independentlyValidateTarget0HashCustody(wrongLength, transferPlan(canonicalSha)), /TARGET0_BYTE_LENGTH_MISMATCH/);
}
// F44: document-level byte-length testimony, when present, must also bind TARGET0.
{
  const wrongLength = target0(canonicalBytes, canonicalSha, canonicalBytes.length, 4);
  assert.throws(() => writerTest.assertTarget0HashCustody(wrongLength, Object.freeze({ targetSha256: canonicalSha })), /TARGET0_DOCUMENT_BYTE_LENGTH_MISMATCH/);
  assert.throws(() => validatorTest.independentlyValidateTarget0HashCustody(wrongLength, transferPlan(canonicalSha)), /TARGET0_DOCUMENT_BYTE_LENGTH_MISMATCH/);
}

console.log('CII SHA-256 primitive and Writer2 partial-HANGER TARGET0 cryptographic custody falsifiers F40-F44 authored.');
