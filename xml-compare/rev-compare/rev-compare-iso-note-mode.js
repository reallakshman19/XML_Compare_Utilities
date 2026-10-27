import { compareIsoNoteMapping } from '../XmlCompareIsoNoteDirectCompare.js';
import { buildIsoNoteEngineeringFindings, serializeIsoNoteEngineeringFindingsCsv } from '../XmlCompareIsoNoteEngineeringFindings.js';

export const REV_COMPARE_ISO_NOTE_MODE_SCHEMA = 'rev-compare-iso-note-engineering-mode/v1';
const clean = value => String(value ?? '').trim();
const ISO_ROOT = /<\s*IsoNoteXml\b/i;
const ISO_PROFILE = /\bprofileId\s*=\s*["']iso-note-ps-mapping-s1-iso-notes-s2\/v1["']/i;
const MAPPING_PARTITION = /<\s*IsoPartition\b[^>]*\bkey\s*=\s*["']PS_MAPPING_S1["']/i;
const NOTES_PARTITION = /<\s*IsoPartition\b[^>]*\bkey\s*=\s*["']ISO_NOTES_S2["']/i;

// Route only the explicitly generated S1/S2 ISO template. Generic categorized
// XML and real two-revision comparisons retain the standard Rev Compare mode.
export function isIsoNoteEngineeringInput(sourceXml = '', targetXml = '') {
  const source = clean(sourceXml), target = clean(targetXml);
  const recognized = (value) => ISO_ROOT.test(value) && (ISO_PROFILE.test(value) ||
    MAPPING_PARTITION.test(value) || NOTES_PARTITION.test(value));
  return recognized(source) && recognized(target);
}

const summary = report => Object.freeze({
  mappingRows: report.countS1,
  noteRows: report.countS2,
  identityMatches: report.summary.match,
  s1Only: report.summary.s1Only,
  s2Only: report.summary.s2Only,
  identityReviews: report.summary.review,
  gapMatches: report.summary.gapMatch,
  gapMismatches: report.summary.gapMismatch,
  gapReviews: report.summary.gapReview,
  gapNotSpecified: report.summary.gapNotSpecified,
  restraintCovered: report.summary.coverageCovered,
  restraintMissing: report.summary.coverageMissing,
  restraintExtra: report.summary.coverageExtra,
  restraintReviews: report.summary.coverageReview,
});

// No dependence on 60% displayName scores, approved connector lists,
// compareFields or coordinate tolerances.
export function createIsoNoteRevCompareAudit({ sourceXml = '', targetXml = '' } = {}) {
  if (!isIsoNoteEngineeringInput(sourceXml, targetXml)) return null;
  const report = compareIsoNoteMapping({ sourceXml, targetXml });
  const findings = report.ok ? buildIsoNoteEngineeringFindings(report) : Object.freeze([]);
  return Object.freeze({
    schema: REV_COMPARE_ISO_NOTE_MODE_SCHEMA,
    mode: 'iso-note-engineering',
    ok: report.ok,
    sourceRole: 'Source A / PS_MAPPING_S1',
    targetRole: 'Target B / ISO_NOTES_S2',
    identityRule: 'NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1',
    readOnly: true,
    message: report.message,
    report,
    summary: report.ok ? summary(report) : null,
    findings,
    findingCount: findings.length,
  });
}

export function exportIsoNoteRevCompareAuditJson(audit) {
  if (!audit || audit.mode !== 'iso-note-engineering') return '';
  return JSON.stringify({
    schema: audit.schema, mode: audit.mode, ok: audit.ok,
    sourceRole: audit.sourceRole, targetRole: audit.targetRole,
    identityRule: audit.identityRule, readOnly: true,
    message: audit.message, summary: audit.summary, findingCount: audit.findingCount,
    report: audit.report, findings: audit.findings,
  }, null, 2);
}
export function exportIsoNoteRevCompareAuditCsv(audit) {
  return audit?.mode === 'iso-note-engineering' ? serializeIsoNoteEngineeringFindingsCsv(audit.report) : '';
}
