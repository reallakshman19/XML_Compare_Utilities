# CII Writer2 V14 — fixed-field authority guard runtime

Date: 2026-08-26  
PR: #1055  
Stage: W2.31

## 1. Purpose

W2.30 established that the V14 bridge is Writer2-only and that equal-cardinality NODENAME/SIF/RESTRANT edits remain outside V14 authority. A follow-on source audit found that `cii-workspace-v14-change-projection.js::mergeChangedRow()` can return the entire canonical modified row when `baseline === original`.

That projector behavior is acceptable only when an independent pre-projection guard proves the changed CONTROL/ELEMENTS fields are exactly fields already owned by the V11 Writer2 transaction. Without that guard, a whole CONTROL/ELEMENTS row could be accepted merely because canonical baseline happened to be byte-identical to native V14.

W2.31 therefore adds a separate authority guard rather than modifying the frozen `3D_Converters` Python or the V11 Writer2.

## 2. V11 authority coordinates

The following coordinates are derived from existing V11 production writer/custody modules.

CONTROL, zero-based payload row / fixed-field index:

```text
row 0 field 3  CONTROL_NODENAME_NONAM_COUNT
row 1 field 3  CONTROL_RESTRAINT_BLOCK_COUNT
row 2 field 4  CONTROL_SIF_TEE_BLOCK_COUNT
```

ELEMENTS, per 15-row element block, zero-based row / field:

```text
row 12 field 3  ELEMENT_RESTRAINT_POINTER
row 13 field 4  ELEMENT_SIF_TEE_POINTER
row 13 field 5  ELEMENT_NODENAME_POINTER
```

Repository anchors:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-write.js
tabs/cii-workspace/cii-workspace-nodename.js
tabs/cii-workspace/cii-workspace-writer2-sif-delete-write.js
tabs/cii-workspace/cii-workspace-writer1c-sif-custody.js
tabs/cii-workspace/cii-workspace-writer2-restraint-delete-write.js
tabs/cii-workspace/cii-workspace-writer2-restraint-delete-custody.js
```

The pinned `3D_Converters` ELEMENT transform preserves rows 12-15 of each 15-row ELEMENT block untouched across the V11/V14 dialect boundary. CONTROL record positions are likewise retained; generic conversion does not relocate fields.

## 3. Production guard

```text
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
schema CIIWorkspaceV14Writer2FixedFieldAuthority.v1
```

Final committed blob:

```text
7bc3a83ef37159c9a70fb0e16acaba721fd73b26
```

The guard executes in `applyCiiWorkspaceTargetWriter2WithVersionBridge()` after the independently validated V11 postimage is converted to canonical V14 and **before** `projectCanonicalV14WriterDelta()`.

Rules:

```text
CONTROL/ELEMENTS changed field outside the six coordinates -> BLOCK
count/pointer value not a non-negative integer             -> BLOCK
ELEMENTS rows not a multiple of 15                          -> BLOCK
cardinality payload changes without matching CONTROL count -> BLOCK
CONTROL count changes without physical cardinality change   -> BLOCK
pointer changes without physical cardinality change         -> BLOCK
SIF/RESTRAINT cardinality increase                          -> BLOCK
changed pointer outside before/after block count            -> BLOCK
```

The guard returns an immutable claim ledger which is retained in `versionBridgeValidation.fixedFieldAuthority`.

## 4. Cardinality correlation

Physical count authority remains:

```text
NODENAME   rows / 1
RESTRANT   rows / 24
SIF&TEES   rows / 14
```

A physical cardinality change requires exactly one matching CONTROL claim and:

```text
CONTROL before == physical before count
CONTROL after  == physical after count
```

SIF and RESTRAINT are DELETE/compaction-only in this bridge because V11 CREATE remains source-blocked. NODENAME can increase or decrease, but only inside an already-existing physical NODENAME section.

## 5. Exact focused runtime

Authored test:

```text
tests/cii-workspace-v14-writer2-fixed-field-authority.test.js
```

Final committed graph:

```text
guard  7bc3a83ef37159c9a70fb0e16acaba721fd73b26
test   74077b00b094c5e30ff402f8a0adeb1814bb24cc
```

Both local files were admitted by recomputing Git-object SHA over:

```text
blob <byte_length>\0<exact_bytes>
```

before execution.

Command/result:

```text
node --experimental-default-type=module tests/cii-workspace-v14-writer2-fixed-field-authority.test.js
CII Workspace V14 Writer2 fixed-field authority: PASS
```

Classification:

```text
PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_31_FIXED_FIELD_AUTHORITY
```

The final test covers:

```text
all six qualified field coordinates accepted
whole-row adoption cannot authorize CONTROL field 0
wrong CONTROL row/field rejected
wrong ELEMENTS row/field rejected
fractional count rejected
15-row ELEMENT block alignment enforced
payload cardinality without count rejected
count without payload cardinality rejected
matching NODENAME count/cardinality accepted
RESTRANT cardinality increase rejected
post-delete RESTRAINT pointer outside new count rejected
```

## 6. Frozen/source boundary

No frozen Python file changed. The source remains:

```text
reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

No V11 Writer1/Writer2 production file was modified. The W2.31 guard is additive XML-side bridge policy only.

## 7. Qualification limitation

This focused PASS does not qualify:

```text
current full frozen-source custody graph
full CII Workspace/W2.13 runtime
retained-real V11 product runtime
real native V14 Writer2 mutation
browser/Pyodide bridge
repository npm/full regressions
external CAESAR import/save/re-export acceptance
```

Current strengthened frozen-source authored test includes W2.31 assertions but remains NOT_RUN on its enlarged exact graph.
