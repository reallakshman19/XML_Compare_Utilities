# PR1047 work report — Writer2 W2.13 RESTRAINT DELETE product/core adoption

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
REPOSITORY: reallaksh19/XML_Compare_Utilities
ISSUE: #1046
PR: #1047
BRANCH: agent/cii-writer2-restraint-product-w213
BASE_MAIN: 72afe8fa9e8167e0284d34259bc7ad304ac14d99
PREDECESSOR: PR #1045 / W2.12 / merged at 72afe8fa9e8167e0284d34259bc7ad304ac14d99
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
```

## Handover in 60 seconds

W2.13 does not create new physical RESTRAINT mutation authority. It exposes merged W2.12 through the Writer2 product path only when the transfer plan contains qualified RESTRAINT DELETE. W2.12 remains the one-TARGET0 physical authority and the independent complete-postimage validator remains the RESTRAINT product oracle.

Binding #1042 correction:

```text
CONTROL row1 / field4 / I13 = NONAM       -> RESTRAINT must preserve
CONTROL row2 / field4 / I13 = RESTRAINTS  -> qualified RESTRAINT count mutation
```

Historical W2.12 validation limitation is retained exactly:

```text
focused R01-R22 = NOT_RUN_ENVIRONMENT
repository npm test = NOT_RUN_ENVIRONMENT
```

The owner accepted that residual only for the W2.12 merge; W2.13 must record its own validation truth.

## Mission

Implement exactly three product seams:

1. `cii-workspace-writer2-composite-routing.js` — recognize qualified RESTRAINT DELETE, preserve CREATE blocker, expose readiness/count/component custody.
2. `cii-workspace-core.js` — dispatch Writer2 apply to W2.12 composite when qualified RESTRAINT DELETE is present; retain existing Writer2 composite when absent.
3. `cii-workspace-writer2-product-validation.js` — dispatch W2.12 result to independent W2.12 complete-postimage validator; retain existing HANGER delete-all/partial validation classes for no-RESTRAINT results.

Supporting tests may use retained V11 CII benchmark files. No parser/converter/UI/workflow/Writer3 change is authorized.

## Authority / invariants

```text
RESTRAINT DELETE only
RESTRAINT CREATE -> WRITER_2_RESTRAINT_BLOCK_CREATE_ALLOCATION_NOT_QUALIFIED
all physical RESTRAINT claims remain W2.12 TARGET0-relative
no sequential postimage-relative composition
NODENAME/SIF/HANGER existing product route unchanged when RESTRAINT absent
CONTROL row1/NONAM negative assurance remains mandatory
CONTROL row2/RESTRAINTS is the only CONTROL count changed by RESTRAINT DELETE
```

## Coordination

Open Writer2 PR #1033 is qualification/data-only for SIF CREATE and has zero production paths. Open PR #1007 is Writer1C custody. No exact-file or product/core authority overlap found.

```text
COORDINATION_STATE: SAFE
```

## Current diagnosis

Main currently blocks all RESTRAINT APPLY in Writer2 product readiness because `ciiWriter2CompositeReadiness()` recognizes only NODE/SIF/HANGER. Core Writer2 apply is hard-bound to `applyCiiWriter2CompositeWithHangerDeleteAll`, and product validation knows only HANGER delete-all/partial/no-hanger classes. Therefore merged W2.12 cannot be reached through the product route even though its component/composite authority exists.

## Hypothesis / falsifier

Hypothesis: W2.13 is a routing-only adoption. If readiness classifies RESTRAINT DELETE using the merged W2.11 planner, core dispatch chooses W2.12 only for plans containing RESTRAINT DELETE, and product validation recognizes the W2.12 result schema, then no physical writer code needs modification.

Falsifier: any implementation need to change W2.12 byte arithmetic, W2.11 compaction, RESTRAINT CREATE/default/GUID semantics, parser/converter behavior, or existing NODE/SIF/HANGER writers requires stop/re-scope.

## Intended changed paths

```text
agents/MASTER_INDEX.md
agents/PR1047_workreport.md
agents/status/PR1047.yaml
agents/claims/PR1047.yaml
tabs/cii-workspace/cii-workspace-writer2-composite-routing.js
tabs/cii-workspace/cii-workspace-core.js
tabs/cii-workspace/cii-workspace-writer2-product-validation.js
tests/<focused W2.13 product qualification>
```

## Validation ledger — initial

```text
main/base exact SHA                         PASS_REMOTE_GITHUB
W2.12 merge                                PASS_REMOTE_GITHUB
open-PR overlap                            SAFE_SOURCE_INSPECTION
product routing diagnosis                  PASS_SOURCE_INSPECTION
W2.13 implementation                       NOT_STARTED
W2.13 focused runtime                      NOT_RUN
repository npm test                        NOT_RUN
```

## Appendix A — implementation authorization

A1 Production trace — 20/20: product preview applies `applyCiiWriter2CompositePlanContract`, readiness gates Writer2, core `applyLowLevelWriter` selects the current HANGER composite, and `validateCiiWriter2ProductRoundTrip` dispatches HANGER validator class. RESTRAINT is absent at all three seams.

A2 Failure isolation — 20/20: the failure is not W2.12 physical mutation; it is product reachability. Current readiness labels RESTRAINT APPLY unsupported and policy says `restraintCardinality: BLOCKED_WRITER_2_COMPOSITE`.

A3 Authority — 20/20: RESTRAINT DELETE uses merged W2.12; CREATE remains blocked; #1042 row1/row2 CONTROL custody is immutable.

A4 Independent validation — 20/20: RESTRAINT product path must call `validateCiiWriter2CompositeWithRestraintDelete`; it must not infer correctness from Writer testimony.

A5 Minimal patch — 20/20: modify only routing/core/product validator plus focused tests/agent records. No physical writer changes.

```text
TAKEOVER_SCORE: 100/100
TAKEOVER_DECISION: CONTINUE
```

## EXACT_NEXT_ACTION

Implement routing readiness for qualified RESTRAINT DELETE, then core dispatch and product-validator dispatch, then author retained-real-CII product qualification and falsifiers. Keep PR draft and unmerged.
