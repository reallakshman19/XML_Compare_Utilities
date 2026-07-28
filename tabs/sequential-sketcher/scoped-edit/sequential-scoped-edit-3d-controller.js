/** Sequential Draft Edit 3D view with guarded supervised command controls. */
import { createSequentialScopedEditVisualModel } from './sequential-scoped-edit-visual-model.js';
import { createSequentialDraftEditCommandGateway } from './sequential-draft-edit-command-gateway.js';
import { createSequentialDraftEditCommandPanel } from './sequential-draft-edit-command-panel.js';
import { selectSequentialDraftEditCandidateTarget } from './sequential-draft-edit-target-selection.js';
import { createSequentialDraftEditDecisionTarget } from './sequential-draft-edit-decision-target.js';
import { deriveSequentialEditAuthority } from './sequential-edit-authority.js';

export const SEQUENTIAL_SCOPED_EDIT_3D_CONTROLLER_V1 = 'SequentialScopedEdit3dController.v1';
export const SEQUENTIAL_SCOPED_EDIT_3D_RENDERER = 'DRAFT_EDIT_3D';

const CONTROLLERS = new WeakMap();
const VIEW_BY_PROJECTION = Object.freeze({ ISO: 'iso', XY: 'top', XZ: 'front', YZ: 'side' });

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function requiredShadow(value) {
  for (const name of ['host', 'readModel', 'evidence']) requiredFunction(value?.[name], `shadow.${name}`);
  return value;
}
function requiredWorkspace(value) {
  requiredFunction(value?.subscribeEngineeringSvgOwnerState, 'workspace.subscribeEngineeringSvgOwnerState');
  return value;
}
function requiredCommandBoundary(value) {
  requiredFunction(value?.readCurrentState, 'commandBoundary.readCurrentState');
  requiredFunction(value?.publishCandidate, 'commandBoundary.publishCandidate');
  return value;
}
function injectFailure(factory, stage) {
  if (typeof factory !== 'function') return;
  const result = factory(stage);
  if (result instanceof Error) throw result;
  if (result) throw new Error(String(result));
}
function elements(root) {
  const find = (selector) => {
    const value = root.querySelector(selector);
    if (!value) throw new Error(`Sequential Draft Edit 3D element missing: ${selector}`);
    return value;
  };
  return {
    button: find('[data-ssk-draft-edit-3d]'), host: find('[data-ssk-draft-edit-3d-host]'),
    construction: find('[data-ssk-construction-surface]'),
    preview: find('[data-ssk-engineering-svg-preview-host]'), status: find('[data-ssk-preview-status]'),
  };
}
function setHidden(element, hidden) {
  element.hidden = hidden; element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (hidden) element.setAttribute('inert', ''); else element.removeAttribute('inert');
}
function announce(state, message, status = 'ready') {
  state.elements.status.textContent = message; state.elements.status.dataset.state = status;
}
function set3dPressed(state, pressed) {
  state.elements.button.classList.toggle('is-active', pressed);
  state.elements.button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  if (!pressed) return;
  state.root.querySelectorAll('[data-ssk-renderer]').forEach((button) => {
    button.classList.remove('is-active'); button.setAttribute('aria-pressed', 'false');
  });
}
function show3dSurface(state) {
  setHidden(state.elements.construction, true); setHidden(state.elements.preview, true);
  setHidden(state.elements.host, false); set3dPressed(state, true); state.commandPanel?.setActive(true);
}
function hide3dSurface(state) {
  state.commandPanel?.setActive(false); setHidden(state.elements.host, true); set3dPressed(state, false);
}
function available(state) { return Boolean(state.shadow.host() && state.shadow.readModel()); }
function syncAvailability(state) {
  const next = available(state);
  state.elements.button.disabled = !next;
  state.elements.button.title = next ? 'Open the certified Draft Edit 3D view' : 'Draft Edit 3D requires an open Sequential branch';
  if (!next && state.active) {
    state.active = false; hide3dSurface(state); setHidden(state.elements.construction, false);
  }
  return next;
}
function selectedIds(readModel) { return readModel?.selectionSnapshot?.entityIds || []; }
function applyProjection(state, readModel) {
  const projection = readModel?.ownerSnapshot?.visibleProjection || 'ISO';
  state.viewer?.setStandardView(VIEW_BY_PROJECTION[projection] || 'iso');
}
function syncDecisionTarget(state, scene, readModel) {
  try {
    const target = createSequentialDraftEditDecisionTarget({
      readModel, scene, currentState: state.commandBoundary.readCurrentState(),
    });
    state.commandPanel?.setDecisionTarget(target);
  } catch { state.commandPanel?.clearDecisionTarget(); }
}
function applyScene(state) {
  injectFailure(state.options.failureFactory, 'scene-apply');
  const host = state.shadow.host(); const readModel = state.shadow.readModel();
  if (!host || !readModel) throw new Error('Sequential Draft Edit 3D authority is unavailable.');
  const scene = host.scene(); const model = createSequentialScopedEditVisualModel({ readModel, scene });
  state.scene = scene; state.readModel = readModel;
  state.viewer.setVerticalAxis(scene.coordinateSystem.verticalAxis);
  state.viewer.setModels({ source: null, target: model, registrationTranslation: [0, 0, 0] });
  state.viewer.setMode('target-only');
  const ids = selectedIds(readModel); state.viewer.setSelection(ids.at(-1) || null, ids.slice(0, -1));
  const mountKey = state.shadow.evidence().mountKey;
  if (state.mountKey !== mountKey) { state.mountKey = mountKey; state.viewer.fitAll(); }
  applyProjection(state, readModel); syncDecisionTarget(state, scene, readModel);
  announce(state, `Draft Edit 3D active · ${scene.entities.length} entities · exact candidate and boundary decisions are supervised.`, 'ready');
}
function selectPick(state, objectId) {
  state.viewer?.setSelection(objectId, []);
  if (!objectId) { state.commandPanel?.clearCandidateTarget(); return; }
  try {
    const target = selectSequentialDraftEditCandidateTarget({
      objectId, readModel: state.readModel, scene: state.scene,
      currentState: state.commandBoundary.readCurrentState(),
    });
    state.commandPanel.setCandidateTarget(target);
    announce(state, `Candidate ${target.candidateId} selected. Pick alone does not issue a command.`, 'ready');
  } catch (error) {
    state.commandPanel?.clearCandidateTarget(`Selection ${objectId} is non-authoritative: ${error.code || error.message}.`);
    announce(state, `Draft Edit 3D selected ${objectId}. No candidate command target was established.`, 'ready');
  }
}
function viewerOptions(state) {
  return {
    navigationPreset: 'CAD_EDIT', onPick: (pick) => selectPick(state, pick?.objectId || null),
    onRuntimeError: (error) => containFailure(state, error, 'viewer runtime'),
    onNavigationError: (error) => containFailure(state, error, 'navigation'),
  };
}
async function createViewer(state, canvas) {
  injectFailure(state.options.failureFactory, 'viewer-mount');
  if (typeof state.options.createViewer === 'function') return state.options.createViewer(canvas, viewerOptions(state));
  const { createWorkbenchViewer } = await import('../../../workbench3d/viewer/workbench-viewer.js?v=20260727-ssk-ts-1b-3d-1');
  return createWorkbenchViewer(canvas, viewerOptions(state));
}
async function ensureViewer(state) {
  if (state.viewer) return state.viewer;
  if (state.pending) return state.pending;
  state.elements.host.innerHTML = '<div data-ssk-draft-edit-3d-canvas style="position:absolute;inset:0"></div>';
  const canvas = state.elements.host.querySelector('[data-ssk-draft-edit-3d-canvas]');
  state.pending = createViewer(state, canvas)
    .then((viewer) => { state.viewer = viewer; return viewer; })
    .finally(() => { state.pending = null; });
  return state.pending;
}
function containFailure(state, error, stage) {
  const message = error?.message || String(error);
  state.failureCount += 1; state.active = false; hide3dSurface(state);
  setHidden(state.elements.construction, false);
  announce(state, `Draft Edit 3D failed during ${stage}: ${message}. Construction SVG retained.`, 'error');
  try { state.options.onFailure?.({ stage, message }); } catch {}
  return false;
}
async function show3d(state) {
  if (state.destroyed || !syncAvailability(state)) return false;
  try {
    await ensureViewer(state); if (state.destroyed) return false;
    try { state.options.onActivate?.(); } catch {}
    state.active = true; show3dSurface(state); applyScene(state); return true;
  } catch (error) { return containFailure(state, error, 'view mount'); }
}
function scheduleRefresh(state) {
  queueMicrotask(() => {
    if (state.destroyed) return;
    state.commandPanel?.refresh({
      invalidatePending: true, invalidateTarget: true,
      reason: 'Prepared command and command targets invalidated because Sequential owner authority changed.',
    });
    syncAvailability(state); if (!state.active) return;
    try { applyScene(state); } catch (error) { containFailure(state, error, 'owner refresh'); }
  });
}
function handleClick(state, event) {
  if (event.target?.closest?.('[data-ssk-draft-edit-3d]')) {
    event.preventDefault(); event.stopImmediatePropagation(); show3d(state); return;
  }
  if (event.target?.closest?.('[data-ssk-renderer]') && state.active) {
    state.active = false; hide3dSurface(state);
  }
}
function destroy(state) {
  if (state.destroyed) return false;
  state.destroyed = true; state.root.removeEventListener('click', state.onClick, true);
  try { state.unsubscribe?.(); } catch {}
  try { state.commandPanel?.destroy(); } catch {}
  try { state.gateway?.destroy(); } catch {}
  try { state.viewer?.dispose(); } catch {}
  state.viewer = null; state.scene = null; state.readModel = null;
  state.elements.host.innerHTML = ''; CONTROLLERS.delete(state.root); return true;
}
function installCommandPanel(state) {
  try {
    state.commandPanel = createSequentialDraftEditCommandPanel({
      root: state.root, gateway: state.gateway,
      readCurrentState: state.commandBoundary.readCurrentState,
      readCurrentAuthorityId: () => deriveSequentialEditAuthority(
        state.commandBoundary.readCurrentState(),
      ).authorityId,
      now: state.options.commandIssuedAtProvider,
      onAccepted: state.options.onCommandAccepted, onFailure: state.options.onCommandFailure,
    });
    state.onClick = (event) => handleClick(state, event);
    state.unsubscribe = state.workspace.subscribeEngineeringSvgOwnerState(() => scheduleRefresh(state));
    if (typeof state.unsubscribe !== 'function') throw new TypeError('Sequential owner subscription must return an unsubscribe function.');
    state.root.addEventListener('click', state.onClick, true);
  } catch (error) {
    try { state.unsubscribe?.(); } catch {}
    try { state.commandPanel?.destroy(); } catch {}
    try { state.gateway.destroy(); } catch {}
    throw error;
  }
}
export function getSequentialScopedEdit3dController(root) { return CONTROLLERS.get(root) || null; }
export function mountSequentialScopedEdit3dController(root, options = {}) {
  if (!root?.querySelector) throw new TypeError('Sequential Draft Edit 3D controller requires a root.');
  const existing = CONTROLLERS.get(root); if (existing) return existing;
  const commandBoundary = requiredCommandBoundary(options.commandBoundary);
  const shadow = requiredShadow(options.shadow); const workspace = requiredWorkspace(options.workspace);
  const viewElements = elements(root);
  const gateway = createSequentialDraftEditCommandGateway({
    readCurrentState: commandBoundary.readCurrentState, publishCandidate: commandBoundary.publishCandidate,
  });
  const state = {
    root, options, gateway, commandBoundary, shadow, workspace, elements: viewElements,
    viewer: null, pending: null, scene: null, readModel: null, mountKey: '', active: false,
    destroyed: false, failureCount: 0, unsubscribe: null, commandPanel: null,
  };
  installCommandPanel(state); syncAvailability(state);
  const controller = Object.freeze({
    schema: SEQUENTIAL_SCOPED_EDIT_3D_CONTROLLER_V1,
    show: () => show3d(state), refresh: () => { scheduleRefresh(state); return true; },
    getCommandGatewayState: gateway.getState, getCommandPanelState: state.commandPanel.getState,
    prepareCommand: gateway.prepare, acceptCommand: gateway.accept, executeCommand: gateway.execute,
    getState: () => Object.freeze({ active: state.active, available: available(state),
      mounted: Boolean(state.viewer), mountKey: state.mountKey,
      failureCount: state.failureCount, destroyed: state.destroyed,
      commandGateway: gateway.getState(), commandPanel: state.commandPanel.getState(),
      viewerState: state.viewer?.getStateSnapshot?.() ?? null }),
    destroy: () => destroy(state),
  });
  CONTROLLERS.set(root, controller); return controller;
}
