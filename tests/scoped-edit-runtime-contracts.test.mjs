import assert from 'node:assert/strict';
import {
  SCOPED_EDIT_COMMIT_PROPOSAL_V1,
  SCOPED_EDIT_COMMIT_RESULT_V1,
  SCOPED_EDIT_ENTITY_GEOMETRY_V1,
  SCOPED_EDIT_HOST_CONTRACT_V1,
  SCOPED_EDIT_JOURNAL_PROJECTION_V1,
  SCOPED_EDIT_RUNTIME_CONFORMANCE_V1,
  SCOPED_EDIT_RUNTIME_STATE_V1,
  SCOPED_EDIT_RUNTIME_STATUS,
  assertScopedEditHostContract,
  createScopedEditRuntime,
  validateScopedEditEntityGeometry,
  validateScopedEditJournalProjection,
} from '../core/scoped-edit-runtime/index.js';
import {
  SCOPED_EDIT_FIXTURE_COUNTS,
  createScopedEditRuntimeFixture,
} from './fixtures/scoped-edit-runtime-fixture.js';

let checked = 0, hostCalls = 0;

function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true);
  assert.equal(value instanceof Map || value instanceof Set, false);
  for (const child of Object.values(value)) {
    assert.notEqual(typeof child, 'function');
    assertDeepFrozen(child);
  }
}

function assertContractValue(value) {
  assertDeepFrozen(value);
  assert.doesNotThrow(() => JSON.stringify(value));
  checked += 1;
}

assert.deepEqual({
  state: SCOPED_EDIT_RUNTIME_STATE_V1,
  proposal: SCOPED_EDIT_COMMIT_PROPOSAL_V1,
  result: SCOPED_EDIT_COMMIT_RESULT_V1,
  projection: SCOPED_EDIT_JOURNAL_PROJECTION_V1,
  geometry: SCOPED_EDIT_ENTITY_GEOMETRY_V1,
  conformance: SCOPED_EDIT_RUNTIME_CONFORMANCE_V1,
}, {
  state: 'ScopedEditRuntimeState.v1', proposal: 'ScopedEditCommitProposal.v1',
  result: 'ScopedEditCommitResult.v1', projection: 'ScopedEditJournalProjection.v1',
  geometry: 'ScopedEditEntityGeometry.v1', conformance: 'ScopedEditRuntimeConformance.v1',
});
checked += 1;

const geometryInput = { schema: SCOPED_EDIT_ENTITY_GEOMETRY_V1, entityId: 'entity:1', anchor: [10, 20, 30] };
const geometry = validateScopedEditEntityGeometry(geometryInput);
assertContractValue(geometry);
assert.notEqual(geometry.anchor, geometryInput.anchor);
assert.throws(() => validateScopedEditEntityGeometry({ ...geometryInput, schema: undefined }), /schema/);
assert.throws(() => validateScopedEditEntityGeometry({ ...geometryInput, entityId: '' }), /entityId/);
for (const anchor of [[1, 2], [1, 2, Number.NaN], [1, 2, Infinity]]) {
  assert.throws(() => validateScopedEditEntityGeometry({ ...geometryInput, anchor }), TypeError);
  checked += 1;
}

const projection = validateScopedEditJournalProjection({
  schema: SCOPED_EDIT_JOURNAL_PROJECTION_V1, initialState: {}, envelopes: [], activeCommandIds: [],
});
assertContractValue(projection);
assert.throws(() => validateScopedEditJournalProjection({ ...projection, schema: undefined }), /schema/);
assert.throws(() => validateScopedEditJournalProjection({ ...projection, envelopes: {} }), /array/);
assert.throws(() => validateScopedEditJournalProjection({ ...projection, activeCommandIds: ['unknown'] }), /has no envelope/);
checked += 3;

const fixture = createScopedEditRuntimeFixture();
assert.deepEqual({
  entities: fixture.scene.entities.length,
  editable: fixture.editableIds.length,
  boundary: fixture.boundaryIds.length,
  excluded: fixture.excludedIds.length,
  structuralIdentifiers: fixture.structuralIdentifiers.length,
  selectionSeeds: fixture.selectionSeeds.length,
  sectionalRegions: fixture.sectionalRegions.length,
  reducerBindings: fixture.reducerRegistry.commandTypes.length,
}, SCOPED_EDIT_FIXTURE_COUNTS);
checked += 1;

const hostReport = assertScopedEditHostContract(fixture.host);
assert.equal(hostReport.schema, SCOPED_EDIT_HOST_CONTRACT_V1);
assertContractValue(hostReport);
assert.equal(fixture.readEvidence().sceneCalls, 0, 'shape validation must not call host methods');

const methods = ['scene', 'appendEditCommand', 'entityGeometry', 'resolveScope'];
const inertHost = Object.freeze(Object.fromEntries(methods.map((name) => [name, () => { hostCalls += 1; }])));
for (const missing of methods) {
  const host = Object.fromEntries(methods.filter((name) => name !== missing).map((name) => [name, inertHost[name]]));
  assert.throws(() => assertScopedEditHostContract(host), new RegExp(missing));
  checked += 1;
}
assert.throws(() => assertScopedEditHostContract({ ...inertHost, scene: {} }), /scene/);
assert.equal(hostCalls, 0);
checked += 1;

const runtime = createScopedEditRuntime({
  host: fixture.host, scopeRequest: fixture.scopeRequest,
  reducerRegistry: fixture.reducerRegistry, journalProjection: fixture.journalProjection,
});
const state = runtime.getState();
assert.equal(state.schema, SCOPED_EDIT_RUNTIME_STATE_V1);
assert.equal(state.status, SCOPED_EDIT_RUNTIME_STATUS.READY);
assertContractValue(state);
assert.equal(state.scope.entityIds.length, 8);
assert.equal(state.scope.boundaryIds.length, 4);

console.log(`[PASS] scoped-edit runtime contracts: ${checked} contract and host-shape cases.`);
