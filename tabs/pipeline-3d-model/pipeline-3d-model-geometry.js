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

// --- Table 1: Point / X / Y / Z key vertices defining the pipeline polyline ---
export function parseTable1(text) {
  const points = [];
  for (const rawLine of splitLines(text)) {
    if (isSeparatorLine(rawLine)) continue;
    const nums = extractNumbers(rawLine);
    if (nums.length < 3) continue; // needs at least X Y Z
    const [x, y, z] = nums.slice(-3);
    const label = rawLine
      .replace(/\|/g, ' ')
      .replace(new RegExp(nums.slice(-3).map((n) => String(n)).join('|'), 'g'), '')
      .replace(/[\t,]+/g, ' ')
      .trim() || `Point ${points.length + 1}`;
    if (/^(point|x|y|z)$/i.test(label)) continue; // header row
    points.push({ label, x, y, z });
  }
  return points;
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

function dist2D(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Builds cumulative-distance segments along the polyline defined by Table 1 vertices.
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
      dx: length ? (b.x - a.x) / length : 0,
      dy: length ? (b.y - a.y) / length : 0,
      ax: a.x,
      ay: a.y,
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
    addPoint(points, cumulative, v.x, v.y, null, v.label, 'vertex');
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
