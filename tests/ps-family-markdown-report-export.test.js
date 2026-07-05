import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import {
  PS_FAMILY_SAMPLE_CLASH_XML,
  PS_FAMILY_SAMPLE_DETAIL_CSV,
  PS_FAMILY_SAMPLE_EXPECTED_CSV,
} from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { createPsFamilyAuditExports, createPsFamilyMarkdownReport } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const syntheticAudit = Object.freeze({
  summary: Object.freeze({
    sourceFamily: 'PS-90001', expectedCount: 3, foundExactCount: 1, missingCount: 2, coveragePct: 33.33,
    outOfFamilyCount: 1, duplicateMemberCount: 1, posFamilyCount: 2,
  }),
  coverageRows: [{ expectedMember: 'PS-90001.1', status: 'FOUND', clashCount: 1, posFamilyId: 'POSF-000001', lineFamily: 'D90001' }],
  missingRows: [{ expectedMember: 'PS-90001.2', posFamilyId: 'POSF-000002', lineFamily: 'D90001', pipe: 'SAMPLE-100-D90001' }],
  outOfFamilyRows: [{ clashName: 'Clash2', source: { familyRoot: 'PS-90001' }, against: { memberName: 'PS-90002.1', familyRoot: 'PS-90002', pipe: { lineFamily: 'P90002' } } }],
  duplicateRows: [{ member: 'PS-90001.1', clashCount: 2, clashNames: ['Clash1', 'Clash3'] }],
  lineFamilyRows: [{ lineFamily: 'D90001', clashCount: 1, members: ['PS-90001.1'] }],
  posFamilyRows: [{ posFamilyId: 'POSF-000001', elementCount: 1, sourceFamilies: ['PS-90001'], lineFamilies: ['D90001'], members: ['PS-90001.1'] }],
  sourceVsPosFamilyRows: [{ source: 'PS-90001', posFamilyCount: 2, elementCount: 3, foundElementCount: 1, missingElementCount: 2 }],
  diagnostics: [{ level: 'WARN', code: 'OUT_OF_FAMILY_CLASH', message: 'PS-90002.1 differs from PS-90001' }],
  clashRows: [{ clashName: 'Clash1', source: { path: ['File', 'SAMPLE-CU-SU', 'PS-90001'] }, against: { path: ['File', 'SAMPLE-CU-PI', 'PS-90001.1'] } }],
});

const markdown = createPsFamilyMarkdownReport(syntheticAudit);
assert.equal(markdown, createPsFamilyMarkdownReport(syntheticAudit));
assert.match(markdown, /^# PS Family Clash Audit Report/);
assert.match(markdown, /Source family: PS-90001/);
assert.match(markdown, /\| Expected \| 3 \|/);
assert.match(markdown, /## Coverage Summary/);
assert.match(markdown, /## Missing Members/);
assert.match(markdown, /PS-90001\.2/);
assert.match(markdown, /## Out-of-Family Rows/);
assert.match(markdown, /PS-90002\.1/);
assert.match(markdown, /## Duplicate Members/);
assert.match(markdown, /Clash1; Clash3/);
assert.match(markdown, /## Line-Family Summary/);
assert.match(markdown, /D90001/);
assert.match(markdown, /## POSFamily Summary/);
assert.match(markdown, /POSF-000001/);
assert.match(markdown, /## Source vs POSFamily Count/);
assert.match(markdown, /## Diagnostics/);
assert.match(markdown, /OUT_OF_FAMILY_CLASH/);
assert.match(markdown, /## Hierarchy Evidence/);
assert.match(markdown, /SAMPLE-CU-PI/);

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.match(shell, /Markdown Report/);
assert.match(shell, /data-psfa="markdown-report"/);

const sampleAudit = createPsFamilyClashAuditFromTextInputs({
  clashXmlText: PS_FAMILY_SAMPLE_CLASH_XML,
  expectedCsvText: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  detailCsvText: PS_FAMILY_SAMPLE_DETAIL_CSV,
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
const filteredUi = renderPsFamilyReports(sampleAudit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, 'PS-90001.1');
const sampleExports = createPsFamilyAuditExports(sampleAudit);
assert.match(filteredUi, /Showing 1 of 1 matched rows/);
assert.equal(sampleExports.markdownReport, createPsFamilyMarkdownReport(sampleAudit));
assert.match(sampleExports.coverageCsv, /PS-90001\.2/);
assert.match(sampleExports.auditJson, /"summary"/);

console.log('ps-family-markdown-report-export tests passed');
