// Geometry-only XML readers. No CII reconstruction or effective-property semantics.
export const fail = message => { throw new Error(message); };
export const children = (node, tag) => Array.from(node?.childNodes || [])
  .filter(child => child.nodeType === 1 && (!tag || child.tagName === tag));
export function one(node, tag) {
  const rows = children(node, tag);
  if (rows.length !== 1) fail('XML_EXPECTED_ONE_' + tag);
  return rows[0];
}
export function numeric(value, label) {
  const text = String(value ?? '').trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/.test(text)) fail('XML_NUMBER_INVALID:' + label);
  const result = Number(text.replace(/[dD]/g, 'E'));
  if (!Number.isFinite(result)) fail('XML_NUMBER_NONFINITE:' + label);
  return result;
}
export function integer(value, label, minimum = 0) {
  const result = numeric(value, label);
  if (!Number.isSafeInteger(result) || result < minimum) fail('XML_INTEGER_INVALID:' + label);
  return result;
}
export const nodeId = (value, label) => String(integer(value, label));
export function fieldMap(record, rowTag) {
  const result = new Map();
  children(record, rowTag).forEach((row, r) => children(row, 'Field').forEach((field, f) => {
    const name = field.getAttribute('name');
    if (!name || result.has(name)) fail('XML_FIELD_DUPLICATE_OR_UNNAMED:' + name);
    result.set(name, {value: field.getAttribute('value'), row: r + 1, field: f + 1,
      sourceLine: row.getAttribute('line') || null, name});
  }));
  return result;
}
export function required(map, name) {
  if (!map.has(name)) fail('XML_FIELD_MISSING:' + name);
  return map.get(name);
}
export function sections(parent, tag) {
  const result = new Map();
  for (const section of children(parent, tag)) {
    const name = section.getAttribute('name');
    if (!name || result.has(name)) fail('XML_SECTION_DUPLICATE_OR_UNNAMED:' + name);
    result.set(name, section);
  }
  return result;
}
export function section(map, name) {
  if (!map.has(name)) fail('XML_SECTION_MISSING:' + name);
  return map.get(name);
}
export function assertMillimetres(labels, factors) {
  if (!/^SI\s*\(mm\)$/i.test(String(labels[0]).trim()) ||
      labels.slice(1).some(value => !/^mm\.?$/i.test(String(value).trim())) ||
      factors.some(value => Math.abs(numeric(value, 'native-mm factor') - 25.4) > 1e-8))
    fail('XML_UNSUPPORTED_OR_INCONSISTENT_NATIVE_MM_UNITS');
  return {length: 'mm', diameter: 'mm', wall: 'mm', conversion: 'NONE_NATIVE_VALUES',
    labels: labels.map(value => String(value).trim()), factors: factors.map(Number)};
}
export function indexedRecords(sectionNode, tag) {
  const records = children(sectionNode, tag), ids = new Set();
  records.forEach((record, index) => {
    if (integer(record.getAttribute('index'), 'record index', 1) !== index + 1) fail('XML_RECORD_INDEX_SEQUENCE');
    const id = record.getAttribute('id');
    if (id && ids.has(id)) fail('XML_RECORD_ID_DUPLICATE');
    if (id) ids.add(id);
  });
  return records;
}
