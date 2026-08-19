# WIP CII993 — Multi-base correspondence orchestration

## Recovery Header

```text
HANDOVER_READINESS: IN_PROGRESS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — workspace-level independent-loop orchestration
BRANCH: agent/cii-multi-base-orchestration
BASE: main@daf3be0a23524c4e25c6adc915f8841732180c36
MUTATION_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: BASELINE / IMPLEMENT
GROUNDING_EPOCH: GE-001 / 2026-08-19
```

## Handover in 60 Seconds

PR994 merged the Method A/B base qualification primitives, but `createCiiWorkspacePreview()` still treats `anchorPairs` as one flat Method-A set and routes 2+ anchors through one locked span. This WIP replaces only that orchestration layer with independent READY base loops, per-loop correspondence generation, and OR arbitration with identity/custody conflict veto. Writer 1A/1B, transfer policy/plan, UI and fixed-field parsing are out of scope.

## Ground truth

- live main: `daf3be0a23524c4e25c6adc915f8841732180c36`
- predecessor: PR994 merged by squash at the above SHA
- branch: `agent/cii-multi-base-orchestration`
- source task: Issue #993
- coordination: SAFE based on current CII branch inventory; refresh before PR creation/closure

## Mission

Implement production-connected multi-base correspondence:

```text
qualified independent Method A / Method B loops
  -> correspondence per READY loop
  -> canonical node/element claim grouping
  -> compatible claims accumulate provenance
  -> source->multiple-target / target->multiple-source conflicts => AMBIGUOUS
  -> canonical CIIWorkspaceCorrespondence.v1
```

Backward compatibility: legacy `anchorPairs` becomes one generated Method-A base, not a second permanent engine.

## Hard invariants

- OR across independent base loops; no global transform agreement requirement.
- Method A transform is local to its own loop.
- Method B requires its existing qualified run-basis gate.
- no first-loop-wins, majority vote, residual tie-break, node-offset identity or TARGET-OD identity.
- a candidate may never bypass correspondence arbitration into Writer operations.
- Writer/transfer/fixed-field code unchanged.

## Initial diagnosis

`tabs/cii-workspace/cii-workspace-core.js` currently computes one `geometry` from all locked anchors and `buildBaseCorrespondence()` routes one anchor through single-anchor propagation or 2+ anchors through `compareLockedCiiAnchorSpan()`. `cii-workspace-multi-base-anchor.js` is production-used by suggestions but not by `createCiiWorkspacePreview()`.

## Planned production files

- `tabs/cii-workspace/cii-workspace-correspondence-arbitration.js` — new pure claim/provenance arbitration
- `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js` — new per-loop correspondence orchestration
- `tabs/cii-workspace/cii-workspace-core.js` — replace flat preview orchestration with multi-base path while retaining legacy input adapter
- `tabs/cii-workspace/cii-workspace-contracts.js` — add schema keys only if required

## Planned tests

- pure arbitration: same pair corroboration; source collision; target collision; element collision; unresolved loop isolation
- orchestration synthetic: A-only, B-only, A+B same pair, A/B conflict
- real benchmark authored: `SOURCE 3.CII -> TARGET 3-1.CII`, including the 60930↔7300 A+B region and multiple local numbering regimes

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| current-main source grounding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE |
| production/test execution | NOT_RUN | NOT_OBSERVED | NONE |
| real benchmark execution | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE |
| browser/full suite | NOT_RUN | NOT_OBSERVED | NONE |

## Risks / decisions

- DEC-001: combine loop results only after each loop independently qualifies and generates correspondence.
- DEC-002: equivalent node/element claims collapse to one canonical row with `evidence.multiBaseProvenance`; conflicting claims fail closed.
- RISK-001: existing downstream code may assume `geometry` is singular; preserve a compatibility geometry field only when exactly one Method-A loop is READY, otherwise expose local transforms in multi-base authority and do not invent a global transform.
- RISK-002: a whole-component single-anchor propagation may overreach across a changed region. PR995 will preserve unresolved loop blockers and use cross-loop conflicts as veto; later locality limits may require separate qualification if real benchmark demonstrates over-propagation.

## Appendix A — implementation qualification

A1 Production trace: PASS — `createCiiWorkspacePreview()` flat anchors -> singular geometry -> `buildBaseCorrespondence()` -> one single-anchor propagation or locked span; multi-base authority is currently not in this preview path.

A2 Failure isolation: PASS — the first wrong boundary is orchestration, not Method A/B math and not Writer. Multiple real stable regions cannot be represented as independent OR loops by the current preview contract.

A3 Authority/invariant: PASS — local A transforms may differ; B evidence is topology/geometry based; conflicts veto; OD only scales tolerance; node offsets have no identity authority.

A4 Independent validation: PASS_FOR_IMPLEMENTATION — use pure arbitration fixtures with independently declared expected canonical claims and conflict sets, plus the real `SOURCE 3/TARGET 3-1` benchmark as an authoritative fixture. Do not derive expected identities from production output.

A5 Minimal patch: PASS — add arbitration + orchestration modules, wire preview core, add regressions; do not touch Writer/transfer/UI/fixed-field paths.
