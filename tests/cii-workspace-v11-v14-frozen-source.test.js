import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ciiBytesEqual,
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

const bridge = readFileSync(`${ROOT}/tabs/cii-workspace/cii-workspace-writer-version-bridge.js`, 'utf8');
assert.match(bridge, /ca8d391ac5f829f53bebb3c37adf0547c34a67b4/);
assert.match(bridge, /BASELINE_ROUNDTRIP_NOT_EXACT/);
assert.match(bridge, /MODIFIED_ROUNDTRIP_NOT_EXACT/);
assert.doesNotMatch(bridge, /allowLossy\s*:\s*true/);

const v11 = '#$ VERSION\n        5.00000      11.0000    1252\n#$ CONTROL\n';
const v14 = '#$ VERSION\r\n    5.00000      14.0000        1256\r\n#$ CONTROL\r\n';
assert.equal(detectCiiNeutralVersion(v11), 11);
assert.equal(detectCiiNeutralVersion(v14), 14);
assert.equal(ciiBytesEqual(v11, new TextEncoder().encode(v11)), true);
assert.throws(() => detectCiiNeutralVersion('#$ VERSION\n  5.0 12.0\n'), /UNSUPPORTED_VERSION/);

console.log('CII Workspace frozen 3D_Converters v11/v14 source custody: PASS');
