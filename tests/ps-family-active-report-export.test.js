import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import {
  PS_FAMILY_SAMPLE_CLASH_XML,
  PS_FAMILY_SAMPLE_DETAIL_CSV,
  PS_FAMILY_SAMPLE_EXPECTED_CSV,
} from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { createPsFamilyActiveReportExport, createPsFamilyAuditExports, PS_FAMILY_ACTIVE_EXPORTS } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  clashXmlText: PS_FAMILY_SAMPLE_CLASH_XML,
  expectedCsvText: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  detailCsvText: PS_FAMILY_SAMPLE_DETAIL_CSV,
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
const allExports = createPsFamilyAuditExports(audit);

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(shell.includes('Export Active Report'));
assert.ok(shell.includes('data-psfa="export-active"'));
assert.ok(shell.includes('Coverage CSV'));
assert.ok(shell.includes('Audit JSON'));

for (const tab of PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs) {
  const active = createPsFamilyActiveReportExport(audit, tab.key);
  const mapping = PS_FAMILY_ACTIVE_EXPORTS[tab.key];
  assert.ok(mapping, `missing active export mapping for ${tab.key}`);
  assert.equal(active.activeTab, tab.key);
  assert.equal(active.exportKey, mapping.exportKey);
  assert.equal(active.mime, 'text/csv');
  assert.equal(active.text, allExports[mapping.exportKey]);
}

const coverage = createPsFamilyActiveReportExport(audit, 'coverage');
assert.equal(coverage.suffix, 'coverage');
assert.match(coverage.text, /PS-90001\.2/);
assert.match(coverage.text, /Copy-\(2\)-of-PS-90001\.3/);

const clashRows = createPsFamilyActiveReportExport(audit, 'clashRows');
assert.equal(clashRows.suffix, 'clashRows');
assert.match(clashRows.text, /PS-90002\.1/);

const unknown = createPsFamilyActiveReportExport(audit, 'unknown-tab');
assert.equal(unknown.activeTab, 'coverage');
assert.equal(unknown.exportKey, 'coverageCsv');
assert.equal(unknown.text, allExports.coverageCsv);

const searchedUiText = 'PS-90001.1';
assert.equal(createPsFamilyActiveReportExport(audit, 'coverage', searchedUiText).text, allExports.coverageCsv);

console.log('ps-family-active-report-export tests passed');
