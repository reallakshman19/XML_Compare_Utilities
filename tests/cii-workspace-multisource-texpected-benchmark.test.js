import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  deriveExactNameRelocations,
  deriveExpectedNodeNameDelta,
  expectedTransferKeys,
} from './cii-workspace-multisource-texpected-oracle.js';

const targetPath = fileURLToPath(new URL('../Benchmark/T.CII', import.meta.url));
const expectedPath = fileURLToPath(new URL('../Benchmark/TEXPECTED-PARTIALLLYDONE.CII', import.meta.url));
const targetText = readFileSync(targetPath, 'latin1');
const expectedText = readFileSync(expectedPath, 'latin1');
const delta = deriveExpectedNodeNameDelta(targetText, expectedText);
const keys = expectedTransferKeys(delta.rows);
const relocations = deriveExactNameRelocations(delta.rows);
const byAction = Object.fromEntries(['CREATE', 'DELETE', 'REPLACE'].map((action) => [
  action, delta.rows.filter((row) => row.action === action).length,
]));
const keySha256 = createHash('sha256').update(`${keys.join('\n')}\n`, 'utf8').digest('hex');
const ownerCheckpointPairs = [
  ['8870', '9040'],
  ['10350', '10190'],
  ['1005', '925'],
];
const checkpointEvidence = ownerCheckpointPairs.map(([fromNodeId, toNodeId]) => ({
  fromNodeId,
  toNodeId,
  exactNameRelocation: relocations.find((row) => row.fromNodeId === fromNodeId && row.toNodeId === toNodeId) || null,
}));

assert.equal(delta.before.conflicts.length, 0, 'TARGET0 NODENAME ownership must be independently conflict-free');
assert.equal(delta.expected.conflicts.length, 0, 'TEXPECTED NODENAME ownership must be independently conflict-free');
assert.equal(delta.before.controlNodeNameCount, delta.before.physicalNodeNameRowCount,
  'TARGET0 CONTROL.NONAM must equal physical NODENAME row count');
assert.equal(delta.expected.controlNodeNameCount, delta.expected.physicalNodeNameRowCount,
  'TEXPECTED CONTROL.NONAM must equal physical NODENAME row count');
assert.equal(byAction.REPLACE, 0,
  'retained Writer2 benchmark must not require same-node/same-cardinality NODENAME overwrite authority');
assert(keys.length > 0, 'T to TEXPECTED must derive a non-empty cardinality transfer set');
assert.equal(new Set(keys).size, keys.length, 'independent expected Transfer operation keys must be unique');

console.log(JSON.stringify({
  benchmark: 'T.CII -> TEXPECTED-PARTIALLLYDONE.CII',
  controlNodeNameCountBefore: delta.before.controlNodeNameCount,
  controlNodeNameCountExpected: delta.expected.controlNodeNameCount,
  physicalNodeNameRowsBefore: delta.before.physicalNodeNameRowCount,
  physicalNodeNameRowsExpected: delta.expected.physicalNodeNameRowCount,
  expectedNodeNameDeltaCount: delta.rows.length,
  expectedTransferApplyRowCount: keys.length,
  byAction,
  uniqueExactRelocationCount: relocations.length,
  expectedTransferKeySha256: keySha256,
  ownerCheckpointEvidence: checkpointEvidence,
}, null, 2));

console.log('CII retained-real TEXPECTED independent benchmark oracle checks passed.');
