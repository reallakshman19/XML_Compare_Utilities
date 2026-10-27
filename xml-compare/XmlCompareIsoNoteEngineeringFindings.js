// Finding-level, immutable evidence ledger for PS Mapping ↔ ISO Notes.
// A single S1/S2 pair can yield distinct REST/GUIDE/LINE_STOP requirements
// and clearance findings. Original source references are never overwritten.
export const ISO_NOTE_FINDING_LEDGER_SCHEMA = 'iso-note-engineering-findings/v1';
const text = v => String(v ?? '').trim();
const KINDS = Object.freeze([{ kind: 'REST', gap: 'rest' }, { kind: 'GUIDE', gap: 'guide' }, { kind: 'LINE_STOP', gap: 'lineStop' }]);
const own = (items, type) => (items || []).filter(e => e.kind === type);
const csvCell = value => {
  const v = text(value);
  return '"' + (/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
};
const csvRow = row => row.map(csvCell).join(',');
function finding(row, domain, kind, status, rule, explanation, s1Raw, s2Raw, sourceEvidence = [], targetEvidence = []) {
  const s1 = text(row.s1Ref) || text(row.sourceUid) || 'NO_S1_REF';
  const s2 = text(row.s2Ref) || text(row.targetUid) || 'NO_S2_REF';
  return Object.freeze({
    findingId: s1 + '=>' + s2 + '#' + domain + ':' + kind,
    domain, kind, status, rule, explanation,
    pipeline: text(row.pipe), psNo: text(row.psNo), nodeName: text(row.nodeName),
    s1Ref: text(row.s1Ref), s2Ref: text(row.s2Ref),
    sourceUid: text(row.sourceUid), targetUid: text(row.targetUid),
    sourceRaw: text(s1Raw), targetRaw: text(s2Raw),
    sourceEvidence: Object.freeze(sourceEvidence), targetEvidence: Object.freeze(targetEvidence),
    actionCode: text(row.action?.code), reviewAction: text(row.action?.action),
  });
}
export function buildIsoNoteEngineeringFindings(report = {}) {
  const rows = [];
  for (const row of report.rows || []) {
    rows.push(finding(row, 'IDENTITY', 'PIPE_PLUS_SUPPORT', row.status, text(row.matchRule),
      text(row.reason), text(row.psNo), text(row.nodeName)));
    if (row.status !== 'MATCH') continue;
    for (const { kind, gap } of KINDS) {
      const left = own(row.coverage?.sourceEvidence, kind);
      const right = own(row.coverage?.targetEvidence, kind);
      const positiveSource = left.some(e => e.polarity === 'POSITIVE');
      const positiveTarget = right.some(e => e.polarity === 'POSITIVE');
      const uncertain = [...left, ...right].some(e => e.polarity !== 'POSITIVE');
      const status = uncertain ? 'REVIEW' : positiveTarget && positiveSource ? 'COVERED' :
        positiveTarget ? 'MISSING' : positiveSource ? 'EXTRA' : 'NOT_SPECIFIED';
      if (status !== 'NOT_SPECIFIED') rows.push(finding(row, 'RESTRAINT', kind, status,
        [...new Set([...left, ...right].map(e => e.rule))].join(' + '),
        status === 'REVIEW' ? 'Restraint interpretation is uncertain; check negation or model role.' :
          status === 'COVERED' ? 'Positive keywords on both sides; physical geometry not proved.' :
          status === 'MISSING' ? 'Positive ISONOTE restraint requirement not shown in DTXR.' :
          'DTXR indicates restraint type absent from positive ISONOTE requirements.',
        row.dtxr, row.isoNote, left, right));
      const sourceGap = own(row.gap?.s1Evidence, gap);
      const targetGap = own(row.gap?.s2Evidence, gap);
      if (!sourceGap.length && !targetGap.length) continue;
      const l = [...new Set(sourceGap.map(e=>e.mm))], r = [...new Set(targetGap.map(e=>e.mm))];
      const statusGap = l.length > 1 || r.length > 1 ? 'REVIEW' :
        !l.length || !r.length ? 'REVIEW' : l[0] === r[0] ? 'MATCH' : 'MISMATCH';
      rows.push(finding(row, 'CLEARANCE', kind, statusGap,
        [...new Set([...sourceGap, ...targetGap].map(e => e.rule))].join(' + '),
        statusGap === 'MATCH' ? 'Equal typed gap in mm; restraint geometry not proved.' :
          statusGap === 'MISMATCH' ? 'Different gap magnitudes of same type in mm.' :
          'Missing, multiple or unmatched clearance type; manual check.',
        row.supportGap, row.isoNote, sourceGap, targetGap));
    }
  }
  return Object.freeze(rows);
}
export function serializeIsoNoteEngineeringFindingsCsv(report = {}) {
  const headings = [
    'Finding ID', 'Domain', 'Type', 'Finding Status', 'Applied Rule', 'Reason',
    'Pipeline', 'PS NO (S1)', 'NODE_NAME (S2)', 'S1 Source Ref', 'S2 Source Ref',
    'S1 Record UID', 'S2 Record UID', 'Raw S1 Evidence', 'Raw S2 Evidence',
    'Parsed S1 Evidence JSON', 'Parsed S2 Evidence JSON', 'Review Code', 'Review Action',
  ];
  const lines = buildIsoNoteEngineeringFindings(report).map(row => [
    row.findingId, row.domain, row.kind, row.status, row.rule, row.explanation,
    row.pipeline, row.psNo, row.nodeName, row.s1Ref, row.s2Ref,
    row.sourceUid, row.targetUid, row.sourceRaw, row.targetRaw,
    JSON.stringify(row.sourceEvidence), JSON.stringify(row.targetEvidence), row.actionCode, row.reviewAction,
  ]);
  return [csvRow(headings), ...lines.map(csvRow)].join('\r\n') + '\r\n';
}
