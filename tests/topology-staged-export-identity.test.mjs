import assert from 'node:assert/strict';
import {
  STAGED_POSITION_IDENTITY_TOLERANCE_MM,
  buildStagedExport,
} from '../tabs/topology-trace-validator/topology-staged-export.js';

const point = (x, y = 0, z = 0) => ({ x, y, z });
const baseStagedJson = [{
  name: '/IDENTITY/B1',
  type: 'BRANCH',
  attributes: {
    HPOS: point(0),
    BPOS: point(0.421),
    TPOS: point(10),
  },
  children: [{
    name: 'PIPE-1',
    type: 'PIPE',
    attributes: { APOS: point(0), LPOS: point(10) },
  }],
}];
const baseCanonical = {
  schema: 'CanonicalTopology.v1',
  nodes: [
    { id: 'CN-1', position: point(0) },
    { id: 'CN-2', position: point(10) },
  ],
};
const draft = {
  schema: 'TopologyEditDraft.v1',
  baseCanonicalTopologyHash: 'fnv1a64:base',
  topologyEditDraftHash: 'fnv1a64:draft',
  commands: [{ id: 'EC-000001', type: 'MOVE_NODE', payload: { nodeId: 'CN-1', position: point(1) } }],
};
const common = {
  baseStagedJson,
  baseCanonical,
  draft,
  editedCanonicalHash: 'fnv1a64:edited',
  attributeLedger: { schema: 'AttributeEditLedger.v1', edits: [], redoEdits: [], nextSequence: 1 },
  commandJournal: { schema: 'CommandJournal.v1', activeCommandIds: [] },
  exportedAt: '2026-07-28T07:30:00.000Z',
  ledgerRows: [],
};

const result = buildStagedExport({ ...common, toleranceMm: 0.5 });
const exported = JSON.parse(result.text);
assert.equal(exported.provenance.positionIdentityToleranceMm, STAGED_POSITION_IDENTITY_TOLERANCE_MM);
assert.equal(result.summary.positionIdentityToleranceMm, STAGED_POSITION_IDENTITY_TOLERANCE_MM);
assert.equal(result.summary.remaps, 1);
assert.equal(result.summary.coordinatesTouched, 2);
assert.deepEqual(exported.objects[0].attributes.HPOS, point(1), 'exact branch port follows the moved node');
assert.deepEqual(exported.objects[0].children[0].attributes.APOS, point(1), 'exact component port follows the moved node');
assert.deepEqual(exported.objects[0].attributes.BPOS, point(0.421), 'nearby but distinct coordinate must not be remapped');
assert.deepEqual(exported.objects[0].attributes.TPOS, point(10));
assert.deepEqual(exported.objects[0].children[0].attributes.LPOS, point(10));
assert.throws(() => buildStagedExport({ ...common, positionIdentityToleranceMm: 0.5 }), /must not exceed 0\.0001 mm/);

console.log('topology staged-export identity passed: exact coordinates moved; nearby 0.421 mm source coordinate remained unchanged.');
