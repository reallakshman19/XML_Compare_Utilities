const XLSX_MODULE_URL = 'https://esm.sh/xlsx@0.18.5';
const REMARKS_HEADER = 'REMARKS (IF ANY)';

export function buildRevisionOutputMatrix(rev1Source, rev2Source, remarks) {
  const targetHeaders = [...(rev2Source?.headers || [])];
  let remarksIndex = targetHeaders.findIndex((header) => header === REMARKS_HEADER);
  if (remarksIndex < 0) { targetHeaders.push(REMARKS_HEADER); remarksIndex = targetHeaders.length - 1; }
  const rows = [];
  for (const row of rev2Source?.rows || []) {
    const values = targetHeaders.map((_, index) => index < row.rawCells.length ? row.rawCells[index] ?? '' : '');
    values[remarksIndex] = remarks?.targetRemarks?.[row.rowId]?.remark || '';
    rows.push(Object.freeze({ disposition: 'REV2', sourceRowId: row.rowId, values: Object.freeze(values) }));
  }
  for (const row of rev1Source?.rows || []) {
    const remark = remarks?.sourceRemarks?.[row.rowId]?.remark;
    if (!remark) continue;
    const values = projectRowToHeaders(rev1Source, row, targetHeaders);
    values[remarksIndex] = remark;
    rows.push(Object.freeze({ disposition: 'TOMBSTONE', sourceRowId: row.rowId, values: Object.freeze(values) }));
  }
  return Object.freeze({ headers: Object.freeze(targetHeaders), rows: Object.freeze(rows) });
}

export function revisionOutputToCsv(output) {
  return [output.headers, ...output.rows.map((row) => row.values)].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function buildComparisonAudit({ pair, lineage, ledger, remarks }) {
  return Object.freeze({
    schema: 'support-revision-comparison-audit/v1',
    profileId: pair.profileId,
    sourceRevision: pair.rev1.revision,
    targetRevision: pair.rev2.revision,
    conversion: Object.freeze({
      rev1: conversionReceipt(pair.rev1),
      rev2: conversionReceipt(pair.rev2),
    }),
    lineage,
    eventLedger: ledger,
    remarkPolicyId: remarks.policyId,
    remarkTrace: remarks.trace,
    invariant: 'TABLE->CATEGORIZED_XML->XML_LINEAGE->EVENT_LEDGER->REVISION_OUTPUT',
  });
}

export function buildSupportRevisionArtifacts(result) {
  const audit = buildComparisonAudit(result);
  return Object.freeze({
    outputCsv: revisionOutputToCsv(result.output),
    comparisonAuditJson: JSON.stringify(audit, jsonReplacer, 2),
    rev1Xml: result.pair.rev1.exportResult.xmlText || '',
    rev2Xml: result.pair.rev2.exportResult.xmlText || '',
    rev1GraphJson: result.pair.rev1.exportResult.graphJson || JSON.stringify(result.pair.rev1.graph, null, 2),
    rev2GraphJson: result.pair.rev2.exportResult.graphJson || JSON.stringify(result.pair.rev2.graph, null, 2),
    profileJson: result.pair.rev2.exportResult.profileJson || JSON.stringify(result.pair.rev2.profile, jsonReplacer, 2),
  });
}

export async function supportRevisionToXlsxBytes(result, options = {}) {
  const XLSX = options.XLSX || await loadXlsx(options.importModule);
  assertXlsx(XLSX);
  const workbook = XLSX.utils.book_new();
  const outputMatrix = [result.output.headers, ...result.output.rows.map((row) => row.values)];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(outputMatrix), 'Rev Compare');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(auditEventMatrix(result.ledger)), 'Rev Compare Audit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lineageMatrix(result.lineage)), 'Lineage');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(remarkTraceMatrix(result.remarks)), 'Remark Trace');
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

function projectRowToHeaders(source, row, targetHeaders) {
  const sourceIndexes = new Map();
  (source.headers || []).forEach((header, index) => {
    if (!sourceIndexes.has(header)) sourceIndexes.set(header, []);
    sourceIndexes.get(header).push(index);
  });
  const seen = new Map();
  return targetHeaders.map((header) => {
    const ordinal = (seen.get(header) || 0); seen.set(header, ordinal + 1);
    const index = sourceIndexes.get(header)?.[ordinal];
    return index == null ? '' : row.rawCells?.[index] ?? '';
  });
}

function conversionReceipt(conversion) {
  return Object.freeze({
    ok: conversion.ok,
    sourceId: conversion.source?.sourceId || '',
    rowCount: conversion.source?.rows?.length || 0,
    columnIds: Object.freeze([...(conversion.source?.columnIds || [])]),
    xmlProfileId: conversion.profile?.profileId || '',
    graphNodeCount: conversion.graph?.nodes?.length || 0,
    diagnostics: Object.freeze([...(conversion.validationResults || [])]),
  });
}

function auditEventMatrix(ledger) {
  const header = ['eventId','type','sourceXmlNode','targetXmlNode','sourceCsvRowId','targetCsvRowId','matchingMethod','reasonCodes','persistentReferences','coordinateResidualMm','policyVersion','auditStatus','remarkEligible','lineageEdgeId','candidateIds'];
  return [header, ...(ledger?.events || []).map((event) => [event.eventId,event.type,event.sourceXmlNode || '',event.targetXmlNode || '',event.sourceCsvRowId || '',event.targetCsvRowId || '',event.matchingMethod,(event.reasonCodes || []).join('|'),(event.persistentReferences || []).join('|'),event.coordinateResidual?.residualMm ?? '',event.policyVersion,event.auditStatus,event.remarkEligible ? 'true' : 'false',event.lineageEdgeId || '',(event.candidateIds || []).join('|')])];
}
function lineageMatrix(lineage) {
  const header = ['edgeId','cardinality','outcome','matchingMethod','sourceNodeIds','targetNodeIds','reasonCodes','persistentReferences','candidateIds'];
  return [header, ...(lineage?.edges || []).map((edge) => [edge.edgeId,edge.cardinality,edge.outcome,edge.matchingMethod,(edge.sourceNodeIds || []).join('|'),(edge.targetNodeIds || []).join('|'),(edge.reasonCodes || []).join('|'),(edge.persistentReferences || []).join('|'),(edge.candidateIds || []).join('|')])];
}
function remarkTraceMatrix(remarks) {
  const header = ['eventId','side','rowId','tokenKey','token','sourceXmlNode','targetXmlNode','lineageEdgeId','candidateIds'];
  return [header, ...(remarks?.trace || []).map((row) => [row.eventId,row.side,row.rowId,row.tokenKey,row.token,row.sourceXmlNode || '',row.targetXmlNode || '',row.lineageEdgeId || '',(row.candidateIds || []).join('|')])];
}
function csvCell(value) { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function jsonReplacer(_key, value) { return value instanceof Map ? Object.fromEntries(value) : value; }
async function loadXlsx(importModule = (url) => import(url)) { const module = await importModule(XLSX_MODULE_URL); return module?.default || module; }
function assertXlsx(XLSX) { if (!XLSX?.utils?.aoa_to_sheet || !XLSX?.utils?.book_new || !XLSX?.utils?.book_append_sheet || !XLSX?.write) throw new Error('SheetJS XLSX writer is unavailable.'); }

export const _test = Object.freeze({ projectRowToHeaders, csvCell, auditEventMatrix, lineageMatrix, remarkTraceMatrix, XLSX_MODULE_URL });
