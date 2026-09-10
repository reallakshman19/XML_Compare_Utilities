import {
  SUPPORT_REPORT_COLUMNS,
  supportReportColumnHeader,
  supportReportColumnValue,
} from './support-report-contract.js?v=20260910-support-report-owner-contract-15';

const DEFAULT_SHEET_NAME = 'Support Report';
const XLSX_MODULE_URL = 'https://esm.sh/xlsx@0.18.5';

export function supportReportSpreadsheetMatrix(bundle, options = {}) {
  const includeOrdinalRow = options.includeOrdinalRow !== false;
  const header = SUPPORT_REPORT_COLUMNS.map((column) => supportReportColumnHeader(column, {
    ...options,
    ownerWorkbookFidelity: options.ownerWorkbookFidelity !== false,
  }));
  const rows = (bundle?.rows || []).map((row) => SUPPORT_REPORT_COLUMNS.map((column) => {
    const value = supportReportColumnValue(row, column);
    if (value == null) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? value : '';
    return String(value);
  }));
  const matrix = [];
  if (includeOrdinalRow) matrix.push(SUPPORT_REPORT_COLUMNS.map((_, index) => index + 1));
  matrix.push(header, ...rows);
  return matrix;
}

export function createSupportReportWorkbook(bundle, XLSX, options = {}) {
  assertXlsx(XLSX);
  const matrix = supportReportSpreadsheetMatrix(bundle, options);
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  worksheet['!cols'] = SUPPORT_REPORT_COLUMNS.map((column) => ({
    wch: columnWidth(column.key),
  }));
  if ((bundle?.rows || []).length > 0) {
    const headerRow = options.includeOrdinalRow === false ? 1 : 2;
    worksheet['!autofilter'] = { ref: `A${headerRow}:U${matrix.length}` };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || DEFAULT_SHEET_NAME);
  return workbook;
}

export async function supportReportToXlsxBytes(bundle, options = {}) {
  const XLSX = options.XLSX || await loadXlsx(options.importModule);
  const workbook = createSupportReportWorkbook(bundle, XLSX, options);
  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    compression: true,
  });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

async function loadXlsx(importModule = (url) => import(url)) {
  const module = await importModule(XLSX_MODULE_URL);
  return module?.default || module;
}

function assertXlsx(XLSX) {
  const missing = [];
  if (typeof XLSX?.utils?.aoa_to_sheet !== 'function') missing.push('utils.aoa_to_sheet');
  if (typeof XLSX?.utils?.book_new !== 'function') missing.push('utils.book_new');
  if (typeof XLSX?.utils?.book_append_sheet !== 'function') missing.push('utils.book_append_sheet');
  if (typeof XLSX?.write !== 'function') missing.push('write');
  if (missing.length) throw new Error(`SheetJS XLSX writer is unavailable: ${missing.join(', ')}`);
}

function columnWidth(key) {
  if (['pipe', 'primarySupportDescription', 'remarks'].includes(key)) return 42;
  if (['pipingPrimarySupport', 'supportType', 'pipingPrimarySupportReference'].includes(key)) return 34;
  if (['civilSecondarySupport', 'primarySupportZone', 'primarySupportSite'].includes(key)) return 28;
  if (['pipeInsulationThickness', 'pipeInsulationType', 'stressSystemNumber'].includes(key)) return 24;
  return 18;
}

export const _test = Object.freeze({ columnWidth, XLSX_MODULE_URL });
