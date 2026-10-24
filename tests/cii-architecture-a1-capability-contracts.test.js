import assert from 'node:assert/strict';
import {
  CII_TRANSFER_ARCH_A1_CATALOG, CII_TRANSFER_CAPABILITY_SCHEMA,
  ciiTransferPhysicalEntityRef, ciiTransferCapabilityFor,
  observeCiiTransferFamilyDelta, ciiAssertA1NoWrite,
} from '../tabs/cii-workspace/architecture/cii-transfer-capability-contracts.js';

const h = (c) => c.repeat(64);
const nodeSource = { side: 'SOURCE', sourceId: 'S2', originalSha256: h('a'), entityKind: 'NODE', physicalId: '420' };
const nodeTarget = { side: 'TARGET', originalSha256: h('b'), entityKind: 'NODE', physicalId: '415' };
const certified = (source = nodeSource, target = nodeTarget) => ({
  status: 'CERTIFIED', certificateId: 'synthetic-certificate', evidenceDigest: 'synthetic-evidence',
  sourcePhysicalId: source.physicalId, targetPhysicalId: target.physicalId,
});

assert.equal(CII_TRANSFER_ARCH_A1_CATALOG.writerDispatchInstalled, false);
assert.deepEqual(CII_TRANSFER_ARCH_A1_CATALOG.capabilities.map((x) => x.id), [
  'NODE_NAME.NAME', 'RESTRAINT.RECORD_SET', 'ELEMENT_PROCESS.P1',
]);
for (const capability of CII_TRANSFER_ARCH_A1_CATALOG.capabilities) {
  assert.equal(capability.schema, CII_TRANSFER_CAPABILITY_SCHEMA);
  assert.equal(capability.writerAdapter, null, capability.id + ' must not install a writer');
  assert.notEqual(capability.lifecycleState, 'WRITE_ADMITTED', 'no contract auto-authorizes writing');
  assert.throws(() => ciiAssertA1NoWrite(capability.id), /WRITE_FAMILY_NOT_ADMITTED/);
}
assert.equal(ciiTransferCapabilityFor('ELEMENT_PROCESS', 'P1').lifecycleState, 'OBSERVATION_ONLY');
assert.equal(ciiTransferCapabilityFor('RESTRAINT', 'RECORD_SET').lifecycleState, 'OBSERVATION_ONLY');
assert.equal(ciiTransferCapabilityFor('NODE_NAME', 'NAME').lifecycleState, 'SHADOW_PLAN');
assert.equal(ciiTransferCapabilityFor('ELEMENT_PROCESS', 'P7'), null);
assert.throws(() => ciiTransferPhysicalEntityRef({ ...nodeSource, sourceId: '' }), /SOURCE_MEMBER_REQUIRED/);
assert.throws(() => ciiTransferPhysicalEntityRef({ ...nodeTarget, sourceId: 'S1' }), /TARGET_CANNOT_HAVE_SOURCE_MEMBER/);
assert.throws(() => ciiTransferPhysicalEntityRef({ ...nodeSource, originalSha256: 'not-a-sha' }), /SHA256_INVALID/);
const source = ciiTransferPhysicalEntityRef(nodeSource);
assert(Object.isFrozen(source));
const delta = observeCiiTransferFamilyDelta({
  snapshotId: 'rawhash+policy-v1', familyKey: 'NODE_NAME', propertyKey: 'NAME',
  source: nodeSource, target: nodeTarget, correspondence: certified(),
  sourceValue: 'SL-115A.4', targetValue: 'PS02412.1',
});
assert.equal(delta.observation, 'CHANGED');
assert.equal(delta.writerReady, false);
assert.equal(delta.executableMutation, null);
assert.equal(delta.scopeDecision, null);
assert(delta.blockers.includes('WRITE_FAMILY_NOT_ADMITTED_IN_ARCH_A1'));
assert(Object.isFrozen(delta));
const wrongManualLock = observeCiiTransferFamilyDelta({
  snapshotId: 'rawhash+policy-v1', familyKey: 'NODE_NAME', propertyKey: 'NAME',
  source: nodeSource, target: nodeTarget,
  correspondence: { ...certified(), status: 'LOCKED' },
  sourceValue: 'SL-115A.4', targetValue: 'PS02412.1',
});
assert.equal(wrongManualLock.observation, 'UNCOMPARABLE', 'manually LOCKED alone is not independent certification');
assert(wrongManualLock.blockers.includes('CERTIFIED_PHYSICAL_CORRESPONDENCE_REQUIRED'));
assert.throws(() => observeCiiTransferFamilyDelta({
  snapshotId: 'x', familyKey: 'OTHER', propertyKey: 'MYSTERY', source: nodeSource, target: nodeTarget,
}), /UNKNOWN_FAMILY_OR_PROPERTY/);

