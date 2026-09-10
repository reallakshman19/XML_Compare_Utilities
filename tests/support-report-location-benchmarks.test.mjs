import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseSupportReportClashXml } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js?v=20260910-support-report-location-17';
import { buildSupportReportBundle } from '../tabs/support-steel-relationship-builder/support-report-engine.js?v=20260910-support-report-json-trace-18';
import { SUPPORT_REPORT_MULTI_LOCATION_REMARK } from '../tabs/support-steel-relationship-builder/support-report-location-grouping.js?v=20260910-support-report-location-17';

const ps12154Xml = readFileSync('benchmarks/SupportreportXML-PS-068_PS-12154.xml', 'utf8');
const ps12120Xml = readFileSync('benchmarks/SupportreportXML-PS-12120.xml', 'utf8');
const SAME_LOCATION_PIPE = 'ASIM-1885-2"-D8810003-11441T3-PP-01';
const MULTI_LOCATION_PIPE = 'ASIM-1885-2"-P8810365-31441C4-HT-01';

test('PS-12154 REST/GUIDE pair stays one report location with no multi-location remark', () => {
  const parsed = parseSupportReportClashXml(ps12154Xml);
  const groups = parsed.groups.filter((group) => group.fullLineTag === SAME_LOCATION_PIPE);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].primarySupportMemberIds, ['/PS-12154.2', '/PS-12154.5']);
  assert.equal(groups[0].locationCountOnPipe, 1);
  assert.equal(groups[0].multipleLocationsOnPipe, false);
  assert.equal(groups[0].locationMergeToleranceMm, 50);

  const report = buildSupportReportBundle({ clashEvidence: parsed });
  const row = report.rows.find((item) => item.pipe === SAME_LOCATION_PIPE);
  assert.ok(row);
  assert.equal(row.pipingPrimarySupport, '/PS-12154.2, /PS-12154.5');
  assert.equal(row.remarks.includes(SUPPORT_REPORT_MULTI_LOCATION_REMARK), false);
  assert.equal(row.primarySupportSite, 'ASIM-1885-CU-PI');
  assert.equal(row.primarySupportZone, 'ASIM-1885-CU-PI-D');
});

test('PS-12120 repeated pipe splits into five physical report locations', () => {
  const parsed = parseSupportReportClashXml(ps12120Xml);
  const groups = parsed.groups.filter((group) => group.fullLineTag === MULTI_LOCATION_PIPE);
  assert.equal(groups.length, 5);
  assert.ok(groups.every((group) => group.locationCountOnPipe === 5));
  assert.ok(groups.every((group) => group.multipleLocationsOnPipe));
  assert.ok(groups.every((group) => group.locationMergeToleranceMm === 50));

  const report = buildSupportReportBundle({ clashEvidence: parsed });
  const rows = report.rows.filter((row) => row.pipe === MULTI_LOCATION_PIPE);
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.remarks === SUPPORT_REPORT_MULTI_LOCATION_REMARK));
  assert.ok(rows.every((row) => row.evidence.multipleLocationsOnPipe));
});

test('PS-068 family mismatch remains visible and is not silently renamed', () => {
  const report = buildSupportReportBundle({ clashXmlText: ps12154Xml });
  const row = report.rows.find((item) => item.pipingPrimarySupport === '/SL-147.1');
  assert.ok(row);
  assert.match(row.remarks, /Primary support family mismatch: \/SL-147\.1 under PS-068; rename required/);
  assert.equal(row.previousName, '');
});
