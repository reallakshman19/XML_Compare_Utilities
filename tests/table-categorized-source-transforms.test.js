import assert from 'node:assert/strict';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { createMultiSourceState, parseSourceDraft, updateSourceDraft, updateSourceTransformRules } from '../xml-compare/table-categorizer/table-categorized-xml-source-manager.js';
import { applySourceTransformRules, previewSourceTransform } from '../xml-compare/table-categorizer/table-categorized-xml-source-transforms.js';

const ps = 'PS';
const parsed = parseTableSource(['PS NO', `${ps}-XYZ.1`, `${ps}-XYZ.10`, `${ps}-ABC.1`].join('\n'), { delimiterMode: 'tab' });
const transformed = applySourceTransformRules(parsed, [{ newColumn: 'PS_NO_Trimmed', sourceColumn: 'PS NO', operation: 'take-before', find: '.' }]);
assert.ok(transformed.headers.includes('PS_NO_Trimmed'));
assert.deepEqual(transformed.rows.map((r) => r.rawByHeader.PS_NO_Trimmed), [`${ps}-XYZ`, `${ps}-XYZ`, `${ps}-ABC`]);
assert.equal(parsed.headers.includes('PS_NO_Trimmed'), false);
assert.equal(parsed.rows[0].rawByHeader.PS_NO_Trimmed, undefined);
assert.equal(transformed.rows[0].rawByColumnId.PS_NO_Trimmed, `${ps}-XYZ`);
assert.equal(transformed.rows[0].rawCells.at(-1), `${ps}-XYZ`);

const mmParsed = parseTableSource('X\n1000mm\n999.5mm');
const mm = applySourceTransformRules(mmParsed, [{ newColumn: 'X_clean', sourceColumn: 'X', operation: 'replace-text', find: 'mm', replaceWith: '' }]);
assert.deepEqual(mm.rows.map((r) => r.rawByHeader.X_clean), ['1000', '999.5']);

const badRegex = applySourceTransformRules(mmParsed, [{ newColumn: 'X_bad', sourceColumn: 'X', operation: 'regex-replace', find: '[' }]);
assert.ok(badRegex.diagnostics.some((d) => d.code === 'transform_regex_invalid'));
assert.equal(badRegex.rows[0].rawByHeader.X_bad, '1000mm');

const missingSource = applySourceTransformRules(mmParsed, [{ newColumn: 'X_missing', sourceColumn: 'Missing X', operation: 'trim' }]);
assert.equal(missingSource.headers.includes('X_missing'), false, 'missing source columns must not create blank derived columns');
assert.equal(missingSource.rows[0].rawByHeader.X_missing, undefined);
assert.ok(missingSource.diagnostics.some((d) => d.severity === 'BLOCKER' && d.code === 'transform_source_column_missing'));

const missingPreview = previewSourceTransform(mmParsed, { newColumn: 'X_preview_missing', sourceColumn: 'Missing X', operation: 'trim' });
assert.equal(missingPreview.rows.length, 0, 'preview blocks missing-source transforms instead of showing misleading blanks');
assert.ok(missingPreview.diagnostics.some((d) => d.code === 'transform_source_column_missing'));

let state = createMultiSourceState();
state = updateSourceDraft(state, 'S1', { sourceText: ['PS NO', `${ps}-XYZ.1`].join('\n'), delimiterMode: 'tab' });
state = updateSourceTransformRules(state, 'S1', [{ newColumn: 'PS_NO_Trimmed', sourceColumn: 'PS NO', operation: 'take-before', find: '.' }]);
state = parseSourceDraft(state, 'S1');
assert.ok(state.sources[0].headers.includes('PS_NO_Trimmed'));
assert.equal(state.sources[0].rows[0].rawByHeader.PS_NO_Trimmed, `${ps}-XYZ`);

console.log('table-categorized-source-transforms.test.js passed');
