const CHILD_KEYS = Object.freeze([
  'children', 'items', 'nodes', 'members', 'components',
  'branches', 'groups', 'records', 'elements', 'objects',
]);

export function parseSupportSteelJson(value, label = 'JSON input') {
  if (value && typeof value === 'object') return value;
  const text = cleanText(value);
  if (!text) throw new Error(`${label} is empty.`);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message || error}`);
  }
}

export function walkSupportSteelHierarchy(source) {
  const roots = Array.isArray(source) ? source : source?.objects || [source];
  const rows = [];
  walkNodes(roots, [], null, rows);
  return rows;
}

export function parsePoint(value) {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return pointFromObject(value);
  if (typeof value === 'string') return pointFromString(value);
  return null;
}

export function sourceAttributes(node) {
  const attrs = node?.attributes || node?.attrs;
  return attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? attrs : {};
}

export function sourceIdentity(node, attrs = sourceAttributes(node)) {
  return cleanText(attrs.NAME || node?.name || node?.id || node?.tag);
}

export function deriveIdentityRoot(identity, pattern, fallbackSuffix = null) {
  const text = normalizeIdentity(identity);
  if (!text) return '';
  const match = pattern.exec(text);
  if (match) return normalizeIdentity(match[1] || match[0]);
  return fallbackSuffix?.test(text) ? text.replace(fallbackSuffix, '') : '';
}

export function readPosition(attrs, keys) {
  for (const key of keys || []) {
    const point = parsePoint(attrs?.[key]);
    if (point) return point;
  }
  return null;
}

export function sourceType(node, attrs = sourceAttributes(node)) {
  return cleanText(attrs.RAW_TYPE || node?.type || attrs.TYPE).toUpperCase();
}

export function normalizeReference(value) {
  const text = cleanText(value).replace(/\(REF\)$/iu, '');
  const slash = text.match(/\/(?:SL|PS)-[A-Z0-9_.-]+/iu)?.[0];
  return normalizeIdentity(slash || text);
}

export function normalizeIdentity(value) {
  const text = cleanText(value);
  if (!text) return '';
  return text.startsWith('/') ? text : `/${text}`;
}

export function uniquePoints(points) {
  const seen = new Set();
  return points.filter((point) => {
    const key = `${point.x}|${point.y}|${point.z}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cloneJson(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

export function cleanText(value) {
  return String(value ?? '').trim();
}

export function byId(key) {
  return (left, right) => String(left[key]).localeCompare(String(right[key]));
}

function walkNodes(nodes, path, inheritedOwner, rows) {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  list.forEach((node, index) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const attrs = sourceAttributes(node);
    const identity = sourceIdentity(node, attrs);
    const owner = cleanText(attrs.OWNER || inheritedOwner);
    const currentPath = [...path, index];
    rows.push({ node, path: currentPath, owner, identity });
    for (const key of CHILD_KEYS) {
      const children = node[key];
      if (children) walkNodes(children, [...currentPath, key], identity || owner, rows);
    }
  });
}

function pointFromObject(value) {
  const x = numberValue(value.x ?? value.X ?? value.E ?? value.east ?? value.easting);
  const north = numberValue(value.y ?? value.Y ?? value.N ?? value.north ?? value.northing);
  const south = numberValue(value.S ?? value.south ?? value.southing);
  const y = north ?? (south === null ? null : -south);
  const z = numberValue(value.z ?? value.Z ?? value.U ?? value.up ?? value.elevation);
  return x === null || y === null || z === null ? null : { x, y, z };
}

function pointFromString(value) {
  const tokens = String(value).trim().split(/\s+/u);
  const result = {};
  for (let index = 0; index < tokens.length - 1; index += 2) {
    applyAxisToken(result, tokens[index], numberValue(tokens[index + 1]));
  }
  return result.x === undefined || result.y === undefined || result.z === undefined ? null : result;
}

function applyAxisToken(result, rawAxis, number) {
  if (number === null) return;
  const axis = String(rawAxis || '').toUpperCase();
  if (axis === 'E' || axis === 'X') result.x = number;
  if (axis === 'N' || axis === 'Y') result.y = number;
  if (axis === 'S') result.y = -number;
  if (axis === 'U' || axis === 'Z') result.z = number;
  if (axis === 'D') result.z = -number;
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/mm|,/giu, '').trim());
  return Number.isFinite(number) ? number : null;
}
