# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR988 | CII Transfer Preview qualification | `agent/cii-transfer-preview-qualification` | IMPLEMENTATION COMPLETE / EXACT FOCUSED PASS / REAL BENCHMARK NOT_RUN / AUTO BLOCKED / STACKED DRAFT | ENGINEERING_CRITICAL | delta-driven read-only transfer policy, action/status separation, Tab3 actions/protection; no writer | SAFE STACK on PR987..982 | run real TARGET1/TARGET2 tests + inherited regression/UI lifecycle; do not start mutation or merge before PASS |
| PR987 | CII auxiliary custody + benchmark qualification | `agent/cii-aux-custody-benchmark` | IMPLEMENTATION COMPLETE / SOURCE-QUALIFIED / HANGER FOCUSED PASS / REAL BENCHMARK NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | RESTRANT/SIF block-index pointers, RIGID pointer custody, hanger node presence, registered/native delta basis, oracle correction | SAFE STACK on PR986..982 | execute real benchmark qualification + end-to-end frozen-policy preview |
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | IMPLEMENTATION COMPLETE / EXACT FOCUSED PASS / FULL INTEGRATION NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | downstream deltas + Compare Review view/UI/export; no identity or target mutation | SAFE STACK on PR985..982 | consumed by PR987/988; retain draft until chain qualification |
| PR985 | CII anchor-seeded network propagation | `agent/cii-anchor-propagation` | IMPLEMENTATION COMPLETE / FOCUSED PASS / FULL-CHECKOUT NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | one-anchor multi-hop propagation + frontier assignment/custody | SAFE STACK on PR984..982 | frozen-policy real benchmark is remaining integration gate |
| PR984 | CII M1 Spatial / M2 Network evidence | `agent/cii-m1-m2-evidence` | IMPLEMENTATION COMPLETE / FOCUSED PASS / FULL-CHECKOUT NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | endpoint-coordinate M1, dimension-free M2, confidence/ranking separation | SAFE STACK | frozen; do not retune for TARGET2 |
| PR983 | capability states + benchmark oracle/preflight | `agent/cii-oracle-capability-states` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / STACKED DRAFT | ENGINEERING_CRITICAL | truthful intake capability states + test-only oracle | SAFE STACK | frozen benchmark/oracle basis |
| PR982 | fixed-field ELEMENT parser | `agent/cii-fixed-field-parser` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / DRAFT | ENGINEERING_CRITICAL | fixed-field parser + adjacent-sign regression | SAFE STACK | base of CII Compare qualification chain |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | historical CII Workspace V1 | HISTORICAL | none |

## PR988 — read-only Transfer Preview

Production flow:

```text
correspondence -> engineering deltas -> engineer review -> transfer policy -> preview only
```

Operation contract separates intended action from execution status. Examples:

```text
restraint revision        COPY   PREVIEW_READY
SOURCE hanger at 205      CREATE BLOCKED
SIF/Tee raw revision      COPY   BLOCKED
rigid 111.2 -> 111.2      KEEP   PREVIEW_READY
OD / wall / geometry      KEEP   PROTECTED
P1/T1 partial revision    COPY   BLOCKED
```

Protected by default: geometry, node numbering, topology, OD and wall.

Observed validation:

- exact Git-blob-verified local PASS: transfer policy/action-status regression;
- exact local PASS: inherited transfer-preview test;
- exact local PASS: inherited review/LOCKED custody test;
- current-source inspection PASS: Tab3 Action/Family columns, action counts, protected wording and both disabled apply controls;
- real benchmark transfer-preview test: COMMITTED / NOT_RUN.

`mutationAuthority = BLOCKED_NOT_IMPLEMENTED` remains authoritative.

## PR987 — corrected auxiliary custody

Engineering-critical pointer units:

```text
RESTRANT  1-based 24-row block index
SIF&TEES  1-based 10-row block index
RIGID     1-based one-row record index
```

Benchmark evidence:

- SOURCE 130 / TARGET1 20130 / TARGET2 10130: type `15 -> 9`; friction `0 -> 0.3` for TARGET1 and `0 -> 0` for TARGET2;
- SOURCE `70->250` SIF block1 raw field2 3; TARGET1/TARGET2 corresponding branch uses block8 raw field2 5;
- SOURCE `113->116` RIGID pointer9 and target pointer11 all resolve to weight 111.2, so historical weight-change note is quarantined;
- SOURCE CONTROL `NOHGRS=1` with dual-layout-qualified IHGRNODE = 205; TARGET1/TARGET2 `NOHGRS=0`, so hanger node presence is `1 -> 0` downstream of identity.

HGRDAT/TAG/GUID and SIF raw-code semantic names remain intentionally unqualified.

## Earlier correspondence chain retained

PR986 keeps identity confidence separate from engineering changes and implements the three-tab Compare Review UI.

PR985 provides one-anchor bounded multi-hop propagation with one-to-one assignment, winner gap and custody stop.

PR984 defines endpoint-coordinate M1, topology-led M2, OD/WT as separate evidence and M1/M2 disagreement as REVIEW. TARGET2 policy must not be retuned.

PR983 retains truthful capability states and benchmark-oracle preflight. PR982 retains canonical fixed-field ELEMENT decoding.

## AUTO / merge state

Owner enabled AUTO phase progression and authorized merge only after all approved phases are complete **and qualified**.

Current hard gate:

```text
AUTO_STATE = BLOCKED
BLOCKER = FULL_REAL_BENCHMARK_RUNTIME_UNAVAILABLE
NOT_RUN:
  tests/cii-workspace-benchmark-qualification.test.js
  tests/cii-workspace-benchmark-end-to-end.test.js
  tests/cii-workspace-benchmark-transfer-preview.test.js
```

The available runtime has no complete repository/benchmark checkout; direct raw download is unavailable; no GitHub status/workflow run is present for PR988.

Therefore target CII mutation is not started and the stack is not merge-ready. Actual target writer qualification is a separate phase after the frozen-policy TARGET1/TARGET2 gates pass.

See `agents/PR987_workreport.md` and `agents/PR988_workreport.md` for exact continuation evidence.
