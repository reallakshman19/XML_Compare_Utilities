import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildFieldCatalog } from '../xml-compare/table-categorizer/table-categorized-field-catalog.js';
import { exportPivotViewModelArtifacts } from '../xml-compare/table-categorizer/table-categorized-pivot-exporters.js';
import { buildPivotViewModel } from '../xml-compare/table-categorizer/table-categorized-pivot-view-model.js';
import { renderTableCategorizedXmlShellHtml } from '../xml-compare/table-categorizer/table-categorized-xml-shell.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { _test } from '../tabs/xml-compare-table-categorized-runtime.js';

const source = parseTableSource(['PS NO,Rating,Amount', 'PS-100.1,CL150,10', 'PS-101.1,CL300,20'].join('\n'), { sourceId: 'S1', delimiterMode: 'comma' });
const catalog = buildFieldCatalog([source]);
const base = _test.createDefaultPivotOutputView(catalog, []);
let views = _test.updatePivotOutputViews([base], base.viewId, { action: 'add-filter' }, catalog);
views = _test.updatePivotOutputViews(views, base.viewId, { filterFieldId: 'S1.Rating', index: 0 }, catalog);
views = _test.updatePivotOutputViews(views, base.viewId, { filterValue: 'CL150', index: 0 }, catalog);
const outputView = views[0];
assert.deepEqual(outputView.pivotSpec.filters, [{ fieldId: 'S1.Rating', operator: 'equals', equals: 'CL150' }]);
assert.equal(_test.updatePivotOutputViews(views, base.viewId, { action: 'remove-filter', index: 0 }, catalog)[0].pivotSpec.filters.length, 0);

const graph = { schema: 'CategorizedGraph.v1', nodes: [
  { id: 'n1', fields: { 'PS NO': 'PS-100.1', Rating: 'CL150', Amount: '10' }, sourceRefs: ['S1:R1'] },
  { id: 'n2', fields: { 'PS NO': 'PS-101.1', Rating: 'CL300', Amount: '20' }, sourceRefs: ['S1:R2'] },
], edges: [], documentRootNodeIds: ['n1', 'n2'], diagnostics: [] };
const beforeGraph = JSON.stringify(graph);
const beforeView = JSON.stringify(outputView);
const model = buildPivotViewModel({ graph, pivotSpec: outputView.pivotSpec, fieldCatalog: catalog });
assert.equal(model.totals.grand[0].value, 10);
assert.deepEqual(model.rows[0].cells[0].sourceRefs, ['S1:R1']);
assert.equal(_test.createPivotDownloadArtifact({ graph, outputView, fieldCatalog: catalog, kind: 'json' }).text, exportPivotViewModelArtifacts(model).json.text);

const html = renderTableCategorizedXmlShellHtml({ activeStep: 'export', activeTab: 'export', sources: [source], activeSourceId: 'S1', columnsConfirmed: true, graph, exportResult: { ok: true, xmlText: '<CategorizedXML/>', graphJson: '{}', diagnosticsJson: '[]', auditJson: '{}' }, profile: { outputViews: views }, activePivotViewId: base.viewId });
for (const text of ['data-pivot-filter-list', 'add-pivot-filter', 'remove-pivot-filter', 'data-pivot-filter-field', 'data-pivot-filter-operator', 'data-pivot-filter-value', 'S1.Rating', 'data-pivot-drilldown-preview', 'S1:R1']) assert.ok(html.includes(text), text);
assert.equal(JSON.stringify(graph), beforeGraph);
assert.equal(JSON.stringify(outputView), beforeView);
const bad = renderTableCategorizedXmlShellHtml({ activeStep: 'export', sources: [source], activeSourceId: 'S1', graph, profile: { outputViews: [{ ...outputView, pivotSpec: { ...outputView.pivotSpec, filters: [{ equals: 'CL150' }] } }] }, activePivotViewId: base.viewId });
assert.ok(bad.includes('Pivot filter requires a FieldCatalog field'));
assert.ok(bad.includes('download-pivot-json" disabled'));
assert.equal(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8').includes('xlsx'), false);
console.log('table-categorized-pivot-filter-drilldown-ui.test.js passed');
