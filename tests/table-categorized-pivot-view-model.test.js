import assert from 'node:assert/strict';

import { buildFieldCatalog } from '../xml-compare/table-categorizer/table-categorized-field-catalog.js';
import { buildPivotViewModel } from '../xml-compare/table-categorizer/table-categorized-pivot-view-model.js';
import { buildCategorizedGraph } from '../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { exportCategorizedGraphArtifacts } from '../xml-compare/table-categorizer/table-categorized-xml-exporter.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';

const source = parseTableSource([
  'ID,Region,Quarter,Amount,Active,Item',
  '1,East,Q1,10,yes,A',
  '2,East,Q1,20,yes,A',
  '3,East,Q2,,yes,B',
  '4,West,Q1,bad,yes,C',
  '5,West,Q2,7,no,D',
].join('\n'), { sourceId: 'S1', delimiterMode: 'comma' });
const fieldCatalog = buildFieldCatalog([source]);
const byHeader = Object.fromEntries(fieldCatalog.fields.map((field) => [field.header, field]));
const profile = {
  schema: 'UniversalCategorizerProfile.v1', profileId: 'pivot-vm-test', displayName: 'Pivot VM Test', duplicateKeyPolicy: 'merge-sourceRefs', multiValuePolicy: 'single-value', coordinateCluster: { unit: 'mm', tolerance: 1 }, joins: [], rootPartitions: [], exportPolicy: { includeDiagnosticsElement: false },
  levelDefinitions: [{ levelId: 'Root', displayName: 'Root', levelType: 'container', creationMode: 'static', key: 'ROOT', documentRoot: true, children: [
    { levelId: 'Row', displayName: 'Row', xmlTag: 'Row', levelType: 'occurrence', creationMode: 'one-per-row', children: [] },
  ] }],
};
const graph = buildCategorizedGraph(profile, [source]);

function spec(extra = {}) {
  return {
    filters: [{ fieldId: byHeader.Active.fieldId, includeValues: ['yes'] }],
    rows: [{ fieldId: byHeader.Region.fieldId }],
    columns: [{ fieldId: byHeader.Quarter.fieldId }],
    values: [
      { fieldId: byHeader.ID.fieldId, aggregate: 'count', label: 'Count IDs' },
      { fieldId: byHeader.Item.fieldId, aggregate: 'countDistinct', label: 'Distinct Items' },
      { fieldId: byHeader.Amount.fieldId, aggregate: 'sum', label: 'Amount Sum' },
      { fieldId: byHeader.Amount.fieldId, aggregate: 'average', label: 'Amount Avg' },
      { fieldId: byHeader.Amount.fieldId, aggregate: 'min', label: 'Amount Min' },
      { fieldId: byHeader.Amount.fieldId, aggregate: 'max', label: 'Amount Max' },
      { fieldId: byHeader.Item.fieldId, aggregate: 'first', label: 'First Item' },
      { fieldId: byHeader.Item.fieldId, aggregate: 'last', label: 'Last Item' },
      { fieldId: byHeader.Item.fieldId, aggregate: 'list', label: 'Item List' },
      { fieldId: byHeader.Item.fieldId, aggregate: 'listDistinct', label: 'Distinct Item List' },
    ],
    ...extra,
  };
}

const beforeGraph = JSON.stringify(graph);
const beforeXml = exportCategorizedGraphArtifacts({ graph, profile, validationResults: [], sources: [source] }).xmlText;
const model = buildPivotViewModel({ graph, pivotSpec: spec(), fieldCatalog });

assert.equal(model.schema, 'PivotViewModel.v1');
assert.deepEqual(model.rowFields.map((field) => field.label), ['Region']);
assert.deepEqual(model.columnFields.map((field) => field.label), ['Quarter']);
assert.equal(model.valueFields.length, 10);
assert.deepEqual(model.columns.map((column) => column.label), ['Q1', 'Q2']);
assert.deepEqual(model.rows.map((row) => row.label), ['East', 'West']);

const east = model.rows.find((row) => row.label === 'East');
const west = model.rows.find((row) => row.label === 'West');
const eastQ1 = east.cells.find((cell) => cell.columnKey === 'Q1');
const eastQ2 = east.cells.find((cell) => cell.columnKey === 'Q2');
const westQ1 = west.cells.find((cell) => cell.columnKey === 'Q1');
const westQ2 = west.cells.find((cell) => cell.columnKey === 'Q2');

assert.equal(eastQ1.values['Count IDs'].value, 2);
assert.equal(eastQ1.values['Distinct Items'].value, 1);
assert.equal(eastQ1.values['Amount Sum'].value, 30);
assert.equal(eastQ1.values['Amount Avg'].value, 15);
assert.equal(eastQ1.values['Amount Min'].value, 10);
assert.equal(eastQ1.values['Amount Max'].value, 20);
assert.equal(eastQ1.values['First Item'].value, 'A');
assert.equal(eastQ1.values['Last Item'].value, 'A');
assert.deepEqual(eastQ1.values['Item List'].value, ['A', 'A']);
assert.deepEqual(eastQ1.values['Distinct Item List'].value, ['A']);
assert.deepEqual(eastQ1.sourceRefs, ['S1:1', 'S1:2']);
assert.equal(eastQ2.values['Count IDs'].value, 1, 'blank numeric value still participates in count of ID field');
assert.equal(eastQ2.values['Amount Sum'].value, '', 'numeric aggregation ignores blanks');
assert.equal(westQ1.values['Amount Sum'].value, '', 'non-numeric-only cell has blank numeric result');
assert.ok(westQ1.diagnostics.some((item) => item.code === 'pivot_non_numeric_value'));
assert.equal(westQ2.values['Count IDs'].value, 0, 'filter excludes Active=no row');

const noFilter = buildPivotViewModel({ graph, pivotSpec: spec({ filters: [] }), fieldCatalog });
assert.equal(noFilter.rows.find((row) => row.label === 'West').cells.find((cell) => cell.columnKey === 'Q2').values['Count IDs'].value, 1, 'removing filter includes West Q2');
assert.deepEqual(buildPivotViewModel({ graph, pivotSpec: spec(), fieldCatalog }), model, 'same input produces identical PivotViewModel');

assert.equal(buildPivotViewModel({ pivotSpec: spec(), fieldCatalog }).diagnostics[0].code, 'pivot_graph_missing');
assert.equal(buildPivotViewModel({ graph, fieldCatalog }).diagnostics[0].code, 'pivot_values_missing');
assert.equal(buildPivotViewModel({ graph, pivotSpec: spec() }).diagnostics[0].code, 'pivot_field_catalog_missing');
assert.ok(buildPivotViewModel({ graph, pivotSpec: { values: [{ fieldId: 'missing', aggregate: 'count', label: 'Missing' }] }, fieldCatalog }).diagnostics.some((item) => item.code === 'pivot_field_unknown'));

assert.equal(JSON.stringify(graph), beforeGraph, 'pivot builder does not mutate graph');
assert.equal(exportCategorizedGraphArtifacts({ graph, profile, validationResults: [], sources: [source] }).xmlText, beforeXml, 'pivot builder does not change XML export output');

console.log('table-categorized-pivot-view-model.test.js passed');
