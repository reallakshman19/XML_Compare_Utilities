/** Explicit source-bound declaration for missing Revision Compare visual metadata. */
import { cleanText, deepFreeze, deterministicId } from './revision-contract-utils.js';

export const REVISION_VISUAL_METADATA_DECLARATION_SCHEMA = 'RevisionVisualMetadataDeclaration.v1';

const FIELD_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'unit', label: 'Unit' }),
  Object.freeze({ key: 'coordinateFrame', label: 'Coordinate frame' }),
  Object.freeze({ key: 'verticalAxis', label: 'Vertical axis' }),
]);

function declared(value) {
  const text = cleanText(value);
  return text && text.toUpperCase() !== 'UNKNOWN' ? text.toUpperCase() : 'UNKNOWN';
}

function sourceValue(document, key) {
  return declared(document?.[key]);
}

function requiredValue(values, field) {
  const value = cleanText(values?.[field.key]);
  if (!value) throw new TypeError(`${field.label} is required.`);
  return value.toUpperCase();
}

function sourceHashes(revA, revB) {
  const revAContentHash = cleanText(revA?.sourceHash);
  const revBContentHash = cleanText(revB?.sourceHash);
  if (!revAContentHash || !revBContentHash) throw new TypeError('Both revision content hashes are required.');
  return { revAContentHash, revBContentHash };
}

function equivalent(left, right) {
  return left.toUpperCase() === right.toUpperCase();
}

function hasMissingSourceMetadata(revA, revB) {
  return FIELD_DEFINITIONS.some((field) => sourceValue(revA, field.key) === 'UNKNOWN'
    || sourceValue(revB, field.key) === 'UNKNOWN');
}

function assertSourceCompatibility(revA, revB, values) {
  for (const field of FIELD_DEFINITIONS) {
    const left = sourceValue(revA, field.key);
    const right = sourceValue(revB, field.key);
    const proposed = values[field.key];
    if (left !== 'UNKNOWN' && right !== 'UNKNOWN' && !equivalent(left, right)) {
      throw new Error(`${field.label} is already incompatible in the source documents: ${left} vs ${right}.`);
    }
    if (left !== 'UNKNOWN' && !equivalent(left, proposed)) {
      throw new Error(`${field.label} declaration conflicts with Rev A source metadata (${left}).`);
    }
    if (right !== 'UNKNOWN' && !equivalent(right, proposed)) {
      throw new Error(`${field.label} declaration conflicts with Rev B source metadata (${right}).`);
    }
  }
}

function normalizedValues(values) {
  return Object.fromEntries(FIELD_DEFINITIONS.map((field) => [field.key, requiredValue(values, field)]));
}

function coverage(revA, revB) {
  return Object.freeze(Object.fromEntries(FIELD_DEFINITIONS.map((field) => [field.key, deepFreeze({
    revA: sourceValue(revA, field.key) === 'UNKNOWN' ? 'OPERATOR_DECLARATION' : 'SOURCE',
    revB: sourceValue(revB, field.key) === 'UNKNOWN' ? 'OPERATOR_DECLARATION' : 'SOURCE',
  })])));
}

function assertDeclarationValues(revA, revB, values) {
  if (!hasMissingSourceMetadata(revA, revB)) throw new Error('Source documents already declare complete visual metadata.');
  if (!['X', 'Y', 'Z'].includes(values.verticalAxis)) throw new RangeError('Vertical axis must be X, Y, or Z.');
  assertSourceCompatibility(revA, revB, values);
}

export async function createRevisionVisualMetadataDeclaration(revA, revB, values, cryptoRef) {
  const normalized = normalizedValues(values);
  assertDeclarationValues(revA, revB, normalized);
  const identity = {
    schema: REVISION_VISUAL_METADATA_DECLARATION_SCHEMA,
    ...sourceHashes(revA, revB),
    ...normalized,
    authority: 'OPERATOR_DECLARATION_FOR_MISSING_SOURCE_METADATA',
    sourceCoverage: coverage(revA, revB),
  };
  return deepFreeze({ ...identity, declarationId: await deterministicId('visual-metadata', identity, cryptoRef) });
}

export function revisionVisualMetadataDeclarationMatches(declaration, revA, revB) {
  if (!declaration || declaration.schema !== REVISION_VISUAL_METADATA_DECLARATION_SCHEMA) return false;
  try {
    const hashes = sourceHashes(revA, revB);
    const values = normalizedValues(declaration);
    assertDeclarationValues(revA, revB, values);
    return declaration.revAContentHash === hashes.revAContentHash
      && declaration.revBContentHash === hashes.revBContentHash;
  } catch {
    return false;
  }
}

