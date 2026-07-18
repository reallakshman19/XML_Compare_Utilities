/** RC-001 workspace lifecycle: two worker-backed inputs and one approved scope basis. */

import { createRevisionActions } from './revision-compare-actions.js';
import { revisionCompareWorkspaceMarkup } from './revision-compare-view.js';
import { downloadRevisionArtifact } from './revision-manifests.js';
import { createRevisionLoadService } from './revision-load-service.js';
import { revisionComparisonPreflight } from './revision-preflight.js';
import { createRevisionWorkspaceState } from './revision-workspace-state.js';

function defaultNow() {
  return new Date().toISOString();
}

function sessionId(now) {
  return `revision-session-${String(now).replace(/[^0-9]/g, '')}`;
}

function trackedListener(cleanups, target, type, handler) {
  target.addEventListener(type, handler);
  cleanups.push(() => target.removeEventListener(type, handler));
}

function fileChange(actions, target) {
  const file = target.files?.[0];
  if (file) actions.load(target.dataset.revcFile, file);
}

function actionClick(actions, target) {
  const button = target.closest('button');
  if (!button) return;
  if (button.dataset.revcCancel) actions.cancel(button.dataset.revcCancel);
  if (button.dataset.revcGroup) actions.setGroupIncluded(button.dataset.revcGroup, button.dataset.revcInclude === 'all');
  if (button.hasAttribute('data-revc-approve-basis')) actions.approveBasis();
  if (button.hasAttribute('data-revc-download-session')) actions.downloadSession();
  if (button.hasAttribute('data-revc-download-scope')) actions.downloadScope();
  if (button.hasAttribute('data-revc-close')) actions.close();
}

function inputChange(actions, target) {
  if (target.matches('[data-revc-file]')) fileChange(actions, target);
  if (target.matches('[data-revc-search]')) actions.setSearch(target.dataset.revcSearch, target.value);
  if (target.matches('[data-revc-branch-id]')) actions.setBranchIncluded(target.dataset.revcBranchId, target.checked);
}

function bindWorkspace(root, actions, cleanups) {
  trackedListener(cleanups, root, 'click', (event) => actionClick(actions, event.target));
  trackedListener(cleanups, root, 'change', (event) => inputChange(actions, event.target));
}

/** Mount the trusted Revision Compare intake and return explicit evidence/lifecycle APIs. */
export function mountRevisionCompareWorkspace(root, options = {}) {
  if (!root) throw new TypeError('Revision Compare workspace root is required.');
  const now = options.now ?? defaultNow;
  const cryptoRef = options.cryptoRef ?? root.ownerDocument.defaultView?.crypto;
  const service = options.service ?? createRevisionLoadService(cryptoRef, options.loadServiceOptions);
  const downloadArtifact = options.downloadArtifact ?? downloadRevisionArtifact;
  const cleanups = [];
  let state = createRevisionWorkspaceState(options.sessionId ?? sessionId(now()), now());

  function preflight() {
    return revisionComparisonPreflight(state.slots.baseline, state.slots.candidate, state.proposal);
  }

  function render(next = state) {
    state = next;
    root.innerHTML = revisionCompareWorkspaceMarkup(state, preflight());
  }

  const actions = createRevisionActions({
    root, options, service, cryptoRef, readState: () => state,
    writeState: (next) => { state = next; }, render, now, downloadArtifact,
  });
  bindWorkspace(root, actions, cleanups);
  render();

  return Object.freeze({
    evidence: () => Object.freeze({ state, preflight: preflight() }),
    destroy: () => {
      cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
      service.dispose();
      root.innerHTML = '';
    },
  });
}

export const _test = Object.freeze({ sessionId, actionClick, inputChange });
