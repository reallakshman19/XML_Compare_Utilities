import assert from 'node:assert/strict';
import fs from 'node:fs';
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
assert.equal(auditJson.identityRule, 'NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1');
assert.equal(JSON.parse(exportIsoNoteRevCompareAuditJson(audit)).mode, 'iso-note-engineering');
const csv = exportRevCompareCsv(model);
assert.equal(csv, exportIsoNoteRevCompareAuditCsv(audit));
assert.match(csv, /"Finding ID","Domain","Type"/);
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
