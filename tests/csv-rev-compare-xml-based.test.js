import assert from 'node:assert/strict';

import { convertSupportRevisionTable } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { parseEngineeringCoordinate } from '../tabs/csv-rev-compare/support-revision-normalization.js';

const H = [
  'PREV NAME', 'SCOPE', 'CIVILSECONDARYSUPPORT', 'PIPE', 'SIZE',
  'PIPING PRIMARY SUPPORT', 'SUPPORT TYPE', 'PIPING PRIMARY SUPPORT REFERENCE',
  'EAST/WEST', 'NORTH/SOUTH', 'BOP ELEVATION', 'TOTAL SUPPORT POINTS ON SECONDARY',
  'REMARKS (IF ANY)', 'PRIMARY SUPPORT DESCRIPTION', 'PRIMARY SUPPORT ZONE', 'PRIMARY SUPPORT SITE',
  'PIPE SCHEDULE', 'INSULATION', 'STRESS SYSTEM NUMBER', 'NODE NO', 'REVISION',
  'Fx', 'Fy', 'Fz', 'Fx', 'Fy', 'Fz',
];

function row(overrides = {}) {
  const base = {
    'PREV NAME': 'PS00001', SCOPE: 'PL', CIVILSECONDARYSUPPORT: 'SL-1',
    PIPE: 'ASIM-1885-PL-4"-M8810130-02', SIZE: '4',
    'PIPING PRIMARY SUPPORT': '/SL-1.1', 'SUPPORT TYPE': 'REST-50',
    'PIPING PRIMARY SUPPORT REFERENCE': '=100/1',
    'EAST/WEST': 'E 1000', 'NORTH/SOUTH': 'N 2000', 'BOP ELEVATION': '3000',
    'TOTAL SUPPORT POINTS ON SECONDARY': '1', 'REMARKS (IF ANY)': '',
    'PRIMARY SUPPORT DESCRIPTION': '', 'PRIMARY SUPPORT ZONE': '', 'PRIMARY SUPPORT SITE': '',
    'PIPE SCHEDULE': 'SCH40', INSULATION: 'NONE', 'STRESS SYSTEM NUMBER': 'SYS-1', 'NODE NO': '10', REVISION: '1',
    'Fx#1': '', 'Fy#1': '', 'Fz#1': '', 'Fx#2': '', 'Fy#2': '', 'Fz#2': '',
  };
  const value = { ...base, ...overrides };
  const ordinals = new Map();
  return H.map((header) => {
    const ordinal = (ordinals.get(header) || 0) + 1; ordinals.set(header, ordinal);
    const duplicateKey = `${header}#${ordinal}`;
    return duplicateKey in value ? value[duplicateKey] : value[header] ?? '';
  });
}