function effectiveValue(document, declaration, field) {
  const value = sourceValue(document, field.key);
  if (value !== 'UNKNOWN') return Object.freeze({ value, origin: 'SOURCE' });
  const declaredValue = declared(declaration?.[field.key]);
  return Object.freeze({ value: declaredValue, origin: declaredValue === 'UNKNOWN' ? 'UNKNOWN' : 'OPERATOR_DECLARATION' });
}

function compatibility(field, left, right, declarationId) {
  let status = 'COMPATIBLE';
  if (left.value === 'UNKNOWN' || right.value === 'UNKNOWN') status = 'UNKNOWN';
  else if (!equivalent(left.value, right.value)) status = 'INCOMPATIBLE';
  const core = { status, revA: left.value, revB: right.value, label: field.label };
  const declaredEvidence = left.origin === 'OPERATOR_DECLARATION' || right.origin === 'OPERATOR_DECLARATION';
  return deepFreeze(declaredEvidence ? {
    ...core, revAOrigin: left.origin, revBOrigin: right.origin, declarationId,
  } : core);
}

export function resolveRevisionVisualMetadata(revA, revB, declaration) {
  const errors = [];
  const usable = declaration && revisionVisualMetadataDeclarationMatches(declaration, revA, revB);
  if (declaration && !usable) errors.push('Visual metadata declaration is invalid or does not match the current revision content hashes.');
  const active = usable ? declaration : null;
  const items = FIELD_DEFINITIONS.map((field) => compatibility(
    field, effectiveValue(revA, active, field), effectiveValue(revB, active, field), active?.declarationId,
  ));
  const notes = items.filter((item) => item.revAOrigin === 'OPERATOR_DECLARATION' || item.revBOrigin === 'OPERATOR_DECLARATION')
    .map((item) => `${item.label} compatibility includes explicit operator-declared evidence; source files remain unchanged.`);
  return deepFreeze({
    unitCompatibility: items[0], coordinateFrameCompatibility: items[1], verticalAxisCompatibility: items[2],
    declaration: active, errors: Object.freeze(errors), notes: Object.freeze(notes),
  });
}

function defaultValue(revA, revB, field) {
  const left = sourceValue(revA, field.key);
  const right = sourceValue(revB, field.key);
  if (left !== 'UNKNOWN' && right === 'UNKNOWN') return left;
  if (right !== 'UNKNOWN' && left === 'UNKNOWN') return right;
  return left !== 'UNKNOWN' && equivalent(left, right) ? left : '';
}

export function revisionVisualMetadataDeclarationModel(state) {
  const revA = state?.slots?.baseline?.document;
  const revB = state?.slots?.candidate?.document;
  if (!revA || !revB) return deepFreeze({ status: 'UNAVAILABLE', visible: false, blockers: Object.freeze([]) });
  const declaration = state.visualMetadataDeclaration ?? state.basis?.visualMetadataDeclaration ?? null;
  const resolved = resolveRevisionVisualMetadata(revA, revB, declaration);
  const items = [resolved.unitCompatibility, resolved.coordinateFrameCompatibility, resolved.verticalAxisCompatibility];
  const incompatible = items.filter((item) => item.status === 'INCOMPATIBLE');
  const unknown = items.filter((item) => item.status === 'UNKNOWN');
  const status = incompatible.length ? 'BLOCKED' : (resolved.declaration ? 'APPLIED' : (unknown.length ? 'REQUIRED' : 'NOT_REQUIRED'));
  return deepFreeze({
    status, visible: status !== 'NOT_REQUIRED', declaration: resolved.declaration,
    defaults: Object.fromEntries(FIELD_DEFINITIONS.map((field) => [field.key, defaultValue(revA, revB, field)])),
    blockers: Object.freeze([...resolved.errors, ...incompatible.map((item) => `${item.label} mismatch: ${item.revA} vs ${item.revB}.`)]),
    unknownFields: Object.freeze(unknown.map((item) => item.label)),
  });
}

export function clearRevisionVisualMetadataDeclaration(state) {
  return state?.visualMetadataDeclaration ? deepFreeze({ ...state, visualMetadataDeclaration: null }) : state;
}
