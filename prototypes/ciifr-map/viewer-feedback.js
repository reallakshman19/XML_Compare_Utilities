/** Screen-space annotations only: original model positions and identities never move. */
export const GEOMETRY_COLORS = Object.freeze({SOURCE: '#ffa94d', TARGET: '#54c7ff'});
export const GEOMETRY_RGB = Object.freeze({source: 0xffa94d, target: 0x54c7ff});
const SVG = 'http://www.w3.org/2000/svg';
const HUD_LIMIT = 40000;
let viewerSequence = 0;

export function feedbackGeometry(scene) {
  const nodes = [], segments = [];
  for (const side of ['SOURCE', 'TARGET']) {
    const model = scene.models[side.toLowerCase()];
    for (const marker of model?.markers || []) {
      if (marker.kind === 'NODE') nodes.push({side, objectId: marker.objectId,
        nodeId: String(marker.nodeId), position: marker.position});
    }
    for (const segment of model?.segments || [])
      segments.push({side, objectId: segment.objectId, start: segment.start, end: segment.end});
  }
  const bounds = ['source', 'target'].map(side => scene.models[side]?.bounds).filter(Boolean);
  const center = [0, 1, 2].map(axis => bounds.length ?
    (Math.min(...bounds.map(b => b.min[axis])) + Math.max(...bounds.map(b => b.max[axis]))) / 2 : 0);
  return {nodes, segments, center};
}

export function selectedFeedbackNodes(geometry, ids) {
  const selected = new Set(ids);
  return geometry.nodes.filter(node => selected.has(node.objectId));
}

/** No rendering capability is fabricated by controlled non-browser test hosts. */
export function createViewerFeedback({host, viewer, scene}) {
  const doc = host.ownerDocument;
  const geometry = feedbackGeometry(scene);
  const pointForId = id => geometry.nodes.find(node => node.objectId === id)?.position || null;
  if (!doc?.createElementNS || !host.appendChild || !viewer.projectPointForPane)
    return {update() {}, dispose() {}, pointForId, center: geometry.center};
  const layer = doc.createElementNS(SVG, 'svg');
  const prefix = 'geo-feedback-' + (++viewerSequence);
  layer.setAttribute('class', 'geo-feedback');
  layer.setAttribute('aria-hidden', 'true');
  host.appendChild(layer);
  let selected = [], mode = 'overlay';
  function append(tag, attrs, text) {
    const el = doc.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (text !== undefined) el.textContent = text;
    layer.appendChild(el); return el;
  }
  function project(position, side, bounded = true) {
    const p = viewer.projectPointForPane(position, mode === 'side-by-side' ? side.toLowerCase() : 'full');
    const width = host.clientWidth, height = host.clientHeight;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    if (!bounded) return p;
    if (p.y < -20 || p.y > height + 20) return null;
    const min = mode === 'side-by-side' && side === 'TARGET' ? width / 2 : 0;
    const max = mode === 'side-by-side' && side === 'SOURCE' ? width / 2 : width;
    return p.x >= min - 12 && p.x <= max + 12 ? p : null;
  }
  function lines() {
    for (const side of ['SOURCE', 'TARGET']) {
      let d = '';
      for (const edge of geometry.segments) {
        if (edge.side !== side) continue;
        const a = project(edge.start, side, false), b = project(edge.end, side, false);
        if (a && b) d += `M${a.x},${a.y}L${b.x},${b.y}`;
      }
      append('path', {d, fill: 'none', stroke: GEOMETRY_COLORS[side],
        'stroke-width': side === 'SOURCE' ? 4.5 : 2.25,
        'stroke-dasharray': side === 'SOURCE' ? '9 4' : 'none', opacity: .95,
        'clip-path': `url(#${prefix}-${side})`});
    }
  }
  function clips() {
    const defs = append('defs', {}), width = host.clientWidth;
    for (const side of ['SOURCE', 'TARGET']) {
      const clip = doc.createElementNS(SVG, 'clipPath'), rect = doc.createElementNS(SVG, 'rect');
      clip.setAttribute('id', `${prefix}-${side}`); clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
      rect.setAttribute('x', mode === 'side-by-side' && side === 'TARGET' ? width / 2 : 0);
      rect.setAttribute('y', 0); rect.setAttribute('width', mode === 'side-by-side' ? width / 2 : width);
      rect.setAttribute('height', host.clientHeight); clip.appendChild(rect); defs.appendChild(clip);
    }
  }
  function ordinaryNodes() {
    for (const side of ['SOURCE', 'TARGET']) {
      let d = '';
      for (const node of geometry.nodes) {
        if (node.side !== side) continue;
        const p = project(node.position, side);
        if (!p) continue;
        d += side === 'SOURCE' ? `M${p.x-4},${p.y}a4,4 0 1,0 8,0a4,4 0 1,0 -8,0` :
          `M${p.x},${p.y-2.5}l2.5,2.5l-2.5,2.5l-2.5,-2.5Z`;
      }
      append('path', {d, fill: side === 'SOURCE' ? 'none' : GEOMETRY_COLORS[side],
        stroke: GEOMETRY_COLORS[side], 'stroke-width': side === 'SOURCE' ? 1.5 : 1,
        'clip-path': `url(#${prefix}-${side})`});
    }
  }
  function nodeMarker(node, active) {
    const p = project(node.position, node.side);
    if (!p) return;
    const source = node.side === 'SOURCE', color = GEOMETRY_COLORS[node.side];
    if (source) append('circle', {cx: p.x, cy: p.y, r: active ? 9 : 4,
      fill: active ? '#07111d' : 'none', stroke: color, 'stroke-width': active ? 3 : 1.5});
    else {
      const r = active ? 6 : 2.5;
      append('path', {d: `M${p.x},${p.y-r}L${p.x+r},${p.y}L${p.x},${p.y+r}L${p.x-r},${p.y}Z`,
        fill: color, stroke: active ? '#fff' : color, 'stroke-width': active ? 1.5 : 1});
    }
    const leftLabel = p.x > host.clientWidth - 155;
    if (active) append('text', {x: p.x + (leftLabel ? -14 : 14),
      y: Math.max(16, Math.min(host.clientHeight - 8, p.y + (source ? -11 : 19))),
      'text-anchor': leftLabel ? 'end' : 'start', class: 'geo-node-label', fill: color}, node.side + ' ' + node.nodeId);
  }
  function update(next = {}) {
    selected = next.ids || selected; mode = next.mode || mode;
    layer.replaceChildren();
    layer.setAttribute('viewBox', `0 0 ${Math.max(1, host.clientWidth)} ${Math.max(1, host.clientHeight)}`);
    clips();
    if (geometry.nodes.length + geometry.segments.length <= HUD_LIMIT) {
      lines(); ordinaryNodes(); // Four batched paths, not one DOM element per ordinary NODE.
    } else append('text', {x: 12, y: 20, class: 'geo-node-label', fill: '#fff'},
      'Large model: shared 3D geometry + selected-node labels');
    for (const node of selectedFeedbackNodes(geometry, selected)) nodeMarker(node, true);
  }
  const Resize = doc.defaultView?.ResizeObserver;
  const observer = Resize ? new Resize(() => update()) : null;
  observer?.observe(host);
  return {update, pointForId, center: geometry.center,
    dispose() { observer?.disconnect(); layer.remove(); }};
}
