import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createProjectDocument } from '../tabs/revision-compare/revision-session-contracts.js';
import { createRevisionCompareJsonDocumentSnapshot } from '../tabs/revision-compare/revision-json-document.js';
import { _test as loadServiceTest } from '../tabs/revision-compare/revision-load-service.js';
import {
  createRevisionWorkspaceState,
  finishWorkspaceLoad,
  setWorkspaceBasis,
  setWorkspaceProposal,
  startWorkspaceLoad,
} from '../tabs/revision-compare/revision-workspace-state.js';
import {
  applyRevisionCompareSwapResults,
  revisionCompareSwapReadiness,
} from '../tabs/revision-compare/revision-compare-intake-swap.js';
import { _test as viewTest } from '../tabs/revision-compare/revision-compare-view.js';

const CREATED_AT = '2026-07-29T10:45:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const SCOPE_A = '1'.repeat(64);
const SCOPE_B = '2'.repeat(64);

function documentFor(slotId, role, name, sourceHash, scopedHash, marker) {
  return createProjectDocument({
    documentId: `${slotId}:${sourceHash.slice(0, 20)}`,
    slotId,
    role,
    fileName: name,
    fileSizeBytes: marker.length,
    sourceHash,
    scopedHash,
    stagedSchema: 'StagedJSON.v1',
    rootShape: 'ARRAY',
    unit: 'MM',
    verticalAxis: 'Z',
    coordinateFrame: 'WORLD',
    scope: {},
    createdAt: CREATED_AT,
    stats: {
      branchCount: 1,
      componentCount: 1,
      recordCount: 1,
      geometryEvidenceCount: 1,
      scanned: 1,
      matched: 1,
      filtered: 0,
    },
  });
}

async function resultFor(slotId, marker, sourceHash, scopedHash, generation) {
  const side = slotId === 'baseline' ? 'REV_A' : 'REV_B';
  const role = slotId === 'baseline' ? 'REFERENCE' : 'CANDIDATE';
  const document = documentFor(slotId, role, `${marker}.json`, sourceHash, scopedHash, marker);
  const jsonSnapshot = await createRevisionCompareJsonDocumentSnapshot({
    side,
    sourceDocumentId: document.documentId,
    sourceContentSha256: sourceHash,
    fileName: document.fileName,
    profile: document.stagedSchema,
    parsedValue: [{ name: marker, children: [{ id: `${marker}-1` }] }],
  }, webcrypto);
  return Object.freeze({
    generation,
    document,
    jsonSnapshot,
    branchTree: Object.freeze([{ branchId: marker }]),
    branchIndex: Object.freeze([{ branchId: marker, componentCount: 1, recordCount: 1, geometryEvidenceCount: 1 }]),
    branchIndexSummary: Object.freeze({ branchCount: 1, componentCount: 1, recordCount: 1, geometryEvidenceCount: 1 }),
    scopeResult: Object.freeze({ selectedBranchIds: Object.freeze([marker]), retainedBranchCount: 1, retainedComponentCount: 1, retainedRecordCount: 1, scopedHash }),
    warnings: Object.freeze([]),
    blockers: Object.freeze([]),
  });
}

function sourceFor(result) {
  return Object.freeze({
    generation: result.generation,
    fileName: result.document.fileName,
    fileSizeBytes: result.document.fileSizeBytes,
    sourceHash: result.document.sourceHash,
    rootShape: result.document.rootShape,
    metadata: Object.freeze({
      stagedSchema: result.document.stagedSchema,
      unit: result.document.unit,
      verticalAxis: result.document.verticalAxis,
      coordinateFrame: result.document.coordinateFrame,
    }),
    branchTree: result.branchTree,
    branchIndex: result.branchIndex,
    branchIndexSummary: result.branchIndexSummary,
    initialResult: result,
  });
}

