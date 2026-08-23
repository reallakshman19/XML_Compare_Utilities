# WIP — Issue #1030 partial H>1 HANGER product/core adoption

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1030
BRANCH: agent/cii-writer2-hanger-partial-product
BASE_MAIN: 9f2f11ccf3b2f62cecaf75677a3dcbff39c85f6b
DEPENDENCY: PR1029 MERGED @ 9f2f11ccf3b2f62cecaf75677a3dcbff39c85f6b
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
CURRENT_STAGE: GROUNDED_PRE_IMPLEMENTATION
```

## Mission

Adopt merged partial H>1 HANGER one-TARGET0 composite authority into explicit Writer2 product/core routing. Preserve delete-all, Writer1B default, SIF/HANGER CREATE blockers, and Writer3 boundary.

## Source diagnosis

Two product gates remain at `main@9f2f11cc...`:

1. `tabs/cii-workspace/cii-workspace-writer2-composite-routing.js`
   - `ciiWriter2CompositeReadiness()` builds the qualified HANGER plan but still requires `deleteAll === true && countAfter === 0`.
   - policy testimony still says `EXISTING_HANGER_DELETE_ALL_ONLY` / partial blocked.

2. `tabs/cii-workspace/cii-workspace-core.js`
   - low-level Writer2 already calls merged PR1029 composite Writer, so physical routing is present.
   - product validation always invokes legacy `validateCiiWriter2CompositeWithHangerRoundTrip`, which is delete-all-specific.

## Required implementation direction

- readiness must accept exactly two qualified HANGER classes:
  - delete-all: existing behavior;
  - partial H>1: `countBefore > 1`, `0 < countAfter < countBefore`, `compaction.partialMultiRecordDelete === true`, `compaction.plannerPartialRecordAuthority === true`, qualified positional record binding.
- no broad `hangerPlan.ready` shortcut; classify explicitly.
- product apply must dispatch validator by actual composite component result:
  - `hangerPartialDelete` -> PR1029 independent partial-composite validator;
  - otherwise -> existing legacy delete-all composite validator.
- ambiguous result containing both delete-all and partial HANGER components must fail closed.
- preserve current stale-target re-intake boundary and exact final-byte validation.

## Evidence truth

```text
PR1029 composite authority                  MERGED
real repository H>1 source                 NOT_AVAILABLE
real H>1 product roundtrip                 NOT_RUN_NO_REAL_SOURCE
current-head native Node/npm execution      NOT_RUN_ENVIRONMENT unless environment changes
```

Synthetic/source-qualified H>1 fixtures may prove deterministic routing but must never be labelled real/native evidence.
