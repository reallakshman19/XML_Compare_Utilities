import { DEFAULT_TOLERANCE_MM } from '../sequential-sketcher-contract.js';

function distance(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function routePorts(component) {
  const positioned = (component?.ports || []).filter((port) => (
    port.sourcePosition && port.role !== 'BRANCH_OUT'
  ));
  return positioned.length
    ? positioned
    : (component?.ports || []).filter((port) => port.sourcePosition);
}

function nearestPort(component, point) {
  const ports = routePorts(component);
  if (!ports.length) return { port: null, gapMm: Number.POSITIVE_INFINITY };
  if (!point) return { port: ports[0], gapMm: null };
  return ports
    .map((port) => ({ port, gapMm: distance(point, port.sourcePosition) }))
    .sort((left, right) => (
      left.gapMm - right.gapMm || left.port.portId.localeCompare(right.port.portId)
    ))[0];
}

function exitPort(component, entryPort) {
  const ports = routePorts(component);
  if (!ports.length) return null;
  if (!entryPort || ports.length === 1) return ports[0];
  const alternatives = ports.filter((port) => port.portId !== entryPort.portId);
  if (!alternatives.length) return entryPort;
  return alternatives
    .map((port) => ({ port, spanMm: distance(entryPort.sourcePosition, port.sourcePosition) }))
    .sort((left, right) => (
      right.spanMm - left.spanMm || left.port.portId.localeCompare(right.port.portId)
    ))[0].port;
}

function eventPriority(component) {
  const ports = routePorts(component);
  if (component?.canonicalType === 'OLET') return 0;
  if (ports.length <= 1 && !['CAP', 'BLIND'].includes(component?.canonicalType)) return 1;
  if (['CAP', 'BLIND'].includes(component?.canonicalType)) return 3;
  return 2;
}

function fallbackOrder(components) {
  return Object.freeze(components.map((component, routeIndex) => Object.freeze({
    ...component,
    routeIndex,
    routeEntryPortId: routePorts(component)[0]?.portId || null,
    routeExitPortId: routePorts(component).at(-1)?.portId || null,
    routeGapMm: null,
    routeSequenceBasis: 'SOURCE_HIERARCHY_FALLBACK_NO_HPOS',
  })));
}

/**
 * Orders immutable component evidence from branch HPOS through connected ports.
 * `sourceIndex` remains untouched as source-hierarchy provenance.
 */
export function orderSequentialComponentsByGeometry(components, headPosition, options = {}) {
  if (!Array.isArray(components)) throw new TypeError('Sequential components must be an array.');
  if (!components.length) return Object.freeze([]);
  if (!headPosition) return fallbackOrder(components);

  const toleranceMm = Math.max(0, Number(options.toleranceMm ?? DEFAULT_TOLERANCE_MM));
  const remaining = [...components];
  const ordered = [];
  let cursor = headPosition;

  while (remaining.length) {
    const ranked = remaining.map((component) => {
      const entry = nearestPort(component, cursor);
      return { component, entry, priority: eventPriority(component) };
    }).sort((left, right) => (
      left.entry.gapMm - right.entry.gapMm
      || left.priority - right.priority
      || left.component.sourceIndex - right.component.sourceIndex
      || left.component.componentId.localeCompare(right.component.componentId)
    ));
    const selected = ranked[0];
    const index = remaining.findIndex((component) => component.componentId === selected.component.componentId);
    remaining.splice(index, 1);
    const exit = exitPort(selected.component, selected.entry.port);
    const routeIndex = ordered.length;
    const gapMm = Number.isFinite(selected.entry.gapMm) ? selected.entry.gapMm : null;
    ordered.push(Object.freeze({
      ...selected.component,
      routeIndex,
      routeEntryPortId: selected.entry.port?.portId || null,
      routeExitPortId: exit?.portId || selected.entry.port?.portId || null,
      routeGapMm: gapMm,
      routeSequenceBasis: gapMm !== null && gapMm <= toleranceMm
        ? 'GEOMETRY_PORT_CONTINUITY'
        : 'GEOMETRY_NEAREST_FRAGMENT',
    }));
    cursor = exit?.sourcePosition || selected.entry.port?.sourcePosition || cursor;
  }

  return Object.freeze(ordered);
}
