import {
  restoreSequentialWorkspacePackage,
  serializeSequentialWorkspacePackage,
} from './sequential-workspace-package.js';
import {
  buildSequentialWorkspaceImportPreview,
  formatSequentialWorkspaceImportPreview,
  sequentialWorkspaceCurrentStateFingerprint,
} from './sequential-workspace-import-preview.js';

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
function filename() {
  return `sequential-workspace-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/u, 'Z')}.json`;
}

export function mountSequentialWorkspacePersistenceController(root, workspace, context = {}) {
  const exportButton = required(root, '[data-ssk-workspace-export]');
  const importInput = required(root, '[data-ssk-workspace-import]');
  const applyButton = required(root, '[data-ssk-workspace-apply]');
  const cancelButton = required(root, '[data-ssk-workspace-cancel]');
  const summary = required(root, '[data-ssk-workspace-package-summary]');
  let pendingRestoration = null;
  let pendingPreview = null;

  function setPending(restoration, preview) {
    pendingRestoration = restoration;
    pendingPreview = preview;
    applyButton.disabled = !pendingRestoration;
    cancelButton.disabled = !pendingRestoration;
  }
  function clearPending() {
    setPending(null, null);
  }

  function exportPackage() {
    const model = workspace?.getModel?.();
    workspace?.saveActiveBranch?.();
    if (!Array.isArray(model?.records) || !model?.evidence) {
      setSummary(summary, 'Load or restore source evidence before exporting a session package.', 'error');
      return null;
    }
    const json = serializeSequentialWorkspacePackage({
      records: model.records,
      evidence: model.evidence,
      branchRegistry: model.branchRegistry,
      activeBranchId: model.session?.rootBranchId || null,
      reviewQueue: workspace?.getReviewQueue?.() || null,
    });
    downloadText(root.ownerDocument, filename(), json);
    const saved = model.branchRegistry.savedCount();
    setSummary(summary, `Exported ${saved} saved branch workspace${saved === 1 ? '' : 's'} with source evidence and audit history.`, 'ok');
    context.showToast?.('Sequential workspace package exported.', 'success');
    return json;
  }

  async function previewFile(file) {
    if (!file) return null;
    workspace?.saveActiveBranch?.();
    const text = await file.text();
    const restoration = restoreSequentialWorkspacePackage(text);
    const preview = buildSequentialWorkspaceImportPreview(restoration, workspace?.getModel?.() || {});
    setPending(restoration, preview);
    setSummary(summary, formatSequentialWorkspaceImportPreview(preview), preview.hasDestructiveChanges ? 'warning' : 'ok');
    context.showToast?.('Sequential workspace package verified. Review and apply explicitly.', 'success');
    return Object.freeze({ restoration, preview });
  }

  function applyPending() {
    if (!pendingRestoration || !pendingPreview) {
      setSummary(summary, 'Select and verify a package before applying it.', 'info');
      return null;
    }
    workspace?.saveActiveBranch?.();
    const currentFingerprint = sequentialWorkspaceCurrentStateFingerprint(workspace?.getModel?.() || {});
    if (currentFingerprint !== pendingPreview.currentStateFingerprint) {
      clearPending();
      const message = 'WORKSPACE_IMPORT_PREVIEW_STALE: current source or branch work changed after preview. Select the package again to create a fresh preview.';
      setSummary(summary, message, 'error');
      context.showToast?.(message, 'error');
      return Object.freeze({ outcome: 'WORKSPACE_IMPORT_PREVIEW_STALE' });
    }
    const restoration = pendingRestoration;
    workspace?.restorePackage?.(restoration);
    clearPending();
    const register = restoration.decisionRegister?.summary;
    const registerText = register
      ? ` Decision register: ${register.unresolvedCount || 0} unresolved, ${register.manualResolutionCount || 0} manual.`
      : '';
    setSummary(
      summary,
      `Applied ${restoration.workspaces.length} verified branch workspace${restoration.workspaces.length === 1 ? '' : 's'} from package ${restoration.packageFingerprint}.${registerText}`,
      'ok',
    );
    context.showToast?.('Sequential workspace package applied.', 'success');
    return restoration;
  }

  function cancelPending() {
    if (!pendingRestoration) {
      setSummary(summary, 'No verified package preview is pending.', 'info');
      return false;
    }
    clearPending();
    setSummary(summary, 'Verified package preview cancelled. No source or branch workspace was changed.', 'info');
    return true;
  }

  function onClick(event) {
    if (event.target?.closest?.('[data-ssk-workspace-export]')) {
      event.preventDefault();
      try { exportPackage(); } catch (error) {
        setSummary(summary, error.message || String(error), 'error');
        context.showToast?.(error.message || String(error), 'error');
      }
      return;
    }
    if (event.target?.closest?.('[data-ssk-workspace-apply]')) {
      event.preventDefault();
      try { applyPending(); } catch (error) {
        setSummary(summary, `Apply blocked: ${error.message || String(error)}`, 'error');
        context.showToast?.(error.message || String(error), 'error');
      }
      return;
    }
    if (event.target?.closest?.('[data-ssk-workspace-cancel]')) {
      event.preventDefault();
      cancelPending();
    }
  }
  async function onChange(event) {
    if (event.target !== importInput) return;
    clearPending();
    try { await previewFile(importInput.files?.[0]); } catch (error) {
      setSummary(summary, `Import preview blocked: ${error.message || String(error)}`, 'error');
      context.showToast?.(error.message || String(error), 'error');
    } finally {
      importInput.value = '';
    }
  }

  exportButton.addEventListener('click', onClick);
  applyButton.addEventListener('click', onClick);
  cancelButton.addEventListener('click', onClick);
  importInput.addEventListener('change', onChange);
  clearPending();
  return Object.freeze({
    exportPackage,
    previewFile,
    applyPending,
    cancelPending,
    getPendingPreview: () => pendingPreview,
    destroy() {
      exportButton.removeEventListener('click', onClick);
      applyButton.removeEventListener('click', onClick);
      cancelButton.removeEventListener('click', onClick);
      importInput.removeEventListener('change', onChange);
      clearPending();
    },
  });
}
