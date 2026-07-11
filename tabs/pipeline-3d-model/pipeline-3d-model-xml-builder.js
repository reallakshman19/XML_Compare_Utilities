// Builds Coordinate-tab rows and CAESAR II InputXML-style PIPINGELEMENT XML.
// Coordinate tab schema: [branchName, nodeNumber, x, y, z] (mm)

const M_TO_MM = 1000;
const NODE_NUMBER_START = 100;
const NODE_NUMBER_STEP = 10;
const SENTINEL_MISSING = '-1.010100';
const DEFAULT_MODULUS = '203390.703125';
const DEFAULT_HOT_MODULUS = '178960.625000';
const DEFAULT_POISSONS = '0.292000';
const DEFAULT_PIPE_DENSITY = '0.007833';

function toMm(meters) {
  return Math.round(Number(meters || 0) * M_TO_MM * 1000) / 1000;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function firstText(...values) {
  return values.map(cleanText).find(Boolean) || '';
}

function lineIdentity(branchInfo = {}) {
  return firstText(branchInfo.lineNo, branchInfo.branchName, 'B1');
}

function materialName(branchInfo = {}) {
  const explicit = firstText(branchInfo.materialName, branchInfo.pipeMaterial);
  if (explicit) return explicit;
  return cleanText(branchInfo.materialCode) === '106' ? 'A106 B' : cleanText(branchInfo.materialCode);
}

function nodeLabel(row = {}) {
  return firstText(row.nodeName, row.marker, row.label, `N${row.nodeNumber ?? ''}`);
}

export function buildCoordinateRows(combinedPoints, branchName) {
  return combinedPoints.map((point, index) => ({
    branchName,
    nodeNumber: NODE_NUMBER_START + index * NODE_NUMBER_STEP,
    x: toMm(point.x),
    y: toMm(point.y),
    z: toMm(point.z),
    nodeName: firstText(point.label, `N${NODE_NUMBER_START + index * NODE_NUMBER_STEP}`),
    horizontal: point.horizontal,
  }));
}

export function coordinateRowsToTabText(rows) {
  const header = ['BranchName', 'NodeNumber', 'X(mm)', 'Y(mm)', 'Z(mm)', 'NodeName'].join('\t');
  const lines = rows.map((r) => [r.branchName, r.nodeNumber, r.x, r.y, r.z, nodeLabel(r)].join('\t'));
  return [header, ...lines].join('\n');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function attr(name, value) {
  return `${name}="${esc(value)}"`;
}

function num(value, fallback = SENTINEL_MISSING) {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(6) : fallback;
}

function globalNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : SENTINEL_MISSING;
}

function densityKgM3ToKgCm3(value) {
  if (value === '' || value == null) return SENTINEL_MISSING;
  const n = Number(value);
  return Number.isFinite(n) ? (n / 1000000).toFixed(6) : SENTINEL_MISSING;
}

function caseAttrs(prefix, values = []) {
  return Array.from({ length: 9 }, (_, index) => attr(`${prefix}${index + 1}`, num(values[index])));
}

function hotModAttrs() {
  return Array.from({ length: 9 }, (_, index) => attr(`HOT_MOD${index + 1}`, index === 0 ? DEFAULT_HOT_MODULUS : DEFAULT_MODULUS));
}

function modelAttributes(branchInfo, elementCount) {
  const line = lineIdentity(branchInfo);
  return [
    attr('xmlns', ''),
    attr('JOBNAME', line),
    attr('TIME', new Date().toISOString().slice(0, 19).replace('T', ' ')),
    attr('ISSUE_NO', ''),
    attr('NUMELT', elementCount),
    attr('NUMNOZ', '0'),
    attr('NOHGRS', '0'),
    attr('NUMBEND', '0'),
    attr('NUMRIGID', '0'),
    attr('NUMEXPJNT', '0'),
    attr('NUMREST', '0'),
    attr('NUMFORCMNT', '0'),
    attr('NUMUNFLOAD', '0'),
    attr('NUMWIND', '0'),
    attr('NUMELEOFF', '0'),
    attr('NUMALLOW', '0'),
    attr('NUMISECT', '0'),
    attr('NORTH_Z', '-1'),
    attr('NORTH_Y', '0'),
    attr('NORTH_X', '0'),
  ];
}

function elementMaterialAttrs(branchInfo) {
  return [
    attr('MATERIAL_NUM', num(branchInfo.materialCode)),
    attr('MATERIAL_NAME', materialName(branchInfo)),
    attr('MILL_TOL_PLUS', SENTINEL_MISSING),
    attr('MILL_TOL_MINUS', SENTINEL_MISSING),
    attr('SEAM_WELD', SENTINEL_MISSING),
  ];
}

function physicalAttrs(branchInfo) {
  return [
    attr('MODULUS', DEFAULT_MODULUS),
    ...hotModAttrs(),
    attr('POISSONS', DEFAULT_POISSONS),
    attr('PIPE_DENSITY', DEFAULT_PIPE_DENSITY),
    attr('INSUL_DENSITY', densityKgM3ToKgCm3(branchInfo.insulationDensity)),
    attr('FLUID_DENSITY', densityKgM3ToKgCm3(branchInfo.fluidDensity)),
    attr('REFRACTORY_DENSITY', SENTINEL_MISSING),
    attr('REFRACTORY_THK', SENTINEL_MISSING),
    attr('CLADDING_DEN', SENTINEL_MISSING),
    attr('CLADDING_THK', SENTINEL_MISSING),
    attr('INSUL_CLAD_UNIT_WEIGHT', SENTINEL_MISSING),
  ];
}

function globalCoordinateAttrs(fromRow, toRow, basisNode) {
  return [
    attr('FROM_GLOBAL_X', globalNum(fromRow.x)),
    attr('FROM_GLOBAL_Y', globalNum(fromRow.y)),
    attr('FROM_GLOBAL_Z', globalNum(fromRow.z)),
    attr('TO_GLOBAL_X', globalNum(toRow.x)),
    attr('TO_GLOBAL_Y', globalNum(toRow.y)),
    attr('TO_GLOBAL_Z', globalNum(toRow.z)),
    attr('GLOBAL_COORD_BASIS_NODE', basisNode),
  ];
}

function pipingElementXml(fromRow, toRow, branchInfo, basisNode) {
  const fromName = nodeLabel(fromRow);
  const toName = nodeLabel(toRow);
  const attrs = [
    attr('FROM_NODE', num(fromRow.nodeNumber)),
    attr('TO_NODE', num(toRow.nodeNumber)),
    attr('DELTA_X', num(toRow.x - fromRow.x)),
    attr('DELTA_Y', num(toRow.y - fromRow.y)),
    attr('DELTA_Z', num(toRow.z - fromRow.z)),
    attr('DIAMETER', num(branchInfo.boreMm)),
    attr('WALL_THICK', num(branchInfo.wallThickness)),
    attr('INSUL_THICK', num(branchInfo.insulationThickness)),
    attr('CORR_ALLOW', num(branchInfo.corrosionAllowance)),
    ...caseAttrs('TEMP_EXP_C', [branchInfo.t1, branchInfo.t2, branchInfo.t3]),
    ...caseAttrs('PRESSURE', [branchInfo.p1]),
    attr('HYDRO_PRESSURE', num(branchInfo.hydroPressure)),
    ...physicalAttrs(branchInfo),
    ...elementMaterialAttrs(branchInfo),
    attr('NAME', ''),
    attr('LINE_ID', lineIdentity(branchInfo)),
    attr('FROM_NAME', fromName),
    attr('TO_NAME', toName),
    ...globalCoordinateAttrs(fromRow, toRow, basisNode),
  ];
  return `<PIPINGELEMENT ${attrs.join(' ')}/>`;
}

function unitsXml() {
  return '<UNITS><LENGTH LABEL="mm." FACTOR="25.400000"/><FORCE LABEL="N." FACTOR="4.448000"/><MASS-DYNAMICS LABEL="Kg." FACTOR="0.453590"/><MOMENT-INPUT LABEL="N.m." FACTOR="0.112980"/><MOMENT-OUTPUT LABEL="N.m." FACTOR="0.112980"/><STRESS LABEL="MPa" FACTOR="0.006895"/><TEMP LABEL="C" FACTOR="0.555600"/><PRESSURE LABEL="bars" FACTOR="0.068946"/><EMOD LABEL="MPa" FACTOR="0.006895"/><PDENS LABEL="kg. / cu.cm." FACTOR="0.027680"/><IDENS LABEL="kg. / cu.cm." FACTOR="0.027680"/><FDENS LABEL="kg. / cu.cm." FACTOR="0.027680"/><TRANS_STIFF LABEL="N. / cm." FACTOR="1.751200"/><ROTL_STIFF LABEL="N.m. / deg" FACTOR="0.112980"/><UNIF_LOAD LABEL="N. / cm." FACTOR="1.751200"/><G_LOAD LABEL="g\'s" FACTOR="1.000000"/><WIND_LOAD LABEL="KPa" FACTOR="6.894600"/><ELEVATION LABEL="m." FACTOR="0.025400"/><COMPOUND_LENGTH LABEL="mm." FACTOR="25.400000"/><DIAMETER LABEL="mm." FACTOR="25.400000"/><THICKNESS LABEL="mm." FACTOR="25.400000"/></UNITS>';
}

export function buildInputXmlPipingModelXml(branchInfo, coordinateRows) {
  const elements = [];
  const basisNode = coordinateRows[0]?.nodeNumber ?? NODE_NUMBER_START;
  for (let i = 1; i < coordinateRows.length; i += 1) {
    elements.push(pipingElementXml(coordinateRows[i - 1], coordinateRows[i], branchInfo, basisNode));
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<CAESARII xmlns="COADE" VERSION="11.00" XML_TYPE="Input">',
    `<PIPINGMODEL ${modelAttributes(branchInfo, elements.length).join(' ')}>`,
    ...elements,
    unitsXml(),
    '</PIPINGMODEL>',
    '</CAESARII>',
  ].join('\n');
}

export const _internal = { toMm, SENTINEL_MISSING, lineIdentity, materialName, nodeLabel, densityKgM3ToKgCm3 };