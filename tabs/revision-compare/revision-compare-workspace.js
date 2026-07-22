/** RC-004 workspace lifecycle over trusted compare, guided review and decisions. */
import { createRevisionActions } from './revision-compare-actions.js';
import { revisionCompareWorkspaceMarkup } from './revision-compare-view.js';
import { createRevisionCompareViewerAdapter } from './revision-compare-viewer-adapter.js';
import { revisionCompareViewerBackendLabel } from './revision-compare-viewer-backend.js';
import { createComparisonLifecycleState } from './revision-compare-lifecycle.js';
import { REVISION_COMPARE_DEFAULT_VIEWER_POLICY, createRevisionCompareViewerPolicy } from './revision-compare-viewer-policy.js';
import { createRevisionCompareService } from './revision-compare-service.js';
import { downloadRevisionArtifact } from './revision-manifests.js';
import { createRevisionLoadService } from './revision-load-service.js';
import { revisionComparisonPreflight } from './revision-preflight.js';
import {
  REVISION_EVIDENCE_PACKAGE_IMPORT_STATUS, completeWorkspaceEvidencePackageImport,
  completeWorkspaceTrustReceiptImport, createRevisionWorkspaceState,
  failWorkspaceEvidencePackageImport, failWorkspaceSignOff, failWorkspaceTrustReceiptImport,
  setWorkspaceSignOffReport, startWorkspaceEvidencePackageImport, startWorkspaceTrustReceiptImport,
} from './revision-workspace-state.js';
import { candidatePreview } from './revision-decision-projection.js';
import { decisionLedgerMatchesAudit } from './revision-decision-ledger.js';
import { createRevisionComparePropertyInspector } from './revision-compare-property-inspector.js';
import {
  createRevisionCompareEvidencePackage, revisionCompareEvidencePackageFileName,
  revisionCompareEvidencePackageReadiness,
} from './revision-evidence-package.js';
import { verifyRevisionCompareEvidencePackageJson } from './revision-evidence-package-import.js';
import {
  createRevisionCompareSignOffReport, renderRevisionCompareSignOffSection,
  revisionCompareSignOffAuthorityMatches, revisionCompareSignOffFileName,
  revisionCompareSignOffInput, syncRevisionCompareSignOffControls,
} from './revision-sign-off.js';
import {
  REVISION_COMPARE_TRUST_MAX_BYTES, REVISION_COMPARE_TRUST_STATUS,
  renderRevisionCompareTrustReceiptSection, verifyRevisionCompareTrustReceiptJson,
} from './revision-trust-receipt.js';

