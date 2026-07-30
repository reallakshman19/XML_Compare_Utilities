/** Pure CAESAR InputXML bend reconstruction for Workbench visual geometry. */

import { resolveSourceOrientation } from './source-element-orientation.js';

const RADIUS_KEYS = Object.freeze([
  'RADIUS', 'BEND_RADIUS', 'BENDRADIUS', 'BEND_RAD',
  'BENDRAD', 'CURVE_RADIUS', 'CURVERADIUS', 'R',
]);
const MIN_LENGTH_MM = 1e-3;
const MIN_ANGLE_RAD = Math.PI / 360;
const MAX_ANGLE_RAD = Math.PI - MIN_ANGLE_RAD;
const ARC_STEP_RAD = Math.PI / 24;
const MAX_ARC_STEPS = 48;

function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(v, factor) { return [v[0] * factor, v[1] * factor, v[2] * factor]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function length(v) { return Math.hypot(v[0], v[1], v[2]); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function round(value) { return Number(value.toFixed(6)); }
function roundPoint(point) { return point.map(round); }

function normalize(vector) {
  const magnitude = length(vector);
  return magnitude > MIN_LENGTH_MM ? scale(vector, 1 / magnitude) : null;
}

function rotateAroundAxis(vector, axis, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(
    add(scale(vector, cosine), scale(cross(axis, vector), sine)),
    scale(axis, dot(axis, vector) * (1 - cosine)),
  );
}

function numericAttribute(attrs, names) {
  for (const name of names) {
    const key = Object.keys(attrs ?? {}).find((candidate) => candidate.toUpperCase() === name);
    if (!key) continue;
    const value = Number(String(attrs[key]).trim());
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function endpoints(object) { return [object.fromNode, object.toNode]; }
function otherNode(object, nodeId) {
  if (object.fromNode === nodeId) return object.toNode;
  if (object.toNode === nodeId) return object.fromNode;
  return null;
}

function bendPacket(object) {
  return object.packets?.find((packet) => packet.kind === 'BEND') ?? null;
}

function objectsAtNode(objects, nodeId, excludedId) {
  return objects.filter((object) => object.objectId !== excludedId
    && object.lengthMm > MIN_LENGTH_MM
    && endpoints(object).includes(nodeId));
}

function buildArcPoints(center, tangentStart, normal, angle) {
  const radial = sub(tangentStart, center);
  const steps = Math.min(MAX_ARC_STEPS, Math.max(6, Math.ceil(angle / ARC_STEP_RAD)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const point = add(center, rotateAroundAxis(radial, normal, angle * index / steps));
    return roundPoint(point);
  });
}

function blocked(objectId, code, message, details = {}) {
  return { objectId, severity: 'BLOCKED', code, message, ...details };
}

function orientationDiagnostic(object, direction) {
  return blocked(object.objectId, direction.code, direction.message);
}

function resolveOneBend(graph, object, nodeCoord) {
  const packet = bendPacket(object);
  const radiusMm = numericAttribute(packet?.attrs, RADIUS_KEYS);
  if (!radiusMm) return { diagnostic: blocked(object.objectId, 'BEND_RADIUS_MISSING', 'Explicit positive bend radius is required.') };
  const direction = resolveSourceOrientation(object);
  if (!direction.ok) return { diagnostic: orientationDiagnostic(object, direction) };
  const corner = nodeCoord.get(direction.toNode);
  const previous = nodeCoord.get(direction.fromNode);
  if (!corner || !previous) return { diagnostic: blocked(object.objectId, 'BEND_NODE_MISSING', 'Bend endpoint coordinates are unavailable.') };
  const adjacent = objectsAtNode(graph.objects, direction.toNode, object.objectId);
  if (adjacent.length !== 1) {
    return { diagnostic: blocked(object.objectId, 'BEND_ADJACENCY_AMBIGUOUS', `Expected one outgoing element at bend node; found ${adjacent.length}.`) };
  }
  const nextNode = otherNode(adjacent[0], direction.toNode);
  const next = nodeCoord.get(nextNode);
  if (!next) return { diagnostic: blocked(object.objectId, 'BEND_OUTGOING_NODE_MISSING', 'Outgoing bend coordinate is unavailable.') };
  return resolveArc(object, adjacent[0], direction, previous, corner, next, radiusMm);
}

function resolveArc(object, adjacent, direction, previous, corner, next, radiusMm) {
  const incoming = normalize(sub(corner, previous));
  const outgoing = normalize(sub(next, corner));
  if (!incoming || !outgoing) return { diagnostic: blocked(object.objectId, 'BEND_ZERO_LENGTH', 'Bend legs must have non-zero length.') };
  const angle = Math.acos(clamp(dot(incoming, outgoing), -1, 1));
  if (angle <= MIN_ANGLE_RAD || angle >= MAX_ANGLE_RAD) {
    return { diagnostic: blocked(object.objectId, 'BEND_ANGLE_INVALID', 'Bend turn angle is degenerate.', { angleDeg: round(angle * 180 / Math.PI) }) };
  }
  const tangentMm = radiusMm * Math.tan(angle / 2);
  const incomingLength = length(sub(corner, previous));
  const outgoingLength = length(sub(next, corner));
  if (tangentMm >= incomingLength - MIN_LENGTH_MM || tangentMm >= outgoingLength - MIN_LENGTH_MM) {
    return { diagnostic: blocked(object.objectId, 'BEND_RADIUS_EXCEEDS_LEGS', 'Explicit bend radius cannot fit the connected straight lengths.', { radiusMm, tangentMm: round(tangentMm) }) };
  }
  const tangentStart = add(corner, scale(incoming, -tangentMm));
  const tangentEnd = add(corner, scale(outgoing, tangentMm));
  const normal = normalize(cross(incoming, outgoing));
  if (!normal) return { diagnostic: blocked(object.objectId, 'BEND_PLANE_UNRESOLVED', 'Bend plane cannot be resolved.') };
  const center = add(tangentStart, scale(cross(normal, incoming), radiusMm));
  const points = buildArcPoints(center, tangentStart, normal, angle);
  points[0] = roundPoint(tangentStart);
  points[points.length - 1] = roundPoint(tangentEnd);
  return {
    arc: {
      objectId: object.objectId,
      adjacentObjectId: adjacent.objectId,
      cornerNode: direction.toNode,
      radiusMm: round(radiusMm),
      angleDeg: round(angle * 180 / Math.PI),
      tangentMm: round(tangentMm),
      center: roundPoint(center),
      points,
      directionEvidence: direction.evidence,
    },
  };
}

function endpointKey(objectId, nodeId) { return `${objectId}\u0000${nodeId}`; }

export function effectiveDiameterByObject(objects) {
  const ordered = [...objects].sort((a, b) => (a.rawIndex ?? 0) - (b.rawIndex ?? 0));
  const result = new Map();
  let activeLine = null;
  let current = null;
  for (const object of ordered) {
    if (object.lineId && object.lineId !== activeLine) { activeLine = object.lineId; current = null; }
    const explicit = Number(object.diameterMm);
    if (Number.isFinite(explicit) && explicit > 0) current = explicit;
    result.set(object.objectId, {
      diameterMm: current,
      source: Number.isFinite(explicit) && explicit > 0 ? 'EXPLICIT' : current ? 'INHERITED' : 'UNRESOLVED',
    });
  }
  return result;
}

export function resolveInputXmlBends(graph) {
  const nodeCoord = new Map(graph.nodes.map((node) => [node.nodeId, node.coordMm]));
  const arcs = [];
  const diagnostics = [];
  const trims = new Map();
  const bendObjects = graph.objects.filter((object) => bendPacket(object));
  for (const object of bendObjects) {
    const result = resolveOneBend(graph, object, nodeCoord);
    if (result.diagnostic) { diagnostics.push(result.diagnostic); continue; }
    const arc = result.arc;
    arcs.push(arc);
    trims.set(endpointKey(arc.objectId, arc.cornerNode), arc.points[0]);
    trims.set(endpointKey(arc.adjacentObjectId, arc.cornerNode), arc.points[arc.points.length - 1]);
  }
  return {
    arcs,
    diagnostics,
    trims,
    summary: {
      requested: bendObjects.length,
      resolved: arcs.length,
      blocked: diagnostics.length,
      arcSegments: arcs.reduce((sum, arc) => sum + arc.points.length - 1, 0),
    },
  };
}

export function trimmedEndpoint(plan, objectId, nodeId, fallback) {
  return plan.trims.get(endpointKey(objectId, nodeId)) ?? fallback;
}
