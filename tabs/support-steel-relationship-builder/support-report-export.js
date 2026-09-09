import { SUPPORT_REPORT_COLUMNS } from './support-report-contract.js';

export function supportReportToCsv(bundle, options = {}) {
  const columns = SUPPORT_REPORT_COLUMNS;
  const includeOrdinalRow = options.includeOrdinalRow !== false;
  const legacyBlankPrimarySupportHeader = options.legacyBlankPrimarySupportHeader === true;
  const headerLabels = columns.map((column) => (
    legacyBlankPrimarySupportHeader && column.key === 'pipingPrimarySupport' ? '' : column.label
  ));
  const lines = [];
  if (includeOrdinalRow) lines.push(columns.map((_, index) => csvCell(index + 1)).join(','));
  lines.push(headerLabels.map(csvCell).join(','));
  for (const row of bundle?.rows || []) {
    lines.push(columns.map((column) => csvCell(row?.[column.key] ?? '')).join(','));
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
    legacyBlankPrimarySupportHeader && column.key === 'pipingPrimarySupport' ? '' : column.label,
  )).join('\t'));
  for (const row of bundle?.rows || []) {
    lines.push(columns.map((column) => tsvCell(row?.[column.key] ?? '')).join('\t'));
  }
  return lines.join('\n');
}

export function supportReportBundleToJson(bundle) {
  return JSON.stringify(bundle, null, 2);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
function tsvCell(value) {
  return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}
