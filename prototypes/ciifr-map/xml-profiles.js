import {children, one, numeric, integer, nodeId, fieldMap, required, sections,
  section, assertMillimetres, indexedRecords, fail} from './xml-utils.js';

const names = {
  F05: ['FROM_NODE','TO_NODE','DELTA_X','DELTA_Y','DELTA_Z','DIAMETER','WALL_THICK'],
  R4: ['from_node','to_node','delta_x','delta_y','delta_z','outside_diameter','wall_thickness']
};
function element(record, kind, index) {
  if (kind === 'R4' && (!record.getAttribute('id') || record.getAttribute('kind') !== 'element'))
    fail('XML_R4_ELEMENT_RECORD_ID_OR_KIND_REQUIRED');
  const fields = fieldMap(record, kind === 'F05' ? 'Numeric' : 'Row');
  const values = names[kind].map(name => required(fields, name));
  const recordId = record.getAttribute('id') || 'PIPINGELEMENT[' + (index + 1) + ']';
  const witness = 'ELEMENTS/' + recordId;
  const read = i => numeric(values[i].value, witness + '/' + values[i].name);
  const od = read(5), wall = read(6);
  if (od <= 0 || wall < 0) fail('XML_ELEMENT_DIMENSIONS_INVALID:' + witness);
  return {index, from: nodeId(values[0].value, witness + '/FROM'),
    to: nodeId(values[1].value, witness + '/TO'), delta: [read(2), read(3), read(4)],
    od, wall, witness, xmlWitness: {section: 'ELEMENTS', recordId, recordIndex: index + 1,
      fields: values.map(value => ({...value}))}};
}
function f05Units(map) {
  const records = indexedRecords(section(map, 'UNITS'), 'Record');
  if (records.length !== 28) fail('XML_F05_UNITS_RECORD_COUNT');
  const label = index => one(records[index], 'UnitLabel').getAttribute('value');
  const factors = new Map(records.slice(0, 4).flatMap(rec => [...fieldMap(rec, 'Numeric')]));
  return assertMillimetres([label(4), label(6), label(26), label(27)],
    [1,21,22].map(index => required(factors, 'UNIT_FACTOR_' + index).value));
}
function f05Seeds(map) {
  const records = indexedRecords(section(map, 'COORDS'), 'Record');
  if (!records.length) fail('XML_COORDINATE_COUNT_REQUIRED');
  const count = integer(required(fieldMap(records[0], 'Numeric'), 'COORD_COUNT').value, 'COORD_COUNT');
  if (records.length !== count + 1) fail('XML_COORDINATE_COUNT_MISMATCH');
  return records.slice(1).map((rec, index) => {
    const fields = fieldMap(rec, 'Numeric');
    return {node: nodeId(required(fields, 'NODE').value, 'COORDS NODE'),
      xyz: ['X','Y','Z'].map(axis => numeric(required(fields, axis).value, 'COORDS ' + axis)),
      witness: 'COORDS/Record[' + (index + 2) + ']'};
  });
}
function f05(root) {
  if (root.getAttribute('SCHEMA') !== 'RichInputXML-P1.v1.1' ||
      root.getAttribute('XML_TYPE') !== 'RichInput' || root.getAttribute('DIALECT') !== 'CII-V14')
    fail('XML_UNSUPPORTED_F05_PROFILE');
  const model = one(root, 'PIPINGMODEL'), map = sections(one(model, 'SECTIONS'), 'SECTION');
  const elementsNode = section(map, 'ELEMENTS');
  const records = indexedRecords(elementsNode, 'PIPINGELEMENT');
  const count = integer(model.getAttribute('NUMELT'), 'NUMELT', 1);
  const control = indexedRecords(section(map, 'CONTROL'), 'Record');
  if (count !== records.length || integer(elementsNode.getAttribute('records'), 'ELEMENTS records') !== count ||
      integer(required(fieldMap(control[0], 'Numeric'), 'ELEMENTS').value, 'CONTROL ELEMENTS') !== count)
    fail('XML_ELEMENT_COUNT_MISMATCH');
  return {profile: 'F05 RichInputXML-P1.v1.1', elements: records.map((rec, i) => element(rec, 'F05', i)),
    units: f05Units(map), seeds: f05Seeds(map), claimedCii: {status: 'NOT_PRESENT'}};
}
function r4Units(map) {
  const units = fieldMap(one(section(map, 'UNITS'), 'Record'), 'Row');
  return assertMillimetres(['CCVNAME','CCVLEN','CCVDIA','CCVTHK'].map(name => required(units, name).value),
    ['CNVLEN','CNVDIA','CNVTHK'].map(name => required(units, name).value));
}
function r4Seeds(map) {
  const rows = children(one(section(map, 'COORDS'), 'Record'), 'Row');
  if (!rows.length) fail('XML_COORDINATE_COUNT_REQUIRED');
  const countFields = children(rows[0], 'Field');
  if (countFields.length !== 1 || countFields[0].getAttribute('name') !== 'coordinate_count_001')
    fail('XML_COORDINATE_COUNT_REQUIRED');
  const count = integer(countFields[0].getAttribute('value'), 'coordinate count');
  if (count !== rows.length - 1) fail('XML_COORDINATE_COUNT_MISMATCH');
  return rows.slice(1).map((row, index) => {
    const fields = children(row, 'Field');
    if (row.getAttribute('key') !== 'coordinate' || fields.length !== 4) fail('XML_COORDINATE_ROW_INVALID');
    fields.forEach((field, col) => {
      if (field.getAttribute('name') !== 'coordinate_' + String(index * 4 + col + 1).padStart(3, '0'))
        fail('XML_COORDINATE_FIELD_SEQUENCE');
    });
    return {node: nodeId(fields[0].getAttribute('value'), 'COORDS NODE'),
      xyz: fields.slice(1).map(field => numeric(field.getAttribute('value'), 'COORDS XYZ')),
      witness: 'COORDS/Row[' + (index + 2) + ']'};
  });
}
function r4(root) {
  if (root.getAttribute('schema') !== 'RichInputXMLv2.1' ||
      root.getAttribute('profile') !== 'CII-V14-ASCII-CRLF-B001') fail('XML_UNSUPPORTED_R4_PROFILE');
  const map = sections(one(root, 'Sections'), 'Section');
  const records = indexedRecords(section(map, 'ELEMENTS'), 'Record');
  const control = fieldMap(one(section(map, 'CONTROL'), 'Record'), 'Row');
  if (!records.length || integer(required(control, 'elements').value, 'CONTROL elements') !== records.length)
    fail('XML_ELEMENT_COUNT_MISMATCH');
  const sha256 = root.getAttribute('source-sha256');
  if (!/^[a-f0-9]{64}$/i.test(sha256 || '')) fail('XML_CII_PROVENANCE_CLAIM_INVALID');
  const bytes = integer(root.getAttribute('source-bytes'), 'claimed CII bytes', 1);
  return {profile: 'R4 RichInputXMLv2.1 / CII-V14-ASCII-CRLF-B001',
    elements: records.map((rec, i) => element(rec, 'R4', i)), units: r4Units(map), seeds: r4Seeds(map),
    claimedCii: {status: 'CLAIMED_NOT_REVERIFIED', sha256: sha256.toLowerCase(), bytes}};
}
export function extractXmlProfile(document) {
  const root = document?.documentElement;
  if (!root || root.namespaceURI || document.getElementsByTagName('parsererror').length)
    fail('XML_PARSE_ERROR_OR_UNSUPPORTED_NAMESPACE');
  if (root.tagName === 'CAESARII') return f05(root);
  if (root.tagName === 'RichInputXMLv2') return r4(root);
  fail('XML_UNSUPPORTED_PROFILE');
}
