import assert from 'node:assert/strict';
import { ciiWriter2RootBlockers } from '../tabs/cii-workspace/cii-workspace-multisource-writer2-readiness.js';

// A per-source correspondence failure is the actionable root. Scope/hash/no-mutation blockers are downstream consequences.
{
  const roots = ciiWriter2RootBlockers([
    'S1:CORRESPONDENCE_NOT_READY',
    'MULTISOURCE_CORRESPONDENCE_NOT_READY',
    'CII_MS_WRITER2_BOUND_SCOPE_REQUIRED',
    'CII_MS_WRITER2_SCOPE_SOURCE_SET_HASH_MISMATCH',
    'CII_MS_WRITER2_SCOPE_TARGET_HASH_MISMATCH',
    'CII_MS_WRITER2_TRANSFER_PLAN_NOT_PREVIEW_READY',
    'CII_MS_WRITER2_NO_EXPECTED_NODENAME_MUTATIONS',
  ]);
  assert.deepEqual(roots, ['S1:CORRESPONDENCE_NOT_READY']);
}

// Once correspondence is ready, an unbound transfer scope is the next actionable blocker; undefined-scope hashes are not peers.
{
  const roots = ciiWriter2RootBlockers([
    'CII_MS_WRITER2_BOUND_SCOPE_REQUIRED',
    'CII_MS_WRITER2_SCOPE_SOURCE_SET_HASH_MISMATCH',
    'CII_MS_WRITER2_SCOPE_TARGET_HASH_MISMATCH',
    'CII_MS_WRITER2_NO_EXPECTED_NODENAME_MUTATIONS',
  ]);
  assert.deepEqual(roots, ['CII_MS_WRITER2_BOUND_SCOPE_REQUIRED']);
}

// Real custody mismatch stays visible before scope symptoms.
{
  const roots = ciiWriter2RootBlockers([
    'CII_MS_WRITER2_ORIGINAL_TARGET_HASH_MISMATCH',
    'CII_MS_WRITER2_BOUND_SCOPE_REQUIRED',
    'CII_MS_WRITER2_SCOPE_TARGET_HASH_MISMATCH',
  ]);
  assert.deepEqual(roots, ['CII_MS_WRITER2_ORIGINAL_TARGET_HASH_MISMATCH']);
}

// Mutation conflicts are root causes and must never be collapsed into generic scope/readiness text.
{
  const roots = ciiWriter2RootBlockers([
    'CII_MS_WRITER2_PHYSICAL_MUTATION_CONFLICT:TARGET:op1,op2',
    'CII_MS_WRITER2_TRANSFER_PLAN_NOT_PREVIEW_READY',
  ]);
  assert.deepEqual(roots, ['CII_MS_WRITER2_PHYSICAL_MUTATION_CONFLICT:TARGET:op1,op2']);
}

console.log('CII Writer2 root-blocker projection checks passed.');
