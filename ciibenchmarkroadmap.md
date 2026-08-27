# CII Writer2 Benchmark Roadmap

## Purpose

Create a retained, auditable Writer2 benchmark ladder from the exact frozen real file:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
Git blob: e41cd05603b56837cbb6e31b9d4074ef6106fe9b
Frozen source commit: 9685a2f41ec2b5a5c170762816702fefe90e18a7
Neutral version: V11
```

The benchmark program separates source/engineering custody from runtime qualification. Writer2 output must never become its own sole oracle. Generated V14 and native V14 remain different evidence classes.

## Governing rules

1. Every case is tied to the exact frozen source blob.
2. Standalone mutation families are qualified before composites.
3. Expected postimages are constructed by independent benchmark modules that do not import Writer2 mutation code.
4. Fixture drift fails closed; no dynamic fallback candidate is allowed for a frozen case.
5. Bytes and semantics outside authorized mutation coordinates remain unchanged.
6. Writer2 benchmarks preserve ELEMENT connectivity/topology.
7. I13 count/pointer coordinates require lexical integers, not merely numerically integral values.
8. V11 retained-real, generated V14, #1042 generated V14, and native V14 remain separate gates.
9. Low-level writer success does not qualify the public product route.
10. Source inspection never promotes an unexecuted runtime gate to PASS.

## Frozen baseline

```text
ELEMENTS                  40 x 15-row blocks
CONTROL.NOHGRS            1
CONTROL.NONAM              4
CONTROL.RESTRAINT blocks   7
CONTROL.SIF&TEES blocks    9
NODENAME rows              4
RESTRANT rows/block        24
SIF&TEES rows/block        10
HANGER count               1
HANGER node                205
MISCEL_1 rows              23
```

Machine-readable authority:

```text
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
```

## Benchmark ladder

### BM-W2-00 — identity/control

```text
input      BM_CII_SOURCE.CII
operation  none
expected   byte-identical identity
state      PLANNED
```

Purpose: zero-delta intake/export custody.

### BM-W2-01 — retained-real NODENAME CREATE

Frozen candidate:

```text
node                  10
owner element index   0
owner                  10 -> 20
owner endpoint         FROM
pointer before         0
name after             BM-N10
existing NODENAME rows 4
pointer after          5
```

The active Writer2 relocation authority is:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js
blob 326954e4d6342ba25915c107c7118b4f51c23610
```

CREATE allocation rule:

```text
no existing physical NODENAME field
-> collect exact incident pointer=0 bindings
-> choose lowest parsed ELEMENT index
-> append after retained NODENAME rows
-> assign resulting 1-based row pointer
```

Independent expected transition:

```text
CONTROL.NONAM       4 -> 5
NODENAME rows       4 -> 5
ELEMENT0 pointer    0 -> 5
ELEMENT count       40 -> 40
connectivity        unchanged
pointer syntax      lexical I13
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-nodename-oracle.js
```

Authored product test:

```text
tests/cii-workspace-writer2-benchmark-nodename-create.test.js
```

The test proves source blob custody, exact owner/candidate custody, allocation arithmetic, low-level output versus independent oracle, public Writer2 output versus the same oracle, re-intake semantics, stale-target rejection and unrelated-byte anti-drift.

Current state:

```text
AUTHORED
RUNTIME NOT_RUN
```

Active source-inspection risk:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-write.js

