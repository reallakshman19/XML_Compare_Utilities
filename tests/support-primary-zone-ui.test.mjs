import assert from 'node:assert/strict';
import test from 'node:test';

import { _test as addonTest } from '../tabs/support-steel-relationship-builder/support-report-addon.js';

test('Support Report panel exposes optional primary relationship XML and two-column zone scope UI', () => {
  const html = addonTest.renderPanel();
  assert.match(html, /Primary Support Relationship XML \(optional\)/);
  assert.match(html, /data-ssr-relationship-file="1"/);
  assert.match(html, /data-ssr-relationship-xml/);
  assert.match(html, /Support Report zone scope/);
  assert.match(html, /Primary \/ piping-support zones/);
  assert.match(html, /Secondary \/ support zones/);
  assert.match(html, /data-ssr-zone-select="primary"/);
  assert.match(html, /data-ssr-zone-select="secondary"/);
  assert.match(html, /data-ssr-zone-search="primary"/);
  assert.match(html, /data-ssr-zone-search="secondary"/);
  assert.match(html, /Discover zones from primary XML/);
});

test('zone scope help states empty selection preserves unrestricted behavior', () => {
  const html = addonTest.zoneScopeCard();
  assert.match(html, /Empty selections mean no restriction/);
  assert.match(html, /exact ancestor nodes/i);
});

test('input audit attachment preserves zone and relationship qualification metadata', () => {
  const report = addonTest.attachSupportPrimaryInputAudit({ schema: 'SupportReportBundle.v1', rows: [] }, {
    zoneScope: { schema: 'SupportReportZoneScope.v1', active: true, primaryZoneIds: ['/ASIM-1835-CU-PI-P'], secondaryZoneIds: ['/ASIM-1835-CU-SU'] },
    zoneCatalog: { primaryZones: [{ zoneId: '/ASIM-1835-CU-PI-P', evidenceRowCount: 2 }], secondaryZones: [] },
    zoneScopeSummary: { inputRowCount: 3, includedRowCount: 2, excludedRowCount: 1 },
    primaryRelationshipInput: {
      schema: 'SupportPrimaryInput.v1',
      parsedRowCount: 4,
      scopedRowCount: 3,
      excludedByZoneCount: 1,
      parsedDiagnostics: [],
      bundle: { schema: 'SupportPrimaryRelationshipBundle.v1', summary: { explicitEdgeCount: 3 } },
    },
  });
  assert.equal(report.zoneScope.active, true);
  assert.equal(report.zoneScopeSummary.excludedRowCount, 1);
  assert.equal(report.primaryRelationshipInput.scopedRowCount, 3);
  assert.equal(report.primaryRelationshipInput.bundleSummary.explicitEdgeCount, 3);
});
