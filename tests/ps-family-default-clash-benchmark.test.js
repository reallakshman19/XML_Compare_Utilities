import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPsFamilyClashMemberBenchmark } from '../tabs/ps-family-clash-audit/ps-family-default-clash-member-benchmark.js';

test('default PS-14396 benchmark separates family, chain and member-terminal accuracy', () => {
  const result = buildDefaultPsFamilyClashMemberBenchmark();
  assert.equal(result.source.structuralRows.length, 2);
  assert.equal(result.source.supportChainRows.length, 3);
  assert.equal(result.strict.familyStructuralMetrics.precision, 1);
  assert.equal(result.strict.familyStructuralMetrics.recall, 1);
  assert.equal(result.strict.explicitReferenceChainMetrics.recall, 1);
  assert.equal(result.strict.analyticalChainMetrics.recall, 0);
  assert.equal(result.strict.memberTerminalMetrics.recall, 0);
  assert.equal(result.clashImprintedControl.analyticalChainMetrics.recall, 1);
  assert.equal(result.clashImprintedControl.memberTerminalMetrics.precision, 1);
  assert.equal(result.clashImprintedControl.memberTerminalMetrics.recall, 1);
  assert.equal(result.clashImprintedControl.analyticalStructuralTerminalCount, 2);
  assert.equal(result.clashImprintedControl.structuralTerminalEvaluationSchema, 'SupportStructuralTerminalMultiContact.v1');
  assert.ok(!result.gaps.some((row) => row.code === 'STRUCTURAL_TERMINAL_ENGINE_MISSES_IN_CONTACT_MEMBER'));
});
