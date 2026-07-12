import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { buildSupportChangeReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-engine.js';
import { parseSupportChangeXml } from '../tabs/ps-family-clash-audit/ps-family-psclash-xml-parser.js';
import { PS_FAMILY_SAMPLE_STRUCTURE_XML, PS_FAMILY_SAMPLE_SUPPORT_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
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

const cuSuStructureXml = `<exchange><batchtest><clashtests><clashtest><clashresults>
<clashresult name="Clash88" distance="-0.01"><pos3f x="100" y="10" z="0"/><clashobjects>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-CU-SU</node><node>/PS-14311</node><node>/PS-14311-BAR-3</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14311-BAR-3</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-3&quot;-D8810084-91261M7-PP-01</node><node>/ASIM-1836-3&quot;-D8810084-91261M7-PP-01/B1</node><node>/PS-14311.4</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14311.4</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult>
<clashresult name="Clash89" distance="-0.02"><pos3f x="160" y="10" z="0"/><clashobjects>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-CU-SU</node><node>/PS-14311-BAR</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14311-BAR</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-3&quot;-D8810084-91261M7-PP-01</node><node>/ASIM-1836-3&quot;-D8810084-91261M7-PP-01/B1</node><node>/PS-14311.5</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14311.5</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult>
<clashresult name="Clash90" distance="-0.03"><pos3f x="210" y="10" z="0"/><clashobjects>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-CU-SU</node><node>/PS-14311</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14311</value></smarttag></smarttags></clashobject>
<clashobject><pathlink><node>File</node><node>/ASIM-1836-2&quot;-D8810087-91261M7-PP-01</node><node>/ASIM-1836-2&quot;-D8810087-91261M7-PP-01/B1</node><node>/PS-14311.6</node></pathlink><smarttags><smarttag><name>Item Name</name><value>/PS-14311.6</value></smarttag></smarttags></clashobject>
</clashobjects></clashresult>
</clashresults></clashtest></clashtests></batchtest></exchange>`;
const cuSuParsed = parseSupportChangeXml(cuSuStructureXml, { familyPrefixesText: 'PS, SL' }, 'StructureGroup vs Supports');
assert.equal(cuSuParsed.rows.length, 3);
assert.equal(cuSuParsed.rows[0].edgeType, 'StructuralContact');
assert.equal(cuSuParsed.rows[0].structuralGroup, 'PS-14311-BAR-3');
assert.equal(cuSuParsed.rows[0].support, 'PS-14311.4');
assert.equal(cuSuParsed.rows[0].supportGroup, 'D8810084_PS-14311');
assert.equal(cuSuParsed.rows[0].parsedEdge, 'PS-14311-BAR-3 ↔ PS-14311.4');
const directRestingReports = buildSupportChangeReports([cuSuParsed.rows[0]], [], []);
assert.equal(directRestingReports.supportExceptionRows.length, 0);
assert.equal(directRestingReports.supportSummaryRows[0].status, 'OK');
assert.equal(directRestingReports.supportSummaryRows[0].remarks, 'Direct structural resting support.');
assert.equal(directRestingReports.structureContactRows[0].remarks, 'Direct structural resting support');
const proximityReports = buildSupportChangeReports(cuSuParsed.rows, [], []);
assert.equal(proximityReports.structureLineProximityRows.length, 2);
assert.deepEqual(proximityReports.structureLineProximityRows.map((row) => row.structuralGroupRoot), ['PS-14311', 'PS-14311']);
assert.equal(proximityReports.structureLineProximityRows[0].supportsWithin250mm, 'PS-14311.4|PS-14311.5');
assert.equal(proximityReports.structureLineProximityRows[0].supportCount, 2);
assert.equal(proximityReports.structureLineProximityRows[0].totalSupportCount, 3);
assert.equal(proximityReports.structureLineProximityRows[1].supportCount, 1);
assert.equal(proximityReports.structureLineProximityRows[1].totalSupportCount, 3);

const customZoneParsed = parseSupportChangeXml(cuSuStructureXml, { familyPrefixesText: 'PS, SL', structuralZonesText: 'BAR-3', supportZonesText: 'PS-' }, 'StructureGroup vs Supports');
assert.equal(customZoneParsed.rows[0].edgeType, 'StructuralContact');
assert.equal(customZoneParsed.rows[0].structuralGroup, 'PS-14311-BAR-3');

const structureParsed = parseSupportChangeXml(PS_FAMILY_SAMPLE_STRUCTURE_XML, { familyPrefixesText: 'PS, SL' }, 'StructureGroup vs Supports');
const supportParsed = parseSupportChangeXml(PS_FAMILY_SAMPLE_SUPPORT_XML, { familyPrefixesText: 'PS, SL' }, 'Clash within Supports');
assert.equal(structureParsed.rows.length, 2);
assert.equal(supportParsed.rows.length, 3);
assert.equal(structureParsed.rows[0].edgeType, 'StructuralContact');
assert.equal(supportParsed.rows[0].edgeType, 'SupportChain');
assert.equal(structureParsed.rows[0].supportGroup, 'S8810011_PS-14396');
assert.equal(supportParsed.rows[0].supportGroup, 'S8810011_PS-14396');

const audit = createPsFamilyClashAuditFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
assert.equal(audit.summary.supportGroupCount, 1);
assert.equal(audit.summary.supportExceptionCount, 0);
assert.equal(audit.supportSummaryRows[0].supportGroup, 'S8810011_PS-14396');
assert.equal(audit.supportSummaryRows[0].psRoot, 'PS-14396');
assert.deepEqual(audit.supportSummaryRows[0].supportMembers, ['PS-14396.4', 'PS-14396.8', 'PS-14396.9', 'PS-14396.10']);
assert.deepEqual(audit.supportSummaryRows[0].evidenceClashes, ['Clash4', 'Clash202', 'Clash603', 'Clash723', 'Clash1429']);
assert.equal(audit.structureContactRows.length, 2);
assert.equal(audit.supportChainRows.length, 3);
assert.equal(audit.supportMemberRows.find((row) => row.memberType === 'StructuralGroup').support, 'GENSEC 2 of FRMWORK 1 of STRUCTURE /PS-14396');
assert.equal(audit.supportMemberRows.find((row) => row.support === 'PS-14396.4').representativeSupport, 'PS-14396.4');
assert.ok(audit.lineSupportTreeRows[0].treeText.includes('SupportGroup: S8810011_PS-14396'));
assert.ok(audit.lineSupportTreeRows[0].treeText.includes('StructuralGroup'));

const directReports = buildSupportChangeReports(structureParsed.rows, supportParsed.rows, []);
assert.deepEqual(directReports.supportSummaryRows, audit.supportSummaryRows);

const reportHtml = renderPsFamilyReports(audit, 'supportSummary', PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(reportHtml.includes('SupportGroup Summary'));
assert.ok(reportHtml.includes('S8810011_PS-14396'));
assert.ok(renderPsFamilyReports(audit, 'supportExceptions', PS_FAMILY_CLASH_AUDIT_CONFIG).includes('SupportChange Exceptions'));
assert.ok(renderPsFamilyReports(proximityReports, 'structureLineProximity', PS_FAMILY_CLASH_AUDIT_CONFIG).includes('TotalSupportCount'));
const exports = createPsFamilyAuditExports(audit);
assert.match(exports.supportSummaryCsv, /S8810011_PS-14396/);
assert.match(exports.lineSupportTreeText, /Line: ASIM-1836-6"-S8810011-91261M7-HC-01/);
assert.match(exports.inputEvidenceCsv, /Clash603/);
assert.match(createPsFamilyAuditExports(proximityReports).structureLineProximityCsv, /TotalSupportCount/);
assert.match(createPsFamilyAuditExports(proximityReports).structureLineProximityCsv, /PS-14311\.4\|PS-14311\.5/);

const stableTabs = PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs.filter((tab) => tab.maturity === 'stable').map((tab) => tab.key);
assert.deepEqual(stableTabs, ['supportSummary', 'lineSupportTree', 'structureLineProximity', 'supportExceptions', 'inputEvidence']);
assert.ok(PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs.filter((tab) => tab.maturity === 'draft').length > 0);

console.log('ps-family-supportchange-report tests passed');
