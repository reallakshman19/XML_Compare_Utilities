import assert from 'node:assert/strict';
import { isCiiSha256Hex, sha256CiiByteString } from '../tabs/cii-workspace/cii-workspace-byte-sha256.js';

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

console.log('CII byte-string SHA-256 matches standard vectors and rejects non-byte input.');
