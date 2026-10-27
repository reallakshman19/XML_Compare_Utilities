import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GAP_KINDS, parseTypedGaps, parseRestraintEvidence, compareEngineeringGaps,
  compareRestraintCoverage, engineeringReviewAction,
} from '../xml-compare/XmlCompareIsoNoteEngineeringRules.js';
import {
  compareIsoNoteMapping, buildIsoNoteAnchorCandidates, validateIsoNoteCandidateIdentity,
  renderIsoNoteMappingCompareHtml, serializeIsoNoteMappingCsv,
} from '../xml-compare/XmlCompareIsoNoteDirectCompare.js';
import { createCategorizedInputXmlCanvasModel } from '../xml-compare/XmlCompareCategorizedInputXmlCanvasBuilder.js';
import { buildIsoNoteEngineeringFindings, serializeIsoNoteEngineeringFindingsCsv } from '../xml-compare/XmlCompareIsoNoteEngineeringFindings.js';

assert.deepEqual(GAP_KINDS, ['rest', 'guide', 'lineStop']);
assert.deepEqual(parseTypedGaps('[LINE STOP GAP=25mm]').lineStop, [25]);
assert.deepEqual(parseTypedGaps('[LINE STOP GAP=25mm]').rest, [], 'LINE STOP gap is not REST gap');
assert.deepEqual(parseTypedGaps('GUIDE GAP=10mm').guide, [10]);
assert.deepEqual(parseTypedGaps('10mm GUIDE GAP').guide, [10]);
assert.deepEqual(parseTypedGaps('25mm GAP BETWEEN BOP AND TOS').rest, [25]);
assert.deepEqual(parseTypedGaps('REST(2kN), GUIDE(3kN), {axial disp=120mm}').evidence, []);
assert.deepEqual(parseTypedGaps('25mm', { supportGapColumn: true }).rest, [25]);
assert.deepEqual(parseTypedGaps('25').rest, [], 'numbers without mm are not automatically gaps');
assert.equal(compareEngineeringGaps('25mm GAP BETWEEN BOP AND TOS', 'LINE STOP GAP=25mm').status, 'REVIEW', 'different gap kind, no false match');
assert.equal(compareEngineeringGaps('25mm GAP', 'REST(2kN), LINE STOP GAP=25mm').status, 'REVIEW');
assert.equal(compareEngineeringGaps('25mm GAP', '[30mm GAP]').status, 'MISMATCH');
assert.equal(compareEngineeringGaps('10mm GUIDE GAP', '[GUIDE GAP=10mm]').status, 'MATCH');
assert.equal(compareEngineeringGaps('25mm LINE STOP GAP', 'LINE STOP GAP=25mm').status, 'MATCH');
assert.equal(compareEngineeringGaps('25mm GAP', '25mm GAP', 'S2_ONLY').status, 'NOT_APPLICABLE');

const negative = parseRestraintEvidence("DO NOT REST [25mm GAP](1kN), GUIDE(1kN)");
assert.deepEqual(negative.types, ['GUIDE']);
assert.ok(negative.uncertain.some(s => s.includes('DO_NOT_REST')));
assert.equal(compareRestraintCoverage('PIPE REST XRT01', "DO NOT REST [25mm GAP], GUIDE(1kN)").status, 'REVIEW');
const missingStop = compareRestraintCoverage('PIPE REST XRT01', "REST(2kN), LINE STOP(3kN), [LINE STOP GAP=25mm]");
assert.equal(missingStop.status, 'MISSING');
assert.equal(missingStop.missing, 'LINE_STOP');
assert.ok(missingStop.sourceEvidence.length > 0 && missingStop.targetEvidence.length > 0);
assert.equal(compareRestraintCoverage('WEAR PLATE TYPE-421', 'REST(2kN)').status, 'REVIEW', 'wear plate not verified structural rest restraint');
assert.equal(compareRestraintCoverage('PIPE STOP TYPE-602', 'LINE STOP(3kN)').status, 'COVERED');
assert.equal(compareRestraintCoverage('GUIDE TYPE-604', 'GUIDE(2kN)').status, 'COVERED');
assert.equal(engineeringReviewAction('S1_ONLY', compareEngineeringGaps('', ''), missingStop).code, 'VERIFY_IDENTITY');
assert.equal(engineeringReviewAction('MATCH', compareEngineeringGaps('25mm GAP', '[30mm GAP]'), missingStop).code, 'ENGINEERING_DISCREPANCY');
assert.equal(engineeringReviewAction('MATCH', compareEngineeringGaps('25mm GAP', '25mm GAP'), missingStop).transferReady, false);

