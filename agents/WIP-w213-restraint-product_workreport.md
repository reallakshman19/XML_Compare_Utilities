# WIP-w213-restraint-product — Writer2 W2.13 product/core RESTRAINT DELETE adoption

## CURRENT STATE

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
REPOSITORY: reallaksh19/XML_Compare_Utilities
ISSUE: #1046
PR: NOT_YET_ALLOCATED
BRANCH: agent/cii-writer2-restraint-product-w213
BASE_MAIN: 72afe8fa9e8167e0284d34259bc7ad304ac14d99
PREDECESSOR: PR #1045 / W2.12 / merged at 72afe8fa9e8167e0284d34259bc7ad304ac14d99
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
```

## Mission

Adopt merged W2.12 `CII_WRITER_2_RESTRAINT_ONE_TARGET0_COMPOSITE` into Writer2 product/core routing and qualify it on retained real V11 CII data.

## Binding authority

```text
CONTROL row1 / field4 / I13 = NONAM       -> preserve under RESTRAINT DELETE
CONTROL row2 / field4 / I13 = RESTRAINTS  -> qualified block-count mutation
RESTRANT block = 24 rows
ELEMENT restraint pointer = physical I13, 1-based block index
RESTRAINT CREATE = blocked
```

All physical mutation remains delegated to merged W2.12. W2.13 may route/classify/validate only; it must not reimplement byte mutation or introduce sequential postimage-relative composition.

## Intended production paths

```text
tabs/cii-workspace/cii-workspace-writer2-composite-routing.js
tabs/cii-workspace/cii-workspace-core.js
tabs/cii-workspace/cii-workspace-writer2-product-validation.js
```

## Coordination

Live open Writer2 search found PR #1033 only for SIF CREATE qualification/data with zero production paths. PR #1007 is Writer1C physical custody. No exact-file or product/core authority overlap found.

```text
COORDINATION_STATE: SAFE
```

## Validation truth inherited from W2.12

```text
source architecture / compliance = PASS
W2.12 R01-R22 source = AUTHORED
W2.12 focused native = NOT_RUN_ENVIRONMENT
repository npm test = NOT_RUN_ENVIRONMENT
```

Owner accepted the W2.12 runtime residual when authorizing merge. These historical NOT_RUN results must never be relabelled.

## Current hypothesis / falsifier

Hypothesis: product adoption requires only three routing seams: readiness admits qualified RESTRAINT DELETE, core dispatch selects W2.12 when RESTRAINT is present, and product validation dispatches to the independent W2.12 validator. Existing no-RESTRAINT route remains byte-for-byte behavior compatible.

Falsifier: any need to alter W2.12 mutation arithmetic, RESTRAINT CREATE semantics, parser/converter logic, or existing HANGER/NODENAME/SIF physical writers means W2.13 scope is wrong and implementation must stop.

## EXACT_NEXT_ACTION

Allocate draft PR, replace this WIP record with `agents/PR<NUMBER>_workreport.md`, create status/claims, then implement routing/core/product validator changes and real-CII qualification tests.
