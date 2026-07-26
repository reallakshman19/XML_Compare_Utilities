/** File intake, exact downloads, race containment and explicit clear. */
import {
  REVISION_COMPARE_HANDOVER_ARTIFACT_ROLES, REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES,
  verifyRevisionCompareTransferHandoverText,
} from './revision-transfer-handover-inspection.js';
import {
  clearRevisionCompareHandoverInspection, completeRevisionCompareHandoverInspection,
  failRevisionCompareHandoverInspection, startRevisionCompareHandoverInspection,
} from './revision-transfer-handover-inspection-state.js';
import { revisionCompareTransferHandoverFileName, serializeRevisionCompareTransferHandoverBundle } from './revision-transfer-handover.js';
import { revisionCompareHandoverInspectionReadiness, setWorkspaceHandoverInspection } from './revision-transfer-handover-inspection-workspace-state.js';

const JSON_MIME = /^(application|text)\/(?:[a-z0-9.+-]*\+)?json$/i;
function selected(target, name) { return Boolean(target?.hasAttribute?.(name)); }
function fileMetadataIsCompatible(file) {
  const nameIsJson = /\.json$/i.test(String(file?.name ?? '')); const mime = String(file?.type ?? '').trim();
  return !mime || nameIsJson || JSON_MIME.test(mime);
}
function admitFiles(fileList) {
  const files = Array.from(fileList ?? []);
  if (files.length !== 1) throw new Error('Select exactly one transfer handover JSON file.');
  const [file] = files; const size = Number(file?.size);
  if (!Number.isFinite(size) || size <= 0) throw new Error('A non-empty transfer handover file is required.');
  if (size > REVISION_COMPARE_HANDOVER_MAX_SOURCE_BYTES) throw new RangeError('Transfer handover exceeds the 128 MiB input limit.');
  if (!fileMetadataIsCompatible(file)) throw new TypeError('The selected file metadata is incompatible with a JSON handover.');
  return file;
}
function decodeHandoverBytes(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) throw new Error('A UTF-8 byte-order mark is not allowed.');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
function fileReaderBytes(file, view, readers) {
  if (!view?.FileReader) return file.arrayBuffer().then((value) => new Uint8Array(value));
  return new Promise((resolve, reject) => {
    const reader = new view.FileReader(); readers.add(reader);
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Transfer handover file read failed.'));
    reader.onabort = () => reject(new view.DOMException('Transfer handover file read was aborted.', 'AbortError'));
    reader.onloadend = () => readers.delete(reader); reader.readAsArrayBuffer(file);
  });
}
function emitDownload(root, text, filename, mimeType) {
  const view = root.ownerDocument.defaultView;
  const url = view.URL.createObjectURL(new view.Blob([text], { type: mimeType }));
  const anchor = root.ownerDocument.createElement('a'); anchor.href = url; anchor.download = filename;
  try { root.appendChild(anchor); anchor.click(); } finally { anchor.remove(); view.URL.revokeObjectURL(url); }
}
async function verifiedDownloadBundle(root, bundle, cryptoRef) {
  const text = serializeRevisionCompareTransferHandoverBundle(bundle);
  const verified = await verifyRevisionCompareTransferHandoverText(text, { cryptoRef });
  emitDownload(root, text, revisionCompareTransferHandoverFileName(verified.identity.sessionId, verified.bundleId), 'application/json');
  return verified;
}
async function verifiedDownloadArtifact(root, bundle, index, cryptoRef) {
  const verified = await verifyRevisionCompareTransferHandoverText(serializeRevisionCompareTransferHandoverBundle(bundle), { cryptoRef });
  const item = verified.payload.transferArtifacts[index]; const role = REVISION_COMPARE_HANDOVER_ARTIFACT_ROLES[index];
  if (!item || !role) throw new Error('Embedded transfer artifact is unavailable.');
  emitDownload(root, item.text, item.filename, item.mimeType); return Object.freeze({ role, artifact: item });
}
function controllerContext(options) {
  const readers = new Set();
  return {
    options, readers, destroyed: false,
    readBytes: options.readFileBytes ?? ((file) => fileReaderBytes(file, options.root.ownerDocument.defaultView, readers)),
  };
}
function activity(context, extra = {}) { return { ...(context.options.readActivity?.() ?? {}), ...extra }; }
function commit(context, next) {
  const current = context.options.readState();
  if (context.destroyed || next === current) return false;
  context.options.writeState(next); context.options.render(next); return true;
}
function abortReads(context) {
  context.readers.forEach((reader) => { if (reader.readyState === 1) reader.abort(); }); context.readers.clear();
}
function requireReadiness(context, state) {
  const result = revisionCompareHandoverInspectionReadiness(state, activity(context, { allowImportSupersede: true }));
  if (result.status !== 'READY') throw new Error(result.blockers[0]);
}
async function importFiles(context, fileList) {
  const initial = context.options.readState(); requireReadiness(context, initial); const file = admitFiles(fileList);
  const inspection = startRevisionCompareHandoverInspection(initial.handoverInspection, file);
  const generation = inspection.requestGeneration;
  if (!commit(context, setWorkspaceHandoverInspection(initial, inspection))) return false;
  try {
    const text = decodeHandoverBytes(await context.readBytes(file));
    const bundle = await verifyRevisionCompareTransferHandoverText(text, { cryptoRef: context.options.cryptoRef });
    if (context.destroyed) return false; const current = context.options.readState(); requireReadiness(context, current);
    const completed = completeRevisionCompareHandoverInspection(current.handoverInspection, generation, bundle);
    if (completed === current.handoverInspection || !commit(context, setWorkspaceHandoverInspection(current, completed))) return false;
    context.options.showToast?.('Transfer handover verified.', 'success'); return true;
  } catch (error) { return failImport(context, generation, error); }
}
function failImport(context, generation, error) {
  if (context.destroyed) return false; const current = context.options.readState();
  const failed = failRevisionCompareHandoverInspection(current.handoverInspection, generation, error);
  if (failed === current.handoverInspection || !commit(context, setWorkspaceHandoverInspection(current, failed))) return false;
  throw error;
}
async function handleChange(context, target) {
  if (!selected(target, 'data-revc-handover-file')) return false;
  try { return await importFiles(context, target.files); }
  catch (error) { if (!context.destroyed) context.options.reportFailure(error); return false; }
  finally { target.value = ''; }
}
async function handleClick(context, button) {
  try {
    const state = context.options.readState(); const inspection = state.handoverInspection;
    if (selected(button, 'data-revc-clear-handover-inspection')) {
      abortReads(context); return commit(context, setWorkspaceHandoverInspection(state, clearRevisionCompareHandoverInspection(inspection)));
    }
    if (selected(button, 'data-revc-download-imported-handover')) {
      await verifiedDownloadBundle(context.options.root, inspection?.bundle, context.options.cryptoRef); return true;
    }
    if (selected(button, 'data-revc-download-imported-transfer-artifact')) {
      const index = Number(button.getAttribute('data-revc-download-imported-transfer-artifact'));
      await verifiedDownloadArtifact(context.options.root, inspection?.bundle, index, context.options.cryptoRef); return true;
    }
    return false;
  } catch (error) { if (!context.destroyed) context.options.reportFailure(error); return false; }
}
function destroy(context) { context.destroyed = true; abortReads(context); }
export function createRevisionCompareHandoverInspectionController(options) {
  const context = controllerContext(options);
  return Object.freeze({
    handleChange: (target) => handleChange(context, target),
    handleClick: (button) => handleClick(context, button),
    destroy: () => destroy(context),
  });
}
export const _test = Object.freeze({
  admitFiles, decodeHandoverBytes, emitDownload, fileMetadataIsCompatible,
  fileReaderBytes, selected, verifiedDownloadArtifact, verifiedDownloadBundle,
});
