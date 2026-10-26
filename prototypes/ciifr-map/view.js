import {methodCSvgScene} from '../../tabs/cii-workspace/cii-workspace-method-c-svg.js';

/** Display selection only; every physical NODE linked to any chosen ledger row. */
export function selectedGeometryObjects(result, sources, picked = null) {
  const selected = new Set((Array.isArray(sources) ? sources : [sources]).filter(Boolean));
  const objects = Object.values(result.viewerScene.objects);
  const ids = objects.filter(o => o.kind === 'NODE' && o.sourceRows.some(id => selected.has(id)))
    .map(o => o.objectId);
  const physical = picked?.objectId ? result.viewerScene.objects[picked.objectId] :
    picked?.kind === 'NODE' ? objects.find(o => o.kind === 'NODE' && o.side === picked.side &&
      o.nodeId === String(picked.nodeId)) : null;
  if (physical) return [physical.objectId, ...ids.filter(id => id !== physical.objectId)];
  return ids;
}

const format = value => Number.isFinite(value) ? Number(value.toFixed(4)).toString() : '—';
const cell = (row, value) => { const td = document.createElement('td'); td.textContent = value; row.append(td); };
export function graphInfo(graph) {
  return graph.profile + '\nXML SHA-256 ' + graph.sha256 + ' · ' + graph.byteLength + ' bytes\n' +
    graph.nodes.length + ' endpoint nodes · ' + graph.edges.length + ' elements · ' + graph.components.length + ' component(s)\n' +
    graph.coordinateFrames.map(frame => 'C' + frame.component + ': ' + frame.coordinateFrame).join('; ') + '\n' +
    'CII provenance: ' + graph.claimedCii.status + (graph.claimedCii.sha256 ? '\nClaimed CII SHA ' + graph.claimedCii.sha256 : '');
}
export function renderAnchors(session, list, onRemove) {
  list.replaceChildren();
  session.state.anchors.forEach((anchor, index) => {
    const li = document.createElement('li'), button = document.createElement('button');
    li.append(document.createTextNode(anchor.source + ' → ' + anchor.target));
    button.textContent = '×'; button.setAttribute('aria-label', 'Remove anchor ' + anchor.source + ' to ' + anchor.target);
    button.addEventListener('click', () => onRemove(index)); li.append(button); list.append(li);
  });
}
export function renderRows(result, body, select, selected) {
  body.replaceChildren();
  const selectedRows = new Set(Array.isArray(selected) ? selected : [selected]);
  result.candidates.rows.forEach(row => {
    const tr = document.createElement('tr'); tr.dataset.source = row.source; tr.tabIndex = 0;
    tr.classList.toggle('selected', selectedRows.has(row.source));
    [row.source, row.target || '—', row.status, ...[0,1,2].map(i => format(row.residual?.[i])),
      row.alternatives.length].forEach(value => cell(tr, value));
    tr.addEventListener('click', () => select(row.source));
    tr.addEventListener('keydown', event => {
      if (['Enter',' '].includes(event.key)) { event.preventDefault(); select(row.source); }
    });
    body.append(tr);
  });
}
export function sourceRowsForTarget(result, nodeId) {
  const target = String(nodeId);
  return result.candidates.rows.filter(row => row.target === target ||
    row.alternatives.some(alt => String(alt.target) === target)).map(row => row.source);
}
export function selectedDetails(result, selection, picked = null) {
  const sources = new Set(Array.isArray(selection) ? selection : [selection]);
  const rows = result.candidates.rows.filter(row => sources.has(row.source));
  if (!rows.length && !picked) return 'Select a SOURCE node or linked TARGET candidate.';
  const links = rows.map(row => ({...row,
    xmlSourceElements: row.sourceWitness.map(index => result.source.edges[index]),
    targetXmlElements: row.alternatives.map(alt => ({target: alt.target,
      elements: (alt.targetWitness || []).map(index => result.target.edges[index])}))}));
  return JSON.stringify({selection: picked, linkedSourceRowCount: rows.length,
    ambiguityPreserved: rows.length > 1, allLinkedSourceRows: links,
    sourceCoordinateFrame: result.source.coordinateFrames[result.transform.sourceComponent],
    targetCoordinateFrame: result.target.coordinateFrames[result.transform.targetComponent]}, null, 2);
}
export function mountScene(result, canvas, select, selected = null, selectedElement = null, selectedPick = null) {
  const chosen = Array.isArray(selected) ? selected[0] : selected;
  const scene = methodCSvgScene({...result, selectedSource: chosen, selectedElement});
  result.scene = scene;
  // Only the existing escaped Method C renderer supplies markup here.
  canvas.innerHTML = scene.svg;
  const svg = canvas.querySelector('svg'), base = {...scene.viewBox};
  const nodeObjects = selectedGeometryObjects(result, selected, selectedPick).map(id => result.viewerScene.objects[id]);
  for (const node of svg.querySelectorAll?.('[data-node]') || []) {
    const active = nodeObjects.some(o => o.side === node.dataset.kind && o.nodeId === node.dataset.node);
    node.classList.toggle('mc-selected', active); node.setAttribute('aria-pressed', String(active));
  }
  let current = {...base}, drag = null;
  const apply = () => svg.setAttribute('viewBox', [current.x,current.y,current.width,current.height].join(' '));
  const pick = node => {
    const target = node.closest('[data-node]');
    if (target?.dataset.kind === 'SOURCE') select(target.dataset.node);
    else if (target) select(sourceRowsForTarget(result, target.dataset.node), null,
      {side: 'TARGET', kind: 'NODE', nodeId: target.dataset.node});
  };
  svg.addEventListener('click', event => {
    const edge = event.target.closest('[data-element]');
    if (edge) select(selected, edge.dataset.kind + ':' + edge.dataset.element);
    else pick(event.target);
  });
  svg.addEventListener('keydown', event => {
    if (['Enter',' '].includes(event.key)) { event.preventDefault(); pick(event.target); }
  });
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('[data-node],[data-element]')) return;
    drag = {x: event.clientX, y: event.clientY, box: {...current}}; svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect(), scale = Math.max(current.width / rect.width, current.height / rect.height);
    current.x = drag.box.x - (event.clientX - drag.x) * scale;
    current.y = drag.box.y - (event.clientY - drag.y) * scale; apply();
  });
  const end = () => { drag = null; };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  return {zoom(factor) {
    const width = current.width * factor, height = current.height * factor;
    current = {x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height}; apply();
  }, reset() { current = {...base}; apply(); }};
}
