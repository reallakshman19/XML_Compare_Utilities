/**
 * Editable orthographic SVG renderer.
 * Inputs are immutable original/draft canonical snapshots plus selection and
 * validation state. Output is a tri-plane SVG and an explicit reversible
 * projection context; no topology object is mutated by rendering or dragging.
 */

import {
  TOPOLOGY_SVG_HEIGHT,
  TOPOLOGY_SVG_PADDING,
  TOPOLOGY_SVG_WIDTH,
  calculateTopologyBounds,
  projectTopologyPoint,
} from './topology-svg-projections.js';
import { asArray, cleanText, escapeMarkup, objectRecord } from './topology-validator-values.js';

/** @param {Record<string, unknown>} bounds @returns {Readonly<Record<string, number>>} */
function projectionTransform(bounds) {
  const scale = Math.min(
    (TOPOLOGY_SVG_WIDTH - (TOPOLOGY_SVG_PADDING * 2)) / Number(bounds.spanX),
    (TOPOLOGY_SVG_HEIGHT - (TOPOLOGY_SVG_PADDING * 2)) / Number(bounds.spanY),
  );
  return Object.freeze({
    scale,
    centerX: Number(bounds.minX) + (Number(bounds.spanX) / 2),
    centerY: Number(bounds.minY) + (Number(bounds.spanY) / 2),
  });
}

/** @param {{x:number,y:number}} value @param {Record<string, number>} transform @returns {{x:number,y:number}} */
function toSvg(value, transform) {
  return {
    x: (TOPOLOGY_SVG_WIDTH / 2) + ((value.x - transform.centerX) * transform.scale),
    y: (TOPOLOGY_SVG_HEIGHT / 2) - ((value.y - transform.centerY) * transform.scale),
  };
}

/** @param {{x:number,y:number}} value @param {string} plane @param {{x:number,y:number,z:number}} original @param {Record<string, number>} transform @returns {{x:number,y:number,z:number}} */
function fromSvg(value, plane, original, transform) {
  const first = ((value.x - (TOPOLOGY_SVG_WIDTH / 2)) / transform.scale) + transform.centerX;
  const second = -((value.y - (TOPOLOGY_SVG_HEIGHT / 2)) / transform.scale) + transform.centerY;
  if (plane === 'XY') return { x: first, y: second, z: original.z };
  if (plane === 'XZ') return { x: first, y: original.y, z: second };
  if (plane === 'YZ') return { x: original.x, y: first, z: second };
  throw new RangeError(`Unsupported edit projection ${plane}.`);
}

/** @param {string} kind @param {string} id @returns {string} */
function selectionKey(kind, id) { return `${kind}:${id}`; }