function table(rows) { return [H, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\n'); }
function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function types(result) { return result.ledger.events.map((event) => event.type); }
function targetRemark(result, family) {
  const location = result.targetModel.locations.find((item) => item.family === family);
  return location ? result.remarks.targetRemarks[location.sourceRowId]?.remark || '' : '';
}
function sourceRemark(result, family) {
  const location = result.sourceModel.locations.find((item) => item.family === family);
  return location ? result.remarks.sourceRemarks[location.sourceRowId]?.remark || '' : '';
}

// CSV quoting + duplicate headers remain under the existing parser/categorizer authority.
{
  const conversion = convertSupportRevisionTable(table([row({
    'PIPING PRIMARY SUPPORT': '/SL-212.3, /SL-212.1, /SL-212.4, /SL-212.2',
    'SUPPORT TYPE': 'SHOE-250, REST-250, MDS/AT05-10-PMP, MDS/ST06.10-PMP',
    'PIPING PRIMARY SUPPORT REFERENCE': '=1006649755/3641, =1006657947/896, =1006649755/3642, =1006649755/4596',
    'Fy#1': '-13623', 'Fy#2': '-11594',
  })]));
  assert.equal(conversion.ok, true, JSON.stringify(conversion.validationResults, null, 2));
  assert.deepEqual(conversion.source.columnIds.slice(-6), ['Fx', 'Fy', 'Fz', 'Fx__2', 'Fy__2', 'Fz__2']);
  const loads = conversion.graph.nodes.filter((node) => node.levelId === 'load');
  assert.equal(loads.find((node) => node.fields.columnId === 'Fy')?.fields.ordinal, 1);
  assert.equal(loads.find((node) => node.fields.columnId === 'Fy__2')?.fields.ordinal, 2);
  assert.match(conversion.exportResult.xmlText, /columnId="Fy__2"/);
  const components = conversion.graph.nodes.filter((node) => node.levelId === 'primarySupport');
  assert.equal(components.length, 4);
  assert.equal(components[0].fields.memberId, '/SL-212.3');
  assert.equal(components[0].fields.reference, '=1006649755/3641');
}

// Unequal parallel lists preserve the longest evidence list and emit a diagnostic; no truncation.
{
  const conversion = convertSupportRevisionTable(table([row({
    'PIPING PRIMARY SUPPORT': '/SL-9.1, /SL-9.2',
    'SUPPORT TYPE': 'REST-50',
    'PIPING PRIMARY SUPPORT REFERENCE': '=9/1, =9/2, =9/3',
  })]));
  const components = conversion.graph.nodes.filter((node) => node.levelId === 'primarySupport');
  assert.equal(components.length, 3);
  assert.ok(conversion.graph.diagnostics.some((item) => item.code === 'many_per_row_parallel_list_length_mismatch'));
  assert.equal(components[2].fields.reference, '=9/3');
}

// Persistent references survive member renumbering. SL-212 lost reference 4596 and its numeric load changed.
{
  const rev1 = row({
    'PREV NAME': 'PS02012', CIVILSECONDARYSUPPORT: 'SL-212',
    'PIPING PRIMARY SUPPORT': '/SL-212.3, /SL-212.1, /SL-212.4, /SL-212.2',
    'SUPPORT TYPE': 'SHOE-250, REST-250, MDS/AT05-10-PMP, MDS/ST06.10-PMP',
    'PIPING PRIMARY SUPPORT REFERENCE': '=1006649755/3641, =1006657947/896, =1006649755/3642, =1006649755/4596',
    'Fx#1': '100', 'Fy#1': '-3200', 'Fz#1': '50', 'Fx#2': '5', 'Fy#2': '-11594', 'Fz#2': '8',
  });
  const rev2 = row({
    'PREV NAME': 'PS02012', CIVILSECONDARYSUPPORT: 'SL-212', REVISION: '2',
    'PIPING PRIMARY SUPPORT': '/SL-212.2, /SL-212.1, /SL-212.4',
    'SUPPORT TYPE': 'SHOE-250, REST-250, MDS/AT05-10-PMP',
    'PIPING PRIMARY SUPPORT REFERENCE': '=1006649755/3641, =1006657947/896, =1006649755/3642',
    'Fx#1': '100', 'Fy#1': '-3300', 'Fz#1': '50', 'Fx#2': '5', 'Fy#2': '-12000', 'Fz#2': '8',
  });
  const result = runSupportRevisionCompare(table([rev1]), table([rev2]));
  assert.equal(result.stage, 'READY_TO_EXPORT');
  assert.ok(types(result).includes('PRIMARY_MEMBER_RENUMBERED'));
  assert.ok(types(result).includes('SUPPORT_COMPONENT_SET_CHANGED'));
  assert.ok(types(result).includes('LOAD_SIGNATURE_CHANGED'));
  assert.ok(!types(result).includes('SUPPORT_LOCATION_REMOVED'));
  const setChange = result.ledger.events.find((event) => event.type === 'SUPPORT_COMPONENT_SET_CHANGED');
  assert.deepEqual(setChange.normalizedState.removedReferences, ['=1006649755/4596']);
  assert.match(targetRemark(result, 'SL-212'), /Support Type Changes/);
  assert.match(targetRemark(result, 'SL-212'), /Minor Load change/);
  const renumber = result.ledger.events.find((event) => event.type === 'PRIMARY_MEMBER_RENUMBERED' && event.persistentReferences.includes('=1006649755/3641'));
  assert.equal(renumber.normalizedState.identity, 'SAME_COMPONENT');
}

// PS02039 EMPTY -> NUMERIC becomes load standardised; unchanged numeric load produces no load event.
{
  const empty = row({ 'PREV NAME': 'PS02039', CIVILSECONDARYSUPPORT: 'SL-239', 'PIPING PRIMARY SUPPORT REFERENCE': '=239/1' });
  const numeric = row({ 'PREV NAME': 'PS02039', CIVILSECONDARYSUPPORT: 'SL-239', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=239/1', 'Fx#1': '10', 'Fy#1': '20', 'Fz#1': '30', 'Fx#2': '40', 'Fy#2': '50', 'Fz#2': '60' });
  const changed = runSupportRevisionCompare(table([empty]), table([numeric]));
  assert.ok(types(changed).includes('LOAD_BECAME_NUMERIC'));
  assert.equal(targetRemark(changed, 'SL-239'), 'load standardised');
  const same = runSupportRevisionCompare(table([numeric]), table([numeric]));
  assert.ok(!types(same).includes('LOAD_BECAME_NUMERIC'));
  assert.ok(!types(same).includes('LOAD_SIGNATURE_CHANGED'));
  assert.equal(targetRemark(same, 'SL-239'), '');
}

// Row order is provenance only: reordering two unchanged rows does not create engineering events.
{
  const a = row({ CIVILSECONDARYSUPPORT: 'SL-A', 'PREV NAME': 'PS-A', 'PIPING PRIMARY SUPPORT': '/SL-A.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=A/1' });
  const b = row({ CIVILSECONDARYSUPPORT: 'SL-B', 'PREV NAME': 'PS-B', 'PIPING PRIMARY SUPPORT': '/SL-B.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=B/1', PIPE: 'ASIM-1885-PL-6"-M8810131-01' });
  const result = runSupportRevisionCompare(table([a, b]), table([b, a]));
  assert.equal(result.stage, 'READY_TO_EXPORT');
  assert.equal(result.ledger.events.filter((event) => event.remarkEligible).length, 0);
  assert.ok(!types(result).includes('SUPPORT_LOCATION_ADDED'));
  assert.ok(!types(result).includes('SUPPORT_LOCATION_REMOVED'));
}

// Common support is structural: one location replicated to two distinct family/ref/coordinate locations.
{
  const source = row({ 'PREV NAME': 'PS02382', CIVILSECONDARYSUPPORT: 'SL-161', 'PIPING PRIMARY SUPPORT': '/SL-161.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=CS/1', 'EAST/WEST': 'E 1000', 'NORTH/SOUTH': 'N 2000' });
  const targetA = row({ 'PREV NAME': 'PS02382', CIVILSECONDARYSUPPORT: 'SL-161', REVISION: '2', 'PIPING PRIMARY SUPPORT': '/SL-161.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=CS/1', 'EAST/WEST': 'E 1000', 'NORTH/SOUTH': 'N 2000' });
  const targetB = row({ 'PREV NAME': 'PS02382', CIVILSECONDARYSUPPORT: 'SL-162', REVISION: '2', 'PIPING PRIMARY SUPPORT': '/SL-162.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=CS/2', 'EAST/WEST': 'E 1500', 'NORTH/SOUTH': 'N 2500' });
  const result = runSupportRevisionCompare(table([source]), table([targetA, targetB]));
  assert.equal(result.lineage.targetClusters.length, 1);
  assert.equal(result.lineage.targetClusters[0].classification, 'CROSS_FAMILY_COMMON_SUPPORT');
  assert.equal(result.lineage.edges.find((edge) => edge.cardinality === '1->N')?.matchingMethod, 'common-support-graph');
  assert.ok(types(result).includes('COMMON_SUPPORT_REPLICATED'));
  assert.match(targetRemark(result, 'SL-162'), /Replicated due to Common support/);
}

// Negative control: duplicate PREV NAME alone cannot create a common-support topology event.
{
  const source = row({ 'PREV NAME': 'PS-DUP', CIVILSECONDARYSUPPORT: 'SL-DUP', 'PIPING PRIMARY SUPPORT REFERENCE': '=D/1' });
  const targetA = row({ 'PREV NAME': 'PS-DUP', CIVILSECONDARYSUPPORT: 'SL-DUP', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=D/1' });
  const targetB = row({ 'PREV NAME': 'PS-DUP', CIVILSECONDARYSUPPORT: 'SL-DUP', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=D/1' });
  const result = runSupportRevisionCompare(table([source]), table([targetA, targetB]));
  assert.equal(result.lineage.targetClusters.length, 0);
  assert.ok(!types(result).includes('COMMON_SUPPORT_REPLICATED'));
}

// Direction/sign formatting normalizes before relocation classification.
{
  assert.equal(parseEngineeringCoordinate('N 1124807', 'Y').directedMm, parseEngineeringCoordinate('N -1124807', 'Y').directedMm);
  const before = row({ CIVILSECONDARYSUPPORT: 'SL-N', 'PREV NAME': 'PS-N', 'PIPING PRIMARY SUPPORT REFERENCE': '=N/1', 'NORTH/SOUTH': 'N 1124807' });
  const after = row({ CIVILSECONDARYSUPPORT: 'SL-N', 'PREV NAME': 'PS-N', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=N/1', 'NORTH/SOUTH': 'N -1124807' });
  const result = runSupportRevisionCompare(table([before]), table([after]));
  assert.ok(!types(result).includes('COMMON_SUPPORT_ANCHOR_RELOCATED'));
  assert.ok(!Object.values(result.remarks.targetRemarks).some((item) => /Support Relocated/.test(item.remark)));
}

// Removal without successor and proven replacement project different, deterministic tombstone/successor remarks.
{
  const removed = row({ CIVILSECONDARYSUPPORT: 'SL-OLD', 'PREV NAME': 'PS-OLD', 'PIPING PRIMARY SUPPORT': '/SL-OLD.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=OLD/1' });
  const unrelated = row({ CIVILSECONDARYSUPPORT: 'SL-OTHER', 'PREV NAME': 'PS-OTHER', REVISION: '2', PIPE: 'ASIM-1885-PL-10"-Z9999999-01', 'PIPING PRIMARY SUPPORT': '/SL-OTHER.1', 'PIPING PRIMARY SUPPORT REFERENCE': '=OTHER/1' });
  const invalid = runSupportRevisionCompare(table([removed]), table([unrelated]));
  assert.equal(sourceRemark(invalid, 'SL-OLD'), 'Invalid Support, This pipe no longer supported');

  const replacement = row({ CIVILSECONDARYSUPPORT: 'SL-NEW', 'PREV NAME': 'PS-OLD', REVISION: '2', 'PIPING PRIMARY SUPPORT': '/SL-NEW.7', 'PIPING PRIMARY SUPPORT REFERENCE': '=OLD/1' });
  const replaced = runSupportRevisionCompare(table([removed]), table([replacement]));
  assert.match(sourceRemark(replaced, 'SL-OLD'), /Invalid Support, replaced by SL-NEW/);
  assert.match(targetRemark(replaced, 'SL-NEW'), /PS No\.\/Line No\. Change Earlier:SL-OLD\(=OLD\/1\)/);
}

// Remarks are an output oracle only. Poisoning target REMARKS/Hold text cannot change comparison truth or generate Hold automation.
{
  const before = row({ CIVILSECONDARYSUPPORT: 'SL-H', 'PREV NAME': 'PS-H', 'PIPING PRIMARY SUPPORT REFERENCE': '=H/1', 'Fx#1': '1', 'Fy#1': '2', 'Fz#1': '3', 'Fx#2': '4', 'Fy#2': '5', 'Fz#2': '6' });
  const cleanTarget = row({ CIVILSECONDARYSUPPORT: 'SL-H', 'PREV NAME': 'PS-H', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=H/1', 'Fx#1': '1', 'Fy#1': '99', 'Fz#1': '3', 'Fx#2': '4', 'Fy#2': '5', 'Fz#2': '6', 'REMARKS (IF ANY)': '' });
  const poisonedTarget = row({ CIVILSECONDARYSUPPORT: 'SL-H', 'PREV NAME': 'PS-H', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=H/1', 'Fx#1': '1', 'Fy#1': '99', 'Fz#1': '3', 'Fx#2': '4', 'Fy#2': '5', 'Fz#2': '6', 'REMARKS (IF ANY)': 'Support Hold, THIS EXPECTED REMARK MUST NOT DRIVE TRUTH' });
  const a = runSupportRevisionCompare(table([before]), table([cleanTarget]));
  const b = runSupportRevisionCompare(table([before]), table([poisonedTarget]));
  assert.deepEqual(types(a), types(b));
  assert.deepEqual(a.ledger.events.map((event) => event.normalizedState), b.ledger.events.map((event) => event.normalizedState));
  assert.ok(!types(b).some((type) => /HOLD/i.test(type)));
  assert.ok(!Object.values(b.remarks.targetRemarks).some((item) => /Hold/i.test(item.remark)));
  assert.equal(targetRemark(b, 'SL-H'), 'Minor Load change');
}

// Every projected remark token traces through event/lineage/XML back to a source row/cell evidence bundle.
{
  const before = row({ CIVILSECONDARYSUPPORT: 'SL-T', 'PREV NAME': 'PS-T', 'PIPING PRIMARY SUPPORT REFERENCE': '=T/1' });
  const after = row({ CIVILSECONDARYSUPPORT: 'SL-T', 'PREV NAME': 'PS-T', REVISION: '2', 'PIPING PRIMARY SUPPORT REFERENCE': '=T/1', 'Fx#1': '10', 'Fy#1': '20', 'Fz#1': '30' });
  const result = runSupportRevisionCompare(table([before]), table([after]));
  assert.ok(result.remarks.trace.length > 0);
  for (const trace of result.remarks.trace) {
    const event = result.ledger.events.find((item) => item.eventId === trace.eventId);
    assert.ok(event, trace.eventId);
    assert.ok(trace.sourceXmlNode || trace.targetXmlNode);
    assert.ok(event.sourceCsvRowId || event.targetCsvRowId);
    assert.ok(event.lineageEdgeId || event.type === 'SUPPORT_LOCATION_REMOVED');
    assert.ok(event.trace);
  }
  const loadEvent = result.ledger.events.find((event) => event.type === 'LOAD_BECAME_NUMERIC');
  assert.ok(loadEvent.trace.targetCells.some((ref) => /:(Fx|Fy|Fz)(?:__\d+)?$/.test(ref)));
}

console.log('csv-rev-compare-xml-based.test.js: all checks passed');