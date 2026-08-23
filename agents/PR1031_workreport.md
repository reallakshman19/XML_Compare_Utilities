# PR1031 — partial H>1 HANGER product/core adoption

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1030
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
BASE_MAIN: 9f2f11ccf3b2f62cecaf75677a3dcbff39c85f6b
DEPENDENCY: PR1029 MERGED @ 9f2f11ccf3b2f62cecaf75677a3dcbff39c85f6b
CURRENT_STAGE: PRODUCT_GATES_IMPLEMENTATION
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
REAL_H_GT_1_SOURCE: NOT_AVAILABLE
REAL_H_GT_1_PRODUCT_ROUNDTRIP: NOT_RUN_NO_REAL_SOURCE
```

## Mission

Adopt merged PR1029 partial H>1 HANGER composite authority into explicit Writer2 product/core routing. Do not reimplement the physical writer or composite.

## Grounded source diagnosis

Two product gates exist on baseline main:

1. `cii-workspace-writer2-composite-routing.js` still requires every ready HANGER plan to be delete-all.
2. `cii-workspace-core.js` always invokes the legacy delete-all composite validator for Writer2 apply.

The low-level Writer2 product call already invokes merged PR1029 `applyCiiWriter2CompositeWithHangerDeleteAll()`, which now internally dispatches delete-all vs partial from one TARGET0. Therefore no Writer mutation code is needed in this PR.

## Intended production scope

```text
tabs/cii-workspace/cii-workspace-writer2-composite-routing.js
tabs/cii-workspace/cii-workspace-core.js
```

Focused product tests will be added without modifying workflows/package scripts.

## Required partial readiness authority

A HANGER plan is product-partial-ready only when all are true:

```text
plan.ready === true
countBefore > 1
0 < countAfter < countBefore
compaction.partialMultiRecordDelete === true
compaction.plannerPartialRecordAuthority === true
compaction.partialRecordCompactionAuthorized === true
physicalCustody.recordBinding.status === QUALIFIED
physicalCustody.recordBinding.authority is nonblank
physicalCustody.recordBinding.semanticAuthority === NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
compaction.recordBindingAuthority === physicalCustody.recordBinding.authority
```

Delete-all remains its existing class: `deleteAll === true && countAfter === 0`.

## Validator dispatch rule

```text
writerResult.components.hangerPartialDelete present
  -> merged independent partial-composite validator

otherwise
  -> existing delete-all composite validator

both partial + delete-all components present
  -> FAIL CLOSED
```

## Evidence truth

```text
PR1029 composite authority                     MERGED
real repository H>1 source                    NOT_AVAILABLE
real H>1 product roundtrip                    NOT_RUN_NO_REAL_SOURCE
native exact-head execution                   NOT_RUN_ENVIRONMENT
```

No synthetic fixture may be represented as real/native authority.

## Changed-file ledger

Current expected paths:

```text
agents/PR1031_workreport.md
agents/status/PR1031.yaml
agents/claims/PR1031.yaml
agents/MASTER_INDEX.md
tabs/cii-workspace/cii-workspace-writer2-composite-routing.js
tabs/cii-workspace/cii-workspace-core.js
focused tests TBD after source implementation
```

## Appendix A — takeover questions

1. Why must product readiness classify delete-all and partial HANGER explicitly rather than accept any `hangerPlan.ready`?
2. Which PR1025/PR1027 fields prove positional-only record authority for partial HANGER?
3. Why does Writer2 low-level product mutation need no new writer implementation in this PR?
4. How does validator dispatch remain fail-closed if result testimony is malformed?
5. Why is real H>1 product qualification still `NOT_RUN_NO_REAL_SOURCE` after product routing is implemented?
