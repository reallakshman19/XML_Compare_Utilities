import assert from 'node:assert/strict';
import { ciiMultiSourceReviewMarkup } from '../tabs/cii-workspace/cii-workspace-multisource-review-ui.js';
import {
  CII_METHOD_A_CONFIDENCE_DEFAULTS,
  qualifyCiiGeometryTransform,
  resolveCiiMethodAConfidenceThresholds,
} from '../tabs/cii-workspace/cii-workspace-geometry.js';
import {
  getCiiMultiSourceMethodAConfidenceOptions,
  setCiiMultiSourceMethodAConfidenceThresholds,
  _test as sourceSetTest,
} from '../tabs/cii-workspace/cii-workspace-source-set.js';

const point = (x, y, z) => ({ x, y, z });
const anchors = [[0, 0, 0], [10000, 0, 0], [2000, 800, 0]].map(([x, y, z]) => ({
  source: point(x, y, z), target: point(x + 50, y + 100, z), sourceOdMm: 100,
}));
const baseline = qualifyCiiGeometryTransform(anchors);
assert.equal(baseline.status, 'READY');
assert.equal(baseline.confidence, 'MEDIUM');
assert.deepEqual(baseline.weight.confidenceThresholds, { high: 85, medium: 70 });
assert(baseline.weight.total >= 75 && baseline.weight.total < 85);

const tuned = qualifyCiiGeometryTransform(anchors, { methodAHighConfidenceThreshold: 75 });
assert.equal(tuned.status, 'READY');
assert.equal(tuned.confidence, 'HIGH');
assert.equal(tuned.weight.total, baseline.weight.total, 'threshold must not change physical evidence');
assert.equal(tuned.weight.confidenceThresholds.high, 75);
assert.equal(tuned.maxNormalizedResidual, baseline.maxNormalizedResidual);
assert.deepEqual(resolveCiiMethodAConfidenceThresholds({
  methodAHighConfidenceThreshold: 60, methodAMediumConfidenceThreshold: 70,
}), CII_METHOD_A_CONFIDENCE_DEFAULTS, 'overlapping thresholds must fail closed');

const saved = getCiiMultiSourceMethodAConfidenceOptions();
try {
  const current = setCiiMultiSourceMethodAConfidenceThresholds({ high: 75, medium: 65 });
  assert.deepEqual(current, { high: 75, medium: 65 });
  const inspection = sourceSetTest.sourceSetInspectionOptions({ cryptoRef: 'test' });
  assert.equal(inspection.methodAHighConfidenceThreshold, 75);
  assert.equal(inspection.methodAMediumConfidenceThreshold, 65);
  assert.equal(sourceSetTest.sourceSetInspectionOptions({ methodAHighConfidenceThreshold: 90 }).methodAHighConfidenceThreshold, 90);
} finally {
  setCiiMultiSourceMethodAConfidenceThresholds({
    high: saved.methodAHighConfidenceThreshold, medium: saved.methodAMediumConfidenceThreshold,
  });
}
const reviewMarkup = ciiMultiSourceReviewMarkup({
  compareReview: { rows: [{
    correspondenceId: 'S1-4410-970', sourceId: 'S1', kind: 'NODE',
    source: '4410', target: '970', confidence: 'MEDIUM',
    identityBound: true, workflowStatus: 'REVIEW', decision: 'REVIEW',
    methodABase: { score: baseline.weight.total, anchorCount: 10,
      highThreshold: 85, mediumThreshold: 70,
      residualQuality: baseline.weight.residualQuality, conditioning: baseline.weight.conditioning,
      spatialExtent: baseline.weight.spatialExtent, redundancy: baseline.weight.redundancy,
      basisConsensus: baseline.weight.basisConsensus },
  }] },
}, new Map());
assert.match(reviewMarkup, /METHOD A BASE/);
assert.match(reviewMarkup, /HIGH ≥ 85/);
assert.match(reviewMarkup, /residual/);
assert.doesNotMatch(reviewMarkup, /RED · 0\/0/, 'missing direct M1\/M2 evidence must not obscure qualified Method A score');

console.log('CII Method A configurable confidence thresholds: PASS');
