import assert from 'node:assert/strict';
import {
  assertScopedEditHostContract,
} from '../core/scoped-edit-runtime/index.js';
import {
  createScopedEditReferenceHostFixture,
} from './fixtures/scoped-edit-reference-host-fixture.js';

const fixture = createScopedEditReferenceHostFixture();
let checked = 0;

const pureStore = fixture.createStore();
const pureSnapshot = pureStore.getSnapshot();
const pureTx = fixture.createRuntimeCandidate(pureStore, {
  issuedAt: '2026-07-25T14:00:00.000Z',
});
assert.equal(pureTx.result.status, 'COMMITTED');
assert.deepEqual(pureStore.getSnapshot(), pureSnapshot);
const firstCandidate = pureTx.host.appendEditCommand(pureSnapshot.journalProjection, pureTx.envelope);
const secondCandidate = pureTx.host.appendEditCommand(pureSnapshot.journalProjection, pureTx.envelope);
assert.deepEqual(firstCandidate, secondCandidate);
assert.deepEqual(firstCandidate, pureTx.result.journalProjection);
assert.equal(assertScopedEditHostContract(pureTx.host).valid, true);
checked += 5;

const geometry = pureTx.host.entityGeometry(fixture.editableIds[0]);
assert.deepEqual(geometry.anchor, pureSnapshot.document.entities
  .find((entity) => entity.entityId === fixture.editableIds[0]).anchor);
assert.equal(Object.isFrozen(geometry), true);
checked += 2;

for (const entity of pureSnapshot.engineeringScene.entities) {
  assert.equal(entity.id, entity.domainRef.entityId);
  assert.deepEqual(entity.geometry.position, {
    schema: 'EngineeringPoint3D.v1',
    x: entity.metadata.authoritativeGeometry.anchor[0],
    y: entity.metadata.authoritativeGeometry.anchor[1],
    z: entity.metadata.authoritativeGeometry.anchor[2],
  });
  assert.equal(entity.metadata.presentation.readOnly, true);
}
checked += pureSnapshot.engineeringScene.entities.length * 3;

for (const kind of ['STRUCTURAL', 'SELECTION', 'SECTIONAL']) {
  for (let index = 0; index < 4; index += 1) {
    const scope = pureTx.host.resolveScope(fixture.scopeRequest(kind, 'FROZEN', index));
    assert.equal(scope.kind, kind);
    assert.equal(scope.entityIds.length > 0, true);
  }
}
checked += 24;

const scopeCounts = { STRUCTURAL: 0, SELECTION: 0, SECTIONAL: 0 };
const acceptedVariants = new Set();
for (const kind of Object.keys(scopeCounts)) {
  for (let index = 0; index < 300; index += 1) {
    const store = fixture.createStore();
    const tx = fixture.createRuntimeCandidate(store, {
      kind,
      index: 0,
      issuedAt: '2026-07-25T14:01:00.000Z',
    });
    assert.equal(tx.result.status, 'COMMITTED');
    const acceptance = store.acceptCommitResult({
      expectedSnapshotId: tx.snapshot.snapshotId,
      result: tx.result,
      acceptedAt: tx.issuedAt,
    });
    assert.equal(acceptance.accepted, true);
    assert.equal(store.getSnapshot().version, 1);
    acceptedVariants.add(store.getSnapshot().snapshotId);
    scopeCounts[kind] += 1;
    tx.runtime.destroy();
    store.destroy();
  }
}
assert.deepEqual(scopeCounts, { STRUCTURAL: 300, SELECTION: 300, SECTIONAL: 300 });
assert.equal(acceptedVariants.size, 1);
checked += 902;

for (const policy of ['FROZEN', 'GHOSTED']) {
  const store = fixture.createStore();
  const tx = fixture.createRuntimeCandidate(store, {
    boundaryPolicy: policy,
    targetIds: [fixture.editableIds[0], fixture.boundaryIds[0]],
    issuedAt: '2026-07-25T14:02:00.000Z',
  });
  assert.equal(tx.result.status, 'REJECTED');
  assert.equal(tx.result.rejectionCode, `BOUNDARY_${policy}`);
  assert.equal(store.getSnapshot().version, 0);
  checked += 3;
}

const propagateStore = fixture.createStore();
const propagateTx = fixture.createRuntimeCandidate(propagateStore, {
  boundaryPolicy: 'PROPAGATE',
  targetIds: [fixture.editableIds[0], fixture.boundaryIds[0]],
  issuedAt: '2026-07-25T14:03:00.000Z',
});
assert.equal(propagateTx.result.status, 'COMMITTED');
assert.deepEqual(propagateTx.result.boundaryDecision.escapingIds, [fixture.boundaryIds[0]]);
const propagateAcceptance = propagateStore.acceptCommitResult({
  expectedSnapshotId: propagateTx.snapshot.snapshotId,
  result: propagateTx.result,
  acceptedAt: propagateTx.issuedAt,
});
assert.equal(propagateAcceptance.accepted, true);
checked += 3;

assert.throws(() => pureTx.host.appendEditCommand({
  ...pureSnapshot.journalProjection,
  initialState: { divergent: true },
}, pureTx.envelope), /does not match/);
assert.throws(() => pureTx.host.entityGeometry('missing-reference-entity'), /does not exist/);
checked += 2;

console.log(`[PASS] scoped-edit reference host: ${checked} host, scope, and purity cases.`);
