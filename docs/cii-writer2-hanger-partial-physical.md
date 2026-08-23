# CII Writer 2 — partial H>1 HANGER physical compaction

## Scope

Issue #1026 / PR #1027 qualifies the **component-level** physical transaction for deleting one or more existing HANGER records when:

```text
H > 1
0 < deleted records < H
H' > 0
layout = CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

Planner/positional binding authority is inherited read-only from merged PR #1025 at:

```text
main@ae1de402db129e32cd6d7811a4e4707d64512bd4
```

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
1. CONTROL_HANGER_COUNT
   CONTROL.NOHGRS: H -> H'

2. MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
   complete HANGER region reconstruction
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

Compaction is **field repacking**, not row deletion. Every retained 13-byte field is copied lexically and all five families use the same retained-record sequence.

A source token such as:

```text
"          +12"
```

must remain exactly that token. Numeric parse/reformat is not byte-equivalent.

## Packed-row source-shape authority

Issue #1026 requires the unused-field representation of a partially occupied packed row to be source-qualified and deterministic.

The qualified source shape is:

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

For packed row `r`:

```text
full non-final row length = 2 + 6*13 = 80 bytes
final row length          = 2 + usedFields*13 bytes
unused physical fields    = omitted
```

There is **no authority to pad unused fields with spaces, tabs or arbitrary trailing bytes**.

This boundary is supported by two independent repository sources:

1. `converters/scripts/cii2019_hanger_miscel_control.py`

```python
def _format_i(values):
    return "  " + "".join(f"{int(value):13d}" for value in values)

def _pack_i(values, width=6):
    return [_format_i(values[index:index + width])
            for index in range(0, len(values), width)]
```

`_pack_i` therefore emits only active values in the final chunk.

2. Real vendor benchmark `Benchmark/CIICompare/BM_CII_SOURCE.CII`

The H=1 MISCEL_1 HANGER arrays show active-only one-value packed rows, including `IHGRNODE=205`; no unused blank I13 slots are present.

PR1025's planner is intentionally broader and may tolerate whitespace-only trailing text while establishing positional record ownership. PR1027 narrows the **physical write authority** fail-closed: a source packed row whose byte length is not the exact active-only length is rejected before mutation.

The writer records:

```text
packedTailAuthority = SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

The independent validator defines the same authority locally; it does not import the writer constant or writer repacking helpers.

## Tail-order preservation

Qualified HGRDAT/TAG/GUID forms:

```text
INTERLEAVED
  HGRDAT1[i], HGRDAT2[i], TAG[i], GUID[i]

GROUPED
  all HGRDAT pairs, then all TAG/GUID pairs
```

The original order class is preserved. GROUPED is never canonicalized to INTERLEAVED or vice versa.

When H'=1, the postimage can only prove `SINGLE_RECORD_ORDER_EQUIVALENT`; writer testimony still records the qualified preimage order class.

## IHGRFREE custody

IHGRFREE is one physical row per hanger record. Retained rows are copied according to the same `retainedRecordIndices` used by the tail and all five packed arrays.

## Delete-all boundary

The partial writer rejects:

```text
countAfter == 0
```

That remains the unchanged PR1020 delete-all writer path.

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

Writer testimony is secondary evidence only. The validator separately checks counts, deleted/retained/old-to-new maps, packed row counts, `packedTailAuthority`, tail order, mutation testimony, scope custody, nested delete-plan testimony and byte lengths.

## Pre-merge testimony correction

A 2026-08-23 audit found that top-level `writerResult.deletedRecordIndices` was not separately compared with the independently rebuilt plan.

Corrected at:

```text
8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84
```

Dedicated regression:

```text
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

Observed reconstructed behavior:

```text
H=3 delete record2
correct deletedRecordIndices=[2] -> PASS
forged  deletedRecordIndices=[1] -> FAIL_CLOSED
```

## Packed-row source-shape hardening batch

Production/validation commits in the batch include:

```text
b4afb09c  initial packed-tail custody gate
ec86dea3  writer tightened to exact active-only source rows
d0159b06  validator independently tightened to exact active-only source rows
4cd43b7b  qualification suite isolates the new physical gate
```

Qualification file:

```text
tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js
```

It covers as one integrated suite:

- H=8 active-only source -> H'=7 active-only post shape;
- H=6 full six-field source -> H'=5 five-field post shape;
- all five packed families reject planner-tolerated space padding;
- tab padding rejects fail-closed;
- forged `packedTailAuthority` testimony rejects;
- reintroduced postimage padding rejects via exact-byte oracle.

The execution container cannot resolve GitHub and cannot create a native checkout, so this newly authored suite is currently:

```text
SOURCE_AUTHORITY_AUDITED
TEST_AUTHORED
NOT_RUN_ENVIRONMENT
```

It is **not** represented as runtime PASS.

## Existing qualification retained

Before this packed-shape batch, the following had passed under explicit reconstructed-source observation classes:

```text
mandatory H=2/3/6/7/8/12/13 packing matrix
INTERLEAVED + GROUPED representative cases
raw-I13 lexical +12 preservation
frozen independent postimage SHA oracles
independent complete-postimage validator
F01-F27 fail-closed / expected routing
F28 product/composite delete-all-only gate by current-head source inspection
F29 H=7->6
F30 H=13->12
pre-merge deleted-record testimony falsifier
inherited planner/delete-all synthetic regression
real BM_CII_SOURCE HANGER slice
```

The packed-shape production changes occurred after those runs; those historical passes are not silently relabelled as current-head runtime execution.

## Explicit NOT_RUN

```text
new packed-row source-shape qualification suite on exact PR1027 checkout
all focused PR1027 tests on a native exact checkout after this batch
full-file BM_CII_SOURCE intake -> write -> re-intake
broader Writer2/product integration regression
repository-wide npm test
```

## Product/runtime boundary

The partial writer and validator remain component-isolated. Existing product/composite partial HANGER remains blocked by:

```text
WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

## Release disposition

```text
component implementation                 COMPLETE
independent complete-postimage design     COMPLETE
record-testimony audit defect             FIXED + FALSIFIED
packed source-shape authority             QUALIFIED_FROM_EMITTER_AND_VENDOR_BENCHMARK
packed source-shape test                  AUTHORED / NOT_RUN_ENVIRONMENT
runtime product adoption                  NONE
merge authority                           OWNER_ONLY
merge authorized                          FALSE
```

Do not merge without fresh owner authorization.
