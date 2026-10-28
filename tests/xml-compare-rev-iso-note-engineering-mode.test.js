import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sha256Utf8 } from '../xml-compare/XmlCompareSha256.js';
import {
  stableAuditJson, createDatasetSnapshot, datasetSnapshotDescriptor,
  createComparisonSnapshot, logicalFindingKey, findingInstanceId,
} from '../xml-compare/XmlCompareAuditSnapshotModel.js';
import {
  isIsoNoteEngineeringInput, createIsoNoteRevCompareAudit,
  exportIsoNoteRevCompareAuditJson, exportIsoNoteRevCompareAuditCsv,
} from '../xml-compare/rev-compare/rev-compare-iso-note-mode.js';
import { renderRevCompareDashboardHtml } from '../xml-compare/rev-compare/rev-compare-ui.js';
import { exportRevCompareCsv, exportRevCompareJson } from '../xml-compare/rev-compare/rev-compare-exporters.js';

const escape = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const mapping = [
  ['PIPE-1/B4', 'PS-001', 'PIPE REST XRT01', '25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4', 'PS-002.5', 'GUIDE TYPE-604', '10mm GUIDE GAP'],
  ['PIPE-2', 'PS-001', 'PIPE REST XRT01', '25mm GAP'],
  ['PIPE-5', 'PS-XXXX', 'PIPE STOP TYPE-602', '25mm LINE STOP GAP'],
];
const notes = [
  ['/PIPE-1/B4', '/PS-001', "/PS-001 :ISONOTE 'REST(20kN), [25mm GAP]'"],
  ['/PIPE-1/B4', '/PS-002.5', "/PS-002.5 :ISONOTE 'GUIDE(6kN), [GUIDE GAP=10mm]'"],
  ['/PIPE-8', 'PS-001', "/PS-001 :ISONOTE 'REST(17kN)'"],
  ['/PIPE-5', '/PS-XXXX', "/PS-XXXX :ISONOTE 'LINE STOP(3kN), [LINE STOP GAP=25mm]'"],
];
const xml = ({ s1 = true, s2 = true } = {}) =>
  '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">' +
  (s1 ? '<IsoPartition key="PS_MAPPING_S1" levelType="partition">' +
    mapping.map(([pipe, ps, dtxr, gap], i) =>
      '<IsoItem key="m'+i+'" levelType="group" sourceRefs="S1:'+(i+1)+'"><pipe>'+escape(pipe)+'</pipe><psNo>'+
      escape(ps)+'</psNo><dtxr>'+escape(dtxr)+'</dtxr><supportGap>'+escape(gap)+'</supportGap></IsoItem>').join('') + '</IsoPartition>' : '') +
  (s2 ? '<IsoPartition key="ISO_NOTES_S2" levelType="partition">' +
    notes.map(([pipe, id, note], i) =>
      '<IsoItem key="n'+i+'" levelType="group" sourceRefs="S2:'+(i+1)+'"><lineNoInCii>'+escape(pipe)+
      '</lineNoInCii><nodeName>'+escape(id)+'</nodeName><rawNote>'+escape(note)+'</rawNote></IsoItem>').join('') +
      '</IsoPartition>' : '') + '</IsoNoteXml>';

