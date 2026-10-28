import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createCompositeIdentityPolicy, resolveCompositeIdentity, validateCompositeCandidate,
  summarizeCompositeCoverage,
} from '../xml-compare/XmlCompareCompositeIdentityPolicy.js';
import {
  ISO_NOTE_COMPOSITE_ID_POLICY, isoNoteCompositeIdentity,
  validateIsoNoteCompositeCandidate,
} from '../xml-compare/XmlCompareIsoNoteIdentityAdapter.js';
import {
  compareIsoNoteMapping, validateIsoNoteCandidateIdentity,
  buildIsoNoteAnchorCandidates,
} from '../xml-compare/XmlCompareIsoNoteDirectCompare.js';
import { compareIsoNoteNodeNameAndToken, extractIsoNoteSupportToken } from '../xml-compare/XmlCompareIsoNoteTokenPolicy.js';
import { guardCompositeApprovalAction } from '../xml-compare/XmlCompareCompositeApprovalGate.js';
import { buildIsoNoteEngineeringFindings, serializeIsoNoteEngineeringFindingsCsv } from '../xml-compare/XmlCompareIsoNoteEngineeringFindings.js';
import { createCategorizedInputXmlCanvasModel } from '../xml-compare/XmlCompareCategorizedInputXmlCanvasBuilder.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import {
  ISO_NOTE_S1_HEADER_ALIASES, classifyIsoNoteSource,
} from '../xml-compare/table-categorizer/table-categorized-xml-iso-note-source-setup.js';

const source = { pipe: 'PIPE-1/B4', psNo: 'PS-001' };
const target = { lineNoInCii: '/PIPE-1/B4', nodeName: '/PS-001' };
const wrongLine = { lineNoInCii: '/PIPE-9/B4', nodeName: '/PS-001' };
assert.equal(isoNoteCompositeIdentity(source, 'source').key, isoNoteCompositeIdentity(target, 'target').key);
assert.notEqual(isoNoteCompositeIdentity(source, 'source').key, isoNoteCompositeIdentity(wrongLine, 'target').key);
assert.equal(isoNoteCompositeIdentity({ pipe: 'PIPE-1', psNo: 'PS02364.1' }, 'source').reason, 'NONCANONICAL_ID');
assert.equal(isoNoteCompositeIdentity({ lineNoInCii: 'PIPE-1', nodeName: 'PS-10.X' }, 'target').valid, false);
assert.equal(isoNoteCompositeIdentity({ lineNoInCii: 'PIPE-1', nodeName: 'PS-006.10' }, 'target').valid, true);
assert.equal(isoNoteCompositeIdentity({
  lineNoInCii: 'PIPE-1', nodeName: '/PS-100.1',
  rawNote: "/PS-101.1 :ISONOTE 'REST(2kN)'",
}, 'target').reason, 'NODE_NAME_NOTE_MISMATCH');
assert.equal(isoNoteCompositeIdentity({ lineNoInCii: 'PIPE-1', nodeName: 'PS-006.1' }, 'target').valid, true);
assert.notEqual(isoNoteCompositeIdentity({ lineNoInCii: 'PIPE-1', nodeName: 'PS-006.10' }, 'target').key,
  isoNoteCompositeIdentity({ lineNoInCii: 'PIPE-1', nodeName: 'PS-006.1' }, 'target').key);

assert.equal(extractIsoNoteSupportToken('/PS-006.5/DATUM :ISONOTE REST(2kN)').normalized, 'PS-006.5');
assert.equal(extractIsoNoteSupportToken('/PS-006.5/DATUM :ISONOTE REST(2kN)').hasDatum, true);
assert.equal(compareIsoNoteNodeNameAndToken('PS-006.5', '/PS-006.5/DATUM :ISONOTE REST(2kN)').valid, true);
assert.equal(isoNoteCompositeIdentity({ lineNoInCii: '/PIPE-1', nodeName: 'PS-006.5',
  rawNote: '/PS-006.5/DATUM :ISONOTE REST(2kN)' }, 'target').valid, true, 'DATUM cannot invalidate canonical identity');
assert.equal(isoNoteCompositeIdentity({ lineNoInCii: '/PIPE-1', nodeName: '',
  rawNote: '/PS-006.5 :ISONOTE REST(2kN)', supportId: 'PS-006.5' }, 'target').reason,
  'NODE_NAME_MISSING_NOTE_TOKEN_PRESENT', 'note-token fallback remains REVIEW, not MATCH');

const custom = createCompositeIdentityPolicy({ id: 'generic-non-iso', sourceRole: 'A', targetRole: 'B',
  parts: [{ name: 'system', sourceField: 'equipment', targetField: 'asset', normalization: { caseFold: true } },
    { name: 'tag', sourceField: 'ref', targetField: 'tag' }] });
