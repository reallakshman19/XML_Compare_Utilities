import assert from 'node:assert/strict';
import { compareIsoNoteMapping, compareSupportGapWithIsoNote, extractSupportGapMeasurements, serializeIsoNoteMappingCsv, renderIsoNoteMappingCompareHtml, buildIsoNoteAnchorCandidates } from '../xml-compare/XmlCompareIsoNoteDirectCompare.js';
import { createCategorizedInputXmlCanvasModel } from '../xml-compare/XmlCompareCategorizedInputXmlCanvasBuilder.js';
import { buildIsoNoteEngineeringFindings, serializeIsoNoteEngineeringFindingsCsv } from '../xml-compare/XmlCompareIsoNoteEngineeringFindings.js';

const escape = (text) => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const mapping = [
  ['PIPE-1/B4', 'PS-001', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4', 'PS-002', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4', 'PS-003', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4', 'PS-004', '10mm GUIDE GAP'],
  ['PIPE-1/B4', 'PS-005', ''],
  ['PIPE-1/B4', 'PS-006.5', ''],
  ['PIPE-1/B4', 'PS-007', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4', 'PS-008', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-2', 'PS-001', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4', 'PS-009.10', '25mm'],
];
const notes = [
  ['/PIPE-1/B4', '/PS-001', "/PS-001 :ISONOTE 'DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]{axial disp=120mm}'"],
  ['/PIPE-1/B4', 'PS-002', "/PS-002 :ISONOTE 'DO NOT REST [30mm GAP], GUIDE(1kN)'"],
  ['/PIPE-1/B4', 'PS-003', "/PS-003 :ISONOTE 'REST(25kN), GUIDE(10kN)'"],
  ['/PIPE-1/B4', 'PS-004', "/PS-004 :ISONOTE 'GUIDE GAP=10mm; REST(25kN)'"],
  ['/PIPE-1/B4', 'PS-005', "/PS-005 :ISONOTE 'REST(25kN)'"],
  ['/PIPE-1/B4', 'PS-006.5', "/PS-006.5 :ISONOTE 'GUIDE GAP=10mm'"],
  ['/PIPE-1/B4', 'PS-007', "/PS-007 :ISONOTE '[25mm GAP], [30mm GAP]'"],
  ['/PIPE-1/B4', 'PS-008', "/PS-008 :ISONOTE 'GUIDE GAP=25mm'"],
  ['/PIPE-3', 'PS-001', "/PS-001 :ISONOTE '[25mm GAP]'"],
  ['/PIPE-1/B4', 'PS-009.10', "/PS-009.10 :ISONOTE '[25mm GAP]'"],
  ['/PIPE-1/B4', '/PS-XXXX', "/PS-XXXX :ISONOTE '[25mm GAP]'"],
];
const xml = [
  '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">',
  '<IsoPartition key="PS_MAPPING_S1" levelType="partition">',
  ...mapping.map(([pipe, id, gap], i) =>
    '<IsoItem key="s1-' + i + '" levelType="group"><pipe>' + escape(pipe) +
    '</pipe><psNo>' + escape(id) + '</psNo><supportGap>' + escape(gap) + '</supportGap></IsoItem>'),
  '</IsoPartition><IsoPartition key="ISO_NOTES_S2" levelType="partition">',
  ...notes.map(([line, id, rawNote], i) =>
    '<IsoItem key="s2-' + i + '" levelType="group"><lineNoInCii>' + escape(line) +
    '</lineNoInCii><nodeName>' + escape(id) + '</nodeName><rawNote>' + escape(rawNote) + '</rawNote></IsoItem>'),
  '</IsoPartition></IsoNoteXml>',
].join('');

assert.deepEqual(extractSupportGapMeasurements('25mm GAP BETWEEN BOP AND TOS', { supportGapColumn: true }).rest, [25]);
assert.deepEqual(extractSupportGapMeasurements('GUIDE GAP=10mm').guide, [10]);
assert.deepEqual(extractSupportGapMeasurements("REST(20kN), GUIDE(6kN){axial disp=100mm}").evidence, [], 'loads and displacement are not gaps');
assert.deepEqual([extractSupportGapMeasurements("DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]").rest, extractSupportGapMeasurements("DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]").guide], [[25], [10]]);
assert.equal(compareSupportGapWithIsoNote('25mm GAP', '[25mm GAP]', 'S2_ONLY').status, 'NOT_APPLICABLE');
assert.equal(compareSupportGapWithIsoNote('25mm', '[25mm GAP]').status, 'MATCH', 'standalone S1 mm value can be a rest gap');
assert.equal(compareSupportGapWithIsoNote('25mm GAP', '[30mm GAP]').status, 'MISMATCH');
assert.equal(compareSupportGapWithIsoNote('25mm GAP', 'REST(25kN)').status, 'REVIEW', 'kN is not mm');
assert.equal(compareSupportGapWithIsoNote('25mm GAP', 'GUIDE GAP=25mm').status, 'REVIEW', 'same value in different gap type is not a match');
assert.equal(compareSupportGapWithIsoNote('10mm GUIDE GAP', 'GUIDE GAP 10 mm').status, 'MATCH');
assert.equal(compareSupportGapWithIsoNote('', '').status, 'NOT_SPECIFIED');
assert.equal(compareSupportGapWithIsoNote('', 'GUIDE GAP=10mm').status, 'REVIEW');
assert.equal(compareSupportGapWithIsoNote('25mm GAP', '[25mm GAP], [30mm GAP]').status, 'REVIEW');

// Option B H6: individual clearance agreement is not complete engineering
// agreement if any additional typed requirement is only present on one side.
const restAndGuide = compareSupportGapWithIsoNote('25mm GAP', '[25mm GAP], GUIDE GAP=10mm');
assert.equal(restAndGuide.byType.rest.status, 'MATCH');
assert.equal(restAndGuide.byType.guide.status, 'REVIEW');
assert.deepEqual(restAndGuide.byType.guide.s2Mm, [10]);
assert.deepEqual(restAndGuide.unresolvedTypes, ['guide']);
assert.equal(restAndGuide.status, 'REVIEW', 'S2-only GUIDE must block aggregate MATCH');
assert.match(restAndGuide.reason, /S2-only guide clearance/);
const guideAndStop = compareSupportGapWithIsoNote('10mm GUIDE GAP', 'GUIDE GAP=10mm; LINE STOP GAP=25mm');
assert.equal(guideAndStop.byType.guide.status, 'MATCH');
assert.equal(guideAndStop.byType.lineStop.status, 'REVIEW');
assert.equal(guideAndStop.status, 'REVIEW', 'S2-only LINE STOP must block aggregate MATCH');
const mismatchPlusMissing = compareSupportGapWithIsoNote('25mm GAP', '[30mm GAP], LINE STOP GAP=25mm');
assert.equal(mismatchPlusMissing.status, 'MISMATCH');
assert.equal(mismatchPlusMissing.byType.rest.status, 'MISMATCH');
assert.equal(mismatchPlusMissing.byType.lineStop.status, 'REVIEW');
assert.deepEqual(mismatchPlusMissing.unresolvedTypes, ['lineStop']);
const restOnly = compareSupportGapWithIsoNote('25mm GAP', '[25mm GAP]');
assert.equal(restOnly.status, 'MATCH');
assert.equal(restOnly.byType.guide.status, 'NOT_SPECIFIED');
assert.equal(restOnly.byType.lineStop.status, 'NOT_SPECIFIED');
assert.equal(compareSupportGapWithIsoNote('25mm GUIDE GAP', 'GUIDE GAP=25mm; axial disp=120mm').status, 'MATCH',
  'axial displacement is not a separate gap requirement');
assert.equal(compareSupportGapWithIsoNote('25mm GAP', 'LINE STOP GAP=25mm').status, 'REVIEW');
assert.equal(compareSupportGapWithIsoNote('25mm GAP', '[25mm GAP], GUIDE GAP=10mm', 'S1_ONLY').status,
  'NOT_APPLICABLE', 'unverified identity must not assert gap agreement');



const report = compareIsoNoteMapping({ sourceXml: xml, targetXml: xml });
assert.equal(report.ok, true);
assert.equal(report.summary.match, 9, 'one same support ID on another pipeline is not a match');
assert.equal(report.summary.s1Only, 1);
assert.equal(report.summary.s2Only, 1);
assert.equal(report.summary.review, 1, 'PS-XXXX stays in review');
assert.deepEqual([
  report.summary.gapMatch, report.summary.gapMismatch,
  report.summary.gapReview, report.summary.gapNotSpecified,
], [2, 1, 5, 1]); // PS-001 REST=25mm MATCH, GUIDE=10mm REVIEW → aggregate REVIEW
const row = (id) => report.rows.find((item) => item.psNo === id && item.pipe === 'PIPE-1/B4');
assert.equal(row('PS-001').gap.status, 'REVIEW');
assert.equal(row('PS-001').gap.byType.rest.status, 'MATCH');
assert.equal(row('PS-001').gap.byType.guide.status, 'REVIEW');
assert.equal(row('PS-001').gap.s2RestMm, '25');
assert.equal(row('PS-001').gap.s2GuideMm, '10');
assert.equal(row('PS-002').gap.status, 'MISMATCH');
assert.equal(row('PS-003').gap.status, 'REVIEW');
assert.equal(row('PS-004').gap.status, 'MATCH');
assert.equal(row('PS-005').gap.status, 'NOT_SPECIFIED');
assert.equal(row('PS-006.5').gap.status, 'REVIEW');
assert.equal(row('PS-007').gap.status, 'REVIEW');
assert.equal(row('PS-008').gap.status, 'REVIEW');
assert.equal(row('PS-009.10').gap.status, 'MATCH', 'support suffix .10 must remain significant');

const model = createCategorizedInputXmlCanvasModel({ xmlText: xml });
const anchors = buildIsoNoteAnchorCandidates({ report, sourceRecords: model.records, targetRecords: model.records });
assert.equal(anchors.length, 9, 'gap mismatches do not invalidate an exact identity match');

const findings = buildIsoNoteEngineeringFindings(report);
const typedFindings = findings.filter(f => f.psNo === 'PS-001' && f.domain === 'CLEARANCE');
assert.equal(typedFindings.find(f => f.kind === 'REST').status, 'MATCH');
assert.equal(typedFindings.find(f => f.kind === 'GUIDE').status, 'REVIEW');
assert.match(typedFindings.find(f => f.kind === 'GUIDE').rule, /TYPED_GAP_EXACT_MM_V2/);
assert.match(serializeIsoNoteEngineeringFindingsCsv(report), /S2-only guide clearance has no S1 evidence/);

const csv = serializeIsoNoteMappingCsv(report);
assert.match(csv, /"Support Gap \(S1\)","ISONOTE \(S2\)"/);
assert.match(csv, /"25mm GAP BETWEEN BOP AND TOS"/);
assert.match(csv, /DO NOT REST \[25mm GAP\]/);
assert.match(csv, /"MISMATCH","Different rest clearance in mm\."/);

const html = renderIsoNoteMappingCompareHtml(report, anchors.length);
assert.match(html, /Gap mismatch:<\/b> 1/);
assert.match(html, /Rest gap S1 \/ S2 \(mm\)/);
assert.match(html, /ISONOTE \(S2\)/);
assert.match(html, /GUIDE GAP=10mm/);
assert.match(html, /axial disp=120mm/);
console.log('xml-compare-iso-note-gap-macro.test.js passed');