const escape = (text) => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const mapping = [
  ['PIPE-1/B4','PS-006.5','PIPE REST XRT01','25mm GAP BETWEEN BOP AND TOS'],
  ['PIPE-1/B4','PS-007.1','PIPE STOP TYPE-602','10mm LINE STOP GAP'],
  ['PIPE-2','PS-001','GUIDE TYPE-604','10mm GUIDE GAP'],
  ['PIPE-4','PS-001','GUIDE TYPE-604','10mm GUIDE GAP'],
  ['PIPE-6','PS-XXXX','PIPE REST XRT01','25mm GAP'],
];
const notes = [
  ['/PIPE-1/B4','/PS-006.5',"REST(2kN), LINE STOP(3kN), [LINE STOP GAP=25mm]"],
  ['/PIPE-1/B4','PS-007.1',"LINE STOP(2kN), [LINE STOP GAP=10mm]"],
  ['/PIPE-2','PS-001',"GUIDE(1kN), [GUIDE GAP=10mm]"],
  ['/PIPE-8','PS-001',"GUIDE(1kN), [GUIDE GAP=10mm]"],
  ['/PIPE-6','/PS-XXXX',"REST(2kN), [25mm GAP]"],
];
const xml = [
  '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">',
  '<IsoPartition key="PS_MAPPING_S1" levelType="partition">',
  ...mapping.map(([pipe,id,dtxr,gap],i) => '<IsoItem key="map-'+i+'" levelType="group" sourceRefs="S1:'+(i+1)+'"><pipe>'+escape(pipe)+'</pipe><psNo>'+escape(id)+'</psNo><dtxr>'+escape(dtxr)+'</dtxr><supportGap>'+escape(gap)+'</supportGap></IsoItem>'),
  '</IsoPartition><IsoPartition key="ISO_NOTES_S2" levelType="partition">',
  ...notes.map(([pipe,id,note],i) => '<IsoItem key="note-'+i+'" levelType="group" sourceRefs="S2:'+(i+1)+'"><lineNoInCii>'+escape(pipe)+'</lineNoInCii><nodeName>'+escape(id)+'</nodeName><rawNote>'+escape(note)+'</rawNote></IsoItem>'),
  '</IsoPartition></IsoNoteXml>',
].join('');
const report = compareIsoNoteMapping({ sourceXml: xml, targetXml: xml });
assert.equal(report.ok, true);
assert.equal(report.summary.match, 3, 'only three exact pipe + full support identity matches');
assert.equal(report.summary.s1Only, 1, 'same PS-001 on another pipeline remains unmatched');
assert.equal(report.summary.s2Only, 1);
assert.equal(report.summary.review, 2, 'placeholder on each side stays separate');
const row = (id) => report.rows.find(r => r.psNo === id && r.status === 'MATCH');
const matchRest = row('PS-006.5');
assert.equal(matchRest.gap.status, 'REVIEW', 'matching number across REST vs LINE STOP is not clearance agreement');
assert.equal(matchRest.gap.s2RestMm, '');
assert.equal(matchRest.gap.s2LineStopMm, '25');
assert.equal(matchRest.coverage.status, 'MISSING');
assert.equal(matchRest.coverage.missing, 'LINE_STOP');
assert.equal(matchRest.action.code, 'ENGINEERING_DISCREPANCY');
assert.equal(matchRest.action.transferReady, false);
assert.equal(matchRest.s1Ref, 'S1:1');
assert.equal(matchRest.s2Ref, 'S2:1');
assert.ok(matchRest.sourceUid.includes('PS_MAPPING_S1'));
assert.ok(matchRest.targetUid.includes('ISO_NOTES_S2'));
assert.equal(matchRest.matchRule, 'NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1');
const stop = row('PS-007.1');
assert.equal(stop.gap.status, 'MATCH');
assert.equal(stop.coverage.status, 'COVERED');
const guide = report.rows.find(r => r.psNo === 'PS-001' && r.status === 'MATCH');
assert.equal(guide.gap.status, 'MATCH');
assert.equal(guide.coverage.status, 'COVERED');
const records = createCategorizedInputXmlCanvasModel({ xmlText: xml }).records;
const anchors = buildIsoNoteAnchorCandidates({ report, sourceRecords: records, targetRecords: records });
assert.equal(anchors.length, 3, 'engine identities can be linked for review regardless of engineering disagreements');
assert.ok(anchors.every(a => a.basis.includes('iso-note-pipeline-plus-full-support-id')));
assert.equal(validateIsoNoteCandidateIdentity(anchors[0], records, records).valid, true);
const s1Record = records.find(r => r.lineKey === 'PS_MAPPING_S1' && r.psNo === 'PS-001' && r.pipe === 'PIPE-4');
const s2Record = records.find(r => r.lineKey === 'ISO_NOTES_S2' && r.nodeName === 'PS-001' && r.lineNoInCii === '/PIPE-8');
const falseSimilarCandidate = { sourceUid: s1Record.uid, targetUid: s2Record.uid, matchPct: 0.66, status: 'valid' };
assert.equal(validateIsoNoteCandidateIdentity(falseSimilarCandidate, records, records).applicable, true);
assert.equal(validateIsoNoteCandidateIdentity(falseSimilarCandidate, records, records).valid, false, '66% text similarity must not approve cross-pipe engineering anchor');


