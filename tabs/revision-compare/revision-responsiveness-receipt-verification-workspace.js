/** Workspace-owned receipt integrity and detached-signature verification lifecycle. */
import {
  REVISION_RESPONSIVENESS_RECEIPT_MAX_BYTES,
  completeRevisionResponsivenessReceiptVerification,
  createRevisionResponsivenessReceiptVerificationState,
  failRevisionResponsivenessReceiptVerification,
  revisionResponsivenessReceiptVerificationModel,
  startRevisionResponsivenessReceiptVerification,
  verifyRevisionResponsivenessObservationReceiptJson,
} from './revision-responsiveness-observation-receipt-import.js';
import {
  REVISION_RESPONSIVENESS_SIGNATURE_MAX_BYTES,
  completeRevisionResponsivenessSignatureImport,
  createRevisionResponsivenessSignatureState,
  failRevisionResponsivenessSignatureImport,
  revisionResponsivenessSignatureModel,
  startRevisionResponsivenessSignatureImport,
  verifyRevisionResponsivenessSignatureReceiptJson,
} from './revision-responsiveness-receipt-signature.js';
import { renderRevisionResponsivenessReceiptVerificationSection } from './revision-responsiveness-receipt-verification-view.js';
import { renderRevisionResponsivenessSignatureSection } from './revision-responsiveness-receipt-signature-view.js';

export function createRevisionResponsivenessReceiptVerificationWorkspace(options) {
  let state = createRevisionResponsivenessReceiptVerificationState();
  let signatureState = createRevisionResponsivenessSignatureState();
  let destroyed = false;
  const retainedReceipt = () => state.verification?.receipt ?? null;
  const model = () => revisionResponsivenessReceiptVerificationModel(state, options.readCurrentInput());
  const signatureModel = () => revisionResponsivenessSignatureModel(signatureState, retainedReceipt(), model());
  function attachment() {
    const current = model(); const receipt = retainedReceipt();
    if (current.status !== 'VERIFIED_CURRENT' || !receipt) return null;
    return Object.freeze({ status: current.status, runId: receipt.observation.runId, receipt });
  }
  function matchesAttachment(value) {
    const current = attachment();
    return Boolean(current && value && current.runId === value.runId
      && current.receipt.receiptId === value.receipt?.receiptId
      && current.receipt.contentSha256 === value.receipt?.contentSha256);
  }
  async function importFile(file, subtype = 'receipt') {
    if (subtype === 'signature') return importSignatureFile(file);
    const generation = state.generation + 1;
    state = startRevisionResponsivenessReceiptVerification(state, generation, file?.name);
    signatureState = createRevisionResponsivenessSignatureState(); options.renderWorkspace();
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
  async function importSignatureFile(file) {
    const generation = signatureState.generation + 1;
    signatureState = startRevisionResponsivenessSignatureImport(signatureState, generation, file?.name); options.renderWorkspace();
    try {
      const target = retainedReceipt();
      if (!target) throw new TypeError('Verify a responsiveness observation receipt before importing its detached signature.');
      if (!file) throw new TypeError('Select a responsiveness signature receipt.');
      if (file.size > REVISION_RESPONSIVENESS_SIGNATURE_MAX_BYTES) throw new RangeError('Responsiveness signature receipt is limited to 256 KiB.');
      const receipt = await verifyRevisionResponsivenessSignatureReceiptJson(await file.text(), target, options.cryptoRef);
      if (destroyed) return;
      const next = completeRevisionResponsivenessSignatureImport(signatureState, generation, receipt);
      if (next === signatureState) return; signatureState = next; options.renderWorkspace();
      options.showToast?.('Responsiveness receipt signature verified.', 'success');
    } catch (error) {
      if (destroyed) return;
      const next = failRevisionResponsivenessSignatureImport(signatureState, generation, error);
      if (next === signatureState) return; signatureState = next; options.renderWorkspace(); options.reportFailure(error);
    }
  }
  return Object.freeze({
    attachment, importFile, matchesAttachment, model, signatureModel,
    render() {
      renderRevisionResponsivenessReceiptVerificationSection(options.root, model());
      renderRevisionResponsivenessSignatureSection(options.root, signatureModel());
    },
    destroy() {
      if (destroyed) return false;
      destroyed = true; state = createRevisionResponsivenessReceiptVerificationState();
      signatureState = createRevisionResponsivenessSignatureState(); return true;
    },
  });
}
