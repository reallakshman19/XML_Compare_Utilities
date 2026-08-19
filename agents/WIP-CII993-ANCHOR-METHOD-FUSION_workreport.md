# WIP CII993 — Base Anchor Method A/B discovery and fusion

## Recovery Header

```text
HANDOVER_READINESS: IN_PROGRESS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — method-qualified Base Anchor suggestions
BRANCH: agent/cii-base-anchor-method-fusion
BASE: main@d28e33c1b4fd4facf559c218a36367149e270777
MUTATION_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: IMPLEMENT / VALIDATE
GROUNDING_EPOCH: GE-002 / 2026-08-19
```

## Handover in 60 Seconds

PR994 qualified Method A/B mathematics. PR995 connected explicit independent A/B base loops to workspace correspondence. PR996-in-progress now upgrades Base Anchor suggestions from Method-B-only labels to independent Method A discovery plus A/B fusion.

The important authority correction is that Method A is **not restricted to the structural mutual-best winner**. Structural evidence generates a bounded bidirectionally plausible candidate pool; local rigid registration then independently selects spatially consistent source-target pairs. A spatially proven structural runner-up can therefore surface as `METHOD_A_SPATIAL`. Method B still requires the existing structural mutual-best gate and two independent pipe runs.

## Ground truth

- live main at GE-002: `d28e33c1b4fd4facf559c218a36367149e270777`
- predecessor PR995: merged by squash at that SHA
- branch: `agent/cii-base-anchor-method-fusion`
- source task: Issue #993
- coordination: SAFE; no active CII anchor-discovery/fusion PR found
- merge authority: OWNER_ONLY

## Mission

Every Base Anchor suggestion shall expose an evidence-derived basis label:

```text
METHOD_A_SPATIAL
METHOD_B_NETWORK
METHOD_A_AND_B
LANDMARK_ONLY
```

Method A qualification requires membership in at least one READY non-collinear local spatial base. A single point must never be labelled Method A.

## Implemented architecture

```text
structural/landmark evidence
       ↓ candidate generation only
bounded forward top-N + reverse top-N plausible pairs
       ↓
one-to-one non-collinear triplet seeds
       ↓
PR994 rigid registration qualification
       ↓
all pairs tested against the seed transform with x*SOURCE_OD tolerance
       ↓
unique minimum-residual candidate per SOURCE
AND unique minimum-residual candidate per TARGET
       ↓
mutual spatial winners
       ↓
re-qualify complete local base with PR994 multi-basis consistency
       ↓
READY independent Method-A bases
       ↓
map base membership back to pair suggestions

public suggestion pool:
  structural mutual-best candidates
        OR
  pairs independently surfaced by READY Method A bases

per pair:
  Method A evidence
        OR
  qualified Method B evidence
        ↓
METHOD_A / METHOD_B / METHOD_A_AND_B / LANDMARK_ONLY
```

## Implemented production behavior

### `cii-workspace-anchor-method-a.js`

- default bounded Method-A seed-pair limit: 12;
- default returned base limit: 24;
- seed triplets must be one-to-one in SOURCE and TARGET;
- seed qualification reuses `qualifyCiiGeometryTransform()` from PR994;
- expansion tolerance remains `x * SOURCE_OD`, default `x=2`;
- transform-compatible candidate does not automatically join a base: it must be the unique lowest normalized residual claim for both its SOURCE and TARGET identity;
- equal residual ties within configurable normalized tolerance (`1e-9` default) are excluded rather than resolved by score/order;
- expanded base is re-qualified by PR994, so conflicting admissible basis hypotheses remain `METHOD_A_AMBIGUOUS_BASES` and do not become a discovered READY base;
- a 3-pair base can mathematically establish rigid registration, but automatic suggestion confidence is capped at REVIEW until at least one independent validation pair exists (`methodAAutoConfidenceMinAnchorCount=4` default);
- local bases retain their own rotation/translation and are never globally averaged.

### `cii-workspace-anchor-suggestions.js`

- existing structural score remains candidate-generation evidence only;
- Method-A candidate pool defaults to top 3 forward candidates and reverse top 3 plausibility, both configurable;
- structural mutual-best candidates remain visible even when Method A rejects them;
- a non-mutual structural runner-up may become visible only if READY Method-A base membership independently proves it;
- Method B may report local run diagnostics for any surfaced pair, but it earns Method-B basis authority only for the structural mutual-best candidate;
- pair label is derived from independently qualified evidence:

```text
A READY + qualified B READY   -> METHOD_A_AND_B
A READY only                  -> METHOD_A_SPATIAL
qualified B READY only        -> METHOD_B_NETWORK
neither                       -> LANDMARK_ONLY
```

- A+B scores are not added. Suggestion confidence is the strongest independently qualified method; corroboration remains explicit.

## Hard invariants

- topology/landmark score is candidate generation, not Method-A authority;
- Method A requires >=3 non-collinear source-target pairs and PR994 OD-scaled qualification;
- automatically discovered 3-pair A bases are REVIEW-capped until a fourth pair validates the transform;
- Method B retains minimum two-independent-run gate, mutual-best gate and existing weight model;
- OD remains tolerance-scale only and TARGET OD has no identity authority;
- node-number offset and WT remain excluded from identity;
- no A+B score summation;
- same source/target conflicts remain fail-closed in PR995 downstream orchestration;
- no UI, Writer, transfer, parser, PR994 math or PR995 correspondence arbitration changes in this increment.

## Focused regressions authored

