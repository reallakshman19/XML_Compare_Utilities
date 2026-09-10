import {
  groupSupportReportClashEvidence,
  parseSupportReportClashXml as parseWithTestContext,
} from './support-report-clash-test-context.js?v=20260909-support-report-parser-primitives-8&location=20260910-support-report-location-17';
import { _test as clashParserTest } from './support-report-clash-evidence.js?v=20260909-support-report-parser-primitives-8';

export { groupSupportReportClashEvidence };

const DIAGNOSTICS = Object.freeze({
  MALFORMED_XML: 'SUPPORT_REPORT_MALFORMED_XML',
  AMBIGUOUS_PIPE_SIDE: 'SUPPORT_REPORT_AMBIGUOUS_PIPE_SIDE',
  CONFLICTING_SECONDARY_FAMILY: 'SUPPORT_REPORT_CONFLICTING_SECONDARY_FAMILY',
  DUPLICATE_EVIDENCE: 'SUPPORT_REPORT_DUPLICATE_EVIDENCE',
});

export function parseSupportReportClashXml(xmlText, options = {}) {
  const source = String(xmlText || '');
  const structural = validateStructure(source);
  if (!structural.ok) {
    const parsed = parseWithTestContext('', options);
    return Object.freeze({
      ...parsed,
      diagnostics: [diagnostic('ERROR', DIAGNOSTICS.MALFORMED_XML, structural.message)],
    });
  }

  const unsafeClashes = classifyUnsafeClashes(source);
  const parsed = parseWithTestContext(source, options);
  const rows = parsed.rows.filter((row) => !unsafeClashes.has(clashKey(row)));
  const diagnostics = [
    ...parsed.diagnostics,
    ...[...unsafeClashes.values()].map((item) => diagnostic('ERROR', item.code, item.message, item.extra)),
  ];
  const grouped = deduplicateGroupEvidence(groupSupportReportClashEvidence(rows, options));
  if (grouped.duplicateCount) diagnostics.push(diagnostic(
    'WARN', DIAGNOSTICS.DUPLICATE_EVIDENCE,
    `${grouped.duplicateCount} duplicate clash-member evidence row(s) were ignored within logical groups.`,
    { duplicateCount: grouped.duplicateCount },
  ));
  return Object.freeze({
    ...parsed,
    rowCount: rows.length,
    groupCount: grouped.groups.length,
    rows,
    groups: grouped.groups,
    diagnostics,
  });
}

function validateStructure(source) {
  for (const tag of ['clashtest', 'clashresult', 'clashobject']) {
    const opens = countMatches(source, new RegExp(`<${tag}\\b`, 'gi'));
    const closes = countMatches(source, new RegExp(`</${tag}>`, 'gi'));
    if (opens !== closes) return {
      ok: false,
      message: `Malformed Support Report XML: <${tag}> count ${opens} does not match closing count ${closes}.`,
    };
  }
  return { ok: true, message: '' };
}

function classifyUnsafeClashes(source) {
  const unsafe = new Map();
  extractTestBlocks(source).forEach((test, testIndex) => {
    const clashRegex = /<clashresult\b([^>]*)>([\s\S]*?)<\/clashresult>/gi;
    let match;
    while ((match = clashRegex.exec(test.body))) {
      const attrs = clashParserTest.parseAttributes(match[1]);
      const clashName = attrs.name || '';
      const guid = attrs.guid || '';
      const objects = Array.from(match[2].matchAll(/<clashobject>([\s\S]*?)<\/clashobject>/gi))
        .map((item) => clashParserTest.parseClashObject(item[1]));
      const branchBearing = objects.filter((object) => object.branchNode);
      const key = rawClashKey(testIndex, clashName, guid);
      if (branchBearing.length > 1) {
        unsafe.set(key, {
          code: DIAGNOSTICS.AMBIGUOUS_PIPE_SIDE,
          message: `${clashName || 'Clash'} has multiple branch-bearing objects; no pipe side was selected.`,
          extra: { clashName, guid, clashTestIndex: testIndex },
        });
        continue;
      }
      const secondaryFamilies = [...new Set(objects
        .filter((object) => !object.branchNode && object.familyId)
        .map((object) => object.familyId.toUpperCase()))];
      if (secondaryFamilies.length > 1) {
        unsafe.set(key, {
          code: DIAGNOSTICS.CONFLICTING_SECONDARY_FAMILY,
          message: `${clashName || 'Clash'} has conflicting non-pipe PS/SL family roots: ${secondaryFamilies.join(', ')}.`,
          extra: { clashName, guid, clashTestIndex: testIndex, secondaryFamilies },
        });
      }
    }
  });
  return unsafe;
}

function deduplicateGroupEvidence(groups) {
  let duplicateCount = 0;
  const output = groups.map((group) => {
    const deduplicated = deduplicateRows(group.evidenceRows || []);
    duplicateCount += deduplicated.duplicateCount;
    return Object.freeze({
      ...group,
      evidenceRows: deduplicated.rows,
      clashCount: deduplicated.rows.length,
    });
  });
  return { groups: output, duplicateCount };
}

function deduplicateRows(rows) {
  const seen = new Set();
  const output = [];
  let duplicateCount = 0;
  for (const row of rows) {
    const signature = [
      row.primarySupportMemberId || '', row.secondarySupportFamilyId || '',
      row.fullLineTag || '', row.branchNode || '',
    ].join('\u0000').toUpperCase();
    if (seen.has(signature)) { duplicateCount += 1; continue; }
    seen.add(signature);
    output.push(row);
  }
  return { rows: output, duplicateCount };
}

function extractTestBlocks(source) {
  const tests = [];
  const regex = /<clashtest\b[^>]*>([\s\S]*?)<\/clashtest>/gi;
  let match;
  while ((match = regex.exec(source))) tests.push({ body: match[1] });
  return tests.length ? tests : [{ body: source }];
}
function clashKey(row) { return rawClashKey(row.clashTestIndex ?? 0, row.clashName || '', row.guid || ''); }
function rawClashKey(testIndex, clashName, guid) { return `${testIndex}\u0000${guid || clashName}`.toUpperCase(); }
function countMatches(source, regex) { return Array.from(String(source || '').matchAll(regex)).length; }
function diagnostic(severity, code, message, extra = {}) { return Object.freeze({ severity, code, message, ...extra }); }

export const _test = Object.freeze({
  validateStructure,
  classifyUnsafeClashes,
  deduplicateGroupEvidence,
  deduplicateRows,
  DIAGNOSTICS,
});
