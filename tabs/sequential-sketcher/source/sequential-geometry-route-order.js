import { DEFAULT_TOLERANCE_MM } from '../sequential-sketcher-contract.js';

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function routePorts(component) {
  const inline = (component?.ports || []).filter((port) => port.sourcePosition && port.role !== 'BRANCH_OUT');
  return inline.length ? inline : (component?.ports || []).filter((port) => port.sourcePosition);
}

function nearestPort(component, point) {
  const ports = routePorts(component);
  if (!ports.length) return { port: null, gapMm: Number.POSITIVE_INFINITY };
  if (!point) return { port: ports[0], gapMm: null };
  return ports.map((port) => ({ port, gapMm: distance(point, port.sourcePosition) }))
    .sort((a, b) => a.gapMm - b.gapMm || a.port.portId.localeCompare(b.port.portId))[0];
}

function exitPort(component, entry) {
  const ports = routePorts(component);
  if (!ports.length) return null;
  if (!entry || ports.length === 1) return ports[0];
  const other = ports.filter((port) => port.portId !== entry.portId);
  if (!other.length) return entry;
  return other.map((port) => ({ port, span: distance(entry.sourcePosition, port.sourcePosition) }))
    .sort((a, b) => b.span - a.span || a.port.portId.localeCompare(b.port.portId))[0].port;
}

function priority(component) {
  if (component?.canonicalType === 'OLET') return 0;
  if (['CAP', 'BLIND'].includes(component?.canonicalType)) return 3;
  return routePorts(component).length <= 1 ? 1 : 2;
}

function fallback(components) {
  return Object.freeze(components.map((component, routeIndex) => Object.freeze({
    ...component,
    routeIndex,
    routeEntryPortId: routePorts(component)[0]?.portId || null,
    routeExitPortId: routePorts(component).at(-1)?.portId || null,
    routeGapMm: null,
    routeSequenceBasis: 'SOURCE_ORDER_FALLBACK_NO_HPOS',
  })));
}

export function orderSequentialComponentsByGeometry(components, headPosition, options = {}) {
  if (!Array.isArray(components)) throw new TypeError('Sequential components must be an array.');
  if (!components.length) return Object.freeze([]);
  if (!headPosition) return fallback(components);

  const toleranceMm = Math.max(0, Number(options.toleranceMm ?? DEFAULT_TOLERANCE_MM));
  const remaining = [...components];
  const ordered = [];
  let cursor = headPosition;

  while (remaining.length) {
    const ranked = remaining.map((component) => ({
      component,
      entry: nearestPort(component, cursor),
      priority: priority(component),
    })).sort((a, b) => (
      a.entry.gapMm - b.entry.gapMm
      || a.priority - b.priority
      || a.component.sourceIndex - b.component.sourceIndex
      || a.component.componentId.localeCompare(b.component.componentId)
    ));
    const selected = ranked[0];
    remaining.splice(remaining.findIndex((row) => row.componentId === selected.component.componentId), 1);
    const exit = exitPort(selected.component, selected.entry.port);
    const gapMm = Number.isFinite(selected.entry.gapMm) ? selected.entry.gapMm : null;
    ordered.push(Object.freeze({
      ...selected.component,
      routeIndex: ordered.length,
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
