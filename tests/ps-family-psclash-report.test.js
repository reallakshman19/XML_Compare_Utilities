import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { buildPsClashReportRows } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-engine.js';
import { parsePsClashXml } from '../tabs/ps-family-clash-audit/ps-family-psclash-xml-parser.js';
import { PS_FAMILY_SAMPLE_PSCLASH_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { extractFamilyRoot } from '../tabs/ps-family-clash-audit/ps-family-token-utils.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const rowLocalXml = `<exchange><batchtest><clashtests><clashtest><clashresults>
<clashresult name="Clash1" distance="-0.01"><clashobjects>
<clashobject><pathlink><node>File</node><node>/PS-14221</node><node>/PS-14221-BAR-1</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14221-BAR-1</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-8&quot;-P8810021-31441C4-PP-01</node><node>/ASIM-1836-8&quot;-P8810021-31441C4-PP-01/B4</node><node>/PS-14221.1</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14221.1</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult>
<clashresult name="Clash7" distance="-0.01"><clashobjects>
<clashobject><pathlink><node>File</node><node>/STRUCTURE</node><node>/PS-14236</node></pathlink><smarttags><smarttag><name>Item Name</name><value>GENSEC 2 of FRMWORK 1 of STRUCTURE /PS-14236</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-6&quot;-D8810001-PP-01</node><node>/ASIM-1836-6&quot;-D8810001-PP-01/B1</node><node>/PS-14236.1</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14236.1</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult>
<clashresult name="Clash9" distance="-0.01"><clashobjects>
<clashobject><pathlink><node>File</node><node>/PS-11488</node><node>/Copy-of-PS-11488-BAR-1</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/Copy-of-PS-11488-BAR-1</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-10&quot;-P8810001-PP-01</node><node>/ASIM-1836-10&quot;-P8810001-PP-01/B1</node><node>/PS-14443.1</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14443.1</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult>
</clashresults></clashtest></clashtests></batchtest></exchange>`;

assert.equal(extractFamilyRoot('PS-14221.1'), 'PS-14221');
assert.equal(extractFamilyRoot('GENSEC 2 of FRMWORK 1 of STRUCTURE /PS-14236'), 'PS-14236');

const rowLocalAudit = createPsFamilyClashAuditFromTextInputs({ clashXmlText: rowLocalXml, config: { sourceSide: 'auto', sourceFamily: 'PS-14416', familyPrefixesText: 'PS, SL', posToleranceMm: 25 } });
const byName = new Map(rowLocalAudit.clashRows.map((row) => [row.clashName, row]));
assert.equal(byName.get('Clash1').familyStatus, 'IN_FAMILY');
assert.equal(byName.get('Clash7').familyStatus, 'IN_FAMILY');
assert.equal(byName.get('Clash9').familyStatus, 'OUT_OF_FAMILY');

const psClashParsed = parsePsClashXml(PS_FAMILY_SAMPLE_PSCLASH_XML, { familyPrefixesText: 'PS, SL' });
assert.equal(psClashParsed.rows.length, 2);
assert.equal(psClashParsed.rows[0].source, 'PS-14175');
assert.equal(psClashParsed.rows[0].lineFamily, 'A8010850');
assert.equal(psClashParsed.rows[0].fullLineTag, 'ASIM-1836-2"-A8010850-13421-01');
assert.equal(psClashParsed.rows[0].branchNode, 'ASIM-1836-2"-A8010850-13421-01/B2');

const clash904Xml = `<exchange><batchtest><clashtests><clashtest><clashresults><clashresult name="Clash904" distance="-0.01"><clashobjects>
<clashobject><pathlink><node>File</node><node>/PS-14175</node><node>/PS-14175-BAR-1</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14175-BAR-1</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-2&quot;-A8010850-13421-01</node><node>/ASIM-1836-2&quot;-A8010850-13421-01/B2</node><node>/PS-14175.2</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14175.2</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult></clashresults></clashtest></clashtests></batchtest></exchange>`;
const psClashAudit = createPsFamilyClashAuditFromTextInputs({ clashXmlText: clash904Xml, psClashXmlText: PS_FAMILY_SAMPLE_PSCLASH_XML, config: { sourceSide: 'auto', sourceFamily: 'PS-14416', familyPrefixesText: 'PS, SL', posToleranceMm: 25 } });
assert.equal(psClashAudit.psClashReportRows.length, 2);
assert.deepEqual(buildPsClashReportRows(psClashAudit.psClashRows, psClashAudit.clashRows), psClashAudit.psClashReportRows);
assert.equal(psClashAudit.psClashReportRows[0].sourceObject, 'PS-14175.1');
assert.equal(psClashAudit.psClashReportRows[0].coverageInClashReport, 'Yes');
assert.equal(psClashAudit.psClashReportRows[0].clashNo, 'Clash904');
assert.equal(psClashAudit.psClashReportRows[0].remarks, 'None');
assert.equal(psClashAudit.psClashReportRows[1].sourceObject, 'PS-14175.2');
assert.equal(psClashAudit.psClashReportRows[1].coverageInClashReport, 'No');
assert.equal(psClashAudit.psClashReportRows[1].remarks, 'Same PSClashGroup PS-14175.1');

const reportHtml = renderPsFamilyReports(psClashAudit, 'psClashReport', PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(reportHtml.includes('PSClashName'));
assert.ok(reportHtml.includes('Coverage in Clash report'));
assert.ok(reportHtml.includes('Clash904'));
const exports = createPsFamilyAuditExports(psClashAudit);
assert.match(exports.psClashReportCsv, /PS-14175\.1/);
assert.match(exports.psClashReportCsv, /Same PSClashGroup PS-14175\.1/);

const stableTabs = PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs.filter((tab) => tab.maturity === 'stable').map((tab) => tab.key);
assert.deepEqual(stableTabs, ['clashRows', 'psClashReport']);
assert.ok(PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs.filter((tab) => tab.maturity === 'draft').length > 0);

console.log('ps-family-psclash-report tests passed');
