import { createTransferExportReceipt } from './XmlCompareTransferExportReceipt.js';

export const XML_COMPARE_TRANSFER_OUTPUT_MODEL_SCHEMA = 'xml-compare-transfer-output-model/v1';

const clean = (value) => String(value ?? '').trim();
const asArray = (items) => Object.freeze([...(Array.isArray(items) ? items : [])]);

function countBlockedRows(audit = null) {
  const rows = [...(audit?.changedBlocks || []), ...(audit?.skippedBlocks || [])];
  return rows.filter((row) => clean(row.status) === 'blocked').length + Number(audit?.blockerCount || 0);
}

function baseName(name = '') {
  return clean(name).replace(/\.(xml|json|txt)$/i, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
}

function selectedBlocksOf(tState = {}, input = {}) {
  return asArray(tState.transferStage?.selectedBlocks?.length ? tState.transferStage.selectedBlocks : input.aim?.transferBlocks || []);
}

function scopeOf(tState = {}, input = {}) {
  return clean(tState.transferLastResult?.scope || tState.transferStage?.scope || input.transferWorkflowGate?.scope || 'node');
}

function actionMarksOutputDone(action = '') {
  const value = clean(action);
  return value === 'output-done' || value === 'export-patched' || value === 'export-audit' || value === 'export-proof' || value === 'copy-patched' || value.startsWith('export-');
}

function receiptFileForAction(action = '', summary = {}) {
  const value = clean(action);
  if (value === 'export-audit') return summary.fileNames?.transferAuditJson || '';
  if (value === 'export-proof') return summary.fileNames?.transferProofJson || '';
  if (value === 'copy-patched') return 'Copied patched Target preview';
  return summary.fileNames?.patchedTargetXml || '';
}

function receiptActionType(action = '') {
  const value = clean(action);
  if (value === 'export-audit') return 'export-transfer-audit-json';
  if (value === 'export-proof') return 'download-transfer-proof-json';
  if (value === 'copy-patched') return 'copy-patched-target-preview';
  return 'export-patched-target-xml';
}

function persistReceipt(tState = {}, summary = {}) {
  if (!actionMarksOutputDone(summary.lastAction)) return null;
  const receipt = createTransferExportReceipt({ actionType: receiptActionType(summary.lastAction), fileName: receiptFileForAction(summary.lastAction, summary), summary, outputStatus: summary.outputStatus });
  const holder = tState.transferLastResult || tState.transferStage;
  if (holder && typeof holder === 'object') {
    try { holder.lastOutputReceipt = receipt; } catch {}
  }
  return receipt;
}

export function buildTransferOutputFileNames(input = {}) {
  const targetBase = baseName(input.targetFileName || input.target?.fileName || input.fileB?.name || '') || 'xml_compare';
  return Object.freeze({
    patchedTargetXml: `${targetBase}_patched_target.xml`,
    transferAuditJson: `${targetBase}_transfer_audit.json`,
    transferProofJson: `${targetBase}_transfer_proof.json`,
  });
}

export function transferOutputStatus(summary = {}) {
  if (summary.hasAppliedResult && summary.hasPatchedTargetText) return actionMarksOutputDone(summary.lastAction) ? 'exported' : 'applied';
  if (summary.blockedCount > 0 || summary.outputStatus === 'blocked') return 'blocked';
  if (summary.hasStage) return 'staged';
  return 'no-stage';
}

export function summarizeTransferOutput({ input = {}, tState = {}, lastAction = '' } = {}) {
  const result = tState.transferLastResult || null;
  const audit = tState.transferAudit || null;
  const updatedCount = Number(result?.updatedCount ?? audit?.updatedCount ?? 0);
  const skippedCount = Number(result?.skippedCount ?? audit?.skippedCount ?? (audit?.skippedBlocks || []).length ?? 0);
  const blockedCount = Number(result?.blockedCount ?? countBlockedRows(audit));
  const files = buildTransferOutputFileNames({ targetFileName: input.target?.fileName || input.targetFileName || input.fileB?.name });
  const summary = {
    schema: XML_COMPARE_TRANSFER_OUTPUT_MODEL_SCHEMA,
    hasStage: Boolean(tState.transferStage?.plan || tState.transferStage),
    hasAppliedResult: Boolean(result),
    hasPatchedTargetText: Boolean(clean(result?.patchedTargetText)),
    scope: scopeOf(tState, input),
    selectedBlocks: selectedBlocksOf(tState, input),
    updatedCount,
    skippedCount,
    blockedCount,
    sourceFileName: clean(input.source?.fileName || input.sourceFileName || input.fileA?.name || 'Source A'),
    targetFileName: clean(input.target?.fileName || input.targetFileName || input.fileB?.name || 'Target B'),
    patchedTargetText: String(result?.patchedTargetText || ''),
    blockedReasons: asArray([...(result?.diagnostics || []), ...(audit?.diagnostics || [])]).map((d) => clean(d.message || d.code)).filter(Boolean),
    fileNames: files,
    lastAction: clean(lastAction || input.transferModal?.lastTransferOutputAction || ''),
  };
  const output = Object.freeze({ ...summary, outputStatus: transferOutputStatus(summary) });
  persistReceipt(tState, output);
  return output;
}

export const _test = Object.freeze({ clean, baseName, countBlockedRows, selectedBlocksOf, scopeOf, actionMarksOutputDone, receiptFileForAction, receiptActionType, persistReceipt });
