import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPsFamilyClashBenchmark } from '../tabs/ps-family-clash-audit/ps-family-default-clash-benchmark.js';

test('default PS-14396 benchmark separates family, chain and member-terminal accuracy', () => {
  const result = buildDefaultPsFamilyClashBenchmark();
  assert.equal(result.source.structuralClashCount, 2);
  assert.equal(result.source.supportChainClashCount, 3);
  assert.equal(result.strict.standard.structural.precision, 1);
  assert.equal(result.strict.standard.structural.recall, 1);
  assert.equal(result.strict.explicitReferenceChainMetrics.recall, 1);
  assert.equal(result.strict.analyticalChainMetrics.recall, 0);
  assert.equal(result.strict.memberTerminalMetrics.recall, 0);
  assert.equal(result.clashImprintedControl.analyticalChainMetrics.recall, 1);
  assert.equal(result.clashImprintedControl.memberTerminalMetrics.precision, 1);
  assert.equal(result.clashImprintedControl.memberTerminalMetrics.recall, 1);
  assert.equal(result.clashImprintedControl.analyticalStructuralTerminalCount, 2);
  assert.ok(!result.gaps.some((row) => row.code === 'STRUCTURAL_TERMINAL_ENGINE_SELECTS_ONE_NEAREST_MEMBER'));
});
