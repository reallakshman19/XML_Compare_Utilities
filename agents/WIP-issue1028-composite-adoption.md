# WIP — Issue #1028 partial H>1 HANGER composite adoption

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1028
BRANCH: agent/cii-writer2-hanger-partial-composite
BASE_MAIN: e9a28071aa932e5c360206d20807aeaf2e4f9517
DEPENDENCY: PR1027 MERGED @ e9a28071aa932e5c360206d20807aeaf2e4f9517
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
CURRENT_STAGE: GROUNDED_PRE_IMPLEMENTATION
```

## Mission

Adopt merged PR1027 partial H>1 HANGER physical claims into the existing one-original-preimage Writer2 composite. Product/core routing, browser/UI enablement and real H>1 product qualification remain out of scope.

## Live grounding

PR1027 was squash merged from exact head `457a2c4572c0773cdf1cd2e15fa36f6a3e305638` to `main@e9a28071aa932e5c360206d20807aeaf2e4f9517`.

Open unrelated PRs were inspected. No active open PR claims the Issue #1028 composite HANGER paths. Existing Writer1C PR1007 is a different authority domain.

## Current architecture

Existing tri-family composite:

```text
tabs/cii-workspace/cii-workspace-writer2-composite-hanger.js
```

currently supports:

```text
WRITER_2_NODENAME
WRITER_2_SIF_DELETE
WRITER_2_HANGER_DELETE_ALL
```

All component writers dry-run from one untouched TARGET0; their original-coordinate claims are arbitrated and applied once.

Independent composite validator:

```text
tabs/cii-workspace/cii-workspace-writer2-composite-hanger-validation.js
```

independently rebuilds NODENAME, SIF DELETE and HANGER DELETE-ALL expected claims and exact complete postimage.

## Current diagnosis

The existing `projectTransferPlan()` moves sibling parent APPLY rows into projected `excludedOperations` but intentionally retains the parent `transferScope` unchanged.

Merged PR1027 partial HANGER Writer is stricter. It requires canonical operation containers and the BOUND scope sets to match exactly:

```text
projected operations/APPLY
projected excludedOperations/EXCLUDE
projected transferScope.appliedOperationIds
projected transferScope.excludedOperationIds
projected transferScope.candidateOperationIds
```

Therefore directly calling `applyCiiWriter2HangerPartialDelete()` with the legacy composite family projection would fail its canonical-scope gate. Weakening PR1027 scope custody is forbidden.

## Required implementation direction

1. Preserve parent BOUND scope custody at composite level.
2. Build a derived **canonical partial-HANGER family subscope** whose APPLY/EXCLUDE sets exactly match its projected containers.
3. Retain explicit parent lineage in `familyProjection`.
4. Independently build the HANGER delete plan to classify:
   - delete-all -> existing `applyCiiWriter2HangerDeleteAll()` unchanged;
   - partial H>1 with H'>0 -> merged `applyCiiWriter2HangerPartialDelete()`.
5. Keep all component writers on untouched TARGET0.
6. Add partial HANGER mutations to original-coordinate arbitration under a distinct authority family.
7. Extend independent composite validator by independently reconstructing partial-HANGER CONTROL + full MISCEL_1 expected claims. Do not import partial Writer payload/repack helpers.
8. Preserve product/core blocker until the later successor PR.

## First intended production paths

```text
tabs/cii-workspace/cii-workspace-writer2-composite-hanger.js
tabs/cii-workspace/cii-workspace-writer2-composite-hanger-validation.js
```

Expected focused test surface:

```text
tests/cii-workspace-writer2-composite-hanger.test.js
new focused partial-composite falsifier test only if existing test would become overloaded
```

Coordination files will move to PR-numbered records immediately after PR allocation.

## Evidence truth

```text
PR1027 component source authority            MERGED
PR1027 current-head native runtime evidence  NOT_RUN_ENVIRONMENT
real repository H>1 source                   NOT_AVAILABLE
real H>1 product qualification               OUT_OF_SCOPE / NOT_RUN_NO_REAL_SOURCE
Issue1028 production changes                 NOT_STARTED at this checkpoint
```

## Exact next action

Open draft PR from this branch, migrate this WIP record to the allocated PR workreport/status/claim, then implement canonical partial-HANGER family-subscope derivation and delete-all/partial dispatch before touching the independent composite validator.
