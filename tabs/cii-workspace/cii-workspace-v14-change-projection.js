const SECTION_RX = /^#\$\s+([A-Z0-9_&]+)\s*$/;
const NUMBER_RX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][-+]?\d+)?$/;
const MAX_DIFF_ROWS = 3000;
const MAX_DIFF_CELLS = 4_000_000;

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  throw new Error('CII_V14_PROJECTION_BYTES_REQUIRED');
}

function decodeV14(value, label) {
  const bytes = asBytes(value);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`CII_V14_PROJECTION_${label}_UTF8_REQUIRED:${error?.message || error}`);
  }
  if (!text.endsWith('\r\n')) throw new Error(`CII_V14_PROJECTION_${label}_FINAL_CRLF_REQUIRED`);
  const withoutFinal = text.slice(0, -2);
  if (/(^|[^\r])\n|\r(?!\n)/.test(withoutFinal)) {
    throw new Error(`CII_V14_PROJECTION_${label}_CRLF_ONLY_REQUIRED`);
  }
  const physical = withoutFinal ? withoutFinal.split('\r\n') : [];
  const sections = [];
  const names = new Set();
  let current = null;
  for (let index = 0; index < physical.length; index += 1) {
    const line = physical[index];
    const match = SECTION_RX.exec(line);
    if (match) {
      const name = match[1];
      if (names.has(name)) throw new Error(`CII_V14_PROJECTION_${label}_DUPLICATE_SECTION:${name}`);
      names.add(name);
      current = { name, header: line, rows: [] };
      sections.push(current);
      continue;
    }
    if (!current) throw new Error(`CII_V14_PROJECTION_${label}_CONTENT_BEFORE_SECTION:${index + 1}`);
    current.rows.push(line);
  }
  if (!sections.length) throw new Error(`CII_V14_PROJECTION_${label}_SECTION_REQUIRED`);
  return Object.freeze({ bytes, sections: Object.freeze(sections.map((item) => Object.freeze({
    name: item.name,
    header: item.header,
    rows: Object.freeze([...item.rows]),
  }))) });
}