function loadedWorkspace(resultA, resultB) {
  let state = createRevisionWorkspaceState('swap-session', CREATED_AT);
  state = startWorkspaceLoad(state, 'baseline', resultA.generation, resultA.document.fileName, resultA.document.fileSizeBytes, CREATED_AT);
  state = finishWorkspaceLoad(state, 'baseline', resultA, CREATED_AT);
  state = startWorkspaceLoad(state, 'candidate', resultB.generation, resultB.document.fileName, resultB.document.fileSizeBytes, CREATED_AT);
  state = finishWorkspaceLoad(state, 'candidate', resultB, CREATED_AT);
  state = setWorkspaceProposal(state, Object.freeze({ summary: Object.freeze({ includedBranchCountA: 1, includedBranchCountB: 1 }) }), Object.freeze({ retained: true }), CREATED_AT);
  return setWorkspaceBasis(state, Object.freeze({ basisId: 'basis-before-swap' }));
}

function componentId(result) {
  return result.jsonSnapshot.entityIndex.find((entry) => entry.entityKind === 'COMPONENT').entityId;
}

async function main() {
  const originalA = await resultFor('baseline', 'A', HASH_A, SCOPE_A, 1);
  const originalB = await resultFor('candidate', 'B', HASH_B, SCOPE_B, 1);
  const clientA = Object.freeze({ id: 'client-A' });
  const clientB = Object.freeze({ id: 'client-B' });
  const context = {
    disposed: false,
    clients: new Map([['baseline', clientA], ['candidate', clientB]]),
    generations: new Map([['baseline', 1], ['candidate', 1]]),
    sources: new Map([['baseline', sourceFor(originalA)], ['candidate', sourceFor(originalB)]]),
  };

  let state = loadedWorkspace(originalA, originalB);
  assert.equal(revisionCompareSwapReadiness(state).status, 'READY');
  assert.match(viewTest.swapControl(state), /data-revc-swap-revisions/);
  assert.doesNotMatch(viewTest.swapControl(state), /data-revc-swap-revisions disabled/);

  const swapped = loadServiceTest.swapLoadedSlots(context);
  assert.equal(context.clients.get('baseline'), clientB);
  assert.equal(context.clients.get('candidate'), clientA);
  assert.equal(swapped.baseline.document.sourceHash, HASH_B);
  assert.equal(swapped.candidate.document.sourceHash, HASH_A);
  assert.equal(swapped.baseline.document.slotId, 'baseline');
  assert.equal(swapped.baseline.document.role, 'REFERENCE');
  assert.equal(swapped.candidate.document.slotId, 'candidate');
  assert.equal(swapped.candidate.document.role, 'CANDIDATE');
  assert.equal(swapped.baseline.jsonSnapshot.side, 'REV_A');
  assert.equal(swapped.candidate.jsonSnapshot.side, 'REV_B');
  assert.match(componentId(swapped.baseline), /^record:A:baseline:/);
  assert.match(componentId(swapped.candidate), /^record:B:candidate:/);
  assert.equal(swapped.baseline.jsonSnapshot.parsedValue[0].name, 'B');
  assert.equal(swapped.candidate.jsonSnapshot.parsedValue[0].name, 'A');

  state = applyRevisionCompareSwapResults(state, swapped, CREATED_AT);
  assert.equal(state.slots.baseline.document.sourceHash, HASH_B);
  assert.equal(state.slots.candidate.document.sourceHash, HASH_A);
  assert.equal(state.proposal, null);
  assert.deepEqual(state.scopeDecisions, {});
  assert.equal(state.basisStatus, 'STALE');
  assert.equal(state.compare.audit, null);

  const restored = loadServiceTest.swapLoadedSlots(context);
  assert.equal(context.clients.get('baseline'), clientA);
  assert.equal(context.clients.get('candidate'), clientB);
  assert.equal(restored.baseline.document.sourceHash, HASH_A);
  assert.equal(restored.candidate.document.sourceHash, HASH_B);

  const imported = Object.freeze({
    ...state,
    evidencePackageImport: Object.freeze({ ...state.evidencePackageImport, status: 'VERIFIED' }),
  });
  assert.equal(revisionCompareSwapReadiness(imported).status, 'BLOCKED');
  assert.match(revisionCompareSwapReadiness(imported).blockers[0], /read-only/i);
  assert.match(viewTest.swapControl(imported), /data-revc-swap-revisions disabled/);

  console.log('revision-compare-intake-swap: PASS');
}

await main();
