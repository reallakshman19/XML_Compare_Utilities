import assert from 'node:assert/strict';
import {
  applyCiiWriter2CompositePlanContract,
  ciiWriter2CompositeReadiness,
} from '../tabs/cii-workspace/cii-workspace-writer2-composite-routing.js';
import {
  buildFixture,
  restraintDelete,
  targetGraph,
  transferPlan,
} from './cii-workspace-writer2-composite-restraint-fixture.js';

const fixture = buildFixture();
const operation = restraintDelete(2, 30, fixture.restraintSpecs[2], {
  id: 'ABSENT-FAMILY-RESTRAINT-DELETE',
});
const plan = applyCiiWriter2CompositePlanContract(transferPlan(fixture.targetDocument, [operation]));
const readiness = ciiWriter2CompositeReadiness(plan, fixture.targetDocument, targetGraph());

assert.equal(plan.status, 'PREVIEW_READY', plan.blockers.join('|'));
assert.equal(readiness.ready, true, readiness.blockers.join('|'));
assert.equal(readiness.components.sifDelete, null);
assert.equal(readiness.components.hangerDeleteAll, null);
assert.equal(readiness.components.hangerPartialDelete, null);
assert.equal(readiness.components.restraintDelete?.ready, true);
assert(!readiness.blockers.includes('WRITER_2_SIF_CREATE_AUTHORITY_UNEXPECTEDLY_READY'));
assert(!readiness.blockers.includes('WRITER_2_HANGER_CREATE_AUTHORITY_UNEXPECTEDLY_READY'));

console.log('Writer2 absent sibling-family readiness guards passed.');
