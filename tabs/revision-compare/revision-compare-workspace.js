/** RC-003 workspace lifecycle: trusted compare plus exact guided-review state. */
import { createRevisionActions } from './revision-compare-actions.js';
import { revisionCompareWorkspaceMarkup } from './revision-compare-view.js';
import { createRevisionCompareViewerAdapter } from './revision-compare-viewer-adapter.js';
import { createRevisionCompareService } from './revision-compare-service.js';
import { downloadRevisionArtifact } from './revision-manifests.js';
import { createRevisionLoadService } from './revision-load-service.js';
import { revisionComparisonPreflight } from './revision-preflight.js';
import { createRevisionWorkspaceState } from './revision-workspace-state.js';

function defaultNow() { return new Date().toISOString(); }
function defaultClock() { return globalThis.performance?.now?.() ?? 0; }
function sessionId(now) { return `revision-session-${String(now).replace(/[^0-9]/g, '')}`; }
function trackedListener(cleanups, target, type, handler) { target.addEventListener(type, handler); cleanups.push(() => target.removeEventListener(type, handler)); }
function fileChange(actions, target) { const file = target.files?.[0]; if (file) actions.load(target.dataset.revcFile, file); }
function comparisonButton(actions, button) {
  if (button.hasAttribute('data-revc-run-compare')) actions.runVisualComparison();
  if (button.hasAttribute('data-revc-cancel-comparison')) actions.cancelComparison();
  if (button.hasAttribute('data-revc-open-review')) actions.showReview();
  if (button.hasAttribute('data-revc-edit-scope')) actions.showSetup();
  if (button.dataset.revcCategory) actions.toggleCategory(button.dataset.revcCategory);
  if (button.dataset.revcPresentation) actions.setPresentation(button.dataset.revcPresentation);
  if (button.hasAttribute('data-revc-fit-all')) actions.fitAll();
  if (button.hasAttribute('data-revc-fit-selected')) actions.fitSelected();
  if (button.dataset.revcDifferenceId) actions.selectDifference(button.dataset.revcDifferenceId);
}
function reviewButton(actions, button) {
  if (button.dataset.revcReviewState) actions.setReviewState(button.dataset.revcReviewState);
  if (button.hasAttribute('data-revc-save-review-note')) actions.saveReviewNote();
  if (button.hasAttribute('data-revc-next-priority')) actions.nextPriority();
  if (button.hasAttribute('data-revc-previous-priority')) actions.previousPriority();
  if (button.hasAttribute('data-revc-download-review')) actions.downloadReviewSession();
  if (button.hasAttribute('data-revc-start-new-review')) actions.startNewReviewSession();
}
function actionClick(actions, target) {
  const button = target.closest('button'); if (!button) return;
  if (button.dataset.revcCancel) actions.cancel(button.dataset.revcCancel);
  if (button.dataset.revcGroup) actions.setGroupIncluded(button.dataset.revcGroup, button.dataset.revcInclude === 'all');
  if (button.hasAttribute('data-revc-approve-basis')) actions.approveBasis();
  if (button.hasAttribute('data-revc-download-session')) actions.downloadSession();
  if (button.hasAttribute('data-revc-download-scope')) actions.downloadScope();
  if (button.hasAttribute('data-revc-close')) actions.close();
  comparisonButton(actions, button); reviewButton(actions, button);
}
function reviewInput(actions, target) {
  if (target.matches('[data-revc-review-search]')) actions.setReviewSearch(target.value);
  if (target.matches('[data-revc-review-state-filter]')) actions.toggleReviewFilter('reviewStates', target.dataset.revcReviewStateFilter);
  if (target.matches('[data-revc-certainty-filter]')) actions.toggleReviewFilter('certainties', target.dataset.revcCertaintyFilter);
  if (target.matches('[data-revc-review-import]')) { const file = target.files?.[0]; if (file) actions.importReviewSession(file); }
}
function inputChange(actions, target) {
  if (target.matches('[data-revc-file]')) fileChange(actions, target);
  if (target.matches('[data-revc-search]')) actions.setSearch(target.dataset.revcSearch, target.value);
  if (target.matches('[data-revc-branch-id]')) actions.setBranchIncluded(target.dataset.revcBranchId, target.checked);
  if (target.matches('[data-revc-queue-search]')) actions.setQueueSearch(target.value);
  if (target.matches('[data-revc-changed-reason]')) actions.toggleChangedReason(target.dataset.revcChangedReason);
  if (target.matches('[data-revc-needs-decision]')) actions.setNeedsDecision(target.checked);
  reviewInput(actions, target);
}
function bindWorkspace(root, actions, cleanups) {
  trackedListener(cleanups, root, 'click', (event) => actionClick(actions, event.target));
  trackedListener(cleanups, root, 'change', (event) => inputChange(actions, event.target));
  trackedListener(cleanups, root, 'input', (event) => {
    if (event.target.matches('[data-revc-queue-search]')) actions.setQueueSearch(event.target.value);
    if (event.target.matches('[data-revc-review-search]')) actions.setReviewSearch(event.target.value);
  });
}
export function mountRevisionCompareWorkspace(root, options = {}) {
  if (!root) throw new TypeError('Revision Compare workspace root is required.');
  const now = options.now ?? defaultNow; const clock = options.clock ?? defaultClock;
  const cryptoRef = options.cryptoRef ?? root.ownerDocument.defaultView?.crypto;
  const service = options.service ?? createRevisionLoadService(cryptoRef, options.loadServiceOptions);
  const compareService = options.compareService ?? createRevisionCompareService(options.compareServiceOptions);
  const downloadArtifact = options.downloadArtifact ?? downloadRevisionArtifact; const cleanups = [];
  let state = createRevisionWorkspaceState(options.sessionId ?? sessionId(now()), now()); let actions = null; let renderSequence = 0;
  const viewerAdapter = options.viewerAdapter ?? createRevisionCompareViewerAdapter({
    ...options.viewerAdapterOptions, onPick: (differenceId) => { if (differenceId) actions?.selectDifference(differenceId); },
    onError: (error) => options.showToast?.(`3D viewer unavailable: ${error.message}`, 'warning'),
  });
  function preflight() { return revisionComparisonPreflight(state.slots.baseline, state.slots.candidate, state.proposal); }
  async function syncViewer(sequence) {
    if (sequence !== renderSequence) return;
    if (!state.compare.reviewVisible || !state.compare.audit) { if (!state.compare.audit) viewerAdapter.clear(); return; }
    const host = root.querySelector('[data-revc-viewer-host]'); if (!host) return;
    const mounted = await viewerAdapter.render(host, state.compare.audit); if (sequence !== renderSequence) return;
    viewerAdapter.setPresentationMode(state.compare.presentationMode); viewerAdapter.selectDifference(state.compare.selectedDifferenceId);
    if (!mounted) host.innerHTML = '<div class="revc-viewer-fallback"><b>3D viewer unavailable.</b><span>Use the queue and inspector to continue review.</span></div>';
  }
  function render(next = state) {
    state = next; renderSequence += 1; const sequence = renderSequence;
    root.innerHTML = revisionCompareWorkspaceMarkup(state, preflight(), viewerAdapter.evidence());
    Promise.resolve().then(() => syncViewer(sequence));
  }
  actions = createRevisionActions({
    root, options, service, compareService, viewerAdapter, cryptoRef, clock,
    readState: () => state, writeState: (next) => { state = next; }, render, now, downloadArtifact,
  });
  bindWorkspace(root, actions, cleanups); render();
  return Object.freeze({
    evidence: () => Object.freeze({ state, preflight: preflight(), viewer: viewerAdapter.evidence(), compareRunId: compareService.activeRunId() }),
    destroy: () => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); compareService.dispose(); viewerAdapter.dispose(); service.dispose(); root.innerHTML = ''; },
  });
}
export const _test = Object.freeze({ sessionId, actionClick, inputChange });
