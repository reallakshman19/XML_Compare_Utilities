import { aggregatePivotValues } from './table-categorized-pivot-aggregators.js';
import { normalizePivotSpec } from './table-categorized-pivot-spec-contracts.js';

export const TABLE_CATEGORIZED_PIVOT_VIEW_MODEL_SCHEMA = 'PivotViewModel.v1';

export function buildPivotViewModel({ graph = null, pivotSpec = null, fieldCatalog = null } = {}) {
  const diagnostics = [];
  if (!graph || !Array.isArray(graph.nodes)) return emptyModel(diagnostics, 'pivot_graph_missing', 'Pivot graph is missing or invalid.');
  if (!fieldCatalog || !Array.isArray(fieldCatalog.fields)) return emptyModel(diagnostics, 'pivot_field_catalog_missing', 'FieldCatalog is missing or invalid.');
  const spec = normalizePivotSpec(pivotSpec || {});
  if (!spec.values.length) return emptyModel(diagnostics, 'pivot_values_missing', 'PivotSpec has no value fields.');
  const fieldMap = new Map(fieldCatalog.fields.map((field) => [field.fieldId, field]));
  const records = graphRecords(graph, fieldMap);
  const filtered = records.filter((record) => passesFilters(record, spec.filters));
  const rowFields = resolveFields(spec.rows, fieldMap, diagnostics);
  const columnFields = resolveFields(spec.columns, fieldMap, diagnostics);
  const valueFields = resolveValues(spec.values, fieldMap, diagnostics);
  const columns = dimensionKeys(filtered, columnFields, 'column');
  const rows = rowKeys(filtered, rowFields).map((row) => rowModel(row, columns, valueFields));
  return freeze({ schema: TABLE_CATEGORIZED_PIVOT_VIEW_MODEL_SCHEMA, rowFields, columnFields, valueFields, columns, rows, totals: totalsModel(rows, valueFields), diagnostics });
}

function graphRecords(graph, fieldMap) {
  return (graph.nodes || []).flatMap((node, nodeIndex) => (node.evidence?.length ? node.evidence : [{ rawByHeader: node.fields || {}, sourceRefs: node.sourceRefs || [] }]).map((evidence) => ({ nodeIndex, nodeId: node.id, sourceRefs: unique([...(node.sourceRefs || []), ...(evidence.sourceRefs || [])]), values: valuesForEvidence(evidence, fieldMap, node.fields || {}) })));
}

function valuesForEvidence(evidence, fieldMap, nodeFields) {
  const raw = evidence.rawByHeader || {};
  const out = {};
  for (const field of fieldMap.values()) out[field.fieldId] = raw[field.header] ?? raw[field.columnId] ?? nodeFields[field.header] ?? nodeFields[field.columnId] ?? '';
  return out;
}

function passesFilters(record, filters = []) {
  return filters.every((filter) => {
    const value = String(record.values?.[filter.fieldId] ?? '');
    const include = arrayOfText(filter.includeValues);
    const exclude = arrayOfText(filter.excludeValues);
    return (!include.length || include.includes(value)) && (!exclude.length || !exclude.includes(value));
  });
}

function resolveFields(items, fieldMap, diagnostics) {
  return freeze((items || []).map((item) => fieldMap.get(item.fieldId) ? fieldDescriptor(fieldMap.get(item.fieldId), item) : missingField(item, diagnostics)).filter(Boolean));
}

function resolveValues(items, fieldMap, diagnostics) {
  return freeze((items || []).map((item) => {
    const field = fieldMap.get(item.fieldId);
    if (!field) return missingField(item, diagnostics);
    return freeze({ ...fieldDescriptor(field, item), aggregate: item.aggregate || 'count', label: item.label || field.label });
  }).filter(Boolean));
}

function fieldDescriptor(field, item = {}) {
  return freeze({ fieldId: field.fieldId, label: item.label || field.label || field.header, type: field.type, role: field.role });
}