// SHA-256 custody is over the UTF-8 of the loaded text, independently
// cross-checked against Node crypto including block and Unicode boundaries.
assert.equal(sha256Utf8(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
assert.equal(sha256Utf8('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
for (const sample of ['Ω-🚀', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'A'.repeat(1024)]) {
  assert.equal(sha256Utf8(sample), createHash('sha256').update(sample, 'utf8').digest('hex'),
    'cryptographic SHA-256 must exactly match independently implemented Node crypto');
}
assert.equal(stableAuditJson({ z: { d: 2, c: 1 }, a: true }),
  stableAuditJson({ a: true, z: { c: 1, d: 2 } }));
assert.throws(() => stableAuditJson({ invalid: undefined }), /JSON values/);
const datasetA = createDatasetSnapshot({ text: 'α\r\nβ', sourceRole: 'PS_MAPPING_S1' });
assert.equal(datasetA.contentSha256,
  createHash('sha256').update('α\r\nβ', 'utf8').digest('hex'));
assert.equal(datasetA.snapshotId, createDatasetSnapshot({ text: 'α\r\nβ', sourceRole: 'PS_MAPPING_S1' }).snapshotId);
assert.notEqual(datasetA.snapshotId, createDatasetSnapshot({ text: 'α\nβ', sourceRole: 'PS_MAPPING_S1' }).snapshotId,
  'different source bytes, including line endings, must produce different snapshot IDs');
assert.notEqual(datasetA.snapshotId, createDatasetSnapshot({ text: 'α\r\nβ', sourceRole: 'ISO_NOTES_S2' }).snapshotId);
assert.ok(Object.isFrozen(datasetA));
assert.ok(!Object.hasOwn(datasetSnapshotDescriptor(datasetA), 'rawText'), 'export descriptors must omit original XML text');
const comparisonSource = createDatasetSnapshot({ text: 'source', sourceRole: 'PS_MAPPING_S1' });
const comparisonTarget = createDatasetSnapshot({ text: 'target', sourceRole: 'ISO_NOTES_S2' });
const comparisonA = createComparisonSnapshot({
  source: comparisonSource, target: comparisonTarget, report: { rows: [{ value: 7 }] },
  configuration: { tolerance: 0, tags: { b: 2, a: 1 } },
});
const comparisonB = createComparisonSnapshot({
  source: comparisonSource, target: comparisonTarget, report: { rows: [{ value: 7 }] },
  configuration: { tags: { a: 1, b: 2 }, tolerance: 0 },
});
assert.equal(comparisonA.comparisonId, comparisonB.comparisonId, 'configuration key order must not alter comparison identity');
assert.notEqual(comparisonA.comparisonId, createComparisonSnapshot({
  source: comparisonSource, target: comparisonTarget, report: {},
  configuration: { tolerance: 1 },
}).comparisonId, 'config changes require a new comparison identity');
assert.notEqual(comparisonA.comparisonId, createComparisonSnapshot({
  source: comparisonSource, target: comparisonTarget, report: {},
  engineeringRulesVersion: 'TYPED_GAP_EXACT_MM_V3', configuration: { tolerance: 0, tags: { a: 1, b: 2 } },
}).comparisonId, 'policy/rule version changes require a new comparison identity');
assert.ok(Object.isFrozen(comparisonA.report.rows[0]));
assert.throws(() => { comparisonA.report.rows[0].value = 8; }, TypeError);
const genericFinding = {
  pipeline: 'pipe-1/b4', psNo: 'PS-009.10', nodeName: '/PS-009.10',
  domain: 'CLEARANCE', kind: 'REST', findingId: 'S1:1=>S2:1#CLEARANCE:REST',
  sourceUid: 'record-1', targetUid: 'record-2',
};
const reorderedFinding = { ...genericFinding, findingId: 'S1:99=>S2:44#CLEARANCE:REST' };
assert.equal(logicalFindingKey(genericFinding), logicalFindingKey(reorderedFinding),
  'logical key must not be affected by row ordering/source reference changes');
assert.notEqual(findingInstanceId(genericFinding, comparisonA.comparisonId, 0),
  findingInstanceId(genericFinding, comparisonA.comparisonId, 1), 'repeated rows require unique instance IDs');
assert.notEqual(findingInstanceId(genericFinding, comparisonA.comparisonId, 0),
  findingInstanceId(genericFinding, 'cmp:sha256:other', 0), 'finding instance is bound to input snapshots');
const combined = xml();
const sourceOnly = xml({ s2: false });
const targetOnly = xml({ s1: false });
const unrelated = '<Root><Element key="PS-001"><name>PS-001</name></Element></Root>';
const otherCategorized = '<InputXml><IsoPartition key="PS_MAPPING_S1"><IsoItem key="a"/></IsoPartition></InputXml>';
assert.equal(isIsoNoteEngineeringInput(combined, combined), true);
assert.equal(isIsoNoteEngineeringInput(sourceOnly, targetOnly), true);
assert.equal(isIsoNoteEngineeringInput(combined, unrelated), false, 'do not redirect non-ISO revisions');
assert.equal(isIsoNoteEngineeringInput(otherCategorized, combined), false);
assert.equal(createIsoNoteRevCompareAudit({ sourceXml: combined, targetXml: unrelated }), null);

const audit = createIsoNoteRevCompareAudit({ sourceXml: combined, targetXml: combined });
assert.equal(audit.mode, 'iso-note-engineering');
assert.equal(audit.schema, 'rev-compare-iso-note-engineering-mode/v1');
assert.equal(audit.ok, true);
assert.equal(audit.readOnly, true);
const auditReplay = createIsoNoteRevCompareAudit({ sourceXml: combined, targetXml: combined });
assert.equal(audit.comparisonId, auditReplay.comparisonId);
assert.deepEqual(audit.findings.map(row => row.findingInstanceId),
  auditReplay.findings.map(row => row.findingInstanceId));
assert.match(audit.comparisonId, /^cmp:sha256:[0-9a-f]{64}$/);
assert.equal(audit.snapshots.source.contentSha256,
  createHash('sha256').update(combined, 'utf8').digest('hex'));
assert.equal(audit.snapshots.source.schema, 'xml-compare-dataset-snapshot/v1');
assert.ok(Object.isFrozen(audit.report.rows));
assert.ok(Object.isFrozen(audit.findings[0]));
assert.ok(audit.findings.every(row => row.comparisonId === audit.comparisonId));
assert.equal(new Set(audit.findings.map(row => row.findingInstanceId)).size, audit.findings.length,
  'snapshot-specific finding instance IDs must be unique even for duplicate row refs');
assert.ok(audit.findings.every(row => /^lf:sha256:[a-f0-9]{64}$/.test(row.logicalFindingKey)));
const changedXml = combined.replace('PIPE-1/B4', 'PIPE-1/B5');
const changedAudit = createIsoNoteRevCompareAudit({ sourceXml: changedXml, targetXml: combined });
assert.notEqual(changedAudit.comparisonId, audit.comparisonId);
const originalLogical = audit.findings.find(row => row.psNo === 'PS-002.5' && row.domain === 'IDENTITY');
const changedLogical = changedAudit.findings.find(row => row.psNo === 'PS-002.5' && row.domain === 'IDENTITY');
assert.equal(originalLogical.logicalFindingKey, changedLogical.logicalFindingKey,
  'unchanged logical support must preserve lineage across a changed input');
assert.notEqual(originalLogical.findingInstanceId, changedLogical.findingInstanceId);

assert.equal(audit.summary.mappingRows, 4);
assert.equal(audit.summary.noteRows, 4);
assert.equal(audit.summary.identityMatches, 2);
assert.equal(audit.summary.s1Only, 1);
assert.equal(audit.summary.s2Only, 1);
assert.equal(audit.summary.identityReviews, 2);
assert.equal(audit.summary.gapMatches, 2);
assert.equal(audit.summary.restraintCovered, 2);
assert.ok(audit.findingCount > 4);
assert.ok(audit.findings.every(f => f.findingId && f.rule && f.s1Ref || f.domain === 'IDENTITY'));
const split = createIsoNoteRevCompareAudit({ sourceXml: sourceOnly, targetXml: targetOnly });
assert.deepEqual(split.summary, audit.summary, 'split and combined exports must yield identical engineering conclusions');
const reversed = createIsoNoteRevCompareAudit({ sourceXml: targetOnly, targetXml: sourceOnly });
assert.equal(reversed.ok, false, 'do not silently swap mapping and note ownership');
assert.match(reversed.message, /missing/i);

const html = renderRevCompareDashboardHtml({ isoNoteRevAudit: audit });
assert.match(html, /data-xmlc-rev-compare-mode="iso-note-engineering"/);
assert.match(html, /1\. Engineering identity and coverage summary/);
assert.match(html, /2\. Unmatched \/ ambiguous S1 and S2 records/);
assert.match(html, /3\. Engineering delta grid/);
assert.match(html, /4\. Finding-level evidence and provenance/);
assert.match(html, /S1:1/);
assert.match(html, /S2:1/);
assert.match(html, /LINE STOP S1\/S2 mm/);
assert.match(html, /Missing/);
assert.match(html, /25mm GAP BETWEEN BOP AND TOS/);
assert.match(html, /REST\(20kN\)/);
assert.match(html, /Export engineering findings CSV/);
assert.doesNotMatch(html, /Common element keys by supportId base/);
assert.doesNotMatch(html, /New in Target/);
assert.doesNotMatch(html, /Critical Numeric Changes/);
const invalid = renderRevCompareDashboardHtml({ isoNoteRevAudit: reversed });
assert.match(invalid, /missing/i);
assert.doesNotMatch(invalid, /Export engineering findings CSV/);

const model = { isoNoteRevAudit: audit };
const auditJson = JSON.parse(exportRevCompareJson(model));
assert.equal(auditJson.mode, 'iso-note-engineering');
assert.equal(auditJson.summary.identityMatches, 2);
assert.equal(auditJson.findings.length, audit.findings.length);
assert.equal(auditJson.readOnly, true);
assert.equal(auditJson.comparisonId, audit.comparisonId);
assert.equal(auditJson.snapshots.comparison.comparisonId, audit.comparisonId);
assert.equal(auditJson.snapshots.source.contentSha256, audit.snapshots.source.contentSha256);
assert.equal(auditJson.findings[0].findingInstanceId, audit.findings[0].findingInstanceId);
assert.ok(!JSON.stringify(auditJson.snapshots).includes('rawText'));

assert.equal(auditJson.identityRule, 'NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1');
assert.equal(JSON.parse(exportIsoNoteRevCompareAuditJson(audit)).mode, 'iso-note-engineering');
const csv = exportRevCompareCsv(model);
assert.equal(csv, exportIsoNoteRevCompareAuditCsv(audit));
assert.match(csv, /"Finding ID","Domain","Type"/);
assert.match(csv, /"Comparison ID","Logical Finding Key","Finding Instance ID","Identity Policy Version"/);
assert.ok(csv.includes(audit.comparisonId));
assert.ok(csv.includes(audit.findings[0].findingInstanceId));

assert.match(csv, /#RESTRAINT:REST/);
assert.match(csv, /#CLEARANCE:REST/);
assert.match(csv, /"S1:1","S2:1"/);
assert.doesNotMatch(csv, /"Rev 1 supportId"/);
const genericHtml = renderRevCompareDashboardHtml({
  source: { records: [], summary: { activeLevel: 'Element' } },
  target: { records: [], summary: { activeLevel: 'Element' } },
  compareFields: ['supportId'],
  revCompareDeltaThreshold: 0,
});
assert.match(genericHtml, /1\. Executive Summary/);
assert.match(genericHtml, /2\. Missing &amp; New Identifiers/);
assert.doesNotMatch(genericHtml, /Engineering identity and coverage summary/);

const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
const popup = fs.readFileSync(new URL('../xml-compare/XmlCompareTransferModalPopup.js', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../xml-compare/XmlCompareWorkspaceModel.js', import.meta.url), 'utf8');
assert.match(runtime, /targetTab === 'rev-compare'\) \{ render\(container, state\)/, 'Tab 3 switch must rebuild its content');
assert.match(runtime, /createIsoNoteRevCompareAudit\(\{ sourceXml: state\.textA, targetXml: state\.textB \}\)/);
assert.match(runtime, /isoNoteRevAudit: audit/);
assert.match(runtime, /isIsoNoteEngineeringInput\(state\.textA, state\.textB\)/, 'ISO engineering reports cannot silently stage or apply properties');
assert.match(runtime, /iso-note-engineering-findings\.csv/);
assert.match(runtime, /iso-note-engineering-audit\.json/);
assert.match(workspace, /isoNoteRevAudit/);
assert.match(popup, /Tab 3: ISO Engineering Audit/);
console.log('xml-compare-rev-iso-note-engineering-mode.test.js passed');
