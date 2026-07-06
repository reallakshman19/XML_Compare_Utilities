// Pure JS geometry helpers for the "Pipeline 3D Model" utility.
// No DOM dependency — parses the 3 pasted tables and produces a combined
// Coordinate-tab-shaped point list (horizontal chainage + X/Y/Z + node name).

const NUMBER_RE = /-?\d+(?:\.\d+)?/g;

function splitLines(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function extractNumbers(line) {
  const matches = String(line || '').match(NUMBER_RE);
  return matches ? matches.map(Number) : [];
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function isSeparatorLine(line) {
  return /^[-|:\s]+$/.test(line);
}

// Splits a row into cells (tab > pipe > comma/whitespace, whichever the line
// actually uses), so a label like "IP3-IP Start" is classified as ONE
// non-numeric token instead of having its embedded digit ("3") matched by a
// bare numeric regex scan across the whole line.
function tokenizeRow(line) {
  let parts;
  if (line.includes('\t')) parts = line.split('\t');
  else if (line.includes('|')) parts = line.split('|');
  else parts = line.split(/,|\s+/);
  return parts.map((part) => part.trim()).filter((part) => part.length);
}

function isNumericToken(token) {
  return /^-?\d+(?:\.\d+)?$/.test(token);
}

// Rotates (x, y) by angleDeg (in the XY plane) then translates by the origin.
// Z is not rotated — only translated by originZ — since the angle column
// models each sheet's in-plane orientation change (e.g. across a match line),
// not a 3D tilt.
export function transformToGlobal(x, y, z, originX, originY, originZ, angleDeg) {
  const rad = ((Number(angleDeg) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    globalX: originX + (x * cos - y * sin),
    globalY: originY + (x * sin + y * cos),
    globalZ: originZ + z,
  };
}

// --- Table 1: Point / X / Y / Z key vertices, optionally with a per-row
// Origin Global Coordinate (X, Y, Z) and in-plane rotation Angle — used when
// the pipeline route crosses sheets whose local axes are reoriented at a
// shared match-line point. Rows may be:
//   Point  X  Y  Z                                            (3 numbers)
//   Point  X  Y  Z  OriginX  OriginY  OriginZ                  (6 numbers)
//   Point  X  Y  Z  OriginX  OriginY  OriginZ  AngleDeg         (7 numbers)
// Legacy 3-number rows default to Origin (0,0,0) and Angle 0, so GlobalX/Y/Z
// equal the local X/Y/Z unchanged.
export function parseTable1(text) {
  const points = [];
  for (const rawLine of splitLines(text)) {
    if (isSeparatorLine(rawLine)) continue;
    const tokens = tokenizeRow(rawLine);
    const numericTokens = tokens.filter(isNumericToken).map(Number);
    const labelTokens = tokens.filter((token) => !isNumericToken(token));
    if (numericTokens.length < 3) continue; // needs at least X Y Z
    let x, y, z, originX, originY, originZ, angleDeg;
    if (numericTokens.length >= 7) {
      [x, y, z, originX, originY, originZ, angleDeg] = numericTokens.slice(-7);
    } else if (numericTokens.length === 6) {
      [x, y, z, originX, originY, originZ] = numericTokens.slice(-6);
      angleDeg = 0;
    } else {
      [x, y, z] = numericTokens.slice(-3);
      originX = 0;
      originY = 0;
      originZ = 0;
      angleDeg = 0;
    }
    const label = labelTokens.join(' ').trim() || `Point ${points.length + 1}`;
    if (/^(point|x|y|z|origin.*|angle.*)$/i.test(label)) continue; // header row
    const { globalX, globalY, globalZ } = transformToGlobal(x, y, z, originX, originY, originZ, angleDeg);
    points.push({ label, x, y, z, originX, originY, originZ, angleDeg, globalX, globalY, globalZ });
  }
  return points;
}

export function table1ToTabText(points) {
  const header = ['Point', 'X', 'Y', 'Z', 'OriginGlobalX', 'OriginGlobalY', 'OriginGlobalZ', 'AngleDeg', 'GlobalX', 'GlobalY', 'GlobalZ'].join('\t');
  const lines = points.map((p) =>
    [p.label, p.x, p.y, p.z, p.originX, p.originY, p.originZ, p.angleDeg, round(p.globalX), round(p.globalY), round(p.globalZ)].join('\t'),
  );
  return [header, ...lines].join('\n');
}

// --- Table 2: Horizontal (m) vs Grade Elevation (m) station list ---
export function parseTable2(text) {
  const rows = [];
  for (const rawLine of splitLines(text)) {
    if (isSeparatorLine(rawLine)) continue;
    const nums = extractNumbers(rawLine);
    if (nums.length < 2) continue;
    const [horizontal, elevation] = nums;
    rows.push({ horizontal, elevation });
  }
  rows.sort((a, b) => a.horizontal - b.horizontal);
  return rows;
}

// --- Table 3: Marker segment lengths / cumulative horizontal distances ---
export function parseTable3(text) {
  let rows = [];
  for (const rawLine of splitLines(text)) {
    if (isSeparatorLine(rawLine)) continue;
    const nums = extractNumbers(rawLine);
    if (!nums.length) continue;
    rows.push(nums);
  }
  if (rows.length === 1 && rows[0].length > 1) {
    rows = rows[0].map((n) => [n]);
  }
  const allSingle = rows.every((r) => r.length === 1);
  if (allSingle) {
    let cumulative = 0;
    return rows.map((r, i) => {
      cumulative += r[0];
      return { index: i + 1, length: r[0], cumulative: round(cumulative) };
    });
  }
  return rows.map((r, i) => ({
    index: i + 1,
    length: r.length >= 2 ? r[r.length - 2] : r[0],
    cumulative: r[r.length - 1],
  }));
}

// Distance between two Table-1 vertices in the GLOBAL frame — this is what
// makes crossing a match line with a reoriented sheet work: a "Match line"
// row ending one sheet and a "Match line" row starting the next should
// resolve to (near-)identical global coordinates, giving a ~0-length pivot
// segment, while all real segments use true global bearing.
function dist2D(a, b) {
  return Math.hypot(b.globalX - a.globalX, b.globalY - a.globalY);
}

// Builds cumulative-distance segments along the polyline defined by Table 1
// vertices' GLOBAL coordinates.
export function buildSegments(vertices) {
  const segments = [];
  let cumulative = 0;
  for (let i = 1; i < vertices.length; i += 1) {
    const a = vertices[i - 1];
    const b = vertices[i];
    const length = dist2D(a, b);
    const start = cumulative;
    cumulative += length;
    segments.push({
      start,
      end: cumulative,
      length,
      dx: length ? (b.globalX - a.globalX) / length : 0,
      dy: length ? (b.globalY - a.globalY) / length : 0,
      ax: a.globalX,
      ay: a.globalY,
    });
  }
  return segments;
}

export function interpolateXY(segments, horizontal) {
  if (!segments.length) return { x: horizontal, y: 0 };
  if (horizontal <= segments[0].start) {
    const s = segments[0];
    return { x: s.ax, y: s.ay };
  }
  const last = segments[segments.length - 1];
  if (horizontal >= last.end) {
    const local = horizontal - last.start;
    return { x: last.ax + local * last.dx, y: last.ay + local * last.dy };
  }
  const seg = segments.find((s) => horizontal >= s.start && horizontal <= s.end) || last;
  const local = horizontal - seg.start;
  return { x: seg.ax + local * seg.dx, y: seg.ay + local * seg.dy };
}

export function interpolateElevation(table2Rows, horizontal) {
  if (!table2Rows.length) return 0;
  if (horizontal <= table2Rows[0].horizontal) return table2Rows[0].elevation;
  const last = table2Rows[table2Rows.length - 1];
  if (horizontal >= last.horizontal) return last.elevation;
  for (let i = 1; i < table2Rows.length; i += 1) {
    const a = table2Rows[i - 1];
    const b = table2Rows[i];
    if (horizontal >= a.horizontal && horizontal <= b.horizontal) {
      const span = b.horizontal - a.horizontal;
      const t = span ? (horizontal - a.horizontal) / span : 0;
      return a.elevation + t * (b.elevation - a.elevation);
    }
  }
  return last.elevation;
}

function addPoint(map, horizontal, x, y, z, label, source) {
  const key = round(horizontal, 2).toFixed(2);
  const existing = map.get(key);
  if (existing) {
    if (label && !existing.label) existing.label = label;
    else if (label && existing.label && !existing.label.includes(label)) existing.label = `${existing.label} / ${label}`;
    if (z != null && existing.z == null) existing.z = z;
    if (existing.source !== 'vertex' && source === 'vertex') existing.source = source;
    return;
  }
  map.set(key, { horizontal: round(horizontal, 2), x: round(x), y: round(y), z: z == null ? null : round(z), label: label || '', source });
}

// Merges the 3 tables into one sorted, de-duplicated coordinate list.
export function buildCombinedCoordinateTable({ table1Text, table2Text, table3Text }) {
  const vertices = parseTable1(table1Text);
  const stations = parseTable2(table2Text);
  const markers = parseTable3(table3Text);
  const segments = buildSegments(vertices);

  const points = new Map();
  let cumulative = 0;
  vertices.forEach((v, i) => {
    if (i > 0) cumulative += dist2D(vertices[i - 1], v);
    addPoint(points, cumulative, v.globalX, v.globalY, null, v.label, 'vertex');
  });
  stations.forEach((row) => {
    const xy = interpolateXY(segments, row.horizontal);
    addPoint(points, row.horizontal, xy.x, xy.y, row.elevation, '', 'table2');
  });
  markers.forEach((row) => {
    const xy = interpolateXY(segments, row.cumulative);
    addPoint(points, row.cumulative, xy.x, xy.y, null, `Marker ${row.index}`, 'marker');
  });

  const sorted = [...points.values()].sort((a, b) => a.horizontal - b.horizontal);
  sorted.forEach((p) => {
    if (p.z == null) p.z = round(interpolateElevation(stations, p.horizontal));
    if (!p.label) p.label = `STA ${p.horizontal.toFixed(1)}`;
  });
  return sorted;
}

export const _internal = { splitLines, extractNumbers, dist2D };
