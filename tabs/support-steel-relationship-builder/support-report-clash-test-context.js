import {
  groupSupportReportClashEvidence,
  parseSupportReportClashXml as parseClashEvidence,
} from './support-report-clash-evidence.js?v=20260909-support-report-parity-2';

export { groupSupportReportClashEvidence };

export function parseSupportReportClashXml(xmlText, options = {}) {
  const source = String(xmlText || '');
  const tests = extractClashTests(source);
  if (!tests.length) return parseClashEvidence(source, options);

  const sourceUnits = exchangeUnits(source) || options.sourceUnits || 'm';
  const rows = [];
  const diagnostics = [];
  for (const test of tests) {
    const parsed = parseClashEvidence(test.body, { ...options, sourceUnits });
    for (const row of parsed.rows || []) {
      rows.push(Object.freeze({
        ...row,
        clashTestName: test.name,
        clashTestGuid: test.guid,
        clashTestIndex: test.index,
      }));
    }
    for (const item of parsed.diagnostics || []) {
      diagnostics.push(Object.freeze({
        ...item,
        clashTestName: test.name,
        clashTestGuid: test.guid,
        clashTestIndex: test.index,
      }));
    }
  }
  const groups = groupSupportReportClashEvidence(rows);
  return Object.freeze({
    schema: rows[0]?.schema || parseClashEvidence('', options).schema,
    sourceUnits,
    clashTestCount: tests.length,
    rowCount: rows.length,
    groupCount: groups.length,
    rows,
    groups,
    diagnostics,
  });
}

function extractClashTests(source) {
  const tests = [];
  const regex = /<clashtest\b([^>]*)>([\s\S]*?)<\/clashtest>/gi;
  let match;
  while ((match = regex.exec(source))) {
    const attrs = parseAttributes(match[1]);
    tests.push(Object.freeze({
      index: tests.length,
      name: attrs.name || `ClashTest${tests.length + 1}`,
      guid: attrs.guid || '',
      body: match[2],
    }));
  }
  return tests;
}

function exchangeUnits(source) {
  const match = source.match(/<exchange\b([^>]*)>/i);
  return match ? parseAttributes(match[1]).units || '' : '';
}
function parseAttributes(raw) {
  const attrs = {};
  const regex = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(String(raw || '')))) attrs[match[1]] = decodeEntities(match[2]);
  return attrs;
}
function decodeEntities(value) {
  return String(value || '')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export const _test = Object.freeze({ extractClashTests, exchangeUnits });
