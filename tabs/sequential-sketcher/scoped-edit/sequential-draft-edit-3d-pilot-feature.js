/** User-triggered, non-mutating pilot-baseline evidence export. */
import {
  SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_FILENAME,
  SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_MIME,
  createSequentialDraftEdit3dReleaseManifest,
  serializeSequentialDraftEdit3dReleaseManifest,
  validateSequentialDraftEdit3dReleaseManifest,
} from './sequential-draft-edit-3d-release-manifest.js';

export const SEQUENTIAL_DRAFT_EDIT_3D_PILOT_FEATURE_V1 =
  'SequentialDraftEdit3dPilotFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}

function requiredButton(root) {
  const button = root?.querySelector?.('[data-ssk-draft-edit-3d-pilot-export]');
  if (!button) throw new Error('Sequential Draft Edit 3D pilot export control is missing.');
  return button;
}

function saveEvidence(documentRef, content) {
  const windowRef = documentRef?.defaultView;
  if (!windowRef?.Blob || !windowRef?.URL?.createObjectURL) {
    throw new Error('Browser download services are unavailable.');
  }
  const blob = new windowRef.Blob([content], { type: SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_MIME });
  const url = windowRef.URL.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_FILENAME;
  anchor.hidden = true;
  documentRef.body.appendChild(anchor);
  try { anchor.click(); } finally {
    anchor.remove();
    windowRef.URL.revokeObjectURL(url);
  }
}

function disabledReason(error) {
  const message = error?.message || String(error);
  return `Pilot evidence unavailable: ${message}`;
}

function setAvailability(runtime, enabled, reason) {
  runtime.enabled = enabled;
  runtime.reason = reason;
  runtime.button.disabled = !enabled;
  runtime.button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  runtime.button.title = enabled
    ? 'Download deterministic Draft Edit 3D engineering-demo evidence'
    : reason;
}

function probe(runtime) {
  if (runtime.destroyed) return false;
  try {
    createSequentialDraftEdit3dReleaseManifest(runtime.readRuntime());
    setAvailability(runtime, true, '');
    return true;
  } catch (error) {
    setAvailability(runtime, false, disabledReason(error));
    return false;
  }
}

function announce(runtime, message, status = 'ready') {
  try { runtime.onStatus(message, status); } catch {}
}

function exportEvidence(runtime) {
  if (runtime.destroyed) throw new Error('Pilot evidence feature is destroyed.');
  const currentRuntime = runtime.readRuntime();
  const prepared = createSequentialDraftEdit3dReleaseManifest(currentRuntime);
  const verified = validateSequentialDraftEdit3dReleaseManifest(prepared, currentRuntime);
  const content = serializeSequentialDraftEdit3dReleaseManifest(verified);
  runtime.download({
    filename: SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_FILENAME,
    mimeType: SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_MIME,
    content,
    manifest: verified,
  });
  runtime.exportCount += 1;
  runtime.lastFingerprint = verified.fingerprint;
  runtime.lastError = null;
  announce(runtime, `Pilot baseline evidence downloaded · ${verified.fingerprint}.`);
  probe(runtime);
  return verified;
}

function handleClick(runtime, event) {
  event.preventDefault();
  event.stopPropagation();
  try { exportEvidence(runtime); } catch (error) {
    runtime.lastError = error?.message || String(error);
    setAvailability(runtime, false, disabledReason(error));
    announce(runtime, `Pilot evidence export failed: ${runtime.lastError}.`, 'error');
  }
}

function featureState(runtime) {
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_3D_PILOT_FEATURE_V1,
    enabled: runtime.enabled,
    disabledReason: runtime.reason || null,
    exportCount: runtime.exportCount,
    lastFingerprint: runtime.lastFingerprint,
    lastError: runtime.lastError,
    destroyed: runtime.destroyed,
  });
}

function destroy(runtime) {
  if (runtime.destroyed) return false;
  runtime.destroyed = true;
  runtime.button.removeEventListener('click', runtime.onClick);
  setAvailability(runtime, false, 'Pilot evidence feature is destroyed.');
  return true;
}

export function createSequentialDraftEdit3dPilotFeature(options = {}) {
  const root = options.root;
  const runtime = {
    button: requiredButton(root),
    readRuntime: requiredFunction(options.readRuntime, 'readRuntime'),
    download: typeof options.download === 'function'
      ? options.download
      : ({ content }) => saveEvidence(root.ownerDocument, content),
    onStatus: typeof options.onStatus === 'function' ? options.onStatus : () => {},
    enabled: false,
    reason: '',
    exportCount: 0,
    lastFingerprint: null,
    lastError: null,
    destroyed: false,
    onClick: null,
  };
  runtime.onClick = (event) => handleClick(runtime, event);
  runtime.button.addEventListener('click', runtime.onClick);
  probe(runtime);
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_3D_PILOT_FEATURE_V1,
    refresh: () => probe(runtime),
    exportEvidence: () => exportEvidence(runtime),
    getState: () => featureState(runtime),
    destroy: () => destroy(runtime),
  });
}

export const _test = Object.freeze({ disabledReason, saveEvidence });
