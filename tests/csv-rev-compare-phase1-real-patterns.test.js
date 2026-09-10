import assert from 'node:assert/strict';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';

const H = [
  'PREV NAME', 'CIVILSECONDARYSUPPORT', 'PIPE',
  'PIPING PRIMARY SUPPORT', 'SUPPORT TYPE', 'PIPING PRIMARY SUPPORT REFERENCE',
  'EAST/WEST', 'NORTH/SOUTH', 'BOP ELEVATION', 'REMARKS (IF ANY)',
];

function row({ prev = '', civil, pipe, members, types, refs, x, y, z = 'U 100652mm', remarks = '' }) {
  return [prev, civil, pipe, members, types, refs, x, y, z, remarks];
}
function csv(rows) {
  return [H, ...rows].map((cells) => cells.map((value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(',')).join('\n');
}
function targetRemark(result) {
  const target = result.targetModel.locations[0];
  return result.remarks.targetRemarks[target.sourceRowId]?.remark || '';
}

// Real R2/R3 false-positive pattern: the target has an exact Civil+PIPE
// predecessor and a different-Civil predecessor carrying its current component
// references. Location identity wins; component-reference reassignment must not
// manufacture a PS-number change.
{
  const pipe = 'BWGA-1000-2"-P8310007-253461P1-01';
  const rev2 = csv([
    row({
      prev: 'PS-111049.3', civil: 'SL-111050(REF)', pipe,
      members: '/SL-111050.1,/SL-111050.2', types: 'REST-50,GUIDE-50', refs: '=67133210/585,=67133210/586',
      x: 'E 182105.106 mm', y: 'N 98532.482 mm',
    }),
    row({
      prev: 'PS-111051.3', civil: 'SL-111052(REF)', pipe,
      members: '/SL-111052.1,/SL-111052.2', types: 'REST-50,GUIDE-50', refs: '=67133210/580,=67133210/581',
      x: 'E 176905.106 mm', y: 'N 98532.482 mm',
    }),
  ]);
  const rev3 = csv([
    row({
      prev: 'PS-111051.3', civil: 'SL-111050(REF)', pipe,
      members: '/SL-111050.1,/SL-111050.2', types: 'REST-50,GUIDE-50', refs: '=67133210/580,=67133210/581',
      x: 'E 181105 mm', y: 'N 98532 mm',
    }),
  ]);
  const result = runSupportRevisionCompare(rev2, rev3);
  const target = result.targetModel.locations[0];
  const edge = result.lineage.edges.find((candidate) => candidate.targetNodeIds.includes(target.nodeId));
  const source = result.sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]);
  assert.equal(edge.matchingMethod, 'civil-pipe-location-identity');
  assert.equal(source.family, 'SL-111050(REF)');
  assert.ok(!result.ledger.events.some((event) => event.type === 'SECONDARY_SUPPORT_FAMILY_CHANGED' && event.targetXmlNode === target.nodeId));
  assert.ok(!/\b(?:PS\s*No\.|Line\s*No\.)\s*(?:\/\s*Line\s*No\.\s*)?Change\b/i.test(targetRemark(result)));
}

// Real false-negative pattern: same Civil support, changed line/PIPE, and two
// persistent components survive. This is deterministic fallback lineage and
// produces the Phase 1 line-number-change token without consulting R3 remarks.
{
  const oldPipe = '8"-P-1110XXX-METALLIC';
  const newPipe = 'BWGA-1000-FL-8"-M1610003-(FL-07)';
  const rev2 = csv([
    row({
      civil: 'SL-111001(REF)', pipe: oldPipe,
      members: '/SL-111001.1,/SL-111001.2,/SL-111001.3', types: 'REST-200,GUIDE-200,STOP-200',
      refs: '=67133218/20,=67133218/21,=67141410/11', x: 'E 187110.232mm', y: 'N 103000.648mm', z: 'U 100656.05mm',
    }),
  ]);
  const rev3 = csv([
    row({
      prev: 'SL-111001.1', civil: 'SL-111001(REF)', pipe: newPipe,
      members: '/SL-111001.1,/SL-111001.4,/SL-111001.3', types: 'REST-200,GUIDE-200,STOP-200',
      refs: '=67133218/20,=67133218/27,=67141410/11', x: 'E 187114mm', y: 'N 103001mm', z: 'U 100547mm',
    }),
  ]);
  const result = runSupportRevisionCompare(rev2, rev3);
  assert.equal(result.stage, 'READY_TO_EXPORT');
  const target = result.targetModel.locations[0];
  const edge = result.lineage.edges.find((candidate) => candidate.targetNodeIds.includes(target.nodeId));
  assert.equal(edge.matchingMethod, 'persistent-reference-overlap');
  assert.equal(edge.outcome, 'DETERMINISTIC');
  const pipeEvent = result.ledger.events.find((event) => event.type === 'PIPE_IDENTITY_CHANGED');
  assert.equal(pipeEvent.remarkEligible, true);
  assert.equal(pipeEvent.normalizedState.projection, 'LINE_NUMBER_CHANGE');
  assert.match(targetRemark(result), /Line No\. Change\(Old Line No\. 8"-P-1110XXX-METALLIC\)/);
}

console.log('csv-rev-compare-phase1-real-patterns.test.js: all checks passed');