assert.equal(resolveCompositeIdentity({ equipment: 'motor', ref: 'E100' }, custom).key,
  resolveCompositeIdentity({ asset: 'MOTOR', tag: 'e100' }, custom, 'target').key);
assert.equal(validateCompositeCandidate({ sourceUid: 'a', targetUid: 'b' },
  [{ uid: 'a', sourceRole: 'A', equipment: 'motor', ref: 'E100' }],
  [{ uid: 'b', sourceRole: 'B', asset: 'MOTOR', tag: 'E100' }], custom).valid, true);
assert.equal(validateCompositeCandidate({ sourceUid: 'a', targetUid: 'b' },
  [{ uid: 'a', sourceRole: 'X', equipment: 'motor', ref: 'E100' }],
  [{ uid: 'b', sourceRole: 'Y', asset: 'MOTOR', tag: 'E100' }], custom).applicable, false);

const rawAlias = [
  'Support No\tBore\tpipe\tDTXR\tSupport Gap\tMandatory',
  'PS-124.1\t50.00\tPIPE-1/B4\tGUIDE TYPE-604\t\tNo',
].join('\n');
assert.equal(classifyIsoNoteSource({ sourceId: 'S1', sourceText: rawAlias }), 'mapping');
const parsed = parseTableSource(rawAlias, { sourceId: 'S1', delimiterMode: 'tab', headerAliases: ISO_NOTE_S1_HEADER_ALIASES });
assert.equal(parsed.rows.length, 1);
assert.equal(parsed.headers[0], 'PS NO');
assert.equal(parsed.originalHeaders[0], 'Support No');
assert.equal(parsed.rows[0].rawByHeader['Support No'], 'PS-124.1');
assert.equal(parsed.rows[0].rawByHeader['PS NO'], 'PS-124.1');
assert.equal(parsed.rows[0].rawCells[0], 'PS-124.1');
assert.equal(parsed.aliasBindings.length, 1);
assert.equal(parsed.diagnostics.find(d => d.code === 'column_alias_applied').severity, 'INFO');
const unaliased = parseTableSource(rawAlias, { sourceId: 'S1', delimiterMode: 'tab' });
assert.equal(unaliased.headers[0], 'Support No', 'generic parser must not silently apply ISO aliases');
const ambiguousAlias = parseTableSource('PS NO\tSupport No\tpipe\nPS-01\tPS-02\tPIPE', {
  sourceId: 'S1', delimiterMode: 'tab', headerAliases: ISO_NOTE_S1_HEADER_ALIASES,
});
assert.deepEqual(ambiguousAlias.headers, ['PS NO', 'Support No', 'pipe'], 'explicit PS NO takes precedence over alias collision');

const escape = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
// Synthetic coverage benchmark matches the user's record counts and hazard
// distribution, but commits NO user-supplied engineering rows to the repo.
const mapping = Array.from({ length: 2778 }, (_, i) => ({
  pipe: 'PIPE-S1-' + (i % 41),
  psNo: 'PS-' + String(i + 1).padStart(5, '0'),
}));
for (let i = 2750; i < 2778; i++) {
  mapping[i].psNo = i % 2 === 0 ? 'PS' + String(i) + '.1' : 'SL-' + i + '..4';
}
const notes = [];
for (let i = 0; i < 7; i++) notes.push({
  lineNoInCii: '/' + mapping[i].pipe, nodeName: '/' + mapping[i].psNo,
});
for (let i = 7; i < 720; i++) notes.push({
  lineNoInCii: '/PIPE-S2-' + (i % 19), nodeName: mapping[i].psNo,
});
for (let i = 0; i < 99; i++) notes.push({
  lineNoInCii: '/PIPE-S2-' + (i % 19),
  nodeName: i < 15 ? (i % 2 ? 'SL-263..' + (i + 1) : 'PS0' + (2300 + i) + '.1')
    : 'PS-' + String(10000 + i),
});
assert.equal(mapping.length, 2778);
assert.equal(notes.length, 819);
const coverage = summarizeCompositeCoverage(mapping, notes, ISO_NOTE_COMPOSITE_ID_POLICY);
// Explicitly assert the same-ID / different-pipeline hazard population.
const mappingById = new Map(mapping.map(r => [r.psNo.toUpperCase(), r.pipe.toUpperCase()]));
const wrongPipelineCount = notes.filter(n => {
  const key = n.nodeName.replace(/^\/+/, '').toUpperCase();
  return mappingById.has(key) && mappingById.get(key) !== n.lineNoInCii.replace(/^\/+/, '').toUpperCase();
}).length;
assert.equal(wrongPipelineCount, 713, 'benchmark must directly count all wrong-pipeline hazards');
assert.equal(coverage.sourceRows, 2778);
assert.equal(coverage.targetRows, 819);
assert.equal(coverage.sourceScopeCount, 41);
assert.equal(coverage.targetScopeCount, 26);
assert.equal(coverage.sharedScopeCount, 7);
assert.equal(coverage.sourceNoncanonical, 28);
assert.equal(coverage.targetNoncanonical, 15);
assert.equal(coverage.sourceCompositeDuplicates, 0);
assert.equal(coverage.targetCompositeDuplicates, 0);
assert.equal(coverage.coverageConfirmed, false);

