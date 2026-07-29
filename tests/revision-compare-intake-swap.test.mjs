import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createInlineRevisionWorkerClient } from '../tabs/revision-compare/revision-intake-worker-client.js';
import { createRevisionLoadService } from '../tabs/revision-compare/revision-load-service.js';
import {
  createRevisionWorkspaceState,
  finishWorkspaceLoad,
  setWorkspaceBasis,
  startWorkspaceLoad,
} from '../tabs/revision-compare/revision-workspace-state.js';
import {
  applyRevisionCompareSwapResults,
  revisionCompareSwapReadiness,
} from '../tabs/revision-compare/revision-compare-intake-swap.js';

const NOW = '2026-07-29T10:45:00.000Z';
const staged = (name, x) => JSON.stringify([{
  name,
  children: [{ id: `${name}-1`, position: [x, 0, 0] }],
}]);

function attach(state, slotId, result) {
  const loading = startWorkspaceLoad(
    state,
    slotId,
    result.generation,
    result.document.fileName,
    result.document.fileSizeBytes,
    NOW,
  );
  return finishWorkspaceLoad(loading, slotId, result, NOW);
}

function componentId(result) {
  return result.jsonSnapshot.entityIndex.find((entry) => entry.entityKind === 'COMPONENT').entityId;
}

function assertRoles(result, slotId, role, side, marker) {
  assert.equal(result.document.slotId, slotId);
  assert.equal(result.document.role, role);
  assert.equal(result.jsonSnapshot.side, side);
  assert.equal(result.jsonSnapshot.parsedValue[0].name, marker);
  assert.match(componentId(result), new RegExp(`^record:${side === 'REV_A' ? 'A' : 'B'}:${slotId}:`));
}

async function main() {
  const service = createRevisionLoadService(webcrypto, {
    clientFactory: () => createInlineRevisionWorkerClient({ cryptoRef: webcrypto }),
  });
  const originalA = await service.loadText('baseline', 'A.json', staged('A', 0), NOW);
  const originalB = await service.loadText('candidate', 'B.json', staged('B', 1), NOW);
  let state = createRevisionWorkspaceState('swap-session', NOW);
  state = attach(state, 'baseline', originalA);
  state = attach(state, 'candidate', originalB);
  state = setWorkspaceBasis(state, Object.freeze({ basisId: 'before-swap' }));

  assert.equal(revisionCompareSwapReadiness(state).status, 'READY');
  const swapped = service.swapLoadedSlots();
  assert.equal(swapped.baseline.document.sourceHash, originalB.document.sourceHash);
  assert.equal(swapped.candidate.document.sourceHash, originalA.document.sourceHash);
  assertRoles(swapped.baseline, 'baseline', 'REFERENCE', 'REV_A', 'B');
  assertRoles(swapped.candidate, 'candidate', 'CANDIDATE', 'REV_B', 'A');

  const scopeA = await service.applyScope('baseline', { selectedIds: ['branch:B'] }, NOW);
  const scopeB = await service.applyScope('candidate', { selectedIds: ['branch:A'] }, NOW);
  assert.deepEqual(scopeA.scopeResult.selectedBranchIds, ['branch:B']);
  assert.deepEqual(scopeB.scopeResult.selectedBranchIds, ['branch:A']);

  state = applyRevisionCompareSwapResults(state, swapped, NOW);
  assert.equal(state.slots.baseline.document.sourceHash, originalB.document.sourceHash);
  assert.equal(state.slots.candidate.document.sourceHash, originalA.document.sourceHash);
  assert.equal(state.proposal, null);
  assert.deepEqual(state.scopeDecisions, {});
  assert.equal(state.basisStatus, 'STALE');

  const restored = service.swapLoadedSlots();
  assert.equal(restored.baseline.document.sourceHash, originalA.document.sourceHash);
  assert.deepEqual(
    (await service.applyScope('baseline', { selectedIds: ['branch:A'] }, NOW)).scopeResult.selectedBranchIds,
    ['branch:A'],
  );

  const imported = Object.freeze({
    ...state,
    evidencePackageImport: Object.freeze({ ...state.evidencePackageImport, status: 'VERIFIED' }),
  });
  assert.equal(revisionCompareSwapReadiness(imported).status, 'BLOCKED');
  service.dispose();
  console.log('revision-compare-intake-swap: PASS');
}

await main();
