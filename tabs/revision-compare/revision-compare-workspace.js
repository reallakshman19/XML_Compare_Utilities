/**
 * RC-001 workspace controller. It owns two independent staged-JSON clients,
 * updates immutable ProjectSession manifests, and exports that manifest. It
 * does not match objects, render geometry, transfer fields, or write JSON.
 */

import {
  attachProjectDocument, createProjectSession, projectSessionPreflight, serializeProjectSession,
} from './revision-session-contracts.js';
import { createRevisionLoadService } from './revision-load-service.js';
import {
  renderRevisionPreflight, renderRevisionSlot, revisionCompareWorkspaceMarkup,
  renderWorkbenchDashboard, renderWorkbenchTables, renderWorkbenchTransfer
} from './revision-compare-view.js';
import { createRevisionActions } from './revision-compare-actions.js';

function isoNow() { return new Date().toISOString(); }
function sessionId() { return `revision-session-${Date.now().toString(36)}`; }

function createState() {
  const session = createProjectSession({ sessionId: sessionId(), createdAt: isoNow() });
  return Object.freeze({ 
    session, 
    documents: Object.freeze({ baseline: null, candidate: null }),
    stagedJsons: Object.freeze({ baseline: null, candidate: null }),
    wb3d: null
  });
}

function downloadManifest(root, session) {
  const windowRef = root.ownerDocument.defaultView;
  if (!windowRef?.Blob || !windowRef?.URL?.createObjectURL) throw new Error('Browser download APIs are unavailable.');
  const blob = new windowRef.Blob([serializeProjectSession(session)], { type: 'application/json;charset=utf-8' });
  const url = windowRef.URL.createObjectURL(blob);
  const anchor = root.ownerDocument.createElement('a');
  anchor.href = url;
  anchor.download = `${session.sessionId}.json`;
  anchor.click();
  windowRef.URL.revokeObjectURL(url);
}

function withDocument(state, document, filtered) {
  const documents = Object.freeze({ ...state.documents, [document.slotId]: document });
  const stagedJsons = Object.freeze({ ...state.stagedJsons, [document.slotId]: filtered });
  const session = attachProjectDocument(state.session, document, isoNow());
  return Object.freeze({ session, documents, stagedJsons, wb3d: state.wb3d });
}

function renderWorkspace(root, state, messages) {
  for (const slotId of ['baseline', 'candidate']) {
    const document = state.documents[slotId];
    const message = messages?.[slotId] || (document ? 'Immutable revision manifest ready.' : 'Choose a staged JSON file.');
    renderRevisionSlot(root, slotId, document, message);
  }
  renderRevisionPreflight(root, projectSessionPreflight(state.session));
  
  if (state.wb3d) {
    const dashboardHost = root.querySelector('[data-revc-dashboard-host]');
    const tablesHost = root.querySelector('[data-revc-tables-host]');
    const transferHost = root.querySelector('[data-revc-transfer-host]');
    if (dashboardHost) renderWorkbenchDashboard(dashboardHost, state.wb3d);
    if (tablesHost) renderWorkbenchTables(tablesHost, state.wb3d);
    if (transferHost) renderWorkbenchTransfer(transferHost, state.wb3d);
  }

  const id = root.querySelector('[data-revc-session-id]');
  if (id) id.textContent = state.session.sessionId;
  
  const runBtn = root.querySelector('[data-revc-run-compare]');
  if (runBtn) {
    const preflight = projectSessionPreflight(state.session);
    runBtn.disabled = preflight.status === 'INCOMPLETE';
    if (!runBtn.disabled) runBtn.title = 'Run 3D Data Compare';
  }
}

function reportError(root, options, error) {
  const message = error?.message || String(error);
  const live = root.querySelector('[data-revc-live]');
  if (live) live.textContent = message;
  options?.showToast?.(message, 'error');
}

function trackedListener(cleanups, target, type, handler) {
  if (!target) return;
  target.addEventListener(type, handler);
  cleanups.push(() => target.removeEventListener(type, handler));
}

function wireInputs(root, actions, cleanups) {
  root.querySelectorAll('[data-revc-file]').forEach((input) => trackedListener(cleanups, input, 'change', async () => {
    const file = input.files?.[0];
    if (file) await actions.load(input.dataset.revcFile, file);
  }));
  root.querySelectorAll('[data-revc-apply-scope]').forEach((button) => trackedListener(cleanups, button, 'click', () => actions.scope(button.dataset.revcApplyScope)));
  trackedListener(cleanups, root.querySelector('[data-revc-run-compare]'), 'click', actions.runCompare);
  trackedListener(cleanups, root.querySelector('[data-revc-download]'), 'click', actions.download);
  trackedListener(cleanups, root.querySelector('[data-revc-close]'), 'click', actions.close);
  
  // Global click handlers for workbench UI elements (tables)
  trackedListener(cleanups, root, 'click', (event) => {
    const btn = event.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'run-compare') actions.runCompare();
    if (btn.dataset.action === 'download-manifest') actions.download();
    if (btn.dataset.action === 'select-object') actions.selectObject(btn.dataset.object);
    if (btn.dataset.action === 'build-plan') actions.buildPlan();
    if (btn.dataset.action === 'batch-approve') actions.batchApprove();
    if (btn.dataset.action === 'download-updated-xml') actions.downloadUpdatedXml();
    if (btn.dataset.action === 'approve-row' || btn.dataset.action === 'reject-row') {
      actions.setApproval(btn.dataset.row, btn.dataset.action === 'approve-row' ? 'APPROVED' : 'REJECTED');
    }
    if (btn.dataset.action === 'approve-element') {
      actions.approveElement(btn.dataset.object, btn.dataset.approval);
    }
  });

  trackedListener(cleanups, root, 'change', (event) => {
    const select = event.target.closest('select');
    if (!select) return;
    if (select.dataset.revcConnectorMode !== undefined) {
      actions.setConnectorMode(select.value);
    }
    if (select.dataset.revcLayoutMode !== undefined) {
      actions.setLayoutMode(select.value);
    }
  });
}

/** Mount the dual revision loader and return its explicit lifecycle handle. */
export function mountRevisionCompareWorkspace(root, options) {
  if (!root) throw new TypeError('Revision Compare workspace root is required.');
  const service = createRevisionLoadService(root.ownerDocument.defaultView?.crypto);
  const cleanups = [];
  let state = createState();
  root.innerHTML = revisionCompareWorkspaceMarkup();
  const actions = createRevisionActions({
    root, options, service, readState: () => state, writeState: (next) => { state = next; },
    renderWorkspace, isoNow, downloadManifest, reportError
  });
  wireInputs(root, actions, cleanups);
  renderWorkspace(root, state, null);
  return Object.freeze({
    evidence: () => Object.freeze({ session: state.session, preflight: projectSessionPreflight(state.session) }),
    destroy: () => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); service.dispose(); root.innerHTML = ''; },
  });
}

export const _test = Object.freeze({ downloadManifest });
