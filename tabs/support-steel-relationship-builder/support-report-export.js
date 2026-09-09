import {
  SUPPORT_REPORT_COLUMNS,
  supportReportColumnValue,
} from './support-report-contract.js';

export function supportReportToCsv(bundle, options = {}) {
  const columns = SUPPORT_REPORT_COLUMNS;
  const includeOrdinalRow = options.includeOrdinalRow !== false;
  const legacyBlankPrimarySupportHeader = options.legacyBlankPrimarySupportHeader === true;
  const headerLabels = columns.map((column) => (
    legacyBlankPrimarySupportHeader && column.key === 'pipingPrimarySupportReference' ? '' : column.label
  ));
  const lines = [];
  if (includeOrdinalRow) lines.push(columns.map((_, index) => csvCell(index + 1)).join(','));
  lines.push(headerLabels.map(csvCell).join(','));
  for (const row of bundle?.rows || []) {
    lines.push(columns.map((column) => csvCell(supportReportColumnValue(row, column))).join(','));
  }
  return lines.join('\n');
}

export function supportReportToTsv(bundle, options = {}) {
  const columns = SUPPORT_REPORT_COLUMNS;
  const includeOrdinalRow = options.includeOrdinalRow !== false;
  const legacyBlankPrimarySupportHeader = options.legacyBlankPrimarySupportHeader === true;
  const lines = [];
  if (includeOrdinalRow) lines.push(columns.map((_, index) => index + 1).join('\t'));
  lines.push(columns.map((column) => tsvCell(
    legacyBlankPrimarySupportHeader && column.key === 'pipingPrimarySupportReference' ? '' : column.label,
  )).join('\t'));
  for (const row of bundle?.rows || []) {
    lines.push(columns.map((column) => tsvCell(supportReportColumnValue(row, column))).join('\t'));
  }
  return lines.join('\n');
}

export function supportReportBundleToJson(bundle) {
  return JSON.stringify(bundle, null, 2);
}

function spreadsheetSafeText(value) {
  const text = String(value ?? '');
  return typeof value === 'string' && /^[=+\-@]/.test(text) ? `'${text}` : text;
}
function csvCell(value) {
  const text = spreadsheetSafeText(value);
  return `"${text.replace(/"/g, '""')}"`;
}
function tsvCell(value) {
  const sanitized = typeof value === 'string'
    ? value.replace(/[\t\r\n]+/g, ' ').trim()
    : value;
  return spreadsheetSafeText(sanitized);
}
