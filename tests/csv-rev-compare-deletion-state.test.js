import assert from 'node:assert/strict';

import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { SUPPORT_REV_DELETION_STATE_EVENT } from '../tabs/csv-rev-compare/support-revision-deletion-state.js';

const H = [
  'PREV NAME','SCOPE','CIVILSECONDARYSUPPORT','PIPE','SIZE',
  'PIPING PRIMARY SUPPORT','SUPPORT TYPE','PIPING PRIMARY SUPPORT REFERENCE',
  'EAST/WEST','NORTH/SOUTH','BOP ELEVATION','TOTAL SUPPORT POINTS ON SECONDARY',
  'REMARKS (IF ANY)','PRIMARY SUPPORT DESCRIPTION','PRIMARY SUPPORT ZONE','PRIMARY SUPPORT SITE',
  'PIPE SCHEDULE','INSULATION','STRESS SYSTEM NUMBER','NODE NO','REVISION',
];

function row(overrides = {}) {
  const values = {
    'PREV NAME': 'PS-OLD.1', SCOPE: 'BWGA', CIVILSECONDARYSUPPORT: 'SL-DEL(REF)',
    PIPE: 'BWGA-1000-2"-P8310007-253461P1-01', SIZE: '50',
    'PIPING PRIMARY SUPPORT': '/SL-DEL.1, /SL-DEL.2',
    'SUPPORT TYPE': 'REST-50, BP-50',
    'PIPING PRIMARY SUPPORT REFERENCE': '=67133210/1, =67133210/2',
    'EAST/WEST': 'E 150000mm', 'NORTH/SOUTH': 'N 100000mm', 'BOP ELEVATION': 'U 100500mm',
    'TOTAL SUPPORT POINTS ON SECONDARY': '1', 'REMARKS (IF ANY)': '',
    'PRIMARY SUPPORT DESCRIPTION': '', 'PRIMARY SUPPORT ZONE': '', 'PRIMARY SUPPORT SITE': '',
    'PIPE SCHEDULE': '', INSULATION: '', 'STRESS SYSTEM NUMBER': '', 'NODE NO': '', REVISION: '1',
    ...overrides,
  };
  return H.map((header) => values[header] ?? '');
}

function csv(rows) {
  return [H, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function remark(result) {
  const index = result.output.headers.indexOf('REMARKS (IF ANY)');
  return result.output.rows.find((item) => item.disposition === 'REV2').values[index];
}

// Retained later-report row: exact Civil+PIPE + shared references + prior position,
// but no target position/PREV NAME and an explicit non-remark SUPPORT DELETED state marker.
{
  const source = row();
  const target = row({
    REVISION: '2',
    'PREV NAME': '',
    'EAST/WEST': '',
    'NORTH/SOUTH': '',
    'BOP ELEVATION': '',
    'TOTAL SUPPORT POINTS ON SECONDARY': 'Support deleted',
    'REMARKS (IF ANY)': 'THIS ORACLE TEXT MUST NOT DRIVE DETECTION',
  });
  const result = runSupportRevisionCompare(csv([source]), csv([target]));
  assert.equal(result.exportReady, true);
  assert.equal(remark(result), 'Support deleted');
  const deletion = result.ledger.events.find((event) => event.type === SUPPORT_REV_DELETION_STATE_EVENT);
  assert.ok(deletion);
  assert.equal(deletion.matchingMethod, 'civil-pipe-location-identity');
  assert.ok(deletion.reasonCodes.includes('NON_REMARK_SUPPORT_DELETED_MARKER'));
  assert.equal(result.remarks.targetRemarks[deletion.targetCsvRowId].remark, 'Support deleted');
  assert.equal(result.ledger.events.some((event) => event.sourceXmlNode === deletion.sourceXmlNode && event.targetXmlNode === deletion.targetXmlNode && event.type !== SUPPORT_REV_DELETION_STATE_EVENT), false);
}

// Target REMARKS remains oracle-only: the same text in REMARKS cannot create deletion state.
{
  const source = row({ CIVILSECONDARYSUPPORT: 'SL-ORACLE(REF)', 'PIPING PRIMARY SUPPORT REFERENCE': '=O/1, =O/2' });
  const target = row({
    REVISION: '2', CIVILSECONDARYSUPPORT: 'SL-ORACLE(REF)',
    'PIPING PRIMARY SUPPORT REFERENCE': '=O/1, =O/2',
    'PREV NAME': '', 'EAST/WEST': '', 'NORTH/SOUTH': '', 'BOP ELEVATION': '',
    'TOTAL SUPPORT POINTS ON SECONDARY': '', 'REMARKS (IF ANY)': 'Support deleted',
  });
  const result = runSupportRevisionCompare(csv([source]), csv([target]));
  assert.equal(result.ledger.events.some((event) => event.type === SUPPORT_REV_DELETION_STATE_EVENT), false);
  assert.equal(remark(result), '');
}

// A different latest-report state marker (for example the observed "Invalid suport")
// is not silently coerced to Support deleted.
{
  const source = row({ CIVILSECONDARYSUPPORT: 'SL-INVALID(REF)', 'PIPING PRIMARY SUPPORT REFERENCE': '=I/1, =I/2' });
  const target = row({
    REVISION: '2', CIVILSECONDARYSUPPORT: 'SL-INVALID(REF)',
    'PIPING PRIMARY SUPPORT REFERENCE': '=I/1, =I/2',
    'PREV NAME': '', 'EAST/WEST': '', 'NORTH/SOUTH': 'Invalid suport', 'BOP ELEVATION': '',
    'TOTAL SUPPORT POINTS ON SECONDARY': '',
  });
  const result = runSupportRevisionCompare(csv([source]), csv([target]));
  assert.equal(result.ledger.events.some((event) => event.type === SUPPORT_REV_DELETION_STATE_EVENT), false);
}

// A SUPPORT DELETED marker without persistent component continuity is insufficient.
{
  const source = row({ CIVILSECONDARYSUPPORT: 'SL-NOREF(REF)', 'PIPING PRIMARY SUPPORT REFERENCE': '=S/1, =S/2' });
  const target = row({
    REVISION: '2', CIVILSECONDARYSUPPORT: 'SL-NOREF(REF)',
    'PIPING PRIMARY SUPPORT REFERENCE': '=T/1, =T/2',
    'PREV NAME': '', 'EAST/WEST': '', 'NORTH/SOUTH': '', 'BOP ELEVATION': '',
    'TOTAL SUPPORT POINTS ON SECONDARY': 'Support deleted',
  });
  const result = runSupportRevisionCompare(csv([source]), csv([target]));
  assert.equal(result.ledger.events.some((event) => event.type === SUPPORT_REV_DELETION_STATE_EVENT), false);
}

console.log('csv-rev-compare deletion-state tests passed');
