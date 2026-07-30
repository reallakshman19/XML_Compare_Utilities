/** Visible, non-mutating exports for the Sequential Draft Edit 3D demo baseline. */
import {
  createSequentialDraftEdit3dReleaseManifest,
  sequentialDraftEdit3dReleaseManifestFileName,
} from './sequential-draft-edit-3d-release-manifest.js';
import {
  createSequentialDraftEdit3dOperatorWalkthroughWorksheet,
  sequentialDraftEdit3dOperatorWalkthroughWorksheetFileName,
} from './sequential-draft-edit-3d-operator-walkthrough.js';

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
function createButton(root, attribute, label) {
  const button = root.ownerDocument.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute(attribute, '1');
  button.disabled = true;
  return button;
}
function installButtons(root) {
  const draftButton = root.querySelector('[data-ssk-draft-edit-3d]');
  if (!draftButton) throw new Error('Draft Edit 3D pilot feature requires the 3D toolbar button.');
  let baseline = root.querySelector('[data-ssk-draft-edit-pilot-export]');
  if (!baseline) {
    baseline = createButton(root, 'data-ssk-draft-edit-pilot-export', 'Download 3D pilot baseline');
    draftButton.insertAdjacentElement('afterend', baseline);
  }
  let walkthrough = root.querySelector('[data-ssk-draft-edit-walkthrough-export]');
  if (!walkthrough) {
    walkthrough = createButton(root, 'data-ssk-draft-edit-walkthrough-export',
      'Download 3D walkthrough worksheet');
    baseline.insertAdjacentElement('afterend', walkthrough);
  }
  return { baseline, walkthrough };
}
function downloadJson(documentRef, value, fileName) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  documentRef.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
function evidenceInput(state) {
  const commandState = state.commandBoundary.readCurrentState();
  const supportState = state.supportBoundary.readCurrentState();
  const geometryState = state.geometryBoundary.readCurrentState();
  const view = state.geometryBoundary.readView();
  return {
    controllerSchema: state.controller.schema,
    controllerState: state.controller.getState(),
    shadowEvidence: state.shadow.evidence(),
    commandState,
    supportState,
    geometryState,
    view,
  };
}
function currentManifest(state) {
  return createSequentialDraftEdit3dReleaseManifest(evidenceInput(state));
}
function setAvailability(state, enabled, reason = '') {
  state.lastError = reason || null;
  state.buttons.baseline.disabled = !enabled;
  state.buttons.walkthrough.disabled = !enabled;
  state.buttons.baseline.title = enabled
    ? 'Download immutable engineering-demo baseline evidence for the active branch'
    : `Pilot evidence unavailable: ${reason}`;
  state.buttons.walkthrough.title = enabled
    ? 'Download the pending controlled operator-walkthrough worksheet'
    : `Walkthrough worksheet unavailable: ${reason}`;
  return enabled;
}
function refresh(state) {
  if (state.destroyed) return false;
  try {
    if (state.controller.getState().available !== true) {
      throw new RangeError('Open one authoritative Sequential branch before baseline export.');
    }
    const manifest = currentManifest(state);
    createSequentialDraftEdit3dOperatorWalkthroughWorksheet(manifest);
    return setAvailability(state, true);
  } catch (error) {
    return setAvailability(state, false, error?.message || String(error));
  }
}
function exportEvidence(state) {
  if (state.destroyed) throw new Error('Draft Edit 3D pilot feature is destroyed.');
  try {
    const manifest = currentManifest(state);
    setAvailability(state, true);
    downloadJson(state.documentRef, manifest,
      sequentialDraftEdit3dReleaseManifestFileName(manifest));
    try { state.onExport(manifest); } catch {}
    return manifest;
  } catch (error) {
    setAvailability(state, false, error?.message || String(error));
    throw error;
  }
}
function exportWalkthroughWorksheet(state) {
  if (state.destroyed) throw new Error('Draft Edit 3D pilot feature is destroyed.');
  try {
    const worksheet = createSequentialDraftEdit3dOperatorWalkthroughWorksheet(currentManifest(state));
    setAvailability(state, true);
    downloadJson(state.documentRef, worksheet,
      sequentialDraftEdit3dOperatorWalkthroughWorksheetFileName(worksheet));
    try { state.onWalkthroughExport(worksheet); } catch {}
    return worksheet;
  } catch (error) {
    setAvailability(state, false, error?.message || String(error));
    throw error;
  }
}
function bind(state) {
  state.buttons.baseline.addEventListener('click', state.onBaselineClick);
  state.buttons.walkthrough.addEventListener('click', state.onWalkthroughClick);
  try {
    state.unsubscribe = state.workspace.subscribeEngineeringSvgOwnerState(() => refresh(state));
    if (typeof state.unsubscribe !== 'function') throw new TypeError(
      'Pilot feature owner subscription must return an unsubscribe function.');
    refresh(state);
  } catch (error) {
    unbindButtons(state);
    try { state.unsubscribe?.(); } catch {}
    state.buttons.baseline.remove(); state.buttons.walkthrough.remove();
    throw error;
  }
}
function unbindButtons(state) {
  state.buttons.baseline.removeEventListener('click', state.onBaselineClick);
  state.buttons.walkthrough.removeEventListener('click', state.onWalkthroughClick);
}
function destroy(state) {
  if (state.destroyed) return false;
  state.destroyed = true;
  try { state.unsubscribe?.(); } catch {}
  unbindButtons(state);
  state.buttons.baseline.remove(); state.buttons.walkthrough.remove();
  return true;
}
function clickHandler(action, onFailure) {
  return (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    try { action(); }
    catch (error) { try { onFailure(error); } catch {} }
  };
}
function createState(options, root) {
  return {
    root,
    documentRef: options.documentRef || root.ownerDocument,
    controller: requiredMethods(options.controller, ['getState'], 'controller'),
    shadow: requiredMethods(options.shadow, ['evidence'], 'shadow'),
    commandBoundary: requiredMethods(options.commandBoundary, ['readCurrentState'], 'commandBoundary'),
    supportBoundary: requiredMethods(options.supportBoundary, ['readCurrentState'], 'supportBoundary'),
    geometryBoundary: requiredMethods(options.geometryBoundary,
      ['readCurrentState', 'readView'], 'geometryBoundary'),
    workspace: requiredMethods(options.workspace, ['subscribeEngineeringSvgOwnerState'], 'workspace'),
    onExport: requiredFunction(options.onExport || (() => {}), 'onExport'),
    onWalkthroughExport: requiredFunction(options.onWalkthroughExport || (() => {}),
      'onWalkthroughExport'),
    onFailure: requiredFunction(options.onFailure || (() => {}), 'onFailure'),
    buttons: installButtons(root), unsubscribe: null,
    onBaselineClick: null, onWalkthroughClick: null,
    lastError: null, destroyed: false,
  };
}
function publicFeature(state) {
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_3D_PILOT_FEATURE_SCHEMA,
    exportEvidence: () => exportEvidence(state),
    exportWalkthroughWorksheet: () => exportWalkthroughWorksheet(state),
    refresh: () => refresh(state),
    getState: () => Object.freeze({
      available: !state.buttons.baseline.disabled,
      walkthroughAvailable: !state.buttons.walkthrough.disabled,
      lastError: state.lastError,
      destroyed: state.destroyed,
      buttonPresent: state.buttons.baseline.isConnected !== false,
      walkthroughButtonPresent: state.buttons.walkthrough.isConnected !== false,
    }),
    destroy: () => destroy(state),
  });
}
export function createSequentialDraftEdit3dPilotFeature(options = {}) {
  const root = options.root;
  if (!root?.querySelector || !root?.ownerDocument?.createElement) {
    throw new TypeError('Draft Edit 3D pilot feature requires a DOM root.');
  }
  const state = createState(options, root);
  state.onBaselineClick = clickHandler(() => exportEvidence(state), state.onFailure);
  state.onWalkthroughClick = clickHandler(() => exportWalkthroughWorksheet(state), state.onFailure);
  bind(state);
  return publicFeature(state);
}

export const _test = Object.freeze({ evidenceInput, refresh, installButtons });
