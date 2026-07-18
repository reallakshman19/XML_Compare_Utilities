import assert from 'node:assert/strict';
import {
  cancelComparisonState, createComparisonLifecycleState, progressComparisonState, startComparisonState,
} from '../tabs/revision-compare/revision-compare-lifecycle.js';
import {
  cancelWorkspaceComparison, createRevisionWorkspaceState, progressWorkspaceComparison, startWorkspaceComparison,
} from '../tabs/revision-compare/revision-workspace-state.js';

const token = Object.freeze({ generation: 4, runId: 'run:4:basis:test' });
const lateProgress = Object.freeze({
  stage: 'Projecting Rev B scope', recordsProcessed: 0,
  candidatePairsEvaluated: 0, maximumCandidatesForOneRecord: 0,
});

let lifecycle = startComparisonState(createComparisonLifecycleState(), token);
lifecycle = cancelComparisonState(lifecycle);
assert.equal(lifecycle.status, 'CANCELLED');
assert.equal(lifecycle.runGeneration, token.generation + 1);
assert.equal(progressComparisonState(lifecycle, token, lateProgress), lifecycle,
  'late projection progress must not revive a cancelled lifecycle');

let workspace = createRevisionWorkspaceState('session:cancel-race', '2026-07-18T10:50:00.000Z');
workspace = startWorkspaceComparison(workspace, token);
workspace = cancelWorkspaceComparison(workspace);
const afterLateProgress = progressWorkspaceComparison(workspace, token, lateProgress);
assert.equal(afterLateProgress, workspace, 'stale projection progress must not mutate workspace state');
assert.equal(afterLateProgress.compare.status, 'CANCELLED');
assert.equal(afterLateProgress.message, 'Visual comparison cancelled.');

console.log('revision-compare-rc002-owner-fixes.test.mjs passed');
