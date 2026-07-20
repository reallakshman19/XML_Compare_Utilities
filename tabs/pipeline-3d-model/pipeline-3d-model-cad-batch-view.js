import { pipelineCadSelectionBoxBounds } from './pipeline-3d-model-cad-selection-contracts.js';

function aperture(node, graph) {
  const center = graph.worldToScreen(node);
  const radius = Number(graph.hitRadius) || 10;
  return { id: node.id, entityType: node.type || 'elevation-node', center, radius };
}

function contained(item, bounds) {
  return item.center.x - item.radius >= bounds.left
    && item.center.x + item.radius <= bounds.right
    && item.center.y - item.radius >= bounds.top
    && item.center.y + item.radius <= bounds.bottom;
}

function intersects(item, bounds) {
  return item.center.x + item.radius >= bounds.left
    && item.center.x - item.radius <= bounds.right
    && item.center.y + item.radius >= bounds.top
    && item.center.y - item.radius <= bounds.bottom;
}

export function pipelineCadBoxCandidates(graph, nodes, box) {
  const bounds = pipelineCadSelectionBoxBounds(box);
  return Object.freeze(nodes.map((node) => aperture(node, graph))
    .filter((item) => box.mode === 'window' ? contained(item, bounds) : intersects(item, bounds))
    .map((item) => Object.freeze({ graph: box.graph, entityId: item.id, entityType: item.entityType })));
}

export function drawPipelineCadSelectionBox(context, box) {
  if (!context || !box?.active) return false;
  const bounds = pipelineCadSelectionBoxBounds(box);
  context.save();
  context.fillStyle = box.mode === 'window' ? '#38bdf822' : '#f59e0b22';
  context.strokeStyle = box.mode === 'window' ? '#38bdf8' : '#f59e0b';
  context.setLineDash(box.mode === 'window' ? [] : [6, 4]);
  context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  context.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  context.restore();
  return true;
}

export function drawPipelineCadSelectedNode(context, point, selected, primary) {
  if (!selected) return false;
  context.save();
  context.strokeStyle = primary ? '#ffffff' : '#a78bfa';
  context.lineWidth = primary ? 3 : 2;
  context.beginPath();
  context.arc(point.x, point.y, primary ? 10 : 9, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  return true;
}
