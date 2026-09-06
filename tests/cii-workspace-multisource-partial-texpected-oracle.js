import {
  compareOutsideWriter2NodeNameAuthority,
  parseIndependentNodeNameState,
} from './cii-workspace-multisource-texpected-oracle.js';

const ELEMENT_ROWS = 15;
const POINTER_ROW = 13;
const FIELD_PREFIX = 2;
const FIELD_WIDTH = 13;
const POINTER_FIELD = 5;
const NODENAME_FROM_START = 2;
const NODENAME_TO_START = 28;
const NODENAME_END = 53;
const SMART_NAME = /^(?:\/)?\s*(SL|PS)[\s._-]*(\d+)(?:\.(\d+))?\s*(?:\/)?$/i;

function text(value) { return String(value ?? '').trim(); }
function cleanLine(line) { return String(line ?? '').replace(/\r$/, ''); }
function lines(value) { return String(value ?? '').split('\n').map(cleanLine); }
function headerName(line) {
  const match = cleanLine(line).match(/^\s*#\$\s+([^\s]+)/);
  return match ? match[1].toUpperCase() : null;
}
function sectionRows(value, wanted) {
  const target = String(wanted).toUpperCase(); let active = false; const rows = [];
  for (const line of lines(value)) {
    const header = headerName(line);
    if (header) { active = header === target; continue; }
    if (active) rows.push(line);
  }
  return rows;
}
function fixedField(row, index) {
  const start = FIELD_PREFIX + (index * FIELD_WIDTH); const end = start + FIELD_WIDTH;
  return String(row ?? '').padEnd(end, ' ').slice(start, end);
}
function nameField(row, start, end) {
  return String(row ?? '').padEnd(end, ' ').slice(start, end);
}
function normalizeDigits(value) { return String(value || '').replace(/^0+(?=\d)/, '') || '0'; }

export function partialExpectedFamilyKey(value) {
  const match = text(value).match(SMART_NAME);
  return match ? `${String(match[1]).toUpperCase()}-${normalizeDigits(match[2])}` : null;
}
function isFamilyOnly(value) {
  const match = text(value).match(SMART_NAME);
  return Boolean(match && !match[3]);
}
export function partialExpectedNameMatch(actualValue, expectedValue) {
  const actual = text(actualValue); const expected = text(expectedValue);
  if (actual === expected) return Object.freeze({ match: true, kind: 'EXACT', actual, expected });
  const familyMatch = isFamilyOnly(expected)
    && partialExpectedFamilyKey(actual) === partialExpectedFamilyKey(expected);
  return Object.freeze({ match: familyMatch, kind: familyMatch ? 'PARTIAL_EXPECTED_FAMILY' : 'NONE', actual, expected });
}
function comparePartialName(actual, expected, context, differences, familyExpansions) {
  const result = partialExpectedNameMatch(actual, expected);
  if (!result.match) differences.push(Object.freeze({ ...context, actual: result.actual, expected: result.expected }));
  else if (result.kind === 'PARTIAL_EXPECTED_FAMILY') familyExpansions.push(Object.freeze({ ...context, actual: result.actual, expected: result.expected }));
}
function comparePartialEncoding(actualText, expectedText) {
  const differences = []; const familyExpansions = [];
  const actualControl = sectionRows(actualText, 'CONTROL'); const expectedControl = sectionRows(expectedText, 'CONTROL');
  const actualElements = sectionRows(actualText, 'ELEMENTS'); const expectedElements = sectionRows(expectedText, 'ELEMENTS');
  const actualNames = sectionRows(actualText, 'NODENAME'); const expectedNames = sectionRows(expectedText, 'NODENAME');
  if (fixedField(actualControl[0], 3) !== fixedField(expectedControl[0], 3)) differences.push(Object.freeze({ code: 'CONTROL_NONAM_MISMATCH' }));
  if (actualElements.length !== expectedElements.length || actualElements.length % ELEMENT_ROWS !== 0) {
    differences.push(Object.freeze({ code: 'ELEMENT_ROW_COUNT_MISMATCH', actual: actualElements.length, expected: expectedElements.length }));
  } else for (let row = POINTER_ROW; row < actualElements.length; row += ELEMENT_ROWS) {
    if (fixedField(actualElements[row], POINTER_FIELD) !== fixedField(expectedElements[row], POINTER_FIELD)) {
      differences.push(Object.freeze({ code: 'ELEMENT_NODENAME_POINTER_MISMATCH', elementIndex: Math.floor(row / ELEMENT_ROWS) }));
    }
  }
  if (actualNames.length !== expectedNames.length) differences.push(Object.freeze({ code: 'NODENAME_ROW_COUNT_MISMATCH', actual: actualNames.length, expected: expectedNames.length }));
  else for (let index = 0; index < actualNames.length; index += 1) {
    const actualRow = actualNames[index]; const expectedRow = expectedNames[index];
    const fields = [
      ['FROM', NODENAME_FROM_START, NODENAME_TO_START],
      ['TO', NODENAME_TO_START, NODENAME_END],
    ];
    for (const [field, start, end] of fields) {
      const actualField = nameField(actualRow, start, end); const expectedField = nameField(expectedRow, start, end);
      const actualName = actualField.trim(); const expectedName = expectedField.trim();
      comparePartialName(actualName, expectedName, { code: 'NODENAME_NAME_MISMATCH', rowIndex: index, field }, differences, familyExpansions);
      if (actualField !== actualName.padEnd(end - start, ' ')) differences.push(Object.freeze({ code: 'NODENAME_FIELD_ENCODING_MISMATCH', rowIndex: index, field }));
      if (expectedField !== expectedName.padEnd(end - start, ' ')) differences.push(Object.freeze({ code: 'EXPECTED_NODENAME_FIELD_ENCODING_MISMATCH', rowIndex: index, field }));
    }
  }
  return Object.freeze({ differences: Object.freeze(differences), familyExpansions: Object.freeze(familyExpansions) });
}
function comparePartialSemantics(actualText, expectedText) {
  const actual = parseIndependentNodeNameState(actualText); const expected = parseIndependentNodeNameState(expectedText);
  const differences = []; const familyExpansions = [];
  if (actual.controlNodeNameCount !== expected.controlNodeNameCount) differences.push(Object.freeze({ code: 'CONTROL_NONAM_SEMANTIC_MISMATCH', actual: actual.controlNodeNameCount, expected: expected.controlNodeNameCount }));
  if (actual.physicalNodeNameRowCount !== expected.physicalNodeNameRowCount) differences.push(Object.freeze({ code: 'PHYSICAL_NODENAME_ROW_COUNT_MISMATCH', actual: actual.physicalNodeNameRowCount, expected: expected.physicalNodeNameRowCount }));
  if (actual.conflicts.length || expected.conflicts.length) differences.push(Object.freeze({ code: 'NODENAME_STATE_CONFLICT', actual: actual.conflicts.length, expected: expected.conflicts.length }));
  const ids = [...new Set([...actual.names.keys(), ...expected.names.keys()])].sort((a, b) => Number(a) - Number(b));
  for (const nodeId of ids) comparePartialName(actual.names.get(nodeId) || '', expected.names.get(nodeId) || '', { code: 'NODE_NAME_SEMANTIC_MISMATCH', nodeId }, differences, familyExpansions);
  return Object.freeze({ differences: Object.freeze(differences), familyExpansions: Object.freeze(familyExpansions), actual, expected });
}
function structuralNameKey(value) {
  return partialExpectedFamilyKey(value) || `RAW:${text(value).toUpperCase()}`;
}
export function structuralTransferKey(action, target, value) {
  return `${text(action)}|${text(target)}|${structuralNameKey(value)}`;
}
export function expectedStructuralTransferKeys(deltaRows = []) {
  return Object.freeze((deltaRows || []).filter((row) => ['CREATE', 'DELETE'].includes(row.action)).map((row) => {
    const value = row.action === 'CREATE' ? row.newValue : row.oldValue;
    return structuralTransferKey(row.action, row.nodeId, value);
  }).sort());
}
function unslash(value) { return text(value).replace(/^\//, ''); }
function sourceNameSet(sourceText) { return new Set(parseIndependentNodeNameState(sourceText).names.values()); }
function operationTarget(operation) { return text(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId); }
function operationValue(operation) {
  return text(operation?.action === 'CREATE' ? (operation?.proposed ?? operation?.sourceEvidence?.value) : (operation?.before ?? operation?.targetEvidence?.value));
}
function bmExactAliasMatch(operation, bmRows) {
  const sourceName = operationValue(operation); const targetName = text(operation?.targetEvidence?.value ?? operation?.before);
  if (!sourceName || !targetName) return false;
  return (bmRows || []).some((row) => text(row?.targetName) === targetName
    && (row?.sourceNames || []).some((name) => unslash(name) === unslash(sourceName)));
}
export function validateRawMutationIdentity(operations, sourceTextsById, targetText, bmRows = []) {
  const sourceSets = new Map(Object.entries(sourceTextsById || {}).map(([id, value]) => [id, sourceNameSet(value)]));
  const target = parseIndependentNodeNameState(targetText); const errors = [];
  for (const operation of operations || []) {
    const action = text(operation?.action); const sourceId = text(operation?.sourceId);
    const targetId = operationTarget(operation); const value = operationValue(operation);
    if (action === 'CREATE') {
      if (!sourceSets.get(sourceId)?.has(value)) errors.push(Object.freeze({ code: 'CREATE_VALUE_NOT_EXACT_SOURCE_NAME', operationId: operation?.operationId, sourceId, targetId, value }));
      if (bmRows.length && !bmExactAliasMatch(operation, bmRows)) errors.push(Object.freeze({ code: 'CREATE_VALUE_NOT_EXACT_BM_ALIAS_FOR_TARGET', operationId: operation?.operationId, sourceId, targetId, value }));
    } else if (action === 'DELETE' && target.names.get(targetId) !== value) {
      errors.push(Object.freeze({ code: 'DELETE_VALUE_NOT_EXACT_TARGET_PREIMAGE', operationId: operation?.operationId, targetId, value, expected: target.names.get(targetId) || '' }));
    }
  }
  return Object.freeze({ status: errors.length ? 'BLOCKED' : 'READY', errors: Object.freeze(errors) });
}
export function validateAppliedRawIdentity(actualText, operations) {
  const actual = parseIndependentNodeNameState(actualText); const errors = [];
  for (const operation of operations || []) {
    const action = text(operation?.action); const targetId = operationTarget(operation); const value = operationValue(operation);
    if (action === 'CREATE' && actual.names.get(targetId) !== value) errors.push(Object.freeze({ code: 'CREATE_RAW_NAME_NOT_EMITTED_EXACTLY', operationId: operation?.operationId, targetId, value, actual: actual.names.get(targetId) || '' }));
    if (action === 'DELETE' && actual.names.get(targetId) === value) errors.push(Object.freeze({ code: 'DELETE_RAW_NAME_STILL_PRESENT', operationId: operation?.operationId, targetId, value }));
  }
  return Object.freeze({ status: errors.length ? 'BLOCKED' : 'READY', errors: Object.freeze(errors) });
}
export function evaluatePartialTExpectedPostimage(beforeText, actualText, partialExpectedText) {
  const encoding = comparePartialEncoding(actualText, partialExpectedText);
  const semantics = comparePartialSemantics(actualText, partialExpectedText);
  const preservation = compareOutsideWriter2NodeNameAuthority(beforeText, actualText);
  const status = !encoding.differences.length && !semantics.differences.length && preservation.status === 'READY' ? 'READY' : 'BLOCKED';
  return Object.freeze({ status, encoding, semantics, preservation });
}

export const _test = Object.freeze({ sectionRows, fixedField, isFamilyOnly, structuralNameKey, bmExactAliasMatch });
