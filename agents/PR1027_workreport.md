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
CURRENT_STAGE: REAL_SOURCE_CENSUS_COMPLETE_REVIEW_PENDING
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
EVIDENCE_LIMITATION: NO_REAL_REPOSITORY_H_GT_1_CII_PREIMAGE
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its planner/record-binding authority is consumed read-only.

## Current engineering transaction

```text
qualified merged-PR1025 partial H>1 HANGER plan
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

## Current batch — real-source qualification census

### Mission

Before claiming a real H>1 qualification, locate an actual repository CII preimage with `CONTROL.NOHGRS > 1`. If none exists, record that absence explicitly and make future discovery a qualification trigger rather than manufacturing a source.

### Source census result

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

Exact notable source custody:

```text
BM_CII_SOURCE.CII
  blob e41cd05603b56837cbb6e31b9d4074ef6106fe9b
  NUMELT=40 NUMNOZ=0 NOHGRS=1

SOURCE 3.CII
  blob 20c0c37014004fb9de46e3e4d01f0c62535495d5
  NUMELT=219 NUMNOZ=0 NOHGRS=0

TARGET 3-1.CII
  blob b79806ac2082e8355bfcd323d7e6496439759a5a
  NUMELT=223 NUMNOZ=0 NOHGRS=0

inputxml_profile_bm_cii_2019.cii
  blob c72c0ee3c7a2e9a36d849085fbc8fc5b8757bca8
  NUMELT=40 NUMNOZ=0 NOHGRS=1
```

The associated `converters/scripts/pdf_inputxml_profile_bm_cii.xml` declares `NOHGRS="0"`; repository search for `<HANGER` found converter implementation references but no real multi-HANGER InputXML fixture.

### Engineering conclusion

```text
REAL_REPOSITORY_H_GT_1_CII_SOURCE = NOT_AVAILABLE
REAL_H_GT_1_PARTIAL_DELETE_ROUNDTRIP = NOT_RUN_NO_REAL_SOURCE
```

This is an evidence limitation, not a fallback. PR1027 does not synthesize a “real” H>1 benchmark and does not upgrade synthetic qualification to real-source authority.

### Independent discovery gate

Added:

```text
tests/cii-workspace-writer2-hanger-real-source-census.test.js
```

The test does not import Writer2 mutation helpers. It independently:

1. inventories `.cii` assets under `Benchmark/` and `converters/scripts/`, plus `Benchmark/Pipeline/CII` and root `output.cii`;
2. parses CONTROL NUMELT/NUMNOZ/NOHGRS from raw source text;
3. compares inventory/counts to the frozen CSV ledger;
4. fails with `REAL_H_GT_1_HANGER_SOURCE_DISCOVERED_REQUIRES_QUALIFICATION` if any source has H>1;
5. for each H=1 source, derives the MISCEL_1 H=1 row model and proves IHGRNODE/IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN are exactly `2X + 1*I13` (15 chars);
6. fails on source-census drift.

Future addition of a real H>1 file therefore requires deliberate qualification of tail order, packed arrays, positional record binding and an actual partial-delete postimage before the census can advance.

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
- Packed-row shape was subsequently narrowed to exact active-only source rows based on synchronizer emitter + real H=1 vendor evidence.
- Current batch established that no real H>1 repository source exists and added a future-discovery gate.

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
tests/cii-workspace-writer2-hanger-real-source-census.test.js
tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json
```

Expected reconciliation:

```text
actual: 14
intended: 14
unexplained: 0
production paths added this batch: 0
test paths added this batch: 1
document/data paths added this batch: 1
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
synchronizer active-only emitter authority       PASS_SOURCE_INSPECTION
BM_CII_SOURCE H=1 active-only shape               PASS_SOURCE_INSPECTION
converter profile H=1 active-only shape           PASS_SOURCE_INSPECTION
repository CII real-source census                 PASS_SOURCE_INSPECTION
real repository H>1 source                        NOT_AVAILABLE
real H>1 physical partial-delete roundtrip        NOT_RUN_NO_REAL_SOURCE
packed-tail integrated test                       AUTHORED / NOT_RUN_ENVIRONMENT
real-source census test                           AUTHORED / NOT_RUN_ENVIRONMENT
focused current-head native tests                 NOT_RUN_ENVIRONMENT
full BM_CII_SOURCE exact intake/write/re-intake   NOT_RUN_ENVIRONMENT
broader Writer2/product integration               NOT_RUN_ENVIRONMENT
repository-wide npm test                          NOT_RUN_ENVIRONMENT
```

## Negative assurance

No new authority for:

```text
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
2. Derive GROUPED H=3 delete-record2 HGRDAT/TAG/GUID retained row order.
3. Explain why `SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY` is stricter than PR1025 planner tolerance and cite both emitter and real H=1 evidence.
4. Explain why the absence of a real repository H>1 preimage must remain `NOT_AVAILABLE / NOT_RUN_NO_REAL_SOURCE` rather than being filled by a synthetic “real” fixture.
5. Explain how the new source-census test turns the first future real H>1 file into a fail-closed qualification event without changing production routing.

Threshold: 92/100 overall and each answer >=17/20.
