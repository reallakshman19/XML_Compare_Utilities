import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ciiByteStringToBytes,
  ciiBytesEqual,
  ciiBytesToByteString,
  ciiSha256,
  detectCiiNeutralVersion,
} from '../tabs/cii-workspace/cii-workspace-v11-v14-converter.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FROZEN = `${ROOT}/converters/scripts/cii-v11-v14-upstream`;
const EXPECTED = Object.freeze({
  'cii_v11_v14.py': '6152f28c0c43b4d70029f360d993da5794310c8a',
  'cii_v11_v14_format.py': '56f59fb7e095a887fc84e8a008a5f40acbadaec5',
  'cii_v11_v14_records.py': '1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235',
  'cii_v11_v14_sif.py': '88c1d80bdb7bd2d5197a56c5be60ac2057c02367',
  'cii_v11_v14_validate.py': '8e6896e8b61ac3c90d579139d39b29a6ace1637c',
  'cii2019_section_rules.py': 'efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e',
});

function gitBlobSha(path) {
  const bytes = readFileSync(path);
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

for (const [fileName, expectedSha] of Object.entries(EXPECTED)) {
  assert.equal(gitBlobSha(`${FROZEN}/${fileName}`), expectedSha, `${fileName} must remain byte-identical to pinned 3D_Converters source`);
}

const localRulesSha = gitBlobSha(`${ROOT}/converters/scripts/cii2019_section_rules.py`);
assert.notEqual(localRulesSha, EXPECTED['cii2019_section_rules.py'], 'test requires dependency drift to remain explicit rather than silently sharing local rules');

const worker = readFileSync(`${ROOT}/converters/cii-v11-v14-writer-worker.js`, 'utf8');
assert.match(worker, /\.\/scripts\/cii-v11-v14-upstream\//);
assert.match(worker, /cii2019_section_rules\.py/);
assert.doesNotMatch(worker, /FROZEN_SCRIPT_ROOT\s*=\s*['"]\.\/scripts\/['"]/);
assert.match(worker, /FS\.unlink\(path\)/, 'worker must remove job files before removing the job directory');
assert.match(worker, /cleanupJobDir\(pyodide, jobDir, \[inputPath, outputPath, auditPath\]\)/);
assert.ok(
  worker.indexOf("if (!inputBytes.byteLength) throw new Error('Primary CII input is empty.');") < worker.indexOf('pyodide.FS.mkdirTree(jobDir);'),
  'empty input must be rejected before allocating a job directory',
);
assert.match(worker, /let jobQueue = Promise\.resolve\(\);/, 'shared Pyodide runtime must have an explicit serialization queue');
assert.match(worker, /jobQueue\.then\(\(\) => runJob\(message\)\)/, 'conversion jobs must execute through the serialization queue');
assert.match(worker, /jobQueue = current\.catch\(\(\) => undefined\)/, 'a failed conversion must not poison subsequent queued jobs');
assert.doesNotMatch(worker, /self\.addEventListener\('message', async \(event\)/, 'message handler must not directly overlap shared-runtime jobs');

const converter = readFileSync(`${ROOT}/tabs/cii-workspace/cii-workspace-v11-v14-converter.js`, 'utf8');
assert.match(converter, /frozen-3d-converters-6/, 'worker URL cache key must move with worker runtime semantics');
assert.match(converter, /const AUDIT_SCHEMA = 'cii-v11-v14-conversion-audit\/v1'/);
assert.match(converter, /CII_VERSION_BRIDGE_AUDIT_SCHEMA_MISMATCH/);
assert.match(converter, /CII_VERSION_BRIDGE_AUDIT_ARRAY_REQUIRED/);
assert.match(converter, /CII_VERSION_BRIDGE_SOURCE_BYTE_COUNT_AUDIT_MISMATCH/);
assert.match(converter, /CII_VERSION_BRIDGE_TARGET_BYTE_COUNT_AUDIT_MISMATCH/);
assert.match(converter, /function frozenAuditSnapshot\(value\)/);
assert.match(converter, /loss_events:\s*Object\.freeze/);
assert.match(converter, /warnings:\s*Object\.freeze/);
assert.match(converter, /changed_sections:\s*Object\.freeze/);
assert.match(converter, /result\.audit\.loss_events\.length/);
assert.match(converter, /CII_VERSION_BRIDGE_SOURCE_AUDIT_MISMATCH/);
assert.match(converter, /CII_VERSION_BRIDGE_TARGET_PHYSICAL_VERSION_MISMATCH/);
assert.match(converter, /CII_VERSION_BRIDGE_SOURCE_SHA256_AUDIT_MISMATCH/);
assert.match(converter, /CII_VERSION_BRIDGE_TARGET_SHA256_AUDIT_MISMATCH/);
assert.match(converter, /Math\.abs\(numeric - major\) > 1e-6/);
assert.match(converter, /addEventListener\('messageerror'/);
assert.match(converter, /resetWorker\(new Error\('CAESAR v11\/v14 worker message serialization failed\.'/);
assert.match(converter, /pending\.delete\(jobId\);\s*reject\(new Error\(`Failed to post CAESAR v11\/v14 conversion job:/s);

const bridge = readFileSync(`${ROOT}/tabs/cii-workspace/cii-workspace-writer-version-bridge.js`, 'utf8');
assert.match(bridge, /ca8d391ac5f829f53bebb3c37adf0547c34a67b4/);
assert.match(bridge, /ciiWorkspaceArtifactBundle/);
assert.match(bridge, /const audit = Object\.freeze\(\{ \.\.\.preview\.audit, versionBridge \}\)/);
assert.match(bridge, /result\.artifacts = ciiWorkspaceArtifactBundle\(result\)/);
assert.match(bridge, /originalSha256:\s*side\.sourceSha256/);
assert.match(bridge, /normalizedSha256:\s*side\.normalizedSha256/);
assert.match(bridge, /normalizedSha256:\s*down\.targetSha256/);
assert.match(bridge, /function assertNormalizedIntakeHashes\(result, source, target, context\)/);
assert.match(bridge, /CII_VERSION_BRIDGE_\$\{context\}_SOURCE_NORMALIZED_HASH_MISMATCH/);
assert.match(bridge, /CII_VERSION_BRIDGE_\$\{context\}_TARGET_NORMALIZED_HASH_MISMATCH/);
assert.match(bridge, /assertNormalizedIntakeHashes\(inspection, normalized\.source, normalized\.target, 'INSPECTION'\)/);
assert.match(bridge, /assertNormalizedIntakeHashes\(preview, normalized\.source, normalized\.target, 'PREVIEW'\)/);
assert.match(bridge, /CII_WRITER_2_STALE_NORMALIZED_V11_TARGET_HASH/);
assert.match(bridge, /BASELINE_ROUNDTRIP_NOT_EXACT/);
assert.match(bridge, /MODIFIED_ROUNDTRIP_NOT_EXACT/);
assert.match(bridge, /sourceSha256:\s*down\.sourceSha256/);
assert.match(bridge, /down\.sourceSha256 !== bridge\.target\.originalSha256/);
assert.match(bridge, /CII_VERSION_BRIDGE_V11_POSTIMAGE_BYTES_REQUIRED/);
assert.match(bridge, /ciiByteStringToBytes\(v11Result\.byteString\)/);
assert.match(bridge, /CII_VERSION_BRIDGE_V11_POSTIMAGE_SHA_MISMATCH/);
assert.match(bridge, /ciiBytesEqual\(v11PostimageBytes, proof\.outputBytes\)/);
assert.doesNotMatch(bridge, /convertCiiNeutralVersionLossless\(v11Result\.text/);
assert.doesNotMatch(bridge, /down\.audit\?\.source_sha256/);
assert.doesNotMatch(bridge, /allowLossy\s*:\s*true/);

const v11 = '#$ VERSION\n        5.00000      11.0000    1252\n#$ CONTROL\n';
const v14 = '#$ VERSION\r\n    5.00000      14.0000        1256\r\n#$ CONTROL\r\n';
assert.equal(detectCiiNeutralVersion(v11), 11);
assert.equal(detectCiiNeutralVersion(v14), 14);
assert.equal(ciiBytesEqual(v11, new TextEncoder().encode(v11)), true);
assert.throws(() => detectCiiNeutralVersion('#$ VERSION\n  5.0 12.0\n'), /UNSUPPORTED_VERSION/);
assert.throws(() => detectCiiNeutralVersion('#$ VERSION\n  5.0 11.4\n'), /UNSUPPORTED_VERSION/);

const expectedV11Sha = createHash('sha256').update(Buffer.from(v11, 'utf8')).digest('hex');
assert.equal(await ciiSha256(v11, webcrypto), expectedV11Sha, 'browser-style SHA custody must agree with independent Node SHA-256');

const binaryFixture = Uint8Array.from([0x00, 0x41, 0x7f, 0x80, 0xff]);
const binaryString = ciiBytesToByteString(binaryFixture);
assert.deepEqual([...ciiByteStringToBytes(binaryString)], [...binaryFixture], 'byteString conversion must preserve all 0x00..0xff bytes exactly');
assert.throws(() => ciiByteStringToBytes(String.fromCharCode(0x100)), /BYTE_STRING_INVALID/);

console.log('CII Workspace frozen 3D_Converters v11/v14 source custody: PASS');
