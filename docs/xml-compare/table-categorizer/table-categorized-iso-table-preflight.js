import { parseTableSource } from './table-categorized-xml-source-parser.js';

export const ISO_TABLE_IMPORT_PREFLIGHT_SCHEMA = 'iso-table-import-preflight/v1';
export const ISO_TABLE_IMPORT_MAX_BYTES = 16 * 1024 * 1024;
const RULES = Object.freeze({
  S1: Object.freeze({ 'Support No': 'PS NO', 'PS NO': 'PS NO', pipe: 'pipe',
    Bore: 'Bore', DTXR: 'DTXR', 'Support Gap': 'Support Gap', Mandatory: 'Mandatory' }),
  S2: Object.freeze({ SupportISONOTE: 'SupportISONOTE', LinenoinCII: 'LinenoinCII',
    NODE_NAME: 'NODE_NAME', NODE_NUM: 'NODE_NUM' }),
});
const REQUIRED = Object.freeze({
  S1: Object.freeze(['PS NO', 'pipe']),
  S2: Object.freeze(['SupportISONOTE', 'LinenoinCII', 'NODE_NAME']),
});
const allowed = /\.(csv|tsv|txt)$/i;
const issue = (severity, code, message, rowRef = '') =>
  Object.freeze({ severity, code, message, rowRef });
const norm = value => String(value ?? '').trim().toLowerCase();
const aliasesFor = role => RULES[role] || {};

function csvQuoteBalanced(value) {
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '"') continue;
    if (quoted && value[i + 1] === '"') { i++; continue; }
    quoted = !quoted;
  }
  return !quoted;
}
// Harmless exports may include an entirely blank trailing column or a
// second copy of NODE_NAME. They are not schema failures when the
// authoritative first column remains unambiguous. Preserve every cell.
function classifyHeaderColumns(parsed, role) {
  const aliases = aliasesFor(role), seen = new Map(), findings = [], notices = [];
  const headers = parsed.originalHeaders || parsed.headers || [];
  for (let index = 0; index < headers.length; index += 1) {
    const raw = String(headers[index] ?? '');
    const canonical = Object.entries(aliases).find(([key]) => norm(key) === norm(raw))?.[1] || raw;
    const key = norm(canonical);
    const values = (parsed.rows || []).map(row => String(row.rawCells?.[index] ?? '').trim());
    if (!key) {
      if (values.some(Boolean)) findings.push(issue('BLOCKER', 'EMPTY_HEADER',
        'Unnamed column ' + (index + 1) + ' contains data. Name it before importing.'));
      else notices.push('Empty column ' + (index + 1) + ' was retained; all its cells are blank.');
      continue;
    }
    if (!seen.has(key)) { seen.set(key, { index, raw }); continue; }
    const primary = seen.get(key);
    const primaryValues = (parsed.rows || []).map(row => String(row.rawCells?.[primary.index] ?? '').trim());
    // The parser already selects the first column. Never make a different
    // one authoritative implicitly, even if it would appear to be "better".
    const safe = values.every((value, row) => !value || value === primaryValues[row]);
    if (!safe) findings.push(issue('BLOCKER', 'DUPLICATE_CANONICAL_HEADER',
      'Columns "' + primary.raw + '" and "' + raw + '" both identify "' + canonical +
      '" with conflicting or second-only values. Select the authoritative column manually.'));
    else notices.push('Repeated "' + canonical + '" column ' + (index + 1) +
      ' matches or is blank relative to column ' + (primary.index + 1) + '; original cells retained.');
  }
  return { findings, notices };
}
function rowShapeIssues(parsed) {
  return (parsed.diagnostics || []).filter(d => /_column_count_mismatch$/.test(d.code))
    .slice(0, 12).map(d => issue('BLOCKER', 'ROW_WIDTH_MISMATCH',
      d.message + ' No cells were added, removed, or shifted automatically.', d.details?.rowId || ''));
}
function identityWarnings(parsed, role) {
  const name = role === 'S1' ? 'PS NO' : 'NODE_NAME';
  const issues = [];
  for (const row of parsed.rows || []) {
    const id = String(row.rawByHeader?.[name] || '').trim().replace(/^\/+/, '');
    if (!id) issues.push(issue('REVIEW', 'BLANK_SUPPORT_ID',
      name + ' is empty; identifier cannot be inferred.', row.rowId));
    else if (!/^(?:PS|SL)-\d+(?:\.\d+)?$/i.test(id)) {
      issues.push(issue('REVIEW', 'NONCANONICAL_SUPPORT_ID',
        'Retained noncanonical ' + name + ': ' + id.slice(0, 100), row.rowId));
    }
  }
  return issues;
}