CONTROL.NONAM replacement -> integerField()
ELEMENT NODENAME pointer  -> numericField() -> formatCiiWriterSig6()
```

The ELEMENT NODENAME pointer is an I13 coordinate. BM-W2-01 therefore makes lexical-I13 equality an explicit first-class falsifier. Do not patch production until exact authored runtime reproduces the defect.

### BM-W2-02 — retained-real V11 SIF/TEE DELETE

Frozen candidate:

```text
owner element        70 -> 250
SIF pointer          1
record node          70
source raw code      3
```

Operation and expected transition:

```text
DELETE complete SIF block 1
CONTROL.SIF&TEES     9 -> 8
SIF rows             90 -> 80
selected pointer     1 -> 0
retained pointers    p > 1 => p - 1
connectivity         unchanged
pointer syntax       lexical I13
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-sif-oracle.js
```

Authored product test:

```text
tests/cii-workspace-writer2-benchmark-sif-delete.test.js
```

Raw-code mutation `3 -> 5` is explicitly excluded while raw field-2 semantics remain unresolved.

Current state:

```text
AUTHORED
RUNTIME NOT_RUN
```

### BM-W2-03 — retained-real HANGER DELETE-ALL

Frozen candidate:

```text
node                  205
layout                CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
CONTROL.NOHGRS        1
MISCEL_1 rows         23
rrmat/prefix rows     7
execution tail rows   4
```

Independent expected transition:

```text
CONTROL.NOHGRS       1 -> 0
hanger nodes         [205] -> []
MISCEL_1 rows        23 -> 11
retained rows        first 7 + last 4
ELEMENT connectivity unchanged
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-hanger-oracle.js
```

Authored product test:

```text
tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
```

The oracle derives the synchronizer IHGRNODE location independently from CONTROL counts and MISCEL_1 physical shape, then constructs the exact postimage without importing Writer2 mutation code.

Current state:

```text
AUTHORED
RUNTIME NOT_RUN
```

### BM-W2-04 — retained-real RESTRAINT block DELETE/compaction

Primary retained-real W2 B case.

Frozen candidate:

```text
pointer              1
slot                 1
node                 190
owner element        180 -> 190
rows/block           24
```

Independent expected transition:

```text
CONTROL restraints        7 -> 6
RESTRANT rows              168 -> 144
selected pointer           1 -> 0
retained pointers p > 1    p -> p - 1
CONTROL.NONAM              remains 4
ELEMENT connectivity       unchanged
count/pointer syntax       lexical I13
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-oracle.js
```

Authored product test:

```text
tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
```

Current state:

```text
AUTHORED
RUNTIME NOT_RUN
```

### BM-W2-05 — tri-family one-preimage composite

Only after BM-W2-01, BM-W2-02 and BM-W2-03 independently pass runtime qualification:

```text
NODENAME CREATE node10 -> BM-N10
+ SIF block1 DELETE
+ HANGER node205 DELETE-ALL
```

Expected CONTROL state:

```text
NOHGRS      1 -> 0
NONAM       4 -> 5
RESTRAINT   7 -> 7
SIF&TEES    9 -> 8
NUMELT      40 -> 40
```

Current state:

```text
BLOCKED_ON_STANDALONE_RUNTIME_QUALIFICATION
```

Do not author a composite merely to bypass an unexecuted standalone gate.

### BM-W2-06 — four-family stress case

After BM-W2-01/02/03/04 runtime qualification:

```text
NODENAME CREATE
+ SIF DELETE
+ HANGER DELETE-ALL
+ RESTRAINT DELETE
```

Expected cardinality vector:

| Field | Before | After |
|---|---:|---:|
| NUMELT | 40 | 40 |
| NOHGRS | 1 | 0 |
| NONAM | 4 | 5 |
| RESTRAINT | 7 | 6 |
| SIF&TEES | 9 | 8 |

Current state:

```text
BLOCKED_ON_STANDALONE_RUNTIME_QUALIFICATION
```

## Negative benchmark suite

### NEG-01 — unrelated byte drift

Change one unrelated header byte after an otherwise-correct postimage. Independent validation must fail exact complete-postimage comparison.

### NEG-02 — stale preview/hash

Replay a bound preview against an already-modified target. Must fail stale-target custody.

### NEG-03 — wrong CONTROL field

Mutate an unrelated CONTROL field in addition to the authorized count. Must fail.

### NEG-04 — wrong pointer relocation

Leave a required relocation stale after a cardinality change. Must fail the independent oracle.

### NEG-05 — invalid I13 lexical form

I13 coordinates reject REAL-style spellings such as:

```text
6.000000
6.000000E+00
6.000000D+00
```

This falsifier applies to Writer2-controlled count/pointer coordinates, including BM-W2-01's ELEMENT NODENAME pointer.

### NEG-06 — wrong V11 SIF cardinality

Delete fewer or more than the complete 10-row V11 SIF block. Must fail.

## Independent oracle architecture

Level-A repository oracles independently parse fixed sections and construct expected postimages. They do not import Writer2 planner/writer/mutation modules.

Current Level-A oracle set:

```text
BM-W2-01  cii-writer2-benchmark-nodename-oracle.js
BM-W2-02  cii-writer2-benchmark-sif-oracle.js
BM-W2-03  cii-writer2-benchmark-hanger-oracle.js
BM-W2-04  cii-writer2-benchmark-oracle.js
```

Level-B CAESAR-native retained oracles may be added when genuine native files are available. Converter-generated V14 must not be relabelled native.

## Version/runtime ladder

### W2 A — synthetic public runtime

Existing authored gate:

```text
tests/cii-workspace-writer2-restraint-product-routing.test.js
```

State: `NOT_RUN`.

### W2 B — retained-real V11

Primary evidence case: BM-W2-04.

State: `NOT_RUN`; classification requires W2 A and BM-W2-04 runtime PASS.

### W2.35 — converter-generated V14

Authored browser gate uses the real Worker/Pyodide bridge and requires final V14 downgrade equality with validated V11 Writer2 output.

State: `NOT_RUN`.

### W2.35a — Issue #1042 generated V14

Separate historical regression identity. NONAM must remain byte-identical for a pure RESTRAINT delete.

State: `NOT_RUN`.

### W2.40 — pinned native V14

Uses genuine pinned upstream V14 target custody; generated V14 cannot satisfy this gate.

State: `NOT_RUN`.

### W2 H — release freeze

Requires at minimum:

```text
W2 A PASS
W2 B / BM-W2-04 PASS
W2.35 PASS
W2.35a PASS
W2.40 PASS
I13 falsifiers PASS
negative benchmark suite PASS
no unexpected semantic delta
```

Current state: `NOT_READY`.

## Implementation phases and current progress

```text
Phase 1  benchmark custody + BM-W2-04 oracle        AUTHORED / runtime NOT_RUN
Phase 2  BM-W2-01/02/03 standalone cases            AUTHORED / runtime NOT_RUN
Phase 3  BM-W2-05/06 composites                      BLOCKED on standalone runtime
Phase 4  generated V14                               AUTHORED gate / runtime NOT_RUN
Phase 5  native V14                                  AUTHORED gate / runtime NOT_RUN
Phase 6  release bundle                              NOT_READY
```

## Current hard gate

The exact private repository cannot currently be materialized into this execution filesystem. Native Git cannot resolve GitHub; the connected GitHub interface provides exact source/blob access but no authenticated checkout/archive materialization suitable for unchanged Node/Chromium execution.

Therefore:

```text
SOURCE CUSTODY / AUTHORING  may continue within roadmap
RUNTIME PASS                may not be inferred
PRODUCTION FIX              requires reproduced authored runtime defect
BM-W2-05 / BM-W2-06         must wait for standalone runtime qualification
```

The next legitimate runtime sequence is:

```text
1. node tests/cii-workspace-writer2-restraint-product-routing.test.js
2. node tests/cii-workspace-writer2-benchmark-nodename-create.test.js
3. node tests/cii-workspace-writer2-benchmark-sif-delete.test.js
4. node tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
5. node tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
6. stop at first authored falsifier and isolate it
7. after standalone PASS, author/run BM-W2-05 and BM-W2-06
8. run playwright.cii-writer2.config.mjs for W2.35/W2.35a/W2.40
```

No benchmark expectation may be weakened to obtain green status.