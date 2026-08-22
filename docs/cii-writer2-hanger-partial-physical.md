# CII Writer 2 — partial H>1 HANGER physical compaction

## Scope

Issue #1026 / PR #1027 qualifies the component-level physical transaction for deleting one or more existing HANGER records when:

```text
H > 1
0 < deleted records < H
H' > 0
layout = CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

The authority is inherited from merged PR #1025 at `main@ae1de402db129e32cd6d7811a4e4707d64512bd4`.

This PR does **not** expand Writer2 composite/product/UI routing, HANGER CREATE, HANGER value editing, SIF CREATE, restraint/process cardinality, protected converters/parsers, or Writer3 topology authority.

## Governing physical record binding

A partial transaction is allowed only when the merged planner carries:

```text
plannerPartialRecordAuthority = true
partialRecordCompactionAuthorized = true
recordBindingAuthority =
  PHYSICAL_ROW_SHAPE_PLUS_DUAL_EMITTER_ORDER+POSITIONAL_HANGER_ARRAY_RECORD_INDEX
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

Record index `i` is the custody key across:

```text
IHGRNODE[i]
HGRDAT1/HGRDAT2/TAG/GUID record i
IHGRFREE row i
IHGRNUM[i]
IHGRTABLE[i]
IHGRSHORT[i]
IHGRCN[i]
```

Equal numeric values at another record index never substitute for this positional custody.

## One TARGET0 transaction

The writer starts from one untouched byte-authoritative TARGET0 and emits exactly two top-level replacement classes:

```text
CONTROL_HANGER_COUNT
MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
```

Both spans and `beforeField` values are derived against TARGET0, arbitrated for overlap, and applied in one splice pass. No downstream offset correction arithmetic and no writer-output-as-next-preimage sequence is used.

Canonical transfer scope is required:

```text
status = BOUND
mode = EXPLICIT_APPLY_EXCLUDE
authority = USER_EXPLICIT_OPERATION_SCOPE
sourceSha256 = transfer-plan source SHA
targetSha256 = transfer-plan target SHA = TARGET0 SHA
```

## Physical row model

For the supported layout:

```text
rrmatRows  = ceil(NUMELT / 6)
nozzleRows = NUMNOZ * 4
packedRows = ceil(H / 6)

hangerRows(H)
  = 2
  + packedRows
  + 4H
  + H
  + 4*packedRows
  = 2 + 5H + 5*ceil(H/6)

MISCEL_1 rows
  = rrmatRows + nozzleRows + hangerRows(H) + 4 execution rows
```

The same formula is independently derived for H' by the validator.

## Packed-array rule

The five packed families are:

```text
IHGRNODE
IHGRNUM
IHGRTABLE
IHGRSHORT
IHGRCN
```

Each retained value is an exact raw 13-byte field. The writer may relocate that field into a new six-value packed row but may not parse and reserialize it.

For each packed output row:

```text
2X prefix
+ retained raw I13 fields in retainedRecordIndices order
+ deterministic source-row line ending
```

All five families use the identical retained-record sequence.

Critical example:

```text
H = 7
DELETE record 2
retained = 1,3,4,5,6,7
packed rows 2 -> 1
```

The six surviving I13 fields are copied byte-for-byte into one row. A retained token such as `+12` remains lexically `+12`; numeric equality with a rewritten `12` is insufficient.

## HGRDAT / TAG / GUID order

Two qualified source shapes exist.

### INTERLEAVED

```text
HGRDAT1[1]
HGRDAT2[1]
TAG[1]
GUID[1]
HGRDAT1[2]
...
```

### GROUPED

```text
all HGRDAT1/HGRDAT2 pairs
then
all TAG/GUID pairs
```

The writer copies the retained original tail rows in their qualified original physical order. GROUPED is never canonicalized to INTERLEAVED and vice versa.

When H' = 1, the postimage is physically `SINGLE_RECORD_ORDER_EQUIVALENT`; writer testimony still records the qualified preimage order class.

## IHGRFREE

IHGRFREE is not regenerated. Each retained row is copied byte-for-byte using the same retained record index sequence as all five packed arrays and the tail records.

