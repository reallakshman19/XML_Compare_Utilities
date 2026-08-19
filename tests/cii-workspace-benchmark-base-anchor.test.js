import assert from 'assert';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { inspectCiiWorkspaceModels } from '../tabs/cii-workspace/cii-workspace-core.js';

async function text(relative) { return readFile(new URL(relative, import.meta.url), 'utf8'); }

const [sourceText, target1Text, target2Text] = await Promise.all([
  text('../Benchmark/CIICompare/BM_CII_SOURCE.CII'),
  text('../Benchmark/CIICompare/BM_CII_TARGET1.CII'),
  text('../Benchmark/CIICompare/BM_CII_TARGET2.CII'),
]);

async function inspect(targetText, targetFileName) {
  return inspectCiiWorkspaceModels({
    sourceText,
    sourceFileName: 'BM_CII_SOURCE.CII',
    targetText,
    targetFileName,
  }, { cryptoRef: webcrypto });
}

const target1 = await inspect(target1Text, 'BM_CII_TARGET1.CII');
const target2 = await inspect(target2Text, 'BM_CII_TARGET2.CII');

const pair1 = target1.baseAnchorSuggestions.find((row) => row.sourceNodeId === '70' && row.targetNodeId === '20070');
const pair2 = target2.baseAnchorSuggestions.find((row) => row.sourceNodeId === '70' && row.targetNodeId === '10070');
assert(pair1, 'TARGET1 must expose the reviewed 70 ↔ 20070 base-anchor candidate');
assert(pair2, 'TARGET2 must expose the reviewed 70 ↔ 10070 base-anchor candidate under the same structural policy');
for (const pair of [pair1, pair2]) {
  assert.strictEqual(pair.status, 'SUGGESTED');
  assert.strictEqual(pair.authority, 'EVIDENCE_ONLY_ENGINEER_ACCEPT_REQUIRED');
  assert.strictEqual(pair.reviewRequired, true);
  assert(pair.identityExclusions.includes('NODE_NUMBER_OFFSET_NOT_USED'));
  assert(pair.identityExclusions.includes('OD_NOT_IDENTITY_USED_AS_TOLERANCE_SCALE'));
  assert(pair.identityExclusions.includes('WALL_NOT_USED'));
  assert.strictEqual(pair.methodB.tolerancePolicy.factor, 2);
  assert.strictEqual(pair.methodB.tolerancePolicy.odAuthority, 'SOURCE');
  assert.notStrictEqual(pair.status, 'LOCKED');
}

console.log('CII real benchmark OD-scaled base-anchor suggestion checks passed.');
