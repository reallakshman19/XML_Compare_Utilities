import { createEngineeringEditIntent } from '../engineering-scene/index.js';
import { createEngineeringSvgWorkspace } from './engineering-svg-workspace.js';
import {
  aggregateEngineeringSvgProperties,
  createEngineeringSvgDraftStore,
  createEngineeringSvgEditCoordinator,
  resolveEngineeringSvgPropertyField,
} from './edit-runtime.js';
import { buildEngineeringSvgInspectorModel } from './engineering-svg-inspector-model.js';
import { createEngineeringSvgPropertyInspectorView } from './engineering-svg-property-inspector-view.js';

export const ENGINEERING_SVG_WORKSPACE_SHELL_SCHEMA = 'EngineeringSvgWorkspaceShell.v1';

function element(documentRef, tag, attributes = {}) {
  const node = documentRef.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  return node;
}

function requiredText(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function dirtyProperties(model) {
  return Object.fromEntries(model.rows
    .filter((row) => row.dirty && row.valid && row.display.state === 'uniform')
    .map((row) => [row.key, row.display.value]));
}

export function createEngineeringSvgWorkspaceShell(options = {}) {
  const { host, sceneSource, propertyProvider, commandGateway } = options;
  if (!host?.ownerDocument?.createElement) throw new TypeError('Engineering SVG shell requires a DOM host.');
  if (!sceneSource?.getSnapshot || !propertyProvider?.getPropertySets || !commandGateway?.execute) {
    throw new TypeError('Engineering SVG shell requires sceneSource, propertyProvider and commandGateway.');
  }
  const shellId = requiredText(options.shellId, 'Engineering SVG shellId');
  const documentRef = host.ownerDocument;
  const root = element(documentRef, 'section', {
    'data-engineering-svg-shell': shellId,
    role: 'region',
    'aria-label': options.ariaLabel || 'Engineering SVG editor',
  });
  const canvasHost = element(documentRef, 'div', { 'data-engineering-svg-shell-canvas': shellId });
  const inspectorHost = element(documentRef, 'aside', { 'data-engineering-svg-shell-inspector': shellId });
  const status = element(documentRef, 'p', {
    'data-engineering-svg-shell-status': shellId,
    role: 'status',
    'aria-live': 'polite',
  });
  root.append(canvasHost, inspectorHost, status);
  host.appendChild(root);

  const draftStore = options.draftStore || createEngineeringSvgDraftStore();
  const editCoordinator = createEngineeringSvgEditCoordinator({
    commandGateway,
    propertyProvider,
    draftStore,
  });
  const workspace = createEngineeringSvgWorkspace({
    host: canvasHost,
    sceneSource,
    projection: options.projection,
    viewport: options.viewport,
    padding: options.padding,
    selectedIds: options.selectedIds,
  });
  let propertySets = [];
  let propertyViews = [];
  let inspectorModel = buildEngineeringSvgInspectorModel({ selectedIds: [], propertyViews: [], draft: {} });
  let requestSequence = 0;
  let operationSequence = 0;
  let destroyed = false;

  function setStatus(message, state = 'ready') {
    status.textContent = String(message || '');
    status.setAttribute('data-engineering-svg-shell-state', state);
  }

  function renderInspector() {
    inspectorModel = buildEngineeringSvgInspectorModel({
      selectedIds: workspace.getSelection(),
      propertyViews,
      draft: draftStore.getSnapshot(),
    });
    inspectorView.render(inspectorModel);
    return inspectorModel;
  }

  function beginDraft() {
    const current = draftStore.getSnapshot();
    if (current.operationId) return current;
    operationSequence += 1;
    return editCoordinator.begin({
      operationId: `${shellId}:property:${operationSequence}`,
      baseRevision: sceneSource.getSnapshot().revision,
    });
  }

  function stageField(key, value) {
    const selectedIds = workspace.getSelection();
    if (!selectedIds.length) return;
    beginDraft();
    selectedIds.forEach((entityId) => {
      const field = resolveEngineeringSvgPropertyField(propertySets, key, entityId);
      if (!field || !field.editable) return;
      editCoordinator.stageProperty(entityId, key, { original: field.value, draft: value });
    });
    const model = renderInspector();
    setStatus(model.invalidCount ? 'Staged edit requires correction.' : 'Property edit staged.', model.invalidCount ? 'invalid' : 'draft');
  }

  const inspectorView = createEngineeringSvgPropertyInspectorView({
    host: inspectorHost,
    idPrefix: shellId,
    onFieldEdit: stageField,
    onApply: () => apply(),
    onCancel: () => cancel('user-cancel'),
  });

  async function loadProperties(reason = 'refresh') {
    const sequence = ++requestSequence;
    const selectedIds = workspace.getSelection();
    inspectorView.setBusy(true);
    if (!selectedIds.length) {
      propertySets = [];
      propertyViews = [];
      renderInspector();
      inspectorView.setBusy(false);
      setStatus('No engineering entity selected.', 'empty');
      return;
    }
    setStatus('Loading engineering properties…', 'loading');
    try {
      const sets = await propertyProvider.getPropertySets(selectedIds, sceneSource.getSnapshot().revision);
      if (destroyed || sequence !== requestSequence) return;
      propertySets = sets;
      propertyViews = aggregateEngineeringSvgProperties(selectedIds, sets);
      renderInspector();
      inspectorView.setBusy(false);
      setStatus(`Properties loaded for ${selectedIds.join(', ')}.`, reason);
    } catch (error) {
      if (destroyed || sequence !== requestSequence) return;
      inspectorView.setBusy(false);
      setStatus(String(error?.message || error), 'error');
    }
  }

  async function apply() {
    if (!inspectorModel.applyEligible) return null;
    const draft = draftStore.getSnapshot();
    const intent = createEngineeringEditIntent({
      type: 'SET_PROPERTIES',
      operationId: draft.operationId,
      baseRevision: draft.baseRevision,
      entityIds: workspace.getSelection(),
      changes: { properties: dirtyProperties(inspectorModel) },
      source: { interaction: 'property-inspector', surfaceId: shellId },
    });
    inspectorView.setBusy(true);
    setStatus('Applying staged properties…', 'committing');
    try {
      const result = await editCoordinator.commit(intent);
      inspectorView.setBusy(false);
      setStatus(
        result.status === 'committed' ? 'Property changes applied.' : result.message,
        result.status,
      );
      await loadProperties(`command-${result.status}`);
      return result;
    } catch (error) {
      inspectorView.setBusy(false);
      renderInspector();
      setStatus(String(error?.message || error), 'error');
      throw error;
    }
  }

  function cancel(reason = 'cancelled') {
    const draft = draftStore.getSnapshot();
    if (draft.operationId) editCoordinator.cancel(reason);
    renderInspector();
    setStatus('Staged property changes cancelled.', 'cancelled');
  }

  const unsubscribeSelection = workspace.subscribeSelection(() => {
    const draft = draftStore.getSnapshot();
    if (draft.operationId) editCoordinator.cancel('selection-changed');
    loadProperties('selection');
  });
  const unsubscribeScene = sceneSource.subscribe(() => loadProperties('scene-refresh'));
  const unsubscribeProperties = propertyProvider.subscribe?.(() => loadProperties('property-refresh')) || (() => false);
  loadProperties('initial');

  return Object.freeze({
    schema: ENGINEERING_SVG_WORKSPACE_SHELL_SCHEMA,
    root,
    workspace,
    draftStore,
    getSelection: workspace.getSelection,
    setSelection: workspace.setSelection,
    getInspectorModel: () => inspectorModel,
    getInspectorControl: inspectorView.getControl,
    getStatus: () => Object.freeze({ message: status.textContent, state: status.getAttribute('data-engineering-svg-shell-state') }),
    refreshProperties: loadProperties,
    apply,
    cancel,
    destroy() {
      if (destroyed) return false;
      destroyed = true;
      requestSequence += 1;
      unsubscribeSelection();
      unsubscribeScene();
      unsubscribeProperties();
      inspectorView.destroy();
      workspace.destroy();
      draftStore.dispose();
      root.remove();
      return true;
    },
  });
}
