// Builds "Coordinate tab" rows and a CAESARII>PIPINGMODEL>PIPINGELEMENT XML
// document matching the actual input schema read by 3D_Converters'
// InputXML->CII(2019) converter, as a standalone (no-DOM) utility.
// Coordinate tab schema: [branchName, nodeNumber, x, y, z]  (mm)

const M_TO_MM = 1000;
const NODE_NUMBER_START = 100;
const NODE_NUMBER_STEP = 10;

function toMm(meters) {
  return Math.round(Number(meters || 0) * M_TO_MM * 1000) / 1000;
}

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

const SENTINEL_MISSING = '-1.010100';

function num(value, fallback = SENTINEL_MISSING) {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : fallback;
}

function attr(name, value) {
  return `${name}="${esc(value)}"`;
}

function usableCurvatureNodes(bend) {
  const turnAngleDeg = Number(bend?.turnAngleDeg);
  return (bend?.curvatureNodes || []).filter((node) => {
    const angle = Number(node?.angleDeg), nodeNumber = Number(node?.nodeNumber);
    return Number.isFinite(angle) && angle >= 0
      && Number.isFinite(nodeNumber) && nodeNumber > 0
      && (!Number.isFinite(turnAngleDeg) || angle < turnAngleDeg - 1e-7);
  }).slice(0, 3);
}

function bendNodeAttributes(bend) {
  const nodes = usableCurvatureNodes(bend);
  const attrs = [];
  for (let slot = 1; slot <= 3; slot += 1) {
    const node = nodes[slot - 1];
    attrs.push(attr(`ANGLE${slot}`, node ? num(node.angleDeg) : SENTINEL_MISSING));
    attrs.push(attr(`NODE${slot}`, node ? num(node.nodeNumber) : SENTINEL_MISSING));
  }
  return attrs;
}

function bendXml(bend) {
  const radius = Number(bend?.radiusMm);
  if (!Number.isFinite(radius) || radius <= 0) return '';
  const attrs = [
    attr('RADIUS', radius),
    attr('TYPE', num(bend.bendTypeCode, '0')),
    ...bendNodeAttributes(bend),
    attr('NUM_MITER', '0'),
    attr('FITTINGTHICKNESS', SENTINEL_MISSING),
    attr('KFACTOR', SENTINEL_MISSING),
  ];
  return `<BEND ${attrs.join(' ')}/>`;
}

function pipingElementXml(fromRow, toRow, branchInfo, bend = null) {
  const attrs = [
    attr('FROM_NODE', fromRow.nodeNumber),
    attr('TO_NODE', toRow.nodeNumber),
    attr('DELTA_X', num(toRow.x - fromRow.x)),
    attr('DELTA_Y', num(toRow.y - fromRow.y)),
    attr('DELTA_Z', num(toRow.z - fromRow.z)),
    attr('DIAMETER', num(branchInfo.boreMm)),
    attr('WALL_THICK', num(branchInfo.wallThickness)),
    attr('INSUL_THICK', num(branchInfo.insulationThickness)),
    attr('CORR_ALLOW', num(branchInfo.corrosionAllowance)),
    attr('TEMP_EXP_C1', num(branchInfo.t1)),
    attr('TEMP_EXP_C2', num(branchInfo.t2)),
    attr('TEMP_EXP_C3', num(branchInfo.t3)),
    attr('TEMP_EXP_C4', '0'),
    attr('TEMP_EXP_C5', '0'),
    attr('TEMP_EXP_C6', '0'),
    attr('TEMP_EXP_C7', '0'),
    attr('TEMP_EXP_C8', '0'),
    attr('TEMP_EXP_C9', '0'),
    attr('PRESSURE_C1', num(branchInfo.p1)),
    attr('PRESSURE_C2', '0'),
    attr('PRESSURE_C3', '0'),
    attr('PRESSURE_C4', '0'),
    attr('PRESSURE_C5', '0'),
    attr('PRESSURE_C6', '0'),
    attr('PRESSURE_C7', '0'),
    attr('PRESSURE_C8', '0'),
    attr('PRESSURE_C9', '0'),
    attr('MATERIAL_NUM', num(branchInfo.materialCode)),
    attr('FLUID_DENSITY', num(branchInfo.fluidDensity)),
    attr('INSUL_DENSITY', num(branchInfo.insulationDensity)),
    attr('HYDRO_PRESSURE', num(branchInfo.hydroPressure)),
    attr('LINE', branchInfo.lineNo || ''),
    attr('FROM_NAME', fromRow.nodeName),
    attr('TO_NAME', toRow.nodeName),
  ];
  const child = bendXml(bend);
  if (!child) return `<PIPINGELEMENT ${attrs.join(' ')}/>`;
  return `<PIPINGELEMENT ${attrs.join(' ')}>\n${child}\n</PIPINGELEMENT>`;
}

function assertBendExportReady(bendResolution) {
  if (!bendResolution?.hasBlockingErrors) return;
  const first = bendResolution.errors?.[0];
  const error = new Error(first?.message || 'Bend geometry blocks InputXML serialization.');
  error.code = first?.code || 'BEND_GEOMETRY_BLOCKED';
  error.details = first?.details || {};
  throw error;
}

export function buildInputXmlPipingModelXml(branchInfo, coordinateRows, bendResolution = null) {
  assertBendExportReady(bendResolution);
  const elements = [];
  for (let i = 1; i < coordinateRows.length; i += 1) {
    const bend = bendResolution?.bendByIncomingElementIndex?.[i - 1] || null;
    elements.push(pipingElementXml(coordinateRows[i - 1], coordinateRows[i], branchInfo, bend));
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<CAESARII>',
    `<PIPINGMODEL NUMELEMENTS="${elements.length}" NUMREST="0">`,
    ...elements,
    '</PIPINGMODEL>',
    '</CAESARII>',
  ].join('\n');
}

export const _internal = { toMm, SENTINEL_MISSING, bendXml, usableCurvatureNodes };
