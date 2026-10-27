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
// Compare actual clearance measurements, not textual similarity of different
// engineering fields.  REST/pipe clearance and GUIDE clearance are distinct.
export function extractSupportGapMeasurements(text = '', { supportGapColumn = false } = {}) {
  const input = clean(text);
  const values = { rest: [], guide: [] };
  const number = '(\\d+(?:[.,]\\d+)?)\\s*mm';
  const patterns = [
    new RegExp(number + '\\s*(?:(?:VERTICAL|PIPE|SUPPORT|REST|GUIDE)\\s+)?GAP\\b', 'gi'),
    new RegExp('\\b(?:(?:GUIDE|VERTICAL|PIPE|SUPPORT|REST)\\s+)?GAP\\s*(?:=|:|-)\\s*' + number + '\\b', 'gi'),
    new RegExp('\\b(?:(?:GUIDE|VERTICAL|PIPE|SUPPORT|REST)\\s+)?GAP\\s+' + number + '\\b', 'gi'),
    new RegExp(number + '\\s*(?:CLEARANCE)\\b', 'gi'),
  ];
  for (const re of patterns) {
    for (const match of input.matchAll(re)) {
      const mmText = match[1];
      const mm = Number(mmText.replace(',', '.'));
      if (!Number.isFinite(mm) || mm < 0) continue;
      const matched = match[0];
      const before = input.slice(Math.max(0, match.index - 24), match.index);
      const guide = /\bGUIDE\b/i.test(matched) ||
        /\bGUIDE(?:\s*\([^)]*\))?\s*[,;:\[\]\s]*$/i.test(before);
      const type = guide ? 'guide' : 'rest';
      if (!values[type].includes(mm)) values[type].push(mm);
    }
  }
  // The entire S1 field is a gap field, so a plain "25 mm" is meaningful.
  // On the ISO note side a bare mm might mean axial displacement, so NEVER
  // infer a gap there without the GAP or CLEARANCE keyword.
  if (supportGapColumn && !values.rest.length && !values.guide.length) {
    if (/^\s*(\d+(?:[.,]\d+)?)\s*mm\s*$/i.test(input)) {
      const mm = Number(RegExp.$1.replace(',', '.'));
      if (Number.isFinite(mm) && mm >= 0) values.rest.push(mm);
    }
  }
  return Object.freeze({
    rest: Object.freeze(values.rest),
    guide: Object.freeze(values.guide),
  });
}
const displayMm = (values) => values.length ? values.join(', ') : '';
export function compareSupportGapWithIsoNote(supportGap = '', isoNote = '', identityStatus = 'MATCH') {
  const s1 = extractSupportGapMeasurements(supportGap, { supportGapColumn: true });
  const s2 = extractSupportGapMeasurements(isoNote);
  const result = (status, reason) => Object.freeze({
    status, reason,
    s1RestMm: displayMm(s1.rest), s2RestMm: displayMm(s2.rest),
    s1GuideMm: displayMm(s1.guide), s2GuideMm: displayMm(s2.guide),
  });
  if (identityStatus !== 'MATCH') return result('NOT_APPLICABLE', 'Pipeline and support identity are not uniquely matched.');
  const kinds = ['rest', 'guide'].filter((kind) => s1[kind].length);
  const s2Declared = ['rest', 'guide'].filter((kind) => s2[kind].length);
  if (!kinds.length) {
    return result(clean(supportGap) || s2Declared.length ? 'REVIEW' : 'NOT_SPECIFIED', clean(supportGap)
      ? 'S1 Support Gap contains text but no unambiguous millimetre gap value.'
      : s2Declared.length ? 'Gap declared in ISO Note but absent from S1 Support Gap.'
        : 'Neither source declares a comparable rest or guide clearance in millimetres.');
  }
  if (kinds.some((kind) => s1[kind].length > 1 || s2[kind].length > 1)) {
    return result('REVIEW', 'Multiple distinct clearances of the same type; manual review required.');
  }
  const mismatches = kinds.filter((kind) => s1[kind].length && s2[kind].length && Math.abs(s1[kind][0] - s2[kind][0]) > 0.000001);
  if (mismatches.length) return result('MISMATCH', mismatches.map((kind) => kind + ' clearance differs').join('; '));
  const missing = kinds.filter((kind) => !s1[kind].length || !s2[kind].length);
  if (missing.length) return result('REVIEW', missing.map((kind) => kind.toUpperCase() + ' clearance stated on only one side').join('; ') + '.');
  return result('MATCH', 'Same clearance in millimetres for each declared gap type. Other ISO note instructions are not compared.');
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
      side, pipe, id, uid: clean(record.uid), supportGap: mapping ? clean(record.supportGap) : '', isoNote: mapping ? '' : clean(record.rawNote || record.supportISONOTE), normalizedPipe, normalizedId,
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
    status, reason, supportGap: a?.supportGap || '', isoNote: b?.isoNote || '', gap: compareSupportGapWithIsoNote(a?.supportGap || '', b?.isoNote || '', status), sourceUid: a?.uid || '', targetUid: b?.uid || '', s1Ref: a?.sourceRef || '', s2Ref: b?.sourceRef || '',
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
    summary: Object.freeze({ match: count('MATCH'), s1Only: count('S1_ONLY'), s2Only: count('S2_ONLY'), review: count('REVIEW'), gapMatch: rows.filter((item) => item.gap.status === 'MATCH').length, gapMismatch: rows.filter((item) => item.gap.status === 'MISMATCH').length, gapReview: rows.filter((item) => item.gap.status === 'REVIEW').length, gapNotSpecified: rows.filter((item) => item.gap.status === 'NOT_SPECIFIED').length }),
    message: 'Exact pipeline + full support ID comparison. Support Gap vs ISONOTE clearance macro compares rest and guide millimetre gaps separately; 60% text similarity is not used. Loads (kN) and axial displacement are not gaps.',
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
  const headings = ['PIPE', 'PS NO (S1)', 'NODE_NAME (S2)', 'RESULT', 'REASON', 'S1 SOURCE REF', 'S2 SOURCE REF', 'Support Gap (S1)', 'ISONOTE (S2)', 'Rest Gap S1 mm', 'Rest Gap S2 mm', 'Guide Gap S1 mm', 'Guide Gap S2 mm', 'Gap Result', 'Gap Details'];
  const rows = (report?.rows || []).map((r) => [r.pipe, r.psNo, r.nodeName, r.status, r.reason, r.s1Ref, r.s2Ref, r.supportGap, r.isoNote, r.gap.s1RestMm, r.gap.s2RestMm, r.gap.s1GuideMm, r.gap.s2GuideMm, r.gap.status, r.gap.reason].map(csvCell).join(','));
  return [headings.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';
}
export function renderIsoNoteMappingCompareHtml(report = null, linkedCount = 0) {
  if (!report) return '';
  if (!report.ok) return '<section class="xml-compare-panel" aria-label="PS Mapping vs ISO Notes"><h3>PS Mapping ↔ ISO Notes</h3><p role="alert">' + escapeHtml(report.message) + '</p></section>';
  const s = report.summary;
  const rows = report.rows.map((r) => '<tr><td>' + escapeHtml(r.pipe) + '</td><td>' + escapeHtml(r.psNo || '—') + '</td><td>' + escapeHtml(r.nodeName || '—') + '</td><td><b>' + escapeHtml(r.status.replace('_', ' ')) + '</b></td><td>' + escapeHtml(r.reason) + '</td><td style="max-width:240px;white-space:normal">' + escapeHtml(r.supportGap || '—') + '</td><td style="max-width:360px;white-space:normal">' + escapeHtml(r.isoNote || '—') + '</td><td>' + escapeHtml((r.gap.s1RestMm || '—') + ' / ' + (r.gap.s2RestMm || '—')) + '</td><td>' + escapeHtml((r.gap.s1GuideMm || '—') + ' / ' + (r.gap.s2GuideMm || '—')) + '</td><td><b>' + escapeHtml(r.gap.status) + '</b></td><td>' + escapeHtml(r.gap.reason) + '</td></tr>').join('');
  return '<section class="xml-compare-panel" aria-label="PS Mapping vs ISO Notes"><div class="xml-compare-panel-title">PS Mapping ↔ ISO Notes: ' +
    escapeHtml(report.countS1) + ' S1 rows / ' + escapeHtml(report.countS2) + ' S2 rows</div><p>' + escapeHtml(report.message) +
    '</p><p><b>Anchors linked:</b> ' + linkedCount + ' / ' + s.match + ' exact matches. Review &amp; Transfer opens the approved links; no properties have been transferred.</p><p><b>Match:</b> ' + s.match + ' &nbsp; <b>S1 only:</b> ' + s.s1Only + ' &nbsp; <b>S2 only:</b> ' + s.s2Only +
    ' &nbsp; <b>Review:</b> ' + s.review + '</p><p><b>Gap match:</b> ' + s.gapMatch + ' &nbsp; <b>Gap mismatch:</b> ' + s.gapMismatch + ' &nbsp; <b>Gap review:</b> ' + s.gapReview + ' &nbsp; <b>Gap not specified:</b> ' + s.gapNotSpecified + '</p><button type="button" data-xml-compare-action="download-iso-note-comparison-csv">Download comparison CSV</button>' +
    '<div style="max-height:390px;overflow:auto"><table class="xml-compare-topology-table"><thead><tr><th>Normalized pipeline</th><th>PS NO (S1)</th><th>NODE_NAME (S2)</th><th>Result</th><th>Details</th><th>Support Gap (S1)</th><th>ISONOTE (S2)</th><th>Rest gap S1 / S2 (mm)</th><th>Guide gap S1 / S2 (mm)</th><th>Gap result</th><th>Gap details</th></tr></thead><tbody>' +
    rows + '</tbody></table></div></section>';
}
