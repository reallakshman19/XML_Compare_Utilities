# CII Writer 2 — partial H>1 HANGER physical compaction

## Scope

Issue #1026 / PR #1027 qualifies the **component-level** physical transaction for deleting one or more existing HANGER records when:

```text
H > 1
0 < deleted records < H
H' > 0
layout = CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

Planner/positional binding authority is inherited read-only from merged PR #1025 at `main@ae1de402db129e32cd6d7811a4e4707d64512bd4`.

No product/composite/UI partial-HANGER route is added. HANGER CREATE/value editing, SIF CREATE, Writer3 topology, restraint/process cardinality, protected parsers/converters, package scripts and workflows remain outside this PR.

## Governing positional record authority

A physical partial transaction requires:

```text
plannerPartialRecordAuthority = true
partialRecordCompactionAuthorized = true
recordBindingAuthority =
  PHYSICAL_ROW_SHAPE_PLUS_DUAL_EMITTER_ORDER+POSITIONAL_HANGER_ARRAY_RECORD_INDEX
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

Original record index `i` binds:

```text
IHGRNODE[i]
HGRDAT1/HGRDAT2 record i
TAG/GUID record i
IHGRFREE row i
IHGRNUM[i]
IHGRTABLE[i]
IHGRSHORT[i]
IHGRCN[i]
```

The writer relocates already-qualified physical records. It does not infer HGRDAT engineering semantics.

## Canonical transfer-scope and operation-container custody

The normal repository transfer-scope builder, `cii-workspace-transfer-scope.js::applyCiiTransferScope()`, uses one decision map and emits a canonical transaction representation:

```text
operations[]
  mutable selected rows -> scopeDecision = APPLY
  unchanged rows        -> scopeDecision = KEEP

excludedOperations[]
  mutable excluded rows -> scopeDecision = EXCLUDE
```

The upstream builder is unchanged by PR1027. PR1027 nevertheless treats a caller-supplied already-BOUND `transferPlan` as untrusted component input.

### Disjointness authority

Set equality alone is insufficient because helpers that normalize through `Set` can hide duplicate authority. PR1027 therefore requires:

```text
PLAN appliedOperationIds ∩ PLAN excludedOperationIds = ∅
SCOPE appliedOperationIds ∩ SCOPE excludedOperationIds = ∅
```

Writer/validator disjointness commits:

```text
575962cbe8bcc8e30a68758158d774aba2d5c26c  Writer
df9eef839dc7511c6ff2d51bd46c5e9853679fe0  independent validator
```

### Canonical physical-container authority

The audit then continued beyond F31/F32. The old component boundary derived custody only from rows that already matched APPLY/EXCLUDE filters. A malformed BOUND object could therefore contain authority-bearing rows that were simply filtered out.

Before planner execution, PR1027 now requires:

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

all operation IDs across operations + excludedOperations are globally unique
```

This matters because the merged HANGER planner selects physical mutations only from `transferPlan.operations` rows whose `scopeDecision` is APPLY. A mutable row hidden in the wrong container or behind EXCLUDE/UNBOUND must therefore be rejected, not ignored.

Writer/validator container-custody commits:

```text
4a9f2f7daf6b7c50f776a4b8ad569df76ada1106  Writer canonical-container gate
c6fb4d2c1b8d415581eb14d876f4d84f7a70708b  independent validator gate
```

The validator implements the container proof locally and does not import Writer helpers. Its PASS checklist includes:

```text
INDEPENDENT_CANONICAL_OPERATION_CONTAINERS
INDEPENDENT_APPLY_EXCLUDE_DISJOINTNESS
```

### F31-F39 qualification source

```text
tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
```

The integrated suite covers:

```text
F31 PLAN_APPLY_EXCLUDE_OVERLAP
F32 SCOPE_APPLY_EXCLUDE_OVERLAP
F33 MUTABLE_OPERATION_HIDDEN_WITH_EXCLUDE_DECISION
F34 EXCLUDED_OPERATION_FALSELY_MARKED_APPLY
F35 KEEP_ROW_IN_EXCLUDED_OPERATIONS
F36 KEEP_MUTABLE_OPERATION_ID_ALIAS
F37 EXCLUDED_OPERATIONS_ARRAY_MISSING
F38 BLANK_OPERATION_ID
F39 KEEP_ROW_NON_KEEP_DECISION
```

The same test source proves one distinct KEEP row is valid in `operations` with `scopeDecision=KEEP` and does not enter `candidateOperationIds`.

Current observation class:

```text
Writer gate                                  PASS_SOURCE_INSPECTION
independent validator gate                   PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F31-F39 test source                          AUTHORED / PASS_SOURCE_INSPECTION
F31-F39 runtime                              NOT_RUN_ENVIRONMENT
```

## Physical row model

```text
rrmatRows  = ceil(NUMELT / 6)
nozzleRows = NUMNOZ * 4
packedRows = ceil(H / 6)

