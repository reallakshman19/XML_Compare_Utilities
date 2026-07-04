import assert from 'node:assert/strict';
import {
  buildEnrichmentLineIdOptions,
  createEnrichmentConfig,
  renderXmlCompareEnrichmentConfigPopupHtml,
} from '../xml-compare/XmlCompareEnrichmentConfig.js';

const workspace = {
  source: { records: [{ lineNo: '/A/B1', uid: 's1' }, { lineNo: '/A/B1', uid: 's2' }, { branchName: '/B/B1', uid: 's3' }] },
  target: { records: [{ lineNo: '/T/B1', uid: 't1' }] },
};

const options = buildEnrichmentLineIdOptions(workspace);
assert.deepEqual(options.source.map(o => o.value), ['/A/B1', '/B/B1']);
assert.deepEqual(options.target.map(o => o.value), ['/T/B1']);
assert.equal(options.source[0].uid, 's1');

const previewLineId = '/X-88102-4-P8810212-END/B1';
const config = createEnrichmentConfig({
  open: true,
  activeEnrTab: 'class',
  pipingClass: { regex: '([0-9]{5})', group: '1', tokenPosition: '4', tokenDelimiter: '-', previewSide: 'source', previewLineId },
  rating: { enabled: true, method: 'table', tableText: 'PIPINGCLASS\tRATING\n88102\t1500' },
});
const html = renderXmlCompareEnrichmentConfigPopupHtml(config, {
  workspace: { source: { records: [{ lineNo: previewLineId, uid: 'sample' }] }, target: workspace.target },
});

for (const text of ['Example Branch / Line ID', 'Source A', 'Target B', 'Regex', 'Group', 'Token position', 'Token delimiter', 'Apply to all', 'Derived facts preview', 'PipingClass', 'Rating', 'Extraction details', 'Regex group', 'Regex error', 'Token value', 'Selected result', 'Tokens']) assert.ok(html.includes(text));
for (const text of ['Regex is a search pattern', 'Group means which bracketed part', 'Token position is the part number', 'Token delimiter is the character', 'Use these extraction rules for every line ID']) assert.ok(html.includes(text));
for (const text of ['88102', '1500', 'P8810212', 'X | 88102 | 4 | P8810212 | END']) assert.ok(html.includes(text));

console.log('xml-compare-enrichment-config-line-preview.test.js passed');
