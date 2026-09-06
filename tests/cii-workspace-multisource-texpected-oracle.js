const ELEMENT_ROWS = 15;
const POINTER_ROW = 13;
const FIELD_PREFIX = 2;
const FIELD_WIDTH = 13;
const POINTER_FIELD = 5;
const NODENAME_FROM_START = 2;
const NODENAME_TO_START = 28;
const NODENAME_END = 53;

function cleanLine(line) { return String(line ?? '').replace(/\r$/, ''); }
function lines(text) { return String(text ?? '').split('\n').map(cleanLine); }
function headerName(line) {
  const match = cleanLine(line).match(/^\s*#\$\s+([^\s]+)/);
  return match ? match[1].toUpperCase() : null;
}
function sectionRows(text, wanted) {
  const all = lines(text); const target = String(wanted).toUpperCase(); let active = false; const rows = [];
  for (const line of all) {
    const header = headerName(line);
    if (header) { active = header === target; continue; }
    if (active) rows.push(line);
  }
  return rows;
}
function numericToken(value) { return String(value ?? '').trim().replace(/[dD]/g, 'E'); }
function numericField(row, index) {
  const start = FIELD_PREFIX + (index * FIELD_WIDTH);
  return numericToken(String(row ?? '').padEnd(start + FIELD_WIDTH, ' ').slice(start, start + FIELD_WIDTH));
}
function finiteField(row, index) {
  const value = Number(numericField(row, index));
  return Number.isFinite(value) ? value : null;
}
function integerField(row, index) {
  const value = finiteField(row, index);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function nodeId(value) { return String(Math.round(Number(value))); }
function namePair(row) {
  const padded = String(row ?? '').padEnd(NODENAME_END, ' ');
  return Object.freeze({
    fromName: padded.slice(NODENAME_FROM_START, NODENAME_TO_START).trim(),
    toName: padded.slice(NODENAME_TO_START, NODENAME_END).trim(),
  });
}
function assignName(names, conflicts, id, name, evidence) {
  if (!name) return;
  const previous = names.get(id);
  if (previous && previous !== name) {
    conflicts.push(Object.freeze({ nodeId: id, previous, next: name, ...evidence }));
    return;
  }
  names.set(id, name);
}
function controlNodeNameCount(text) {
  const rows = sectionRows(text, 'CONTROL');
  return rows.length ? integerField(rows[0], 3) : null;
}

export function parseIndependentNodeNameState(text) {
  const elementRows = sectionRows(text, 'ELEMENTS');
  const nodeNameRows = sectionRows(text, 'NODENAME');
  const names = new Map(); const conflicts = []; const elements = [];
  if (elementRows.length % ELEMENT_ROWS !== 0) throw new Error('ORACLE_ELEMENT_ROW_COUNT_NOT_MULTIPLE_OF_15');
  for (let offset = 0, index = 0; offset < elementRows.length; offset += ELEMENT_ROWS, index += 1) {
    const fromValue = finiteField(elementRows[offset], 0); const toValue = finiteField(elementRows[offset], 1);
    const pointer = integerField(elementRows[offset + POINTER_ROW], POINTER_FIELD);
    if (fromValue === null || toValue === null || pointer === null) throw new Error(`ORACLE_ELEMENT_PARSE_FAILED:${index}`);
    const from = nodeId(fromValue); const to = nodeId(toValue);
    if (pointer > nodeNameRows.length) throw new Error(`ORACLE_NODENAME_POINTER_OUT_OF_RANGE:${index}:${pointer}`);
    const pair = pointer ? namePair(nodeNameRows[pointer - 1]) : { fromName: '', toName: '' };
    elements.push(Object.freeze({ index, from, to, pointer, fromName: pair.fromName, toName: pair.toName }));
    assignName(names, conflicts, from, pair.fromName, { elementIndex: index, end: 'FROM', pointer });
    assignName(names, conflicts, to, pair.toName, { elementIndex: index, end: 'TO', pointer });
  }
  return Object.freeze({
    names,
    conflicts: Object.freeze(conflicts),
    elements: Object.freeze(elements),
    physicalNodeNameRowCount: nodeNameRows.length,
    controlNodeNameCount: controlNodeNameCount(text),
  });
}

export function deriveExpectedNodeNameDelta(beforeText, expectedText) {
  const before = parseIndependentNodeNameState(beforeText);
  const expected = parseIndependentNodeNameState(expectedText);
  const ids = [...new Set([...before.names.keys(), ...expected.names.keys()])]
    .sort((a, b) => Number(a) - Number(b));
  const rows = ids.flatMap((id) => {
    const oldValue = before.names.get(id) || ''; const newValue = expected.names.get(id) || '';
    if (oldValue === newValue) return [];
    const action = !oldValue && newValue ? 'CREATE' : (oldValue && !newValue ? 'DELETE' : 'REPLACE');
    return [Object.freeze({ nodeId: id, action, oldValue, newValue })];
  });
  return Object.freeze({ before, expected, rows: Object.freeze(rows) });
}

export function deriveExactNameRelocations(deltaRows) {
  const deleted = new Map(); const created = new Map();
  for (const row of deltaRows || []) {
    const value = row.action === 'DELETE' ? row.oldValue : (row.action === 'CREATE' ? row.newValue : '');
    if (!value) continue;
    const bucket = row.action === 'DELETE' ? deleted : created;
    if (!bucket.has(value)) bucket.set(value, []);
    bucket.get(value).push(row.nodeId);
  }
  const rows = [];
  for (const [name, fromIds] of deleted) {
    const toIds = created.get(name) || [];
    if (fromIds.length === 1 && toIds.length === 1) rows.push(Object.freeze({ name, fromNodeId: fromIds[0], toNodeId: toIds[0] }));
  }
  return Object.freeze(rows.sort((a, b) => Number(a.fromNodeId) - Number(b.fromNodeId)));
}

export function expectedTransferKeys(deltaRows) {
  return Object.freeze((deltaRows || []).filter((row) => ['CREATE', 'DELETE'].includes(row.action))
    .map((row) => `${row.action}|${row.nodeId}|${row.action === 'CREATE' ? row.newValue : row.oldValue}`)
    .sort());
}

function suffixOnlyValue(actual, expected) {
  const match = String(expected || '').match(/^(.*)\.(\d+)$/);
  return Boolean(match && String(actual || '') === match[1]);
}
function compareNameField(actual, expected, lineIndex, end, result) {
  if (actual === expected) return;
  if (suffixOnlyValue(actual, expected)) result.suffixOnly.push(Object.freeze({ lineIndex, end, actual, expected }));
  else result.nonSuffix.push(Object.freeze({ lineIndex, end, actual, expected }));
}
function isNodeNameHeader(line) { return headerName(line) === 'NODENAME'; }

export function comparePostimageAllowingOnlySuffix(actualText, expectedText) {
  const actual = lines(actualText); const expected = lines(expectedText);
  const result = { suffixOnly: [], nonSuffix: [], lineCountMatch: actual.length === expected.length };
  if (!result.lineCountMatch) return Object.freeze({ ...result, suffixOnly: Object.freeze([]), nonSuffix: Object.freeze([{ code: 'LINE_COUNT_MISMATCH', actual: actual.length, expected: expected.length }]) });
  let inNodeName = false;
  for (let index = 0; index < expected.length; index += 1) {
    const expectedHeader = headerName(expected[index]); const actualHeader = headerName(actual[index]);
    if (expectedHeader || actualHeader) {
      if (actual[index] !== expected[index]) result.nonSuffix.push(Object.freeze({ lineIndex: index, actual: actual[index], expected: expected[index] }));
      inNodeName = isNodeNameHeader(expected[index]) && isNodeNameHeader(actual[index]);
      continue;
    }
    if (!inNodeName) {
      if (actual[index] !== expected[index]) result.nonSuffix.push(Object.freeze({ lineIndex: index, actual: actual[index], expected: expected[index] }));
      continue;
    }
    const a = namePair(actual[index]); const e = namePair(expected[index]);
    compareNameField(a.fromName, e.fromName, index, 'FROM', result);
    compareNameField(a.toName, e.toName, index, 'TO', result);
    const aOutside = `${actual[index].slice(0, NODENAME_FROM_START)}${actual[index].slice(NODENAME_END)}`;
    const eOutside = `${expected[index].slice(0, NODENAME_FROM_START)}${expected[index].slice(NODENAME_END)}`;
    if (aOutside !== eOutside) result.nonSuffix.push(Object.freeze({ lineIndex: index, code: 'NODENAME_OUTSIDE_FIELD_MISMATCH', actual: aOutside, expected: eOutside }));
  }
  return Object.freeze({ lineCountMatch: true, suffixOnly: Object.freeze(result.suffixOnly), nonSuffix: Object.freeze(result.nonSuffix) });
}

export const _test = Object.freeze({ sectionRows, numericField, namePair, suffixOnlyValue, controlNodeNameCount });
