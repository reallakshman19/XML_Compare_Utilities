import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { describeBrowserFile, readBrowserTextFile } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-file-io.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const config = resolvePsFamilyClashAuditConfig({ posToleranceMm: 35, inputRows: 3 });
assert.equal(config.posToleranceMm, 35);
assert.equal(config.inputRows, 3);
assert.equal(config.launcher.label, 'PS / SL Family Clash Audit');
assert.equal(config.familyPrefixesText, 'PS, SL');
assert.equal(config.sourceSideOptions.length, 3);
assert.equal(config.inputFiles.length, 4);
assert.equal(config.reportTabs.length, 11);
assert.ok(config.reportTabs.some((tab) => tab.key === 'psClashReport' && tab.maturity === 'stable'));
assert.ok(config.reportTabs.some((tab) => tab.key === 'coverage' && tab.maturity === 'draft'));
assert.equal(config.outputButtons.length, 11);
assert.ok(config.outputButtons.every((button) => button.exportKey && button.suffix && button.mime));
assert.ok(config.info.some((item) => item.includes('row-local')));
assert.ok(config.info.some((item) => item.includes('PSClash XML')));

const launcher = _test.renderLauncher(config);
assert.match(launcher, /PS \/ SL Family Clash Audit/);
assert.match(launcher, /configurable support-family mapping/);
assert.match(launcher, /data-psfa-open="1"/);
assert.doesNotMatch(launcher, /data-psfa="xml"/);
assert.doesNotMatch(launcher, /Clash XML<textarea/);

const popup = _test.renderPopup(config);
assert.match(popup, /data-psfa-close="1"/);
assert.match(popup, /PS \/ SL Family Clash Audit/);

const html = _test.renderInputShell(config);
assert.match(html, /PSClash XML/);
assert.match(html, /data-psfa-file="psclash"/);
assert.match(html, /data-psfa="psclash"/);
assert.match(html, /data-psfa-preview="psclash"/);
assert.match(html, /data-psfa-tab="psClashReport"/);
assert.match(html, /data-psfa-report-maturity="stable"/);
assert.match(html, /data-psfa-report-maturity="draft"/);
assert.match(html, /psfa-draft-badge/);
assert.match(html, /PSClash report CSV/);
assert.match(html, /Source side/);
assert.match(html, /Valid family prefixes/);
assert.match(html, /data-psfa-export-preview="coverage"/);
assert.match(html, /Download Selected/);
assert.match(html, /Copy-\(n\)-of names are preserved/);

const fakeGet = (name) => ({ value: name === 'tolerance' ? '12.5' : name === 'source-family' ? 'sl-12005' : name === 'family-prefixes' ? 'ps, sl, sup' : 'right' });
const settings = readPsFamilyUiSettings(fakeGet, PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.equal(settings.posToleranceMm, 12.5);
assert.equal(settings.sourceSide, 'right');
assert.equal(settings.sourceFamily, 'SL-12005');
assert.deepEqual(settings.familyPrefixes, ['PS', 'SL', 'SUP']);
assert.ok(settings.familyDetectorLabel.includes('PS|SL|SUP'));
assert.ok(settings.familyDetectorLabel.endsWith('+/i'));

const textFile = { name: 'sample.csv', size: 10, text: () => Promise.resolve('abc') };
assert.equal(describeBrowserFile(textFile), 'sample.csv (10 bytes)');
assert.equal(await readBrowserTextFile(textFile), 'abc');

const detailCsv = `Name of the element,Position
PS-1.1,E 0mm S 0mm U 0mm
PS-1.2,E 30mm S 0mm U 0mm
`;
const audit25 = createPsFamilyClashAuditFromTextInputs({ detailCsvText: detailCsv, config: { posToleranceMm: 25, sourceSide: 'auto' } });
const audit35 = createPsFamilyClashAuditFromTextInputs({ detailCsvText: detailCsv, config: { posToleranceMm: 35, sourceSide: 'auto' } });
const auditSource = createPsFamilyClashAuditFromTextInputs({ expectedCsvText: 'Item Name\n/SL-12005.1\n', config: { sourceFamily: 'SL-99999', familyPrefixesText: 'PS, SL', posToleranceMm: 25, sourceSide: 'auto' } });
assert.equal(audit25.summary.posFamilyCount, 2);
assert.equal(audit35.summary.posFamilyCount, 1);
assert.equal(auditSource.summary.sourceFamily, 'SL-99999');
assert.match(renderPsFamilyReports(audit35, 'posFamilies', config), /POSFamily/);
assert.match(renderPsFamilyReports(audit35, 'diagnostics', config), /Diagnostics/);

console.log('ps-family-clash-audit-config tests passed');
