import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { describeBrowserFile, readBrowserTextFile } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-file-io.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { PS_FAMILY_SAMPLE_STRUCTURE_XML, PS_FAMILY_SAMPLE_SUPPORT_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const config = resolvePsFamilyClashAuditConfig({ posToleranceMm: 35, inputRows: 3 });
assert.equal(config.posToleranceMm, 35);
assert.equal(config.inputRows, 3);
assert.equal(config.launcher.label, 'PS / SL Family Clash Audit');
assert.equal(config.familyPrefixesText, 'PS, SL');
assert.match(config.structuralZonesText, /CU-SU/);
assert.match(config.supportZonesText, /PS-/);
assert.equal(config.sourceSideOptions.length, 3);
assert.equal(config.inputFiles.length, 2);
assert.equal(config.reportTabs.length, 11);
assert.ok(config.reportTabs.some((tab) => tab.key === 'supportSummary' && tab.maturity === 'stable'));
assert.ok(config.reportTabs.some((tab) => tab.key === 'structureLineProximity' && tab.maturity === 'stable'));
assert.ok(config.reportTabs.some((tab) => tab.key === 'structureContacts' && tab.maturity === 'draft'));
assert.equal(config.outputButtons.length, 6);
assert.ok(config.info.some((item) => item.includes('LineFamily_PSRoot')));
assert.ok(config.info.some((item) => item.includes('Zone classification')));
assert.ok(config.info.some((item) => item.includes('PS-14311-BAR-3')));

const launcher = _test.renderLauncher(config);
assert.match(launcher, /SupportChangeXML/);
assert.match(launcher, /data-psfa-open="1"/);

const html = _test.renderInputShell(config);
assert.match(html, /StructureGroup vs Supports XML/);
assert.match(html, /Clash within Supports XML/);
assert.match(html, /data-psfa-file="structure"/);
assert.match(html, /data-psfa-file="support"/);
assert.match(html, /data-psfa="structure"/);
assert.match(html, /data-psfa="support"/);
assert.doesNotMatch(html, /PSClash XML/);
assert.doesNotMatch(html, /Expected PS\/SL CSV/);
assert.match(html, /data-psfa-tab="supportSummary"/);
assert.match(html, /data-psfa-tab="structureLineProximity"/);
assert.match(html, /data-psfa-tab="supportExceptions"/);
assert.match(html, /SupportGroup Summary CSV/);
assert.match(html, /StructureGroup Line Support Proximity CSV/);
assert.match(html, /Line Support Tree TXT/);
assert.match(html, /Valid family prefixes/);
assert.match(html, /Structural zones/);
assert.match(html, /Support zones/);
assert.doesNotMatch(html, /StructureGroup Contacts CSV/);
assert.doesNotMatch(html, /Clash Rows CSV/);

const fakeGet = (name) => ({ value: ({ tolerance: '12.5', 'source-family': 'sl-12005', 'family-prefixes': 'ps, sl, sup', 'source-side': 'right', 'structural-zones': 'CU-SU\nPIPE-RACK', 'support-zones': 'PS-, SL-' }[name] || '') });
const settings = readPsFamilyUiSettings(fakeGet, PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.equal(settings.posToleranceMm, 12.5);
assert.equal(settings.sourceSide, 'right');
assert.equal(settings.sourceFamily, 'SL-12005');
assert.deepEqual(settings.familyPrefixes, ['PS', 'SL', 'SUP']);
assert.deepEqual(settings.structuralZones, ['CU-SU', 'PIPE-RACK']);
assert.deepEqual(settings.supportZones, ['PS-', 'SL-']);

const textFile = { name: 'sample.xml', size: 10, text: () => Promise.resolve('abc') };
assert.equal(describeBrowserFile(textFile), 'sample.xml (10 bytes)');
assert.equal(await readBrowserTextFile(textFile), 'abc');

const audit = createPsFamilyClashAuditFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', familyPrefixesText: 'PS, SL', structuralZonesText: 'STRUCTURE, FRMWORK, GENSEC, CU-SU', supportZonesText: 'PS-, SL-', posToleranceMm: 25 },
});
assert.equal(audit.summary.supportGroupCount, 1);
assert.match(renderPsFamilyReports(audit, 'supportSummary', config), /S8810011_PS-14396/);
assert.match(renderPsFamilyReports(audit, 'lineSupportTree', config), /StructuralGroup/);
assert.match(renderPsFamilyReports(audit, 'structureLineProximity', config), /TotalSupportCount/);

console.log('ps-family-clash-audit-config tests passed');
