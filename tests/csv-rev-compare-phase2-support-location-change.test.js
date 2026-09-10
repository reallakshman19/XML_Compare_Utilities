import assert from 'node:assert/strict';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { runSupportLocationChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase2-benchmark.js';

const HEADERS = [
  'PREV NAME', 'SCOPE', 'CIVILSECONDARYSUPPORT', 'PIPE', 'SIZE',
  'EAST/WEST', 'NORTH/SOUTH', 'BOP ELEVATION',
  'PIPING PRIMARY SUPPORT', 'SUPPORT TYPE', 'PIPING PRIMARY SUPPORT REFERENCE',
  'REVISION', 'REMARKS (IF ANY)',
];

function row(index, revision, patch = {}) {
  return {
    'PREV NAME': `PS-${100 + index}`,
    SCOPE: 'MODEL',
    CIVILSECONDARYSUPPORT: `SL-${100 + index}`,
    PIPE: `AREA-01-MODEL-6-W${100 + index}-A1-1`,
    SIZE: '6',
    'EAST/WEST': `E ${1000 + (index * 100)}`,
    'NORTH/SOUTH': `N ${2000 + (index * 100)}`,
    'BOP ELEVATION': `${3000 + (index * 100)}`,
    'PIPING PRIMARY SUPPORT': `/PS-${100 + index}.1`,
    'SUPPORT TYPE': 'GUIDE',
    'PIPING PRIMARY SUPPORT REFERENCE': `=${100000 + index}/1`,
    REVISION: String(revision),
    'REMARKS (IF ANY)': '',
    ...patch,
  };
}

function csv(rows) {
  return [HEADERS, ...rows.map((item) => HEADERS.map((header) => item[header] ?? ''))]
    .map((cells) => cells.map(csvCell).join(','))
    .join('\n');
}
function csvCell(value) { const text = String(value); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function relocationEvents(result) { return (result?.ledger?.events || []).filter((event) => ['SUPPORT_LOCATION_RELOCATED', 'COMMON_SUPPORT_ANCHOR_RELOCATED'].includes(event.type)); }

{
  const earlierRows = [1, 2, 3, 4].map((index) => row(index, 2));
  const laterRows = [1, 2, 3, 4].map((index) => row(index, 3));
  laterRows[3]['EAST/WEST'] = 'E 1800';
  const result = runSupportRevisionCompare(csv(earlierRows), csv(laterRows));
  assert.equal(result.ok, true);
  assert.equal(result.lineage.coordinateFrame.scoreFrameUsable, true);
  assert.ok(Object.values(result.lineage.coordinateFrame.axes).filter((axis) => axis.status === 'VALIDATED').length >= 2);
  const events = relocationEvents(result);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'SUPPORT_LOCATION_RELOCATED');
  assert.equal(events[0].coordinateResidual.classification, 'ACTUAL_POSITION_CHANGED');
  assert.ok(events[0].reasonCodes.includes('TRUSTED_COORDINATE_FRAME'));
  assert.ok(events[0].reasonCodes.includes('NORMALIZED_POSITION_CHANGED'));
  const rendered = Object.values(result.remarks.targetRemarks).filter((item) => item.remark.includes('Relocated Support'));
  assert.equal(rendered.length, 1);
}

{
  const earlierRows = [1, 2, 3, 4].map((index) => row(index, 2));
  const laterRows = [1, 2, 3, 4].map((index) => row(index, 3));
  laterRows[1]['NORTH/SOUTH'] = `N -${2200}`;
  const result = runSupportRevisionCompare(csv(earlierRows), csv(laterRows));
  assert.equal(result.ok, true);
  assert.equal(relocationEvents(result).length, 0, 'raw sign/format change alone must not trigger relocation');
  const edge = result.lineage.edges.find((item) => item.targetNodeIds.some((id) => result.targetModel.locationByNodeId.get(id)?.family === 'SL-102'));
  assert.equal(edge.coordinateEvidence[0].classification, 'FORMAT_CHANGED');
}

{
  const earlierRows = [1, 2].map((index) => row(index, 2));
  const laterRows = [1, 2].map((index) => row(index, 3));
  laterRows[1]['EAST/WEST'] = 'E 1900';
  const result = runSupportRevisionCompare(csv(earlierRows), csv(laterRows));
  assert.equal(result.ok, true);
  assert.equal(result.lineage.coordinateFrame.scoreFrameUsable, false);
  assert.equal(relocationEvents(result).length, 0, 'movement under an under-anchored frame must remain audit-only');
}

{
  const earlierRows = [1, 2, 3, 4].map((index) => row(index, 2));
  const laterRows = [1, 2, 3, 4].map((index) => row(index, 3));
  laterRows[3]['EAST/WEST'] = 'E 1800';
  laterRows[3]['REMARKS (IF ANY)'] = 'Support location change';
  const benchmark = runSupportLocationChangeBenchmark(csv(earlierRows), csv(laterRows));
  assert.equal(benchmark.metrics.expected, 1);
  assert.equal(benchmark.metrics.detected, 1);
  assert.equal(benchmark.metrics.truePositives, 1);
  assert.equal(benchmark.metrics.falsePositives, 0);
  assert.equal(benchmark.metrics.falseNegatives, 0);
  assert.equal(benchmark.phase1Guard.metrics.falsePositives, 0);
  assert.equal(benchmark.phase1Guard.metrics.falseNegatives, 0);
}

console.log('csv-rev-compare Phase 2 support-location-change tests: PASS');
