import assert from 'node:assert/strict';

import { renderTableCategorizedXmlShellHtml } from '../xml-compare/table-categorizer/table-categorized-xml-shell.js';

const html = renderTableCategorizedXmlShellHtml({
  activeStep: 'export',
  activeTab: 'export',
  sources: [{ sourceId: 'S1', headers: ['Rating'], columnIds: ['Rating'], rows: [{ rawCells: ['CL150'], rawByHeader: { Rating: 'CL150' }, rawByColumnId: { Rating: 'CL150' } }] }],
  activeSourceId: 'S1',
  columnsConfirmed: true,
  graph: { nodes: [{ id: 'n1', fields: { Rating: 'CL150' }, sourceRefs: ['S1:R1'] }], edges: [], documentRootNodeIds: ['n1'] },
  exportResult: { ok: true, xmlText: '<CategorizedXML/>', graphJson: '{}', diagnosticsJson: '[]', auditJson: '{}' },
  profile: { outputViews: [{ viewId: 'pivotView1', type: 'pivot', enabled: true, pivotSpec: { filters: [{ fieldId: 'S1.Rating', equals: 'CL150' }], rows: [{ fieldId: 'S1.Rating' }], columns: [], values: [{ fieldId: 'S1.Rating', aggregate: 'count' }] } }] },
  activePivotViewId: 'pivotView1',
});

for (const text of ['data-pivot-filter-list', 'add-pivot-filter', 'remove-pivot-filter', 'data-pivot-filter-field', 'data-pivot-filter-operator', 'data-pivot-filter-value', 'data-pivot-drilldown-preview', 'S1:R1']) assert.ok(html.includes(text), text);
console.log('table-categorized-pivot-filter-drilldown-ui.test.js passed');
