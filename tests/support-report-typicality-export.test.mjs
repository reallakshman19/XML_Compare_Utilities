import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SUPPORT_REPORT_COLUMNS,
  SUPPORT_REPORT_TYPICALITY_COLUMNS,
  supportReportColumns,
} from '../tabs/support-steel-relationship-builder/support-report-contract.js';
import { supportReportToCsv } from '../tabs/support-steel-relationship-builder/support-report-export.js';
import {
  createSupportReportWorkbook,
  supportReportSpreadsheetMatrix,
  typicalityAuditSpreadsheetMatrix,
} from '../tabs/support-steel-relationship-builder/support-report-xlsx.js';

const row = Object.freeze({
  scope: 'ASIM',
  civilSecondarySupport: 'PS-11168',
  pipe: 'ASIM-1835-2"-P8810320-31441C4-HT-01',
  size: '50',
  pipeSchedule: '',
  pipeInsulationThickness: '',
  pipeInsulationType: '',
  pipingPrimarySupport: '/PS-11168.1',
  supportType: 'REST-50, BP-50, GUIDE-50',
  pipingPrimarySupportReference: '',
  eastWest: '',
  northSouth: '',
  bopElevation: '',
  stressSystemNumber: '',
  nodeNumber: '',
  totalSupportPointsOnSecondary: 5,
  previousName: '',
  primarySupportDescription: '',
  primarySupportZone: '',
  primarySupportSite: '',
  remarks: '',
  typicalStructure: 'PS-14168',
  pipingSupportArrangementMatch: 'EXACT',
  typicalityAuditId: 'TYP-PS-11168--PS-14168-L01',
});

const typicalityAudit = Object.freeze({
  schema: 'SupportReportTypicalityAudit.v1',
  profileId: 'PS_TYPICAL_V1_PROVISIONAL',
  familyComparisons: Object.freeze([Object.freeze({
    auditId: 'TYP-PS-11168--PS-14168',
    leftFamilyId: 'PS-11168',
    rightFamilyId: 'PS-14168',
    signals: Object.freeze([Object.freeze({
      reasonCode: 'STRUCT_LOCATION_COUNT_EQUAL',
      left: 5,
      right: 5,
      residual: null,
      threshold: 'EXACT',
      result: 'PASS',
    })]),
  })]),
  locationAssignments: Object.freeze([Object.freeze({
    parentAuditId: 'TYP-PS-11168--PS-14168',
    leftFamilyId: 'PS-11168',
    rightFamilyId: 'PS-14168',
    candidatePairs: Object.freeze([Object.freeze({
      candidateId: 'PAIR-L--R',
      leftLocationId: 'L',
      rightLocationId: 'R',
      eligible: true,
      arrangementResult: 'EXACT',
      assignmentCost: 0,
      signals: Object.freeze({
        pipeClass: Object.freeze({ reasonCode: 'PIPE_CLASS_EXACT' }),
        memberMultiplicity: Object.freeze({ reasonCode: 'PRIMARY_MEMBER_MULTIPLICITY_EXACT' }),
        geometry: Object.freeze({ reasonCode: 'LOCAL_POSITION_WITHIN_TOLERANCE', residual: { median: 0, max: 0 }, thresholdMm: 50 }),
      }),
      supportTypeComparison: Object.freeze({
        result: 'EXACT',
        reasonCodes: Object.freeze(['SUPPORT_TYPE_MULTISET_EXACT']),
        leftRaw: Object.freeze(['REST-50', 'BP-50', 'GUIDE-50']),
        rightRaw: Object.freeze(['GUIDE-50', 'REST-50', 'BP-50']),
        leftCanonical: Object.freeze({ 'BP-50': 1, 'GUIDE-50': 1, 'REST-50': 1 }),
        rightCanonical: Object.freeze({ 'BP-50': 1, 'GUIDE-50': 1, 'REST-50': 1 }),
      }),
      sourceEvidence: Object.freeze({ leftClashIds: Object.freeze(['A']), rightClashIds: Object.freeze(['B']) }),
    })]),
    selectedAssignments: Object.freeze([Object.freeze({
      candidateId: 'PAIR-L--R',
      auditId: 'TYP-PS-11168--PS-14168-L01',
      leftLocationId: 'L',
      rightLocationId: 'R',
      arrangementResult: 'EXACT',
      assignmentCost: 0,
      signals: Object.freeze({
        pipeClass: Object.freeze({ reasonCode: 'PIPE_CLASS_EXACT' }),
        memberMultiplicity: Object.freeze({ reasonCode: 'PRIMARY_MEMBER_MULTIPLICITY_EXACT' }),
        geometry: Object.freeze({ reasonCode: 'LOCAL_POSITION_WITHIN_TOLERANCE', residual: { median: 0, max: 0 }, thresholdMm: 50 }),
      }),
      supportTypeComparison: Object.freeze({
        result: 'EXACT', reasonCodes: Object.freeze(['SUPPORT_TYPE_MULTISET_EXACT']),
        leftRaw: Object.freeze(['REST-50']), rightRaw: Object.freeze(['REST-50']),
        leftCanonical: Object.freeze({ 'REST-50': 1 }), rightCanonical: Object.freeze({ 'REST-50': 1 }),
      }),
      sourceEvidence: Object.freeze({ leftClashIds: Object.freeze(['A']), rightClashIds: Object.freeze(['B']) }),
    })]),
  })]),
});

