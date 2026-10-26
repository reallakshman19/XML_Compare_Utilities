/* WBS4 E1 — local-only stored source evidence, NOT effective CAESAR engineering values. */
import { createHash } from 'node:crypto';
import { readOnlyCatalog } from './readonly-catalog.mjs';

const FIELD_SPEC = Object.freeze([
  ['TEMPERATURE_1', 10, ['ACTIVE_ALPHA_TOLERANCE', 'MATERIAL_EXPANSION_EDITION', 'ORIGINAL_JOB_OPERATING_CASE']],
  ['PRESSURE_1', 19, ['ORIGINAL_JOB_UNITS_AND_PRESSURE_CASE', 'ACTUAL_STATIC_OR_HYDRO_CASE']],
  ['FLUID_DENSITY', 32, ['ORIGINAL_JOB_DENSITY_UNITS', 'BASIC_LOAD_CASE_FDM']],
]);
const RIGID_MISSING = Object.freeze([
  'NATIVE_V14_RIGID_UNIT_SELECTOR', 'NATIVE_RIGID_FLUID_INSULATION_RULES',
  'ORIGINAL_JOB_LOAD_CASE',
]);
const TYPE_MISSING = Object.freeze([
  'NATIVE_V14_RIGID_TYPE_INTERPRETATION', 'TYPE_ROUNDTRIP_SOURCE_AUTHORITY',
]);
const fail = (code) => { throw Error(code); };

function recovered(bytes, slot) {
  if (!slot || !Number.isSafeInteger(slot.byteStart) ||
      !Number.isSafeInteger(slot.byteEnd) || slot.byteStart < 0 ||
      slot.byteEnd !== slot.byteStart + 13 || slot.byteEnd > bytes.length) {
    fail('FIVE_FIELD_INVALID_SPAN');
  }
  const physical = Buffer.from(bytes.subarray(slot.byteStart, slot.byteEnd)).toString('latin1');
  if (physical !== slot.lexeme) fail('FIVE_FIELD_LEXEME_MISMATCH');
  return {
    ordinal: slot.ordinal ?? null, byteSpan: {start: slot.byteStart, end: slot.byteEnd},
    lexeme: physical, numericValue: slot.value, storage: 'STORED_ONLY',
  };
}

function evidenceValue(bytes, name, slot, missingEvidence) {
  return {
    field: name,
    presence: slot ? 'STORED_RECORD' : 'ABSENT_ASSOCIATED_RECORD',
    source: slot ? recovered(bytes, slot) : null,
    effective: 'EFFECTIVE_UNKNOWN',
    missingEvidence: [...missingEvidence],
  };
}

// A numeric pointer can be integer-valued while its neutral I13 token is invalid.
// Validate every physical owner, not only the selected ELEMENT, before trusting
// the catalogue's shared-RIGID owner map. PR168 remains separately owned.
function validateRigidPointers(bytes, catalog) {
  for (const element of catalog.elements) {
    const slot = element.pointers[1];
    if (!slot || slot.byteEnd - slot.byteStart !== 13 ||
        slot.byteStart < 0 || slot.byteEnd > bytes.length) {
      fail('FIVE_FIELD_RIGID_POINTER_I13');
    }
    const token = Buffer.from(bytes.subarray(slot.byteStart, slot.byteEnd)).toString('latin1');
    if (!/^[+-]?[0-9]+$/.test(token.trim())) fail('FIVE_FIELD_RIGID_POINTER_I13');
  }
}

function rigidAssociation(bytes, selected, catalog) {
  const slot = selected.pointers[1];
  const pointerLexeme = Buffer.from(bytes.subarray(slot.byteStart, slot.byteEnd)).toString('latin1');
  const pointerToken = pointerLexeme.trim();
  if (!/^[+-]?[0-9]+$/.test(pointerToken) ||
      !Number.isSafeInteger(slot.pointer) ||
      BigInt(pointerToken) !== BigInt(slot.pointer)) fail('FIVE_FIELD_RIGID_POINTER_I13');
  const base = {
    pointerOrdinal: 2, pointerValue: slot.pointer,
    pointerByteSpan: {start: slot.byteStart, end: slot.byteEnd},
    pointerLexeme, association: slot.pointer === 0 ? 'ABSENT' : 'PRESENT',
    referencedRecordOrdinal: slot.pointer || null,
  };
  if (!slot.pointer) return {...base, owners: [], shared: false, record: null};
  const record = catalog.rigids[slot.pointer - 1];
  if (!record || !record.owners.includes(selected.index)) fail('FIVE_FIELD_RIGID_OWNERSHIP');
  return {
    ...base, owners: [...record.owners], shared: record.owners.length > 1,
    record: {weight: recovered(bytes, record.weight), type: recovered(bytes, record.type)},
  };
}

