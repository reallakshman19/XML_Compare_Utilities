import assert from 'node:assert/strict';
import { buildCiiCompareReviewModel } from '../tabs/cii-workspace/cii-workspace-compare-review.js';
import { bulkAcceptCiiMultiSourceReview, ciiMultiSourceReviewMarkup } from '../tabs/cii-workspace/cii-workspace-multisource-review-ui.js';

function edgeEvidence(confidence = 'HIGH') {
  return {
    identityConfidence: confidence,
    identitySupported: confidence === 'HIGH',
    methods: {
      m1Spatial: { pass: true, available: true, score: 100 },
      m2Network: { pass: true, available: true, score: 90, threshold: 55 },
    },
    odConfidence: { confidence: 'HIGH', percentError: 0 },
  };
}
function modelFor(row) {
  return buildCiiCompareReviewModel(
    { fileName: 'S.CII', summary: { nodeCount: 3, elementCount: 2 } },
    { fileName: 'T.CII', summary: { nodeCount: 3, elementCount: 2 } },
    { status: 'READY', nodeRows: [row], elementRows: [], componentRows: [] },
    { reviewedCorrespondenceIds: [], lockedCorrespondenceIds: [], rejectedCorrespondenceIds: [] },
    { rows: [], summary: {}, limitations: [] },
  );
}

const boundary = modelFor({
  correspondenceId: 'node:340:10260', kind: 'NODE', sourceNodeId: '340', targetNodeId: '10260',
  status: 'HIGH', authority: 'ADJACENT_MATCH_BOUNDARY',
  evidence: { leftElement: edgeEvidence(), rightElement: edgeEvidence() },
}).rows[0];
assert.equal(boundary.confidence, 'HIGH');
assert.equal(boundary.identityBound, true);
assert.equal(boundary.identityEvidenceBasis, 'ADJACENT_EDGE_CONSENSUS');
assert.equal(boundary.adjacentBoundary.highCount, 2);
assert.equal(boundary.methodA, null, 'node boundary must not pretend one adjacent edge is direct node M1 evidence');
assert.equal(boundary.methodB, null, 'node boundary must not pretend one adjacent edge is direct node M2 evidence');

const preview = { compareReview: { rows: [{ ...boundary, sourceId: 'S2', memberCorrespondenceId: 'node:340:10260' }] } };
const markup = ciiMultiSourceReviewMarkup(preview, new Map());
assert.match(markup, /ADJACENT CONSENSUS · 2\/2 HIGH/);
assert.match(markup, /LEFT HIGH · M1 PASS · M2 PASS · OD HIGH 0%/);
assert.match(markup, /RIGHT HIGH · M1 PASS · M2 PASS · OD HIGH 0%/);
assert.match(markup, /this NODE is their shared boundary/);
assert.doesNotMatch(markup, /RED · 0\/0/);
assert.doesNotMatch(markup, /independent M1 and M2 identity evidence agree and OD error is &lt;10%/);
const accepted = new Map();
assert.equal(bulkAcceptCiiMultiSourceReview(preview, accepted, 'HIGH'), 1);
assert.equal(accepted.get(boundary.correspondenceId), 'ACCEPT');

const unsupported = modelFor({
  correspondenceId: 'node:999:1999', kind: 'NODE', sourceNodeId: '999', targetNodeId: '1999',
  status: 'HIGH', authority: 'STATUS_ONLY_LEGACY_FIXTURE', evidence: {},
}).rows[0];
assert.equal(unsupported.confidence, 'REVIEW', 'bare workflow HIGH must not become review HIGH without recognized evidence');
assert.equal(unsupported.identityBound, false, 'bare workflow HIGH must not become review BOUND without recognized evidence');
const unsupportedPreview = { compareReview: { rows: [{ ...unsupported, sourceId: 'S1', memberCorrespondenceId: 'node:999:1999' }] } };
assert.equal(bulkAcceptCiiMultiSourceReview(unsupportedPreview, new Map(), 'HIGH'), 0);

console.log('CII adjacent-boundary review evidence checks: PASS');
