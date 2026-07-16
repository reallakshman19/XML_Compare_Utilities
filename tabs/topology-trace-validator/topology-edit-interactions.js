/** Pointer, box-selection, drag-preview, and keyboard controls for Edit SVG. */

import { editClientToSvgPoint } from './topology-edit-svg-renderer.js';
import { asArray, cleanText, objectRecord } from './topology-validator-values.js';

export function wireTopologyEditInteractions(input) {
  const { svg, svgHost, svgContext, canonical } = input;
  let suppressClick = false, frame = 0, dragState = null, boxState = null;

  function onClick(event) {
    if (suppressClick) { suppressClick = false; return; }
    const target = event.target instanceof Element ? event.target.closest('[data-edit-kind][data-edit-id]') : null;
    if (!target) {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) input.setSelection([], true);
      return;
    }
    input.selectFromPointer({ kind: target.getAttribute('data-edit-kind'), id: target.getAttribute('data-edit-id') }, event);
  }

  function onPointerDown(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-edit-kind="node"]') : null;
    if (target && input.getTool() === 'MOVE' && event.button === 0) {
      const nodeId = target.getAttribute('data-edit-id');
      const node = asArray(canonical.nodes).map(objectRecord).find((row) => cleanText(row.id) === nodeId);
      if (!node) return;
      dragState = { pointerId: event.pointerId, nodeId, original: { ...node.position }, moved: false, world: { ...node.position } };
      svg.setPointerCapture(event.pointerId); event.preventDefault(); event.stopImmediatePropagation();
      return;
    }
    if (!target && event.shiftKey && event.button === 0) {
      const start = editClientToSvgPoint(svg, event);
      boxState = { pointerId: event.pointerId, start, current: start };
      svg.setPointerCapture(event.pointerId); event.preventDefault(); event.stopImmediatePropagation();
    }
  }

  function updateDragDom(nodeId, pointValue) {
    const group = svg.querySelector(`[data-edit-kind="node"][data-edit-id="${CSS.escape(nodeId)}"]`);
    group?.querySelectorAll('circle').forEach((circle) => { circle.setAttribute('cx', pointValue.x); circle.setAttribute('cy', pointValue.y); });
    svg.querySelectorAll(`[data-from-node="${CSS.escape(nodeId)}"], [data-to-node="${CSS.escape(nodeId)}"]`).forEach((edgeGroup) => {
      const fromId = edgeGroup.getAttribute('data-from-node'), toId = edgeGroup.getAttribute('data-to-node');
      const from = fromId === nodeId ? pointValue : svgContext.nodePoints.get(fromId);
      const to = toId === nodeId ? pointValue : svgContext.nodePoints.get(toId);
      const path = `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} L ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
      edgeGroup.querySelectorAll('path').forEach((row) => row.setAttribute('d', path));
    });
  }

  function onPointerMove(event) {
    if (dragState?.pointerId === event.pointerId) {
      const svgPoint = editClientToSvgPoint(svg, event);
      dragState.world = svgContext.toWorld(svgPoint, dragState.original);
      dragState.moved = true; suppressClick = true;
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => updateDragDom(dragState.nodeId, svgPoint));
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if (boxState?.pointerId === event.pointerId) {
      boxState.current = editClientToSvgPoint(svg, event); suppressClick = true;
      const box = svgHost.querySelector('[data-ttv-edit-selection-box]');
      const x = Math.min(boxState.start.x, boxState.current.x), y = Math.min(boxState.start.y, boxState.current.y);
      box.hidden = false; box.setAttribute('x', x); box.setAttribute('y', y);
      box.setAttribute('width', Math.abs(boxState.current.x - boxState.start.x));
      box.setAttribute('height', Math.abs(boxState.current.y - boxState.start.y));
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }

  async function endPointer(event) {
    if (dragState?.pointerId === event.pointerId) {
      const completed = dragState; dragState = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (completed.moved) {
        try { await input.executeCommand('MOVE_NODE', { nodeId: completed.nodeId, position: completed.world }); }
        catch { input.renderCanvas(); }
      }
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if (boxState?.pointerId === event.pointerId) {
      const completed = boxState; boxState = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      const minX = Math.min(completed.start.x, completed.current.x), maxX = Math.max(completed.start.x, completed.current.x);
      const minY = Math.min(completed.start.y, completed.current.y), maxY = Math.max(completed.start.y, completed.current.y);
      const rows = [...svg.querySelectorAll('[data-edit-kind][data-edit-id]')].flatMap((element) => {
        const box = element.getBBox(), x = box.x + (box.width / 2), y = box.y + (box.height / 2);
        const kind = element.getAttribute('data-edit-kind');
        return input.isSelectable(kind) && x >= minX && x <= maxX && y >= minY && y <= maxY
          ? [{ kind, id: element.getAttribute('data-edit-id') }] : [];
      });
      input.setSelection(rows, true); event.preventDefault(); event.stopImmediatePropagation();
    }
  }

  async function onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); if (event.shiftKey) await input.redo(); else await input.undo(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); await input.redo(); return; }
    if (event.key === 'Escape') { input.setSelection([], true); return; }
    if (event.key === 'Delete') { event.preventDefault(); await input.runOperation('DELETE'); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const selection = input.getSelection();
    const nodeRow = selection.length === 1 && selection[0].kind === 'node' ? selection[0] : null;
    if (!nodeRow) return;
    const node = asArray(canonical.nodes).map(objectRecord).find((row) => cleanText(row.id) === nodeRow.id);
    if (!node) return;
    const step = event.shiftKey ? 10 : 1, next = { ...node.position };
    const horizontal = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const vertical = event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0;
    const projection = input.getProjection();
    if (projection === 'XY') { next.x += horizontal; next.y += vertical; }
    else if (projection === 'XZ') { next.x += horizontal; next.z += vertical; }
    else { next.y += horizontal; next.z += vertical; }
    event.preventDefault(); await input.executeCommand('MOVE_NODE', { nodeId: node.id, position: next });
  }

  svg.addEventListener('click', onClick);
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('keydown', onKeyDown);
  return () => {
    cancelAnimationFrame(frame);
    svg.removeEventListener('click', onClick); svg.removeEventListener('pointerdown', onPointerDown);
    svg.removeEventListener('pointermove', onPointerMove); svg.removeEventListener('pointerup', endPointer);
    svg.removeEventListener('pointercancel', endPointer); svg.removeEventListener('keydown', onKeyDown);
  };
}
