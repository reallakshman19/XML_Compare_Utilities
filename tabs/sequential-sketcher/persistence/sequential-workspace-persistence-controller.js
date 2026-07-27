import {
  restoreSequentialWorkspacePackageWithReceipts,
  serializeSequentialWorkspacePackageWithReceipts,
} from './sequential-workspace-package-receipts.js';
import {
  buildSequentialWorkspaceImportPreview,
  formatSequentialWorkspaceImportPreview,
  sequentialWorkspaceCurrentStateFingerprint,
  sequentialWorkspaceRestorationStateFingerprint,
} from './sequential-workspace-import-preview.js';
import {
  createSequentialWorkspaceApplicationReceipt,
  validateSequentialWorkspaceApplicationApproval,
} from './sequential-workspace-application-receipt.js';

function required(root, selector) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Sequential persistence element missing: ${selector}`);
  return element;
}
function setSummary(element, message, state = 'info') {
  element.textContent = message;
  element.dataset.state = state;
}
function downloadText(documentRef, filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function timestamp() { return new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/u, 'Z'); }
function createdAt() { return new Date().toISOString(); }
function postCommit(action) { try { action(); } catch {} }

export function mountSequentialWorkspacePersistenceController(root, workspace, context = {}) {
  const exportButton = required(root, '[data-ssk-workspace-export]');
  const importInput = required(root, '[data-ssk-workspace-import]');
  const applyButton = required(root, '[data-ssk-workspace-apply]');
  const cancelButton = required(root, '[data-ssk-workspace-cancel]');
  const receiptButton = required(root, '[data-ssk-workspace-receipt-export]');
  const reasonInput = required(root, '[data-ssk-workspace-apply-reason]');
  const evidenceInput = required(root, '[data-ssk-workspace-apply-evidence]');
  const summary = required(root, '[data-ssk-workspace-package-summary]');
  let pendingRestoration = null;
  let pendingPreview = null;
  let lastReceipt = null;

  function setPending(restoration, preview) {
    pendingRestoration = restoration;
    pendingPreview = preview;
    applyButton.disabled = !pendingRestoration;
    cancelButton.disabled = !pendingRestoration;
  }
  function clearPending() { setPending(null, null); }
  function clearApproval() { reasonInput.value = ''; evidenceInput.value = ''; }
  function applicationReceipts() { return workspace?.getModel?.()?.workspaceApplicationReceipts || []; }

  function exportPackage() {
    const model = workspace?.getModel?.();
    workspace?.saveActiveBranch?.();
    if (!Array.isArray(model?.records) || !model?.evidence) {
      setSummary(summary, 'Load or restore source evidence before exporting a session package.', 'error');
      return null;
    }
    const json = serializeSequentialWorkspacePackageWithReceipts({
      records: model.records,
      evidence: model.evidence,
      branchRegistry: model.branchRegistry,
      activeBranchId: model.session?.rootBranchId || null,
      reviewQueue: workspace?.getReviewQueue?.() || null,
      journalState: model.journalState,
      createdAt: createdAt(),
      applicationReceipts: applicationReceipts(),
    });
    const packageValue = JSON.parse(json);
    downloadText(root.ownerDocument, `sequential-workspace-${timestamp()}.json`, json);
    const saved = model.branchRegistry.savedCount();
    setSummary(summary, `Exported ${packageValue.schema} revision ${packageValue.revision}: ${saved} saved branch workspaces, journal authority ${model.journalState ? 'present' : 'absent'}, and ${applicationReceipts().length} application receipts.`, 'ok');
    context.showToast?.(`${packageValue.schema} exported.`, 'success');
    return json;
  }

  async function previewFile(file) {
    if (!file) return null;
    workspace?.saveActiveBranch?.();
    const restoration = restoreSequentialWorkspacePackageWithReceipts(await file.text());
    const preview = buildSequentialWorkspaceImportPreview(restoration, workspace?.getModel?.() || {});
    setPending(restoration, preview);
    setSummary(summary, `${formatSequentialWorkspaceImportPreview(preview)} Package history contains ${restoration.applicationReceipts.length} application receipts.`, preview.hasDestructiveChanges ? 'warning' : 'ok');
    context.showToast?.(`${preview.packageSchema} verified; journal impact ${preview.journalImpact}.`, 'success');
    return Object.freeze({ restoration, preview });
  }

  function approval() {
    return validateSequentialWorkspaceApplicationApproval(pendingPreview, {
      reason: reasonInput.value,
      evidenceNote: evidenceInput.value,
    });
  }
  function preparedReceipt(restoration, preview, beforeFingerprint, approved) {
    const afterFingerprint = sequentialWorkspaceRestorationStateFingerprint(restoration);
    return createSequentialWorkspaceApplicationReceipt({
      preview,
      restoration,
      beforeFingerprint,
      afterFingerprint,
      reason: approved.reason,
      evidenceNote: approved.evidenceNote,
      sequence: restoration.applicationReceipts.length + 1,
    });
  }
  function settleApplied(restoration, preview, receipt) {
    lastReceipt = receipt;
    pendingRestoration = null;
    pendingPreview = null;
    postCommit(() => { receiptButton.disabled = false; });
    postCommit(() => { applyButton.disabled = true; cancelButton.disabled = true; });
    postCommit(clearApproval);
    postCommit(() => setSummary(summary, `Applied ${preview.packageSchema} revision ${preview.packageRevision}; journal impact ${preview.journalImpact}; receipt ${receipt.receiptId}.`, 'ok'));
    postCommit(() => context.showToast?.(`${preview.packageSchema} applied and receipt recorded.`, 'success'));
    return Object.freeze({ restoration, receipt });
  }

  function applyPending() {
    if (!pendingRestoration || !pendingPreview) {
      setSummary(summary, 'Select and verify a package before applying it.', 'info');
      return null;
    }
    workspace?.saveActiveBranch?.();
    const beforeFingerprint = sequentialWorkspaceCurrentStateFingerprint(workspace?.getModel?.() || {});
    if (beforeFingerprint !== pendingPreview.currentStateFingerprint) {
      clearPending();
      const message = 'WORKSPACE_IMPORT_PREVIEW_STALE: current source, branch, selection, or journal work changed after preview.';
      setSummary(summary, message, 'error');
      context.showToast?.(message, 'error');
      return Object.freeze({ outcome: 'WORKSPACE_IMPORT_PREVIEW_STALE' });
    }
    const approved = approval();
    const restoration = pendingRestoration;
    const preview = pendingPreview;
    const receipt = preparedReceipt(restoration, preview, beforeFingerprint, approved);
    const receipts = Object.freeze([...restoration.applicationReceipts, receipt]);
    workspace?.restorePackage?.(restoration, {
      applicationReceipts: receipts,
      expectedJournalImpact: preview.journalImpact,
    });
    return settleApplied(restoration, preview, receipt);
  }

  function cancelPending() {
    if (!pendingRestoration) {
      setSummary(summary, 'No verified package preview is pending.', 'info');
      return false;
    }
    clearPending();
    clearApproval();
    setSummary(summary, 'Verified package preview cancelled. No workspace or journal authority was changed.', 'info');
    return true;
  }
  function exportLastReceipt() {
    if (!lastReceipt) return null;
    const json = JSON.stringify(lastReceipt, null, 2);
    downloadText(root.ownerDocument, `sequential-workspace-apply-receipt-${timestamp()}.json`, json);
    return json;
  }
  function onClick(event) {
    try {
      if (event.target?.closest?.('[data-ssk-workspace-export]')) exportPackage();
      else if (event.target?.closest?.('[data-ssk-workspace-apply]')) applyPending();
      else if (event.target?.closest?.('[data-ssk-workspace-cancel]')) cancelPending();
      else if (event.target?.closest?.('[data-ssk-workspace-receipt-export]')) exportLastReceipt();
      else return;
      event.preventDefault();
    } catch (error) {
      setSummary(summary, `Operation blocked: ${error.message || String(error)}`, 'error');
      context.showToast?.(error.message || String(error), 'error');
    }
  }
  async function onChange(event) {
    if (event.target !== importInput) return;
    clearPending();
    try { await previewFile(importInput.files?.[0]); } catch (error) {
      setSummary(summary, `Import preview blocked: ${error.message || String(error)}`, 'error');
      context.showToast?.(error.message || String(error), 'error');
    } finally { importInput.value = ''; }
  }

  exportButton.addEventListener('click', onClick);
  applyButton.addEventListener('click', onClick);
  cancelButton.addEventListener('click', onClick);
  receiptButton.addEventListener('click', onClick);
  importInput.addEventListener('change', onChange);
  clearPending();
  receiptButton.disabled = true;
  return Object.freeze({
    exportPackage, previewFile, applyPending, cancelPending, exportLastReceipt,
    getPendingPreview: () => pendingPreview,
    getLastReceipt: () => lastReceipt,
    destroy() {
      exportButton.removeEventListener('click', onClick);
      applyButton.removeEventListener('click', onClick);
      cancelButton.removeEventListener('click', onClick);
      receiptButton.removeEventListener('click', onClick);
      importInput.removeEventListener('change', onChange);
      clearPending();
    },
  });
}
