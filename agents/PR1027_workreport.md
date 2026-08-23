# PR1027 — Writer 2 partial H>1 HANGER physical compaction

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1026
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1026
PR: #1027
BRANCH: agent/cii-writer2-hanger-partial-physical
BASE_MAIN: ae1de402db129e32cd6d7811a4e4707d64512bd4
GROUNDING_EPOCH: GE-1027-002
CURRENT_STAGE: CANONICAL_SCOPE_CONTAINER_CUSTODY_HARDENED_REVIEW_READY
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
EVIDENCE_LIMITATION: NO_REAL_REPOSITORY_H_GT_1_CII_PREIMAGE
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its planner/record-binding authority is consumed read-only.

## Current engineering transaction

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ canonical BOUND transaction representation
  - operations[] present
  - excludedOperations[] present
  - mutable operations rows are APPLY only
  - KEEP rows are operations-only and KEEP only
  - excludedOperations rows are mutable and EXCLUDE only
  - APPLY and EXCLUDE IDs are disjoint
  - all operation IDs are globally unique across both containers
+ untouched TARGET0
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix
   - preserve two default rows
   - repack exact retained raw I13 fields across five packed arrays
   - require exact active-fields-only packed source rows
   - preserve qualified INTERLEAVED/GROUPED HGRDAT/TAG/GUID order class
   - retain IHGRFREE by the same positional record map
   - preserve four execution rows
-> apply exactly two original-coordinate replacements once
-> independent complete-postimage reconstruction
-> exact final-byte equality
```

`countAfter == 0` remains the existing delete-all writer. Semantic authority remains `NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY`. Product/composite/UI partial HANGER remains blocked.

## Current batch — canonical operation-container / scope custody

### Finding

The normal repository transfer-scope builder in:

```text
tabs/cii-workspace/cii-workspace-transfer-scope.js
```

uses one decision map and emits a canonical physical representation:

```text
operations
  mutable selected rows -> scopeDecision=APPLY
  unchanged rows        -> scopeDecision=KEEP

excludedOperations
  mutable excluded rows -> scopeDecision=EXCLUDE
```

That upstream builder remains unchanged.

PR1027 nevertheless accepts a caller-supplied already-BOUND `transferPlan` at a component boundary. After the earlier F31/F32 disjointness hardening, the audit continued through the full physical representation rather than stopping at set overlap.

The prior component code derived scope custody by filtering:

```text
transferPlan.operations
  where scopeDecision == APPLY and action != KEEP

transferPlan.excludedOperations
  where scopeDecision == EXCLUDE and action != KEEP
```

That means malformed rows could be made invisible to the custody proof. Examples:

```text
mutable DELETE stored in operations with scopeDecision=EXCLUDE
mutable DELETE stored in excludedOperations with scopeDecision=APPLY
KEEP stored in excludedOperations
KEEP and mutable rows sharing one operationId
missing excludedOperations array treated as [] by fallback
```

The planner itself mutates only `transferPlan.operations` rows marked APPLY. Therefore filtering malformed rows at the physical writer boundary was not sufficient: a forged BOUND transaction could contain authority-bearing rows that neither the scope proof nor the planner considered.

This is a component-boundary custody defect, not a defect in the upstream canonical scope builder.

### Writer hardening

Commit:

```text
4a9f2f7daf6b7c50f776a4b8ad569df76ada1106
CII: enforce canonical partial-HANGER operation containers
```

Before the merged PR1025 planner is invoked, `cii-workspace-writer2-hanger-partial-write.js` now requires:

```text
operations is an Array
excludedOperations is an Array

each operations row:
  operationId is nonblank
  action != KEEP -> scopeDecision exactly APPLY
  action == KEEP -> scopeDecision exactly KEEP

each excludedOperations row:
  operationId is nonblank
  action != KEEP
  scopeDecision exactly EXCLUDE

