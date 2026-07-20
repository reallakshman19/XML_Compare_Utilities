export const PIPELINE_CAD_SELECTION_SCHEMA = 'PipelineCadSelection.v1';
export const PIPELINE_CAD_SELECTION_BOX_SCHEMA = 'PipelineCadSelectionBox.v1';

function text(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function point(value, label) {
  const x = Number(value?.x); const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError(`${label} must contain finite x and y.`);
  return Object.freeze({ x, y });
}

function item(value, graph) {
  const entityGraph = text(value?.graph ?? graph, 'Selection item graph');
  if (entityGraph !== graph) throw new Error('Pipeline CAD selection cannot span graphs.');
  return Object.freeze({
    graph,
    entityId: text(value?.entityId, 'Selection entityId'),
    entityType: text(value?.entityType, 'Selection entityType'),
  });
}

function uniqueItems(values, graph) {
  const seen = new Set();
  return Object.freeze((values || []).map((value) => item(value, graph)).filter((value) => {
    if (seen.has(value.entityId)) return false;
    seen.add(value.entityId);
    return true;
  }));
}

export function createPipelineCadSelection(input = {}) {
  const graph = text(input.graph, 'Selection graph');
  const items = uniqueItems(input.items, graph);
  const ids = new Set(items.map((value) => value.entityId));
  const requested = String(input.primaryId ?? '').trim();
  const primaryId = requested && ids.has(requested) ? requested : (items[0]?.entityId ?? null);
  return Object.freeze({
    schema: PIPELINE_CAD_SELECTION_SCHEMA,
    graph,
    items,
    selectedIds: Object.freeze(items.map((value) => value.entityId)),
    primaryId,
    count: items.length,
  });
}

export function emptyPipelineCadSelection(graph) {
  return createPipelineCadSelection({ graph, items: [] });
}

export function replacePipelineCadSelection(selection, value) {
  return createPipelineCadSelection({ graph: selection.graph, items: [value], primaryId: value.entityId });
}

export function togglePipelineCadSelection(selection, value) {
  const exists = selection.items.some((itemValue) => itemValue.entityId === value.entityId);
  const items = exists
    ? selection.items.filter((itemValue) => itemValue.entityId !== value.entityId)
    : [...selection.items, value];
  const primaryId = exists && selection.primaryId === value.entityId
    ? items[0]?.entityId : value.entityId;
  return createPipelineCadSelection({ graph: selection.graph, items, primaryId });
}

export function createPipelineCadSelectionBox(input = {}) {
  const graph = text(input.graph, 'Selection box graph');
  const start = point(input.start, 'Selection box start');
  const current = point(input.current ?? start, 'Selection box current');
  return Object.freeze({
    schema: PIPELINE_CAD_SELECTION_BOX_SCHEMA,
    graph,
    start,
    current,
    mode: current.x >= start.x ? 'window' : 'crossing',
    active: input.active !== false,
  });
}

export function updatePipelineCadSelectionBox(box, current) {
  return createPipelineCadSelectionBox({ ...box, current, active: box.active });
}

export function pipelineCadSelectionBoxBounds(box) {
  return Object.freeze({
    left: Math.min(box.start.x, box.current.x),
    right: Math.max(box.start.x, box.current.x),
    top: Math.min(box.start.y, box.current.y),
    bottom: Math.max(box.start.y, box.current.y),
  });
}

export function pipelineCadSelectionModifier(event = {}) {
  return Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
}
