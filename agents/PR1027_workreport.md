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
CURRENT_STAGE: SCOPE_DISJOINTNESS_HARDENED_REVIEW_PENDING
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
EVIDENCE_LIMITATION: NO_REAL_REPOSITORY_H_GT_1_CII_PREIMAGE
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its planner/record-binding authority is consumed read-only.

## Current engineering transaction

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ canonical BOUND APPLY/EXCLUDE scope with disjoint authority sets
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

## Current batch — canonical APPLY/EXCLUDE disjointness hardening

### Finding

The normal repository scope builder in:

```text
tabs/cii-workspace/cii-workspace-transfer-scope.js
```

is disjoint by construction. `applyCiiTransferScope()` creates one `decisionMap`, each mutable operation ID receives exactly one decision, and the operation is emitted either into `operations` with `scopeDecision=APPLY` or into `excludedOperations` with `scopeDecision=EXCLUDE`.

PR1027 must nevertheless treat the supplied `transferPlan` as an untrusted boundary object because its physical writer/validator are callable component APIs. The previous component checks validated:

```text
PLAN APPLY IDs == scope.appliedOperationIds
PLAN EXCLUDE IDs == scope.excludedOperationIds
PLAN candidate IDs == scope.candidateOperationIds
```

but comparison used `sameStrings()`, which normalizes through a `Set`. A forged BOUND object could therefore carry the same mutable `operationId` in both APPLY and EXCLUDE while the candidate set remained a single unique ID. Set-equivalence alone did not prove mutual exclusivity.

This was a custody defect, not a defect in the upstream canonical scope builder.

### Production hardening

Writer commit:

```text
575962cbe8bcc8e30a68758158d774aba2d5c26c
```

`cii-workspace-writer2-hanger-partial-write.js` now independently requires:

```text
PLAN appliedOperationIds ∩ PLAN excludedOperationIds = ∅
SCOPE appliedOperationIds ∩ SCOPE excludedOperationIds = ∅
```

Dedicated fail-closed diagnostics:

```text
CII_WRITER_2_HANGER_PARTIAL_PLAN_APPLY_EXCLUDE_OVERLAP:<ids>
CII_WRITER_2_HANGER_PARTIAL_SCOPE_APPLY_EXCLUDE_OVERLAP:<ids>
```

Validator commit:

```text
df9eef839dc7511c6ff2d51bd46c5e9853679fe0
```

`cii-workspace-writer2-hanger-partial-validation.js` implements the disjointness derivation separately. It does not import the Writer helper. The validation PASS checklist now includes:

```text
INDEPENDENT_APPLY_EXCLUDE_DISJOINTNESS
```

### F31 / F32 falsifier

Added:

```text
tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
```

Commits:

```text
28d45aa25ce763db9d3700479c5011cf3e3b2470  test authored
74c935b8531899f2d97abcda495849ed290338e6  test EOF normalized
```

Cases:

```text
F31 PLAN_APPLY_EXCLUDE_OVERLAP
  same operation ID physically present in both transferPlan.operations(APPLY)
  and transferPlan.excludedOperations(EXCLUDE)
  -> Writer rejects before physical mutation
  -> independent validator rejects

F32 SCOPE_APPLY_EXCLUDE_OVERLAP
  plan representation is disjoint but transferScope testimony claims the same
  operation ID in both appliedOperationIds and excludedOperationIds
  -> Writer rejects before set-equivalence comparison
  -> independent validator rejects before set-equivalence comparison
```

The test also proves the normal one-APPLY/zero-EXCLUDE custody object remains accepted by both scope-check implementations.

### Observation class

```text
upstream canonical builder                         PASS_SOURCE_INSPECTION / UNCHANGED
Writer disjointness gate                           PASS_SOURCE_INSPECTION
independent validator disjointness gate             PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F31/F32 test source                                AUTHORED / PASS_SOURCE_INSPECTION
F31/F32 runtime                                    NOT_RUN_ENVIRONMENT
```

No runtime PASS is inferred from source inspection.

## Previous batch — real-source qualification census

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
- Current batch found the APPLY/EXCLUDE set-comparison ambiguity and added explicit disjointness gates in Writer and independent validator plus F31/F32.

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
new path this batch: tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
existing production paths hardened this batch: 2
upstream transfer-scope path changed: 0
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
synchronizer active-only emitter authority       PASS_SOURCE_INSPECTION
BM_CII_SOURCE H=1 active-only shape               PASS_SOURCE_INSPECTION
converter profile H=1 active-only shape           PASS_SOURCE_INSPECTION
repository CII real-source census                 PASS_SOURCE_INSPECTION
real repository H>1 source                        NOT_AVAILABLE
real H>1 physical partial-delete roundtrip        NOT_RUN_NO_REAL_SOURCE
scope-disjointness falsifier                      NOT_RUN_ENVIRONMENT
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
COMPONENT IMPLEMENTATION                 COMPLETE
INDEPENDENT VALIDATOR                    COMPLETE
SCOPE APPLY/EXCLUDE DISJOINTNESS         HARDENED
F31/F32                                  AUTHORED / NOT_RUN_ENVIRONMENT
PACKED SOURCE-SHAPE AUTHORITY            QUALIFIED
REAL-SOURCE CENSUS                       COMPLETE
REAL H>1 SOURCE                          NOT_AVAILABLE
REAL H>1 ROUNDTRIP                       NOT_RUN_NO_REAL_SOURCE
CURRENT-HEAD NATIVE TEST EXECUTION       NOT_RUN_ENVIRONMENT
RUNTIME ADOPTION                         NONE / COMPONENT_ISOLATED
HANDOVER READINESS                       READY
REVIEW READINESS                         READY_WITH_EXPLICIT_EVIDENCE_LIMITATIONS
MERGE AUTHORITY                          OWNER_ONLY
MERGE AUTHORIZED                         FALSE
```

Do not merge without fresh owner authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

1. Derive H=7 -> H'=6 and explain why the five packed families must repack raw I13 fields rather than delete physical rows.
2. Explain the distinction between the upstream canonical transfer-scope builder being disjoint by construction and PR1027 still needing to reject a forged contradictory BOUND `transferPlan` at its component boundary.
3. Explain exactly how `sameStrings()` could hide APPLY/EXCLUDE overlap and why F31 and F32 are separate falsifiers.
4. Explain why `SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY` is stricter than PR1025 planner tolerance and cite emitter + real H=1 evidence.
5. Explain why absence of a real repository H>1 preimage remains `NOT_AVAILABLE / NOT_RUN_NO_REAL_SOURCE` rather than being filled by a synthetic “real” fixture.

Threshold: 92/100 overall and each answer >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as the single component stack.
- 2026-08-22: PR1025 merged at `ae1de402...`; PR1027 re-grounded before production coding.
- 2026-08-22: physical partial writer, independent validator, mandatory matrix/falsifier tests and frozen postimage SHA oracles authored.
- 2026-08-23: deleted-record Writer testimony gap found, fixed and falsified.
- 2026-08-23: packed-row source shape narrowed fail-closed to active-fields-only using synchronizer emitter + real H=1 source evidence.
- 2026-08-23: repository real-source census frozen; no H>1 source exists; future H>1 discovery converted to a qualification trigger.
- 2026-08-23: scope audit found APPLY/EXCLUDE overlap could survive set-equivalence on a forged BOUND object; Writer and independent validator hardened; F31/F32 authored.