const IMPORTED_RESTRICTED_SELECTORS = Object.freeze([
  '[data-revc-file]', '[data-revc-cancel]', '[data-revc-edit-scope]', '[data-revc-approve-basis]',
  '[data-revc-run-compare]', '[data-revc-cancel-comparison]', '[data-revc-download-session]',
  '[data-revc-download-scope]', '[data-revc-review-import]', '[data-revc-decision-import]',
  '[data-revc-start-new-review]', '[data-revc-start-new-decision]',
]);
function defaultNow() { return new Date().toISOString(); }
function defaultClock() { return globalThis.performance?.now?.() ?? 0; }
function sessionId(now) { return `revision-session-${String(now).replace(/[^0-9]/g, '')}`; }
function trackedListener(cleanups, target, type, handler) { target.addEventListener(type, handler); cleanups.push(() => target.removeEventListener(type, handler)); }
function fileChange(actions, target) { const file = target.files?.[0]; if (file) actions.load(target.dataset.revcFile, file); }
function packageFileChange(actions, target) { const file = target.files?.[0]; target.value = ''; if (file) actions.importEvidencePackage(file); }
function trustFileChange(actions, target) { const file = target.files?.[0]; target.value = ''; if (file) actions.importTrustReceipt(file); }
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
  if (button.hasAttribute('data-revc-download-evidence-package')) actions.downloadEvidencePackage();
  if (button.hasAttribute('data-revc-create-sign-off') || button.hasAttribute('data-revc-create-new-sign-off')) actions.createSignOff();
  if (button.hasAttribute('data-revc-download-sign-off')) actions.downloadSignOff();
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
  if (target.matches('[data-revc-trust-import]')) trustFileChange(actions, target);
  if (target.matches('[data-revc-evidence-package-import]')) packageFileChange(actions, target);
  if (target.matches('[data-revc-file]')) fileChange(actions, target);
  if (target.matches('[data-revc-search]')) actions.setSearch(target.dataset.revcSearch, target.value);
  if (target.matches('[data-revc-branch-id]')) actions.setBranchIncluded(target.dataset.revcBranchId, target.checked);
  if (target.matches('[data-revc-queue-search]')) actions.setQueueSearch(target.value);
  if (target.matches('[data-revc-changed-reason]')) actions.toggleChangedReason(target.dataset.revcChangedReason);
  if (target.matches('[data-revc-needs-decision]')) actions.setNeedsDecision(target.checked);
  reviewInput(actions, target); decisionInput(actions, target); actions.syncSignOffControls();
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
    actions.syncSignOffControls();
  });
}
function previewFor(state) {
  const audit = state.compare.audit; const ledger = state.decision.ledger; const preview = state.decision.preview;
  return audit && decisionLedgerMatchesAudit(ledger, audit) ? candidatePreview(audit, ledger, preview.differenceId, preview.candidateIndex) : null;
}
function preparePropertyHost(root, state) {
  if (!state.compare.reviewVisible || !state.compare.audit || !state.compare.selectedDifferenceId) return null;
  const section = root.querySelector('.revc-inspector [data-level="2"] > section'); const heading = section?.querySelector('h3');
  if (!section || heading?.textContent !== 'Changed properties') return null;
  while (heading.nextSibling) heading.nextSibling.remove();
  const host = root.ownerDocument.createElement('div'); host.setAttribute('data-revc-property-inspector-host', state.compare.selectedDifferenceId);
  section.appendChild(host); return host;
}
function appendTextElement(documentRef, parent, tag, text) { const element = documentRef.createElement(tag); element.textContent = text; parent.appendChild(element); return element; }
function prepareEvidencePackageControl(root, state) {
  const host = root.querySelector('.revc-review-side') ?? root.querySelector('.revc-body'); if (!host) return null;
  const readiness = revisionCompareEvidencePackageReadiness(state); const documentRef = root.ownerDocument;
  const section = documentRef.createElement('section'); section.className = 'revc-review-session'; section.setAttribute('data-revc-evidence-package', readiness.status.toLowerCase());
  const header = documentRef.createElement('header'); const title = documentRef.createElement('div');
  appendTextElement(documentRef, title, 'span', 'EVIDENCE PACKAGE'); appendTextElement(documentRef, title, 'h2', 'Authority chain export');
  const status = appendTextElement(documentRef, header, 'strong', readiness.status); status.setAttribute('data-status', readiness.status.toLowerCase());
  header.appendChild(title); header.appendChild(status);
  const message = appendTextElement(documentRef, section, 'p', readiness.status === 'READY'
    ? 'Current session, scope, audit, review and decision authorities are ready for deterministic export.' : readiness.blockers[0]);
  message.setAttribute('data-revc-evidence-package-status', readiness.status);
  const controls = documentRef.createElement('div'); controls.className = 'revc-session-actions';
  const button = appendTextElement(documentRef, controls, 'button', 'Download evidence package'); button.type = 'button';
  button.setAttribute('data-revc-download-evidence-package', ''); button.disabled = readiness.status !== 'READY';
  section.prepend(header); section.appendChild(controls); host.appendChild(section); return section;
}
function enforceImportedModeRestrictions(root, state) {
  if (state.evidencePackageImport.status !== REVISION_EVIDENCE_PACKAGE_IMPORT_STATUS.VERIFIED) return;
  for (const selector of IMPORTED_RESTRICTED_SELECTORS) root.querySelectorAll(selector).forEach((element) => {
    if (element.matches('input[type="file"]')) element.closest('label')?.remove(); else element.remove();
  });
}
function initialWorkspaceState(session, createdAt, policy) { const state = createRevisionWorkspaceState(session, createdAt); return Object.freeze({ ...state, compare: createComparisonLifecycleState(policy) }); }
function syncBackendButtons(root, evidence) {
  root.querySelectorAll('[data-revc-viewer-backend]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  if (evidence.failed || !evidence.activeBackend) return;
  root.querySelectorAll(`[data-revc-viewer-backend="${evidence.activeBackend}"]`).forEach((button) => button.setAttribute('aria-pressed', 'true'));
}
function recoveryMarkup(compare) {
  const backend = compare.viewerBackend === 'SVG' ? compare.viewerPolicy.recoveryBackendForSvgFailure : compare.viewerPolicy.recoveryBackendForWebglFailure;
  return `<button type="button" data-revc-viewer-backend="${backend}">Return to ${revisionCompareViewerBackendLabel(backend)}</button>`;
}
function reportFailure(root, options, error) {
  const message = error?.message || String(error); const live = root.querySelector('[data-revc-live]');
  if (live) live.textContent = message; options.showToast?.(message, 'error');
}
export function mountRevisionCompareWorkspace(root, options = {}) {
  if (!root) throw new TypeError('Revision Compare workspace root is required.');
  const now = options.now ?? defaultNow; const clock = options.clock ?? defaultClock;
  const cryptoRef = options.cryptoRef ?? root.ownerDocument.defaultView?.crypto;
  const service = options.service ?? createRevisionLoadService(cryptoRef, options.loadServiceOptions);
  const compareService = options.compareService ?? createRevisionCompareService(options.compareServiceOptions);
  const downloadArtifact = options.downloadArtifact ?? downloadRevisionArtifact; const cleanups = [];
  const policy = createRevisionCompareViewerPolicy(options.viewerPolicy ?? options.viewerAdapterOptions?.viewerPolicy ?? REVISION_COMPARE_DEFAULT_VIEWER_POLICY);
  let state = initialWorkspaceState(options.sessionId ?? sessionId(now()), now(), policy);
  let actions = null; let renderSequence = 0; let viewerAdapter = options.viewerAdapter ?? null; let destroyed = false; let signOffBusy = false;
  let trustImportGeneration = 0;
  if (!viewerAdapter) viewerAdapter = createRevisionCompareViewerAdapter({
    ...options.viewerAdapterOptions, viewerPolicy: policy,
    onPick: (differenceId) => { if (differenceId) actions?.selectDifference(differenceId); },
    onError: (error) => options.showToast?.(`${revisionCompareViewerBackendLabel(viewerAdapter?.evidence().viewerBackend)} unavailable: ${error.message}`, 'warning'),
  });
  const propertyInspector = options.propertyInspector ?? createRevisionComparePropertyInspector(options.propertyInspectorOptions);
  function preflight() { return revisionComparisonPreflight(state.slots.baseline, state.slots.candidate, state.proposal); }
  async function syncViewer(sequence) {
    if (destroyed || sequence !== renderSequence) return;
    if (!state.compare.reviewVisible || !state.compare.audit) { if (!state.compare.audit) viewerAdapter.clear(); return; }
    const host = root.querySelector('[data-revc-viewer-host]'); if (!host) return;
    viewerAdapter.setBackend?.(state.compare.viewerBackend);
    const mounted = await viewerAdapter.render(host, state.compare.audit); if (destroyed || sequence !== renderSequence) return;
    viewerAdapter.setPresentationMode(state.compare.presentationMode); viewerAdapter.selectDifference(state.compare.selectedDifferenceId);
    const preview = previewFor(state);
    if (preview?.candidate && preview.differenceId === state.compare.selectedDifferenceId) viewerAdapter.previewPair(preview.differenceId, preview.targetDifferenceId); else viewerAdapter.clearPreview();
    const evidence = viewerAdapter.evidence(); syncBackendButtons(root, evidence); const renderedFailure = root.querySelector('.revc-viewer-failure');
    if (mounted) renderedFailure?.remove();
    else if (!renderedFailure) host.innerHTML = `<div class="revc-viewer-fallback"><b>${revisionCompareViewerBackendLabel(state.compare.viewerBackend)} unavailable.</b><span>Use the queue and inspector to continue review. Recovery requires explicit user action.</span>${recoveryMarkup(state.compare)}</div>`;
  }
  async function syncPropertyInspector(sequence, host) {
    if (destroyed || sequence !== renderSequence) return;
    if (!host || !state.compare.audit || !state.compare.selectedDifferenceId) { propertyInspector.clear(); return; }
    await propertyInspector.render(host, state.compare.audit, state.compare.selectedDifferenceId);
  }
  async function downloadEvidencePackage() {
    const captured = state;
    try {
      const artifact = await createRevisionCompareEvidencePackage(captured, revisionComparisonPreflight(captured.slots.baseline, captured.slots.candidate, captured.proposal), cryptoRef);
      downloadArtifact(root, revisionCompareEvidencePackageFileName(captured.session.sessionId), artifact); options.showToast?.('Evidence package downloaded.', 'success');
    } catch (error) { reportFailure(root, options, error); }
  }
  async function createSignOff() {
    if (signOffBusy) return; const captured = state; const input = revisionCompareSignOffInput(root); signOffBusy = true; actions.syncSignOffControls();
    try {
      if (!input.confirmed) throw new Error('Confirm the fixed completion declaration before creating the report.');
      const report = await createRevisionCompareSignOffReport(captured, revisionComparisonPreflight(captured.slots.baseline, captured.slots.candidate, captured.proposal), input, now(), cryptoRef);
      if (destroyed) return;
      if (!revisionCompareSignOffAuthorityMatches(captured, state)) throw new Error('Review evidence changed while the completion report was being created. Create the declaration again.');
      state = setWorkspaceSignOffReport(state, report); render(); options.showToast?.('Completion declaration created.', 'success');
    } catch (error) { if (!destroyed) { state = failWorkspaceSignOff(state, error); render(); reportFailure(root, options, error); } }
    finally { signOffBusy = false; if (!destroyed) actions.syncSignOffControls(); }
  }
  function downloadSignOff() {
    try {
      if (state.signOff.status !== 'CREATED' || !state.signOff.report) throw new Error('The current completion report is unavailable.');
      downloadArtifact(root, revisionCompareSignOffFileName(state.session.sessionId, state.signOff.report.reportId), state.signOff.report);
      options.showToast?.('Completion report downloaded.', 'success');
    } catch (error) { reportFailure(root, options, error); }
  }
  async function importEvidencePackage(file) {
    const generation = state.evidencePackageImport.requestGeneration + 1; state = startWorkspaceEvidencePackageImport(state, generation, file.name); render();
    if (state.evidencePackageImport.status !== REVISION_EVIDENCE_PACKAGE_IMPORT_STATUS.IMPORTING) { reportFailure(root, options, state.evidencePackageImport.error); return; }
    try {
      const text = await file.text(); const verified = await verifyRevisionCompareEvidencePackageJson(text, file.name, now(), cryptoRef); if (destroyed) return;
      const current = state; const next = completeWorkspaceEvidencePackageImport(current, generation, verified);
      if (next === current) return; state = next; render(); options.showToast?.('Evidence package imported.', 'success');
    } catch (error) {
      if (destroyed) return; const current = state; const next = failWorkspaceEvidencePackageImport(current, generation, error);
      if (next === current) return; state = next; render(); reportFailure(root, options, error);
    }
  }
  async function importTrustReceipt(file) {
    const generation = ++trustImportGeneration; const report = state.signOff?.report;
    state = startWorkspaceTrustReceiptImport(state, generation, file.name); render();
    if (state.trustReceipt.status !== REVISION_COMPARE_TRUST_STATUS.IMPORTING) { reportFailure(root, options, state.trustReceipt.error); return; }
    try {
      if (file.size > REVISION_COMPARE_TRUST_MAX_BYTES) throw new RangeError('External signature receipt is limited to 256 KiB.');
      const receipt = await verifyRevisionCompareTrustReceiptJson(await file.text(), report, cryptoRef); if (destroyed) return;
      const current = state; const next = completeWorkspaceTrustReceiptImport(current, generation, receipt);
      if (next === current) return; state = next; render(); options.showToast?.('External signature receipt verified.', 'success');
    } catch (error) {
      if (destroyed) return; const current = state; const next = failWorkspaceTrustReceiptImport(current, generation, error);
      if (next === current) return; state = next; render(); reportFailure(root, options, error);
    }
  }
  function render(next = state) {
    if (destroyed) return; state = next; renderSequence += 1; const sequence = renderSequence;
    root.innerHTML = revisionCompareWorkspaceMarkup(state, preflight(), viewerAdapter.evidence());
    const propertyHost = preparePropertyHost(root, state); prepareEvidencePackageControl(root, state);
    renderRevisionCompareSignOffSection(root, state); renderRevisionCompareTrustReceiptSection(root, state);
    enforceImportedModeRestrictions(root, state); syncDecisionButtons(root); syncRevisionCompareSignOffControls(root, state, signOffBusy);
    Promise.resolve().then(() => syncViewer(sequence)); Promise.resolve().then(() => syncPropertyInspector(sequence, propertyHost));
  }
  const baseActions = createRevisionActions({ root, options, service, compareService, viewerAdapter, cryptoRef, clock, readState: () => state, writeState: (next) => { state = next; }, render, now, downloadArtifact });
  actions = Object.freeze({
    ...baseActions, downloadEvidencePackage, importEvidencePackage, importTrustReceipt, createSignOff, downloadSignOff,
    syncSignOffControls: () => syncRevisionCompareSignOffControls(root, state, signOffBusy),
  });
  bindWorkspace(root, actions, cleanups); render();
  return Object.freeze({
    evidence: () => Object.freeze({ state, preflight: preflight(), viewer: viewerAdapter.evidence(), property: propertyInspector.evidence(), compareRunId: compareService.activeRunId() }),
    destroy: () => { destroyed = true; renderSequence += 1; cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); compareService.dispose(); propertyInspector.dispose(); viewerAdapter.dispose(); service.dispose(); root.innerHTML = ''; },
  });
}
export const _test = Object.freeze({ actionClick, enforceImportedModeRestrictions, initialWorkspaceState, inputChange, prepareEvidencePackageControl, preparePropertyHost, sessionId, syncBackendButtons, syncDecisionButtons });
