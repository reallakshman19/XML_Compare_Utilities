import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCategorizedInputXmlCanvasModel } from '../xml-compare/XmlCompareCategorizedInputXmlCanvasBuilder.js';
import { compareIsoNoteMapping, normalizeIsoLine, normalizeIsoSupport, serializeIsoNoteMappingCsv, renderIsoNoteMappingCompareHtml } from '../xml-compare/XmlCompareIsoNoteDirectCompare.js';

const S1 = [
  ['PIPE-1/B4', 'PS-006.5'],
  ['PIPE-1/B4', 'PS-001'],
  ['PIPE-2', 'PS-006.1'],
  ['PIPE-4', 'PS-777.10'],
  ['PIPE-4', 'PS-777.10'],
];
const S2 = [
  ['/PIPE-1/B4', '/PS-006.5'],
  ['/PIPE-5', 'PS-006.1'],
  ['/PIPE-1/B4', '/PS-XXXX'],
  ['/PIPE-1/B4', '/PS-XXXX'],
  ['/PIPE-4', '/PS-777.10'],
];
const xml = (mapping = S1, notes = S2, includeS1 = true, includeS2 = true) => [
  '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">',
  includeS1 ? '<IsoPartition key="PS_MAPPING_S1" levelType="partition">' +
    mapping.map(([pipe, id], idx) => '<IsoItem key="m' + idx + '" levelType="group"><pipe>' + pipe +
      '</pipe><psNo>' + id + '</psNo></IsoItem>').join('') + '</IsoPartition>' : '',
  includeS2 ? '<IsoPartition key="ISO_NOTES_S2" levelType="partition">' +
    notes.map(([pipe, id], idx) => '<IsoItem key="n' + idx + '" levelType="group"><lineNoInCii>' + pipe +
      '</lineNoInCii><nodeName>' + id + '</nodeName></IsoItem>').join('') + '</IsoPartition>' : '',
  '</IsoNoteXml>',
].join('');

assert.equal(normalizeIsoLine('  /ASIM-1885-PL-10"-CS-M8810126-02/B4  '), 'ASIM-1885-PL-10"-CS-M8810126-02/B4');
assert.equal(normalizeIsoSupport('/PS-006.5'), 'PS-006.5');
assert.equal(normalizeIsoSupport('PS-006.10'), 'PS-006.10');

const input = xml();
const model = createCategorizedInputXmlCanvasModel({ xmlText: input });
assert.deepEqual(model.records.filter((rec) => rec.levelId === 'lineBlock').map((rec) => rec.lineKey), ['PS_MAPPING_S1', 'ISO_NOTES_S2'], 'partition identity must be based on XML key');

const result = compareIsoNoteMapping({ sourceXml: input, targetXml: input });
assert.equal(result.ok, true);
assert.equal(result.countS1, 5);
assert.equal(result.countS2, 5);
assert.deepEqual(result.summary, { match: 1, s1Only: 2, s2Only: 1, review: 5 });
const exact = result.rows.find((rec) => rec.status === 'MATCH');
assert.equal(exact.psNo, 'PS-006.5');
assert.equal(exact.nodeName, '/PS-006.5');
assert.equal(exact.pipe, 'PIPE-1/B4');
assert.equal(result.rows.filter((rec) => rec.nodeName === '/PS-XXXX').length, 2, 'repeated placeholder notes remain separate');
assert.equal(result.rows.filter((rec) => rec.psNo === 'PS-777.10').length, 2, 'duplicate S1 keys remain separate review rows');
assert.ok(result.rows.every((rec) => rec.status !== 'MATCH' || (rec.psNo && rec.nodeName)), 'never silently assert one-sided match');
assert.ok(result.rows.some((rec) => rec.psNo === 'PS-006.1' && rec.status === 'S1_ONLY'), 'same ID with different pipeline is not a match');
assert.ok(result.rows.some((rec) => rec.nodeName === 'PS-006.1' && rec.status === 'S2_ONLY'));

const oneDocument = compareIsoNoteMapping({ sourceXml: input });
assert.deepEqual(oneDocument.summary, result.summary);
const split = compareIsoNoteMapping({
  sourceXml: xml(S1, [], true, false),
  targetXml: xml([], S2, false, true),
});
assert.deepEqual(split.summary, result.summary);

const missing = compareIsoNoteMapping({ sourceXml: xml(S1, [], true, false) });
assert.equal(missing.ok, false);
assert.match(missing.message, /ISO_NOTES_S2/);
const csv = serializeIsoNoteMappingCsv(result);
assert.match(csv, /"PS NO \(S1\)","NODE_NAME \(S2\)"/);
assert.match(csv, /"PS-006\.5","\/PS-006\.5","MATCH"/);
const html = renderIsoNoteMappingCompareHtml(result);
assert.match(html, /PS Mapping ↔ ISO Notes/);
assert.match(html, /Download comparison CSV/);
assert.match(html, /S1 only/);

const view = fs.readFileSync(new URL('../xml-compare/XmlCompareTabView.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
assert.match(view, /data-xml-compare-action="compare-iso-note-mapping"/);
assert.match(view, /renderIsoNoteMappingCompareHtml\(state\.isoNoteComparison\)/);
assert.match(runtime, /compareIsoNoteMapping\(\{ sourceXml: state\.textA, targetXml: state\.textB \}\)/);
assert.match(runtime, /serializeIsoNoteMappingCsv\(state\.isoNoteComparison\)/);
console.log('xml-compare-iso-note-direct-compare.test.js passed');
