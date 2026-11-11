# PR #103 Work Report: Method A Tolerance / Scoring & AUTO/MANUAL Reconciled Review

## Mission & Scope
- **PR Number**: #103
- **Branch**: `integration/cii-102-tolerance-score-f2-20261015`
- **Head SHA**: `800cfceb6039ad65993ada3574f1f6b064b1cd22`
- **Scope**: Primary product implementation PR for Issue #102 and Issue #69 Phase 2. Integrates 100/200mm spatial tolerance, configurable Method A scoring weights, canonical F2 Worker shadow, and AUTO/MANUAL coexistence in Compare Review.
- **Status**: DRAFT (Controlled integration qualification, non-writing, non-merging).

## Mathematical Issue Solved
1. **Method A Spatial Base Scoring & Conditioning**:
   - Method A calculates an overall quality score $S \in [0, 100]$ composed of residual quality (35 pts), conditioning (25 pts), spatial extent (20 pts), redundancy (10 pts), and basis consensus (10 pts).
   - Conditioning reflects the 3D angular dispersion of anchor vectors. In S2, anchor vectors span 3 orthogonal planes, achieving 25.0 conditioning and a 100.00 score (HIGH). In S1 (planar, 6.24 conditioning) and S3 (near-collinear, 0.01 conditioning), scores were 81.21 and 74.98.
   - The fixed default threshold of 85.0 caused S1 and S3 to drop to MEDIUM despite sub-millimeter geometric residuals (0.57mm in S1, 0.35mm in S3).
   - Solved by implementing configurable thresholds (`resolveCiiMethodAConfidenceThresholds`) and tunable weight policies (`resolveCiiMethodAConfidenceWeights`), allowing promotion to HIGH without falsifying geometry.
2. **M1 Candidate Distance Scoring (100mm vs 200mm)**:
   - Candidate ranking distance decay parameterized by `spatialToleranceMm`:
     $$S_{M1}(d) = 100 \times \left(1 - \frac{d}{T_{\text{spatial}}}\right)$$
   - At 200mm, candidate scores improve on non-zero distance pairs (verified on 23 element pairs in `tests/cii-workspace-method-a-m1-spatial-tolerance-original.test.js`) without relaxing rigid outer OD admission.

## Propagation & Coexistence Logic
1. **Root Cause of Member Collapse**:
   - In previous iterations, setting manual anchors for a member (e.g. S2 or S3) caused `buildCiiMultiSourceActiveAuthorityPlan` to omit `baseLoopsBySource`, erasing Method A base loops.
   - Manual seeds failed to propagate across all branches (`SOURCE_COMPONENT_NOT_FULLY_PROPAGATED`), setting correspondence status to `UNRESOLVED`.
   - `arbitrateCiiLoopCorrespondences` discarded non-READY loops, causing S2 and S3 bound nodes to collapse from 70 to 3, dropping total workspace bound nodes from 105 to 38.
2. **Dual-Replay Coexistence Architecture**:
   - Run baseline `auto` preview retaining all 10 Method A base loops (105 bound nodes).
   - Run `active` preview with manual assertions.
   - Reconcile via `buildCiiReconciledAuthorityReview`:
     - Localize disputed pairs (`S2:420 -> 415 vs 10330` and `S3:1580 -> 7880 vs 8895`) as `MANUAL_AUTO_CONFLICT`.
     - Preserve non-disputed nodes (103 nodes) as `BOUND`.
     - Project canonical F2 physical path witnesses per visible alternative.

## Modules Updated
- `tabs/cii-workspace/cii-workspace-method-a-confidence-config.js`: Configurable thresholds and weight resolution.
- `tabs/cii-workspace/cii-workspace-method-a-weight-policy-ui.js`: Interactive UI controls, transaction handling, and stale review invalidation.
- `tabs/cii-workspace/cii-workspace-geometry.js`: 100/200mm M1 spatial candidate distance scoring.
- `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`: Reconciled authority review, physical evidence qualification, and markup rendering.
- `tabs/cii-workspace/cii-workspace-f2-canonical-shadow.js`: Isomorphic browser+Node canonical F2 Worker for physical witness tracing.
- `tabs/cii-workspace/cii-workspace-multisource-preview.js` & `cii-workspace-source-set.js`: Dual-replay session projection and caching.

## Validation State
- `tests/cii-102-reconciled-authority-review.test.mjs`: PASS
- `tests/cii-workspace-method-a-m1-spatial-tolerance-original.test.js`: PASS
- `tests/cii-arch01-f2-method-a-score-propagation.test.js`: PASS
- `tests/cii-workspace-method-a-confidence-config.test.js`: PASS
- `tests/cii-workspace-method-a-weight-policy-ui.test.js`: PASS
- `tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js`: PASS

## Exact Next Action
Maintain PR #103 as the single primary implementation PR. PR #70 remains the independent benchmark oracle. Retire PR #97 and PR #98 after parity check.
