import { createCategorizedInputXmlCanvasModel } from './XmlCompareCategorizedInputXmlCanvasBuilder.js';

export const ISO_NOTE_DIRECT_COMPARE_SCHEMA = 'iso-note-direct-compare/v1';
const clean = (value) => String(value ?? '').trim();
export const normalizeIsoLine = (value) => clean(value).replace(/^\/+/, '').trim().toUpperCase();
export const normalizeIsoSupport = (value) => clean(value).replace(/^\/+/, '').trim().toUpperCase();
const escapeHtml = (value) => clean(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const identityKey = (line, support) => line && support ? line + '\u0000' + support : '';
const placeholder = (value) => /^(PS|SL)-X{3,}$/i.test(value);
function xmlRows(xmlText, partition) {
  if (!clean(xmlText)) return [];
  const model = createCategorizedInputXmlCanvasModel({ xmlText });
  return (model.records || []).filter((rec) => rec.levelId === 'element' && rec.lineKey === partition);
}
function extractRows(xmlText, side) {
  const mapping = side === 'S1';
  const partition = mapping ? 'PS_MAPPING_S1' : 'ISO_NOTES_S2';
  return xmlRows(xmlText, partition).map((record, index) => {
    const pipe = clean(mapping ? record.pipe : record.lineNoInCii);
    const id = clean(mapping ? record.psNo : record.nodeName);
    const normalizedPipe = normalizeIsoLine(pipe);
    const normalizedId = normalizeIsoSupport(id);
    const invalid = !normalizedPipe || !normalizedId || placeholder(normalizedId);
    return Object.freeze({
      side, pipe, id, uid: clean(record.uid), normalizedPipe, normalizedId,
      key: !invalid ? identityKey(normalizedPipe, normalizedId) : '',
      valid: !invalid, placeholder: placeholder(normalizedId),
      sourceRef: clean(record.rawSummary?.sourceRefs || record.sourceRefs?.join(' ') || record.uid),
      index: index + 1,
    });
  });
}
function reportRow(left, right, status, reason) {
  const a = left || null, b = right || null, first = a || b;
  return Object.freeze({
    pipe: first?.normalizedPipe || '', psNo: a?.id || '', nodeName: b?.id || '',
    status, reason, sourceUid: a?.uid || '', targetUid: b?.uid || '', s1Ref: a?.sourceRef || '', s2Ref: b?.sourceRef || '',
  });
}
function compareRows(s1, s2) {
  const byKey1 = new Map(), byKey2 = new Map();
  for (const item of s1) if (item.key) byKey1.set(item.key, [...(byKey1.get(item.key) || []), item]);
  for (const item of s2) if (item.key) byKey2.set(item.key, [...(byKey2.get(item.key) || []), item]);
  const seen1 = new Set(), seen2 = new Set(), output = [];
  for (const item of s1) {
    if (!item.valid) {
      output.push(reportRow(item, null, 'REVIEW', item.placeholder ? 'Placeholder PS number cannot be auto-matched' : 'Missing pipe or PS number'));
      continue;
    }
    const a = byKey1.get(item.key) || [], b = byKey2.get(item.key) || [];
    if (!b.length) { output.push(reportRow(item, null, 'S1_ONLY', 'No NODE_NAME on the same normalized pipeline')); continue; }
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
      output.push(reportRow(null, item, 'REVIEW', item.placeholder ? 'Placeholder NODE_NAME cannot be auto-matched' : 'Missing line number or NODE_NAME'));
      continue;
    }
    const a = byKey1.get(item.key) || [], b = byKey2.get(item.key) || [];
    const dup = a.length && (a.length !== 1 || b.length !== 1);
    if (dup) output.push(reportRow(null, item, 'REVIEW', 'Duplicate pipeline and support identity; verify rows individually'));
    else if (!a.length) output.push(reportRow(null, item, 'S2_ONLY', 'No PS NO on the same normalized pipeline'));
  }
  const order = { REVIEW: 0, S1_ONLY: 1, S2_ONLY: 2, MATCH: 3 };
  output.sort((a, b) => order[a.status] - order[b.status] || a.pipe.localeCompare(b.pipe, undefined, { numeric: true }) || (a.psNo || a.nodeName).localeCompare(b.psNo || b.nodeName, undefined, { numeric: true }));
  return Object.freeze(output);
}
export function compareIsoNoteMapping({ sourceXml = '', targetXml = '' } = {}) {
  const a = clean(sourceXml) ? sourceXml : targetXml;
  const b = clean(targetXml) ? targetXml : sourceXml;
  const s1 = extractRows(a, 'S1'), s2 = extractRows(b, 'S2');
  if (!s1.length || !s2.length) {
    const missing = [!s1.length ? 'PS_MAPPING_S1 (PS NO, pipe)' : '', !s2.length ? 'ISO_NOTES_S2 (NODE_NAME, LinenoinCII)' : ''].filter(Boolean);
    return Object.freeze({
      schema: ISO_NOTE_DIRECT_COMPARE_SCHEMA, ok: false,
      rows: Object.freeze([]), countS1: s1.length, countS2: s2.length,
      summary: Object.freeze({ match: 0, s1Only: 0, s2Only: 0, review: 0 }),
      message: 'Cannot compare: missing ' + missing.join(' and ') + '. Load a combined categorized XML into Source A, or S1 into Source A and S2 into Target B.',
    });
  }
  const rows = compareRows(s1, s2);
  const count = (status) => rows.filter((item) => item.status === status).length;
  return Object.freeze({
    schema: ISO_NOTE_DIRECT_COMPARE_SCHEMA, ok: true, rows,
    countS1: s1.length, countS2: s2.length,
    summary: Object.freeze({ match: count('MATCH'), s1Only: count('S1_ONLY'), s2Only: count('S2_ONLY'), review: count('REVIEW') }),
    message: 'Compared S1 pipe + PS NO against S2 LinenoinCII + NODE_NAME. Removes only leading slashes, trims whitespace, and ignores case.',
  });
}
// Only exact one-to-one S1->S2 keys can enter the approval ledger.
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
      status: 'valid', method: 'iso-note-exact-key',
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
  const headings = ['PIPE', 'PS NO (S1)', 'NODE_NAME (S2)', 'RESULT', 'REASON', 'S1 SOURCE REF', 'S2 SOURCE REF'];
  const rows = (report?.rows || []).map((r) => [r.pipe, r.psNo, r.nodeName, r.status, r.reason, r.s1Ref, r.s2Ref].map(csvCell).join(','));
  return [headings.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';
}
export function renderIsoNoteMappingCompareHtml(report = null, linkedCount = 0) {
  if (!report) return '';
  if (!report.ok) return '<section class="xml-compare-panel" aria-label="PS Mapping vs ISO Notes"><h3>PS Mapping ↔ ISO Notes</h3><p role="alert">' + escapeHtml(report.message) + '</p></section>';
  const s = report.summary;
  const rows = report.rows.map((r) => '<tr><td>' + escapeHtml(r.pipe) + '</td><td>' + escapeHtml(r.psNo || '—') + '</td><td>' + escapeHtml(r.nodeName || '—') + '</td><td><b>' + escapeHtml(r.status.replace('_', ' ')) + '</b></td><td>' + escapeHtml(r.reason) + '</td></tr>').join('');
  return '<section class="xml-compare-panel" aria-label="PS Mapping vs ISO Notes"><div class="xml-compare-panel-title">PS Mapping ↔ ISO Notes: ' +
    escapeHtml(report.countS1) + ' S1 rows / ' + escapeHtml(report.countS2) + ' S2 rows</div><p>' + escapeHtml(report.message) +
    '</p><p><b>Anchors linked:</b> ' + linkedCount + ' / ' + s.match + ' exact matches. Review &amp; Transfer opens the approved links; no properties have been transferred.</p><p><b>Match:</b> ' + s.match + ' &nbsp; <b>S1 only:</b> ' + s.s1Only + ' &nbsp; <b>S2 only:</b> ' + s.s2Only +
    ' &nbsp; <b>Review:</b> ' + s.review + '</p><button type="button" data-xml-compare-action="download-iso-note-comparison-csv">Download comparison CSV</button>' +
    '<div style="max-height:390px;overflow:auto"><table class="xml-compare-topology-table"><thead><tr><th>Normalized pipeline</th><th>PS NO (S1)</th><th>NODE_NAME (S2)</th><th>Result</th><th>Details</th></tr></thead><tbody>' +
    rows + '</tbody></table></div></section>';
}
