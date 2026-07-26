import assert from 'node:assert/strict';
import { createTopologyScopedEditReadOnlyHostFixture } from './fixtures/topology-scoped-edit-read-only-host-fixture.js';
import { createTopologyScopedEditReadModel, TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION } from '../tabs/topology-trace-validator/topology-scoped-edit-read-model.js';
const f=createTopologyScopedEditReadOnlyHostFixture(),m=f.readModelA0;
assert.equal(m.schema,'TopologyScopedEditReadModel.v1');assert(Object.isFrozen(m));assert.equal(m.commandScopeBasis.editableEntityIds.length,16);assert.equal(m.commandScopeBasis.boundaryEntityIds.length,12);assert.equal(m.commandScopeBasis.excludedEntityIds.length,20);assert.deepEqual(m.journalProjection.redoCommandIds,['CJ-000004']);assert.doesNotThrow(()=>JSON.stringify(m));
function rejects(mutator,code){const input=structuredClone(f.inputA0);mutator(input);assert.throws(()=>createTopologyScopedEditReadModel(input,{core:f.core}),e=>e.code===code);}
rejects(i=>{i.authority.authorityId='TAUTH-forged';},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH);
rejects(i=>{i.projectDocument.documentId='wrong';},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DOCUMENT_MISMATCH);
rejects(i=>{i.commandJournal.activeCommandIds=[];},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH);
rejects(i=>{i.replayState.remarks={forged:'yes'};},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH);
rejects(i=>{i.editDraft={...i.editDraft,topologyEditDraftHash:'wrong'};},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DRAFT_MISMATCH);
rejects(i=>{i.canonicalAncestry.canonicalTopologyHash='wrong';},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.CANONICAL_MISMATCH);
rejects(i=>{i.canonicalTopology.sourceIdentity.sourceHash='b'.repeat(64);},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.SOURCE_BASIS_MISMATCH);
rejects(i=>{i.selectionSnapshot.entityIds=['MISSING'];},TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH);
console.log('[PASS] Topology read model authority consistency and fail-closed mismatches');
