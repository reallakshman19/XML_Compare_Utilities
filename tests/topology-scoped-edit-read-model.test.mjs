import assert from 'node:assert/strict';
import { immutableJson } from '../contracts/contract-values.js';
import { semanticHash } from '../tabs/topology-trace-validator/topology-validator-values.js';
import {
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION,
  _test as readModelTest,
} from '../tabs/topology-trace-validator/topology-scoped-edit-read-model.js';
import {
  createTopologyScopedEditReadOnlyHostFixture,
  _test as fixtureTest,
} from './fixtures/topology-scoped-edit-read-only-host-fixture.js';

const f = await createTopologyScopedEditReadOnlyHostFixture(), m = f.readModelA0;
assert.equal(m.schema, 'TopologyScopedEditReadModel.v1');
assert(Object.isFrozen(m));
assert.equal(m.commandScopeBasis.editableEntityIds.length, 16);
assert.equal(m.commandScopeBasis.boundaryEntityIds.length, 12);
assert.equal(m.commandScopeBasis.excludedEntityIds.length, 20);
assert.deepEqual(m.journalProjection.redoCommandIds, ['CJ-000004']);
assert.equal(m.regenerationCertification.artifactsHash, m.artifactsHash);
assert.doesNotThrow(() => JSON.stringify(m));
async function rejects(mutator, code) {
  const input = structuredClone(f.inputA0); mutator(input);
  await assert.rejects(() => readModelTest.createWithCore(input, f.core, f.certificationDependencies),
    (error) => error.code === code);
}
await rejects((i) => { i.authority.authorityId = 'TAUTH-forged'; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH);
await rejects((i) => { i.projectDocument.documentId = 'wrong'; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DOCUMENT_MISMATCH);
await rejects((i) => { i.commandJournal.activeCommandIds = []; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH);
await rejects((i) => { i.replayState.remarks = { forged: 'yes' }; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH);
await rejects((i) => { i.editDraft = { ...i.editDraft, topologyEditDraftHash: 'wrong' }; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DRAFT_MISMATCH);
await rejects((i) => { i.canonicalAncestry.canonicalTopologyHash = 'wrong'; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.CANONICAL_MISMATCH);
await rejects((i) => { i.canonicalTopology.sourceIdentity.sourceHash = 'b'.repeat(64); },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.SOURCE_BASIS_MISMATCH);
await rejects((i) => { i.selectionSnapshot.entityIds = ['MISSING']; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH);
await rejects((i) => {
  i.canonicalTopology.nodes[0].position.x += 1;
  i.canonicalTopology.canonicalTopologyHash = 'coordinated-forgery';
  i.canonicalAncestry.canonicalTopologyHash = 'coordinated-forgery';
  const built = fixtureTest.builtFor(i.editDraft);
  i.canonicalAncestry.artifactsHash = semanticHash({ editDraft: built.editDraft,
    canonicalTopology: i.canonicalTopology, editLedger: built.editLedger,
    editValidation: built.editValidation });
}, TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REGENERATION_MISMATCH);
await rejects((i) => {
  i.canonicalTopology.nodes[1].position.z += 5;
  i.canonicalTopology.canonicalTopologyHash = 'altered-content-and-hash';
  i.canonicalAncestry.canonicalTopologyHash = 'altered-content-and-hash';
}, TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REGENERATION_MISMATCH);
await rejects((i) => { i.canonicalTopology.nodes[2].position.y += 7; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REGENERATION_MISMATCH);
await rejects((i) => { i.canonicalAncestry.artifactsHash = 'fnv1a32:deadbeef'; },
  TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REGENERATION_MISMATCH);
await rejects((i) => {
  const wrong = structuredClone(f.inputA1.canonicalTopology);
  i.canonicalTopology = wrong;
  i.canonicalAncestry.canonicalTopologyHash = wrong.canonicalTopologyHash;
}, TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REGENERATION_MISMATCH);
const roundTrip = immutableJson(structuredClone(m), 'round-trip read model');
assert.equal(await readModelTest.assertWithCore(roundTrip, f.core, f.certificationDependencies), roundTrip);
console.log('[PASS] read model independently regenerates canonical and rejects coordinated ancestry forgeries');
