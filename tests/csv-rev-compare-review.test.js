import assert from 'node:assert/strict';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';

const headers = ['PREV NAME','CIVILSECONDARYSUPPORT','PIPE','PIPING PRIMARY SUPPORT','SUPPORT TYPE','PIPING PRIMARY SUPPORT REFERENCE','EAST/WEST','NORTH/SOUTH','BOP ELEVATION','REMARKS (IF ANY)','Fx','Fy','Fz'];
const csv = (rows) => [headers, ...rows].map((row) => row.map((value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}).join(',')).join('\n');
const r = (family, ref, revision = '1') => ['PS-AMB', family, 'ASIM-1885-PL-4"-M8810130-02', `/${family}.1`, 'REST-50', ref, 'E 1000', 'N 2000', '3000', '', '1', '2', '3'];

// Duplicate target evidence with the same persistent reference is deliberately
// ambiguous; no highest-score auto-selection is permitted.
const rev1 = csv([r('SL-AMB', '=AMB/1')]);
const rev2 = csv([r('SL-AMB', '=AMB/1', '2'), r('SL-AMB', '=AMB/1', '2')]);
const pending = runSupportRevisionCompare(rev1, rev2);
assert.equal(pending.stage, 'REVIEW_REQUIRED');
assert.equal(pending.ok, false);
assert.ok(pending.lineage.ambiguous.length >= 2);
assert.equal(pending.lineage.edges.some((edge) => edge.sourceNodeIds.includes(pending.sourceModel.locations[0].nodeId)), false);

const chosen = pending.lineage.ambiguous[0];
const reviewed = runSupportRevisionCompare(rev1, rev2, { reviewDecisions: [{ sourceNodeId: chosen.sourceNodeId, targetNodeId: chosen.targetNodeId, action: 'approve' }] });
assert.equal(reviewed.stage, 'READY_TO_EXPORT');
assert.equal(reviewed.ok, true);
const manualEdge = reviewed.lineage.edges.find((edge) => edge.matchingMethod === 'manual-review');
assert.ok(manualEdge);
assert.deepEqual(manualEdge.candidateIds, [chosen.candidateId]);
assert.equal(manualEdge.reviewDecision, 'APPROVED');
assert.equal(reviewed.lineage.reviewDecisions[0].action, 'approve');
assert.equal(reviewed.lineage.added.length, 1, 'the unselected duplicate target remains a distinct added location');

console.log('csv-rev-compare-review.test.js: all checks passed');
