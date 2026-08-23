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

Issue #1026 requires the unused-field representation of a partially occupied packed row to be source-qualified and deterministic.

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

Two independent sources establish this boundary:

1. `converters/scripts/cii2019_hanger_miscel_control.py::_pack_i` chunks only actual values and `_format_i` emits `2X + n*I13`.
2. Real vendor `Benchmark/CIICompare/BM_CII_SOURCE.CII` H=1 uses active-only one-value packed rows, including `IHGRNODE=205`.

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

- source/target scope hashes and operation sets;
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

The next qualification batch searched the repository's real/benchmark/profile CII sources for a physical `NOHGRS > 1` preimage before attempting to claim a real H>1 roundtrip.

Frozen source ledger:

```text
docs/cii-writer2-hanger-real-source-census.csv
```

Nine repository CII assets were identified in the qualified census roots:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII                         H=1
Benchmark/CIICompare/BM_CII_TARGET1.CII                        H=0
Benchmark/CIICompare/BM_CII_TARGET2.CII                        H=0
Benchmark/CIICompare/SOURCE 3.CII                              H=0
Benchmark/CIICompare/TARGET 3-1.CII                            H=0
Benchmark/Pipeline/CII                                         H=0
converters/scripts/inputxml_profile_bm_cii_2019.cii            H=1
converters/scripts/inputxml_profile_sys30_b7410250_benchmark.cii H=0
output.cii                                                      H=0
```

The two large CAESAR neutral files (`SOURCE 3.CII` and `TARGET 3-1.CII`) both have `NOHGRS=0`; the real vendor BM source has `NOHGRS=1`. The associated repository InputXML profile `pdf_inputxml_profile_bm_cii.xml` also declares `NOHGRS="0"` and does not provide H>1 authority.

**Result:** there is currently no repository real CII preimage with `NOHGRS > 1`. No real H>1 physical-delete transaction is therefore claimed or manufactured in this PR.

This is an evidence limitation, not a software fallback.

### Real-source discovery/qualification gate

```text
tests/cii-workspace-writer2-hanger-real-source-census.test.js
```

The test is intentionally independent of Writer2 mutation helpers. It:

1. recursively inventories repository CII assets under `Benchmark/` and `converters/scripts/`, plus root `output.cii`;
2. independently parses `CONTROL` NUMELT/NUMNOZ/NOHGRS;
3. compares the current inventory/counts with the frozen CSV ledger;
4. fails with `REAL_H_GT_1_HANGER_SOURCE_DISCOVERED_REQUIRES_QUALIFICATION` if any real source has H>1;
5. for every current H=1 source, independently derives the MISCEL_1 H=1 row model and proves all five packed arrays are exactly `2X + 1*I13` (15 characters);
6. fails on source-census drift so added/removed CII evidence cannot silently bypass qualification.

A future real H>1 source is therefore an explicit **qualification trigger**: its tail order, five packed families, positional binding and actual partial-delete postimage must be qualified before this evidence ledger can be advanced.

## Earlier audit/hardening history

The 2026-08-23 pre-merge audit found top-level `writerResult.deletedRecordIndices` testimony was not separately checked. It was fixed at `8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84`, with dedicated falsifier `172467f96f4f417dc2639adeec2a5d8ba558fa61`.

Packed-row source-shape hardening then added exact active-only source gating in writer and independent validator, plus `tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js`.

Historical pre-packed-shape qualification includes the mandatory H=2/3/6/7/8/12/13 matrix, INTERLEAVED/GROUPED cases, raw-I13 `+12`, frozen independent postimage SHA oracles, F01-F30 and predecessor/delete-all slices under their recorded reconstructed-source observation classes.

Those historical passes are not silently relabelled as current-head native execution.

## Current observation classes

```text
synchronizer emitter active-only authority           PASS_SOURCE_INSPECTION
real BM_CII_SOURCE H=1 packed shape                   PASS_SOURCE_INSPECTION
converter-profile H=1 packed shape                    PASS_SOURCE_INSPECTION
real-source repository census                         PASS_SOURCE_INSPECTION
real H>1 repository preimage                          NOT_AVAILABLE
real H>1 partial-delete roundtrip                     NOT_RUN_NO_REAL_SOURCE
packed-tail integrated test                           AUTHORED / NOT_RUN_ENVIRONMENT
real-source census test                               AUTHORED / NOT_RUN_ENVIRONMENT
all focused current-head tests                        NOT_RUN_ENVIRONMENT
full-file BM_CII_SOURCE intake -> write -> re-intake  NOT_RUN_ENVIRONMENT
broader Writer2/product regression                    NOT_RUN_ENVIRONMENT
repository-wide npm test                              NOT_RUN_ENVIRONMENT
```

## Product/runtime boundary

The partial writer and validator remain component-isolated. Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Release disposition

```text
component implementation                    COMPLETE
independent complete-postimage design        COMPLETE
record-testimony audit defect                FIXED + FALSIFIED
packed source-shape authority                QUALIFIED
real HANGER source census                    COMPLETE
real H>1 repository source                   NOT_AVAILABLE
real H>1 roundtrip evidence                  NOT_RUN_NO_REAL_SOURCE
runtime product adoption                     NONE
merge authority                              OWNER_ONLY
merge authorized                             FALSE
```

Do not merge without fresh owner authorization.