function equalRows(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

function fixedFields(line) {
  if (line.length < 15 || (line.length - 15) % 13 !== 0) return null;
  const fields = [line.slice(0, 15)];
  for (let start = 15; start < line.length; start += 13) fields.push(line.slice(start, start + 13));
  return fields;
}

function numericValue(field) {
  const token = field.trim();
  if (!token || NUMBER_RX.test(token) === false) return null;
  const value = Number(token.replace(/[Dd]/g, 'E'));
  return Number.isFinite(value) ? value : null;
}

function numbersEquivalent(left, right) {
  const a = numericValue(left);
  const b = numericValue(right);
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= Math.max(1e-9, Math.abs(a) * 1e-5, Math.abs(b) * 1e-5);
}

function mergeChangedRow(original, baseline, modified, context) {
  if (baseline === modified) return Object.freeze({ row: original, changedFields: Object.freeze([]) });
  if (baseline === original) return Object.freeze({ row: modified, changedFields: Object.freeze(['ROW_EXACT_BASELINE']) });
  if (original.length !== baseline.length || baseline.length !== modified.length) {
    throw new Error(`CII_V14_PROJECTION_ROW_WIDTH_MISMATCH:${context}`);
  }
  const originalFields = fixedFields(original);
  const baselineFields = fixedFields(baseline);
  const modifiedFields = fixedFields(modified);
  if (!originalFields || !baselineFields || !modifiedFields || originalFields.length !== baselineFields.length || baselineFields.length !== modifiedFields.length) {
    throw new Error(`CII_V14_PROJECTION_NON_FIXED_ROW_REPLACEMENT:${context}`);
  }
  const output = [];
  const changedFields = [];
  for (let index = 0; index < baselineFields.length; index += 1) {
    const before = baselineFields[index];
    const after = modifiedFields[index];
    const source = originalFields[index];
    if (before === after) {
      output.push(source);
      continue;
    }
    const beforeBlank = before.trim() === '';
    const sourceBlank = source.trim() === '';
    if (beforeBlank !== sourceBlank && !numbersEquivalent(before, source)) {
      throw new Error(`CII_V14_PROJECTION_CHANGED_FIELD_PREIMAGE_MISMATCH:${context}:${index}`);
    }
    if (!beforeBlank && !sourceBlank && !numbersEquivalent(before, source) && before !== source) {
      throw new Error(`CII_V14_PROJECTION_CHANGED_FIELD_PREIMAGE_MISMATCH:${context}:${index}`);
    }
    const afterToken = after.trim();
    if (afterToken && numericValue(after) == null && before !== source) {
      throw new Error(`CII_V14_PROJECTION_CHANGED_FIELD_NON_NUMERIC:${context}:${index}`);
    }
    output.push(after);
    changedFields.push(index);
  }
  if (!changedFields.length) throw new Error(`CII_V14_PROJECTION_ROW_CHANGE_UNRESOLVED:${context}`);
  return Object.freeze({ row: output.join(''), changedFields: Object.freeze(changedFields) });
}

function lcsMatches(baseline, modified, sectionName) {
  const n = baseline.length;
  const m = modified.length;
  if (n > MAX_DIFF_ROWS || m > MAX_DIFF_ROWS || (n + 1) * (m + 1) > MAX_DIFF_CELLS) {
    throw new Error(`CII_V14_PROJECTION_DIFF_ENVELOPE_EXCEEDED:${sectionName}:${n}:${m}`);
  }
  const cols = m + 1;
  const table = new Uint16Array((n + 1) * cols);
  for (let i = n - 1; i >= 0; i -= 1) {
    const row = i * cols;
    const next = (i + 1) * cols;
    for (let j = m - 1; j >= 0; j -= 1) {
      table[row + j] = baseline[i] === modified[j]
        ? table[next + j + 1] + 1
        : Math.max(table[next + j], table[row + j + 1]);
    }
  }
  const matches = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (baseline[i] === modified[j]) {
      matches.push([i, j]);
      i += 1;
      j += 1;
      continue;
    }
    const deleteScore = table[(i + 1) * cols + j];
    const insertScore = table[i * cols + j + 1];
    if (deleteScore >= insertScore) i += 1;
    else j += 1;
  }
  return matches;
}

function projectEqualCardinality(original, baseline, modified, sectionName, ledger) {
  const rows = [];
  for (let index = 0; index < baseline.length; index += 1) {
    if (baseline[index] === modified[index]) {
      rows.push(original[index]);
      continue;
    }
    const merged = mergeChangedRow(original[index], baseline[index], modified[index], `${sectionName}:${index}`);
    rows.push(merged.row);
    ledger.push(Object.freeze({
      section: sectionName,
      operation: 'MERGE_FIXED_ROW',
      baselineRow: index,
      modifiedRow: index,
      changedFields: merged.changedFields,
    }));
  }
  return rows;
}

function projectChangedRun(output, original, baseline, modified, sectionName, bStart, bEnd, mStart, mEnd, ledger) {
  const bCount = bEnd - bStart;
  const mCount = mEnd - mStart;
  if (bCount === 0 && mCount > 0) {
    output.push(...modified.slice(mStart, mEnd));
    ledger.push(Object.freeze({ section: sectionName, operation: 'INSERT_ROWS', baselineStart: bStart, modifiedStart: mStart, count: mCount }));
    return;
  }
  if (mCount === 0 && bCount > 0) {
    ledger.push(Object.freeze({ section: sectionName, operation: 'DELETE_ROWS', baselineStart: bStart, count: bCount }));
    return;
  }
  if (bCount === mCount) {
    for (let offset = 0; offset < bCount; offset += 1) {
      const merged = mergeChangedRow(
        original[bStart + offset],
        baseline[bStart + offset],
        modified[mStart + offset],
        `${sectionName}:${bStart + offset}->${mStart + offset}`,
      );
      output.push(merged.row);
      ledger.push(Object.freeze({
        section: sectionName,
        operation: 'MERGE_FIXED_ROW',
        baselineRow: bStart + offset,
        modifiedRow: mStart + offset,
        changedFields: merged.changedFields,
      }));
    }
    return;
  }
  throw new Error(`CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN:${sectionName}:${bStart}:${bCount}:${mStart}:${mCount}`);
}

