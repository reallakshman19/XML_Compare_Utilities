import assert from 'node:assert/strict';
import test from 'node:test';
import { _test as addonTest } from '../tabs/support-steel-relationship-builder/support-report-addon.js';
import { renderSupportReportTable, renderSupportReportWorkspace } from '../tabs/support-steel-relationship-builder/support-report-view.js';

test('Support Report panel exposes optional second XML typicality input', () => {
  const html = addonTest.renderPanel();
  assert.match(html, /Typical-structure reference XML/);
  assert.match(html, /data-ssr-typical-file="1"/);
  assert.match(html, /data-ssr-typical-xml/);
  assert.match(html, /legacy 21-column mode/);
  assert.match(html, /comparison columns 22–24/i);
});

test('ready-state comparison text distinguishes legacy and comparison modes', () => {
  assert.equal(addonTest.comparisonReadyText({}), ' · legacy 21-column mode');
  const text = addonTest.comparisonReadyText({
    typicalityAudit: {
      matches: [
        { result: 'TYPICAL' },
        { result: 'REVIEW' },
        { result: 'AMBIGUOUS' },
      ],
    },
  });
  assert.match(text, /1 typical, 1 review, 1 ambiguous/);
  assert.match(text, /columns 22–24 enabled/);
});

test('comparison report table renders derived columns while legacy table does not', () => {
  const baseRow = {
    scope: 'ASIM',
    civilSecondarySupport: 'PS-11168',
    pipe: 'ASIM-1835-2"-P8810320-31441C4-HT-01',
  };
  const legacy = renderSupportReportTable({ rows: [baseRow] });
  assert.doesNotMatch(legacy, /TYPICAL STRUCTURE/);

  const report = {
    rows: [{
      ...baseRow,
      typicalStructure: 'PS-14168',
      pipingSupportArrangementMatch: 'TOPOLOGY ONLY (SUPPORT TYPE UNAVAILABLE)',
      typicalityAuditId: 'TYP-PS-11168--PS-14168-L01',
    }],
    typicalityAudit: { matches: [{ result: 'TYPICAL' }] },
    summary: {},
    diagnostics: [],
  };
  const table = renderSupportReportTable(report);
  assert.match(table, /TYPICAL STRUCTURE \(PS NO\.\)/);
  assert.match(table, /PIPING SUPPORT ARRANGEMENT MATCH/);
  assert.match(table, /TYPICALITY AUDIT ID/);
  assert.match(table, /PS-14168/);
  assert.match(table, /TYP-PS-11168--PS-14168-L01/);

  const workspace = renderSupportReportWorkspace(report);
  assert.match(workspace, /Typical-structure comparison:/);
});
