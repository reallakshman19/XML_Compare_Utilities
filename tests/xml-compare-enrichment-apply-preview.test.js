import assert from 'node:assert/strict';
import { previewPipingClassExtraction } from '../xml-compare/XmlCompareEnrichmentApply.js';

const lineId = '/ASIM-1835-4"-P8810212-31441C4-PP/B1';
const baseConfig = {
  pipingClass: {
    regex: '([0-9]{5})',
    group: '1',
    tokenPosition: '4',
    tokenDelimiter: '-',
  },
};

const result = previewPipingClassExtraction(lineId, baseConfig);
assert.equal(result.regexValue, '88102');
assert.equal(result.regexError, '');
assert.equal(result.tokenValue, 'P8810212');
assert.equal(result.selectedValue, '88102');
assert.equal(result.pipingClass, '88102');
assert.deepEqual(result.tokens, ['ASIM', '1835', '4"', 'P8810212', '31441C4', 'PP']);
assert.equal(result.source, 'regex');

const fallback = previewPipingClassExtraction(lineId, {
  pipingClass: { ...baseConfig.pipingClass, regex: 'XYZ([0-9]{5})' },
});
assert.equal(fallback.regexValue, '');
assert.equal(fallback.regexError, '');
assert.equal(fallback.tokenValue, 'P8810212');
assert.equal(fallback.selectedValue, 'P8810212');
assert.equal(fallback.source, 'token');

const invalid = previewPipingClassExtraction(lineId, {
  pipingClass: { ...baseConfig.pipingClass, regex: '([0-9]{5}' },
});
assert.notEqual(invalid.regexError, '');
assert.equal(invalid.tokenValue, 'P8810212');
assert.equal(invalid.selectedValue, 'P8810212');
assert.equal(invalid.source, 'token');

const rating = previewPipingClassExtraction(lineId, {
  ...baseConfig,
  rating: { enabled: true, method: 'table', tableText: 'PIPINGCLASS\tRATING\n88102\t1500' },
});
assert.equal(rating.rating, '1500');

console.log('xml-compare-enrichment-apply-preview.test.js passed');
