import { createCategorizedInputXmlCanvasModel } from './XmlCompareCategorizedInputXmlCanvasBuilder.js';
import { parseTypedGaps, compareEngineeringGaps, compareRestraintCoverage, engineeringReviewAction } from './XmlCompareIsoNoteEngineeringRules.js';
import { isoNoteCompositeIdentity, validateIsoNoteCompositeCandidate, isoNoteInputCoverage, normalizeIsoPipeline, normalizeIsoSupportId } from './XmlCompareIsoNoteIdentityAdapter.js';

export const ISO_NOTE_DIRECT_COMPARE_SCHEMA = 'iso-note-direct-compare/v1';
const clean = (value) => String(value ?? '').trim();
export const normalizeIsoLine = normalizeIsoPipeline;
export const normalizeIsoSupport = normalizeIsoSupportId;
const escapeHtml = (value) => clean(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const identityKey = (line, support) => line && support ? line + '\u0000' + support : '';
// A PS/SL support with a nonnumeric suffix (PS-XXXX, PS-10.X,
 // PS-XYZ.1) is provisional, never a verified engineering identity.
const placeholder = (value) => /^(?:PS|SL)-/i.test(value) &&
  !/^(?:PS|SL)-\d+(?:\.\d+)?$/i.test(value);
function xmlRows(xmlText, partition) {
  if (!clean(xmlText)) return [];
  const model = createCategorizedInputXmlCanvasModel({ xmlText });
  return (model.records || []).filter((rec) => rec.levelId === 'element' && rec.lineKey === partition);
}
// Compatibility facade. The single typed engineering-rules module owns gap
// extraction and comparison, so XML output, CSV and tests share one policy.
export function extractSupportGapMeasurements(value = '', options = {}) {
  const parsed = parseTypedGaps(value, options);
  return Object.freeze({ rest: parsed.rest, guide: parsed.guide, lineStop: parsed.lineStop, evidence: parsed.evidence });
}
export function compareSupportGapWithIsoNote(supportGap = '', isoNote = '', identityStatus = 'MATCH') {
  return compareEngineeringGaps(supportGap, isoNote, identityStatus);
}

function extractRows(xmlText, side) {
  const mapping = side === 'S1';
  const partition = mapping ? 'PS_MAPPING_S1' : 'ISO_NOTES_S2';
  return xmlRows(xmlText, partition).map((record, index) => {
    const pipe = clean(mapping ? record.pipe : record.lineNoInCii);
    // NODE_NAME remains authoritative when present. If blank, retain the
    // original note-prefix supportId from the categorized graph; never use
    // NODE_NUM or the graph row-instance key as an engineering identity.
    const id = clean(mapping ? (record.psNo || record.supportId)
      : (record.nodeName || record.rawSupportId || record.supportId));
    const normalizedPipe = normalizeIsoLine(pipe);
    const normalizedId = normalizeIsoSupport(id);
    const identity = isoNoteCompositeIdentity(record, mapping ? 'source' : 'target');
    const invalid = !identity.valid;
    return Object.freeze({
      side, pipe, id, psNo: mapping ? id : '', lineNoInCii: mapping ? '' : pipe, nodeName: mapping ? '' : id, uid: clean(record.uid), supportGap: mapping ? clean(record.supportGap) : '', dtxr: mapping ? clean(record.dtxr) : '', isoNote: mapping ? '' : clean(record.rawNote || record.supportISONOTE), normalizedPipe, normalizedId,
      key: identity.key, identityReason: identity.reason || '',
      valid: !invalid, placeholder: placeholder(normalizedId),
      sourceRef: clean(record.rawSummary?.sourceRefs || record.sourceRefs?.join(' ') || record.uid),
      index: index + 1,
    });
  });
}
function reportRow(left, right, status, reason) {
  const a = left || null, b = right || null, first = a || b;
  const dtxr = a?.dtxr || '', supportGap = a?.supportGap || '', isoNote = b?.isoNote || '';
  const gap = compareSupportGapWithIsoNote(supportGap, isoNote, status);
  const coverage = compareRestraintCoverage(dtxr, isoNote, status);
  const action = engineeringReviewAction(status, gap, coverage, {
    pipeline: first?.normalizedPipe, supportId: a?.id || b?.id,
    s1Ref: a?.sourceRef, s2Ref: b?.sourceRef,
    dtxr, supportGap, isoNote,
  });
  return Object.freeze({
    pipe: first?.normalizedPipe || '', psNo: a?.id || '', nodeName: b?.id || '',
    status, reason, identityFailureCode: status === 'REVIEW' ?
      (a?.identityReason || b?.identityReason || 'DUPLICATE_COMPOSITE_ID') :
      (status === 'S1_ONLY' || status === 'S2_ONLY') ? 'OUT_OF_SCOPE_OR_MISSING_REFERENCE' : '',
    supportGap, dtxr, isoNote, gap, coverage, action,
    matchRule: 'NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1',
    sourceUid: a?.uid || '', targetUid: b?.uid || '',
    s1Ref: a?.sourceRef || '', s2Ref: b?.sourceRef || '',
  });
}
function compareRows(s1, s2) {
  const byKey1 = new Map(), byKey2 = new Map();
  for (const item of s1) if (item.key) byKey1.set(item.key, [...(byKey1.get(item.key) || []), item]);
  for (const item of s2) if (item.key) byKey2.set(item.key, [...(byKey2.get(item.key) || []), item]);
  const seen1 = new Set(), seen2 = new Set(), output = [];
  for (const item of s1) {
    if (!item.valid) {
      output.push(reportRow(item, null, 'REVIEW', (item.identityReason || 'MISSING_IDENTITY_PART') + ': S1 PS number or pipeline requires manual identity review'));
      continue;
    }
    const a = byKey1.get(item.key) || [], b = byKey2.get(item.key) || [];
    if (!b.length) { output.push(reportRow(item, null, 'S1_ONLY', 'OUT_OF_SCOPE_OR_MISSING_REFERENCE: no NODE_NAME on the same normalized pipeline')); continue; }
    if (a.length !== 1 || b.length !== 1) {
      output.push(reportRow(item, null, 'REVIEW', 'Duplicate pipeline and support identity; verify rows individually'));
      continue;
    }
    seen1.add(item); seen2.add(b[0]);
    output.push(reportRow(item, b[0], 'MATCH', 'Pipeline and full support ID agree'));
  }
  for (const item of s2) {
    if (seen2.has(item)) continue;
    if (!item.valid) {
      output.push(reportRow(null, item, 'REVIEW', (item.identityReason || 'MISSING_IDENTITY_PART') + ': S2 NODE_NAME or pipeline requires manual identity review; original note token retained as evidence'));
      continue;
    }
    const a = byKey1.get(item.key) || [], b = byKey2.get(item.key) || [];
    const dup = a.length && (a.length !== 1 || b.length !== 1);
    if (dup) output.push(reportRow(null, item, 'REVIEW', 'Duplicate pipeline and support identity; verify rows individually'));
    else if (!a.length) output.push(reportRow(null, item, 'S2_ONLY', 'OUT_OF_SCOPE_OR_MISSING_REFERENCE: no PS NO on the same normalized pipeline'));
  }
  const order = { REVIEW: 0, S1_ONLY: 1, S2_ONLY: 2, MATCH: 3 };
  output.sort((a, b) => order[a.status] - order[b.status] || a.pipe.localeCompare(b.pipe, undefined, { numeric: true }) || (a.psNo || a.nodeName).localeCompare(b.psNo || b.nodeName, undefined, { numeric: true }));
  return Object.freeze(output);
}
export function compareIsoNoteMapping({ sourceXml = '', targetXml = '' } = {}) {
  const a = clean(sourceXml) ? sourceXml : targetXml;
  const b = clean(targetXml) ? targetXml : sourceXml;
  const s1 = extractRows(a, 'S1'), s2 = extractRows(b, 'S2');
  const coverage = isoNoteInputCoverage(s1, s2);
  if (!s1.length || !s2.length) {
    const missing = [!s1.length ? 'PS_MAPPING_S1 (PS NO, pipe)' : '', !s2.length ? 'ISO_NOTES_S2 (NODE_NAME, LinenoinCII)' : ''].filter(Boolean);
    return Object.freeze({
      schema: ISO_NOTE_DIRECT_COMPARE_SCHEMA, ok: false,
      rows: Object.freeze([]), countS1: s1.length, countS2: s2.length, coverage,
      summary: Object.freeze({ match: 0, s1Only: 0, s2Only: 0, review: 0, gapMatch: 0, gapMismatch: 0, gapReview: 0, gapNotSpecified: 0, coverageCovered: 0, coverageMissing: 0, coverageReview: 0, coverageExtra: 0 }),
      message: 'Cannot compare: missing ' + missing.join(' and ') + '. Load a combined categorized XML into Source A, or S1 into Source A and S2 into Target B.',
    });
  }
  const rows = compareRows(s1, s2);
  const count = (status) => rows.filter((item) => item.status === status).length;
  return Object.freeze({
    schema: ISO_NOTE_DIRECT_COMPARE_SCHEMA, ok: true, rows, coverage,
    countS1: s1.length, countS2: s2.length,
    summary: Object.freeze({ match: count('MATCH'), s1Only: count('S1_ONLY'), s2Only: count('S2_ONLY'), review: count('REVIEW'), gapMatch: rows.filter((item) => item.gap.status === 'MATCH').length, gapMismatch: rows.filter((item) => item.gap.status === 'MISMATCH').length, gapReview: rows.filter((item) => item.gap.status === 'REVIEW').length, gapNotSpecified: rows.filter((item) => item.gap.status === 'NOT_SPECIFIED').length, coverageCovered: rows.filter((item) => item.coverage.status === 'COVERED').length, coverageMissing: rows.filter((item) => item.coverage.status === 'MISSING').length, coverageReview: rows.filter((item) => item.coverage.status === 'REVIEW').length, coverageExtra: rows.filter((item) => item.coverage.status === 'EXTRA').length }),
    message: 'Exact pipeline + full support ID comparison. Checks parsed REST / GUIDE / LINE STOP restraints and typed gaps independently, with original evidence and review actions. Identity uses exact pipeline and full support ID, never 60% name similarity. Loads (kN) and axial displacement are not gaps.',
  });
}
// Defensive cross-partition guard for the GENERIC candidate approval UI.
// Text similarity (e.g. 66% PS-131.1 on a different pipe) is not evidence
// that a PS mapping record and an ISO note refer to the same support.
export function validateIsoNoteCandidateIdentity(candidate = {}, sourceRecords = [], targetRecords = []) {
  return validateIsoNoteCompositeCandidate(candidate, sourceRecords, targetRecords);
}

// Only exact one-to-one S1->S2 keys qualify as read-only audit link evidence.
// Resolve both IDs against the two actual loaded canvas datasets, not against
// matching records from the same partition on each copy of a combined XML.
export function buildIsoNoteAnchorCandidates({ report = null, sourceRecords = [], targetRecords = [] } = {}) {
  if (!report?.ok) return Object.freeze([]);
  const sourceByUid = new Map(sourceRecords.map((record) => [clean(record.uid), record]));
  const targetByUid = new Map(targetRecords.map((record) => [clean(record.uid), record]));
  const usedSource = new Set(), usedTarget = new Set();
  const candidates = [];
  for (const row of report.rows || []) {
    if (row.status !== 'MATCH' || !row.sourceUid || !row.targetUid) continue;
    const source = sourceByUid.get(row.sourceUid), target = targetByUid.get(row.targetUid);
    if (!source || !target || usedSource.has(source.uid) || usedTarget.has(target.uid)) continue;
    if (source.levelId !== 'element' || source.lineKey !== 'PS_MAPPING_S1') continue;
    if (target.levelId !== 'element' || target.lineKey !== 'ISO_NOTES_S2') continue;
    const sourceLine = normalizeIsoLine(source.pipe), targetLine = normalizeIsoLine(target.lineNoInCii);
    const sourceId = normalizeIsoSupport(source.psNo), targetId = normalizeIsoSupport(target.nodeName);
    if (!sourceLine || !sourceId || placeholder(sourceId) || placeholder(targetId)
        || sourceLine !== targetLine || sourceId !== targetId) continue;
    usedSource.add(source.uid); usedTarget.add(target.uid);
    candidates.push(Object.freeze({
      id: 'candidate:' + source.uid + '=>' + target.uid,
      sourceUid: source.uid, targetUid: target.uid,
      sourceStableKey: clean(source.key || source.uid),
      targetStableKey: clean(target.key || target.uid),
      sourceLabel: clean(source.psNo) + ' (' + sourceLine + ')',
      targetLabel: clean(target.nodeName) + ' (' + targetLine + ')',
      status: 'valid', method: 'iso-note-exact-key', transformBasis: 'identity-key',
      score: 1, identityConfidence: 1, allowDuplicateTarget: false,
      basis: Object.freeze(['iso-note-pipeline-plus-full-support-id']),
    }));
  }
  return Object.freeze(candidates);
}
function csvCell(value) {
  const v = clean(value);
  const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function serializeIsoNoteMappingCsv(report) {
  const headings = ['PIPE', 'PS NO (S1)', 'NODE_NAME (S2)', 'RESULT', 'REASON', 'S1 SOURCE REF', 'S2 SOURCE REF', 'Support Gap (S1)', 'ISONOTE (S2)', 'Rest Gap S1 mm', 'Rest Gap S2 mm', 'Guide Gap S1 mm', 'Guide Gap S2 mm', 'Gap Result', 'Gap Details', 'Line Stop Gap S1 mm', 'Line Stop Gap S2 mm', 'DTXR (S1)', 'ISONOTE Required Restraints', 'DTXR Provided Restraints', 'Missing Restraints', 'Extra Restraints', 'Restraint Coverage', 'Coverage Details', 'Identity Rule', 'Engineering Review Code', 'Review Action', 'Source UID', 'Target UID', 'REST/GUIDE/STOP Gap Evidence JSON', 'Restraint Evidence JSON'];
  const rows = (report?.rows || []).map((r) => [r.pipe, r.psNo, r.nodeName, r.status, r.reason, r.s1Ref, r.s2Ref, r.supportGap, r.isoNote, r.gap.s1RestMm, r.gap.s2RestMm, r.gap.s1GuideMm, r.gap.s2GuideMm, r.gap.status, r.gap.reason, r.gap.s1LineStopMm, r.gap.s2LineStopMm, r.dtxr, r.coverage.required, r.coverage.provided, r.coverage.missing, r.coverage.extra, r.coverage.status, r.coverage.reason, r.matchRule, r.action.code, r.action.action, r.sourceUid, r.targetUid, JSON.stringify({ S1: r.gap.s1Evidence, S2: r.gap.s2Evidence }), JSON.stringify({ S1: r.coverage.sourceEvidence, S2: r.coverage.targetEvidence })].map(csvCell).join(','));
  return [headings.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';
}
export function renderIsoNoteMappingCompareHtml(report = null, linkedCount = 0) {
  if (!report) return '';
  if (!report.ok) return '<section class="xml-compare-panel" aria-label="PS Mapping vs ISO Notes"><h3>PS Mapping ↔ ISO Notes</h3><p role="alert">' + escapeHtml(report.message) + '</p></section>';
  const s = report.summary;
  const rows = report.rows.map((r) => '<tr><td>' + escapeHtml(r.pipe) + '</td><td>' + escapeHtml(r.psNo || '—') + '</td><td>' + escapeHtml(r.nodeName || '—') + '</td><td><b>' + escapeHtml(r.status.replace('_', ' ')) + '</b></td><td>' + escapeHtml(r.reason) + '</td><td style="max-width:240px;white-space:normal">' + escapeHtml(r.supportGap || '—') + '</td><td style="max-width:360px;white-space:normal">' + escapeHtml(r.isoNote || '—') + '</td><td>' + escapeHtml((r.gap.s1RestMm || '—') + ' / ' + (r.gap.s2RestMm || '—')) + '</td><td>' + escapeHtml((r.gap.s1GuideMm || '—') + ' / ' + (r.gap.s2GuideMm || '—')) + '</td><td><b>' + escapeHtml(r.gap.status) + '</b></td><td>' + escapeHtml(r.gap.reason) + '</td><td>' + escapeHtml((r.gap.s1LineStopMm || '—') + ' / ' + (r.gap.s2LineStopMm || '—')) + '</td><td>' + escapeHtml(r.dtxr || '—') + '</td><td>' + escapeHtml(r.coverage.required || '—') + '</td><td>' + escapeHtml(r.coverage.provided || '—') + '</td><td>' + escapeHtml(r.coverage.missing || '—') + '</td><td>' + escapeHtml(r.coverage.extra || '—') + '</td><td><b>' + escapeHtml(r.coverage.status) + '</b></td><td>' + escapeHtml(r.coverage.reason) + '</td><td>' + escapeHtml(r.action.code) + '</td><td>' + escapeHtml(r.action.action) + '</td><td>' + escapeHtml(r.s1Ref || '—') + '</td><td>' + escapeHtml(r.s2Ref || '—') + '</td></tr>').join('');
  return '<section class="xml-compare-panel" aria-label="PS Mapping vs ISO Notes"><div class="xml-compare-panel-title">PS Mapping ↔ ISO Notes: ' +
    escapeHtml(report.countS1) + ' S1 rows / ' + escapeHtml(report.countS2) + ' S2 rows</div><p>' + escapeHtml(report.message) +
    '</p><p><b>Read-only audit identity links:</b> ' + linkedCount + ' / ' + s.match + ' exact matches. These links are not transfer approvals and never populate the transfer approval set.</p><p><b>Match:</b> ' + s.match + ' &nbsp; <b>S1 only:</b> ' + s.s1Only + ' &nbsp; <b>S2 only:</b> ' + s.s2Only +
    ' &nbsp; <b>Review:</b> ' + s.review + '</p><p><b>Gap match:</b> ' + s.gapMatch + ' &nbsp; <b>Gap mismatch:</b> ' + s.gapMismatch + ' &nbsp; <b>Gap review:</b> ' + s.gapReview + ' &nbsp; <b>Gap not specified:</b> ' + s.gapNotSpecified + '</p><p><b>Restraints covered:</b> ' + s.coverageCovered + ' &nbsp; <b>Missing:</b> ' + s.coverageMissing + ' &nbsp; <b>Extra:</b> ' + s.coverageExtra + ' &nbsp; <b>Review:</b> ' + s.coverageReview + '</p><p><b>Engineering status:</b> Identity links are not approvals of physical restraint or gap compliance. All suggested actions require verification.</p><button type="button" data-xml-compare-action="download-iso-note-comparison-csv">Download comparison CSV</button> <button type="button" data-xml-compare-action="download-iso-note-findings-csv">Download engineering findings CSV</button>' +
    '<div style="max-height:390px;overflow:auto"><table class="xml-compare-topology-table"><thead><tr><th>Normalized pipeline</th><th>PS NO (S1)</th><th>NODE_NAME (S2)</th><th>Result</th><th>Details</th><th>Support Gap (S1)</th><th>ISONOTE (S2)</th><th>Rest gap S1 / S2 (mm)</th><th>Guide gap S1 / S2 (mm)</th><th>Gap result</th><th>Gap details</th><th>LINE STOP gap S1/S2 (mm)</th><th>DTXR (S1)</th><th>ISONOTE Required</th><th>DTXR Provided</th><th>Missing</th><th>Extra</th><th>Restraint coverage</th><th>Coverage reason</th><th>Action code</th><th>Review action</th><th>S1 ref</th><th>S2 ref</th></tr></thead><tbody>' +
    rows + '</tbody></table></div></section>';
}
