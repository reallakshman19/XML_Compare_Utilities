import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { _test as routerTest } from '../tabs/cii-workspace/cii-workspace-multisource-review-only-router.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
function fileLike(name, bytes) {
  return Object.freeze({
    name,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  });
}

const [s1, s2, s3, target] = await Promise.all([
  readFile(benchmark('S1.CII')),
  readFile(benchmark('S2.CII')),
  readFile(benchmark('S3.CII')),
  readFile(benchmark('T.CII')),
]);

const retained = await routerTest.classifyMultiSourceFiles([
  fileLike('renamed-third.CII', s3),
  fileLike('renamed-first.CII', s1),
  fileLike('renamed-second.CII', s2),
], fileLike('renamed-target.CII', target), cryptoRef);
assert.equal(retained.retained, true, 'exact retained bytes must delegate to the existing full Writer2 shell regardless of input order or file name');
assert.equal(retained.sourceBytes.length, 3);
assert.match(retained.targetSha256, /^[0-9a-f]{64}$/);

const wrongTarget = Buffer.from(target);
wrongTarget[0] ^= 1;
const reviewOnly = await routerTest.classifyMultiSourceFiles([
  fileLike('S1-any-name.CII', s1),
  fileLike('S2-any-name.CII', s2),
  fileLike('S3-any-name.CII', s3),
], fileLike('wrong-target.CII', wrongTarget), cryptoRef);
assert.equal(reviewOnly.retained, false, 'target custody drift must never enter retained Writer2 write mode');

const twoSource = await routerTest.classifyMultiSourceFiles([
  fileLike('alpha.CII', s1),
  fileLike('beta.CII', s2),
], fileLike('arbitrary-target.CII', target), cryptoRef);
assert.equal(twoSource.retained, false, 'generic 2-source input must route to REVIEW_ONLY');
assert.equal(routerTest.threePermutations(['a', 'b', 'c']).length, 6);
assert.deepEqual(routerTest.genericSources([fileLike('A.CII', s1), fileLike('B.CII', s2)], [s1, s2]).map((row) => row.sourceId), ['S1', 'S2']);

const waiting = routerTest.waitingMarkup({ auto: { ready: true } });
assert.match(waiting, /REVIEW ONLY/);
assert.match(waiting, /CII_MS_REVIEW_ONLY_WRITE_AUTHORITY_REQUIRED/);
assert.doesNotMatch(waiting, /data-ciiw-ms-apply/);
assert.doesNotMatch(waiting, /data-ciiw-ms-bind-expected/);

const routerSource = await readFile(new URL('../tabs/cii-workspace/cii-workspace-multisource-review-only-router.js', import.meta.url), 'utf8');
assert(routerSource.split('\n').length < 300, 'review-only router must remain below 300 lines');
assert(routerSource.includes("mountCiiWriter2MultiSourceShell"), 'exact retained route must still delegate to existing full Writer2 shell');
assert(!routerSource.includes('applyCiiWorkspaceTargetWriter2'), 'generic router must not import Writer2 apply');

console.log('CII Writer2 retained delegation + generic REVIEW_ONLY routing custody checks passed.');
