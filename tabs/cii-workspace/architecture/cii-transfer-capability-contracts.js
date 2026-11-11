/**
 * ARCH-01/A1: typed, immutable, NOT-WIRED read-only transfer capabilities.
 * Registration or a CERTIFIED node/edge alone never confers writer authority.
 * Existing Writer1A/1B/1C/2 are deliberately not imported or called.
 */
export const CII_TRANSFER_CAPABILITY_SCHEMA = 'CiiTransferFamilyCapability.v1';
export const CII_TRANSFER_OBSERVATION_SCHEMA = 'CiiTransferObservation.v1';
export const CII_TRANSFER_CATALOG_SCHEMA = 'CiiTransferCapabilityCatalog.v1';

const SHA256 = /^[0-9a-f]{64}$/i;
const text = (v) => String(v ?? '').trim();
const entityKinds = Object.freeze(['NODE', 'ELEMENT', 'ELEMENT_PATH', 'NODE_ATTACHED_RECORD']);
const states = Object.freeze(['CATALOG_ONLY', 'OBSERVATION_ONLY', 'SHADOW_PLAN', 'WRITE_ADMITTED']);
const blocked = 'WRITE_FAMILY_NOT_ADMITTED_IN_ARCH_A1';
const nonWritable = 'ARCH_A1_NO_WRITER_DISPATCH_IMPLEMENTED';

