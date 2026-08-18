# PR984 — CII M1 Spatial / M2 Network evidence Work Report

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_DRAFT_ACTIVE
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_M1_M2_EVIDENCE_PHASE
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR_OR_WIP: PR984
BRANCH: agent/cii-m1-m2-evidence
PR_HEAD_OBSERVED: f808e9a42fb2ffb34fba45204fd7bbba97454e14
REPORT_BASIS_HEAD: f808e9a42fb2ffb34fba45204fd7bbba97454e14
MAIN_HEAD_LAST_CHECKED: ceb0c0193a4be68b28a913b74bdc453ccf79d336
MERGE_BASE: 070ef9038a9fc2af87a1e7a49b0e8f600d98d3ba
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984
APPENDIX_A_STATUS: NOT_REQUIRED_SAME_AGENT_CONTINUATION
GROUNDING_EPOCH: GE-984-001
CURRENT_STAGE: PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: M1/M2 IDENTITY BEING AVERAGED OR OD/WT BEING USED AS IDENTITY
EXACT_NEXT_ACTION: implement independent M1/M2 evidence and focused regressions; do not implement propagation yet.
```

## Handover in 60 Seconds

Current `cii-workspace-evidence.js` produces one blended score and hard-blocks OD/WT deltas; `cii-workspace-topology-adapter.js` embeds OD in neighbourhood tokens. PR984 will separate M1 Spatial from M2 Network/Gang evidence, preserve OD/WT as supporting evidence only, and expose a deterministic fusion decision matrix.

## Mission / acceptance

- M1: Euclidean 3D spatial distance, configurable default 100 mm.
- M2: topology/neighbourhood/path identity with no OD/WT in topology tokens.
- OD and wall: independent ±10% default relative evidence.
- Fusion: PASS/PASS→HIGH candidate; FAIL/PASS→MEDIUM candidate; PASS/FAIL→REVIEW; FAIL/FAIL→UNRESOLVED; different targets→REVIEW.
- Same OD/WT alone can never establish identity.
- Preserve winner-gap and target custody behavior.

## Non-goals

No BFS/anchor propagation, UI redesign, transfer mutation, parser/converter change, or node-offset identity logic.

## Active engineering items

| ID | Type | Severity | Status | Summary |
|---|---|---|---|---|
| ISS-984-01 | ISS | HIGH | OPEN | OD/WT are current hard blockers in `cii-workspace-evidence.js` |
| ISS-984-02 | ISS | HIGH | OPEN | neighbourhood token currently embeds OD, double-counting size |
| ISS-984-03 | ISS | HIGH | OPEN | current evidence does not expose M1 and M2 independently |
| DEC-984-01 | DEC | HIGH | ACCEPTED | identity gate is M1 or M2; dimensions are supporting evidence only |
| RISK-984-01 | RISK | HIGH | OPEN | changing current score semantics could break winner-gap/custody consumers |

## Authority / invariants

- correspondence identity evidence is distinct from engineering property delta;
- no target-number offset is identity evidence;
- M1 uses Euclidean norm;
- M2 topology tokens omit OD and wall;
- branch/component-kind structural conflicts remain fail-closed;
- target custody and winner gap remain unchanged;
- Stage06 remains blocked.

## Validation

All PR984 runtime tests: NOT_RUN at GE-984-001. Baseline source inspection only.

## Changed-file ledger

At PR allocation, only recovery documentation differs from stacked base. Planned production files: `cii-workspace-evidence.js`, `cii-workspace-topology-adapter.js`, plus a small M1/M2 decision helper and focused tests if required.

## Continuation

Start at `tabs/cii-workspace/cii-workspace-evidence.js`. Remove OD/WT hard blockers without weakening branch/component-kind hard blockers. Add explicit M1/M2 evidence before adapting candidate ranking.

# APPENDIX A

NOT_REQUIRED_SAME_AGENT_CONTINUATION. A different future implementation agent must re-ground and qualify.
