// Builds "Coordinate tab" rows and a Custom-Input-style CII(2019) XML document,
// reusing the schema of the XML->CII(2019) Workflow's Custom Input (Branch +
// Coordinate tabs) in the 3D_Converters repo, as a standalone (no-DOM) utility.
// Coordinate tab schema: [branchName, nodeNumber, x, y, z]  (mm)
// Branch tab schema: [branchName, nodeNumber, boreMm, wallThickness, p1, t1, t2, t3, fluidDensity]

const M_TO_MM = 1000;
const NODE_NUMBER_START = 100;
const NODE_NUMBER_STEP = 10;

function toMm(meters) {
  return Math.round(Number(meters || 0) * M_TO_MM * 1000) / 1000;
}

// Turns the combined coordinate list (from pipeline-3d-model-geometry.js) into
// Coordinate-tab rows: one row per point, with sequential CII node numbers and
// the marker/point label carried alongside as the node name.
export function buildCoordinateRows(combinedPoints, branchName) {
  return combinedPoints.map((point, index) => ({
    branchName,
    nodeNumber: NODE_NUMBER_START + index * NODE_NUMBER_STEP,
    x: toMm(point.x),
    y: toMm(point.y),
    z: toMm(point.z),
    nodeName: point.label || '',
    horizontal: point.horizontal,
  }));
}

export function coordinateRowsToTabText(rows) {
  const header = ['BranchName', 'NodeNumber', 'X(mm)', 'Y(mm)', 'Z(mm)', 'NodeName'].join('\t');
  const lines = rows.map((r) => [r.branchName, r.nodeNumber, r.x, r.y, r.z, r.nodeName].join('\t'));
  return [header, ...lines].join('\n');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function tag(name, value) {
  return `<${name}>${esc(value)}</${name}>`;
}

function nodeXml(row, branchInfo) {
  const position = `${row.x} ${row.y} ${row.z}`;
  return [
    '<Node>',
    tag('NodeNumber', row.nodeNumber),
    tag('NodeName', row.nodeName),
    tag('BoreMm', branchInfo.boreMm),
    tag('WallThickness', branchInfo.wallThickness),
    tag('MaterialCode', branchInfo.materialCode),
    tag('Position', position),
    '</Node>',
  ].join('');
}

// Builds the Root > Branch > Node XML, mirroring buildCustomInputXml() in
// 3D_Converters (converters/xml-cii2019-core/custom-input-xml-builder.js),
// with marker/point names passed through as each Node's NodeName.
export function buildPipeline3dModelXml(branchInfo, coordinateRows) {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<Root>', '<Branch>'];
  out.push(tag('Branchname', branchInfo.branchName));
  out.push(tag('LineNo', branchInfo.lineNo));
  out.push('<Pressure>', tag('Pressure1', branchInfo.p1), '</Pressure>');
  out.push(
    '<Temperature>',
    tag('Temperature1', branchInfo.t1),
    tag('Temperature2', branchInfo.t2),
    tag('Temperature3', branchInfo.t3),
    '</Temperature>',
  );
  out.push(tag('FluidDensity', branchInfo.fluidDensity));
  out.push(tag('MaterialCode', branchInfo.materialCode));
  coordinateRows.forEach((row) => out.push(nodeXml(row, branchInfo)));
  out.push('</Branch>', '</Root>');
  return out.join('\n');
}

export const _internal = { toMm };