mutable APPLY IDs ∩ mutable EXCLUDE IDs = empty
all operation IDs across both containers are globally unique
```

The previous F31 PLAN overlap error retains precedence over the broader global-ID duplicate gate.

### Independent validator hardening

Commit:

```text
c6fb4d2c1b8d415581eb14d876f4d84f7a70708b
CII: independently validate partial-HANGER operation containers
```

`cii-workspace-writer2-hanger-partial-validation.js` derives the same canonical-container proof independently. It does not import or call the Writer helper. The validator PASS checklist now includes:

```text
INDEPENDENT_CANONICAL_OPERATION_CONTAINERS
INDEPENDENT_APPLY_EXCLUDE_DISJOINTNESS
```

### Integrated F31-F39 falsifier suite

Existing test path expanded:

```text
tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
```

Extension commit:

```text
4def181b64e70b348bd3540d505765090ece02c2
CII: qualify canonical partial-HANGER scope containers
```

Cases:

```text
F31 PLAN_APPLY_EXCLUDE_OVERLAP
  same mutable ID physically present in APPLY and EXCLUDE plan containers

F32 SCOPE_APPLY_EXCLUDE_OVERLAP
  plan containers canonical but bound-scope testimony claims one ID in both sets

F33 MUTABLE_OPERATION_HIDDEN_WITH_EXCLUDE_DECISION
  mutable row is in operations but marked EXCLUDE

F34 EXCLUDED_OPERATION_FALSELY_MARKED_APPLY
  mutable row is in excludedOperations but marked APPLY

F35 KEEP_ROW_IN_EXCLUDED_OPERATIONS
  KEEP is placed in the excluded container

F36 KEEP_MUTABLE_OPERATION_ID_ALIAS
  a KEEP row and mutable APPLY row share one operationId

F37 EXCLUDED_OPERATIONS_ARRAY_MISSING
  canonical BOUND representation omits the excludedOperations container

F38 BLANK_OPERATION_ID
  physical operation row has no stable operation identity

F39 KEEP_ROW_NON_KEEP_DECISION
  KEEP row in operations is falsely marked APPLY
```

The same suite proves a canonical transaction containing one mutable APPLY row plus a distinct KEEP row is accepted by both scope-custody implementations, while KEEP remains absent from `candidateOperationIds`.

### Observation class

```text
upstream canonical transfer-scope builder             PASS_SOURCE_INSPECTION / UNCHANGED
Writer canonical-container gate                       PASS_SOURCE_INSPECTION
independent validator canonical-container gate         PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
existing focused builders compatibility                PASS_SOURCE_INSPECTION
F31-F39 test source                                    AUTHORED / PASS_SOURCE_INSPECTION
F31-F39 runtime                                        NOT_RUN_ENVIRONMENT
```

No runtime PASS is inferred from source inspection.

## Previous hardening — APPLY/EXCLUDE disjointness

The earlier audit established that `sameStrings()` compares unique sets and could hide a forged representation containing the same mutable operation ID in both APPLY and EXCLUDE. Writer and validator were hardened separately at:

```text
575962cbe8bcc8e30a68758158d774aba2d5c26c  Writer disjointness gate
df9eef839dc7511c6ff2d51bd46c5e9853679fe0  independent validator disjointness gate
```

F31/F32 remain part of the expanded F31-F39 suite; their specific overlap diagnostics are preserved.

## Real-source qualification census retained

Frozen ledger:

```text
docs/cii-writer2-hanger-real-source-census.csv
```

Nine repository CII assets were identified in the qualified census roots:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII                           H=1
Benchmark/CIICompare/BM_CII_TARGET1.CII                          H=0
Benchmark/CIICompare/BM_CII_TARGET2.CII                          H=0
Benchmark/CIICompare/SOURCE 3.CII                                H=0
Benchmark/CIICompare/TARGET 3-1.CII                              H=0
Benchmark/Pipeline/CII                                           H=0
converters/scripts/inputxml_profile_bm_cii_2019.cii              H=1
converters/scripts/inputxml_profile_sys30_b7410250_benchmark.cii H=0
output.cii                                                        H=0
```

Engineering conclusion remains:

```text
REAL_REPOSITORY_H_GT_1_CII_SOURCE = NOT_AVAILABLE
REAL_H_GT_1_PARTIAL_DELETE_ROUNDTRIP = NOT_RUN_NO_REAL_SOURCE
```

