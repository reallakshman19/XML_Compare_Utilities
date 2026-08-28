import assert from 'node:assert/strict';
import { _test as nodenameWriteTest } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-write.js';

const lexicalI13 = /^[+-]?\d+$/;

for (const value of [0, 1, 5, 42, 999999]) {
  const field = nodenameWriteTest.numericField(value, 13, `TEST_NODENAME_POINTER:${value}`);
  const token = field.trim();
  assert.match(token, lexicalI13, `NODENAME ELEMENT pointer ${value} must be lexical I13, received ${JSON.stringify(token)}`);
  assert.equal(Number(token), value);
}

console.log('Writer2 NODENAME ELEMENT pointer lexical I13 authority: PASS');