/** Input selected by zero-based physical ELEMENT ordinal; never node or matched TARGET identity. */
export function inspectFiveFieldEvidence(bytes, {elementIndex} = {}) {
  if (!(bytes instanceof Uint8Array)) fail('FIVE_FIELD_BYTES_REQUIRED');
  const catalog = readOnlyCatalog(bytes);
  validateRigidPointers(bytes, catalog);
  if (!Number.isSafeInteger(elementIndex) || elementIndex < 0 ||
      elementIndex >= catalog.elementCount) fail('FIVE_FIELD_OCCURRENCE_RANGE');
  const selected = catalog.elements[elementIndex];
  const association = rigidAssociation(bytes, selected, catalog);
  const fields = FIELD_SPEC.map(([name, ordinal, missing]) =>
    evidenceValue(bytes, name, selected.reals[ordinal - 1], missing));
  fields.push(evidenceValue(bytes, 'RIGID.WEIGHT',
    association.record ? catalog.rigids[association.pointerValue - 1].weight : null,
    RIGID_MISSING));
  fields.push(evidenceValue(bytes, 'RIGID.TYPE',
    association.record ? catalog.rigids[association.pointerValue - 1].type : null,
    TYPE_MISSING));
  return {
    classification: 'LOCAL_ONLY_PRIVATE_EVIDENCE',
    format: 'CAESAR_II_V14_NEUTRAL', sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    occurrence: {indexZeroBased: selected.index, ordinalOneBased: selected.index + 1,
      fromNode: selected.from, toNode: selected.to,
      elementName: selected.elementName, branchLabel: selected.branch},
    rigidAssociation: association, fields,
    transferAuthority: 'NONE', nativeCaesarValidation: 'NOT_RUN',
    sourceTargetCorrespondence: 'NOT_ESTABLISHED',
    limitations: ['ORIGINAL_JOB_CONFIGURATION_NOT_BOUND', 'NO_EFFECTIVE_ENGINEERING_INFERENCE',
      ...(association.shared ? ['SHARED_RIGID_OWNERSHIP'] : [])],
  };
}

/** Intentional privacy whitelist: no customer values, counts, spans, IDs or digests. */
export function publicFiveFieldSummary(report) {
  if (!report || report.classification !== 'LOCAL_ONLY_PRIVATE_EVIDENCE' ||
      !Array.isArray(report.fields) || report.fields.length !== 5 ||
      report.fields.some(f => f.effective !== 'EFFECTIVE_UNKNOWN')) {
    fail('FIVE_FIELD_UNQUALIFIED_REPORT');
  }
  return {
    schema: 'ciifr-five-field-public/v1',
    classification: 'PUBLIC_SAFE_NO_MODEL_DATA',
    fieldStatuses: [
      {field: 'TEMPERATURE_1', effective: 'EFFECTIVE_UNKNOWN'},
      {field: 'PRESSURE_1', effective: 'EFFECTIVE_UNKNOWN'},
      {field: 'FLUID_DENSITY', effective: 'EFFECTIVE_UNKNOWN'},
      {field: 'RIGID.WEIGHT', effective: 'EFFECTIVE_UNKNOWN'},
      {field: 'RIGID.TYPE', effective: 'EFFECTIVE_UNKNOWN'},
    ],
    blockerClasses: ['JOB_CONFIG_AND_MATERIAL_EDITION', 'BASIC_CASE_AND_FDM',
      'RIGID_NATIVE_INTERPRETATION'],
    sourceQualification: 'PHYSICAL_ONLY',
    transferAuthority: 'NONE', nativeCaesarValidation: 'NOT_RUN',
  };
}
