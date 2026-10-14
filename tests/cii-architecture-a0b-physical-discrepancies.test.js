/** A0b authentic physical SOURCE identity variance and forensic negative controls. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { investigateCiiArchitectureA0b } from '../scripts/cii-architecture-a0b-physical-discrepancies.mjs';

const evidencePath = process.argv.find((item) => item.startsWith('--evidence='))?.slice('--evidence='.length);
if (!evidencePath) throw new Error('A0B_TEST_REAL_RETAINED_A0_JSON_REQUIRED');
const evidence = JSON.parse(readFileSync(resolve(evidencePath), 'utf8'));
const forensic = investigateCiiArchitectureA0b(evidence);
assert.equal(forensic.schema, 'CiiArchitectureA0bForensicReconciliation.v1');
assert.equal(forensic.type, 'READ_ONLY_DISCREPANCY_FORENSICS_NO_IDENTITY_CERTIFICATION');
assert.equal(forensic.changeCount, 77);
assert.equal(forensic.bySource.S1.total, 57);
assert.equal(forensic.bySource.S2.total, 47);
assert.equal(forensic.bySource.S3.total, 46);
assert.equal(forensic.bySource.S1.differences, 0);
assert.equal(forensic.bySource.S2.differences, 39);
assert.equal(forensic.bySource.S3.differences, 38);
assert.equal(forensic.bySource.S2.lostBound, 35);
assert.equal(forensic.bySource.S3.lostBound, 32);
assert.deepEqual(Object.keys(forensic.classifications.S2).sort(), [
  'BOUND_TO_UNEMITTED', 'COMPETING_BOUND_TARGETS', 'UNRESOLVED_TO_UNEMITTED',
].sort());
assert.equal(forensic.classifications.S2.BOUND_TO_UNEMITTED, 35);
assert.equal(forensic.classifications.S2.COMPETING_BOUND_TARGETS, 1);
assert.equal(forensic.classifications.S2.UNRESOLVED_TO_UNEMITTED, 3);
assert.equal(forensic.classifications.S3.BOUND_TO_UNEMITTED, 23);
assert.equal(forensic.classifications.S3.BOUND_TO_UNRESOLVED, 9);
assert.equal(forensic.classifications.S3.UNRESOLVED_TO_UNEMITTED, 4);
assert.equal(forensic.classifications.S3.COMPETING_BOUND_TARGETS, 2);
assert.deepEqual(forensic.competingBoundTargets.map((x) =>
  [x.sourceNode, x.automatic.targetNodeId, x.manualBase.targetNodeId]), [
  ['S2:420', '10330', '415'],
  ['S3:1550', '8870', '7860'],
  ['S3:1580', '8895', '7880'],
]);
assert.deepEqual(forensic.manualClaims.map((row) =>
  [row.sourceNode, row.manuallyClaimedTarget, row.autoBaseProposedTarget]), [
  ['S2:420', '415', '10330'], ['S3:1580', '7880', '8895'],
]);
assert(forensic.manualClaims.every((row) =>
  row.independentlyCertifiedManualIdentity === false && row.samePhysicalTargetProposal === false));
assert.equal(forensic.autoOnly.physicalBound, 105);
assert.equal(forensic.manualBase.physicalBound, 38);
assert.deepEqual(forensic.autoOnly.candidateByWriterFamily,
  { WRITER1C_REPLACE: 74, WRITER2_CREATE: 1, WRITER2_DELETE: 0 });
assert.deepEqual(forensic.manualBase.candidateByWriterFamily,
  { WRITER1C_REPLACE: 28, WRITER2_CREATE: 0, WRITER2_DELETE: 0 });
assert.equal(forensic.benchmarks.AUTO_ONLY.knownPositive, 36);
assert.equal(forensic.benchmarks.AUTO_ONLY.physicalActionTargetMatched, 36);
assert.equal(forensic.benchmarks.AUTO_ONLY.compatibleNames, 33);
assert.deepEqual(forensic.benchmarks.AUTO_ONLY.unalignedExactRawNames.map((x) =>
  [x.physicalTargetAction, x.exactSourceNameProposed, x.partialOracleName]), [
  ['["995","REPLACE"]', 'SL-115A.9', 'SL-305'],
  ['["8895","REPLACE"]', 'SL-115A.8', 'SL-305'],
  ['["10330","CREATE"]', 'SL-115A.4', 'SL-305'],
]);
assert.equal(forensic.benchmarks.UI_MIXED_BASE_PROXY.physicalActionTargetMatched, 12);
assert.equal(forensic.benchmarks.UI_MIXED_BASE_PROXY.compatibleNames, 11);
assert.equal(forensic.benchmarks.UI_MIXED_BASE_PROXY.missingPhysicalActionTargets.length, 24);
assert(Object.isFrozen(forensic)); assert(Object.isFrozen(forensic.allChangedPhysicalNodes));
assert(Object.isFrozen(forensic.competingBoundTargets[0]));
assert.equal(JSON.stringify(investigateCiiArchitectureA0b(evidence)), JSON.stringify(forensic),
  'forensics must be deterministic for same A0 snapshot');
const tamperedManual = structuredClone(evidence);
tamperedManual.modes[1].reviewed.physicalNodes.find((x) => x.rowKey === 'S3:1580').targetNodeId = '8895';
assert.throws(() => investigateCiiArchitectureA0b(tamperedManual), /A0B_MANUAL_ASSERTION_NOT_RETAINED_EXACTLY/);
const tamperedSource = structuredClone(evidence);
tamperedSource.modes[1].reviewed.sourceSetSha256 = 'f'.repeat(64);
assert.throws(() => investigateCiiArchitectureA0b(tamperedSource), /A0B_DISCOVERY_REVIEW_SNAPSHOT_MISMATCH/);
const tamperedDuplicate = structuredClone(evidence);
tamperedDuplicate.modes[0].reviewed.physicalNodes[1].rowKey =
  tamperedDuplicate.modes[0].reviewed.physicalNodes[0].rowKey;
assert.throws(() => investigateCiiArchitectureA0b(tamperedDuplicate), /A0B_DUPLICATE_PHYSICAL_NODE_ID/);
const tamperedCount = structuredClone(evidence);
tamperedCount.reviewedModeDifference.differences = [];
assert.throws(() => investigateCiiArchitectureA0b(tamperedCount), /A0B_INDEPENDENT_DIFF_NOT_EQUAL_PREDECESSOR/);
console.log('PASS ARCH-01 A0b: 77 physical outcomes, 3 competing NODE targets, 2 manual claims, S2/S3 denominator and 36/12 postimage provenance with negative custody controls.');
