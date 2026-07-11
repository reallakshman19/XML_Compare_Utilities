// Pure JS geometry helpers for the "Pipeline 3D Model" utility.
// No DOM dependency — parses the 3 pasted tables and produces a combined
// Coordinate-tab-shaped point list (horizontal chainage + X/Y/Z + node name).

const NUMBER_RE = /-?\d+(?:\.\d+)?/g;
const MIN_REFERENCE_SEGMENT_LENGTH = 1e-6;

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

function rotateAndTranslate(x, y, z, anchorX, anchorY, anchorZ, angleDeg) {
  const rad = ((Number(angleDeg) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    globalX: anchorX + (x * cos - y * sin),
    globalY: anchorY + (x * sin + y * cos),
    globalZ: anchorZ + z,
  };
}

function chainGlobalPositions(points) {
  if (!points.length) return points;
  let anchorX = points[0].originX;
  let anchorY = points[0].originY;
  let anchorZ = points[0].originZ;
  let angle = points[0].angleDeg;
  points.forEach((p, i) => {
    if (i > 0 && p.angleDeg !== points[i - 1].angleDeg) {
      const prev = points[i - 1];
      anchorX = prev.globalX;
      anchorY = prev.globalY;
      anchorZ = prev.globalZ;
      angle = p.angleDeg;
    }
    const { globalX, globalY, globalZ } = rotateAndTranslate(p.x, p.y, p.z, anchorX, anchorY, anchorZ, angle);
    p.globalX = globalX;
    p.globalY = globalY;
    p.globalZ = globalZ;
  });
  return points;
}

const AT_POINT_RE = /at\s*point\s*X\s*=\s*(-?[\d.]+)\s*Y\s*=\s*(-?[\d.]+)\s*Z\s*=\s*(-?[\d.]+)/i;
const CONSTANT_WIDTH_RE = /constant\s*width\s+(-?[\d.]+)/i;
const AREA_RE = /^\s*area\s+(-?[\d.]+)/i;
const LENGTH_RE = /^\s*length\s+(-?[\d.]+)/i;

function isAltPointFormatText(text) {
  return AT_POINT_RE.test(text);
}

function splitIntoBlocks(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseAltFormatBlock(blockText) {
  const rawPoints = [];
  let constantWidth = null;
  let area = null;
  let length = null;
  for (const rawLine of splitLines(blockText)) {
    const pointMatch = rawLine.match(AT_POINT_RE);
    if (pointMatch) {
      const [, x, y, z] = pointMatch;
      rawPoints.push({ x: Number(x), y: Number(y), z: Number(z) });
      continue;
    }
    const widthMatch = rawLine.match(CONSTANT_WIDTH_RE);
    if (widthMatch) constantWidth = Number(widthMatch[1]);
    const areaMatch = rawLine.match(AREA_RE);
    if (areaMatch) area = Number(areaMatch[1]);
    const lengthMatch = rawLine.match(LENGTH_RE);
    if (lengthMatch) length = Number(lengthMatch[1]);
  }
  return { rawPoints, meta: { constantWidth, area, length } };
}

function parseAltPointFormat(text) {
  return parseAltFormatBlock(text).rawPoints.map((p, i) => ({
    label: `Point ${i + 1}`,
    x: p.x,
    y: p.y,
    z: p.z,
    originX: 0,
    originY: 0,
    originZ: 0,
    angleDeg: 0,
  }));
}

function bearingDeg(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function normalizeAngleDeg(angle) {
  return ((angle % 360) + 360) % 360;
}

// Kept for diagnostics/regression coverage. For CAD multi-block stitching below,
// we no longer auto-rotate sheets from this reference bearing because that made
// already-in-line CAD sheet blocks display as false reoriented sheets.
function pickReferenceSegment(pts, fromStart) {
  const segments = [];
  const count = Math.min(3, pts.length - 1);
  for (let i = 0; i < count; i += 1) {
    const [a, b] = fromStart ? [pts[i], pts[i + 1]] : [pts[pts.length - 2 - i], pts[pts.length - 1 - i]];
    segments.push({ length: Math.hypot(b.x - a.x, b.y - a.y), bearing: bearingDeg(a, b) });
  }
  return segments.find((segment) => segment.length > MIN_REFERENCE_SEGMENT_LENGTH)
    || segments[0]
    || { length: 0, bearing: 0 };
}

// Blank-line-separated CAD LIST blocks are sheets from the same route, but the
// X/Y/Z rows themselves are still CAD plan coordinates. Stitch them by
// translation only so the first point of a new sheet lands on the previous
// sheet's last point. Do not derive/apply an in-plane rotation: doing so caused
// false preview angles such as Sheet 2 = 75.19° even though the generated route
// continued in-line through the sheet boundary.
function buildMultiSheetTable1(blocks) {
  const points = [];
  blocks.forEach((block, sheetIndex) => {
    const raw = block.rawPoints;
    let angle = 0;
    let anchorX = 0;
    let anchorY = 0;
    let anchorZ = 0;
    if (sheetIndex > 0 && raw.length) {
      const prevLast = points[points.length - 1];
      const firstLocal = raw[0] || { x: 0, y: 0, z: 0 };
      if (prevLast) {
        anchorX = prevLast.globalX - firstLocal.x;
        anchorY = prevLast.globalY - firstLocal.y;
        anchorZ = prevLast.globalZ - firstLocal.z;
      }
    }
    raw.forEach((p, j) => {
      const { globalX, globalY, globalZ } = rotateAndTranslate(p.x, p.y, p.z, anchorX, anchorY, anchorZ, angle);
      points.push({
        label: `Sheet ${sheetIndex + 1} Pt ${j + 1}`,
        x: p.x,
        y: p.y,
        z: p.z,
        originX: round(anchorX),
        originY: round(anchorY),
        originZ: round(anchorZ),
        angleDeg: round(angle, 4),
        globalX,
        globalY,
        globalZ,
        sheetIndex,
        sheetMeta: block.meta,
      });
    });
  });
  return points;
}

export function groupPointsIntoSheets(points) {
  const sheets = [];
  points.forEach((p, i) => {
    const key = p.sheetIndex != null ? `sheet:${p.sheetIndex}` : `angle:${p.angleDeg}`;
    const prev = points[i - 1];
    const prevKey = prev ? (prev.sheetIndex != null ? `sheet:${prev.sheetIndex}` : `angle:${prev.angleDeg}`) : null;
    if (i === 0 || key !== prevKey) {
      sheets.push({ sheetIndex: sheets.length, angleDeg: p.angleDeg, startIndex: i, endIndex: i, meta: p.sheetMeta || null });
    } else {
      sheets[sheets.length - 1].endIndex = i;
    }
  });
  return sheets;
}

export function parseTable1(text) {
  if (isAltPointFormatText(text)) {
    const blocks = splitIntoBlocks(text)
      .map(parseAltFormatBlock)
      .filter((block) => block.rawPoints.length);
    if (blocks.length > 1) return buildMultiSheetTable1(blocks);
    return chainGlobalPositions(parseAltPointFormat(text));
  }
  const points = [];
  for (const rawLine of splitLines(text)) {
    if (isSeparatorLine(rawLine)) continue;
    const tokens = tokenizeRow(rawLine);
    const numericTokens = tokens.filter(isNumericToken).map(Number);
    const labelTokens = tokens.filter((token) => !isNumericToken(token));
    if (numericTokens.length < 3) continue;
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
    if (/^(point|x|y|z|origin.*|angle.*)$/i.test(label)) continue;
    points.push({ label, x, y, z, originX, originY, originZ, angleDeg });
  }
  return chainGlobalPositions(points);
}

export function table1ToTabText(points) {
  const header = ['Point', 'X', 'Y', 'Z', 'OriginGlobalX', 'OriginGlobalY', 'OriginGlobalZ', 'AngleDeg', 'GlobalX', 'GlobalY', 'GlobalZ'].join('\t');
  const lines = points.map((p) =>
    [p.label, p.x, p.y, p.z, p.originX, p.originY, p.originZ, p.angleDeg, round(p.globalX), round(p.globalY), round(p.globalZ)].join('\t'),
  );
  return [header, ...lines].join('\n');
}

const RADIUS_RE = /^\s*radius\s+(-?[\d.]+)/i;
const START_ANGLE_RE = /start\s*angle\s+(-?[\d.]+)/i;
const END_ANGLE_RE = /end\s*angle\s+(-?[\d.]+)/i;

function arcLength(radius, startDeg, endDeg) {
  let sweep = Math.abs(endDeg - startDeg) % 360;
  if (sweep > 180) sweep = 360 - sweep;
  return radius * (sweep * Math.PI) / 180;
}

function parseTable2AltFormat(text) {
  const rows = [];
  let prev = null;
  let cumulative = 0;
  let pendingArc = {};
  for (const rawLine of splitLines(text)) {
    const radiusMatch = rawLine.match(RADIUS_RE);
    if (radiusMatch) { pendingArc.radius = Number(radiusMatch[1]); continue; }
    const startMatch = rawLine.match(START_ANGLE_RE);
    if (startMatch) { pendingArc.start = Number(startMatch[1]); continue; }
    const endMatch = rawLine.match(END_ANGLE_RE);
    if (endMatch) { pendingArc.end = Number(endMatch[1]); continue; }
    const pointMatch = rawLine.match(AT_POINT_RE);
    if (!pointMatch) continue;
    const p = { x: Number(pointMatch[1]), y: Number(pointMatch[2]) };
    if (prev) {
      const chord = Math.hypot(p.x - prev.x, p.y - prev.y);
      const useArc = pendingArc.radius != null && pendingArc.start != null && pendingArc.end != null;
      cumulative += useArc ? arcLength(pendingArc.radius, pendingArc.start, pendingArc.end) : chord;
    }
    rows.push({ horizontal: round(cumulative), elevation: p.y });
    prev = p;
    pendingArc = {};
  }
  return rows;
}

export function parseTable2(text) {
  if (isAltPointFormatText(text)) return parseTable2AltFormat(text);
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

export function parseTable3(text) {
  let rows = [];
  for (const rawLine of splitLines(text)) {
    if (isSeparatorLine(rawLine)) continue;
    const nums = extractNumbers(rawLine);
    if (!nums.length) continue;
    rows.push(nums);
  }
  if (rows.length === 1 && rows[0].length > 1) rows = rows[0].map((n) => [n]);
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
  return Math.hypot(b.globalX - a.globalX, b.globalY - a.globalY);
}

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

export const _internal = { splitLines, extractNumbers, dist2D, pickReferenceSegment, bearingDeg, normalizeAngleDeg };
