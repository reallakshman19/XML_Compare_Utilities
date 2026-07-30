/** Workspace-owned import lifecycle for local responsiveness receipt verification. */
import {
  REVISION_RESPONSIVENESS_RECEIPT_MAX_BYTES,
  completeRevisionResponsivenessReceiptVerification,
  createRevisionResponsivenessReceiptVerificationState,
  failRevisionResponsivenessReceiptVerification,
  revisionResponsivenessReceiptVerificationModel,
  startRevisionResponsivenessReceiptVerification,
  verifyRevisionResponsivenessObservationReceiptJson,
} from './revision-responsiveness-observation-receipt-import.js';
import { renderRevisionResponsivenessReceiptVerificationSection } from './revision-responsiveness-receipt-verification-view.js';

export function createRevisionResponsivenessReceiptVerificationWorkspace(options) {
  let state = createRevisionResponsivenessReceiptVerificationState();
  let destroyed = false;
  const model = () => revisionResponsivenessReceiptVerificationModel(state, options.readCurrentInput());
  function attachment() {
    const current = model(); const receipt = state.verification?.receipt;
    if (current.status !== 'VERIFIED_CURRENT' || !receipt) return null;
    return Object.freeze({ status: current.status, runId: receipt.observation.runId, receipt });
  }
  function matchesAttachment(value) {
    const current = attachment();
    return Boolean(current && value && current.runId === value.runId
      && current.receipt.receiptId === value.receipt?.receiptId
      && current.receipt.contentSha256 === value.receipt?.contentSha256);
  }
  async function importFile(file) {
    const generation = state.generation + 1;
    state = startRevisionResponsivenessReceiptVerification(state, generation, file?.name);
    options.renderWorkspace();
    try {
      if (!file) throw new TypeError('Select a responsiveness observation receipt.');
      if (file.size > REVISION_RESPONSIVENESS_RECEIPT_MAX_BYTES) throw new RangeError('Responsiveness receipt is limited to 256 KiB.');
      const verification = await verifyRevisionResponsivenessObservationReceiptJson(await file.text(), options.cryptoRef);
      if (destroyed) return;
      const next = completeRevisionResponsivenessReceiptVerification(state, generation, verification);
      if (next === state) return; state = next; options.renderWorkspace();
      options.showToast?.('Responsiveness receipt structure and ID verified.', 'success');
    } catch (error) {
      if (destroyed) return;
      const next = failRevisionResponsivenessReceiptVerification(state, generation, error);
      if (next === state) return; state = next; options.renderWorkspace(); options.reportFailure(error);
    }
  }
  return Object.freeze({
    attachment,
    importFile,
    matchesAttachment,
    model,
    render: () => renderRevisionResponsivenessReceiptVerificationSection(options.root, model()),
    destroy() {
      if (destroyed) return false;
      destroyed = true;
      state = createRevisionResponsivenessReceiptVerificationState();
      return true;
    },
  });
}