No synthetic fixture is represented as real H>1 evidence. `tests/cii-workspace-writer2-hanger-real-source-census.test.js` fails with `REAL_H_GT_1_HANGER_SOURCE_DISCOVERED_REQUIRES_QUALIFICATION` when the first real H>1 repository source appears.

## Packed-row source-shape authority retained

Qualified physical authority remains:

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

Source basis:

```text
converters/scripts/cii2019_hanger_miscel_control.py::_pack_i
Benchmark/CIICompare/BM_CII_SOURCE.CII
converters/scripts/inputxml_profile_bm_cii_2019.cii
```

Rule:

```text
non-final packed row = exactly 2 + 6*13 bytes
final packed row     = exactly 2 + usedFields*13 bytes
extra trailing bytes = 0
```

Writer and validator enforce this independently. `packedTailAuthority` is Writer testimony only.

## Earlier audit / qualification history

- PR1025 merged at `ae1de402...`; PR1027 re-grounded before production implementation.
- Partial writer and independent complete-postimage validator implemented.
- Frozen independent postimage SHA fixtures authored for H3/H7/H13 representative cases.
- Mandatory H=2/3/6/7/8/12/13 packing matrix and F01-F30 were historically exercised under reconstructed-source observation classes.
- Frozen-oracle test harness target-hash bug was fixed without weakening production.
- Pre-merge audit found missing top-level `deletedRecordIndices` testimony comparison; fixed at `8ea0c9df...` and directly falsified at `172467f9...`.
- Packed-row shape was narrowed to exact active-only source rows based on synchronizer emitter + real H=1 vendor/profile evidence.
- Real-source census established that no real H>1 repository source exists and added a future-discovery gate.
- Scope audit found APPLY/EXCLUDE overlap could survive set-equivalence on a forged BOUND object; Writer and independent validator hardened; F31/F32 authored.
- Current batch completed the same trust-boundary audit by enforcing the canonical operation-container representation and expanding the suite through F39.

Historical reconstructed PASS results remain historical; they are not relabelled as native current-head execution.

## Changed-file ledger

Current intended Issue #1026 paths:

```text
agents/MASTER_INDEX.md
agents/PR1027_workreport.md
agents/claims/PR1027.yaml
agents/status/PR1027.yaml
docs/cii-writer2-hanger-partial-physical.md
docs/cii-writer2-hanger-real-source-census.csv
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js
tests/cii-workspace-writer2-hanger-partial-physical.test.js
tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
tests/cii-workspace-writer2-hanger-real-source-census.test.js
tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json
```

Expected reconciliation:

```text
actual: 15
intended: 15
unexplained: 0
new paths this batch: 0
existing production paths hardened this batch: 2
existing test paths expanded this batch: 1
upstream transfer-scope path changed: 0
upstream planner path changed: 0
workflow changes: 0
package.json changes: 0
product/composite/UI route changes: 0
protected parser/converter changes: 0
```

## Validation truth

Historical evidence retained at original observation class:

```text
mandatory packing matrix                         PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED/GROUPED representative cases         PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 +12 preservation                         PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
frozen independent postimage SHA oracles         PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27 / F29-F30                                PASS / FAIL_CLOSED as expected
F28 product/composite gate                       PASS_SOURCE_INSPECTION_AT_TIME
deleted-record testimony falsifier               PASS_FAIL_CLOSED_RECONSTRUCTED_AT_TIME
real BM_CII_SOURCE HANGER slice                  PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
```

Current-head source evidence:

```text
F31 PLAN APPLY/EXCLUDE overlap                   PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F32 bound-SCOPE APPLY/EXCLUDE overlap            PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F33 hidden mutable operation                     PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F34 false APPLY in excludedOperations            PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F35 KEEP in excludedOperations                   PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F36 KEEP/mutable operation-ID alias              PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F37 missing excludedOperations array             PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F38 blank operationId                            PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F39 KEEP decision mismatch                       PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
synchronizer active-only emitter authority       PASS_SOURCE_INSPECTION
BM_CII_SOURCE H=1 active-only shape               PASS_SOURCE_INSPECTION
converter profile H=1 active-only shape           PASS_SOURCE_INSPECTION
repository CII real-source census                 PASS_SOURCE_INSPECTION
real repository H>1 source                        NOT_AVAILABLE
real H>1 physical partial-delete roundtrip        NOT_RUN_NO_REAL_SOURCE
canonical scope-container falsifier               NOT_RUN_ENVIRONMENT
packed-tail integrated test                       NOT_RUN_ENVIRONMENT
real-source census test                           NOT_RUN_ENVIRONMENT
focused current-head native tests                 NOT_RUN_ENVIRONMENT
full BM_CII_SOURCE exact intake/write/re-intake   NOT_RUN_ENVIRONMENT
broader Writer2/product integration               NOT_RUN_ENVIRONMENT
repository-wide npm test                          NOT_RUN_ENVIRONMENT
```

