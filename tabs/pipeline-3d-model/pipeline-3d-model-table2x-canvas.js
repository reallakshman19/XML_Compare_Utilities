import { GraphTool, InteractiveGraph } from './pipeline-3d-model-interactive-graph.js';
import { projectPointToSegment } from './pipeline-3d-model-cad-math.js';
import { drawPipelineCadSelectedNode, drawPipelineCadSelectionBox } from './pipeline-3d-model-cad-batch-view.js';
import { installPipelineCadSelectionRuntime } from './pipeline-3d-model-cad-selection-runtime.js';

function usableRows(model) {
  return (model?.table2Rows || [])
    .filter((row) => Number.isFinite(row.stationValue) && Number.isFinite(row.elevationValue))
    .map((row) => ({ id: row.id, type: 'elevation-node', x: row.stationValue, y: row.elevationValue, stationText: row.stationText }));
}

function changeRows(graph, ids, deltaY) {
  const byId = new Map(usableRows(graph.model).map((row) => [row.id, row]));
  return ids.map((id) => ({ id, elevationValue: byId.get(id).y + deltaY }));
}

export class Table2XCanvas extends InteractiveGraph {
  constructor(canvas, options = {}) {
    super(canvas, options);
    this.model = null;
    this.renderSnapshot = [];
    this.visualOverrides = new Map();
    this.precisionOverrides = new Map();
    this.precisionGripId = null;
    this.selectedId = null;
    this.dragging = null;
    this.hitRadius = Number(options.hitRadius) || 10;
    installPipelineCadSelectionRuntime(this, 'table2x');
    const cancel = (event) => {
      if (!String(event.detail?.reason || '').startsWith('precision-')) this.cancelActiveInteraction('escape');
    };
    this.addEventListener('interactionCancelled', cancel);
    this.destroyCallbacks.push(() => this.removeEventListener('interactionCancelled', cancel));
  }

  getPipelineCadEditableNodes() { return this.currentNodes(); }

  setModel(model, options = {}) {
    this.model = model;
    const preserve = options.preserveSnapshot === true;
    if (!preserve) {
      this.renderSnapshot = usableRows(model);
      this.visualOverrides.clear();
      this.precisionOverrides.clear();
      this.precisionGripId = null;
      this.dragging = null;
      this.clearPipelineCadSelection('model-reset', false);
    } else if (!this.renderSnapshot.length) this.renderSnapshot = usableRows(model);
    const rows = usableRows(model);
    const valid = new Set(rows.map((row) => row.id));
    if (preserve && this.selection.items.some((item) => !valid.has(item.entityId))) {
      this.setPipelineCadSelection(this.selection.items.filter((item) => valid.has(item.entityId)), { source: 'model-reconcile' });
    }
    const xs = rows.map((row) => row.x); const ys = rows.map((row) => row.y);
    if (rows.length) {
      const minY = Math.min(...ys); const maxY = Math.max(...ys);
      const padY = Math.max((maxY - minY) * 0.2, 0.5);
      this.setWorldBounds({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: minY - padY, maxY: maxY + padY }, { fit: !preserve });
    } else this.render();
  }

  reloadGraph() {
    this.renderSnapshot = usableRows(this.model);
    this.visualOverrides.clear();
    this.precisionOverrides.clear();
    this.cancelActiveInteraction('reload');
    this.model?.clearDirtyRows?.();
    this.dispatchGraphEvent('reloadRequested', { graph: 'table2x' });
    this.render();
  }

  currentNodes() {
    return usableRows(this.model).map((row) => {
      const precision = this.precisionOverrides.get(row.id);
      return { ...row, x: precision?.x ?? row.x, y: this.visualOverrides.get(row.id) ?? precision?.y ?? row.y };
    });
  }

  setPrecisionPreview(id, point = {}) {
    if (!id) return false;
    this.precisionOverrides.set(id, { x: Number(point.x), y: Number(point.y) });
    this.render();
    return true;
  }
  clearPrecisionPreview() { this.precisionOverrides.clear(); this.render(); return true; }
  setPrecisionGrip(id) { this.precisionGripId = id || null; this.render(); }
  clearBatchPreview() { this.visualOverrides.clear(); this.dragging = null; this.selectionBox = null; this.render(); return true; }

  cancelActiveInteraction(source) {
    this.clearBatchPreview();
    this.cancelPipelineCadSelectionInteraction(source);
  }

