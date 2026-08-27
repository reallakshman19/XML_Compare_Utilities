# PR1062 Work Report — retained-real Writer2 standalone benchmarks

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_MAIN: d1f7d773ec89459f55d3fca9bcf0c93f2308b1e1
BRANCH: agent/cii-writer2-benchmark-next
PR: #1062 / DRAFT / OPEN
PREDECESSOR: #1061 squash-merged at d1f7d773ec89459f55d3fca9bcf0c93f2308b1e1
WORK_INTENT: IMPLEMENT / VALIDATE
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
AUTO_STATE: BLOCKED
HARD_STOP: STANDALONE_EXACT_RUNTIME_REQUIRED_BEFORE_COMPOSITES
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
```

## Handover in 60 seconds

PR #1062 completes the **authoring/source-custody portion of Phase 2** of `ciibenchmarkroadmap.md`.

Standalone retained-real V11 benchmark state is now:

```text
BM-W2-01 NODENAME CREATE       AUTHORED / RUNTIME NOT_RUN
BM-W2-02 SIF DELETE            AUTHORED / RUNTIME NOT_RUN (inherited)
BM-W2-03 HANGER DELETE-ALL     AUTHORED / RUNTIME NOT_RUN
BM-W2-04 RESTRAINT DELETE      AUTHORED / RUNTIME NOT_RUN (inherited)
```

Phase-3 composites BM-W2-05/06 are deliberately **not authored yet**. The roadmap requires standalone runtime qualification first. The current execution environment still cannot materialize the exact private checkout, so continuing into composites would weaken the qualification order.

No production file was changed in PR #1062.

## Frozen benchmark source

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
Git blob e41cd05603b56837cbb6e31b9d4074ef6106fe9b
Neutral version V11
ELEMENTS 40
CONTROL.NOHGRS 1
CONTROL.NONAM 4
CONTROL.RESTRAINT 7
CONTROL.SIF&TEES 9
NODENAME rows 4
MISCEL_1 rows 23
```

## BM-W2-01 — NODENAME CREATE

### Frozen source facts

```text
candidate node       10
owner element index  0
owner endpoints      10 -> 20
owner end            FROM
pointer before       0
NODENAME rows before 4
new pointer          5
name after            BM-N10
CONTROL.NONAM         4 -> 5
ELEMENT count         40 -> 40
connectivity          unchanged
```

Current allocation authority:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js
blob 326954e4d6342ba25915c107c7118b4f51c23610
```

It requires no existing physical NODENAME field, chooses the lowest parsed-index incident pointer-0 owner, appends after retained rows, and uses the resulting 1-based row index as the new pointer.

### Independent oracle

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-nodename-oracle.js
blob ab770906e30fa4a0db156e083517af1d7793eb5c
```

The oracle imports no Writer2 mutation module. It independently:

- verifies CRLF physical shape;
- verifies CONTROL.NONAM is lexical I13 and equals 4;
- verifies exactly 40 x 15 ELEMENT rows;
- verifies ELEMENT0 is 10 -> 20 with NODENAME pointer 0;
- proves node10 is not already physically named via any pointer-bound NODENAME endpoint;
- proves the lowest incident zero-pointer owner is ELEMENT0;
- derives append pointer 5;
- constructs exact expected bytes by changing only CONTROL.NONAM, ELEMENT0 NODENAME pointer and appending NODENAME row5;
- requires the post pointer to remain lexical I13.

### Authored benchmark test

```text
tests/cii-workspace-writer2-benchmark-nodename-create.test.js
blob 7ba33984f290550f6f40eb91369ce9ceab1b74af
```

The test checks low-level and public Writer2 output against the independent oracle, re-intake semantics, connectivity, stale-target rejection, and unrelated-byte anti-drift.

### Source-inspection defect candidate — do not patch yet

Current production:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-write.js
blob 9e520ceaedc16b0bd36b70396bca3bfc9fd5996f
```

CONTROL.NONAM is written with `integerField()`, but ELEMENT NODENAME pointer replacement is currently:

```text
numericField()
-> formatCiiWriterSig6()
```

That is a REAL-style formatter used in an I13 coordinate. This is the same defect class previously found in V14/SIF/RESTRAINT, but PR1062 has only source-inspection evidence so far.

The BM-W2-01 runtime test places lexical-I13 validation before byte equality so a successful reparse cannot hide the issue.

Classification:

```text
NODENAME_POINTER_LEXICAL_I13_DEFECT_CANDIDATE = SUSPECTED_SOURCE_INSPECTION_ONLY
RUNTIME_FALSIFIER = NOT_RUN
PRODUCTION_PATCH = NOT_AUTHORIZED_YET
```

Exact runtime failure of that authored lexical assertion would authorize a surgical correction inside the existing approved benchmark mission.

## BM-W2-03 — HANGER DELETE-ALL

### Frozen source facts

```text
CONTROL.NOHGRS        1
hanger node           205
layout                CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
MISCEL_1 rows         23
numelt                40
numnoz                0
rrmat/prefix rows     ceil(40/6) = 7
execution tail rows   4
```

Expected postimage:

```text
CONTROL.NOHGRS     1 -> 0
nodes              [205] -> []
MISCEL_1           23 -> 11 rows
retained payload   first 7 rows + last 4 rows
connectivity       unchanged
```

### Independent oracle

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-hanger-oracle.js
blob 16cbba8d5ac7dec1dc4e8cce1c5f0b6a9c728b3f
```

