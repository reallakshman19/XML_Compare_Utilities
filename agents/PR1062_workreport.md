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
AUTO_STATE: RUNNING
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
```

## Handover in 60 seconds

Phase-2 retained-real benchmark authoring is complete for the four standalone mutation families:

```text
BM-W2-01 NODENAME CREATE       AUTHORED / public runtime NOT_RUN
BM-W2-02 SIF DELETE            AUTHORED / public runtime NOT_RUN
BM-W2-03 HANGER DELETE-ALL     AUTHORED / public runtime NOT_RUN
BM-W2-04 RESTRAINT DELETE      AUTHORED / public runtime NOT_RUN
```

During BM-W2-01 qualification the suspected V11 NODENAME pointer formatter defect was reproduced by an exact focused source-contract falsifier and repaired surgically. The postimage then passed an exact five-file planner+writer runtime that forces pointer `0 -> 5` and verifies the actual 13-byte token is lexical integer `5`.

This focused PASS does **not** promote BM-W2-01 public-product runtime. The complete private checkout is still unavailable, so the retained-real public test remains NOT_RUN.

Phase-3 composites BM-W2-05/06 remain blocked until standalone public runtime qualification.

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

Frozen case:

```text
candidate node       10
owner element index  0
owner endpoints      10 -> 20
owner end            FROM
pointer before       0
NODENAME rows before 4
expected pointer     5
name after            BM-N10
CONTROL.NONAM         4 -> 5
ELEMENT count         40 -> 40
connectivity          unchanged
```

Allocation authority:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js
blob 326954e4d6342ba25915c107c7118b4f51c23610
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-nodename-oracle.js
blob ab770906e30fa4a0db156e083517af1d7793eb5c
```

Public retained-real test:

```text
tests/cii-workspace-writer2-benchmark-nodename-create.test.js
blob 7ba33984f290550f6f40eb91369ce9ceab1b74af
runtime NOT_RUN — exact private checkout unavailable
```

### NODENAME pointer I13 defect — reproduced and fixed

Preimage production:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-write.js
blob 9e520ceaedc16b0bd36b70396bca3bfc9fd5996f
```

The ELEMENT NODENAME pointer mutation used:

```text
afterField: numericField(...)
             -> formatCiiWriterSig6(...)
```

This produced a REAL-style token for a fixed-FORTRAN I13 pointer coordinate.

Focused exact source-contract falsifier:

```text
tests/cii-workspace-writer2-nodename-i13-source-contract.test.js
blob c80bca35e3b62f216eaab5bf8a48faaa21a276d7
```

Exact two-file preimage graph:

```text
writer 9e520ceaedc16b0bd36b70396bca3bfc9fd5996f
test   c80bca35e3b62f216eaab5bf8a48faaa21a276d7
```

Observed:

```text
FAIL AS EXPECTED
reason: pointerReplacements() contains afterField: numericField(...)
```

Surgical production repair:

```text
- remove Writer1A formatCiiWriterSig6 import
- remove local numericField helper
- write ELEMENT NODENAME pointer with existing integerField(...)
```

Postimage production blob:

```text
eb6bff1cdd4dc1f50e101a4f2f2dc717c74bdd5c
```

The same exact source-contract test now PASSes.

### Stronger exact focused runtime

Authored:

```text
tests/cii-workspace-writer2-nodename-i13-focused-runtime.test.js
blob 65896fd41e16efcd25dea97ad5a8848cbc87d03c
```

It constructs a real physical V11-shaped mini-target with:

```text
CONTROL.NONAM = 4
4 existing NODENAME rows
ELEMENT0 = 10 -> 20
ELEMENT0 NODENAME pointer = 0
CREATE BM-N10 on node10
```

It executes the actual production relocation planner and physical writer. Exact admitted graph:

```text
parser/fixed-field.js
485daa43553681ca54f488499e57f36d2239be58

tabs/cii-workspace/cii-workspace-physical-file.js
0c4c445fbd3d4b929b1f9288b789b244547c8867

tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js
326954e4d6342ba25915c107c7118b4f51c23610

tabs/cii-workspace/cii-workspace-writer2-nodename-write.js
eb6bff1cdd4dc1f50e101a4f2f2dc717c74bdd5c