  hitTest(screenPoint) {
    let best = null; let distance = this.hitRadius;
    for (const node of this.currentNodes()) {
      const screen = this.worldToScreen(node);
      const next = Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y);
      if (next < distance) { distance = next; best = { type: 'elevation-node', node, screen }; }
    }
    return best;
  }

  nearestProfileProjection(worldPoint) {
    if (this.renderSnapshot.length < 2) return null;
    let best = null;
    for (let index = 0; index < this.renderSnapshot.length - 1; index += 1) {
      const start = this.renderSnapshot[index]; const end = this.renderSnapshot[index + 1];
      const projection = projectPointToSegment(worldPoint, start, end);
      if (!best || projection.distance < best.distance) best = { ...projection, start, end, index };
    }
    return best;
  }

  beginDrag(hit, world) {
    const selected = this.pipelineCadSelectionContains(hit.node.id) ? this.selection.selectedIds : [hit.node.id];
    const origins = new Map(usableRows(this.model).filter((row) => selected.includes(row.id)).map((row) => [row.id, row.y]));
    this.dragging = { ids: selected, hit, anchorY: world.y, origins, moved: false, preserveMulti: selected.length > 1 };
  }

  onPrimaryPointerDown(event, screen, world) {
    const hit = this.hitTest(screen);
    if (this.tool === GraphTool.DELETE && hit) {
      this.dispatchGraphEvent('nodeDeleted', { graph: 'table2x', entityId: hit.node.id, entityType: hit.type }); return;
    }
    if (this.tool === GraphTool.ADD_NODE) {
      const projection = this.nearestProfileProjection(world);
      if (projection) this.dispatchGraphEvent('nodeAdded', {
        graph: 'table2x', entityType: 'elevation-node', stationValue: projection.x, elevationValue: projection.y,
        insertAfterId: projection.start.id, insertBeforeId: projection.end.id,
      });
      return;
    }
    if (this.tool !== GraphTool.SELECT || !this.selectionEnabled) return;
    if (!hit) { this.beginPipelineCadSelectionBox(screen); return; }
    if (event.shiftKey || event.ctrlKey || event.metaKey) { this.selectPipelineCadHit(hit, event); return; }
    if (!this.pipelineCadSelectionContains(hit.node.id) || this.selection.count === 1) this.selectPipelineCadHit(hit, event);
    this.clearPrecisionPreview();
    this.beginDrag(hit, world);
  }

  onPrimaryPointerMove(event, screen, world) {
    if (this.selectionBox) { this.updatePipelineCadSelectionBox(screen); return; }
    if (!this.dragging) return;
    const deltaY = world.y - this.dragging.anchorY;
    this.dragging.moved ||= Math.abs(deltaY) > 1e-9;
    this.dragging.origins.forEach((value, id) => this.visualOverrides.set(id, value + deltaY));
    if (this.dragging.ids.length === 1) this.dispatchGraphEvent('nodePreviewMoved', {
      graph: 'table2x', entityId: this.dragging.ids[0], entityType: 'elevation-node', elevationValue: this.visualOverrides.get(this.dragging.ids[0]),
    });
    else this.dispatchGraphEvent('batchPreviewMoved', { graph: 'table2x', entityType: 'elevation-node', selectedIds: this.dragging.ids });
    this.render();
  }

  onPrimaryPointerUp(event, screen, world) {
    if (this.selectionBox) { this.commitPipelineCadSelectionBox(event); return; }
    if (!this.dragging) return;
    const drag = this.dragging; this.dragging = null;
    const deltaY = world.y - drag.anchorY;
    if (!drag.moved) {
      this.visualOverrides.clear();
      if (drag.preserveMulti) this.selectPipelineCadHit(drag.hit, {});
      this.render(); return;
    }
    if (drag.ids.length === 1) this.dispatchGraphEvent('nodeMoved', {
      graph: 'table2x', entityId: drag.ids[0], entityType: 'elevation-node',
      after: { elevationValue: drag.origins.get(drag.ids[0]) + deltaY }, commitReason: 'pointer-release',
    });
    else this.dispatchGraphEvent('batchMoveRequested', {
      graph: 'table2x', entityType: 'elevation-node', selectedIds: drag.ids,
      primaryId: this.selection.primaryId, changes: changeRows(this, drag.ids, deltaY), skippedIds: [], commitReason: 'pointer-release',
    });
  }

  drawPrecisionGrip(ctx, point, node) {
    if (node.id !== this.precisionGripId || this.selection.count !== 1 || node.id !== this.selection.primaryId) return;
    ctx.save(); ctx.strokeStyle = '#f8fafc'; ctx.fillStyle = '#0ea5e9'; ctx.lineWidth = 2;
    ctx.fillRect(point.x - 5, point.y - 5, 10, 10); ctx.strokeRect(point.x - 7, point.y - 7, 14, 14); ctx.restore();
  }

  render() {
    const ctx = this.context; if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height); ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, this.width, this.height); this.drawGrid(ctx);
    if (this.renderSnapshot.length > 1) {
      ctx.save(); ctx.beginPath(); const first = this.worldToScreen(this.renderSnapshot[0]); ctx.moveTo(first.x, first.y);
      for (let index = 1; index < this.renderSnapshot.length; index += 1) { const point = this.worldToScreen(this.renderSnapshot[index]); ctx.lineTo(point.x, point.y); }
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    }
    for (const node of this.currentNodes()) {
      const point = this.worldToScreen(node); const selected = this.pipelineCadSelectionContains(node.id);
      ctx.beginPath(); ctx.arc(point.x, point.y, selected ? 8 : 6, 0, Math.PI * 2); ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
      drawPipelineCadSelectedNode(ctx, point, selected, node.id === this.selection.primaryId); this.drawPrecisionGrip(ctx, point, node);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.fillText(Number(node.y).toFixed(2), point.x, point.y - 12);
    }
    drawPipelineCadSelectionBox(ctx, this.selectionBox);
  }
}
