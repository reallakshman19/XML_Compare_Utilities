import assert from 'node:assert/strict';
import {
  createPipelineGreCaesarFixtureEvidence,
  createRepositoryGreInputXmlFixtureEvidence,
  buildPipelineGreCaesarFixtureInventoryJson,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-fixture-evidence.js';
import { qualifiedFixture } from './pipeline-gre-caesar-test-fixtures.js';

const fixture = qualifiedFixture();
assert.equal(fixture.ready, true);
assert.equal(Object.isFrozen(fixture), true);
assert.equal(Object.isFrozen(fixture.bendRecords), true);
assert.equal(fixture.bendRecords.length, 1);
const json = buildPipelineGreCaesarFixtureInventoryJson([fixture]);
assert.equal(json, buildPipelineGreCaesarFixtureInventoryJson([structuredClone(fixture)]));

const mutable = { fixtureId: 'fixture:mutable', fixturePath: 'fixtures/mutable.xml',
  fixtureSha256: 'c'.repeat(64), sourceClassification: 'CAESAR_OPERATOR_ROUND_TRIP',
  caesarVersion: '14.00', xmlVersion: '14.00', pipingCodeId: '36', pipingCodeName: 'ISO 14692',
  pipingCodeEdition: '2005', laminateClassification: 'CSM_AND_MULTI_FILAMENT', elementCount: 2,
  bendCount: 1, bendRecords: structuredClone(fixture.bendRecords),
  continuityRecords: structuredClone(fixture.continuityRecords),
  importEvidence: structuredClone(fixture.importEvidence),
  roundTripEvidence: structuredClone(fixture.roundTripEvidence),
  authorityLevel: 'CAESAR_IMPORT_AND_ROUND_TRIP', sourceReferences: ['operator-log'] };
const isolated = createPipelineGreCaesarFixtureEvidence(mutable);
mutable.bendRecords[0].radius = 999;
assert.equal(isolated.bendRecords[0].radius, 300);

for (const [mutator, blocker] of [
  [(v) => { v.fixtureSha256 = ''; }, 'PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED'],
  [(v) => { v.caesarVersion = '13.00'; v.xmlVersion = '13.00'; }, 'PIPELINE_GRE_CAESAR_VERSION_UNRESOLVED'],
  [(v) => { v.pipingCodeId = ''; }, 'PIPELINE_GRE_CAESAR_CODE_ID_UNRESOLVED'],
  [(v) => { v.pipingCodeEdition = ''; }, 'PIPELINE_GRE_CAESAR_CODE_EDITION_UNRESOLVED'],
  [(v) => { v.laminateClassification = ''; }, 'PIPELINE_GRE_CAESAR_LAMINATE_UNRESOLVED'],
  [(v) => { v.importEvidence = { status: 'MISSING' }; }, 'PIPELINE_GRE_CAESAR_IMPORT_NOT_PROVEN'],
  [(v) => { v.roundTripEvidence = { status: 'MISSING' }; }, 'PIPELINE_GRE_CAESAR_ROUND_TRIP_NOT_PROVEN'],
]) {
  const value = structuredClone(mutable); mutator(value);
  const blocked = createPipelineGreCaesarFixtureEvidence(value);
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockerCodes.includes(blocker));
}

const repository = createRepositoryGreInputXmlFixtureEvidence();
assert.equal(repository.ready, false);
assert.equal(repository.fixturePath, 'docs/GREInputxml.xml');
assert.equal(repository.pipingCodeId, '36');
assert.ok(repository.blockerCodes.includes('PIPELINE_GRE_CAESAR_IMPORT_NOT_PROVEN'));
assert.ok(repository.blockerCodes.includes('PIPELINE_GRE_CAESAR_ROUND_TRIP_NOT_PROVEN'));
console.log('pipeline GRE CAESAR fixture evidence: PASS');
