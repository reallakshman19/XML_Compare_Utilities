import assert from 'node:assert/strict';
import { arbitrateCiiLoopCorrespondences } from '../tabs/cii-workspace/cii-workspace-correspondence-arbitration.js';
// import { workspaceMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-core.js';

function mockLoop(loopId, method, correspondence) {
  return { loop: { loopId, method, status: 'READY' }, correspondence };
}
function mockCorrespondence(nodeRows = [], elementRows = [], status = 'READY') {
  return { schema: 'CIIWorkspaceCorrespondence.v1', status, blockers: [], nodeRows, elementRows };
}
function nodeRow(sourceNodeId, targetNodeId, status = 'HIGH') {
  return {
    correspondenceId: `n:${sourceNodeId}:${targetNodeId}`,
    kind: 'NODE',
    sourceNodeId: String(sourceNodeId),
    targetNodeId: String(targetNodeId),
    status,
    authority: 'TEST',
  };
}

console.log('Testing Auto-Manual Coexistence and Localized Conflict Arbitration...');

// Test 1: Conflict Isolation in Loop Arbitration
// A collision on node 1 between Method A (1->101) and Manual Seed (1->999) must NOT
// poison non-conflicting nodes (2->102, 3->103, 5->105).
{
  const loopA = mockLoop('METHOD_A_1', 'METHOD_A_SPATIAL', mockCorrespondence([
    nodeRow('1', '101'),
    nodeRow('2', '102'),
    nodeRow('3', '103'),
  ], []));

  const loopManual = mockLoop('USER_LOCKED_SEED_1', 'USER_LOCKED_SEED', mockCorrespondence([
    nodeRow('1', '999'),
    nodeRow('5', '105'),
  ], []));

  const result = arbitrateCiiLoopCorrespondences([loopA, loopManual]);

  // Non-conflicting nodes must survive as bound/ready
  const boundSourceIds = (result.nodeRows || [])
    .filter((row) => row.status !== 'CONFLICT' && row.status !== 'UNRESOLVED')
    .map((row) => String(row.sourceNodeId));

  assert(boundSourceIds.includes('2'), 'Node 2 must remain bound');
  assert(boundSourceIds.includes('3'), 'Node 3 must remain bound');
  assert(boundSourceIds.includes('5'), 'Manual seed Node 5 must remain bound');

  // Node 1 must be flagged as conflict, not silently dropped or chosen
  assert.equal(result.conflicts.length, 1, 'Exactly one conflict expected for node 1');
  assert.equal(result.conflicts[0].key, '1', 'Conflict key must be source node 1');
  assert.deepEqual(result.conflicts[0].values, ['101', '999']);

  // Overall status must preserve ready correspondence for the non-conflicting subset
  assert(result.readyLoopCount > 0, 'Ready loops must contribute');
  assert(result.nodeRows.length >= 3, 'At least 3 valid non-conflicting node rows must exist');
}

/*
// Test 2: Multi-Base Authority Coexistence
{
  ...
}
*/

console.log('All coexistence tests passed.');
