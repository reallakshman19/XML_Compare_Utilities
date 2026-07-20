import { GraphTool, InteractiveGraph } from './pipeline-3d-model-interactive-graph.js';
import { formatDepth, interpolateCumulativeFromAbsoluteH, interpolateAbsoluteHFromCumulative } from './pipeline-3d-model-cad-math.js';
import { drawPipelineCadSelectedNode, drawPipelineCadSelectionBox } from './pipeline-3d-model-cad-batch-view.js';
import { installPipelineCadSelectionRuntime } from './pipeline-3d-model-cad-selection-runtime.js';

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export class Table3XCanvas extends InteractiveGraph {
  constructor(canvas, options = {}) {
    super(canvas, options);
    this.model = null;
    this.depthSnapshot = [];
    this.depthOverrides = new Map();
    this.markerOverrides = new Map();
    this.precisionOverrides = new Map();
    this.precisionGripId = null;
    this.selected = null;
    this.dragging = null;
    this.hitRadius = Number(options.hitRadius) || 10;
    this.markerRailY = Number(options.markerRailY) || 0.75;
    installPipelineCadSelectionRuntime(this, 'table3x');
    const cancel = (event) => {
      if (!String(event.detail?.reason || '').startsWith('precision-')) this.cancelActiveInteraction('escape');
    };
    this.addEventListener('interactionCancelled', cancel);
    this.destroyCallbacks.push(() => this.removeEventListener('interactionCancelled', cancel));
  }

  getPipelineCadEditableNodes() { return [...this.markerNodes(), ...this.depthNodes()]; }

  setModel(model, options = {}) {
    this.model = model;
    const preserve = options.preserveSnapshot === true;
    if (!preserve) {
      this.depthSnapshot = this.depthNodes(false);
      this.depthOverrides.clear(); this.markerOverrides.clear(); this.precisionOverrides.clear();
      this.precisionGripId = null; this.dragging = null;
      this.clearPipelineCadSelection('model-reset', false);
    } else if (!this.depthSnapshot.length) this.depthSnapshot = this.depthNodes(false);
    const nodes = this.getPipelineCadEditableNodes(); const valid = new Set(nodes.map((node) => node.id));
    if (preserve && this.selection.items.some((item) => !valid.has(item.entityId))) {
      this.setPipelineCadSelection(this.selection.items.filter((item) => valid.has(item.entityId)), { source: 'model-reconcile' });
    }
    const map = model?.coordinateMap; const ys = this.depthNodes(false).map((node) => node.y);
    const minY = Math.min(-2, ...ys); const maxY = Math.max(this.markerRailY + 0.5, ...ys);
    if (map) this.setWorldBounds({ minX: map.cumulativeMin, maxX: map.cumulativeMax, minY, maxY }, { fit: !preserve });
    else this.render();
  }

  depthNodes(includeOverrides = true) {
    if (!this.model?.coordinateMap) return [];
    return (this.model.table3DepthRows || []).filter((row) => Number.isFinite(row.absoluteH) && Number.isFinite(row.z)).map((row) => {
      const baseX = interpolateCumulativeFromAbsoluteH(row.absoluteH, this.model.coordinateMap);
      const precision = this.precisionOverrides.get(row.id);
      return {
        id: row.id, type: 'depth-node', absoluteH: row.absoluteH,
        x: precision?.x ?? baseX,
        y: includeOverrides ? (this.depthOverrides.get(row.id) ?? precision?.y ?? row.z) : row.z,
        text: row.zText,
      };
    });
  }

  markerNodes(includeOverrides = true) {
    if (!this.model?.coordinateMap) return [];
    return (this.model.table3MarkerRows || []).filter((row) => Number.isFinite(row.absoluteH)).map((row) => {
      const baseX = interpolateCumulativeFromAbsoluteH(row.absoluteH, this.model.coordinateMap);
      const precision = this.precisionOverrides.get(row.id);
      return {
        id: row.id, type: 'marker', absoluteH: row.absoluteH,
        x: includeOverrides ? (this.markerOverrides.get(row.id) ?? precision?.x ?? baseX) : baseX,
        y: this.markerRailY, text: precision?.label ?? row.markerText,
      };
    });
  }

  reloadGraph() {
    this.depthSnapshot = this.depthNodes(false);
    this.depthOverrides.clear(); this.markerOverrides.clear(); this.precisionOverrides.clear();
    this.cancelActiveInteraction('reload'); this.model?.clearDirtyRows?.();
    this.dispatchGraphEvent('reloadRequested', { graph: 'table3x' }); this.render();
  }

  setPrecisionPreview(id, point = {}) {
    if (!id) return false;
    this.precisionOverrides.set(id, { x: Number(point.x), y: Number(point.y), label: point.label });
    this.render(); return true;
  }
  clearPrecisionPreview() { this.precisionOverrides.clear(); this.render(); return true; }
  setPrecisionGrip(id) { this.precisionGripId = id || null; this.render(); }
  clearBatchPreview() { this.depthOverrides.clear(); this.markerOverrides.clear(); this.dragging = null; this.selectionBox = null; this.render(); return true; }
  cancelActiveInteraction(source) { this.clearBatchPreview(); this.cancelPipelineCadSelectionInteraction(source); }

  hitTest(screenPoint) {
    let best = null; let distance = this.hitRadius;
    for (const node of this.getPipelineCadEditableNodes()) {
      const screen = this.worldToScreen(node); const next = Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y);
      if (next < distance) { best = { type: node.type, node, screen }; distance = next; }
    }
    return best;
  }

  addEntity(world) {
    const cumulative = clamp(world.x, this.bounds.minX, this.bounds.maxX);
    if (this.tool === GraphTool.ADD_MARKER) this.dispatchGraphEvent('nodeAdded', {
      graph: 'table3x', entityType: 'marker', cumulative,
      absoluteH: interpolateAbsoluteHFromCumulative(cumulative, this.model.coordinateMap),
    });
    else this.dispatchGraphEvent('nodeAdded', {
      graph: 'table3x', entityType: 'depth-node', cumulative,
      absoluteH: interpolateAbsoluteHFromCumulative(cumulative, this.model.coordinateMap), z: world.y, zText: formatDepth(world.y),
    });
  }

  beginDrag(hit, world) {
    const selectedItems = this.pipelineCadSelectionContains(hit.node.id) ? this.selection.items : [];
    if (selectedItems.length > 1 && hit.type !== 'marker') {
      this.dragging = { hit, ids: [hit.node.id], anchor: world, moved: false, replaceOnly: true, skippedIds: this.selection.selectedIds };
      return;
    }
    const subset = selectedItems.length > 1 ? selectedItems.filter((item) => item.entityType === hit.type) : [{ entityId: hit.node.id, entityType: hit.type }];
    const allNodes = new Map(this.getPipelineCadEditableNodes().map((node) => [node.id, node]));
    const origins = new Map(subset.map((item) => [item.entityId, allNodes.get(item.entityId)]));
    this.dragging = {
      hit, ids: subset.map((item) => item.entityId), entityType: hit.type, anchor: world,
      origins, moved: false, preserveMulti: selectedItems.length > 1,
      skippedIds: selectedItems.filter((item) => item.entityType !== hit.type).map((item) => item.entityId).sort(),
    };
  }

  onPrimaryPointerDown(event, screen, world) {
    const hit = this.hitTest(screen);
    if (this.tool === GraphTool.DELETE && hit) {
      this.dispatchGraphEvent('nodeDeleted', { graph: 'table3x', entityId: hit.node.id, entityType: hit.type }); return;
    }
    if ([GraphTool.ADD_MARKER, GraphTool.ADD_NODE].includes(this.tool)) { this.addEntity(world); return; }
    if (this.tool !== GraphTool.SELECT || !this.selectionEnabled) return;
    if (!hit) { this.beginPipelineCadSelectionBox(screen); return; }
    if (event.shiftKey || event.ctrlKey || event.metaKey) { this.selectPipelineCadHit(hit, event); return; }
    if (!this.pipelineCadSelectionContains(hit.node.id) || this.selection.count === 1) this.selectPipelineCadHit(hit, event);
    this.clearPrecisionPreview(); this.beginDrag(hit, world);
  }

  onPrimaryPointerMove(event, screen, world) {
    if (this.selectionBox) { this.updatePipelineCadSelectionBox(screen); return; }
    if (!this.dragging) return;
    const dx = world.x - this.dragging.anchor.x; const dy = world.y - this.dragging.anchor.y;
    if (this.dragging.replaceOnly) {
      this.dragging.moved ||= Math.abs(dx) > 1e-9 || Math.abs(dy) > 1e-9;
      return;
    }
    this.dragging.moved ||= Math.abs(dx) > 1e-9 || Math.abs(dy) > 1e-9;
    if (this.dragging.entityType === 'marker') this.dragging.origins.forEach((node, id) => {
      this.markerOverrides.set(id, clamp(node.x + dx, this.bounds.minX, this.bounds.maxX));
    });
    else if (this.dragging.ids.length === 1) this.depthOverrides.set(this.dragging.ids[0], this.dragging.origins.get(this.dragging.ids[0]).y + dy);
    if (this.dragging.ids.length === 1) this.dispatchGraphEvent('nodePreviewMoved', {
      graph: 'table3x', entityId: this.dragging.ids[0], entityType: this.dragging.entityType,
      ...(this.dragging.entityType === 'marker' ? { cumulative: this.markerOverrides.get(this.dragging.ids[0]) } : { z: this.depthOverrides.get(this.dragging.ids[0]) }),
    });
    else this.dispatchGraphEvent('batchPreviewMoved', { graph: 'table3x', entityType: 'marker', selectedIds: this.dragging.ids, skippedIds: this.dragging.skippedIds });
    this.render();
  }

  markerChanges(drag) {
    return drag.ids.map((id) => {
      const cumulative = this.markerOverrides.get(id) ?? drag.origins.get(id).x;
      return { id, cumulative, absoluteH: interpolateAbsoluteHFromCumulative(cumulative, this.model.coordinateMap) };
    });
  }

  onPrimaryPointerUp(event, screen, world) {
    if (this.selectionBox) { this.commitPipelineCadSelectionBox(event); return; }
    if (!this.dragging) return;
    const drag = this.dragging; this.dragging = null;
    if (drag.replaceOnly && drag.moved) {
      this.dispatchGraphEvent('batchMoveRequested', {
        graph: 'table3x', entityType: 'depth-node', selectedIds: this.selection.selectedIds,
        changes: [{ id: drag.hit.node.id, z: drag.hit.node.y + world.y - drag.anchor.y }],
        skippedIds: drag.skippedIds, operationClass: 'label or depth evidence change', commitReason: 'pointer-release',
      });
      return;
    }
    if (drag.replaceOnly || !drag.moved) {
      this.clearBatchPreview();
      if (drag.replaceOnly || drag.preserveMulti) this.selectPipelineCadHit(drag.hit, {});
      return;
    }
    if (drag.preserveMulti || drag.skippedIds.length || drag.ids.length > 1) this.dispatchGraphEvent('batchMoveRequested', {
      graph: 'table3x', entityType: 'marker', selectedIds: this.selection.selectedIds,
      primaryId: this.selection.primaryId, changes: this.markerChanges(drag), skippedIds: drag.skippedIds,
      operationClass: 'marker/evidence positioning', commitReason: 'pointer-release',
    });
    else if (drag.entityType === 'marker') {
      const [change] = this.markerChanges(drag);
      this.dispatchGraphEvent('nodeMoved', { graph: 'table3x', entityId: change.id, entityType: 'marker', after: change, commitReason: 'pointer-release' });
    } else this.dispatchGraphEvent('nodeMoved', {
      graph: 'table3x', entityId: drag.ids[0], entityType: 'depth-node',
      after: { z: this.depthOverrides.get(drag.ids[0]), zText: formatDepth(this.depthOverrides.get(drag.ids[0])) }, commitReason: 'pointer-release',
    });
  }

  drawPrecisionGrip(ctx, point, node) {
    if (node.id !== this.precisionGripId || this.selection.count !== 1 || node.id !== this.selection.primaryId) return;
    ctx.save(); ctx.fillStyle = '#0ea5e9'; ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2;
    ctx.fillRect(point.x - 5, point.y - 5, 10, 10); ctx.strokeRect(point.x - 7, point.y - 7, 14, 14); ctx.restore();
  }

  drawNode(ctx, node, fill, label, labelY) {
    const point = this.worldToScreen(node); const selected = this.pipelineCadSelectionContains(node.id);
    ctx.beginPath(); ctx.arc(point.x, point.y, selected ? 8 : 6, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
    drawPipelineCadSelectedNode(ctx, point, selected, node.id === this.selection.primaryId); this.drawPrecisionGrip(ctx, point, node);
    ctx.fillStyle = labelY > 0 ? '#fbcfe8' : '#6ee7b7'; ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.fillText(label, point.x, point.y + labelY);
  }

  render() {
    const ctx = this.context; if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height); ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, this.width, this.height); this.drawGrid(ctx);
    const zeroA = this.worldToScreen({ x: this.bounds.minX, y: 0 }); const zeroB = this.worldToScreen({ x: this.bounds.maxX, y: 0 });
    ctx.beginPath(); ctx.moveTo(zeroA.x, zeroA.y); ctx.lineTo(zeroB.x, zeroB.y); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.stroke();
    if (this.depthSnapshot.length > 1) {
      ctx.beginPath(); const first = this.worldToScreen(this.depthSnapshot[0]); ctx.moveTo(first.x, first.y);
      for (let index = 1; index < this.depthSnapshot.length; index += 1) { const point = this.worldToScreen(this.depthSnapshot[index]); ctx.lineTo(point.x, point.y); }
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    }
    this.depthNodes().forEach((node) => this.drawNode(ctx, node, '#f472b6', formatDepth(node.y), 18));
    for (const marker of this.markerNodes()) {
      const top = this.worldToScreen(marker); const bottom = this.worldToScreen({ x: marker.x, y: this.bounds.minY });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bottom.x, bottom.y); ctx.strokeStyle = '#94a3b8'; ctx.stroke(); ctx.restore();
      this.drawNode(ctx, marker, '#34d399', marker.text, -16);
    }
    drawPipelineCadSelectionBox(ctx, this.selectionBox);
  }
}