tests/cii-workspace-writer2-nodename-i13-focused-runtime.test.js
65896fd41e16efcd25dea97ad5a8848cbc87d03c
```

Every local file was verified with `git hash-object` against those repository blobs before execution.

Observed:

```text
Writer2 NODENAME focused runtime writes pointer 0->5 as lexical I13: PASS
```

Verified postconditions:

```text
control count       4 -> 5
pointer             0 -> 5
pointer field width 13
pointer token       "5"
lexical rule        ^[+-]?\d+$
```

Classification:

```text
NODENAME_POINTER_LEXICAL_I13_SOURCE_CONTRACT = PASS_PREIMAGE_FAIL_POSTIMAGE_PASS
NODENAME_POINTER_LEXICAL_I13_FOCUSED_RUNTIME = PASS_RUNTIME_EXACT_5_FILE_BLOB_GRAPH
BM-W2-01_PUBLIC_EXACT_RUNTIME                = NOT_RUN
```

Do not promote the retained-real public benchmark from the focused PASS.

## BM-W2-03 — HANGER DELETE-ALL

Frozen retained-real case:

```text
CONTROL.NOHGRS        1
hanger node           205
layout                CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
MISCEL_1 rows         23
NUMELT                40
NUMNOZ                0
rrmat/prefix rows     ceil(40/6) = 7
execution tail rows   4
expected post rows    11
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-hanger-oracle.js
blob 16cbba8d5ac7dec1dc4e8cce1c5f0b6a9c728b3f
```

Public retained-real test:

```text
tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
blob 93703ac66fec9b663165d95a20afbc654b6e26f4
runtime NOT_RUN — exact private checkout unavailable
```

Current focused-runtime frontier is honest rather than reduced with stubs. `buildCiiWriter2HangerDeletePlan()` statically requires:

```text
cii-workspace-writer2-hanger-record-binding.js
cii-workspace-writer2-hanger-tail-order.js
```

in addition to HANGER evidence, physical-file and contracts. Those custody modules must remain in any focused exact HANGER execution.

## Runtime ladder truth

```text
W2 A                       NOT_RUN
BM-W2-01 public retained   NOT_RUN
BM-W2-02 public retained   NOT_RUN
BM-W2-03 public retained   NOT_RUN
BM-W2-04 public retained   NOT_RUN
W2 B                       NOT_RUN
W2.35                      NOT_RUN
W2.35a                     NOT_RUN
W2.40                      NOT_RUN
W2 H                       NOT_READY
```

## Authority boundaries

No SIF/HANGER/RESTRANT CREATE, Writer3 topology, parser/converter rewrite, workflow modification, raw SIF field-2 semantic authority, benchmark-source modification, or validation weakening.

The only production change in this PR is the reproduced NODENAME I13 repair:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-write.js
```

## Changed-file ledger

Benchmark/roadmap:

```text
ciibenchmarkroadmap.md
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-nodename-oracle.js
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-hanger-oracle.js
```

Tests:

```text
tests/cii-workspace-writer2-benchmark-nodename-create.test.js
tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
tests/cii-workspace-writer2-nodename-i13-source-contract.test.js
tests/cii-workspace-writer2-nodename-i13-focused-runtime.test.js
```

Production:

```text
tabs/cii-workspace/cii-workspace-writer2-nodename-write.js
```

Recovery:

```text
agents/PR1062_workreport.md
agents/status/PR1062.yaml
agents/claims/PR1062.yaml
```

## Exact continuation

1. Close a focused exact HANGER planner+writer graph including record-binding and tail-order custody; do not stub them.
2. Keep BM-W2-03 retained-real public runtime NOT_RUN unless the complete public route executes.
3. Reconcile benchmark manifest/roadmap risk state from `SUSPECTED` to `FIXED_FOCUSED_EXACT_RUNTIME_PASS`.
4. When a complete exact checkout exists, run unchanged:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
node tests/cii-workspace-writer2-benchmark-nodename-create.test.js
node tests/cii-workspace-writer2-benchmark-sif-delete.test.js
node tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
node tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
```

5. Only after standalone public runtime PASS, author BM-W2-05 and BM-W2-06.
6. Then advance W2.35 / W2.35a / W2.40 and release-freeze qualification.

## Appendix A — takeover qualification

1. Explain why the NODENAME pointer preimage was invalid fixed-FORTRAN even though the numeric parser could read it.
2. Reconstruct the exact preimage source-contract failure and postimage focused-runtime graph, naming all blobs.
3. Explain why the five-file focused PASS cannot promote BM-W2-01 public retained-real runtime.
4. Derive the HANGER `first 7 + last 4 = 11` compaction from CONTROL and MISCEL custody.
5. Name the HANGER record-binding/tail-order modules that must remain present in the next focused graph and why bypassing them would invalidate qualification.