hangerRows(H)
 = 2 + packedRows + 4*H + H + 4*packedRows
 = 2 + 5*H + 5*ceil(H/6)
```

MISCEL_1 physical order:

```text
RRMAT / VFLEX prefix
2 default hanger rows
IHGRNODE packed rows
HGRDAT / TAG / GUID envelope
IHGRFREE rows
IHGRNUM packed rows
IHGRTABLE packed rows
IHGRSHORT packed rows
IHGRCN packed rows
4 execution rows
```

## One-TARGET0 transaction

The writer operates from one untouched TARGET0 byte string and constructs exactly two original-coordinate replacements:

```text
CONTROL_HANGER_COUNT
  CONTROL.NOHGRS: H -> H'

MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
  complete HANGER-region reconstruction
```

Both preimages are checked and both replacements are applied in one splice pass. No sequential writer chaining or downstream offset-adjust authority is used.

## Exact raw-I13 repacking

The five packed arrays are:

```text
IHGRNODE
IHGRNUM
IHGRTABLE
IHGRSHORT
IHGRCN
```

Compaction is **field repacking**, not row deletion. Every retained 13-byte field is copied lexically and all five families use the same retained-record sequence. A token such as `"          +12"` must remain byte-identical; numeric parse/reformat is not equivalent.

## Packed-row source-shape authority

Qualified source shape:

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

For packed row `r`:

```text
full non-final row length = 2 + 6*13 = 80 bytes
final row length          = 2 + usedFields*13 bytes
unused physical fields    = omitted
```

There is no authority to pad unused fields with spaces, tabs or arbitrary trailing bytes.

Source basis:

1. `converters/scripts/cii2019_hanger_miscel_control.py::_pack_i` chunks only actual values and `_format_i` emits `2X + n*I13`.
2. Real vendor `Benchmark/CIICompare/BM_CII_SOURCE.CII` H=1 uses active-only one-value packed rows, including `IHGRNODE=205`.
3. `converters/scripts/inputxml_profile_bm_cii_2019.cii` independently carries the same active-only H=1 shape.

PR1025's planner is intentionally broader and may tolerate whitespace-only trailing text while establishing positional ownership. PR1027 narrows **physical write authority** fail-closed: any packed source row whose length differs from the exact active-only shape is rejected before mutation.

Writer testimony includes:

```text
packedTailAuthority = SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

The independent validator defines that authority locally rather than importing the writer constant.

## Tail-order preservation

Qualified HGRDAT/TAG/GUID forms:

```text
INTERLEAVED
  HGRDAT1[i], HGRDAT2[i], TAG[i], GUID[i]

GROUPED
  all HGRDAT pairs, then all TAG/GUID pairs
```

The original order class is preserved. GROUPED is never canonicalized to INTERLEAVED or vice versa. When H'=1, the postimage can only prove `SINGLE_RECORD_ORDER_EQUIVALENT`; writer testimony still records the qualified preimage order class.

## IHGRFREE custody

IHGRFREE is one physical row per hanger record. Retained rows are copied according to the same `retainedRecordIndices` used by the tail and all five packed arrays.

## Delete-all boundary

The partial writer rejects `countAfter == 0`. That remains the unchanged PR1020 delete-all writer path.

## Independent complete-postimage validator

`cii-workspace-writer2-hanger-partial-validation.js` does not import or call the partial writer or its payload/repacking helpers.

From TARGET0 + canonical scope + merged planner authority it independently rebuilds:

- source/target scope hashes;
- canonical `operations` / `excludedOperations` representation;
- nonblank globally unique operation identities;
- APPLY/EXCLUDE disjointness for plan and bound-scope testimony;
- partial delete plan;
- deleted/retained record map and old-to-new map;
- exact active-only source packed-row shape for all five families;
- CONTROL replacement;
- all five raw-I13 packed arrays;
- retained HGRDAT/TAG/GUID rows;
- retained IHGRFREE rows;
- complete MISCEL_1;
- complete expected final CII byte string.

Primary acceptance criterion:

```text
actual final bytes === independently reconstructed expected final bytes
```

Writer testimony is secondary evidence only. Counts, deleted/retained/old-to-new maps, packed row counts, `packedTailAuthority`, tail order, mutation testimony, scope custody, nested delete-plan testimony and byte lengths are checked separately.

## Real repository source census — 2026-08-23

Frozen source ledger:

```text
docs/cii-writer2-hanger-real-source-census.csv
```

Qualified inventory:

```text
repository CII assets = 9
NOHGRS=0 assets       = 7
NOHGRS=1 assets       = 2
NOHGRS>1 assets       = 0
```

H=1 sources:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
converters/scripts/inputxml_profile_bm_cii_2019.cii
```

The two large CAESAR neutral files (`SOURCE 3.CII` and `TARGET 3-1.CII`) both have `NOHGRS=0`. The associated repository InputXML profile `pdf_inputxml_profile_bm_cii.xml` also declares `NOHGRS="0"` and does not provide H>1 authority.

**Result:** there is currently no repository real CII preimage with `NOHGRS > 1`. No real H>1 physical-delete transaction is therefore claimed or manufactured in this PR.

```text
REAL_REPOSITORY_H_GT_1_CII_SOURCE = NOT_AVAILABLE
REAL_H_GT_1_PARTIAL_DELETE_ROUNDTRIP = NOT_RUN_NO_REAL_SOURCE
```

This is an evidence limitation, not a software fallback.

### Real-source discovery/qualification gate

```text
tests/cii-workspace-writer2-hanger-real-source-census.test.js
```

The test is intentionally independent of Writer2 mutation helpers. It inventories the repository CII evidence roots, derives CONTROL counts, compares them to the frozen census, validates the active-only H=1 shape, and fails with:

```text
REAL_H_GT_1_HANGER_SOURCE_DISCOVERED_REQUIRES_QUALIFICATION
```

when the first real H>1 source appears.

A future real H>1 source is therefore an explicit qualification trigger: its tail order, five packed families, positional binding and actual partial-delete postimage must be qualified before the evidence ledger advances.

## Earlier audit/hardening history

- Top-level `writerResult.deletedRecordIndices` testimony gap fixed at `8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84`, with dedicated falsifier `172467f96f4f417dc2639adeec2a5d8ba558fa61`.
- Packed-row source shape narrowed to exact active-only source rows using synchronizer emitter + real H=1 evidence.
- Scope disjointness hardened independently in Writer and validator for F31/F32.
- Canonical operation-container custody then extended that boundary through F39 without modifying the upstream transfer-scope builder or merged planner.
- Historical pre-packed-shape qualification includes the mandatory H=2/3/6/7/8/12/13 matrix, INTERLEAVED/GROUPED cases, raw-I13 `+12`, frozen independent postimage SHA oracles, F01-F30 and predecessor/delete-all slices under their recorded reconstructed-source observation classes.

Those historical passes are not silently relabelled as current-head native execution.

## Current observation classes

```text
F31 PLAN APPLY/EXCLUDE overlap                       PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F32 bound-SCOPE APPLY/EXCLUDE overlap                PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F33 hidden mutable operation                         PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F34 false APPLY in excludedOperations                PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F35 KEEP in excludedOperations                       PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F36 KEEP/mutable operation-ID alias                  PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F37 missing excludedOperations array                 PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F38 blank operationId                                PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F39 KEEP decision mismatch                           PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
canonical scope-container falsifier runtime          NOT_RUN_ENVIRONMENT
synchronizer emitter active-only authority           PASS_SOURCE_INSPECTION
real BM_CII_SOURCE H=1 packed shape                   PASS_SOURCE_INSPECTION
converter-profile H=1 packed shape                    PASS_SOURCE_INSPECTION
real-source repository census                         PASS_SOURCE_INSPECTION
real H>1 repository preimage                          NOT_AVAILABLE
real H>1 partial-delete roundtrip                     NOT_RUN_NO_REAL_SOURCE
packed-tail integrated test                           NOT_RUN_ENVIRONMENT
real-source census test                               NOT_RUN_ENVIRONMENT
all focused current-head tests                        NOT_RUN_ENVIRONMENT
full-file BM_CII_SOURCE intake -> write -> re-intake  NOT_RUN_ENVIRONMENT
broader Writer2/product regression                    NOT_RUN_ENVIRONMENT
repository-wide npm test                              NOT_RUN_ENVIRONMENT
```

## Product/runtime boundary

The partial writer and validator remain component-isolated. Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Release disposition

```text
component implementation                         COMPLETE
independent complete-postimage design             COMPLETE
canonical operation-container custody             HARDENED
scope APPLY/EXCLUDE disjointness                  HARDENED
F31-F39                                           AUTHORED / NOT_RUN_ENVIRONMENT
record-testimony audit defect                     FIXED + FALSIFIED
packed source-shape authority                     QUALIFIED
real HANGER source census                         COMPLETE
real H>1 repository source                        NOT_AVAILABLE
real H>1 roundtrip evidence                       NOT_RUN_NO_REAL_SOURCE
runtime product adoption                          NONE
merge authority                                   OWNER_ONLY
merge authorized                                  FALSE
```

Do not merge without fresh owner authorization.
