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
CURRENT_STAGE: BASELINE / IMPLEMENT
GROUNDING_EPOCH: GE-001 / 2026-08-19
```

## Handover in 60 Seconds

PR994 qualified Method A/B mathematics. PR995 connected explicit independent A/B base loops to workspace correspondence. The remaining Base Anchor suggestion path still emits only `METHOD_B_NETWORK` or `LANDMARK_ONLY`; it has no automatic Method-A multi-pair discovery and no A+B fusion label.

This increment adds automatic Method-A base discovery from a bounded set of mutually-best structural pair hypotheses, then fuses per-pair Method A and Method B evidence without changing the OR authority architecture.

## Ground truth

- live main: `d28e33c1b4fd4facf559c218a36367149e270777`
- predecessor PR995: merged by squash at that SHA
- branch: `agent/cii-base-anchor-method-fusion`
- source task: Issue #993
- coordination: SAFE; no active CII anchor-discovery PR found

## Mission

Every Base Anchor suggestion shall expose an evidence-derived basis label:

```text
METHOD_A_SPATIAL
METHOD_B_NETWORK
METHOD_A_AND_B
LANDMARK_ONLY
```

Method A qualification requires membership in at least one READY non-collinear local spatial base. A single point must never be labelled Method A.

## Planned architecture

```text
structural/landmark pair hypotheses
       ↓ candidate generation only
bounded mutually-best pair pool
       ↓
seed non-collinear triples
       ↓
PR994 rigid registration qualification
       ↓
expand each seed with additional pair hypotheses that satisfy its local x*SOURCE_OD transform
       ↓
re-qualify complete local base
       ↓
READY Method-A bases
       ↓
map base membership back to pair suggestions

per pair:
  Method A evidence
     OR
  Method B evidence
       ↓
METHOD_A / METHOD_B / METHOD_A_AND_B / LANDMARK_ONLY
```

## Hard invariants

- topology/landmark score is candidate generation, not Method-A spatial authority;
- Method A requires >=3 non-collinear source-target pairs and PR994 OD-scaled qualification;
- Method B retains minimum two-independent-run gate and existing weight model;
- OD remains tolerance-scale only and TARGET OD has no identity authority;
- node-number offset and WT remain excluded from identity;
- no A+B score summation; confidence is the strongest independently qualified method with corroboration retained separately;
- same source/target conflicts remain fail-closed in PR995 downstream orchestration;
- no UI, Writer, transfer or parser changes in this increment.

## Planned files

- `tabs/cii-workspace/cii-workspace-anchor-method-a.js` — bounded Method-A base discovery and per-pair evidence projection
- `tabs/cii-workspace/cii-workspace-anchor-suggestions.js` — fuse A/B evidence and basis labels
- focused tests for A-only, B-only, A+B, landmark-only, local multi-transform separation and no-single-point-A
- benchmark assertions where source-qualified and deterministic

## Risks

- RISK-001: arbitrary triplets can be geometrically congruent by chance. Mitigation: seed only from mutually-best structural pair hypotheses, expand with all transform-compatible hypotheses, preserve Method-A confidence/weight, and never hide low redundancy.
- RISK-002: one global Method-A cluster would violate the piping-revision architecture. Discovery must preserve separate local transforms and must not merge incompatible bases.
- RISK-003: candidate pool size can grow combinatorially. Use explicit bounded pair limit before O(n^3) seed enumeration.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| current-main grounding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE |
| implementation tests | NOT_RUN | NOT_OBSERVED | NONE |
| real benchmark execution | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE |
| browser/full suite | NOT_RUN | NOT_OBSERVED | NONE |

## Appendix A — implementation qualification

A1 Production trace: PASS — `inspectCiiWorkspaceModels()` calls `suggestCiiBaseAnchorPairs()`, which currently builds mutually-best structural pairs, qualifies one Method-B loop per pair, and sets `basisMethod` only to `METHOD_B_NETWORK` or `LANDMARK_ONLY`.

A2 Failure isolation: PASS — the missing boundary is automatic Method-A base discovery/fusion inside Base Anchor suggestion generation; PR994 math and PR995 workspace orchestration already exist.

A3 Authority/invariant: PASS — one point cannot establish Method A; candidate-generation structure cannot masquerade as spatial authority; A and B remain independent OR evidence with conflict veto downstream.

A4 Independent validation: PASS_FOR_IMPLEMENTATION — use hand-constructed rigid/non-rigid multi-pair fixtures with declared expected base membership and a two-local-transform case; do not derive expected labels from production output.

A5 Minimal patch: PASS — new bounded discovery module + anchor-suggestion fusion + focused tests; no Writer/transfer/UI/parser changes.
