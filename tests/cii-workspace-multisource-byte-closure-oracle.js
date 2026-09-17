const CONTROL_NONAM_START = 41;
const CONTROL_NONAM_END = 54;
const ELEMENT_BLOCK_ROWS = 15;
const ELEMENT_POINTER_ROW = 13;
const ELEMENT_POINTER_START = 67;
const ELEMENT_POINTER_END = 80;
const NODENAME_ROW_WIDTH = 53;

function markerName(body) {
  const match = String(body ?? '').match(/^\s*#\$\s*(.*?)\s*$/);
  return match ? match[1].trim().toUpperCase() : null;
}
function physicalLines(rawValue) {
  const raw = String(rawValue ?? ''); const rows = []; let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char !== '\r' && char !== '\n') continue;
    let end = index + 1; let ending = char;
    if (char === '\r' && raw[index + 1] === '\n') { end = index + 2; ending = '\r\n'; index += 1; }
    const bodyEnd = end - ending.length;
    rows.push(Object.freeze({ body: raw.slice(start, bodyEnd), ending, byteStart: start, bodyByteEnd: bodyEnd, byteEnd: end }));
    start = end;
  }
  if (start < raw.length) rows.push(Object.freeze({ body: raw.slice(start), ending: '', byteStart: start, bodyByteEnd: raw.length, byteEnd: raw.length }));
  return Object.freeze(rows);
}
function sectionEnvelope(rawValue, wanted) {
  const rows = physicalLines(rawValue); const target = String(wanted).toUpperCase();
  const markerIndex = rows.findIndex((row) => markerName(row.body) === target);
  if (markerIndex < 0) throw new Error(`BYTE_ORACLE_SECTION_NOT_FOUND:${target}`);
  let nextIndex = markerIndex + 1;
  while (nextIndex < rows.length && markerName(rows[nextIndex].body) === null) nextIndex += 1;
  if (nextIndex >= rows.length) throw new Error(`BYTE_ORACLE_NEXT_SECTION_REQUIRED:${target}`);
  return Object.freeze({ rows, markerIndex, nextIndex, marker: rows[markerIndex], nextMarker: rows[nextIndex], payloadRows: rows.slice(markerIndex + 1, nextIndex) });
}
function allowedFixedSpans(rawValue) {
  const spans = [];
  const control = sectionEnvelope(rawValue, 'CONTROL');
  const controlRow = control.payloadRows[0];
  if (!controlRow || controlRow.body.length < CONTROL_NONAM_END) throw new Error('BYTE_ORACLE_CONTROL_FIXED_ROW_REQUIRED');
  spans.push(Object.freeze({ kind: 'CONTROL_NONAM', start: controlRow.byteStart + CONTROL_NONAM_START, end: controlRow.byteStart + CONTROL_NONAM_END }));
  const elements = sectionEnvelope(rawValue, 'ELEMENTS');
  if (elements.payloadRows.length % ELEMENT_BLOCK_ROWS !== 0) throw new Error('BYTE_ORACLE_ELEMENT_BLOCK_ROWS_INVALID');
  for (let rowIndex = ELEMENT_POINTER_ROW; rowIndex < elements.payloadRows.length; rowIndex += ELEMENT_BLOCK_ROWS) {
    const row = elements.payloadRows[rowIndex];
    if (!row || row.body.length < ELEMENT_POINTER_END) throw new Error(`BYTE_ORACLE_ELEMENT_POINTER_ROW_INVALID:${rowIndex}`);
    spans.push(Object.freeze({ kind: 'ELEMENT_NODENAME_POINTER', start: row.byteStart + ELEMENT_POINTER_START, end: row.byteStart + ELEMENT_POINTER_END }));
  }
  return Object.freeze(spans);
}
function maskedPrefix(rawValue, payloadStart) {
  const chars = String(rawValue ?? '').slice(0, payloadStart).split('');
  for (const span of allowedFixedSpans(rawValue)) {
    if (span.end > payloadStart) throw new Error(`BYTE_ORACLE_AUTHORIZED_SPAN_AFTER_NODENAME:${span.kind}`);
    for (let index = span.start; index < span.end; index += 1) chars[index] = '\u0000';
  }
  return chars.join('');
}
function endingCounts(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.ending, (counts.get(row.ending) || 0) + 1);
  return Object.freeze(Object.fromEntries([...counts.entries()].sort()));
}