## Preserved bytes

The component transaction preserves byte-for-byte:

```text
RRMAT rows
VFLEX/nozzle prefix rows
two hanger default rows
retained HGRDAT rows
retained TAG/GUID rows
retained IHGRFREE rows
retained packed 13-byte tokens
four execution rows
all sections outside CONTROL.NOHGRS and MISCEL_1 payload
```

`CONTROL.NOHGRS` is the only retained fixed-width value intentionally reformatted, from H to H', using the qualified 13-byte integer field convention.

## Delete-all separation

This component rejects:

```text
countAfter == 0
```

The existing PR #1020 delete-all writer remains authoritative for that transaction. The existing composite/product readiness continues to block partial HANGER with:

```text
WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

PR #1027 does not modify that route.

## Independent complete-postimage validator

`cii-workspace-writer2-hanger-partial-validation.js` does not import the writer module or its repacking/payload helpers.

It independently:

1. validates canonical bound scope and source/target hashes;
2. rebuilds the merged #1025 planner from TARGET0 + transfer plan;
3. derives the retained set and old→new record map from deleted indices;
4. derives H/H', prefix counts, packed row counts and full MISCEL row counts;
5. obtains raw retained I13 fields by positional record binding;
6. independently repacks all five arrays;
7. independently selects retained tail and IHGRFREE rows;
8. independently reconstructs CONTROL.NOHGRS and complete MISCEL_1 replacement;
9. reconstructs the complete expected final CII byte string;
10. requires exact final-byte equality;
11. checks Writer testimony separately;
12. checks post hanger count/nodes/layout, section order, element stability and node-set stability.

Writer testimony never defines expected bytes.

## Frozen independent postimage oracles

`tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json` contains immutable expected SHA-256 postimage oracles generated independently from the production writer/validator for:

```text
H=3  INTERLEAVED delete 2
H=3  GROUPED     delete 2
H=7  INTERLEAVED delete 2, including retained raw +12 token
H=7  GROUPED     delete 2
H=13 INTERLEAVED delete 1
```

The frozen-oracle test reconstructs TARGET0 from a fixed-card test producer, verifies the frozen TARGET0 hash first, runs the production writer, then verifies exact final byte length and frozen final SHA-256.

## Mandatory packing matrix authored

```text
H=2   DELETE 1     -> H'=1    packed 1 -> 1
H=3   DELETE 2     -> H'=2    packed 1 -> 1
H=6   DELETE 1     -> H'=5    packed 1 -> 1
H=7   DELETE 1     -> H'=6    packed 2 -> 1
H=7   DELETE 7     -> H'=6    packed 2 -> 1
H=8   DELETE 2     -> H'=7    packed 2 -> 2
H=8   DELETE 2,7   -> H'=6    packed 2 -> 1
H=12  DELETE 1     -> H'=11   packed 2 -> 2
H=13  DELETE 1     -> H'=12   packed 3 -> 2
```

Both INTERLEAVED and GROUPED are additionally exercised at representative boundaries.

## Adversarial qualification authored

The focused physical suite covers Issue #1026 F01–F30, including wrong record map/order, one-family packed divergence, wrong row count, blank-to-zero, numeric reserialization, wrong IHGRFREE/tail ownership, tail-order conversion, CONTROL/default/RRMAT/VFLEX/execution/unrelated-byte tamper, stale hash, forged Writer testimony, unsupported layout, CREATE/value-edit leakage, missing record binding, delete-all route leakage, product/composite leakage, and the H=7→6 / H=13→12 boundaries.

## Validation truth at current runtime

Source inspection is complete for the new writer, independent validator, packing matrix, frozen oracle and F01–F30 coverage.

The available execution container cannot resolve `github.com`, so it cannot obtain an exact private-repository checkout. No GitHub Actions run is associated with the current PR head. Therefore focused Node execution, inherited Writer2 regression execution and full `npm test` remain `NOT_RUN_ENVIRONMENT` until an exact checkout or remote run is available.

No unexecuted check is represented as PASS.
