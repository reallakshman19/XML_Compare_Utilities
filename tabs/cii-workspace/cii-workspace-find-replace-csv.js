/*
 * CII v14 Find & Replace CSV intake.
 *
 * CSV intake creates proposals only. It does not mutate XML/CII content and
 * does not call Writer1/Writer2.
 */

const MODES = Object.freeze({ DOCUMENT: 'DOCUMENT', ELEMENT: 'ELEMENT', BLOCK: 'BLOCK' });
const REQUIRED = Object.freeze({
  DOCUMENT: ['findtext', 'replacetext'],
  ELEMENT: ['from', 'to', 'findtext', 'replacetext'],
  BLOCK: ['from', 'to', 'findtext', 'replacetext', 'block'],
});

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text ?? '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => String(value).trim() !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) return { rows: [], error: 'CSV_UNTERMINATED_QUOTE' };
  row.push(field);
  if (row.some((value) => String(value).trim() !== '')) rows.push(row);
  return { rows, error: null };
}

function integerRange(value) {
  const parsed = Number(String(value ?? '').trim());
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function rowBlockers(mode, data) {
  const blockers = [];
  if (!data.findText) blockers.push('FIND_TEXT_REQUIRED');
  if (data.findText === data.replaceText) blockers.push('NO_EFFECTIVE_TEXT_CHANGE');
  if (mode !== MODES.DOCUMENT) {
    if (data.from == null) blockers.push('FROM_MUST_BE_NON_NEGATIVE_INTEGER');
    if (data.to == null) blockers.push('TO_MUST_BE_NON_NEGATIVE_INTEGER');
    if (data.from != null && data.to != null && data.from > data.to) blockers.push('FROM_EXCEEDS_TO');
  }
  if (mode === MODES.BLOCK && !data.block) blockers.push('BLOCK_REQUIRED');
  return blockers;
}

export function parseFindReplaceCsv(text, mode = MODES.DOCUMENT) {
  const normalizedMode = String(mode || '').trim().toUpperCase();
  if (!Object.hasOwn(REQUIRED, normalizedMode)) {
    return Object.freeze({ mode: normalizedMode, status: 'INVALID', operations: Object.freeze([]), errors: Object.freeze(['UNSUPPORTED_MODE']) });
  }

  const parsed = parseCsvRows(text);
  if (parsed.error) {
    return Object.freeze({ mode: normalizedMode, status: 'INVALID', operations: Object.freeze([]), errors: Object.freeze([parsed.error]) });
  }
  if (parsed.rows.length < 2) {
    return Object.freeze({ mode: normalizedMode, status: 'INVALID', operations: Object.freeze([]), errors: Object.freeze(['CSV_HEADER_AND_DATA_REQUIRED']) });
  }

  const headers = parsed.rows[0].map(normalizeHeader);
  const missing = REQUIRED[normalizedMode].filter((name) => !headers.includes(name));
  if (missing.length) {
    return Object.freeze({
      mode: normalizedMode,
      status: 'INVALID',
      operations: Object.freeze([]),
      errors: Object.freeze(missing.map((name) => `MISSING_HEADER:${name}`)),
    });
  }

  const index = Object.fromEntries(headers.map((name, position) => [name, position]));
  const operations = parsed.rows.slice(1).map((cells, offset) => {
    const findText = String(cells[index.findtext] ?? '');
    const replaceText = String(cells[index.replacetext] ?? '');
    const from = normalizedMode === MODES.DOCUMENT ? null : integerRange(cells[index.from]);
    const to = normalizedMode === MODES.DOCUMENT ? null : integerRange(cells[index.to]);
    const block = normalizedMode === MODES.BLOCK ? String(cells[index.block] ?? '').trim() : null;
    const data = { findText, replaceText, from, to, block };
    const blockers = rowBlockers(normalizedMode, data);
    return Object.freeze({
      source: 'CSV',
      rowNumber: offset + 2,
      scope: normalizedMode,
      entity: normalizedMode === MODES.DOCUMENT ? null : 'ELEMENT_RANGE',
      id: normalizedMode === MODES.DOCUMENT ? null : `${from ?? '?'}:${to ?? '?'}`,
      from,
      to,
      block,
      field: null,
      before: findText,
      after: replaceText,
      findText,
      replaceText,
      status: blockers.length ? 'BLOCKED' : 'PROPOSED',
      blockers: Object.freeze(blockers),
    });
  });

  return Object.freeze({
    mode: normalizedMode,
    status: operations.some((operation) => operation.status === 'BLOCKED') ? 'REVIEW' : 'VALID',
    operations: Object.freeze(operations),
    errors: Object.freeze([]),
  });
}

export { MODES as FIND_REPLACE_CSV_MODES };
