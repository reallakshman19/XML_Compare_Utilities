/** Bounded bridge from the Revision Compare workspace shell to merged transfer engines. */
import { createRevisionCompareTransferController } from './revision-transfer-controller.js';
import { renderRevisionCompareTransferSection } from './revision-transfer-view.js';
import { createRevisionCompareTransferPlan } from './revision-transfer-plan.js';
import { createRevisionCompareTransferApplication } from './revision-transfer-result.js';
import {
  completeWorkspaceTransferApply, completeWorkspaceTransferPlan,
  failWorkspaceTransferApply, failWorkspaceTransferPlan,
  setWorkspaceTransferSelection, startWorkspaceTransferApply, startWorkspaceTransferPlan,
} from './revision-workspace-state.js';

export function createRevisionCompareTransferWorkspaceBindings(options) {
  const controller = createRevisionCompareTransferController({
    root: options.root, readState: options.readState, writeState: options.writeState,
    render: options.render, now: options.now, cryptoRef: options.cryptoRef,
    showToast: options.showToast, reportFailure: options.reportFailure,
    dependencies: {
      setSelection: setWorkspaceTransferSelection,
      startPlan: startWorkspaceTransferPlan,
      createPlan: createRevisionCompareTransferPlan,
      completePlan: completeWorkspaceTransferPlan,
      failPlan: failWorkspaceTransferPlan,
      startApply: startWorkspaceTransferApply,
      createApplication: createRevisionCompareTransferApplication,
      completeApply: completeWorkspaceTransferApply,
      failApply: failWorkspaceTransferApply,
    },
  });
  return Object.freeze({
    handleClick: (button) => controller.handleClick(button),
    handleChange: (target) => controller.handleChange(target),
    render: (state) => renderRevisionCompareTransferSection(options.root, state, controller.model()),
    destroy: () => controller.destroy(),
    model: () => controller.model(),
  });
}
