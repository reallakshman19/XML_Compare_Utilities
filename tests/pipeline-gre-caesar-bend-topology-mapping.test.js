import assert from 'node:assert/strict';
import { createPipelineGreCaesarBendTopologyMapping,
  buildPipelineGreCaesarTopologyMatrixTsv } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-bend-topology-mapping.js';
import { qualifiedFixture, qualifiedTopologyMapping } from './pipeline-gre-caesar-test-fixtures.js';

const directFixture = qualifiedFixture({ mode: 'TANGENCY_SEPARATED_BRIDGE' });
const direct = qualifiedTopologyMapping(directFixture);
assert.equal(direct.ready, true);
assert.equal(direct.currentP3dGre055Compatibility, 'DIRECTLY_WRITER_COMPATIBLE');
assert.equal(direct.currentP3dGre055Questions.distinctTangencyNodeNumbersAllowed, true);
assert.equal(direct.inactiveCornerDisposition, 'NOT_SERIALIZED');
assert.notEqual(direct.outgoingTangencyDisposition, 'CURVATURE_NODE');

const sharedFixture = qualifiedFixture({ fixtureId: 'fixture:F7', mode: 'CONSECUTIVE_SHARED_LOGICAL_NODE' });
const shared = qualifiedTopologyMapping(sharedFixture, { topologyMappingId: 'topology:F7' });
assert.equal(shared.ready, true);
assert.equal(shared.currentP3dGre055Compatibility, 'REQUIRES_CAESAR_TOPOLOGY_REPROJECTION');
assert.equal(shared.currentP3dGre055Questions.sharedLogicalNodeRequired, true);
assert.equal(shared.currentP3dGre055Questions.syntheticCaesarBendNodeRequired, true);

const conflict = createPipelineGreCaesarBendTopologyMapping({ ...structuredClone(shared),
  caesarTopologyMode: 'TANGENCY_SEPARATED_BRIDGE', fixtureIds: [sharedFixture.fixtureId],
  fixtures: [sharedFixture] });
assert.equal(conflict.ready, false);
assert.ok(conflict.blockerCodes.includes('PIPELINE_GRE_CAESAR_TOPOLOGY_UNRESOLVED'));

const unauthenticatedFixture = structuredClone(sharedFixture);
unauthenticatedFixture.ready = false;
const unauthenticated = qualifiedTopologyMapping(unauthenticatedFixture);
assert.equal(unauthenticated.ready, false);
assert.ok(unauthenticated.blockerCodes.includes('PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED'));
const tsv = buildPipelineGreCaesarTopologyMatrixTsv([shared, direct]);
assert.equal(tsv, buildPipelineGreCaesarTopologyMatrixTsv([direct, shared]));
console.log('pipeline GRE CAESAR bend topology mapping: PASS');