export function validateIndependentMixedNodeNameByteClosure(beforeRaw, afterRaw, options = {}) {
  const before = String(beforeRaw ?? ''); const after = String(afterRaw ?? ''); const differences = [];
  const beforeNames = sectionEnvelope(before, 'NODENAME'); const afterNames = sectionEnvelope(after, 'NODENAME');
  const expectedRowDelta = Number(options.expectedRowDelta ?? 0); const deleteCount = Number(options.deleteCount ?? 0);

  if (beforeNames.marker.body !== afterNames.marker.body || beforeNames.marker.ending !== afterNames.marker.ending) {
    differences.push(Object.freeze({ code: 'NODENAME_MARKER_BYTES_CHANGED' }));
  }
  const beforePrefix = maskedPrefix(before, beforeNames.marker.byteEnd);
  const afterPrefix = maskedPrefix(after, afterNames.marker.byteEnd);
  if (beforePrefix !== afterPrefix) differences.push(Object.freeze({ code: 'BYTES_CHANGED_OUTSIDE_CONTROL_POINTER_NODENAME_CLOSURE_BEFORE_NODENAME' }));

  const beforeSuffix = before.slice(beforeNames.nextMarker.byteStart);
  const afterSuffix = after.slice(afterNames.nextMarker.byteStart);
  if (beforeSuffix !== afterSuffix) differences.push(Object.freeze({ code: 'BYTES_CHANGED_AFTER_NODENAME_SECTION' }));

  if (afterNames.payloadRows.length !== beforeNames.payloadRows.length + expectedRowDelta) {
    differences.push(Object.freeze({
      code: 'NODENAME_PHYSICAL_ROW_DELTA_MISMATCH', before: beforeNames.payloadRows.length,
      after: afterNames.payloadRows.length, expectedDelta: expectedRowDelta,
    }));
  }
  for (let index = 0; index < afterNames.payloadRows.length; index += 1) {
    if (afterNames.payloadRows[index].body.length !== NODENAME_ROW_WIDTH) {
      differences.push(Object.freeze({ code: 'NODENAME_ROW_WIDTH_CHANGED', rowIndex: index, width: afterNames.payloadRows[index].body.length }));
    }
  }

  const beforeEndings = beforeNames.payloadRows.map((row) => row.ending);
  const afterEndings = afterNames.payloadRows.map((row) => row.ending);
  if (deleteCount === 0 && expectedRowDelta >= 0) {
    for (let index = 0; index < beforeEndings.length; index += 1) {
      if (afterEndings[index] !== beforeEndings[index]) differences.push(Object.freeze({ code: 'EXISTING_NODENAME_LINE_ENDING_CHANGED', rowIndex: index }));
    }
    const appendEnding = beforeEndings.at(-1) || beforeNames.marker.ending;
    for (let index = beforeEndings.length; index < afterEndings.length; index += 1) {
      if (afterEndings[index] !== appendEnding) differences.push(Object.freeze({ code: 'APPENDED_NODENAME_LINE_ENDING_CHANGED', rowIndex: index, expected: appendEnding, actual: afterEndings[index] }));
    }
  } else {
    const allowed = new Set(beforeEndings);
    for (let index = 0; index < afterEndings.length; index += 1) {
      if (!allowed.has(afterEndings[index])) differences.push(Object.freeze({ code: 'NODENAME_LINE_ENDING_STYLE_INTRODUCED', rowIndex: index, actual: afterEndings[index] }));
    }
  }

  return Object.freeze({
    status: differences.length ? 'BLOCKED' : 'READY',
    differences: Object.freeze(differences),
    beforeByteLength: before.length, afterByteLength: after.length,
    rowCountBefore: beforeNames.payloadRows.length, rowCountAfter: afterNames.payloadRows.length,
    beforeLineEndings: endingCounts(beforeNames.payloadRows), afterLineEndings: endingCounts(afterNames.payloadRows),
  });
}

export const _test = Object.freeze({ physicalLines, sectionEnvelope, allowedFixedSpans, maskedPrefix, endingCounts });