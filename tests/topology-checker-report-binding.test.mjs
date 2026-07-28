import assert from 'node:assert/strict';
import { bindTopologyCheckReport, runBoundTopologyChecks } from '../tabs/topology-trace-validator/topology-checker-report.js';

const canonical = Object.freeze({
  schema: 'CanonicalTopology.v1',
  canonicalTopologyHash: 'fnv1a64:canonical-a',
});
const unbound = Object.freeze({
  schema: 'TopologyCheckReport.v1',
  issues: Object.freeze([{ id: 'ISSUE-1', code: 'SNAP_GAP' }]),
  summary: Object.freeze({ findingCount: 1 }),
});

const bound = bindTopologyCheckReport(canonical, unbound);
assert.equal(bound.canonicalTopologyHash, canonical.canonicalTopologyHash);
assert.match(bound.topologyCheckReportHash, /^fnv1a32:[0-9a-f]{8}$/);
assert(Object.isFrozen(bound));
assert.equal(unbound.canonicalTopologyHash, undefined, 'binding must not mutate producer evidence');
assert.deepEqual(bindTopologyCheckReport(canonical, unbound), bound, 'binding must be deterministic');

const changedCanonical = Object.freeze({ ...canonical, canonicalTopologyHash: 'fnv1a64:canonical-b' });
assert.notEqual(bindTopologyCheckReport(changedCanonical, unbound).topologyCheckReportHash, bound.topologyCheckReportHash);
assert.throws(() => bindTopologyCheckReport(canonical, { ...unbound, canonicalTopologyHash: 'fnv1a64:stale' }), /does not match/);
assert.throws(() => bindTopologyCheckReport({ schema: 'CanonicalTopology.v1' }, unbound), /canonical topology hash/);
assert.throws(() => bindTopologyCheckReport(canonical, { schema: 'OtherReport.v1' }), /TopologyCheckReport\.v1/);

let calls = 0;
const wrapped = runBoundTopologyChecks({ runTopologyChecks(receivedCanonical, options) {
  calls += 1;
  assert.equal(receivedCanonical, canonical);
  assert.deepEqual(options, { toleranceMm: 0.1 });
  return unbound;
} }, canonical, { toleranceMm: 0.1 });
assert.equal(calls, 1);
assert.deepEqual(wrapped, bound);

console.log('topology checker report binding passed: canonical identity, deterministic hash, mismatch rejection, and wrapped execution verified.');
