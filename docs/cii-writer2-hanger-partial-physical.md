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

This PR does **not** expand composite/product/UI routing and does not authorize HANGER CREATE, HANGER value editing, SIF CREATE, Writer3 topology, restraint/process cardinality or protected parser/converter mutation.

## Governing record authority

A physical partial transaction is allowed only when the merged planner proves:

```text
plannerPartialRecordAuthority = true
partialRecordCompactionAuthorized = true
recordBindingAuthority =
  PHYSICAL_ROW_SHAPE_PLUS_DUAL_EMITTER_ORDER+POSITIONAL_HANGER_ARRAY_RECORD_INDEX
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

For original record index `i`, one positional custody record binds:

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

The component may relocate those already-qualified physical records. It does not infer HGRDAT engineering meaning.

## Physical row model

For H>0:

```text
rrmatRows  = ceil(NUMELT / 6)
nozzleRows = NUMNOZ * 4
packedRows = ceil(H / 6)

hangerRows(H)
 = 2
 + packedRows
 + 4*H
 + H
 + 4*packedRows
 = 2 + 5*H + 5*ceil(H/6)
```

MISCEL_1 physical order is:

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

## Transaction model

The writer operates from exactly one untouched TARGET0 byte string.

It builds exactly two original-coordinate replacements:

```text
1. CONTROL_HANGER_COUNT
   CONTROL.NOHGRS: H -> H'

2. MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
   complete HANGER region reconstruction
```

Both replacements are checked against their original preimages and applied in one splice pass. No sequential writer mutation or downstream offset-adjust authority is used.

## Exact raw-I13 repacking

The five packed arrays are:

```text
IHGRNODE
IHGRNUM
IHGRTABLE
IHGRSHORT
IHGRCN
```

Partial compaction is **field repacking**, not packed-row deletion.

For every retained record, the original 13-byte field is copied exactly. The writer must not parse and reformat retained numeric values.

Thus:

```text
"          +12"
```

must remain exactly that token; it is not byte-equivalent to a rewritten `12`.

All five families use the same retained-record sequence.

## Tail-order preservation

Two qualified HGRDAT/TAG/GUID physical layouts exist:

```text
INTERLEAVED
  HGRDAT1[i], HGRDAT2[i], TAG[i], GUID[i] per record

GROUPED
  all retained HGRDAT pairs, then all retained TAG/GUID pairs
```

The original order class is preserved. GROUPED is never canonicalized to INTERLEAVED and vice versa.

When H'=1, the postimage can only prove:

```text
SINGLE_RECORD_ORDER_EQUIVALENT
```

The writer's tail-order testimony still records the qualified preimage order class.

## IHGRFREE custody

IHGRFREE is exactly one physical row per hanger record. Retained IHGRFREE rows are copied by the same `retainedRecordIndices` used by the five packed arrays and tail envelope.

## Delete-all boundary

The partial writer rejects:

```text
countAfter == 0
```

That remains the unchanged PR1020 delete-all writer path.

## Independent validator

`cii-workspace-writer2-hanger-partial-validation.js` does not import or call the partial writer or its payload/repacking helpers.

From TARGET0 + canonical transfer scope + merged planner authority it independently rebuilds:

- source/target scope hashes and operation sets;
- partial delete plan;
- deleted and retained record map;
- old-to-new record map;
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

Writer testimony is secondary evidence only.

After independent expected bytes are available, the validator checks:

```text
hangerCountBefore / hangerCountAfter
deletedRecordIndices
retainedRecordIndices
oldToNewRecordIndex
packedRowsBefore / packedRowsAfter
tailOrder
mutation count and exact replacement testimony
scope custody
nested delete-plan testimony
byte lengths
```

### Pre-merge audit correction

A 2026-08-23 pre-merge audit found that the validator compared retained-record and old-to-new testimony but did not separately compare the writer result's **top-level** `deletedRecordIndices`.

Corrected at:

```text
8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84
CII: validate deleted HANGER record testimony
```

Dedicated falsifier added at:

```text
172467f96f4f417dc2639adeec2a5d8ba558fa61
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

