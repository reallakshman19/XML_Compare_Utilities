import {methodCSvgScene,projectMethodCPoint,escapeMethodCXml} from '../../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import {registeredMethodCPoint} from '../../tabs/cii-workspace/cii-workspace-method-c-registration.js';

/** Display selection only; every physical NODE linked to any chosen ledger row. */
export function selectedGeometryObjects(result, sources, picked = null) {
  const selected = new Set((Array.isArray(sources) ? sources : [sources]).filter(Boolean));
  const objects = Object.values(result.viewerScene.objects);
  if (picked?.pairTarget) {
    return objects.filter(o => o.kind === 'NODE' &&
      (o.side === 'SOURCE' && selected.has(o.nodeId) || o.side === 'TARGET' && o.nodeId === picked.pairTarget))
      .map(o => o.objectId);
  }
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
export function readableSelection(result, selection, picked = null, element = null) {
  const sources = new Set(selection), rows = result.candidates.rows.filter(row => sources.has(row.source));
  const lines = [];
  if (element) {
    const [side,index] = element.split(':'), edge = (side === 'SOURCE' ? result.source : result.target).edges[Number(index)];
    if (edge) lines.push(side + ' ELEMENT ' + edge.index + ' · NODE ' + edge.from + ' → ' + edge.to + '\nWitness: ' + edge.witness);
  }
  for (const row of rows) {
    const targetId = picked?.pairTarget || row.target;
    const status = picked?.pairTarget && targetId !== row.target ?
      'Inspected alternative; active TARGET NODE ' + (row.target || '—') : row.status;
    lines.push('SOURCE NODE ' + row.source + ' → TARGET NODE ' + (targetId || '—') + '\n' + status);
    const physicalTarget = result.target.nodeIndex.get(targetId);
    const registered = registeredMethodCPoint(result.transform,result.source.nodeIndex.get(row.source).xyz);
    const residual = physicalTarget ? physicalTarget.xyz.map((x,i) => x-registered[i]) : row.residual;
    if (residual) lines.push('ΔX ' + format(residual[0]) + ' · ΔY ' + format(residual[1]) + ' · ΔZ ' + format(residual[2]) + ' mm');
    lines.push('Other NODE candidates: ' + (row.alternatives.filter(a => a.target !== targetId).map(a => a.target).join(', ') || 'none'));
    lines.push('SOURCE ELEMENT witnesses: ' + row.sourceWitness.map(i => result.source.edges[i]?.witness || i).join('; '));
    if (physicalTarget) lines.push('TARGET ELEMENT witnesses: ' + physicalTarget.incident.map(i => result.target.edges[i]?.witness || i).join('; '));
    if (row.segment) lines.push('ELEMENT-only observation: ' + row.segment.witness + '; it does not create a TARGET NODE.');
  }
  if (!rows.length && picked?.nodeId) lines.push(picked.side + ' NODE ' + picked.nodeId + ' · no linked SOURCE correspondence');
  return lines.join('\n\n') || 'Select a physical NODE or correspondence row.';
}
function svgBounds(value) {
  if (!value || !['x','y','width','height'].every(key => Number.isFinite(value[key])) || value.width <= 0 || value.height <= 0)
    throw new TypeError('SVG_VIEWBOX_REQUIRES_FINITE_POSITIVE_BOUNDS');
  return {x: value.x, y: value.y, width: value.width, height: value.height};
}
export function mountScene(result, canvas, select, selected = null, selectedElement = null, selectedPick = null, svgViewBox = null) {
  const chosen = Array.isArray(selected) ? selected[0] : selected;
  const scene = methodCSvgScene({...result, selectedSource: chosen, selectedElement});
  const selectedObjects = selectedGeometryObjects(result,selected,selectedPick).map(id => result.viewerScene.objects[id]);
  const size = Math.max(scene.viewBox.width,scene.viewBox.height)*0.015;
  const labels = selectedObjects.filter(o => o.kind === 'NODE').map(object => {
    const graph = object.side === 'SOURCE' ? result.source : result.target;
    const xyz = graph.nodeIndex.get(object.nodeId).xyz;
    const [x,y] = projectMethodCPoint(object.side === 'SOURCE' ? registeredMethodCPoint(result.transform,xyz) : xyz,result.projection);
    return '<text x="'+(x+size)+'" y="'+(y+(object.side==='SOURCE'?-size:size*1.6))+
      '" font-size="'+size+'" fill="'+(object.side==='SOURCE'?'#9b4400':'#005e9e')+
      '" stroke="white" stroke-width="'+size*.16+'" paint-order="stroke" pointer-events="none">'+
      escapeMethodCXml(object.side+' '+object.nodeId)+'</text>';
  }).join('');
  scene.svg = scene.svg.replace('</svg>','<g data-layer="selected-identities">'+labels+'</g></svg>');
  result.scene = scene;
  // Only the existing escaped Method C renderer supplies markup here.
  canvas.innerHTML = scene.svg;
  const svg = canvas.querySelector('svg'), base = {...scene.viewBox};
  const nodeObjects = selectedGeometryObjects(result, selected, selectedPick).map(id => result.viewerScene.objects[id]);
  for (const node of svg.querySelectorAll?.('[data-node]') || []) {
    const active = nodeObjects.some(o => o.side === node.dataset.kind && o.nodeId === node.dataset.node);
    node.classList.toggle('mc-selected', active); node.setAttribute('aria-pressed', String(active));
  }
  let current = svgBounds(svgViewBox == null ? base : svgViewBox), drag = null;
  const apply = () => svg.setAttribute('viewBox', [current.x,current.y,current.width,current.height].join(' '));
  apply();
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
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scale = Math.max(current.width / rect.width, current.height / rect.height);
    current = svgBounds({...drag.box, x: drag.box.x - (event.clientX - drag.x) * scale,
      y: drag.box.y - (event.clientY - drag.y) * scale}); apply();
  });
  const end = () => { drag = null; };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  return {zoom(factor) {
    if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('SVG_ZOOM_REQUIRES_POSITIVE_FINITE_FACTOR');
    const width = current.width * factor, height = current.height * factor;
    current = svgBounds({x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height}); apply();
  }, reset() { current = {...base}; apply(); },
    getState() { return {...current}; },
    restore(state) { current = svgBounds(state); apply(); }};
}