`tests/cii-workspace-base-anchor-method-fusion.test.js` covers:

1. 4-point rigid Method-A base -> HIGH with one validation anchor;
2. 3-point rigid base -> Method A mathematically READY but automatic confidence REVIEW;
3. two independent 4-point regions with different translations -> both local HIGH bases, no HIGH mixed/global base;
4. public suggestion labels for A-only / A+B / B-only / LANDMARK_ONLY;
5. structural decoy vs spatial runner-up: topology rank-1 decoy stays visible, while topology rank-2 true pair is independently surfaced by the 4-point Method-A base as `METHOD_A_SPATIAL`; non-mutual pair is not granted Method-B authority.

`tests/cii-workspace-benchmark-base-anchor.test.js` now asserts that existing benchmark suggestions expose only the four qualified basis labels and retain candidate-generation/OD/identity-boundary metadata.

## Independent numerical reproduction

Python reproduction independent of production JavaScript used OD=100 mm and default x=2 -> tolerance 200 mm.

Two local regions:

```text
Region A translation = (0, +100, 0) mm
Region B translation = (0, -1200, 0) mm
local max residuals  = 0 mm
```

Applying Region-A transform to Region-B anchors gives:

```text
residual = 1300 mm per anchor
normalized residual = 1300 / 200 = 6.5
```

So a hidden global base must fail.

Runner-up case:

```text
true transform translation = (7000, -2500, 300) mm
true fourth-point residual  ≈ 1.14e-13 mm
structural decoy normalized residual ≈ 298.37
```

This independently falsifies any implementation that promotes the structural decoy into the true spatial base or collapses the two local transforms.

## Validation ledger

| ID | Check | Status | Observation | Oracle |
|---|---|---|---|---|
| VAL-001 | current-main grounding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE |
| VAL-002 | Method A two-local-transform numerical reproduction | PASS | LOCAL_EXECUTION | INDEPENDENT_REPRODUCTION |
| VAL-003 | structural-decoy / spatial-runner-up numerical reproduction | PASS | LOCAL_EXECUTION | INDEPENDENT_REPRODUCTION |
| VAL-004 | focused JS production-module test | NOT_RUN_ENVIRONMENT | NOT_OBSERVED | IMPLEMENTATION_COUPLED |
| VAL-005 | benchmark Base Anchor test | AUTHORED_NOT_RUN_ENVIRONMENT | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE |
| VAL-006 | inherited CII suite | NOT_RUN_ENVIRONMENT | NOT_OBSERVED | NONE |
| VAL-007 | full repository suite | NOT_RUN_ENVIRONMENT | NOT_OBSERVED | NONE |
| VAL-008 | browser/Chromium | NOT_RUN_ENVIRONMENT | NOT_OBSERVED | NONE |
| VAL-009 | GitHub CI | REFRESH_REQUIRED_EXACT_HEAD | NOT_OBSERVED | NONE |

Complete checkout attempt failed before product execution because the execution environment could not resolve `github.com`. No product PASS is inferred from that environment failure.

## Planned/changed files

- `tabs/cii-workspace/cii-workspace-anchor-method-a.js` — new bounded Method-A base discovery and per-pair evidence projection
- `tabs/cii-workspace/cii-workspace-anchor-suggestions.js` — independent A/B evidence fusion and spatial runner-up surfacing
- `tests/cii-workspace-base-anchor-method-fusion.test.js` — focused synthetic qualification
- `tests/cii-workspace-benchmark-base-anchor.test.js` — public benchmark contract assertions
- agent custody files only

## Risks

- RISK-001: arbitrary triplets can be geometrically congruent by chance. Mitigations: bidirectional structural plausibility, one-to-one seed requirement, mutual spatial winner expansion, full PR994 requalification, and 3-anchor REVIEW cap.
- RISK-002: one global Method-A cluster would violate the piping-revision architecture. PR994 final base-consistency rejects mixed transforms; independent numerical case demonstrates a 6.5x normalized mismatch across the two regions.
- RISK-003: candidate pool grows combinatorially. Default seed pool is bounded to 12 pairs, giving at most C(12,3)=220 raw triplets before one-to-one/geometry rejection.
- RISK-004: a spatially correct pair can be structurally non-mutual. PR996 deliberately allows Method A to surface it but does not confer Method B authority.

## Appendix A — implementation qualification

A1 Production trace: PASS — `inspectCiiWorkspaceModels()` calls `suggestCiiBaseAnchorPairs()`. Pre-PR996 it builds structural mutual-best pairs, qualifies one Method-B loop per pair and labels only `METHOD_B_NETWORK`/`LANDMARK_ONLY`. PR996 inserts independent bounded Method-A discovery before final suggestion projection.

A2 Failure isolation: PASS — the missing boundary is automatic Method-A base discovery/fusion inside Base Anchor suggestion generation; PR994 mathematics and PR995 workspace orchestration are reused unchanged.

A3 Authority/invariant: PASS — one point cannot establish Method A; structural candidate generation cannot masquerade as spatial authority; A and B remain independent OR evidence; Method B still requires its own mutual-best + two-run gate.

A4 Independent validation: PASS_FOR_IMPLEMENTATION — independent numerical cases prove two local transforms must not collapse and a structural rank-1 decoy can be rejected by a spatial base while a rank-2 true pair is recovered.

A5 Minimal patch: PASS — new discovery module + anchor-suggestion fusion + focused tests; no Writer/transfer/UI/parser/geometry-core changes.
