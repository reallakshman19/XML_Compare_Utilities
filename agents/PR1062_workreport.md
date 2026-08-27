# PR1062 Work Report — next retained-real Writer2 benchmarks

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

## Mission

Continue the owner-approved `ciibenchmarkroadmap.md` with the next orthogonal retained-real Writer2 benchmark cases. BM-W2-02 and BM-W2-04 already exist. Start with BM-W2-01 NODENAME CREATE; then proceed to BM-W2-03 HANGER DELETE-ALL when BM-W2-01 is authored and reconciled.

No production change is permitted from source inspection alone. A Writer production patch requires an authored runtime falsifier that reproduces the defect.

## Frozen benchmark source

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
Git blob e41cd05603b56837cbb6e31b9d4074ef6106fe9b
V11
ELEMENTS 40
CONTROL.NONAM 4
NODENAME rows 4
```

## BM-W2-01 source qualification

Retained source begins with ELEMENT `10 -> 20`. Its zero-based ELEMENT row 13 / field index 5 NODENAME pointer is `0`. Node 10 is the FROM endpoint.

Current Writer2 planner authority (`cii-workspace-writer2-nodename-relocation.js`, blob `326954e4d6342ba25915c107c7118b4f51c23610`) states:

1. CREATE requires no existing physical NODENAME field;
2. gather exact-custodied incident pointer=0 bindings;
3. choose lowest parsed ELEMENT index;
4. append after all retained existing NODENAME rows;
5. assign 1-based pointer `retainedRows.length + appendIndex + 1`.

For the frozen source this predicts:

```text
candidate node       10
owner element index  0
owner endpoints      10 -> 20
owner end            FROM
pointer before       0
NODENAME rows before 4
new pointer          5
name                  BM-N10
CONTROL.NONAM         4 -> 5
NODENAME rows         4 -> 5
ELEMENT count         40 -> 40
topology              unchanged
```

The independent benchmark oracle must independently prove node 10 has no physical name through any pointer-bound NODENAME endpoint before constructing the expected postimage.

## Source-inspection risk — V11 NODENAME pointer lexical I13

`cii-workspace-writer2-nodename-write.js` currently formats CONTROL.NONAM using `integerField()`, but formats ELEMENT NODENAME pointer replacements through `numericField() -> formatCiiWriterSig6()`.

`formatCiiWriterSig6(5)` formats as a REAL-style token, while ELEMENT NODENAME pointer is an integer fixed-field coordinate. This is a source-level defect candidate in the same class as previously fixed V14/SIF/RESTRAINT I13 defects.

Classification now:

```text
STATUS: SUSPECTED_FROM_SOURCE_INSPECTION
RUNTIME_FALSIFIER: NOT_RUN
PRODUCTION_PATCH_AUTHORIZED: FALSE until authored exact runtime reproduces
```

BM-W2-01 will require the expected pointer field to match `/^[+-]?\d+$/` after trimming.

## Inherited runtime truth

```text
BM-W2-04 NOT_RUN
W2 A     NOT_RUN
W2 B     NOT_RUN
W2.35    NOT_RUN
W2.35a   NOT_RUN
W2.40    NOT_RUN
W2 H     NOT_READY
```

Merging #1061 did not promote any runtime gate.

## Authority boundaries

No SIF/HANGER/RESTRAINT CREATE, Writer3 topology, workflow, parser/converter rewrite, raw SIF field-2 semantic authority, benchmark-source modification, or validation weakening.

## Changed-file ledger

Current durable scope begins with this workreport plus PR1062 status/claims. Benchmark files will be appended as authored. Production files remain unchanged unless exact runtime later reproduces a defect.

## Exact next actions

1. author independent BM-W2-01 structural postimage oracle;
2. author retained-real BM-W2-01 low-level + public Writer2 test;
3. update benchmark manifest/roadmap with frozen candidate facts and oracle coordinates;
4. attempt exact runtime only if a complete exact graph can be materialized;
5. runtime mismatch in pointer lexical field is a genuine production falsifier; then repair surgically;
6. otherwise proceed automatically to BM-W2-03 HANGER DELETE-ALL.

## Appendix A — takeover qualification

1. Prove node 10's exact retained-source ELEMENT owner, endpoint side and pointer field coordinate.
2. Trace current append allocation and derive pointer 5 without using Writer2 output as the oracle.
3. Explain why `formatCiiWriterSig6()` is not valid authority for an ELEMENT NODENAME I13 pointer even if the parser reads the number correctly.
4. Reconstruct the independent oracle's authorized coordinates and negative assurance.
5. State the exact runtime observation required before changing `cii-workspace-writer2-nodename-write.js`.
