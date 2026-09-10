import {
  supportReportColumns,
  supportReportColumnHeader,
  supportReportColumnValue,
} from './support-report-contract.js?v=20260910-support-report-typicality-columns-1';

const DEFAULT_SHEET_NAME = 'Support Report';
const DEFAULT_AUDIT_SHEET_NAME = 'Typicality Audit';
const XLSX_MODULE_URL = 'https://esm.sh/xlsx@0.18.5';

export function supportReportSpreadsheetMatrix(bundle, options = {}) {
  const columns = supportReportColumns(bundle, options);
  const includeOrdinalRow = options.includeOrdinalRow !== false;
  const header = columns.map((column) => supportReportColumnHeader(column, {
    ...options,
    ownerWorkbookFidelity: options.ownerWorkbookFidelity !== false,
  }));
  const rows = (bundle?.rows || []).map((row) => columns.map((column) => {
    const value = supportReportColumnValue(row, column);
    if (value == null) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? value : '';
    return String(value);
  }));
  const matrix = [];
  if (includeOrdinalRow) matrix.push(columns.map((_, index) => index + 1));
  matrix.push(header, ...rows);
  return matrix;
}

export function typicalityAuditSpreadsheetMatrix(audit) {
  const header = [
    'Audit ID', 'Parent Audit ID', 'Left PS', 'Right PS', 'Left Location ID', 'Right Location ID',
    'Signal / Rule', 'Left Raw', 'Right Raw', 'Left Normalized', 'Right Normalized', 'Residual', 'Threshold',
    'Result', 'Reason Code', 'Source Evidence IDs', 'Profile Version',
  ];
  const rows = [];
  for (const comparison of audit?.familyComparisons || []) {
    for (const signal of comparison.signals || []) {
      rows.push([
        comparison.auditId, '', comparison.leftFamilyId, comparison.rightFamilyId, '', '',
        signal.reasonCode || 'STRUCTURAL_SIGNAL', auditCell(signal.left), auditCell(signal.right), '', '',
        auditCell(signal.residual), auditCell(signal.threshold), signal.result || '', signal.reasonCode || '', '',
        audit?.profileId || '',
      ]);
    }
  }
  for (const assignment of audit?.locationAssignments || []) {
    const selectedById = new Map((assignment.selectedAssignments || [])
      .map((item) => [item.candidateId, item]));
    for (const candidate of assignment.candidatePairs || []) {
      rows.push([
        selectedById.get(candidate.candidateId)?.auditId || candidate.candidateId,
        assignment.parentAuditId || '', assignment.leftFamilyId, assignment.rightFamilyId,
        candidate.leftLocationId, candidate.rightLocationId, 'LOCATION_CANDIDATE',
        auditCell(candidate.supportTypeComparison?.leftRaw), auditCell(candidate.supportTypeComparison?.rightRaw),
        auditCell(candidate.supportTypeComparison?.leftCanonical), auditCell(candidate.supportTypeComparison?.rightCanonical),
        candidate.assignmentCost, '',
        candidate.eligible ? (selectedById.has(candidate.candidateId) ? 'SELECTED' : 'ELIGIBLE') : 'INELIGIBLE',
        candidate.signals?.pipeClass?.reasonCode || '',
        auditCell([...(candidate.sourceEvidence?.leftClashIds || []), ...(candidate.sourceEvidence?.rightClashIds || [])]),
        audit?.profileId || '',
      ]);
    }
    for (const pair of assignment.selectedAssignments || []) {
      rows.push([
        pair.auditId || '', assignment.parentAuditId || '', assignment.leftFamilyId, assignment.rightFamilyId,
        pair.leftLocationId, pair.rightLocationId, 'PIPING_SUPPORT_ARRANGEMENT',
        auditCell(pair.supportTypeComparison?.leftRaw), auditCell(pair.supportTypeComparison?.rightRaw),
        auditCell(pair.supportTypeComparison?.leftCanonical), auditCell(pair.supportTypeComparison?.rightCanonical),
        auditCell(pair.signals?.geometry?.residual), auditCell(pair.signals?.geometry?.thresholdMm),
        pair.arrangementResult || '', arrangementReasonCodes(pair).join(', '),
        auditCell([...(pair.sourceEvidence?.leftClashIds || []), ...(pair.sourceEvidence?.rightClashIds || [])]),
        audit?.profileId || '',
      ]);
    }
  }
  return [header, ...rows];
}

export function createSupportReportWorkbook(bundle, XLSX, options = {}) {
  assertXlsx(XLSX);
  const columns = supportReportColumns(bundle, options);
  const matrix = supportReportSpreadsheetMatrix(bundle, options);
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  worksheet['!cols'] = columns.map((column) => ({ wch: columnWidth(column.key) }));
  if ((bundle?.rows || []).length > 0) {
    const headerRow = options.includeOrdinalRow === false ? 1 : 2;
    worksheet['!autofilter'] = {
      ref: `A${headerRow}:${columnLetter(columns.length - 1)}${matrix.length}`,
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || DEFAULT_SHEET_NAME);
  const auditMatrix = typicalityAuditSpreadsheetMatrix(bundle?.typicalityAudit);
  if (bundle?.typicalityAudit && auditMatrix.length > 1) {
    const auditWorksheet = XLSX.utils.aoa_to_sheet(auditMatrix);
    auditWorksheet['!cols'] = auditMatrix[0].map((_, index) => ({ wch: auditColumnWidth(index) }));
    auditWorksheet['!autofilter'] = {
      ref: `A1:${columnLetter(auditMatrix[0].length - 1)}${auditMatrix.length}`,
    };
    XLSX.utils.book_append_sheet(workbook, auditWorksheet,
      options.auditSheetName || DEFAULT_AUDIT_SHEET_NAME);
  }
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

function arrangementReasonCodes(pair) {
  return [...new Set([
    ...(pair?.supportTypeComparison?.reasonCodes || []),
    pair?.signals?.pipeClass?.reasonCode,
    pair?.signals?.memberMultiplicity?.reasonCode,
    pair?.signals?.geometry?.reasonCode,
  ].filter(Boolean))];
}
function auditCell(value) {
  if (value == null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
function columnLetter(index) {
  let value = index + 1;
  let output = '';
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}
function auditColumnWidth(index) {
  return [0, 1, 6, 14, 15].includes(index) ? 30 : [7, 8, 9, 10].includes(index) ? 38 : 20;
}
function columnWidth(key) {
  if (['pipe', 'primarySupportDescription', 'remarks', 'pipingSupportArrangementMatch'].includes(key)) return 42;
  if (['pipingPrimarySupport', 'supportType', 'pipingPrimarySupportReference'].includes(key)) return 34;
  if (['civilSecondarySupport', 'primarySupportZone', 'primarySupportSite', 'typicalStructure', 'typicalityAuditId'].includes(key)) return 28;
  if (['pipeInsulationThickness', 'pipeInsulationType', 'stressSystemNumber'].includes(key)) return 24;
  return 18;
}

export const _test = Object.freeze({ columnWidth, columnLetter, XLSX_MODULE_URL });
