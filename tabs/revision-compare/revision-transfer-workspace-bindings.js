/** Bounded bridge from the Revision Compare workspace shell to transfer review and merged engines. */
import { createRevisionCompareTransferController } from './revision-transfer-controller.js';
import { renderRevisionCompareTransferSection } from './revision-transfer-view.js';
import { createRevisionCompareTransferPlan } from './revision-transfer-plan.js';
import { createRevisionCompareTransferApplication } from './revision-transfer-result.js';
import {
  completeWorkspaceTransferApply, completeWorkspaceTransferPlan,
  failWorkspaceTransferApply, failWorkspaceTransferPlan,
  setWorkspaceTransferReviewDraft, setWorkspaceTransferReviewPresentation,
  startWorkspaceTransferApply, startWorkspaceTransferPlan,
} from './revision-workspace-state.js';

export function createRevisionCompareTransferWorkspaceBindings(options) {
  const controller = createRevisionCompareTransferController({
    root: options.root, readState: options.readState, writeState: options.writeState,
    render: options.render, now: options.now, cryptoRef: options.cryptoRef,
    showToast: options.showToast, reportFailure: options.reportFailure,
    dependencies: {
      setReviewDraft: setWorkspaceTransferReviewDraft,
      setPresentation: setWorkspaceTransferReviewPresentation,
      startPlan: startWorkspaceTransferPlan, createPlan: createRevisionCompareTransferPlan,
      completePlan: completeWorkspaceTransferPlan, failPlan: failWorkspaceTransferPlan,
      startApply: startWorkspaceTransferApply, createApplication: createRevisionCompareTransferApplication,
      completeApply: completeWorkspaceTransferApply, failApply: failWorkspaceTransferApply,
    },
  });
  const inputHandler = (event) => controller.handleInput(event.target);
  options.root.addEventListener('input', inputHandler);
  return Object.freeze({
    handleClick: (button) => controller.handleClick(button),
    handleChange: (target) => controller.handleChange(target),
    handleInput: (target) => controller.handleInput(target),
    render: (state) => renderRevisionCompareTransferSection(options.root, state, controller.model(state)),
    destroy: () => { options.root.removeEventListener('input', inputHandler); controller.destroy(); }, model: () => controller.model(),
  });
}