function frozen(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(frozen));
  if (value && typeof value === 'object') return Object.freeze(
    Object.fromEntries(Object.entries(value).map(([key, item]) => [key, frozen(item)])),
  );
  return value;
}
function identifier(value, label) {
  const id = text(value);
  if (!id) throw new Error('CII_TRANSFER_' + label + '_REQUIRED');
  return id;
}
function hash(value, label) {
  const actual = identifier(value, label);
  if (!SHA256.test(actual)) throw new Error('CII_TRANSFER_' + label + '_SHA256_INVALID');
  return actual.toLowerCase();
}
function unique(items, label) {
  if (new Set(items).size !== items.length) throw new Error('CII_TRANSFER_' + label + '_DUPLICATE');
  return Object.freeze(items);
}
export function ciiTransferPhysicalEntityRef(input = {}) {
  const side = identifier(input.side, 'ENTITY_SIDE');
  if (!['SOURCE', 'TARGET'].includes(side)) throw new Error('CII_TRANSFER_ENTITY_SIDE_INVALID');
  const kind = identifier(input.entityKind, 'ENTITY_KIND');
  if (!entityKinds.includes(kind)) throw new Error('CII_TRANSFER_ENTITY_KIND_UNSUPPORTED');
  const sourceId = side === 'SOURCE' ? identifier(input.sourceId, 'SOURCE_MEMBER') : null;
  if (side === 'TARGET' && text(input.sourceId)) throw new Error('CII_TRANSFER_TARGET_CANNOT_HAVE_SOURCE_MEMBER');
  const originalSha256 = hash(input.originalSha256, 'ENTITY_ORIGINAL');
  const physicalId = identifier(input.physicalId, 'PHYSICAL_ID');
  const pathElementIds = kind === 'ELEMENT_PATH'
    ? unique((input.pathElementIds || []).map((v) => identifier(v, 'PATH_ELEMENT_ID')), 'PATH_ELEMENT_ID')
    : Object.freeze([]);
  if (kind === 'ELEMENT_PATH' && !pathElementIds.length) throw new Error('CII_TRANSFER_PATH_ELEMENTS_REQUIRED');
  if (kind !== 'ELEMENT_PATH' && input.pathElementIds?.length) throw new Error('CII_TRANSFER_PATH_ON_NON_PATH_ENTITY');
  return frozen({
    schema: 'CiiPhysicalEntityRef.v1', side, sourceId, originalSha256, entityKind: kind,
    physicalId, pathElementIds,
  });
}
function capability(input) {
  const familyKey = identifier(input.familyKey, 'FAMILY');
  const propertyKey = identifier(input.propertyKey, 'PROPERTY');
  const lifecycleState = identifier(input.lifecycleState, 'LIFECYCLE');
  if (!states.includes(lifecycleState)) throw new Error('CII_TRANSFER_LIFECYCLE_INVALID');
  if (!Array.isArray(input.entityKinds) || input.entityKinds.some((kind) => !entityKinds.includes(kind))) {
    throw new Error('CII_TRANSFER_CAPABILITY_ENTITY_KINDS_INVALID');
  }
  if (!input.entityKinds.length) throw new Error('CII_TRANSFER_CAPABILITY_ENTITY_KINDS_REQUIRED');
  const id = familyKey + '.' + propertyKey;
  const family = {
    schema: CII_TRANSFER_CAPABILITY_SCHEMA, id, familyKey, propertyKey,
    displayName: identifier(input.displayName, 'DISPLAY_NAME'),
    entityKinds: unique([...input.entityKinds], 'CAPABILITY_ENTITY_KIND'),
    lifecycleState, identityProof: identifier(input.identityProof, 'IDENTITY_PROOF'),
    cardinalityPolicy: identifier(input.cardinalityPolicy, 'CARDINALITY_POLICY'),
    valueKind: identifier(input.valueKind, 'VALUE_KIND'),
    requiredLoadCase: input.requiredLoadCase ?? null,
    requiresRecordPairing: input.requiresRecordPairing === true,
    writerAdapter: null, writerAdmission: nonWritable,
    policyVersion: identifier(input.policyVersion, 'POLICY_VERSION'),
  };
  // ARCH-A1 is deliberately not a generic writer factory, even for SHADOW_PLAN.
  if (family.lifecycleState === 'WRITE_ADMITTED') throw new Error('CII_TRANSFER_A1_WRITE_ADMISSION_FORBIDDEN');
  return frozen(family);
}
const DEFAULT_CAPABILITIES = Object.freeze([
  capability({
    familyKey: 'NODE_NAME', propertyKey: 'NAME', displayName: 'Node Name / to-name',
    entityKinds: ['NODE'], lifecycleState: 'SHADOW_PLAN', identityProof: 'CERTIFIED_NODE',
    cardinalityPolicy: 'EXACT_TARGET_NODENAME_FIELD', valueKind: 'STRING', policyVersion: 'a1-1',
  }),
  capability({
    familyKey: 'RESTRAINT', propertyKey: 'RECORD_SET', displayName: 'Restraint attached record set',
    entityKinds: ['NODE_ATTACHED_RECORD'], lifecycleState: 'OBSERVATION_ONLY',
    identityProof: 'CERTIFIED_HOST_NODE_AND_RESTRAINT_RECORD_PAIRING',
    cardinalityPolicy: 'EXACT_RECORD_SLOT_OR_BLOCKED', valueKind: 'RECORD_SET',
    requiresRecordPairing: true, policyVersion: 'a1-1',
  }),
  capability({
    familyKey: 'ELEMENT_PROCESS', propertyKey: 'P1', displayName: 'Element Pressure 1',
    entityKinds: ['ELEMENT', 'ELEMENT_PATH'], lifecycleState: 'OBSERVATION_ONLY',
    identityProof: 'CERTIFIED_ELEMENT_OR_EXPLICIT_ORDERED_PATH',
    cardinalityPolicy: 'ELEMENT_PATH_MULTISEGMENT_WRITE_DENIED', valueKind: 'NUMBER',
    requiredLoadCase: 'P1', policyVersion: 'a1-1',
  }),
]);
export const CII_TRANSFER_ARCH_A1_CATALOG = frozen({
  schema: CII_TRANSFER_CATALOG_SCHEMA,
  catalogVersion: 'arch-01-a1-provisional-1',
  writerDispatchInstalled: false,
  capabilities: DEFAULT_CAPABILITIES,
});