function missingField(item, diagnostics) {
  diagnostics.push(diag('BLOCKER', 'pivot_field_unknown', `Pivot references unknown fieldId: ${item?.fieldId}.`, item?.fieldId));
  return null;
}

function dimensionKeys(records, fields, prefix) {
  const seen = new Set(), out = [];
  for (const record of records) {
    const values = fields.map((field) => String(record.values?.[field.fieldId] ?? ''));
    const key = values.join('\u001f') || '__all__';
    if (!seen.has(key)) { seen.add(key); out.push(freeze({ [`${prefix}Key`]: key, values: freeze(values), label: values.filter(Boolean).join(' / ') || '(all)' })); }
  }
  return freeze(out.length ? out : [freeze({ [`${prefix}Key`]: '__all__', values: freeze([]), label: '(all)' })]);
}

function rowKeys(records, fields) {
  const map = new Map();
  for (const record of records) {
    const values = fields.map((field) => String(record.values?.[field.fieldId] ?? ''));
    const rowKey = values.join('\u001f') || '__all__';
    if (!map.has(rowKey)) map.set(rowKey, { rowKey, values, records: [] });
    map.get(rowKey).records.push(record);
  }
  return [...map.values()].length ? [...map.values()] : [{ rowKey: '__all__', values: [], records: [] }];
}

function rowModel(row, columns, valueFields) {
  const cells = columns.map((column) => cellModel(row.records.filter((record) => recordColumnKey(record, column) === column.columnKey), column, valueFields));
  return freeze({ rowKey: row.rowKey, values: freeze(row.values), label: row.values.filter(Boolean).join(' / ') || '(all)', cells: freeze(cells), sourceRefs: freeze(unique(row.records.flatMap((record) => record.sourceRefs))) });
}

function recordColumnKey(record, column) {
  const values = column.values || [];
  return values.length ? values.join('\u001f') : '__all__';
}

function cellModel(records, column, valueFields) {
  const diagnostics = [];
  const values = Object.fromEntries(valueFields.map((field) => {
    const result = aggregatePivotValues(records.map((record) => ({ value: record.values[field.fieldId], sourceRefs: record.sourceRefs })), field);
    diagnostics.push(...result.diagnostics);
    return [field.label, freeze({ value: result.value, aggregate: field.aggregate, fieldId: field.fieldId, sourceRefs: result.sourceRefs })];
  }));
  return freeze({ columnKey: column.columnKey, values: freeze(values), sourceRefs: freeze(unique(records.flatMap((record) => record.sourceRefs))), diagnostics: freeze(diagnostics) });
}

function totalsModel(rows, valueFields) {
  const entries = Object.fromEntries(valueFields.map((field) => [field.label, aggregatePivotValues(rows.flatMap((row) => row.cells.flatMap((cell) => ({ value: cell.values[field.label]?.value, sourceRefs: cell.values[field.label]?.sourceRefs || [] }))), field)]));
  return freeze({ values: freeze(Object.fromEntries(Object.entries(entries).map(([label, item]) => [label, freeze({ value: item.value, sourceRefs: item.sourceRefs })]))) });
}

function emptyModel(diagnostics, code, message) {
  diagnostics.push(diag('BLOCKER', code, message));
  return freeze({ schema: TABLE_CATEGORIZED_PIVOT_VIEW_MODEL_SCHEMA, rowFields: [], columnFields: [], valueFields: [], columns: [], rows: [], totals: {}, diagnostics });
}

function arrayOfText(value) { return Object.freeze((Array.isArray(value) ? value : value == null ? [] : [value]).map((item) => String(item))); }
function unique(values = []) { return [...new Set(values.filter((value) => String(value ?? '') !== ''))]; }
function diag(severity, code, message, ref = '') { return Object.freeze({ severity, status: severity === 'BLOCKER' ? 'FAIL' : 'PASS', code, message, ref }); }
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
