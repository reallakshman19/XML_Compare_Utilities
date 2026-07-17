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
} from './revision-compare-view.js';

function isoNow() { return new Date().toISOString(); }
function sessionId() { return `revision-session-${Date.now().toString(36)}`; }

function createState() {
  const session = createProjectSession({ sessionId: sessionId(), createdAt: isoNow() });
  return Object.freeze({ session, documents: Object.freeze({ baseline: null, candidate: null }) });
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

function withDocument(state, document) {
  const documents = Object.freeze({ ...state.documents, [document.slotId]: document });
  const session = attachProjectDocument(state.session, document, isoNow());
  return Object.freeze({ session, documents });
}

function renderWorkspace(root, state, messages) {
  for (const slotId of ['baseline', 'candidate']) {
    const document = state.documents[slotId];
    const message = messages?.[slotId] || (document ? 'Immutable revision manifest ready.' : 'Choose a staged JSON file.');
    renderRevisionSlot(root, slotId, document, message);
  }
  renderRevisionPreflight(root, projectSessionPreflight(state.session));
  const id = root.querySelector('[data-revc-session-id]');
  if (id) id.textContent = state.session.sessionId;
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
  trackedListener(cleanups, root.querySelector('[data-revc-download]'), 'click', actions.download);
  trackedListener(cleanups, root.querySelector('[data-revc-close]'), 'click', actions.close);
}

function createActions(root, options, service, readState, writeState) {
  const safe = (operation) => async (...args) => { try { await operation(...args); } catch (error) { reportError(root, options, error); } };
  const load = safe(async (slotId, file) => {
    renderWorkspace(root, readState(), { [slotId]: `Parsing ${file.name} and hashing exact input bytes…` });
    const result = await service.loadFile(slotId, file, isoNow());
    writeState(withDocument(readState(), result.document));
    options?.showToast?.(`${slotId} revision loaded.`, 'success');
    renderWorkspace(root, readState(), { [slotId]: `Loaded ${result.document.stats.branchCount} branch(es).` });
  });
  const scope = safe(async (slotId) => {
    const wildcard = root.querySelector(`[data-revc-scope="${slotId}"]`)?.value || '';
    const result = await service.applyScope(slotId, { wildcard, selectedIds: [] }, isoNow());
    writeState(withDocument(readState(), result.document));
    renderWorkspace(root, readState(), { [slotId]: `Scope retained ${result.document.stats.matched}/${result.document.stats.scanned} branch(es).` });
  });
  return Object.freeze({
    load, scope,
    download: () => { try { downloadManifest(root, readState().session); } catch (error) { reportError(root, options, error); } },
    close: () => options?.close?.(),
  });
}

/** Mount the dual revision loader and return its explicit lifecycle handle. */
export function mountRevisionCompareWorkspace(root, options) {
  if (!root) throw new TypeError('Revision Compare workspace root is required.');
  const service = createRevisionLoadService(root.ownerDocument.defaultView?.crypto);
  const cleanups = [];
  let state = createState();
  root.innerHTML = revisionCompareWorkspaceMarkup();
  const actions = createActions(root, options, service, () => state, (next) => { state = next; });
  wireInputs(root, actions, cleanups);
  renderWorkspace(root, state, null);
  return Object.freeze({
    evidence: () => Object.freeze({ session: state.session, preflight: projectSessionPreflight(state.session) }),
    destroy: () => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); service.dispose(); root.innerHTML = ''; },
  });
}

export const _test = Object.freeze({ downloadManifest });
