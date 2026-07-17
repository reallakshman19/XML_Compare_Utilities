import { normalizeSequentialReference } from '../source/sequential-reference-normalization.js';

export const BOUNDARY_REFERENCE_CLASSIFICATIONS = Object.freeze({
  EXTERNAL_REFERENCE_CLASSIFIED: 'EXTERNAL_REFERENCE_CLASSIFIED',
  EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED: 'EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED',
  UNCLASSIFIED: 'UNCLASSIFIED',
});

const EQUIPMENT_REFERENCE_SHAPE = /^\/A-\d{6}(?:[-/][A-Z0-9_.-]+)+$/u;
const DASH_NOZZLE_REFERENCE = /^\/A-\d{6}-(?:TP-\d+|T-\d+|NOZZLE-[A-Z0-9_.-]+|INLET|OUTLET)$/u;
const NAMED_CONNECTION_REFERENCE = /^\/A-\d{6}\/(?:PURGE_CONNECTION|DRAIN_CONNECTION|VENT_CONNECTION|INLET|OUTLET|NOZZLE-[A-Z0-9_.-]+)$/u;
const DIRECTIONAL_EQUIPMENT_PORT = /^\/S-\d+[A-Z]?\/B\/(?:INLET|OUTLET)$/u;

function result(common, status, dialect, basis, confidence) {
  return Object.freeze({
    ...common,
    status,
    dialect,
    basis: Object.freeze(basis),
    confidence,
  });
}

export function classifySequentialBoundaryReference(referenceValue, boundaryRole) {
  const normalized = normalizeSequentialReference(referenceValue);
  const common = {
    schema: 'SequentialBoundaryReferenceClassification.v2',
    boundaryRole: String(boundaryRole || '').toUpperCase(),
    rawReference: normalized.rawReference,
    normalizedReference: normalized.normalizedReference,
    normalizationOperations: normalized.operations,
  };
  if (DASH_NOZZLE_REFERENCE.test(normalized.normalizedReference)) {
    return result(common,
      BOUNDARY_REFERENCE_CLASSIFICATIONS.EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED,
      'AVEVA_CONTROLLED_NOZZLE_REFERENCE',
      ['ANCHORED_EQUIPMENT_REFERENCE', 'CONTROLLED_NOZZLE_SUFFIX'],
      'SOURCE_EXPLICIT');
  }
  if (NAMED_CONNECTION_REFERENCE.test(normalized.normalizedReference)) {
    return result(common,
      BOUNDARY_REFERENCE_CLASSIFICATIONS.EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED,
      'AVEVA_CONTROLLED_CONNECTION_REFERENCE',
      ['ANCHORED_EQUIPMENT_REFERENCE', 'CONTROLLED_CONNECTION_SUFFIX'],
      'SOURCE_EXPLICIT');
  }
  if (DIRECTIONAL_EQUIPMENT_PORT.test(normalized.normalizedReference)) {
    return result(common,
      BOUNDARY_REFERENCE_CLASSIFICATIONS.EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED,
      'AVEVA_DIRECTIONAL_EQUIPMENT_PORT',
      ['ANCHORED_EQUIPMENT_PORT_REFERENCE', 'EXPLICIT_INLET_OUTLET_ROLE'],
      'SOURCE_EXPLICIT');
  }
  if (EQUIPMENT_REFERENCE_SHAPE.test(normalized.normalizedReference)) {
    return result(common,
      BOUNDARY_REFERENCE_CLASSIFICATIONS.EXTERNAL_REFERENCE_CLASSIFIED,
      'AVEVA_EQUIPMENT_REFERENCE_SHAPE',
      ['ANCHORED_EQUIPMENT_REFERENCE', 'PHYSICAL_BOUNDARY_ROLE_NOT_PROVEN'],
      'IDENTITY_ONLY');
  }
  return result(common,
    BOUNDARY_REFERENCE_CLASSIFICATIONS.UNCLASSIFIED,
    null,
    [],
    'UNCLASSIFIED');
}
