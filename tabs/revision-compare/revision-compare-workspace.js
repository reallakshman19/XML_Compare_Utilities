/** RC-004 workspace lifecycle over trusted compare, guided review and decisions. */
import { createRevisionActions } from './revision-compare-actions.js';
import { revisionCompareWorkspaceMarkup } from './revision-compare-view.js';
import { createRevisionCompareViewerAdapter } from './revision-compare-viewer-adapter.js';
import { createRevisionCompareService } from './revision-compare-service.js';
import { downloadRevisionArtifact } from './revision-manifests.js';
import { createRevisionLoadService } from './revision-load-service.js';
import { revisionComparisonPreflight } from './revision-preflight.js';
import { createRevisionWorkspaceState } from './revision-workspace-state.js';
import { candidatePreview } from './revision-decision-projection.js';
import { decisionLedgerMatchesAudit } from './revision-decision-ledger.js';
import { createRevisionComparePropertyInspector } from './revision-compare-property-inspector.js';

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
  if (button.dataset.revcViewerBackend) actions.setViewerBackend(button.dataset.revcViewerBackend);
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
function decisionButton(actions, button) {
  if (button.dataset.revcPreviewCandidateIndex !== undefined) actions.previewCandidate(button.dataset.revcPreviewCandidateIndex);
  if (button.hasAttribute('data-revc-previous-candidate')) actions.previousCandidate();
  if (button.hasAttribute('data-revc-next-candidate')) actions.nextCandidate();
  if (button.hasAttribute('data-revc-accept-candidate')) actions.acceptCandidate();
  if (button.hasAttribute('data-revc-confirm-no-match')) actions.confirmNoMatch();
  if (button.hasAttribute('data-revc-defer-decision')) actions.deferDecision();
  if (button.hasAttribute('data-revc-revoke-decision')) actions.revokeDecision();
  if (button.hasAttribute('data-revc-download-decision')) actions.downloadDecisionLedger();
  if (button.hasAttribute('data-revc-start-new-decision')) actions.startNewDecisionLedger();
}
function actionClick(actions, target) {
  const button = target.closest('button'); if (!button) return;
  if (button.dataset.revcCancel) actions.cancel(button.dataset.revcCancel);
  if (button.dataset.revcGroup) actions.setGroupIncluded(button.dataset.revcGroup, button.dataset.revcInclude === 'all');
  if (button.hasAttribute('data-revc-approve-basis')) actions.approveBasis();
  if (button.hasAttribute('data-revc-download-session')) actions.downloadSession();
  if (button.hasAttribute('data-revc-download-scope')) actions.downloadScope();
  if (button.hasAttribute('data-revc-close')) actions.close();
  comparisonButton(actions, button); reviewButton(actions, button); decisionButton(actions, button);
}
function reviewInput(actions, target) {
  if (target.matches('[data-revc-review-search]')) actions.setReviewSearch(target.value);
  if (target.matches('[data-revc-review-state-filter]')) actions.toggleReviewFilter('reviewStates', target.dataset.revcReviewStateFilter);
  if (target.matches('[data-revc-certainty-filter]')) actions.toggleReviewFilter('certainties', target.dataset.revcCertaintyFilter);
  if (target.matches('[data-revc-review-import]')) { const file = target.files?.[0]; if (file) actions.importReviewSession(file); }
}
function decisionInput(actions, target) {
  if (target.matches('[data-revc-decision-state-filter]')) actions.toggleDecisionFilter(target.dataset.revcDecisionStateFilter);
  if (target.matches('[data-revc-unresolved-ambiguity]')) actions.setUnresolvedAmbiguity(target.checked);
  if (target.matches('[data-revc-decision-import]')) { const file = target.files?.[0]; if (file) actions.importDecisionLedger(file); }
}
function inputChange(actions, target) {
  if (target.matches('[data-revc-file]')) fileChange(actions, target);
  if (target.matches('[data-revc-search]')) actions.setSearch(target.dataset.revcSearch, target.value);
  if (target.matches('[data-revc-branch-id]')) actions.setBranchIncluded(target.dataset.revcBranchId, target.checked);
  if (target.matches('[data-revc-queue-search]')) actions.setQueueSearch(target.value);
  if (target.matches('[data-revc-changed-reason]')) actions.toggleChangedReason(target.dataset.revcChangedReason);
  if (target.matches('[data-revc-needs-decision]')) actions.setNeedsDecision(target.checked);
  reviewInput(actions, target); decisionInput(actions, target);
}
function syncDecisionButtons(root) {
  const field = root.querySelector('[data-revc-decision-rationale]'); if (!field) return;
  const hasRationale = Boolean(field.value.trim()); const count = root.querySelector('[data-revc-rationale-count]');
  if (count) count.textContent = `Required · ${field.value.length} / ${field.maxLength}`;
  root.querySelectorAll('[data-action-allowed]').forEach((button) => { button.disabled = button.dataset.actionAllowed !== 'true' || !hasRationale; });
}
function bindWorkspace(root, actions, cleanups) {
  trackedListener(cleanups, root, 'click', (event) => actionClick(actions, event.target));
  trackedListener(cleanups, root, 'change', (event) => inputChange(actions, event.target));
  trackedListener(cleanups, root, 'input', (event) => {
    if (event.target.matches('[data-revc-queue-search]')) actions.setQueueSearch(event.target.value);
    if (event.target.matches('[data-revc-review-search]')) actions.setReviewSearch(event.target.value);
    if (event.target.matches('[data-revc-decision-rationale]')) syncDecisionButtons(root);
  });
}
function previewFor(state) {
  const audit = state.compare.audit; const ledger = state.decision.ledger; const preview = state.decision.preview;
  return audit && decisionLedgerMatchesAudit(ledger, audit) ? candidatePreview(audit, ledger, preview.differenceId, preview.candidateIndex) : null;
}
function preparePropertyHost(root, state) {
  if (!state.compare.reviewVisible || !state.compare.audit || !state.compare.selectedDifferenceId) return null;
  const section = root.querySelector('.revc-inspector [data-level="2"] > section');
  const heading = section?.querySelector('h3');
  if (!section || heading?.textContent !== 'Changed properties') return null;
  while (heading.nextSibling) heading.nextSibling.remove();
  const host = root.ownerDocument.createElement('div');
  host.setAttribute('data-revc-property-inspector-host', state.compare.selectedDifferenceId);
  section.appendChild(host);
  return host;
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
  const propertyInspector = options.propertyInspector ?? createRevisionComparePropertyInspector(options.propertyInspectorOptions);
  function preflight() { return revisionComparisonPreflight(state.slots.baseline, state.slots.candidate, state.proposal); }
  async function syncViewer(sequence) {
    if (sequence !== renderSequence) return;
    if (!state.compare.reviewVisible || !state.compare.audit) { if (!state.compare.audit) viewerAdapter.clear(); return; }
    const host = root.querySelector('[data-revc-viewer-host]'); if (!host) return;
    viewerAdapter.setBackend?.(state.compare.viewerBackend);
    const mounted = await viewerAdapter.render(host, state.compare.audit); if (sequence !== renderSequence) return;
    viewerAdapter.setPresentationMode(state.compare.presentationMode); viewerAdapter.selectDifference(state.compare.selectedDifferenceId);
    const preview = previewFor(state);
    if (preview?.candidate && preview.differenceId === state.compare.selectedDifferenceId) viewerAdapter.previewPair(preview.differenceId, preview.targetDifferenceId);
    else viewerAdapter.clearPreview();
    if (!mounted) host.innerHTML = `<div class="revc-viewer-fallback"><b>${state.compare.viewerBackend === 'SVG' ? 'SVG preview' : '3D viewer'} unavailable.</b><span>Use the queue and inspector to continue review.</span>${state.compare.viewerBackend === 'SVG' ? '<button type="button" data-revc-viewer-backend="WEBGL">Return to 3D (WebGL)</button>' : ''}</div>`;
  }
  async function syncPropertyInspector(sequence, host) {
    if (sequence !== renderSequence) return;
    if (!host || !state.compare.audit || !state.compare.selectedDifferenceId) { propertyInspector.clear(); return; }
    await propertyInspector.render(host, state.compare.audit, state.compare.selectedDifferenceId);
  }
  function render(next = state) {
    state = next; renderSequence += 1; const sequence = renderSequence;
    root.innerHTML = revisionCompareWorkspaceMarkup(state, preflight(), viewerAdapter.evidence());
    const propertyHost = preparePropertyHost(root, state); syncDecisionButtons(root);
    Promise.resolve().then(() => syncViewer(sequence));
    Promise.resolve().then(() => syncPropertyInspector(sequence, propertyHost));
  }
  actions = createRevisionActions({ root, options, service, compareService, viewerAdapter, cryptoRef, clock, readState: () => state, writeState: (next) => { state = next; }, render, now, downloadArtifact });
  bindWorkspace(root, actions, cleanups); render();
  return Object.freeze({
    evidence: () => Object.freeze({ state, preflight: preflight(), viewer: viewerAdapter.evidence(), property: propertyInspector.evidence(), compareRunId: compareService.activeRunId() }),
    destroy: () => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); compareService.dispose(); propertyInspector.dispose(); viewerAdapter.dispose(); service.dispose(); root.innerHTML = ''; },
  });
}
export const _test = Object.freeze({ actionClick, inputChange, preparePropertyHost, sessionId, syncDecisionButtons });
