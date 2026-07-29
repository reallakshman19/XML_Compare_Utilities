/** Visible, non-mutating export of the exact Sequential Draft Edit 3D demo baseline. */
import {
  createSequentialDraftEdit3dReleaseManifest,
  sequentialDraftEdit3dReleaseManifestFileName,
} from './sequential-draft-edit-3d-release-manifest.js';

export const SEQUENTIAL_DRAFT_EDIT_3D_PILOT_FEATURE_SCHEMA =
  'SequentialDraftEdit3dPilotFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function requiredMethods(value, names, label) {
  names.forEach((name) => requiredFunction(value?.[name], `${label}.${name}`));
  return value;
}
function installButton(root) {
  const draftButton = root.querySelector('[data-ssk-draft-edit-3d]');
  if (!draftButton) throw new Error('Draft Edit 3D pilot feature requires the 3D toolbar button.');
  const existing = root.querySelector('[data-ssk-draft-edit-pilot-export]');
  if (existing) return existing;
  const button = root.ownerDocument.createElement('button');
  button.type = 'button';
  button.textContent = 'Download 3D pilot baseline';
  button.setAttribute('data-ssk-draft-edit-pilot-export', '1');
  button.disabled = true;
  draftButton.insertAdjacentElement('afterend', button);
  return button;
}
function download(documentRef, manifest) {
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = sequentialDraftEdit3dReleaseManifestFileName(manifest);
  documentRef.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
function evidenceInput(state) {
  return {
    controllerSchema: state.controller.schema,
    controllerState: state.controller.getState(),
    shadowEvidence: state.shadow.evidence(),
    commandState: state.commandBoundary.readCurrentState(),
    supportState: state.supportBoundary.readCurrentState(),
    geometryState: state.geometryBoundary.readCurrentState(),
    view: state.geometryBoundary.readView(),
    createdAt: state.now(),
  };
}
function refresh(state) {
  if (state.destroyed) return false;
  const controllerState = state.controller.getState();
  state.button.disabled = controllerState.available !== true;
  state.button.title = controllerState.available
    ? 'Download immutable engineering-demo baseline evidence for the active branch'
    : 'Open one authoritative Sequential branch before baseline export';
  return !state.button.disabled;
}
function exportEvidence(state) {
  if (state.destroyed) throw new Error('Draft Edit 3D pilot feature is destroyed.');
  if (!refresh(state)) throw new RangeError('Pilot baseline export requires an authoritative open branch.');
  const manifest = createSequentialDraftEdit3dReleaseManifest(evidenceInput(state));
  download(state.documentRef, manifest);
  try { state.onExport(manifest); } catch {}
  return manifest;
}
function bind(state) {
  state.button.addEventListener('click', state.onClick);
  try {
    state.unsubscribe = state.workspace.subscribeEngineeringSvgOwnerState(() => refresh(state));
    if (typeof state.unsubscribe !== 'function') throw new TypeError(
      'Pilot feature owner subscription must return an unsubscribe function.');
    refresh(state);
  } catch (error) {
    state.button.removeEventListener('click', state.onClick);
    try { state.unsubscribe?.(); } catch {}
    state.button.remove();
    throw error;
  }
}
function destroy(state) {
  if (state.destroyed) return false;
  state.destroyed = true;
  try { state.unsubscribe?.(); } catch {}
  state.button.removeEventListener('click', state.onClick);
  state.button.remove();
  return true;
}
export function createSequentialDraftEdit3dPilotFeature(options = {}) {
  const root = options.root;
  if (!root?.querySelector || !root?.ownerDocument?.createElement) {
    throw new TypeError('Draft Edit 3D pilot feature requires a DOM root.');
  }
  const state = {
    root,
    documentRef: options.documentRef || root.ownerDocument,
    controller: requiredMethods(options.controller, ['getState'], 'controller'),
    shadow: requiredMethods(options.shadow, ['evidence'], 'shadow'),
    commandBoundary: requiredMethods(options.commandBoundary, ['readCurrentState'], 'commandBoundary'),
    supportBoundary: requiredMethods(options.supportBoundary, ['readCurrentState'], 'supportBoundary'),
    geometryBoundary: requiredMethods(options.geometryBoundary,
      ['readCurrentState', 'readView'], 'geometryBoundary'),
    workspace: requiredMethods(options.workspace, ['subscribeEngineeringSvgOwnerState'], 'workspace'),
    now: requiredFunction(options.now || (() => new Date().toISOString()), 'now'),
    onExport: requiredFunction(options.onExport || (() => {}), 'onExport'),
    onFailure: requiredFunction(options.onFailure || (() => {}), 'onFailure'),
    button: installButton(root), unsubscribe: null, onClick: null, destroyed: false,
  };
  state.onClick = (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    try { exportEvidence(state); }
    catch (error) { try { state.onFailure(error); } catch {} }
  };
  bind(state);
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_3D_PILOT_FEATURE_SCHEMA,
    exportEvidence: () => exportEvidence(state),
    refresh: () => refresh(state),
    getState: () => Object.freeze({ available: !state.button.disabled,
      destroyed: state.destroyed, buttonPresent: state.button.isConnected !== false }),
    destroy: () => destroy(state),
  });
}

export const _test = Object.freeze({ evidenceInput, refresh, installButton });
