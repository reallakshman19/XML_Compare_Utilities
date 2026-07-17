import {
  restoreSequentialWorkspacePackage,
  serializeSequentialWorkspacePackage,
} from './sequential-workspace-package.js';

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
  const summary = required(root, '[data-ssk-workspace-package-summary]');

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

  async function importFile(file) {
    if (!file) return null;
    const text = await file.text();
    const restoration = restoreSequentialWorkspacePackage(text);
    workspace?.restorePackage?.(restoration);
    const register = restoration.decisionRegister?.summary;
    const registerText = register
      ? ` Decision register: ${register.unresolvedCount || 0} unresolved, ${register.manualResolutionCount || 0} manual.`
      : '';
    setSummary(
      summary,
      `Restored ${restoration.workspaces.length} branch workspace${restoration.workspaces.length === 1 ? '' : 's'} from verified package ${restoration.packageFingerprint}.${registerText}`,
      'ok',
    );
    context.showToast?.('Sequential workspace package restored.', 'success');
    return restoration;
  }

  function onClick(event) {
    if (!event.target?.closest?.('[data-ssk-workspace-export]')) return;
    event.preventDefault();
    try { exportPackage(); } catch (error) {
      setSummary(summary, error.message || String(error), 'error');
      context.showToast?.(error.message || String(error), 'error');
    }
  }
  async function onChange(event) {
    if (event.target !== importInput) return;
    try { await importFile(importInput.files?.[0]); } catch (error) {
      setSummary(summary, `Import blocked: ${error.message || String(error)}`, 'error');
      context.showToast?.(error.message || String(error), 'error');
    } finally {
      importInput.value = '';
    }
  }

  exportButton.addEventListener('click', onClick);
  importInput.addEventListener('change', onChange);
  return Object.freeze({
    exportPackage,
    importFile,
    destroy() {
      exportButton.removeEventListener('click', onClick);
      importInput.removeEventListener('change', onChange);
    },
  });
}