It imports no Writer2 mutation code. It derives prefix cardinality from CONTROL counts, independently locates the synchronizer IHGRNODE row, requires exact node205, and constructs the delete-all postimage from first7+last4 physical rows.

### Authored benchmark test

```text
tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
blob 93703ac66fec9b663165d95a20afbc654b6e26f4
```

It compares low-level `applyCiiWriter2HangerDeleteAll()` and public `applyCiiWorkspaceTargetWriter2()` to the independent oracle, then checks independent HANGER round-trip validation, post-custody `count=0/layout=NONE/nodes=[]`, MISCEL row count 11, connectivity, stale-target rejection and unrelated-byte anti-drift.

Production HANGER writer remains unchanged:

```text
tabs/cii-workspace/cii-workspace-writer2-hanger-delete-all-write.js
blob 5993c4e534438629a683b018f15dd013c37a20b2
```

## Benchmark manifest / roadmap reconciliation

Updated:

```text
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
ciibenchmarkroadmap.md
```

The manifest now freezes BM-W2-01 and BM-W2-03 identities, oracle paths, authorized coordinates, test paths, runtime NOT_RUN states, and the NODENAME-I13 source risk.

The roadmap now records:

```text
Phase 1 BM-W2-04                     AUTHORED / runtime NOT_RUN
Phase 2 BM-W2-01/02/03               AUTHORED / runtime NOT_RUN
Phase 3 BM-W2-05/06                  BLOCKED on standalone runtime
Phase 4 generated V14                authored gate / runtime NOT_RUN
Phase 5 native V14                   authored gate / runtime NOT_RUN
Phase 6 release bundle               NOT_READY
```

## Inherited Writer2 runtime truth

```text
W2 A     NOT_RUN
W2 B     NOT_RUN
W2.35    NOT_RUN
W2.35a   NOT_RUN
W2.40    NOT_RUN
W2 H     NOT_READY
```

Merging #1061 did not promote any runtime gate.

## Runtime environment boundary

Exact private repository materialization is still unavailable in this execution environment. Native Git cannot resolve GitHub, while the connected GitHub interface provides source/blob reads and mutations but not a complete authenticated checkout/archive in the runtime filesystem.

Therefore none of the newly authored public-product tests has been executed on a complete exact repository tree.

Do not use:

- stubs;
- import rewrites;
- partial-core substitutes;
- GitHub Actions as a qualification substitute;
- reconstructed PASS;
- an oracle weakened to match production.

## Authority boundaries

No SIF/HANGER/RESTRAINT CREATE, Writer3 topology, parser/converter rewrite, workflow modification, raw SIF field-2 semantic authority, benchmark-source modification, or validation weakening.

## Changed-file ledger

Expected current PR scope:

```text
agents/PR1062_workreport.md
agents/status/PR1062.yaml
agents/claims/PR1062.yaml
ciibenchmarkroadmap.md
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-nodename-oracle.js
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-hanger-oracle.js
tests/cii-workspace-writer2-benchmark-nodename-create.test.js
tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
```

Production changed: FALSE.

## Exact continuation

When a complete exact checkout is available:

```text
1. node tests/cii-workspace-writer2-restraint-product-routing.test.js
2. node tests/cii-workspace-writer2-benchmark-nodename-create.test.js
3. node tests/cii-workspace-writer2-benchmark-sif-delete.test.js
4. node tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
5. node tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
6. stop at first authored falsifier
7. if BM-W2-01 proves the lexical-I13 defect, patch only the NODENAME pointer formatter and rerun exact pre/post falsifier plus regressions
8. after standalone runtime PASS, proceed to BM-W2-05 then BM-W2-06
9. then execute W2.35/W2.35a/W2.40 browser gates
```

AUTO MODE is blocked here because proceeding to composites without standalone runtime qualification would violate the approved roadmap ordering.

## Appendix A — takeover qualification

1. Prove BM-W2-01 node10/element0/pointer0 custody and derive pointer5 without reading Writer2 output.
2. Explain why a REAL-formatted `5.00000` is invalid for an ELEMENT NODENAME I13 coordinate even if the parser interprets it numerically as 5.
3. Reconstruct BM-W2-03's independent `first7 + last4` MISCEL_1 compaction arithmetic from CONTROL data.
4. Show the exact difference between `AUTHORED` and runtime `PASS` for all four standalone benchmark cases.
5. State why BM-W2-05 must remain blocked until BM-W2-01/02/03 runtime qualification, and identify the exact allowed production repair if BM-W2-01's lexical-I13 falsifier fires.