## Negative assurance

No new authority for:

```text
transfer-scope builder mutation
merged HANGER planner mutation
product/core partial-HANGER apply
composite partial HANGER
UI execution
HANGER CREATE/value editing
HGRDAT engineering semantics
SIF CREATE
Writer3 topology
protected parser/converter mutation
package scripts
workflows
```

Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Review / merge disposition

```text
COMPONENT IMPLEMENTATION                    COMPLETE
INDEPENDENT VALIDATOR                       COMPLETE
CANONICAL OPERATION-CONTAINER CUSTODY       HARDENED
SCOPE APPLY/EXCLUDE DISJOINTNESS            HARDENED
F31-F39                                     AUTHORED / NOT_RUN_ENVIRONMENT
PACKED SOURCE-SHAPE AUTHORITY               QUALIFIED
REAL-SOURCE CENSUS                          COMPLETE
REAL H>1 SOURCE                             NOT_AVAILABLE
REAL H>1 ROUNDTRIP                          NOT_RUN_NO_REAL_SOURCE
CURRENT-HEAD NATIVE TEST EXECUTION          NOT_RUN_ENVIRONMENT
RUNTIME ADOPTION                            NONE / COMPONENT_ISOLATED
HANDOVER READINESS                          READY
REVIEW READINESS                            READY_WITH_EXPLICIT_EVIDENCE_LIMITATIONS
MERGE AUTHORITY                             OWNER_ONLY
MERGE AUTHORIZED                            FALSE
```

Do not merge without fresh owner authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

1. Derive H=7 -> H'=6 and explain why the five packed families must repack raw I13 fields rather than delete physical rows.
2. Explain why upstream `applyCiiTransferScope()` being canonical by construction does not remove PR1027's obligation to validate a caller-supplied BOUND component object.
3. Distinguish F31/F32 set-overlap defects from F33-F39 physical container/decision/identity defects. Explain why all are required.
4. Explain why a mutable row marked EXCLUDE inside `operations` is dangerous even if scope set comparison filters it out, using the merged planner's APPLY-only selection behavior.
5. Explain why KEEP IDs must be globally unique relative to mutable IDs even though KEEP rows are intentionally absent from `candidateOperationIds`.
6. Explain why `SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY` is stricter than PR1025 planner tolerance and cite emitter + real H=1 evidence.
7. Explain why absence of a real repository H>1 preimage remains `NOT_AVAILABLE / NOT_RUN_NO_REAL_SOURCE` rather than being filled by a synthetic “real” fixture.

Threshold: 92/100 overall and each answer >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as the single component stack.
- 2026-08-22: PR1025 merged at `ae1de402...`; PR1027 re-grounded before production coding.
- 2026-08-22: physical partial writer, independent validator, mandatory matrix/falsifier tests and frozen postimage SHA oracles authored.
- 2026-08-23: deleted-record Writer testimony gap found, fixed and falsified.
- 2026-08-23: packed-row source shape narrowed fail-closed to active-fields-only using synchronizer emitter + real H=1 source evidence.
- 2026-08-23: repository real-source census frozen; no H>1 source exists; future H>1 discovery converted to a qualification trigger.
- 2026-08-23: scope audit found APPLY/EXCLUDE overlap could survive set-equivalence on a forged BOUND object; Writer and independent validator hardened; F31/F32 authored.
- 2026-08-23: canonical operation-container custody hardened; F31/F32 retained and suite expanded through F39 without adding a new PR path.
