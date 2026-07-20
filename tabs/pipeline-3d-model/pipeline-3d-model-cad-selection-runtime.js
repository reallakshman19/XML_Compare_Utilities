import {
  createPipelineCadSelection,
  createPipelineCadSelectionBox,
  emptyPipelineCadSelection,
  pipelineCadSelectionModifier,
  replacePipelineCadSelection,
  togglePipelineCadSelection,
  updatePipelineCadSelectionBox,
} from './pipeline-3d-model-cad-selection-contracts.js';
import { pipelineCadBoxCandidates } from './pipeline-3d-model-cad-batch-view.js';

function selectionDetail(selection, source) {
  const primary = selection.items.find((item) => item.entityId === selection.primaryId) || null;
  return Object.freeze({
    graph: selection.graph,
    items: selection.items,
    selectedIds: selection.selectedIds,
    primaryId: selection.primaryId,
    count: selection.count,
    entityId: primary?.entityId ?? null,
    entityType: primary?.entityType ?? null,
    source,
  });
}

function emit(graph, source) {
  graph.dispatchGraphEvent('selectionChanged', selectionDetail(graph.selection, source));
}

function setSelection(graph, items, options = {}) {
  const next = createPipelineCadSelection({
    graph: graph.selection.graph,
    items,
    primaryId: options.primaryId,
  });
  graph.selection = next;
  graph.selectedId = next.primaryId;
  const primary = next.items.find((item) => item.entityId === next.primaryId);
  graph.selected = primary ? { id: primary.entityId, type: primary.entityType } : null;
  if (options.emit !== false) emit(graph, options.source || 'set-selection');
  graph.render?.();
  return next;
}

function selectHit(graph, hit, event = {}, source = 'pointer') {
  if (!graph.selectionEnabled || !hit) return graph.selection;
  const value = { graph: graph.selection.graph, entityId: hit.node.id, entityType: hit.type };
  graph.selection = pipelineCadSelectionModifier(event)
    ? togglePipelineCadSelection(graph.selection, value)
    : replacePipelineCadSelection(graph.selection, value);
  return setSelection(graph, graph.selection.items, { primaryId: graph.selection.primaryId, source });
}

function commitBox(graph, event = {}) {
  if (!graph.selectionBox) return graph.selection;
  const nodes = graph.getPipelineCadEditableNodes?.() || [];
  const candidates = pipelineCadBoxCandidates(graph, nodes, graph.selectionBox);
  const items = pipelineCadSelectionModifier(event)
    ? candidates.reduce((selection, item) => togglePipelineCadSelection(selection, item), graph.selection).items
    : candidates;
  const primaryId = items.at(-1)?.entityId || graph.selection.primaryId;
  graph.selectionBox = null;
  return setSelection(graph, items, { primaryId, source: 'selection-box' });
}

export function installPipelineCadSelectionRuntime(graph, graphName) {
  if (!graph || !graphName) throw new TypeError('Pipeline CAD selection runtime requires graph and graphName.');
  graph.selection = emptyPipelineCadSelection(graphName);
  graph.selectionBox = null;
  graph.selectionEnabled = true;
  graph.setPipelineCadSelection = (items, options) => setSelection(graph, items, options);
  graph.clearPipelineCadSelection = (source = 'clear-selection', emitValue = true) => setSelection(graph, [], { source, emit: emitValue });
  graph.selectPipelineCadHit = (hit, event, source) => selectHit(graph, hit, event, source);
  graph.selectAllPipelineCad = () => setSelection(graph, graph.getPipelineCadEditableNodes().map((node) => ({
    graph: graphName, entityId: node.id, entityType: node.type || 'elevation-node',
  })), { source: 'select-all' });
  graph.beginPipelineCadSelectionBox = (screen) => {
    if (!graph.selectionEnabled) return null;
    graph.selectionBox = createPipelineCadSelectionBox({ graph: graphName, start: screen });
    graph.render?.();
    return graph.selectionBox;
  };
  graph.updatePipelineCadSelectionBox = (screen) => {
    if (!graph.selectionBox) return null;
    graph.selectionBox = updatePipelineCadSelectionBox(graph.selectionBox, screen);
    graph.render?.();
    return graph.selectionBox;
  };
  graph.commitPipelineCadSelectionBox = (event) => commitBox(graph, event);
  graph.cancelPipelineCadSelectionInteraction = (source = 'interaction-cancelled') => {
    graph.selectionBox = null;
    graph.clearBatchPreview?.();
    graph.render?.();
    return source;
  };
  graph.setPipelineCadSelectionEnabled = (enabled) => {
    graph.selectionEnabled = Boolean(enabled);
    if (!graph.selectionEnabled) graph.clearPipelineCadSelection('selection-disabled');
    graph.cancelPipelineCadSelectionInteraction('selection-mode-change');
    return graph.selectionEnabled;
  };
  graph.pipelineCadSelectionContains = (id) => graph.selection.selectedIds.includes(id);
  return graph.selection;
}
