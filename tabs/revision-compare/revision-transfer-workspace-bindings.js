/** Bounded bridge from the Revision Compare workspace shell to transfer and completion engines. */
import { createRevisionCompareTransferController } from './revision-transfer-controller.js';
import { renderRevisionCompareTransferSection } from './revision-transfer-view.js';
import { createRevisionCompareTransferPlan } from './revision-transfer-plan.js';
import { createRevisionCompareTransferApplication } from './revision-transfer-result.js';
import { createRevisionCompareEvidencePackage } from './revision-evidence-package.js';
import { revisionComparisonPreflight } from './revision-preflight.js';
import { captureRevisionCompareTransferAuthority, revisionCompareTransferPlanAuthority } from './revision-transfer-contracts.js';
import { createRevisionCompareTransferCompletionController } from './revision-transfer-completion-controller.js';
import { renderRevisionCompareTransferCompletionSection } from './revision-transfer-completion-view.js';
import { completeWorkspaceTransferCompletion, failWorkspaceTransferCompletion } from './revision-transfer-completion-workspace-state.js';
import {
  completeWorkspaceTransferApply, completeWorkspaceTransferPlan,
  failWorkspaceTransferApply, failWorkspaceTransferPlan,
  setWorkspaceTransferReviewDraft, setWorkspaceTransferReviewPresentation,
  startWorkspaceTransferApply, startWorkspaceTransferPlan,
} from './revision-workspace-state.js';
import { reconcileWorkspaceTransferReviewState } from './revision-transfer-review-workspace-state.js';

export function createRevisionCompareTransferWorkspaceBindings(options) {
  const transfer = createRevisionCompareTransferController({
    root: options.root, readState: options.readState, writeState: options.writeState,
    render: options.render, now: options.now, cryptoRef: options.cryptoRef,
    showToast: options.showToast, reportFailure: options.reportFailure,
    dependencies: {
      setReviewDraft: setWorkspaceTransferReviewDraft, reconcileReview: reconcileWorkspaceTransferReviewState,
      setPresentation: setWorkspaceTransferReviewPresentation,
      startPlan: startWorkspaceTransferPlan, createPlan: createRevisionCompareTransferPlan,
      completePlan: completeWorkspaceTransferPlan, failPlan: failWorkspaceTransferPlan,
      startApply: startWorkspaceTransferApply, createApplication: createRevisionCompareTransferApplication,
      completeApply: completeWorkspaceTransferApply, failApply: failWorkspaceTransferApply,
    },
  });
  const completion = createRevisionCompareTransferCompletionController({
    root: options.root, readState: options.readState, writeState: options.writeState,
    render: options.render, now: options.now, cryptoRef: options.cryptoRef,
    showToast: options.showToast, reportFailure: options.reportFailure,
    dependencies: {
      preflight: (state) => revisionComparisonPreflight(state.slots.baseline, state.slots.candidate, state.proposal),
      createEvidencePackage: createRevisionCompareEvidencePackage,
      captureTransferAuthority: captureRevisionCompareTransferAuthority,
      planTransferAuthority: revisionCompareTransferPlanAuthority,
      complete: completeWorkspaceTransferCompletion, fail: failWorkspaceTransferCompletion,
    },
  });
  const inputHandler = (event) => { transfer.handleInput(event.target); completion.handleInput(event.target); };
  options.root.addEventListener('input', inputHandler);
  return Object.freeze({
    handleClick: (button) => { transfer.handleClick(button); return completion.handleClick(button); },
    handleChange: (target) => { transfer.handleChange(target); completion.handleInput(target); },
    handleInput: inputHandler,
    render: (state) => {
      const reconciled = transfer.reconcileState(state); if (reconciled !== state) options.writeState(reconciled);
      const section = renderRevisionCompareTransferSection(options.root, reconciled, transfer.model(reconciled));
      renderRevisionCompareTransferCompletionSection(options.root, reconciled); completion.sync(); return section;
    },
    destroy: () => { options.root.removeEventListener('input', inputHandler); completion.destroy(); transfer.destroy(); },
    model: () => transfer.model(),
  });
}