const pSource = { ...nodeSource, entityKind: 'ELEMENT', physicalId: 'E29' };
const pTarget = { ...nodeTarget, entityKind: 'ELEMENT', physicalId: 'E500' };
const observedP1 = observeCiiTransferFamilyDelta({
  snapshotId: 'case-p1', familyKey: 'ELEMENT_PROCESS', propertyKey: 'P1',
  source: pSource, target: pTarget, correspondence: certified(pSource, pTarget),
  sourceValue: 0, targetValue: 12, units: { source: 'kPa', target: 'kPa' }, loadCase: 'P1',
});
assert.equal(observedP1.observation, 'CHANGED', 'zero is a physical numeric value, not blank');
assert.equal(observedP1.sourceValue, 0);
assert.equal(observedP1.writerReady, false);
assert(observedP1.blockers.includes('WRITE_FAMILY_NOT_ADMITTED_IN_ARCH_A1'));
const pTargetPath = {
  ...pTarget, entityKind: 'ELEMENT_PATH', physicalId: 'path-to-E500-E501', pathElementIds: ['E500', 'E501'],
};
const observedPath = observeCiiTransferFamilyDelta({
  snapshotId: 'path-p1', familyKey: 'ELEMENT_PROCESS', propertyKey: 'P1',
  source: pSource, target: pTargetPath, correspondence: certified(pSource, pTargetPath),
  sourceValue: 120, targetValue: 100, units: { source: 'kPa', target: 'kPa' }, loadCase: 'P1',
});
assert.equal(observedPath.observation, 'UNCOMPARABLE', 'multi-segment pressure must not auto-fan out');
assert(observedPath.blockers.includes('PATH_CARDINALITY_POLICY_NOT_ADMITTED'));
const unitMismatch = observeCiiTransferFamilyDelta({
  snapshotId: 'mismatch-p1', familyKey: 'ELEMENT_PROCESS', propertyKey: 'P1',
  source: pSource, target: pTarget, correspondence: certified(pSource, pTarget),
  sourceValue: null, targetValue: 10, units: { source: 'bar', target: 'kPa' }, loadCase: 'P1',
});
assert.equal(unitMismatch.observation, 'UNCOMPARABLE');
assert(unitMismatch.blockers.includes('P1_EXACT_SOURCE_TARGET_UNITS_REQUIRED'));
const caseMismatch = observeCiiTransferFamilyDelta({
  snapshotId: 'case-mismatch', familyKey: 'ELEMENT_PROCESS', propertyKey: 'P1',
  source: pSource, target: pTarget, correspondence: certified(pSource, pTarget),
  sourceValue: 12, targetValue: 10, units: { source: 'bar', target: 'bar' }, loadCase: 'P2',
});
assert(caseMismatch.blockers.includes('P1_LOAD_CASE_CUSTODY_REQUIRED'));
assert.throws(() => ciiTransferPhysicalEntityRef({ ...pTargetPath, pathElementIds: ['E500', 'E500'] }), /PATH_ELEMENT_ID_DUPLICATE/);

const rSource = { ...nodeSource, entityKind: 'NODE_ATTACHED_RECORD', physicalId: 'N420:R1' };
const rTarget = { ...nodeTarget, entityKind: 'NODE_ATTACHED_RECORD', physicalId: 'N415:R2' };
const noRestraintPair = observeCiiTransferFamilyDelta({
  snapshotId: 'restraint-no-pair', familyKey: 'RESTRAINT', propertyKey: 'RECORD_SET',
  source: rSource, target: rTarget, correspondence: certified(rSource, rTarget),
  sourceValue: [{ type: 'Y', gap: 0 }], targetValue: [{ type: 'Y', gap: 3 }],
});
assert.equal(noRestraintPair.observation, 'UNCOMPARABLE');
assert(noRestraintPair.blockers.includes('RESTRAINT_RECORD_PAIRING_REQUIRED'));
assert(noRestraintPair.blockers.includes('RESTRAINT_DIRECTION_FRAME_NOT_QUALIFIED'));
const paired = observeCiiTransferFamilyDelta({
  snapshotId: 'restraint-paired', familyKey: 'RESTRAINT', propertyKey: 'RECORD_SET',
  source: rSource, target: rTarget, correspondence: certified(rSource, rTarget),
  recordPairing: { status: 'QUALIFIED', sourceRecordId: 'R1', targetRecordId: 'R2', directionFrameQualified: true },
  sourceValue: [{ type: 'Y', gap: 0 }], targetValue: [{ type: 'Y', gap: 3 }],
});
assert.equal(paired.observation, 'CHANGED');
assert.equal(paired.writerReady, false);
assert.deepEqual(paired.blockers, ['WRITE_FAMILY_NOT_ADMITTED_IN_ARCH_A1']);
console.log('PASS A1 capability contracts: node identity vs review, namespaces, frozen registry, no writer admission, provisional P1 units/cases/path and restraint record pairing.');
