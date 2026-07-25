import assert from 'node:assert/strict';
import {
  buildPipelineGreCaesarBendQualificationPlan,
  buildPipelineGreCaesarFixtureInventoryJson,
  buildPipelineGreCaesarBendFieldMatrixTsv,
  buildPipelineGreCaesarTopologyMatrixTsv,
  buildPipelineGreCaesarFixtureRequestMarkdown,
  createRepositoryGreCaesarQualificationPlan,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-bend-qualification.js';
import { buildPipelineGreCaesarQualificationPlanJson } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-qualification-contracts.js';
import { qualifiedFixture, qualifiedFieldMapping,
  qualifiedTopologyMapping } from './pipeline-gre-caesar-test-fixtures.js';

function profile(fixture, field, topology) {
  return { profileId: `profile:${fixture.fixtureId}`, caesarVersion: fixture.caesarVersion,
    pipingCodeId: fixture.pipingCodeId, pipingCodeName: fixture.pipingCodeName,
    pipingCodeEdition: fixture.pipingCodeEdition, laminateClassification: fixture.laminateClassification,
    fieldMappingId: field.mappingId, topologyMappingId: topology.topologyMappingId,
    fixtureIds: [fixture.fixtureId], sourceAuthority: 'CAESAR_IMPORT_AND_ROUND_TRIP',
    sourceReferences: ['operator-log:F1'] };
}

const directFixture = qualifiedFixture();
const directField = qualifiedFieldMapping(directFixture);
const directTopology = qualifiedTopologyMapping(directFixture);
const qualified = buildPipelineGreCaesarBendQualificationPlan({ governingBaseline: 'BASE',
  fixtures: [directFixture], fieldMappings: [directField], topologyMappings: [directTopology],
  qualificationProfiles: [profile(directFixture, directField, directTopology)] });
assert.equal(qualified.ready, true);
assert.equal(qualified.qualificationOutcome, 'QUALIFIED');
assert.equal(qualified.currentP3dGre055Compatibility, 'DIRECTLY_WRITER_COMPATIBLE');
assert.equal(qualified.writerAuthorized, false);
assert.equal(qualified.productXmlGenerated, false);
assert.equal(Object.isFrozen(qualified), true);
const qualifiedJson = buildPipelineGreCaesarQualificationPlanJson(qualified);
assert.equal(qualifiedJson, buildPipelineGreCaesarQualificationPlanJson(structuredClone(qualified)));

const sharedFixture = qualifiedFixture({ fixtureId: 'fixture:F7', mode: 'CONSECUTIVE_SHARED_LOGICAL_NODE' });
const sharedField = qualifiedFieldMapping(sharedFixture, { mappingId: 'mapping:F7' });
const sharedTopology = qualifiedTopologyMapping(sharedFixture, { topologyMappingId: 'topology:F7' });
const reconciliation = buildPipelineGreCaesarBendQualificationPlan({ governingBaseline: 'BASE',
  fixtures: [sharedFixture], fieldMappings: [sharedField], topologyMappings: [sharedTopology],
  qualificationProfiles: [profile(sharedFixture, sharedField, sharedTopology)] });
assert.equal(reconciliation.ready, false);
assert.equal(reconciliation.qualificationOutcome, 'TOPOLOGY_RECONCILIATION_REQUIRED');
assert.equal(reconciliation.currentP3dGre055Compatibility, 'REQUIRES_CAESAR_TOPOLOGY_REPROJECTION');

const duplicate = buildPipelineGreCaesarBendQualificationPlan({ governingBaseline: 'BASE',
  fixtures: [directFixture, structuredClone(directFixture)], fieldMappings: [directField],
  topologyMappings: [directTopology], qualificationProfiles: [profile(directFixture, directField, directTopology)] });
assert.equal(duplicate.ready, false);
assert.ok(duplicate.blockerCodes.includes('PIPELINE_GRE_CAESAR_FIXTURE_CONFLICT'));

const repository = createRepositoryGreCaesarQualificationPlan();
assert.equal(repository.ready, false);
assert.equal(repository.qualificationOutcome, 'STILL_BLOCKED');
assert.equal(repository.currentP3dGre055Compatibility, 'UNRESOLVED');
assert.match(repository.derivedTopologyAssessment, /^INFERENCE_ONLY:/);
assert.ok(repository.blockerCodes.includes('PIPELINE_GRE_CAESAR_IMPORT_NOT_PROVEN'));
assert.ok(repository.blockerCodes.includes('PIPELINE_GRE_CAESAR_ROUND_TRIP_NOT_PROVEN'));
assert.equal(buildPipelineGreCaesarFixtureInventoryJson(repository.fixtures),
  buildPipelineGreCaesarFixtureInventoryJson([...repository.fixtures].reverse()));
assert.equal(buildPipelineGreCaesarBendFieldMatrixTsv(repository.fieldMappings),
  buildPipelineGreCaesarBendFieldMatrixTsv([...repository.fieldMappings].reverse()));
assert.equal(buildPipelineGreCaesarTopologyMatrixTsv(repository.topologyMappings),
  buildPipelineGreCaesarTopologyMatrixTsv([...repository.topologyMappings].reverse()));
const request = buildPipelineGreCaesarFixtureRequestMarkdown();
for (const id of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']) assert.match(request, new RegExp(`\\| ${id} \\|`));
assert.match(request, /re-imported job/);
assert.match(request, /re-exported InputXML/);
console.log('pipeline GRE CAESAR bend qualification: PASS');