const xml = '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">' +
  '<IsoPartition key="PS_MAPPING_S1" levelType="partition">' +
  mapping.map((r, i) => '<IsoItem key="S1-'+i+'" sourceRefs="S1:'+(i+1)+'"><pipe>'+
    escape(r.pipe)+'</pipe><psNo>'+escape(r.psNo)+'</psNo></IsoItem>').join('') +
  '</IsoPartition><IsoPartition key="ISO_NOTES_S2" levelType="partition">' +
  notes.map((r, i) => '<IsoItem key="S2-'+i+'" sourceRefs="S2:'+(i+1)+'"><lineNoInCii>'+
    escape(r.lineNoInCii)+'</lineNoInCii><nodeName>'+escape(r.nodeName)+'</nodeName>'+
    '<rawNote>REST(2kN) [25mm GAP]</rawNote></IsoItem>').join('') +
  '</IsoPartition></IsoNoteXml>';
const result = compareIsoNoteMapping({ sourceXml: xml, targetXml: xml });
assert.equal(result.ok, true);
assert.equal(result.countS1, 2778);
assert.equal(result.countS2, 819);
assert.equal(result.summary.match, 7, 'benchmark: seven exact composite-key matches');
assert.equal(result.summary.s1Only + result.rows.filter(r => r.status === 'REVIEW' && r.psNo).length, 2771);
assert.equal(result.summary.s2Only + result.rows.filter(r => r.status === 'REVIEW' && r.nodeName).length, 812);
assert.equal(result.summary.review, 43, '28 S1 and 15 S2 symbolic IDs retained for review');
assert.equal(result.coverage.sharedScopeCount, 7);
assert.equal(result.coverage.sourceCompositeDuplicates, 0);
assert.equal(result.coverage.targetCompositeDuplicates, 0);
assert.equal(result.rows.filter(r => r.status === 'MATCH' && r.gap.status === 'MATCH').length, 0,
  'S1 gaps absent: no verified numerical gap matches');
const provenance = buildIsoNoteEngineeringFindings(result);
assert.ok(provenance.every(f => Object.prototype.hasOwnProperty.call(f, 'identityFailureCode')));
assert.match(serializeIsoNoteEngineeringFindingsCsv(result), /"Identity Failure Code"/);
const records = createCategorizedInputXmlCanvasModel({ xmlText: xml }).records;
const auto = buildIsoNoteAnchorCandidates({ report: result, sourceRecords: records, targetRecords: records });
assert.equal(auto.length, 7);
const wrongSource = records.find(r => r.lineKey === 'PS_MAPPING_S1' && r.psNo === mapping[7].psNo);
const wrongTarget = records.find(r => r.lineKey === 'ISO_NOTES_S2' && r.nodeName === mapping[7].psNo);
const falseCandidate = { sourceUid: wrongSource.uid, targetUid: wrongTarget.uid, status: 'valid', score: .99 };
assert.equal(validateIsoNoteCompositeCandidate(falseCandidate, records, records).valid, false);
assert.equal(validateIsoNoteCandidateIdentity(falseCandidate, records, records).valid, false);
const goodCandidate = auto[0];
for (const action of [
  { type: 'accept-candidate', candidate: falseCandidate },
  { type: 'bulk-approve-candidate-pairs', candidates: [goodCandidate, falseCandidate] },
  { type: 'approve-pending-connector' },
]) {
  const verdict = guardCompositeApprovalAction({
    scoped: true, action, sourceRecords: records, targetRecords: records,
    pendingPreview: action.type === 'approve-pending-connector' ? falseCandidate : null,
    policy: ISO_NOTE_COMPOSITE_ID_POLICY,
  });
  assert.equal(verdict.blocked, true, action.type + ' must reject wrong-pipeline approval');
}
assert.equal(guardCompositeApprovalAction({
  scoped: true, action: { type: 'accept-candidate', candidate: goodCandidate },
  sourceRecords: records, targetRecords: records, policy: ISO_NOTE_COMPOSITE_ID_POLICY,
}).blocked, false);
assert.equal(guardCompositeApprovalAction({
  scoped: true, action: { type: 'accept-candidate', candidate: { sourceUid: 'unresolved', targetUid: 'bad' } },
  sourceRecords: records, targetRecords: records, policy: ISO_NOTE_COMPOSITE_ID_POLICY,
}).reason, 'RECORD_NOT_IN_SCOPE');
assert.equal(guardCompositeApprovalAction({
  scoped: true, action: { type: 'bulk-approve-candidate-pairs', candidates: [] },
  sourceRecords: records, targetRecords: records, policy: ISO_NOTE_COMPOSITE_ID_POLICY,
}).reason, 'NO_APPROVAL_CANDIDATES');
assert.equal(guardCompositeApprovalAction({
  scoped: false, action: { type: 'accept-candidate', candidate: falseCandidate },
  sourceRecords: records, targetRecords: records, policy: ISO_NOTE_COMPOSITE_ID_POLICY,
}).blocked, false, 'unrelated non-ISO workflows retain their own identity policy');
const samePartition = {
  sourceUid: records.find(r => r.lineKey === 'PS_MAPPING_S1').uid,
  targetUid: records.find(r => r.lineKey === 'PS_MAPPING_S1').uid,
};
assert.equal(guardCompositeApprovalAction({
  scoped: true, action: { type: 'accept-candidate', candidate: samePartition },
  sourceRecords: records, targetRecords: records, policy: ISO_NOTE_COMPOSITE_ID_POLICY,
}).reason, 'POLICY_OUT_OF_SCOPE');