function projectChangedCardinality(original, baseline, modified, sectionName, ledger) {
  if (original.length !== baseline.length) {
    throw new Error(`CII_V14_PROJECTION_BASELINE_ORIGINAL_ROW_COUNT_MISMATCH:${sectionName}:${original.length}:${baseline.length}`);
  }
  const matches = lcsMatches(baseline, modified, sectionName);
  const output = [];
  let previousB = 0;
  let previousM = 0;
  for (const [bIndex, mIndex] of [...matches, [baseline.length, modified.length]]) {
    projectChangedRun(output, original, baseline, modified, sectionName, previousB, bIndex, previousM, mIndex, ledger);
    if (bIndex < baseline.length && mIndex < modified.length) output.push(original[bIndex]);
    previousB = bIndex + 1;
    previousM = mIndex + 1;
  }
  return output;
}

function assertSectionOrder(original, baseline, modified) {
  const expected = baseline.sections.map((item) => item.name);
  for (const [label, document] of [['ORIGINAL', original], ['MODIFIED', modified]]) {
    const actual = document.sections.map((item) => item.name);
    if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
      throw new Error(`CII_V14_PROJECTION_${label}_SECTION_ORDER_MISMATCH`);
    }
  }
}

export function projectCanonicalV14WriterDelta(originalValue, baselineCanonicalValue, modifiedCanonicalValue) {
  const original = decodeV14(originalValue, 'ORIGINAL');
  const baseline = decodeV14(baselineCanonicalValue, 'BASELINE');
  const modified = decodeV14(modifiedCanonicalValue, 'MODIFIED');
  assertSectionOrder(original, baseline, modified);

  const ledger = [];
  const physical = [];
  const changedSections = [];
  for (let sectionIndex = 0; sectionIndex < baseline.sections.length; sectionIndex += 1) {
    const originalSection = original.sections[sectionIndex];
    const baselineSection = baseline.sections[sectionIndex];
    const modifiedSection = modified.sections[sectionIndex];
    physical.push(originalSection.header);

    if (equalRows(baselineSection.rows, modifiedSection.rows)) {
      physical.push(...originalSection.rows);
      continue;
    }

    changedSections.push(baselineSection.name);
    if (originalSection.rows.length !== baselineSection.rows.length) {
      throw new Error(`CII_V14_PROJECTION_BASELINE_ORIGINAL_ROW_COUNT_MISMATCH:${baselineSection.name}:${originalSection.rows.length}:${baselineSection.rows.length}`);
    }
    const projectedRows = baselineSection.rows.length === modifiedSection.rows.length
      ? projectEqualCardinality(originalSection.rows, baselineSection.rows, modifiedSection.rows, baselineSection.name, ledger)
      : projectChangedCardinality(originalSection.rows, baselineSection.rows, modifiedSection.rows, baselineSection.name, ledger);
    physical.push(...projectedRows);
  }

  const text = `${physical.join('\r\n')}\r\n`;
  const outputBytes = new TextEncoder().encode(text);
  return Object.freeze({
    schema: 'CIIWorkspaceV14ChangeProjection.v1',
    outputBytes,
    changedSections: Object.freeze([...changedSections]),
    ledger: Object.freeze([...ledger]),
    untouchedSectionCount: baseline.sections.length - changedSections.length,
  });
}
