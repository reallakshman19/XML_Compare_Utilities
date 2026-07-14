export const NAVIS_TAG_ISONOTE_AUDIT_SCHEMA = 'navis-tag-isonote-audit/v2';
export const NAVIS_TAG_EVIDENCE_SCHEMA = 'navis-tag-evidence/v2';
export const STAGED_JSON_TREE_SCHEMA = 'staged-json-canonical-tree/v2';
export const IDENTITY_NODE_TRACE_SCHEMA = 'navis-tag-identity-node-trace/v2';
export const NAVIS_TAG_READINESS_SCHEMA = 'navis-tag-isonote-readiness/v1';

export const DEFAULT_NAVIS_TAG_ISONOTE_CONFIG = Object.freeze({
  tableIdentityColumns: ['Name of the element'],
  tableIdentityMode: 'first-non-empty',
  tablePositionMode: 'single',
  tablePositionColumn: 'POS',
  tableEastingColumn: '',
  tableNorthingColumn: '',
  tableElevationColumn: '',
  tablePipeColumns: ['PIPE', 'Branch', 'BranchName', 'Line ID'],
  tableUnits: 'auto',
  jsonIdentityPaths: ['attributes.NAME', 'name'],
  jsonPositionPaths: ['attributes.SUPPORTCOORD', 'attributes.POSI', 'attributes.POS', 'attributes.APOS', 'attributes.LPOS'],
  jsonBranchPaths: ['attributes.OWNER', 'attributes.BRANCH', 'attributes.BRANCHNAME'],
  jsonOdPaths: ['attributes.OUTSIDE_DIAMETER', 'attributes.OD', 'attributes.PIPE_OD'],
  jsonBorePaths: ['attributes.ABORE', 'attributes.LBORE', 'attributes.HBORE', 'attributes.BORE'],
  jsonUnits: 'auto',
  jsonOdUnits: 'mm',
  navisUnits: 'auto',
  supportCoordinateSource: 'prefer-table-fallback-json',
  eastingToleranceMm: 100,
  northingToleranceMm: 100,
  elevationToleranceMm: 100,
  coordinateDisagreementToleranceMm: 100,
  useOdHalfAlternatives: true,
  ambiguityScoreGap: 15,
});

export function text(value) { return String(value ?? '').trim(); }

export function list(value, fallback = []) {
  if (Array.isArray(value)) {
    const out = value.map(text).filter(Boolean);
    return out.length ? out : [...fallback];
  }
  const out = text(value).split(/[\n,]+/).map(text).filter(Boolean);
  return out.length ? out : [...fallback];
}

export function normalizeSupportIdentity(value) {
  return text(value)
    .replace(/^\/+/, '')
    .replace(/\s*\(\s*REF\s*\)\s*$/i, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function supportRoot(value) {
  const normalized = normalizeSupportIdentity(value);
  const match = normalized.match(/(?:^|[^A-Z0-9])(PS|SL)-?(\d+)/i) || normalized.match(/^(PS|SL)-?(\d+)/i);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : '';
}

export function unitScaleToMm(unit, values = []) {
  const normalized = text(unit).toLowerCase();
  const scale = {
    mm: 1, millimeter: 1, millimetre: 1,
    cm: 10, m: 1000, meter: 1000, metre: 1000,
    in: 25.4, inch: 25.4, ft: 304.8, feet: 304.8,
  }[normalized];
  if (scale) return scale;
  const finite = values.map(Number).filter(Number.isFinite).map(Math.abs);
  const max = finite.length ? Math.max(...finite) : 0;
  return max && max < 10000 ? 1000 : 1;
}

function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) ? number : null;
}

export function parseCoordinate(raw, unit = 'auto') {
  if (raw == null || raw === '') return null;
  let point = null;
  if (Array.isArray(raw)) {
    const values = raw.slice(0, 3).map(numeric);
    if (values.length === 3 && values.every(Number.isFinite)) point = { x: values[0], y: values[1], z: values[2] };
  } else if (typeof raw === 'object') {
    const x = numeric(raw.x ?? raw.X ?? raw.e ?? raw.E ?? raw.east ?? raw.Easting);
    const y = numeric(raw.y ?? raw.Y ?? raw.n ?? raw.N ?? raw.north ?? raw.Northing);
    const z = numeric(raw.z ?? raw.Z ?? raw.el ?? raw.EL ?? raw.u ?? raw.U ?? raw.elevation ?? raw.Elevation);
    if ([x, y, z].every(Number.isFinite)) point = { x, y, z };
  } else {
    const source = text(raw);
    const directional = {};
    source.replace(/\b(E|EAST|EASTING|N|NORTH|NORTHING|EL|ELEV|ELEVATION|U|Z)\s*[:=]?\s*(-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)/gi, (_, axis, value) => {
      const key = axis.toUpperCase();
      const number = Number(value);
      if (key.startsWith('E') && !['EL', 'ELEV', 'ELEVATION'].includes(key)) directional.x = number;
      else if (key.startsWith('N')) directional.y = number;
      else directional.z = number;
      return '';
    });
    if ([directional.x, directional.y, directional.z].every(Number.isFinite)) point = directional;
    if (!point) {
      const values = source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.slice(0, 3).map(Number) || [];
      if (values.length === 3 && values.every(Number.isFinite)) point = { x: values[0], y: values[1], z: values[2] };
    }
  }
  if (!point) return null;
  const scale = unitScaleToMm(unit, [point.x, point.y, point.z]);
  return {
    x: point.x * scale,
    y: point.y * scale,
    z: point.z * scale,
    unitScale: scale,
    sourceUnit: text(unit) || 'auto',
  };
}

export function normalizeConfig(input = {}) {
  const defaults = DEFAULT_NAVIS_TAG_ISONOTE_CONFIG;
  return {
    ...defaults,
    ...input,
    tableIdentityColumns: list(input.tableIdentityColumns, defaults.tableIdentityColumns),
    tablePipeColumns: list(input.tablePipeColumns, defaults.tablePipeColumns),
    jsonIdentityPaths: list(input.jsonIdentityPaths, defaults.jsonIdentityPaths),
    jsonPositionPaths: list(input.jsonPositionPaths, defaults.jsonPositionPaths),
    jsonBranchPaths: list(input.jsonBranchPaths, defaults.jsonBranchPaths),
    jsonOdPaths: list(input.jsonOdPaths, defaults.jsonOdPaths),
    jsonBorePaths: list(input.jsonBorePaths, defaults.jsonBorePaths),
    eastingToleranceMm: finiteNumber(input.eastingToleranceMm, defaults.eastingToleranceMm),
    northingToleranceMm: finiteNumber(input.northingToleranceMm, defaults.northingToleranceMm),
    elevationToleranceMm: finiteNumber(input.elevationToleranceMm, defaults.elevationToleranceMm),
    coordinateDisagreementToleranceMm: finiteNumber(input.coordinateDisagreementToleranceMm, defaults.coordinateDisagreementToleranceMm),
    ambiguityScoreGap: finiteNumber(input.ambiguityScoreGap, defaults.ambiguityScoreGap),
    useOdHalfAlternatives: input.useOdHalfAlternatives !== false,
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function firstConfiguredValue(node, paths = []) {
  for (const path of paths) {
    if (!Object.prototype.hasOwnProperty.call(node?.values || {}, path)) continue;
    const value = node.values[path];
    if (value !== '' && value != null) return { path, value };
  }
  return { path: '', value: null };
}