export function preflightIsoTableText(text, role, options = {}) {
  if (!REQUIRED[role]) throw new Error('Preflight role must be S1 or S2.');
  const rawText = String(text ?? ''), fileName = String(options.fileName || '');
  const findings = [];
  if (fileName && !allowed.test(fileName)) findings.push(issue('BLOCKER', 'UNSUPPORTED_FILE',
    'Choose a .csv, .tsv or .txt file.'));
  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > ISO_TABLE_IMPORT_MAX_BYTES) findings.push(issue('BLOCKER', 'FILE_TOO_LARGE',
    'File exceeds the 16 MiB safety limit.'));
  if (rawText.includes('\0')) findings.push(issue('BLOCKER', 'NUL_BYTE',
    'Binary or NUL-containing data cannot be interpreted as a text table.'));
  if (!rawText.trim()) findings.push(issue('BLOCKER', 'EMPTY_FILE', 'The selected file is empty.'));
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const fixes = [];
  if (cleanText !== rawText) fixes.push('Removed UTF-8 BOM from the parse copy; original text retained.');
  // The generic parser is the single authority for CSV/TSV multiline fields,
  // delimiters, quoted commas, aliases and source row references.
  const parsed = findings.some(f => f.severity === 'BLOCKER') ? null :
    parseTableSource(cleanText, { sourceId: role, delimiterMode: 'auto',
      headerAliases: aliasesFor(role), sourceType: 'file' });
  if (parsed) {
    if (parsed.delimiter === 'comma' && !csvQuoteBalanced(cleanText))
      findings.push(issue('BLOCKER', 'UNBALANCED_CSV_QUOTES',
        'Unclosed CSV quoted field. Edit the source file; it was not rewritten.'));
    if (parsed.headers.length < 2) findings.push(issue('BLOCKER', 'DELIMITER_UNRESOLVED',
      'Could not detect a multi-column CSV/TSV table.'));
    const headerCheck = classifyHeaderColumns(parsed, role);
    findings.push(...headerCheck.findings);
    fixes.push(...headerCheck.notices);
    const present = new Set(parsed.headers.map(norm));
    for (const name of REQUIRED[role]) if (!present.has(norm(name)))
      findings.push(issue('BLOCKER', 'REQUIRED_COLUMN_MISSING',
        role + ' requires "' + name + '". Wrong-role files are not auto-swapped.'));
    if (!parsed.rows.length) findings.push(issue('BLOCKER', 'NO_DATA_ROWS',
      'At least one data row is required.'));
    findings.push(...rowShapeIssues(parsed));
    const aliases = parsed.aliasBindings || [];
    for (const alias of aliases) fixes.push('Mapped header "' +
      alias.originalHeader + '" to "' + alias.canonicalHeader + '" without changing raw cells.');
    findings.push(...identityWarnings(parsed, role));
  }
  const blocked = findings.some(item => item.severity === 'BLOCKER');
  const warningCount = findings.filter(item => item.severity === 'REVIEW').length;
  return Object.freeze({
    schema: ISO_TABLE_IMPORT_PREFLIGHT_SCHEMA, role, fileName, ok: !blocked,
    sourceText: cleanText, originalText: rawText, byteLength,
    detectedDelimiter: parsed?.delimiter || '', rowCount: parsed?.rows.length || 0,
    parsed: blocked ? null : parsed,
    fixes: Object.freeze(fixes), findings: Object.freeze(findings),
    blockerCount: findings.filter(item => item.severity === 'BLOCKER').length,
    reviewCount: warningCount,
    summary: blocked ? role + ' import blocked. Existing source kept unchanged.' :
      role + ' preflight passed: ' + parsed.rows.length + ' rows, ' +
        fixes.length + ' safe autofix(es), ' + warningCount + ' review warning(s).',
  });
}
