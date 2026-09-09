import assert from 'node:assert/strict';
import { _test as uiTest } from '../tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js';

function networkSuggestion(sourceNodeId, targetNodeId, confidence = 'HIGH', overrides = {}) {
  return {
    sourceNodeId: String(sourceNodeId),
    targetNodeId: String(targetNodeId),
    confidence,
    basisMethod: 'METHOD_B_NETWORK',
    winnerGap: 20,
    score: 90,
    methodB: { status: 'READY' },
    methodBWeight: { total: 80 },
    candidateGeneration: { mutualBest: true },
    ...overrides,
  };
}

const inspection = {
  memberInspections: [
    {
      sourceId: 'S1',
      inspection: { baseAnchorSuggestions: [networkSuggestion(10, 1010)] },
    },
    {
      sourceId: 'S2',
      inspection: {
        baseAnchorSuggestions: [
          networkSuggestion(20, 2020),
          networkSuggestion(21, 2021),
        ],
      },
    },
    {
      sourceId: 'S3',
      inspection: { baseAnchorSuggestions: [networkSuggestion(30, 3030, 'REVIEW')] },
    },
  ],
};

const seed = uiTest.buildAutomaticBaseSeed(inspection);
assert.deepEqual(seed.readySourceIds, ['S1']);
assert.deepEqual(seed.unresolvedSourceIds, ['S2', 'S3']);
assert.deepEqual(seed.selectionKeysBySource.S1, ['10=>1010']);
assert.deepEqual(seed.selectionKeysBySource.S2, []);
assert.deepEqual(seed.selectionKeysBySource.S3, []);
assert.equal(seed.choicesBySource.S1.status, 'READY');
assert.equal(seed.choicesBySource.S2.status, 'AMBIGUOUS');
assert.equal(seed.choicesBySource.S3.status, 'REVIEW_REQUIRED');

const retainedReady = {
  memberInspections: ['S1', 'S2', 'S3'].map((sourceId, index) => ({
    sourceId,
    inspection: { baseAnchorSuggestions: [networkSuggestion(index + 1, 1000 + index + 1, index === 1 ? 'HIGH' : 'MEDIUM')] },
  })),
};
const retainedSeed = uiTest.buildAutomaticBaseSeed(retainedReady);
assert.deepEqual(retainedSeed.readySourceIds, ['S1', 'S2', 'S3']);
assert.deepEqual(retainedSeed.unresolvedSourceIds, []);
assert.deepEqual(retainedSeed.selectionKeysBySource, {
  S1: ['1=>1001'],
  S2: ['2=>1002'],
  S3: ['3=>1003'],
});

console.log('CII Writer2 multi-source Auto Anchor UI seeding checks: PASS');
