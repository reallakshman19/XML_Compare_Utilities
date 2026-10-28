import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCategorizedInputXmlCanvasModel } from '../xml-compare/XmlCompareCategorizedInputXmlCanvasBuilder.js';
import { compareIsoNoteMapping, buildIsoNoteAnchorCandidates, normalizeIsoLine, normalizeIsoSupport, serializeIsoNoteMappingCsv, renderIsoNoteMappingCompareHtml } from '../xml-compare/XmlCompareIsoNoteDirectCompare.js';
import { createXmlCompareCanvasState, applyXmlCompareCanvasAction } from '../xml-compare/XmlCompareCanvasStateController.js';
import { createIsoNoteAuditIdentityLinks } from '../xml-compare/XmlCompareIsoNoteAuditIdentityLinks.js';

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
assert.deepEqual(result.summary, { match: 1, s1Only: 2, s2Only: 1, review: 5, gapMatch: 0, gapMismatch: 0, gapReview: 0, gapNotSpecified: 1, coverageCovered: 0, coverageMissing: 0, coverageReview: 0, coverageExtra: 0 });
const exact = result.rows.find((rec) => rec.status === 'MATCH');
assert.equal(exact.psNo, 'PS-006.5');
assert.equal(exact.nodeName, '/PS-006.5');
assert.equal(exact.pipe, 'PIPE-1/B4');
assert.equal(result.rows.filter((rec) => rec.nodeName === '/PS-XXXX').length, 2, 'repeated placeholder notes remain separate');
assert.equal(result.rows.filter((rec) => rec.psNo === 'PS-777.10').length, 2, 'duplicate S1 keys remain separate review rows');
assert.ok(result.rows.every((rec) => rec.status !== 'MATCH' || (rec.psNo && rec.nodeName)), 'never silently assert one-sided match');
assert.ok(result.rows.some((rec) => rec.psNo === 'PS-006.1' && rec.status === 'S1_ONLY'), 'same ID with different pipeline is not a match');
assert.ok(result.rows.some((rec) => rec.nodeName === 'PS-006.1' && rec.status === 'S2_ONLY'));

const anchors = buildIsoNoteAnchorCandidates({ report: result, sourceRecords: model.records, targetRecords: model.records });
assert.equal(anchors.length, 1, 'only one unique exact S1-to-S2 candidate, never a self-match');
assert.equal(anchors[0].sourceUid.includes('PS_MAPPING_S1'), true);
assert.equal(anchors[0].targetUid.includes('ISO_NOTES_S2'), true);
assert.equal(anchors[0].transformBasis, 'identity-key');
assert.equal(anchors[0].method, 'iso-note-exact-key');
assert.deepEqual(buildIsoNoteAnchorCandidates({ report: result, sourceRecords: model.records.filter((rec) => rec.lineKey === 'ISO_NOTES_S2'), targetRecords: model.records }), [], 'mapping partition must exist on source side');
assert.deepEqual(buildIsoNoteAnchorCandidates({ report: result, sourceRecords: model.records, targetRecords: model.records.filter((rec) => rec.lineKey === 'PS_MAPPING_S1') }), [], 'notes partition must exist on target side');

let canvas = createXmlCompareCanvasState({ compareFields: ['supportId'], levelViews: { source: { levelId: 'element' }, target: { levelId: 'element' } } });
canvas = applyXmlCompareCanvasAction(canvas, { type: 'select-record', side: 'source', records: model.records, uid: anchors[0].sourceUid });
canvas = applyXmlCompareCanvasAction(canvas, { type: 'select-record', side: 'target', records: model.records, uid: anchors[0].targetUid });
canvas = applyXmlCompareCanvasAction(canvas, { type: 'request-auto-map', scope: 'node' });
assert.equal(canvas.autoMapRequest.sourceUid, anchors[0].sourceUid);
assert.equal(canvas.autoMapRequest.targetUid, anchors[0].targetUid);
const priorCanvas = canvas;
const auditLinks = createIsoNoteAuditIdentityLinks({
  report: result, sourceRecords: model.records, targetRecords: model.records,
});
assert.equal(auditLinks.schema, 'iso-note-audit-identity-links/v1');
assert.equal(auditLinks.readOnly, true);
assert.equal(auditLinks.linkedCount, 1);
assert.equal(auditLinks.links[0].disposition, 'IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED');
assert.equal(auditLinks.links[0].pipeline, 'PIPE-1/B4');
assert.equal(canvas, priorCanvas, 'audit link projection cannot replace canvas state');
assert.equal(canvas.approvedMatchSet, null, 'audit identity is not a transfer approval');
const unscopedApproval = applyXmlCompareCanvasAction(canvas, {
  type: 'bulk-approve-candidate-pairs', candidates: anchors,
});
assert.equal(unscopedApproval.approvedMatchSet, null, 'reducer fails closed without approval context');
assert.equal(unscopedApproval.logs.at(-1).message, 'MISSING_APPROVAL_CONTEXT');

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
assert.match(html, /Read-only audit identity links/);
assert.doesNotMatch(html, /Review &amp; Transfer opens the approved links/);

const view = fs.readFileSync(new URL('../xml-compare/XmlCompareTabView.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
assert.match(view, /data-xml-compare-action="compare-iso-note-mapping"/);
assert.match(view, /renderIsoNoteMappingCompareHtml\(state\.isoNoteComparison, state\.isoNoteLinkedCount\)/);
assert.match(runtime, /compareIsoNoteMapping\(\{ sourceXml: state\.textA, targetXml: state\.textB \}\)/);
assert.match(runtime, /linkExactIsoNotePairs\(state, state\.isoNoteComparison\)/);
assert.match(runtime, /createIsoNoteAuditIdentityLinks/);
assert.match(runtime, /state\.isoNoteAuditLinks = links/);
assert.match(runtime, /serializeIsoNoteMappingCsv\(state\.isoNoteComparison\)/);
console.log('xml-compare-iso-note-direct-compare.test.js passed');