export function ciiTransferCapabilityFor(familyKey, propertyKey, catalog = CII_TRANSFER_ARCH_A1_CATALOG) {
  if (catalog?.schema !== CII_TRANSFER_CATALOG_SCHEMA) throw new Error('CII_TRANSFER_CATALOG_SCHEMA_REQUIRED');
  const entries = catalog.capabilities || [];
  const ids = entries.map((item) => identifier(item.id, 'CAPABILITY_ID'));
  unique(ids, 'CAPABILITY_ID');
  return entries.find((item) => item.familyKey === familyKey && item.propertyKey === propertyKey) || null;
}
export function ciiAssertA1NoWrite(capabilityId) {
  // No service dependency on a writer is installed anywhere in ARCH-A1.
  throw new Error(blocked + ':' + identifier(capabilityId, 'CAPABILITY_ID'));
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function observeCiiTransferFamilyDelta(input = {}) {
  const cap = ciiTransferCapabilityFor(input.familyKey, input.propertyKey);
  if (!cap) throw new Error('CII_TRANSFER_UNKNOWN_FAMILY_OR_PROPERTY');
  const source = ciiTransferPhysicalEntityRef(input.source);
  const target = ciiTransferPhysicalEntityRef(input.target);
  if (source.side !== 'SOURCE' || target.side !== 'TARGET') throw new Error('CII_TRANSFER_SOURCE_TARGET_SIDES_REQUIRED');
  if (!cap.entityKinds.includes(source.entityKind) || !cap.entityKinds.includes(target.entityKind)) {
    throw new Error('CII_TRANSFER_FAMILY_ENTITY_KIND_NOT_ALLOWED');
  }
  if (source.entityKind !== target.entityKind && !(cap.id === 'ELEMENT_PROCESS.P1' && source.entityKind === 'ELEMENT' && target.entityKind === 'ELEMENT_PATH')) {
    throw new Error('CII_TRANSFER_ENTITY_KIND_MISMATCH');
  }
  const snapshotId = identifier(input.snapshotId, 'SNAPSHOT_ID');
  const evidence = input.correspondence || {};
  const blockers = [];
  if (evidence.status !== 'CERTIFIED' || !text(evidence.certificateId) || !text(evidence.evidenceDigest)) {
    blockers.push('CERTIFIED_PHYSICAL_CORRESPONDENCE_REQUIRED');
  }
  if (text(evidence.sourcePhysicalId) !== source.physicalId || text(evidence.targetPhysicalId) !== target.physicalId) {
    blockers.push('CERTIFICATE_PHYSICAL_ENTITY_CUSTODY_MISMATCH');
  }
  if (cap.id === 'ELEMENT_PROCESS.P1') {
    const units = input.units || {};
    if (!text(units.source) || !text(units.target) || text(units.source) !== text(units.target)) {
      blockers.push('P1_EXACT_SOURCE_TARGET_UNITS_REQUIRED');
    }
    if (input.loadCase !== 'P1') blockers.push('P1_LOAD_CASE_CUSTODY_REQUIRED');
    if (source.entityKind === 'ELEMENT_PATH' || (target.entityKind === 'ELEMENT_PATH' && target.pathElementIds.length > 1)) {
      blockers.push('PATH_CARDINALITY_POLICY_NOT_ADMITTED');
    }
    for (const value of [input.sourceValue, input.targetValue]) {
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
        blockers.push('P1_NUMERIC_VALUE_REQUIRED');
      }
    }
  }
  if (cap.id === 'RESTRAINT.RECORD_SET') {
    if (input.recordPairing?.status !== 'QUALIFIED'
      || !text(input.recordPairing?.sourceRecordId) || !text(input.recordPairing?.targetRecordId)) {
      blockers.push('RESTRAINT_RECORD_PAIRING_REQUIRED');
    }
    if (input.recordPairing?.directionFrameQualified !== true) blockers.push('RESTRAINT_DIRECTION_FRAME_NOT_QUALIFIED');
    if (!Array.isArray(input.sourceValue) || !Array.isArray(input.targetValue)) blockers.push('RESTRAINT_RECORD_SET_REQUIRED');
  }
  if (cap.id === 'NODE_NAME' && (typeof input.sourceValue !== 'string' || typeof input.targetValue !== 'string')) {
    blockers.push('NODENAME_EXACT_STRING_VALUES_REQUIRED');
  }
  const changed = !equal(input.sourceValue, input.targetValue);
  return frozen({
    schema: CII_TRANSFER_OBSERVATION_SCHEMA, snapshotId, capabilityId: cap.id,
    policyVersion: cap.policyVersion, lifecycleState: cap.lifecycleState,
    source, target, certificateId: text(evidence.certificateId) || null,
    observation: blockers.length ? 'UNCOMPARABLE' : changed ? 'CHANGED' : 'UNCHANGED',
    sourceValue: input.sourceValue, targetValue: input.targetValue,
    blockers: unique([...new Set(blockers), blocked], 'OBSERVATION_BLOCKER'),
    writerReady: false, executableMutation: null, scopeDecision: null,
  });
}
