const SECTION_RX = /^#\$\s+([A-Z0-9_&]+)\s*$/;
const NUMBER_RX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][-+]?\d+)?$/;
const ELEMENT_BLOCK_ROWS = 15;

const CONTROL_FIELDS = Object.freeze({
  '0:3': 'CONTROL_NODENAME_NONAM_COUNT',
  '1:3': 'CONTROL_RESTRAINT_BLOCK_COUNT',
  '2:4': 'CONTROL_SIF_TEE_BLOCK_COUNT',
});
const ELEMENT_FIELDS = Object.freeze({
  '12:3': 'ELEMENT_RESTRAINT_POINTER',
  '13:4': 'ELEMENT_SIF_TEE_POINTER',
  '13:5': 'ELEMENT_NODENAME_POINTER',
});

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  throw new Error('CII_V14_WRITER2_FIELD_AUTHORITY_BYTES_REQUIRED');
}

function decode(value, label) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(asBytes(value));
  } catch (error) {
    throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_${label}_UTF8_REQUIRED:${error?.message || error}`);
  }
  if (!text.endsWith('\r\n')) throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_${label}_FINAL_CRLF_REQUIRED`);
  const body = text.slice(0, -2);
  if (/(^|[^\r])\n|\r(?!\n)/.test(body)) throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_${label}_CRLF_ONLY_REQUIRED`);
  const sections = [];
  let current = null;
  for (const line of body ? body.split('\r\n') : []) {
    const marker = SECTION_RX.exec(line);
    if (marker) {
      current = { name: marker[1], rows: [] };
      sections.push(current);
      continue;
    }
    if (!current) throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_${label}_CONTENT_BEFORE_SECTION`);
    current.rows.push(line);
  }
  return sections;
}

function fixedFields(line) {
  if (line.length < 15 || (line.length - 15) % 13 !== 0) return null;
  const fields = [line.slice(0, 15)];
  for (let start = 15; start < line.length; start += 13) fields.push(line.slice(start, start + 13));
  return fields;
}

function integerValue(field) {
  const token = String(field ?? '').trim();
  if (!token || !NUMBER_RX.test(token)) return null;
  const value = Number(token.replace(/[Dd]/g, 'E'));
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= 1e-9 ? rounded : null;
}

function authorityIdentity(sectionName, rowIndex, fieldIndex) {
  if (sectionName === 'CONTROL') return CONTROL_FIELDS[`${rowIndex}:${fieldIndex}`] || null;
  if (sectionName === 'ELEMENTS') {
    return ELEMENT_FIELDS[`${rowIndex % ELEMENT_BLOCK_ROWS}:${fieldIndex}`] || null;
  }
  return null;
}

function inspectSection(baseline, modified, ledger) {
  if (baseline.rows.length !== modified.rows.length) {
    throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_ROW_COUNT_CHANGED:${baseline.name}:${baseline.rows.length}:${modified.rows.length}`);
  }
  if (baseline.name === 'ELEMENTS' && baseline.rows.length % ELEMENT_BLOCK_ROWS !== 0) {
    throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_ELEMENT_BLOCK_ALIGNMENT:${baseline.rows.length}`);
  }
  for (let rowIndex = 0; rowIndex < baseline.rows.length; rowIndex += 1) {
    const beforeRow = baseline.rows[rowIndex];
    const afterRow = modified.rows[rowIndex];
    if (beforeRow === afterRow) continue;
    const beforeFields = fixedFields(beforeRow);
    const afterFields = fixedFields(afterRow);
    if (!beforeFields || !afterFields || beforeFields.length !== afterFields.length) {
      throw new Error(`CII_V14_WRITER2_FIELD_AUTHORITY_NON_FIXED_ROW:${baseline.name}:${rowIndex}`);
    }
    for (let fieldIndex = 0; fieldIndex < beforeFields.length; fieldIndex += 1) {
      if (beforeFields[fieldIndex] === afterFields[fieldIndex]) continue;
      const identity = authorityIdentity(baseline.name, rowIndex, fieldIndex);
      if (!identity) {
        throw new Error(`CII_V14_WRITER2_FIXED_FIELD_NOT_AUTHORIZED:${baseline.name}:${rowIndex}:${fieldIndex}`);
      }
      const beforeInteger = integerValue(beforeFields[fieldIndex]);
      const afterInteger = integerValue(afterFields[fieldIndex]);
      if (beforeInteger == null || afterInteger == null || beforeInteger < 0 || afterInteger < 0) {
        throw new Error(`CII_V14_WRITER2_FIXED_FIELD_INTEGER_REQUIRED:${identity}:${rowIndex}:${fieldIndex}`);
      }
      ledger.push(Object.freeze({
        section: baseline.name,
        rowIndex,
        fieldIndex,
        fieldIdentity: identity,
        before: beforeInteger,
        after: afterInteger,
      }));
    }
  }
}

export function assertCiiV14Writer2FixedFieldAuthority(baselineCanonicalValue, modifiedCanonicalValue) {
  const baseline = decode(baselineCanonicalValue, 'BASELINE');
  const modified = decode(modifiedCanonicalValue, 'MODIFIED');
  const baselineNames = baseline.map((section) => section.name);
  const modifiedNames = modified.map((section) => section.name);
  if (baselineNames.length !== modifiedNames.length || baselineNames.some((name, index) => name !== modifiedNames[index])) {
    throw new Error('CII_V14_WRITER2_FIELD_AUTHORITY_SECTION_ORDER_MISMATCH');
  }
  const ledger = [];
  for (let index = 0; index < baseline.length; index += 1) {
    if (baseline[index].name !== 'CONTROL' && baseline[index].name !== 'ELEMENTS') continue;
    inspectSection(baseline[index], modified[index], ledger);
  }
  return Object.freeze({
    schema: 'CIIWorkspaceV14Writer2FixedFieldAuthority.v1',
    status: 'PASS',
    claims: Object.freeze([...ledger]),
  });
}

export const _test = Object.freeze({ fixedFields, integerValue, authorityIdentity });