const comparisonBundle = Object.freeze({ rows: Object.freeze([row]), typicalityAudit });

test('legacy Support Report remains 21 columns while comparison mode adds 22-24', () => {
  assert.equal(SUPPORT_REPORT_COLUMNS.length, 21);
  assert.equal(SUPPORT_REPORT_TYPICALITY_COLUMNS.length, 3);
  assert.equal(supportReportColumns({ rows: [row] }).length, 21);
  const columns = supportReportColumns(comparisonBundle);
  assert.equal(columns.length, 24);
  assert.deepEqual(columns.slice(-3).map((column) => column.key), [
    'typicalStructure',
    'pipingSupportArrangementMatch',
    'typicalityAuditId',
  ]);
});

test('comparison CSV and matrix serialize columns 22-24 deterministically', () => {
  const matrix = supportReportSpreadsheetMatrix(comparisonBundle);
  assert.equal(matrix[0].length, 24);
  assert.equal(matrix[2][21], 'PS-14168');
  assert.equal(matrix[2][22], 'EXACT');
  assert.equal(matrix[2][23], 'TYP-PS-11168--PS-14168-L01');

  const [ordinal, header, data] = supportReportToCsv(comparisonBundle, { includeOrdinalRow: true }).split('\n');
  assert.ok(ordinal.endsWith('"24"'));
  assert.match(header, /"TYPICAL STRUCTURE \(PS NO\.\)"/);
  assert.match(header, /"PIPING SUPPORT ARRANGEMENT MATCH"/);
  assert.match(data, /"PS-14168","EXACT","TYP-PS-11168--PS-14168-L01"$/);
});

test('comparison XLSX uses dynamic A:X filter and emits Typicality Audit sheet', () => {
  const captured = [];
  const fakeXlsx = {
    utils: {
      aoa_to_sheet(matrix) { const sheet = { matrix }; captured.push(sheet); return sheet; },
      book_new() { return { sheets: [] }; },
      book_append_sheet(workbook, worksheet, name) { workbook.sheets.push({ worksheet, name }); },
    },
    write() { return new Uint8Array(); },
  };
  const workbook = createSupportReportWorkbook(comparisonBundle, fakeXlsx);
  assert.equal(workbook.sheets.length, 2);
  assert.equal(workbook.sheets[0].name, 'Support Report');
  assert.equal(workbook.sheets[0].worksheet['!autofilter'].ref, 'A2:X3');
  assert.equal(workbook.sheets[1].name, 'Typicality Audit');
  assert.match(workbook.sheets[1].worksheet['!autofilter'].ref, /^A1:Q\d+$/);

  const auditMatrix = typicalityAuditSpreadsheetMatrix(typicalityAudit);
  assert.deepEqual(auditMatrix[0].slice(0, 7), [
    'Audit ID', 'Parent Audit ID', 'Left PS', 'Right PS', 'Left Location ID', 'Right Location ID', 'Signal / Rule',
  ]);
  assert.ok(auditMatrix.some((auditRow) => auditRow.includes('PIPING_SUPPORT_ARRANGEMENT')));
});