Behavior exercised:

```text
H=3, delete record 2
correct top-level deletedRecordIndices=[2] -> PASS
forged top-level deletedRecordIndices=[1] ->
  WRITER_2_HANGER_PARTIAL_RECORD_TESTIMONY_MISMATCH
```

Result:

```text
PASS_FAIL_CLOSED_RECONSTRUCTED_CURRENT_HEAD_SOURCE
```

## Mandatory packing matrix

Executed under reconstructed current-head dependency closure:

```text
H=2   delete 1     -> H'=1   packed 1->1 PASS
H=3   delete 2     -> H'=2   packed 1->1 PASS
H=6   delete 1     -> H'=5   packed 1->1 PASS
H=7   delete 1     -> H'=6   packed 2->1 PASS
H=7   delete 7     -> H'=6   packed 2->1 PASS
H=8   delete 2     -> H'=7   packed 2->2 PASS
H=8   delete 2,7   -> H'=6   packed 2->1 PASS
H=12  delete 1     -> H'=11  packed 2->2 PASS
H=13  delete 1     -> H'=12  packed 3->2 PASS
```

Representative GROUPED H=3/H=7/H=13 cases also pass.

## Falsifier qualification

Issue #1026 F01-F30 coverage is retained.

Observation classes:

```text
F01-F27   PASS / FAIL_CLOSED in reconstructed execution
F28       PASS_SOURCE_INSPECTION_CURRENT_HEAD
F29-F30   PASS critical packed boundaries
```

The new pre-merge deleted-record testimony falsifier is an additional direct regression of the F21-style writer record-testimony boundary.

## Frozen independent postimage oracles

Five immutable TARGET0/final SHA-256 fixtures cover:

```text
H3  INTERLEAVED delete2
H3  GROUPED delete2
H7  INTERLEAVED delete2, including retained lexical +12 token
H7  GROUPED delete2
H13 INTERLEAVED delete1
```

All five pass under reconstructed dependency-closure execution.

The first frozen-oracle execution exposed a test-harness error (`targetSha256` vs immutable `target0Sha256`). Production correctly failed closed. The test was corrected at `85b38416adbb09f680b1f8122b2f82b77a8927f3`; production authority was not relaxed.

## Inherited non-regression

After the pre-merge testimony fix, the reconstructed current-head predecessor closure was rerun:

```text
HANGER planner/delete-all synthetic cases              PASS
HANGER delete-all writer + independent validator       PASS
real BM_CII_SOURCE HANGER CONTROL/MISCEL_1 slice       PASS
```

Real benchmark HANGER custody used:

```text
NUMELT=40
NUMNOZ=0
NOHGRS=1
IHGRNODE=205
RRMAT rows=7
MISCEL_1 before=23 rows
MISCEL_1 after=11 rows
```

This benchmark result is deliberately classified as `PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE`, not a full-file exact-intake PASS.

## Explicit execution limitations

The following remain NOT_RUN and must not be inferred as PASS:

```text
focused PR1027 tests on a native exact private-repository checkout
full-file BM_CII_SOURCE intake -> write -> re-intake roundtrip
broader Writer2/product integration regression
repository-wide npm test
```

The execution container cannot resolve GitHub hosts and cannot clone the private repository. No PR-triggered engineering-test workflow is available for this head.

`package.json` is unchanged; its broad `npm test` does not register the CII Workspace/HANGER qualification tests.

## Product/runtime boundary

The new partial writer and validator remain component-isolated. No existing product/composite/UI runtime file imports them in PR1027.

Existing product/composite partial HANGER remains blocked by:

```text
WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

## Release disposition

```text
component implementation              COMPLETE
independent validation                COMPLETE
pre-merge testimony audit defect      FIXED
new deleted-record falsifier          PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
changed paths                         11 intended / 11 actual / 0 unexplained
runtime product adoption              NONE
native/global regression              NOT_RUN_ENVIRONMENT
review readiness                      READY after handover synchronization
merge authority                       OWNER_ONLY
merge authorized                      FALSE
```

Do not merge without fresh owner authorization.
