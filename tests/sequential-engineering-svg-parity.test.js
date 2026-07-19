import assert from 'node:assert/strict';
import { buildSequentialEngineeringSvgScene } from '../tabs/sequential-sketcher/sequential-engineering-svg-scene.js';
import {
  adapterState,
  blockedSequentialFixture,
  confirmedSupportSequentialFixture,
  rejectedSequentialFixture,
  repairedSequentialFixture,
} from './helpers/sequential-engineering-svg-fixture.js';

function plainPoint(value) { return { x: value.x, y: value.y, z: value.z }; }
function geometryLedger(scene) {
  return scene.entities.map((entity) => ({ id: entity.id, geometry: entity.geometry }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

const blocked = blockedSequentialFixture();
const builds = Object.fromEntries(['ISO', 'XY', 'XZ', 'YZ'].map((projection) => [
  projection,
  buildSequentialEngineeringSvgScene(adapterState(blocked, projection), {
    sceneId: 'ssk-blocked',
    visibleProjection: projection,
  }),
]));
const iso = builds.ISO;
for (const projection of ['XY', 'XZ', 'YZ']) {
  assert.deepEqual(
    geometryLedger(iso.scene),
    geometryLedger(builds[projection].scene),
    `${projection} projection must not alter engineering XYZ`,
  );
  assert.deepEqual(
    iso.scene.entities.map((entity) => entity.id),
    builds[projection].scene.entities.map((entity) => entity.id),
    `${projection} projection must not alter stable entity identity`,
  );
}
assert.equal(iso.scene.capabilities.editing, false);
assert.equal(iso.parity.confirmedComponentCount, 1);
assert.equal(iso.parity.confirmedGeometryCount, 1);
assert.equal(iso.parity.candidateCount, blocked.session.currentDecisionRequest.candidates.length);
assert.equal(iso.parity.activePortCount, 1);
assert.equal(iso.parity.mappedCountByCategory.candidate, iso.parity.candidateCount);
assert.equal(iso.parity.duplicateIds.length, 0);
assert.equal(iso.parity.invalidGeometry.length, 0);
assert.equal(iso.parity.unresolvedPorts.length, 0);
assert.equal(iso.parity.disconnectedConfirmedGeometry.length, 0);
assert.equal(iso.parity.propertySetCoverage.eligible, iso.parity.propertySetCoverage.mapped);
assert(iso.parity.omissions.some((row) => row.category === 'network'));

const confirmed = iso.scene.entities.filter((entity) => entity.layer === 'sequential-confirmed');
const candidates = iso.scene.entities.filter((entity) => entity.layer === 'sequential-candidate');
const active = iso.scene.entities.find((entity) => entity.layer === 'sequential-active-port');
assert(confirmed.every((entity) => entity.contributesToFit));
assert(candidates.every((entity) => !entity.contributesToFit));
assert(candidates.every((entity) => entity.metadata.sequential.status === 'NOT_CONFIRMED'));
assert.equal(active.domainRef.portId, blocked.session.activeExitPortId);
assert.equal(active.contributesToFit, false);
assert.deepEqual(plainPoint(active.geometry.position), blocked.indexes.ports.get(blocked.session.activeExitPortId).sourcePosition);

const repaired = repairedSequentialFixture();
const repairedBuild = buildSequentialEngineeringSvgScene(adapterState(repaired), { sceneId: 'ssk-repaired' });
assert.equal(repairedBuild.parity.repairCount, 1);
assert.equal(repairedBuild.parity.mappedCountByCategory.repair, 1);
const repair = repairedBuild.scene.entities.find((entity) => entity.domainRef.category === 'repair');
assert.equal(repair.domainRef.repairId, repaired.session.repairLedger[0].repairId);
assert.equal(repair.metadata.sequential.repair.tolerancePolicyFingerprint, repaired.session.repairLedger[0].tolerancePolicyFingerprint);
const elbow = repairedBuild.scene.entities.find((entity) => entity.metadata.sequential.component?.canonicalType === 'ELBOW');
assert.equal(elbow.geometry.kind, 'polyline');
assert.deepEqual(elbow.geometry.points.map(plainPoint), [
  { x: 112, y: 0, z: 0 },
  { x: 100, y: 0, z: 0 },
  { x: 112, y: 100, z: 0 },
]);

const supported = confirmedSupportSequentialFixture();
const supportedBuild = buildSequentialEngineeringSvgScene(adapterState(supported), { sceneId: 'ssk-supported' });
assert.equal(supportedBuild.parity.supportCount, 1);
assert.equal(supportedBuild.parity.mappedCountByCategory.support, 1);
assert.equal(supportedBuild.parity.supportAttachmentsMissingCarrierEvidence.length, 0);
assert.equal(supportedBuild.parity.revisionConsistency.supportMatchesConfirmed, true);
const support = supportedBuild.scene.entities.find((entity) => entity.layer === 'sequential-support');
assert.equal(support.domainRef.carrierId, supported.confirmedConstruction.components[0].componentId);
assert.deepEqual(plainPoint(support.geometry.position), { x: 250, y: 0, z: 0 });

const rejected = rejectedSequentialFixture();
const rejectedBuild = buildSequentialEngineeringSvgScene(adapterState(rejected), { sceneId: 'ssk-rejected' });
assert.equal(rejectedBuild.parity.rejectedCandidateCount, 1);
assert.equal(rejectedBuild.parity.mappedCountByCategory.rejectedCandidate, 1);
const rejectedEntity = rejectedBuild.scene.entities.find((entity) => entity.domainRef.category === 'rejectedCandidate');
assert.equal(rejectedEntity.domainRef.candidateId, rejected.rejectedCandidate.candidateId);
assert.equal(rejectedEntity.metadata.sequential.decision.resolution.action, 'REJECT_CANDIDATE');
assert.equal(rejectedEntity.contributesToFit, false);

console.log('Sequential engineering SVG scene parity: ok');
