import assert from 'node:assert/strict';
import { immutableJson } from '../contracts/contract-values.js';
import { _test as hostTest } from '../tabs/topology-trace-validator/topology-scoped-edit-read-only-host.js';
import { createTopologyScopedEditReadOnlyHostFixture } from './fixtures/topology-scoped-edit-read-only-host-fixture.js';
const f = await createTopologyScopedEditReadOnlyHostFixture();
const before = f.sentinelSnapshot();
const host = await f.hostFactory({ readModel: f.readModelA0, core: f.core,
  authorityProvider: f.authorityGet, effects: f.effectBoundaryFactory() });
host.scene(); host.resolveScope(f.selectionRequests[0]); host.entityGeometry('N01');
host.appendEditCommand(f.readModelA0.journalProjection.projection, f.envelopes.authorized);
const after = f.sentinelSnapshot();
assert(after.readOnlyOperation > before.readOnlyOperation);
for (const key of ['storageAccess', 'recoveryAcceptance', 'writerAcquisition', 'controllerMutation',
  'rendererRefresh', 'selectionPublication', 'productionAcceptance']) assert.equal(after[key], before[key]);
const forged = structuredClone(f.readModelA0);
forged.canonicalTopology.nodes[0].position.x += 1;
const frozenForgery = immutableJson(forged, 'forged read model');
await assert.rejects(() => hostTest.createWithCore({ readModel: frozenForgery,
  authorityProvider: f.authorityGet, effects: f.effectBoundaryFactory() }, f.core,
  f.certificationDependencies), (error) => error.code === 'READ_MODEL_REGENERATION_MISMATCH');
console.log('[PASS] public host admission recertifies read models and uses effect-denial capabilities');