/** @param {{x:number,y:number}} start @param {{x:number,y:number}} end @returns {string} */
function linePath(start, end) {
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** @param {Record<string, unknown>} canonical @param {string} plane @param {Record<string, number>} transform @returns {Map<string,{x:number,y:number}>} */
function projectedNodeMap(canonical, plane, transform) {
  return new Map(asArray(canonical.nodes).map(objectRecord).map((node) => {
    const projected = projectTopologyPoint(node.position, plane);
    return [cleanText(node.id), toSvg(projected, transform)];
  }));
}

/** @param {Record<string, unknown>} canonical @param {Map<string,{x:number,y:number}>} nodes @param {string} cssClass @returns {string} */
function edgeMarkup(canonical, nodes, cssClass) {
  return asArray(canonical.edges).map(objectRecord).flatMap((edge) => {
    const start = nodes.get(cleanText(edge.fromNodeId)), end = nodes.get(cleanText(edge.toNodeId));
    if (!start || !end) return [];
    const id = cleanText(edge.id), path = linePath(start, end);
    if (cssClass === 'ttv-edit-original-edge') return [`<path class="${cssClass}" d="${path}"/>`];
    return [`<g class="ttv-edit-edge" data-object-key="edit:edge:${escapeMarkup(id)}" data-edit-kind="edge" data-edit-id="${escapeMarkup(id)}" data-from-node="${escapeMarkup(edge.fromNodeId)}" data-to-node="${escapeMarkup(edge.toNodeId)}"><path class="ttv-edit-edge-line" d="${path}"/><path class="ttv-edit-hit" d="${path}"/><title>${escapeMarkup(id)} · ${escapeMarkup(edge.segmentRole)}</title></g>`];
  }).join('');
}

/** @param {Record<string, unknown>} canonical @param {Map<string,{x:number,y:number}>} nodes @param {Set<string>} selected @returns {string} */
function nodeMarkup(canonical, nodes, selected) {
  return asArray(canonical.nodes).map(objectRecord).flatMap((node) => {
    const id = cleanText(node.id), value = nodes.get(id);
    if (!value) return [];
    const active = selected.has(selectionKey('node', id)) ? ' is-selected' : '';
    return [`<g class="ttv-edit-node${active}" data-object-key="edit:node:${escapeMarkup(id)}" data-edit-kind="node" data-edit-id="${escapeMarkup(id)}"><circle cx="${value.x.toFixed(2)}" cy="${value.y.toFixed(2)}" r="6"/><circle class="ttv-edit-node-hit" cx="${value.x.toFixed(2)}" cy="${value.y.toFixed(2)}" r="14"/><title>${escapeMarkup(id)} · CAESAR ${escapeMarkup(asArray(node.inputXmlNodeIds)[0] ?? '—')}</title></g>`];
  }).join('');
}

/** @param {Record<string, unknown>} canonical @param {Map<string,{x:number,y:number}>} nodes @param {Set<string>} selected @returns {string} */
function supportMarkup(canonical, nodes, selected) {
  return asArray(canonical.supports).map(objectRecord).flatMap((support) => {
    const id = cleanText(support.id), value = nodes.get(cleanText(support.nodeId));
    if (!value) return [];
    const active = selected.has(selectionKey('support', id)) ? ' is-selected' : '';
    const path = `M ${value.x.toFixed(2)} ${(value.y - 10).toFixed(2)} L ${(value.x - 9).toFixed(2)} ${(value.y + 8).toFixed(2)} L ${(value.x + 9).toFixed(2)} ${(value.y + 8).toFixed(2)} Z`;
    return [`<path class="ttv-edit-support${active}" d="${path}" data-object-key="edit:support:${escapeMarkup(id)}" data-edit-kind="support" data-edit-id="${escapeMarkup(id)}"><title>${escapeMarkup(support.tag || id)}</title></path>`];
  }).join('');
}

/** @param {Record<string, unknown>} canonical @param {Map<string,{x:number,y:number}>} nodes @param {Set<string>} selected @returns {string} */
function bendMarkup(canonical, nodes, selected) {
  return asArray(canonical.edges).map(objectRecord).filter((edge) => /BEND|ELBO/.test(cleanText(edge.segmentRole).toUpperCase())).flatMap((edge) => {
    const start = nodes.get(cleanText(edge.fromNodeId)), end = nodes.get(cleanText(edge.toNodeId));
    if (!start || !end) return [];
    const edgeId = cleanText(edge.id), id = `bend:${edgeId}`, x = (start.x + end.x) / 2, y = (start.y + end.y) / 2;
    const active = selected.has(selectionKey('bend', id)) ? ' is-selected' : '';
    return [`<rect class="ttv-edit-bend${active}" x="${(x - 5).toFixed(2)}" y="${(y - 5).toFixed(2)}" width="10" height="10" transform="rotate(45 ${x.toFixed(2)} ${y.toFixed(2)})" data-object-key="edit:bend:${escapeMarkup(id)}" data-edit-kind="bend" data-edit-id="${escapeMarkup(id)}"><title>Bend evidence on ${escapeMarkup(edgeId)}</title></rect>`];
  }).join('');
}

/** @param {Record<string, unknown>} canonical @param {Map<string,{x:number,y:number}>} nodes @param {Record<string, unknown>} validation @param {Set<string>} selected @returns {string} */
function issueMarkup(canonical, nodes, validation, selected) {
  const edgeIndex = new Map(asArray(canonical.edges).map(objectRecord).map((edge) => [cleanText(edge.id), edge]));
  return asArray(validation.findings).map(objectRecord).flatMap((issue, index) => {
    const objectId = asArray(issue.objectIds).map(cleanText).find(Boolean);
    const nodePoint = nodes.get(objectId);
    const edge = edgeIndex.get(objectId);
    const start = edge ? nodes.get(cleanText(edge.fromNodeId)) : null, end = edge ? nodes.get(cleanText(edge.toNodeId)) : null;
    const value = nodePoint ?? (start && end ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : null);
    if (!value) return [];
    const id = `finding-${index + 1}`, active = selected.has(selectionKey('issue', id)) ? ' is-selected' : '';
    const color = cleanText(issue.color) || '#ef4444';
    return [`<g class="ttv-edit-issue${active}" style="--ttv-edit-issue-color:${escapeMarkup(color)}" data-issue-code="${escapeMarkup(issue.code)}" data-issue-baseline="${issue.baseline === true}" data-object-key="edit:issue:${id}" data-edit-kind="issue" data-edit-id="${id}"><circle cx="${(value.x + 11).toFixed(2)}" cy="${(value.y - 11).toFixed(2)}" r="7"/><text x="${(value.x + 11).toFixed(2)}" y="${(value.y - 8).toFixed(2)}">!</text><title>${escapeMarkup(issue.code)} · ${escapeMarkup(issue.message)}${issue.canvasFix ? ` · Canvas fix: ${escapeMarkup(issue.canvasFix)}` : ''}</title></g>`];
  }).join('');
}

/**
 * Renders original and draft topology in one editable orthographic SVG.
 *
 * @param {Element} host
 * @param {Record<string, unknown>} original
 * @param {Record<string, unknown>} draft
 * @param {Record<string, unknown>} validation
 * @param {string} plane
 * @param {ReadonlyArray<Record<string, string>>} selection
 * @returns {Readonly<Record<string, unknown>>}
 */
export function renderTopologyEditSvg(host, original, draft, validation, plane, selection) {
  if (!['XY', 'XZ', 'YZ'].includes(plane)) throw new RangeError(`Unsupported edit projection ${plane}.`);
  const allProjected = [...asArray(original.nodes), ...asArray(draft.nodes)].map(objectRecord).map((node) => projectTopologyPoint(node.position, plane));
  const bounds = calculateTopologyBounds(allProjected), transform = projectionTransform(bounds);
  const originalNodes = projectedNodeMap(original, plane, transform), draftNodes = projectedNodeMap(draft, plane, transform);
  const selected = new Set(selection.map((row) => selectionKey(cleanText(row.kind), cleanText(row.id))));
  host.innerHTML = `<svg class="ttv-edit-svg" viewBox="0 0 ${TOPOLOGY_SVG_WIDTH} ${TOPOLOGY_SVG_HEIGHT}" tabindex="0" role="application" aria-label="Editable ${escapeMarkup(plane)} topology draft. Use keyboard or pointer controls; source artifacts remain unchanged."><defs><pattern id="ttv-edit-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40"/></pattern></defs><rect class="ttv-edit-grid" width="${TOPOLOGY_SVG_WIDTH}" height="${TOPOLOGY_SVG_HEIGHT}"/><g data-layer="original">${edgeMarkup(original, originalNodes, 'ttv-edit-original-edge')}</g><g data-layer="draft">${edgeMarkup(draft, draftNodes, 'ttv-edit-edge')}${bendMarkup(draft, draftNodes, selected)}${supportMarkup(draft, draftNodes, selected)}${nodeMarkup(draft, draftNodes, selected)}${issueMarkup(draft, draftNodes, validation, selected)}</g><rect class="ttv-edit-selection-box" data-ttv-edit-selection-box hidden/></svg>`;
  for (const row of selection) {
    host.querySelector(`[data-edit-kind="${CSS.escape(cleanText(row.kind))}"][data-edit-id="${CSS.escape(cleanText(row.id))}"]`)?.classList.add('is-selected');
  }
  const svg = host.querySelector('svg');
  if (!(svg instanceof SVGElement)) throw new TypeError('Editable topology SVG could not be created.');
  return Object.freeze({
    svg,
    plane,
    transform,
    nodePoints: draftNodes,
    toWorld: (svgPoint, originalPoint) => fromSvg(svgPoint, plane, originalPoint, transform),
  });
}

/** @param {SVGElement} svg @param {PointerEvent|MouseEvent} event @returns {{x:number,y:number}} */
export function editClientToSvgPoint(svg, event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) throw new Error('Editable SVG has no screen transform.');
  const value = svg.createSVGPoint();
  value.x = event.clientX; value.y = event.clientY;
  const transformed = value.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

export const _test = Object.freeze({ projectionTransform, toSvg, fromSvg, selectionKey, linePath });