const findings = buildIsoNoteEngineeringFindings(report);
const ids = findings.map(f => f.findingId);
assert.equal(new Set(ids).size, ids.length, 'Each engineering finding must have its own stable ID');
assert.ok(findings.some(f => f.domain === 'RESTRAINT' && f.kind === 'LINE_STOP' && f.status === 'MISSING'));
assert.ok(findings.some(f => f.domain === 'CLEARANCE' && f.kind === 'LINE_STOP' && f.status === 'REVIEW'));
assert.ok(findings.some(f => f.domain === 'CLEARANCE' && f.kind === 'GUIDE' && f.status === 'MATCH'));
assert.ok(findings.some(f => f.domain === 'IDENTITY' && f.status === 'S1_ONLY'));
const missingStopFinding = findings.find(f => f.domain === 'RESTRAINT' && f.kind === 'LINE_STOP' && f.status === 'MISSING');
assert.equal(missingStopFinding.s1Ref, 'S1:1');
assert.equal(missingStopFinding.s2Ref, 'S2:1');
assert.match(missingStopFinding.findingId, /S1:1=>S2:1#RESTRAINT:LINE_STOP/);
assert.equal(missingStopFinding.reviewAction.includes('Investigate ISONOTE'), true);
const ledgerCsv = serializeIsoNoteEngineeringFindingsCsv(report);
assert.match(ledgerCsv, /"Finding ID","Domain","Type","Finding Status","Applied Rule"/);
assert.match(ledgerCsv, /"S1:1","S2:1"/);
assert.match(ledgerCsv, /#CLEARANCE:LINE_STOP/);
assert.match(ledgerCsv, /"MISSING","ISONOTE_LINE_STOP"/);
assert.match(ledgerCsv, /"Raw S1 Evidence","Raw S2 Evidence"/);

const csv = serializeIsoNoteMappingCsv(report);
assert.match(csv, /"Line Stop Gap S1 mm","Line Stop Gap S2 mm"/);
assert.match(csv, /"Engineering Review Code","Review Action","Source UID","Target UID"/);
assert.match(csv, /"Restraint Evidence JSON"/);
assert.match(csv, /"NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1"/);
assert.match(csv, /"S1:1","S2:1"/);
assert.match(csv, /"ENGINEERING_DISCREPANCY"/);
assert.match(csv, /"MISSING"/);
assert.match(csv, /"TYPED_GAP"/);
const html = renderIsoNoteMappingCompareHtml(report, anchors.length);
assert.match(html, /LINE STOP gap S1\/S2/);
assert.match(html, /Restraint coverage/);
assert.match(html, /Engineering status:/);
assert.match(html, /S1:1/);
assert.match(html, /S2:1/);
assert.match(html, /Download engineering findings CSV/);

const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url),'utf8');
assert.match(runtime, /ISO engineering audit: /);
assert.match(runtime, /Engineering audit is read-only/);
assert.match(runtime, /isoNoteExactPairsOnly/);
assert.match(runtime, /serializeIsoNoteEngineeringFindingsCsv/);
assert.match(runtime, /download-iso-note-findings-csv/);
assert.match(runtime, /validateIsoNoteCandidateIdentity\(candidate, workspace\.source\.records, workspace\.target\.records\)/);
assert.match(runtime, /validateIsoNoteCandidateIdentity\(pair, workspace\.source\.records, workspace\.target\.records\)/);
console.log('xml-compare-iso-note-engineering-architecture.test.js passed');
