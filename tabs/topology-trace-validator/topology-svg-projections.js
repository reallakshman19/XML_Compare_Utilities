/**
 * Pure world-to-SVG projection and auto-fit calculations. Inputs are complete
 * 3D points, an explicit projection, and viewport dimensions. Outputs are
 * immutable 2D points/bounds. Missing axes are never fabricated.
 */

import { deepFreeze, strictPoint } from './topology-validator-values.js';

export const TOPOLOGY_SVG_WIDTH = 1200;
export const TOPOLOGY_SVG_HEIGHT = 720;
export const TOPOLOGY_SVG_PADDING = 54;
export const TOPOLOGY_PROJECTION_PLANES = Object.freeze(['ISO', 'XY', 'XZ', 'YZ']);

export function projectTopologyPoint(point, plane) {
  const value = strictPoint(point);
  if (!value) return null;
  if (plane === 'ISO') return Object.freeze({
    x: (value.x - value.y) * Math.cos(Math.PI / 6),
    y: value.z + (value.x + value.y) * Math.sin(Math.PI / 6),
  });
  if (plane === 'XY' || plane === '3D') return Object.freeze({ x: value.x, y: value.y });
  if (plane === 'XZ') return Object.freeze({ x: value.x, y: value.z });
  if (plane === 'YZ') return Object.freeze({ x: value.y, y: value.z });
  throw new RangeError(`Unsupported topology projection plane: ${plane}`);
}

export function calculateTopologyBounds(points) {
  const valid = points.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!valid.length) return deepFreeze({ minX: 0, maxX: 1, minY: 0, maxY: 1, spanX: 1, spanY: 1 });
  const xs = valid.map((point) => Number(point.x)), ys = valid.map((point) => Number(point.y));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return deepFreeze({ minX, maxX, minY, maxY, spanX: maxX - minX || 1, spanY: maxY - minY || 1 });
}

export function createTopologyWorldTransform(bounds, width, height, padding) {
  const scale = Math.min((width - padding * 2) / bounds.spanX, (height - padding * 2) / bounds.spanY);
  const centerX = bounds.minX + bounds.spanX / 2, centerY = bounds.minY + bounds.spanY / 2;
  return (point) => Object.freeze({
    x: width / 2 + (point.x - centerX) * scale,
    y: height / 2 - (point.y - centerY) * scale,
  });
}

export function topologyPathData(points) {
  return points.filter(Boolean).map((point, index) => `${index ? 'L' : 'M'} ${Number(point.x).toFixed(2)} ${Number(point.y).toFixed(2)}`).join(' ');
}