assert.ok(result.rows.some(r => r.nodeName === 'PS02300.1' || r.nodeName?.startsWith('PS02')),
  'raw noncanonical NODE_NAME values must survive the XML parser');
// When NODE_NAME is blank, the graph's supportId is derived from the original
// ISONOTE prefix, not from NODE_NUM; a placeholder remains REVIEW.
const blankNameXml = '<IsoNoteXml><IsoPartition key="PS_MAPPING_S1">' +
  '<IsoItem key="m"><pipe>PIPE-A</pipe><psNo>PS-111.1</psNo></IsoItem></IsoPartition>' +
  '<IsoPartition key="ISO_NOTES_S2"><IsoItem key="n">' +
  '<lineNoInCii>/PIPE-A</lineNoInCii><nodeName></nodeName>' +
  '<supportId>PS-XXXX</supportId><nodeNumber>5790</nodeNumber>' +
  '<rawNote>/PS-XXXX :ISONOTE REST(2kN)</rawNote></IsoItem></IsoPartition></IsoNoteXml>';
const blankNameReport = compareIsoNoteMapping({ sourceXml: blankNameXml, targetXml: blankNameXml });
assert.equal(blankNameReport.rows.find(r => r.status === 'REVIEW').nodeName, 'PS-XXXX');
assert.equal(blankNameReport.rows.find(r => r.status === 'REVIEW').identityFailureCode, 'NODE_NAME_MISSING_NOTE_TOKEN_PRESENT');
const blankFinding = buildIsoNoteEngineeringFindings(blankNameReport).find(f => f.status === 'REVIEW');
assert.equal(blankFinding.identityFailureCode, 'NODE_NAME_MISSING_NOTE_TOKEN_PRESENT');
const blankCsv = serializeIsoNoteEngineeringFindingsCsv(blankNameReport);
assert.match(blankCsv, /NODE_NAME_MISSING_NOTE_TOKEN_PRESENT/);
const conflictXml = '<IsoNoteXml><IsoPartition key="PS_MAPPING_S1"><IsoItem><pipe>PIPE-A</pipe><psNo>PS-100.1</psNo></IsoItem></IsoPartition><IsoPartition key="ISO_NOTES_S2"><IsoItem><lineNoInCii>PIPE-A</lineNoInCii><nodeName>PS-100.1</nodeName><rawNote>/PS-101.1 :ISONOTE REST(2kN)</rawNote></IsoItem></IsoPartition></IsoNoteXml>';
const conflict = compareIsoNoteMapping({ sourceXml: conflictXml, targetXml: conflictXml });
assert.equal(conflict.summary.match, 0, 'conflicting token blocks automatic identity');
assert.equal(conflict.rows.find(r => r.status === 'REVIEW').identityFailureCode, 'NODE_NAME_NOTE_MISMATCH');
assert.match(serializeIsoNoteEngineeringFindingsCsv(conflict), /NODE_NAME_NOTE_MISMATCH/);

assert.ok(!blankNameReport.rows.some(r => r.nodeName === '5790'), 'NODE_NUM is not a support identity');

const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
assert.match(runtime, /approvePolicyViolation/);
assert.match(runtime, /isIsoNoteEngineeringInput\(state\.textA, state\.textA\)/);
assert.match(runtime, /isIsoNoteEngineeringInput\(state\.textB, state\.textB\)/);
assert.match(runtime, /guardCompositeApprovalAction/);

assert.match(runtime, /approve-pending-connector/);
assert.match(runtime, /bulk-approve-candidate-pairs/);
console.log('xml-compare-composite-identity-benchmark.test.js passed');
