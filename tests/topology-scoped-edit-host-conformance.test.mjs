import assert from 'node:assert/strict';
import {
  TOPOLOGY_SCOPED_EDIT_SOURCE_BOUNDARY_REJECTED,
  certifyTopologyScopedEditSourceBoundary,
  runTopologyScopedEditReadOnlyHostConformance,
} from '../tabs/topology-trace-validator/topology-scoped-edit-host-conformance.js';
import { createTopologyScopedEditReadOnlyHostFixture } from './fixtures/topology-scoped-edit-read-only-host-fixture.js';
const fixture = await createTopologyScopedEditReadOnlyHostFixture();
const report = await runTopologyScopedEditReadOnlyHostConformance(fixture);
assert.equal(report.valid, true);
assert.equal(report.sourceBoundary.valid, true);
assert.equal(report.defectiveHostRejections, 7);
assert.deepEqual(report.rejections.defectiveHost, ['TOPOLOGY_READ_ONLY_EFFECT_DENIED']);
const forgedSources = { ...fixture.sourceFiles };
const hostPath = Object.keys(forgedSources).find((path) => path.endsWith('topology-scoped-edit-read-only-host.js'));
forgedSources[hostPath] += "\nimport './topology-edit-journal-service.js';\n";
assert.throws(() => certifyTopologyScopedEditSourceBoundary(forgedSources),
  (error) => error.code === TOPOLOGY_SCOPED_EDIT_SOURCE_BOUNDARY_REJECTED);
assert.equal(report.variants.scene, 1); assert.equal(report.variants.candidate, 1);
for (const key of ['storageAccess', 'recoveryAcceptance', 'writerAcquisition', 'controllerMutation',
  'rendererRefresh', 'selectionPublication', 'productionAcceptance']) {
  assert.equal(report.sideEffects[key], 0);
  assert.equal(report.effectDenialAttempts[key], 1);
}
console.log(`[PASS] conformance source=${report.sourceBoundary.inspectedFiles.length} defective=${report.defectiveHostRejections} scene=${report.counts.scene} selection=${report.counts.selection} structural=${report.counts.structural} authorized=${report.counts.authorizedDryRun} boundary=${report.counts.boundaryRejection} excluded=${report.counts.excludedRejection} stale=${report.counts.staleRejection} corrupt=${report.counts.projectionCorruption} remount=${report.counts.destroyRemount}`);
