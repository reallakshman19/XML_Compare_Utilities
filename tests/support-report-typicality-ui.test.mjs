import assert from 'node:assert/strict';
import test from 'node:test';
import { _test as addonTest } from '../tabs/support-steel-relationship-builder/support-report-addon.js';
import {
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  SUPPORT_REPORT_TYPICALITY_UI_SETTINGS,
  mergeSupportReportTypicalityProfile,
  profileValue,
} from '../tabs/support-steel-relationship-builder/support-report-typicality-profile.js';
import { renderSupportReportTable, renderSupportReportWorkspace } from '../tabs/support-steel-relationship-builder/support-report-view.js';

test('Support Report panel exposes optional second XML typicality input', () => {
  const html = addonTest.renderPanel();
  assert.match(html, /Typical-structure reference XML/);
  assert.match(html, /data-ssr-typical-file="1"/);
  assert.match(html, /data-ssr-typical-xml/);
  assert.match(html, /legacy 21-column mode/);
  assert.match(html, /comparison columns 22–24/i);
});

test('typicality configuration exposes active defaults and hard-coded policy help through info hovers', () => {
  const html = addonTest.typicalityConfigCard();
  assert.match(html, /data-ssr-typical-config/);
  assert.match(html, /data-ssr-typical-setting="structural\.geometryEnvelopeToleranceMm"/);
  assert.match(html, /data-ssr-typical-setting="pipingLocation\.assignmentWeights\.supportTypeMember"/);
  assert.match(html, /Dimensional resolution order/);
  assert.match(html, /3D → 2D → 1D/);
  assert.match(html, /Repeated member suffix evidence/);
  assert.match(html, /PREV NAME fuzzy evidence/);
  assert.match(html, /title="Hard family-level geometry gate\./);
  assert.match(html, />\(i\)<\/span>/);
});

test('typicality profile partial overrides preserve unrelated governed defaults', () => {
  const merged = mergeSupportReportTypicalityProfile({
    pipingLocation: {
      assignmentWeights: { supportTypeMember: 250000 },
    },
  });
  assert.equal(merged.pipingLocation.assignmentWeights.supportTypeMember, 250000);
  assert.equal(
    merged.pipingLocation.assignmentWeights.memberMultiplicity,
    SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL.pipingLocation.assignmentWeights.memberMultiplicity,
  );
  assert.equal(
    merged.structural.pairDistanceP95ToleranceMm,
    SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL.structural.pairDistanceP95ToleranceMm,
  );
  assert.equal(profileValue(merged, 'pipingLocation.assignmentWeights.supportTypeMember'), 250000);
  assert.ok(SUPPORT_REPORT_TYPICALITY_UI_SETTINGS.length >= 10);
});

test('ready-state comparison text distinguishes legacy and comparison modes', () => {
  assert.equal(addonTest.comparisonReadyText({}), ' · legacy 21-column mode');
  const text = addonTest.comparisonReadyText({
    typicalityAudit: {
      profileId: 'PS_TYPICAL_V1_PROVISIONAL',
      matches: [
        { result: 'TYPICAL' },
        { result: 'REVIEW' },
        { result: 'AMBIGUOUS' },
      ],
    },
  });
  assert.match(text, /1 typical, 1 review, 1 ambiguous/);
  assert.match(text, /columns 22–24 enabled/);
  assert.match(text, /profile PS_TYPICAL_V1_PROVISIONAL/);
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
