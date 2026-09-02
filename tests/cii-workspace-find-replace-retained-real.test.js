import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { resolveFindReplaceScope } from '../tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js';
import { validateFindReplacePreimage } from '../tabs/cii-workspace/cii-workspace-find-replace-validator.js';

const source3 = fs.readFileSync(
  new URL('../Benchmark/CIICompare/SOURCE 3.CII', import.meta.url),
  'utf8',
);

test('retained SOURCE 3 binds exact element and its single displacement block', () => {
  const element = resolveFindReplaceScope(source3, {
    scope: 'ELEMENT',
    from: 15440,
    to: 15450,
  });
  assert.equal(element.status, 'PASS');
  assert.equal(element.spans.length, 15);
  assert.deepEqual(
    { from: element.evidence.from, to: element.evidence.to, rowCount: element.evidence.rowCount },
    { from: 15440, to: 15450, rowCount: 15 },
  );

  const displacement = resolveFindReplaceScope(source3, {
    scope: 'BLOCK',
    block: 'DISPLACEMENT',
    from: 15440,
    to: 15450,
  });
  assert.equal(displacement.status, 'PASS');
  assert.equal(displacement.evidence.pointer, 1);
  assert.equal(displacement.evidence.rowCount, 20);
  assert.equal(displacement.spans.length, 20);

  const firstNode = source3.slice(displacement.spans[0].start, displacement.spans[0].end).trim();
  const secondNode = source3.slice(displacement.spans[10].start, displacement.spans[10].end).trim();
  assert.equal(firstNode, '15450.0');
  assert.equal(secondNode, '0.000000');
});

test('retained SOURCE 3 displacement replacement produces one owned claim', () => {
  const validation = validateFindReplacePreimage(source3, [{
    scope: 'BLOCK',
    block: 'DISPLACEMENT',
    from: 15440,
    to: 15450,
    findText: '-20.0000',
    replaceText: '-21.0000',
    expectedMatches: 1,
    status: 'APPROVED',
  }]);
  assert.equal(validation.status, 'PASS');
  assert.equal(validation.claims.length, 1);
  assert.equal(validation.claims[0].block, 'DISPLACEMENT');
});

test('retained SOURCE 3 adjacent element without displacement pointer fails closed', () => {
  const resolved = resolveFindReplaceScope(source3, {
    scope: 'BLOCK',
    block: 'DISPLACEMENT',
    from: 15430,
    to: 15440,
  });
  assert.equal(resolved.status, 'BLOCKED');
  assert.ok(resolved.blockers.includes('DISPLMNT_POINTER_REQUIRED:15430:15440'));
});

test('retained SOURCE 3 FORCE remains blocked because section authority is not qualified', () => {
  const resolved = resolveFindReplaceScope(source3, {
    scope: 'BLOCK',
    block: 'FORCE',
    from: 15440,
    to: 15450,
  });
  assert.equal(resolved.status, 'BLOCKED');
  assert.equal(resolved.spans.length, 0);
  assert.ok(resolved.blockers.includes('FORCMNT_BLOCK_AUTHORITY_NOT_QUALIFIED'));
});
