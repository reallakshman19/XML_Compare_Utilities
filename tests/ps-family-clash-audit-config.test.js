import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { describeBrowserFile, readBrowserTextFile } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-file-io.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const config = resolvePsFamilyClashAuditConfig({ posToleranceMm: 35, inputRows: 3 });
assert.equal(config.posToleranceMm, 35);
assert.equal(config.inputRows, 3);
assert.equal(config.launcher.label, 'PS Family Clash Audit');
assert.equal(config.sourceSideOptions.length, 3);
assert.equal(config.inputFiles.length, 3);
assert.equal(config.reportTabs.length, 10);
assert.ok(config.reportTabs.some((tab) => tab.key === 'hierarchy'));
assert.equal(config.outputButtons.length, 10);
assert.ok(config.outputButtons.every((button) => button.exportKey && button.suffix && button.mime));
assert.ok(config.info.some((item) => item.includes('Copy-(n)-of')));
assert.ok(config.info.some((item) => item.includes('Source family can be entered manually')));

const launcher = _test.renderLauncher(config);
assert.match(launcher, /PS Family Clash Audit/);
assert.match(launcher, /Audit Navis clash XML against expected PS family mapping/);
assert.match(launcher, /data-psfa-open="1"/);
assert.doesNotMatch(launcher, /data-psfa="xml"/);
assert.doesNotMatch(launcher, /Clash XML<textarea/);

const popup = _test.renderPopup(config);
assert.match(popup, /data-psfa-close="1"/);
assert.match(popup, /PS Family Clash Audit/);

const html = _test.renderInputShell(config);
assert.match(html, /Source side/);
assert.match(html, /Source family/);
assert.match(html, /data-psfa="source-family"/);
assert.match(html, /type="file"/);
assert.match(html, /data-psfa-file="xml"/);
assert.match(html, /data-psfa-tab="coverage"/);
assert.match(html, /data-psfa-tab="hierarchy"/);
assert.match(html, /Missing CSV/);
assert.match(html, /Diagnostics CSV/);
assert.match(html, /Source vs POSFamily/);
assert.match(html, /value="35"/);
assert.match(html, /Copy-\(n\)-of names are preserved/);
assert.match(html, /Left clash object/);

const fakeGet = (name) => ({ value: name === 'tolerance' ? '12.5' : name === 'source-family' ? 'ps-12005' : 'right' });
const settings = readPsFamilyUiSettings(fakeGet, PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.equal(settings.posToleranceMm, 12.5);
assert.equal(settings.sourceSide, 'right');
assert.equal(settings.sourceFamily, 'PS-12005');

const textFile = { name: 'sample.csv', size: 10, text: () => Promise.resolve('abc') };
assert.equal(describeBrowserFile(textFile), 'sample.csv (10 bytes)');
assert.equal(await readBrowserTextFile(textFile), 'abc');

const detailCsv = `Name of the element,Position
PS-1.1,E 0mm S 0mm U 0mm
PS-1.2,E 30mm S 0mm U 0mm
`;
const audit25 = createPsFamilyClashAuditFromTextInputs({ detailCsvText: detailCsv, config: { posToleranceMm: 25, sourceSide: 'auto' } });
const audit35 = createPsFamilyClashAuditFromTextInputs({ detailCsvText: detailCsv, config: { posToleranceMm: 35, sourceSide: 'auto' } });
const auditSource = createPsFamilyClashAuditFromTextInputs({ expectedCsvText: 'Item Name\n/PS-12005.1\n', config: { sourceFamily: 'PS-99999', posToleranceMm: 25, sourceSide: 'auto' } });
assert.equal(audit25.summary.posFamilyCount, 2);
assert.equal(audit35.summary.posFamilyCount, 1);
assert.equal(auditSource.summary.sourceFamily, 'PS-99999');
assert.match(renderPsFamilyReports(audit35, 'posFamilies', config), /POSFamily/);
assert.match(renderPsFamilyReports(audit35, 'diagnostics', config), /Diagnostics/);

console.log('ps-family-clash-audit-config tests passed');
