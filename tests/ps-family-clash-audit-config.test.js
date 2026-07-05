import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { describeBrowserFile, readBrowserTextFile } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-file-io.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG, readPsFamilyUiSettings, resolvePsFamilyClashAuditConfig } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const config = resolvePsFamilyClashAuditConfig({ posToleranceMm: 35, inputRows: 3 });
assert.equal(config.posToleranceMm, 35);
assert.equal(config.inputRows, 3);
assert.equal(config.sourceSideOptions.length, 3);
assert.equal(config.inputFiles.length, 3);
assert.equal(config.reportTabs.length, 9);
assert.equal(config.outputButtons.length, 10);
assert.ok(config.outputButtons.every((button) => button.exportKey && button.suffix && button.mime));
assert.ok(config.info.some((item) => item.includes('Copy-(n)-of')));

const html = _test.renderInputShell(config);
assert.match(html, /Source side/);
assert.match(html, /type="file"/);
assert.match(html, /data-psfa-file="xml"/);
assert.match(html, /data-psfa-tab="coverage"/);
assert.match(html, /Missing CSV/);
assert.match(html, /Diagnostics CSV/);
assert.match(html, /Source vs POSFamily/);
assert.match(html, /value="35"/);
assert.match(html, /Copy-\(n\)-of names are preserved/);
assert.match(html, /Left clash object/);

const fakeGet = (name) => ({ value: name === 'tolerance' ? '12.5' : 'right' });
const settings = readPsFamilyUiSettings(fakeGet, PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.equal(settings.posToleranceMm, 12.5);
assert.equal(settings.sourceSide, 'right');

const textFile = { name: 'sample.csv', size: 10, text: () => Promise.resolve('abc') };
assert.equal(describeBrowserFile(textFile), 'sample.csv (10 bytes)');
assert.equal(await readBrowserTextFile(textFile), 'abc');

const detailCsv = `Name of the element,Position
PS-1.1,E 0mm S 0mm U 0mm
PS-1.2,E 30mm S 0mm U 0mm
`;
const audit25 = createPsFamilyClashAuditFromTextInputs({ detailCsvText: detailCsv, config: { posToleranceMm: 25, sourceSide: 'auto' } });
const audit35 = createPsFamilyClashAuditFromTextInputs({ detailCsvText: detailCsv, config: { posToleranceMm: 35, sourceSide: 'auto' } });
assert.equal(audit25.summary.posFamilyCount, 2);
assert.equal(audit35.summary.posFamilyCount, 1);
assert.match(renderPsFamilyReports(audit35, 'posFamilies', config), /POSFamily/);
assert.match(renderPsFamilyReports(audit35, 'diagnostics', config), /Diagnostics/);

console.log('ps-family-clash-audit-config tests passed');
