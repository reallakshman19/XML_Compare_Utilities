import { GraphTool, InteractiveGraph } from './pipeline-3d-model-interactive-graph.js';
import {
  formatDepth,
  interpolateCumulativeFromAbsoluteH,
  interpolateAbsoluteHFromCumulative,
} from './pipeline-3d-model-cad-math.js';

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
  }

  setModel(model, options = {}) {
    this.model = model;
    const preserveSnapshot = options.preserveSnapshot === true;
    if (!preserveSnapshot) {
      this.depthSnapshot = this.depthNodes(false);
      this.depthOverrides.clear();
      this.markerOverrides.clear();
      this.precisionOverrides.clear();
      this.precisionGripId = null;
      this.selected = null;
      this.dragging = null;
    } else if (!this.depthSnapshot.length) this.depthSnapshot = this.depthNodes(false);
    const map = model?.coordinateMap;
    const ys = this.depthNodes(false).map((node) => node.y);
    const minY = Math.min(-2, ...ys);
    const maxY = Math.max(this.markerRailY + 0.5, ...ys);
    if (map) this.setWorldBounds(
      { minX: map.cumulativeMin, maxX: map.cumulativeMax, minY, maxY },
      { fit: !preserveSnapshot },
    );
    else this.render();
  }

  depthNodes(includeOverrides = true) {
    if (!this.model?.coordinateMap) return [];
    return (this.model.table3DepthRows || [])
      .filter((row) => Number.isFinite(row.absoluteH) && Number.isFinite(row.z))
      .map((row) => {
        const precision = this.precisionOverrides.get(row.id);
        return {
          id: row.id,
          type: 'depth-node',
          absoluteH: row.absoluteH,
          x: includeOverrides ? (precision?.x ?? interpolateCumulativeFromAbsoluteH(row.absoluteH, this.model.coordinateMap)) : interpolateCumulativeFromAbsoluteH(row.absoluteH, this.model.coordinateMap),
          y: includeOverrides ? (this.depthOverrides.get(row.id) ?? precision?.y ?? row.z) : row.z,
          text: row.zText,
        };
      });
  }

  markerNodes(includeOverrides = true) {
    if (!this.model?.coordinateMap) return [];
    return (this.model.table3MarkerRows || [])
      .filter((row) => Number.isFinite(row.absoluteH))
      .map((row) => {
        const cumulative = interpolateCumulativeFromAbsoluteH(row.absoluteH, this.model.coordinateMap);
        const precision = this.precisionOverrides.get(row.id);
        return {
          id: row.id,
          type: 'marker',
          absoluteH: row.absoluteH,
          x: includeOverrides ? (this.markerOverrides.get(row.id) ?? precision?.x ?? cumulative) : cumulative,
          y: this.markerRailY,
          text: precision?.label ?? row.markerText,
        };
      });
  }

  reloadGraph() {
    this.depthSnapshot = this.depthNodes(false);
    this.depthOverrides.clear();
    this.markerOverrides.clear();
    this.precisionOverrides.clear();
    this.model?.clearDirtyRows?.();
    this.dispatchGraphEvent('reloadRequested', { graph: 'table3x' });
    this.render();
  }

  setPrecisionPreview(id, point = {}) {
    if (!id) return false;
    this.precisionOverrides.set(id, { x: Number(point.x), y: Number(point.y), label: point.label });
    this.render();
    return true;
  }

  clearPrecisionPreview() { this.precisionOverrides.clear(); this.render(); return true; }
  setPrecisionGrip(id) { this.precisionGripId = id || null; this.render(); }

  hitTest(screenPoint) {
    let best = null;
    let distance = this.hitRadius;
    for (const node of [...this.markerNodes(), ...this.depthNodes()]) {
      const screen = this.worldToScreen(node);
      const next = Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y);
      if (next < distance) { best = { type: node.type, node, screen }; distance = next; }
    }
    return best;
  }

  onPrimaryPointerDown(event, screen, world) {
    const hit = this.hitTest(screen);
    if (this.tool === GraphTool.DELETE && hit) {
      this.dispatchGraphEvent('nodeDeleted', { graph: 'table3x', entityId: hit.node.id, entityType: hit.type });
      return;
    }
    if (this.tool === GraphTool.ADD_MARKER) {
      const cumulative = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, world.x));
      this.dispatchGraphEvent('nodeAdded', {
        graph: 'table3x', entityType: 'marker', cumulative,
        absoluteH: interpolateAbsoluteHFromCumulative(cumulative, this.model.coordinateMap),
      });
      return;
    }
    if (this.tool === GraphTool.ADD_NODE) {
      const cumulative = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, world.x));
      this.dispatchGraphEvent('nodeAdded', {
        graph: 'table3x', entityType: 'depth-node', cumulative,
        absoluteH: interpolateAbsoluteHFromCumulative(cumulative, this.model.coordinateMap),
        z: world.y, zText: formatDepth(world.y),
      });
      return;
    }
    if (this.tool === GraphTool.SELECT && hit) {
      this.clearPrecisionPreview();
      this.selected = { id: hit.node.id, type: hit.type };
      this.dragging = { id: hit.node.id, type: hit.type };
      this.dispatchGraphEvent('selectionChanged', { graph: 'table3x', entityId: hit.node.id, entityType: hit.type });
      this.render();
    }
  }

  onPrimaryPointerMove(event, screen, world) {
    if (!this.dragging) return;
    if (this.dragging.type === 'marker') {
      const cumulative = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, world.x));
      this.markerOverrides.set(this.dragging.id, cumulative);
      this.dispatchGraphEvent('nodePreviewMoved', { graph: 'table3x', entityId: this.dragging.id, entityType: 'marker', cumulative });
    } else {
      this.depthOverrides.set(this.dragging.id, world.y);
      this.dispatchGraphEvent('nodePreviewMoved', { graph: 'table3x', entityId: this.dragging.id, entityType: 'depth-node', z: world.y, zText: formatDepth(world.y) });
    }
    this.render();
  }

  onPrimaryPointerUp(event, screen, world) {
    if (!this.dragging) return;
    const dragging = this.dragging;
    this.dragging = null;
    if (dragging.type === 'marker') {
      const cumulative = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, world.x));
      this.markerOverrides.set(dragging.id, cumulative);
      this.dispatchGraphEvent('nodeMoved', {
        graph: 'table3x', entityId: dragging.id, entityType: 'marker',
        after: { cumulative, absoluteH: interpolateAbsoluteHFromCumulative(cumulative, this.model.coordinateMap) },
        commitReason: 'pointer-release',
      });
    } else {
      this.depthOverrides.set(dragging.id, world.y);
      this.dispatchGraphEvent('nodeMoved', {
        graph: 'table3x', entityId: dragging.id, entityType: 'depth-node',
        after: { z: world.y, zText: formatDepth(world.y) }, commitReason: 'pointer-release',
      });
    }
    this.render();
  }

  drawGrip(ctx, point, node) {
    if (node.id !== this.precisionGripId || node.id !== this.selected?.id) return;
    ctx.save();
    ctx.strokeStyle = '#f8fafc';
    ctx.fillStyle = node.type === 'marker' ? '#10b981' : '#ec4899';
    ctx.lineWidth = 2;
    ctx.fillRect(point.x - 5, point.y - 5, 10, 10);
    ctx.strokeRect(point.x - 7, point.y - 7, 14, 14);
    ctx.restore();
  }

  render() {
    const ctx = this.context;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, this.width, this.height); this.drawGrid(ctx);
    const zeroA = this.worldToScreen({ x: this.bounds.minX, y: 0 });
    const zeroB = this.worldToScreen({ x: this.bounds.maxX, y: 0 });
    ctx.beginPath(); ctx.moveTo(zeroA.x, zeroA.y); ctx.lineTo(zeroB.x, zeroB.y);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.stroke();
    if (this.depthSnapshot.length > 1) {
      ctx.beginPath();
      const first = this.worldToScreen(this.depthSnapshot[0]); ctx.moveTo(first.x, first.y);
      for (let index = 1; index < this.depthSnapshot.length; index += 1) {
        const point = this.worldToScreen(this.depthSnapshot[index]); ctx.lineTo(point.x, point.y);
      }
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    }
    for (const node of this.depthNodes()) {
      const point = this.worldToScreen(node);
      ctx.beginPath(); ctx.arc(point.x, point.y, this.selected?.id === node.id ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f472b6'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
      this.drawGrip(ctx, point, node);
      ctx.fillStyle = '#fbcfe8'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(formatDepth(node.y), point.x, point.y + 18);
    }
    for (const marker of this.markerNodes()) {
      const top = this.worldToScreen(marker);
      const bottom = this.worldToScreen({ x: marker.x, y: this.bounds.minY });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bottom.x, bottom.y);
      ctx.strokeStyle = '#94a3b8'; ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(top.x, top.y, this.selected?.id === marker.id ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
      this.drawGrip(ctx, top, marker);
      ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(marker.text, top.x, top.y - 16);
      ctx.fillStyle = '#fb923c'; ctx.font = '11px monospace'; ctx.fillText(`X: ${marker.x.toFixed(1)}`, top.x, top.y - 4);
    }
  }
}
