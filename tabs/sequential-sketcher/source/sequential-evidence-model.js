import { canonicalComponentType, pointFrom, stableToken } from '../sequential-sketcher-contract.js';

const TWO_PORT_TYPES = new Set(['PIPE', 'ELBOW', 'REDUCER', 'VALVE', 'FLANGE', 'GASKET', 'INSTRUMENT', 'COUPLING', 'UNION']);
const TERMINAL_TYPES = new Set(['CAP', 'BLIND']);

function text(value) { return String(value ?? '').trim(); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function clonePoint(value) { const point = pointFrom(value); return point ? { ...point } : null; }
function componentIdentity(child, branchId, sourceIndex) {
  return text(child?.attributes?.NAME || child?.attributes?.REF || child?.name || `${branchId}#CHILD-${sourceIndex + 1}`);
}
function branchIdentity(record) { return text(record?.attributes?.NAME || record?.name); }
function tangentFrom(origin, target) {
  if (!origin || !target) return null;
  const dx = target.x - origin.x; const dy = target.y - origin.y; const dz = target.z - origin.z;
  const length = Math.hypot(dx, dy, dz);
  return length > 1e-9 ? { x: dx / length, y: dy / length, z: dz / length } : null;
}
function readBore(attrs, keys) {
  for (const key of keys) {
    const value = number(attrs?.[key]);
    if (value !== null && value > 0) return value;
  }
  return null;
}
function makePort(componentId, branchId, role, sourcePosition, sourceIndex, extra = {}) {
  return Object.freeze({
    portId: `PORT-${stableToken(`${componentId}|${role}`)}`,
    componentId,
    branchId,
    role,
    sourceIndex,
    sourcePosition: clonePoint(sourcePosition),
    resolvedPosition: null,
    tangent: extra.tangent || null,
    boreMm: extra.boreMm ?? null,
    referenceTarget: text(extra.referenceTarget),
    connectionStatus: 'UNRESOLVED',
  });
}

function buildComponentPorts(componentId, branchId, canonicalType, attrs, sourceIndex) {
  const apos = clonePoint(attrs.APOS || attrs.HPOS);
  const lpos = clonePoint(attrs.LPOS || attrs.TPOS);
  const centre = clonePoint(attrs.POS || attrs.CPOS || attrs.CENTRE || attrs.CENTER);
  const branchPoint = clonePoint(attrs.BPOS || attrs.BRANCH_POS || attrs.BRANCHPOS);
  const inletBore = readBore(attrs, ['INLET_BORE', 'INLETBORE', 'LARGE_BORE', 'LARGEBORE', 'OD1', 'BORE1', 'NPD1']);
  const outletBore = readBore(attrs, ['OUTLET_BORE', 'OUTLETBORE', 'SMALL_BORE', 'SMALLBORE', 'OD2', 'BORE2', 'NPD2']);
  const commonBore = readBore(attrs, ['BORE', 'NOMINAL_BORE', 'NOMINALBORE', 'OUTSIDE_DIAMETER', 'OUTSIDEDIAMETER', 'OD', 'NPD', 'ABORE', 'LBORE', 'HBOR', 'TBOR']);
  const cref = text(attrs.CREF);

  if (TWO_PORT_TYPES.has(canonicalType)) {
    const roles = canonicalType === 'REDUCER' ? ['LARGE_END', 'SMALL_END'] : ['INLET', 'OUTLET'];
    const axial = canonicalType !== 'ELBOW';
    return [
      makePort(componentId, branchId, roles[0], apos, sourceIndex, {
        tangent: axial ? tangentFrom(lpos, apos) : null,
        boreMm: inletBore ?? commonBore,
      }),
      makePort(componentId, branchId, roles[1], lpos, sourceIndex, {
        tangent: axial ? tangentFrom(apos, lpos) : null,
        boreMm: outletBore ?? commonBore,
      }),
    ];
  }

  if (canonicalType === 'TEE') {
    return [
      makePort(componentId, branchId, 'RUN_IN', apos, sourceIndex, {
        tangent: tangentFrom(centre || lpos, apos), boreMm: inletBore ?? commonBore,
      }),
      makePort(componentId, branchId, 'RUN_OUT', lpos, sourceIndex, {
        tangent: tangentFrom(centre || apos, lpos), boreMm: outletBore ?? commonBore,
      }),
      makePort(componentId, branchId, 'BRANCH_OUT', branchPoint || centre, sourceIndex, {
        tangent: branchPoint && centre ? tangentFrom(centre, branchPoint) : null,
        boreMm: readBore(attrs, ['BRANCH_BORE', 'BRANCHBORE', 'OD3', 'BORE3', 'NPD3']) ?? commonBore,
        referenceTarget: cref,
      }),
    ];
  }

  if (canonicalType === 'OLET') {
    return [
      makePort(componentId, branchId, 'HOST_ATTACHMENT', centre || apos, sourceIndex, { boreMm: commonBore }),
      makePort(componentId, branchId, 'BRANCH_OUT', branchPoint || lpos || centre || apos, sourceIndex, {
        tangent: branchPoint && centre ? tangentFrom(centre, branchPoint) : null,
        boreMm: outletBore ?? commonBore,
        referenceTarget: cref,
      }),
    ];
  }

  if (TERMINAL_TYPES.has(canonicalType)) {
    return [makePort(componentId, branchId, 'TERMINAL', apos || lpos || centre, sourceIndex, { boreMm: commonBore })];
  }

  return [];
}

function buildComponent(child, branchId, sourceIndex) {
  const attrs = child?.attributes && typeof child.attributes === 'object' ? child.attributes : {};
  const canonicalType = canonicalComponentType(child?.type || attrs.TYPE);
  if (!canonicalType) return null;
  const sourceComponentId = componentIdentity(child, branchId, sourceIndex);
  const componentId = `COMP-${stableToken(`${branchId}|${sourceComponentId}|${sourceIndex}`)}`;
  const ports = buildComponentPorts(componentId, branchId, canonicalType, attrs, sourceIndex);
  return Object.freeze({
    componentId,
    sourceComponentId,
    sourceName: text(child?.name),
    branchId,
    sourceIndex,
    sourceType: text(child?.type || attrs.TYPE).toUpperCase(),
    canonicalType,
    attributes: attrs,
    ports: Object.freeze(ports),
    geometry: Object.freeze({
      centre: clonePoint(attrs.POS || attrs.CPOS || attrs.CENTRE || attrs.CENTER),
      radiusMm: readBore(attrs, ['BEND_RADIUS', 'BENDRADIUS', 'RADIUS', 'RADI']),
      angleDeg: number(attrs.ANGLE || attrs.BEND_ANGLE || attrs.BENDANGLE || attrs.ANGL),
      eccentricOffsetMm: number(attrs.ECCENTRIC_OFFSET || attrs.ECCENTRICOFFSET),
    }),
    cref: text(attrs.CREF),
  });
}

function buildBranch(record, sourceBranchIndex) {
  const branchId = branchIdentity(record);
  const attrs = record?.attributes && typeof record.attributes === 'object' ? record.attributes : {};
  const children = Array.isArray(record?.children) ? record.children : [];
  const components = children.map((child, sourceIndex) => buildComponent(child, branchId, sourceIndex)).filter(Boolean);
  return Object.freeze({
    branchId,
    sourceBranchIndex,
    sourceRecord: record,
    headPosition: clonePoint(attrs.HPOS),
    tailPosition: clonePoint(attrs.TPOS),
    href: text(attrs.HREF),
    tref: text(attrs.TREF),
    components: Object.freeze(components.sort((a, b) => a.sourceIndex - b.sourceIndex)),
  });
}

function addMulti(map, key, value) {
  const normalized = text(key);
  if (!normalized) return;
  const rows = map.get(normalized) || [];
  if (!rows.some((row) => row.componentId === value.componentId)) rows.push(value);
  map.set(normalized, rows);
}

export function buildSequentialEvidenceModel(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array.');
  const branches = records
    .map((record, index) => String(record?.type || '').toUpperCase() === 'BRANCH' ? buildBranch(record, index) : null)
    .filter((branch) => branch?.branchId);
  const branchIds = new Set();
  for (const branch of branches) {
    if (branchIds.has(branch.branchId)) throw new Error(`Duplicate branch identity: ${branch.branchId}`);
    branchIds.add(branch.branchId);
  }
  const components = branches.flatMap((branch) => branch.components);
  const ports = components.flatMap((component) => component.ports);
  return Object.freeze({
    schema: 'SequentialSourceEvidence.v1',
    branches: Object.freeze(branches),
    components: Object.freeze(components),
    ports: Object.freeze(ports),
  });
}

export function indexSequentialEvidence(model) {
  const componentReferences = new Map();
  for (const component of model.components) {
    addMulti(componentReferences, component.sourceComponentId, component);
    addMulti(componentReferences, component.sourceName, component);
    addMulti(componentReferences, component.attributes?.NAME, component);
    addMulti(componentReferences, component.attributes?.REF, component);
  }
  return Object.freeze({
    branches: new Map(model.branches.map((branch) => [branch.branchId, branch])),
    components: new Map(model.components.map((component) => [component.componentId, component])),
    ports: new Map(model.ports.map((port) => [port.portId, port])),
    componentReferences,
  });
}
