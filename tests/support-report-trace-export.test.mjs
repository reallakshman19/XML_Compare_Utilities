import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SUPPORT_REPORT_TRACE_COLUMNS,
  supportReportDebugToJson,
  supportReportTraceRows,
  supportReportTraceSummary,
  supportReportTraceToCsv,
} from '../tabs/support-steel-relationship-builder/support-report-trace-export.js';

function bundle() {
  const member = (observed, resolved, basis, point) => ({
    observedMemberId: observed,
    resolvedMemberId: resolved,
    matchBasis: basis,
    positionBasis: point ? 'NATIVE_MEMBER_POSITION' : 'UNRESOLVED',
    positionGlobal: point,
    sourcePath: ['/ASIM-1885-CU-PI', '/ASIM-1885-CU-PI-D', resolved].filter(Boolean),
    lineContext: { fullLineTag: 'ASIM-LINE' },
    attributeEvidence: {
      supportType: resolved ? 'PG-50' : '',
      primarySupportReference: resolved ? '=1/2' : '',
      description: resolved ? 'GUIDE' : '',
      insulationThickness: resolved ? '0mm' : '',
    },
  });
  const resolved = member('/PS-12005.1', '/PS-12005.1', 'DIRECT_MEMBER_ID', { x: 10, y: -20, z: 30 });
  const unresolved = member('/PS-12005', '', 'UNRESOLVED', null);
  return {
    schema: 'SupportReportBundle.v1',
    evidenceMode: 'CLASH_XML_PLUS_RELATIONSHIP_BUNDLE',
    summary: { reportRowCount: 2, enrichedRowCount: 1, xmlOnlyRowCount: 1, multiLocationRowCount: 2 },
    rows: [
      {
        schema: 'SupportReportRow.v1', rowId: 'ROW-A', civilSecondarySupport: 'PS-12005(REF)', pipe: 'ASIM-LINE',
        eastWest: 'E 100 mm', northSouth: 'S 200 mm', bopElevation: 'U 300 mm',
        evidence: {
          evidenceMode: 'CLASH_XML_PLUS_RELATIONSHIP_BUNDLE', clashMemberIds: ['/PS-12005.1'],
          selectedNativeMemberIds: ['/PS-12005.1'], nativeOnlyMemberIds: [], missingClashMemberIds: [],
          locationIndex: 0, locationCountOnPipe: 2, locationMergeToleranceMm: 50, multipleLocationsOnPipe: true,
          reportCoordinateBasis: 'NAVISWORKS_CLASH_LOCATION', carrierObjectIds: ['/PIPE-1'], carrierAttributeConflicts: [],
          fieldProvenance: { eastWest: { sourceClass: 'CLASH_POINT_FALLBACK' } },
          jsonTrace: {
            members: [resolved],
            posClusters: [{
              posClusterId: 'POS:10|-20|30', positionBasis: 'NATIVE_MEMBER_POSITION', positionGlobal: { x: 10, y: -20, z: 30 },
              observedMemberIds: ['/PS-12005.1'], resolvedMemberIds: ['/PS-12005.1'], matchBases: ['DIRECT_MEMBER_ID'], members: [resolved],
            }],
          },
        },
        diagnostics: [{ severity: 'INFO', code: 'COORDINATE_FROM_CLASH_FALLBACK', message: 'Navisworks report location used.' }],
      },
      {
        schema: 'SupportReportRow.v1', rowId: 'ROW-B', civilSecondarySupport: 'PS-12005(REF)', pipe: 'ASIM-LINE',
        eastWest: 'E 100 mm', northSouth: 'S 280 mm', bopElevation: 'U 300 mm',
        evidence: {
          evidenceMode: 'CLASH_XML_PLUS_RELATIONSHIP_BUNDLE', clashMemberIds: ['/PS-12005'],
          selectedNativeMemberIds: [], nativeOnlyMemberIds: [], missingClashMemberIds: ['/PS-12005'],
          locationIndex: 1, locationCountOnPipe: 2, locationMergeToleranceMm: 50, multipleLocationsOnPipe: true,
          reportCoordinateBasis: 'NAVISWORKS_CLASH_LOCATION', carrierObjectIds: [], carrierAttributeConflicts: [],
          fieldProvenance: {},
          jsonTrace: {
            members: [unresolved],
            posClusters: [{
              posClusterId: 'UNRESOLVED_POS', positionBasis: 'UNRESOLVED', positionGlobal: null,
              observedMemberIds: ['/PS-12005'], resolvedMemberIds: [], matchBases: ['UNRESOLVED'], members: [unresolved],
            }],
          },
        },
        diagnostics: [{ severity: 'WARN', code: 'MEMBER_ENRICHMENT_INCOMPLETE', message: 'No staged member resolved.' }],
      },
    ],
    diagnostics: [],
  };
}

test('trace CSV exposes row location, native POS cluster and mapping basis without changing report grain', () => {
  const rows = supportReportTraceRows(bundle());
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['REPORT ROW ID'], 'ROW-A');
  assert.equal(rows[0]['REPORT N/S'], 'S 200 mm');
  assert.equal(rows[0]['POS CLUSTER ID'], 'POS:10|-20|30');
  assert.equal(rows[0]['NATIVE POS Y MM'], -20);
  assert.equal(rows[0]['MATCH BASIS'], 'DIRECT_MEMBER_ID');
  assert.equal(rows[0]['REPORT COORDINATE BASIS'], 'NAVISWORKS_CLASH_LOCATION');
  assert.equal(rows[1]['REPORT N/S'], 'S 280 mm');
  assert.equal(rows[1]['POS CLUSTER ID'], 'UNRESOLVED_POS');
  assert.equal(rows[1]['RESOLUTION STATE'], 'UNRESOLVED_MEMBER');
});

test('trace CSV has deterministic column order and spreadsheet-safe quoting', () => {
  const csv = supportReportTraceToCsv(bundle());
  const firstLine = csv.split('\n')[0];
  assert.equal(firstLine, SUPPORT_REPORT_TRACE_COLUMNS.map((value) => `"${value}"`).join(','));
  assert.match(csv, /"POS:10\|-20\|30"/);
  assert.match(csv, /"'=1\/2"/);
});

test('trace summary makes unresolved member and POS evidence visible', () => {
  const summary = supportReportTraceSummary(bundle());
  assert.deepEqual(summary, {
    reportRowCount: 2,
    enrichedRowCount: 1,
    xmlOnlyRowCount: 1,
    posClusterCount: 2,
    unresolvedPosClusterCount: 1,
    directMemberMatchCount: 1,
    previousNameAliasMatchCount: 0,
    familyLineEnrichmentCount: 0,
    unresolvedMemberMatchCount: 1,
    rowsWithoutTraceCount: 0,
    multiLocationRowCount: 2,
  });
});

test('debug JSON is lossless around the canonical report bundle and includes trace summary', () => {
  const source = bundle();
  const parsed = JSON.parse(supportReportDebugToJson(source));
  assert.equal(parsed.schema, 'SupportReportDebugExport.v1');
  assert.equal(parsed.traceExportSchema, 'SupportReportTraceCsv.v1');
  assert.equal(parsed.traceSummary.unresolvedPosClusterCount, 1);
  assert.deepEqual(parsed.reportBundle, source);
});
