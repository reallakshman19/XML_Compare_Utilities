import { summarizeTransferExportReceipt } from './XmlCompareTransferExportReceipt.js';

export const XML_COMPARE_TRANSFER_EXPORT_HISTORY_SCHEMA = 'xml-compare-transfer-export-history/v1';
export const TRANSFER_EXPORT_HISTORY_LIMIT = 20;

const clean = (value) => String(value ?? '').trim();
const asArray = (value) => Object.freeze([...(Array.isArray(value) ? value : [])]);

function rowsOf(history = null) {
  return asArray(Array.isArray(history) ? history : history?.rows || []);
}

function rowFromReceipt(receipt = null) {
  const summary = summarizeTransferExportReceipt(receipt);
  if (summary.isEmpty) return null;
  return Object.freeze({
    actionType: clean(summary.actionType),
    fileName: clean(summary.fileName || summary.label),
    label: clean(summary.label || summary.fileName),
    timestamp: clean(summary.timestamp),
    updatedCount: Number(summary.updatedCount || 0),
    skippedCount: Number(summary.skippedCount || 0),
    blockedCount: Number(summary.blockedCount || 0),
    outputStatus: clean(summary.outputStatus || 'no-stage'),
  });
}

export function emptyTransferExportHistory() {
  return Object.freeze({
    schema: XML_COMPARE_TRANSFER_EXPORT_HISTORY_SCHEMA,
    rows: Object.freeze([]),
  });
}

export function appendTransferExportHistory(history = null, receipt = null) {
  const row = rowFromReceipt(receipt);
  if (!row) return emptyTransferExportHistory();
  return Object.freeze({
    schema: XML_COMPARE_TRANSFER_EXPORT_HISTORY_SCHEMA,
    rows: Object.freeze([...rowsOf(history), row].slice(-TRANSFER_EXPORT_HISTORY_LIMIT)),
  });
}

export function clearTransferExportHistory() {
  return emptyTransferExportHistory();
}

export function summarizeTransferExportHistory(history = null) {
  return Object.freeze({
    schema: XML_COMPARE_TRANSFER_EXPORT_HISTORY_SCHEMA,
    isEmpty: rowsOf(history).length === 0,
    rows: rowsOf(history),
    rowCount: rowsOf(history).length,
    maxRows: TRANSFER_EXPORT_HISTORY_LIMIT,
  });
}

export function serializeTransferExportHistoryJson(history = null) {
  return `${JSON.stringify(summarizeTransferExportHistory(history), null, 2)}\n`;
}

export const _test = Object.freeze({ clean, asArray, rowsOf, rowFromReceipt });
