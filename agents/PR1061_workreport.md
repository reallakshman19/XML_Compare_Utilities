# PR1061 Work Report — Writer2 BM-W2-04 exact runtime closure

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_MAIN: 9c6b49b7846906c5274cf57e6537ed4e7a6a6f8c
BRANCH: agent/cii-writer2-bmw204-runtime-closure-2
PR: #1061 / DRAFT / OPEN
PREDECESSOR: PR #1060 / squash-merged at 9c6b49b7846906c5274cf57e6537ed4e7a6a6f8c
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: INVESTIGATE / VALIDATE / IMPLEMENT_ONLY_ON_REPRODUCED_DEFECT
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

## Inherited truth

```text
W2.34 focused bridge/export      PASS
W2 C0 exact public route         PASS
V14 lexical-I13 focused gate     PASS
RESTRAINT lexical-I13 focused    PASS_RUNTIME_EXACT_5_FILE_BLOB_GRAPH
BM-W2-04 exact public runtime    NOT_RUN
W2 A synthetic public runtime    NOT_RUN
W2 B retained-real V11           NOT_RUN
W2.35 generated V14              NOT_RUN
W2.35a #1042 generated V14       NOT_RUN
W2.40 native V14                 NOT_RUN
W2 H release freeze              NOT_READY
```

## Current mission

Finish the exact transitive static-ESM graph for `tests/cii-workspace-writer2-benchmark-restraint-delete.test.js`, Git-blob verify every admitted repository file, execute the authored test unchanged, and classify only the resulting authored runtime as PASS or FAIL.

No stubs, import rewrites, partial-core substitutes, reconstructed PASS, benchmark weakening, or production changes without a newly reproduced exact runtime defect.

## Public-core direct static imports

Current exact `tabs/cii-workspace/cii-workspace-core.js` blob:

```text
cee2858a63992648edf5e61b8f63b3837a937f9e
```

Direct imports that remain part of the public graph include geometry, multi-base authority/correspondence, landmarks, anchor suggestions, topology/path candidates, node custody, component correspondence, identity, engineering deltas, Writer1B/1C delta augmentation, restraint transfer/slot transfer, review/compare/transfer-plan, stage model, Writer1A/1B/1C implementations/readiness, Writer2 routing/hanger/restraint composites, writer validators, and export bundling.

The RESTRAINT writer/validator path and CAESAR parser/intake frontier were already pinned in PR #1060; do not restart those unless a current blob mismatch is observed.

## Exact next action

1. Enumerate and pin the remaining direct `cii-workspace-core.js` imports in coherent batches.
2. Expand each file's static imports transitively.
3. Verify every admitted file against its current Git blob.
4. Materialize the complete exact graph if repository transport becomes available; otherwise keep runtime NOT_RUN.
5. Execute unchanged `tests/cii-workspace-writer2-benchmark-restraint-delete.test.js` only after the graph is complete.
6. First authored assertion/runtime failure after complete graph materialization is a genuine BM-W2-04 FAIL.
7. Clean authored completion promotes BM-W2-04 runtime only; W2 A/B remain independent gates.

## Authority boundaries

No SIF/HANGER/RESTRAINT CREATE allocation authority, Writer3 topology widening, lossy V14 bridge, raw SIF field-2 semantic authority, generic parser rewrites, or qualification-state promotion from source inspection.

## Changed-file ledger

```text
agents/continuations/cii-writer2-bmw204-runtime-closure-2.md  seed only; remove after PR-specific custody is established
agents/PR1061_workreport.md
agents/status/PR1061.yaml
agents/claims/PR1061.yaml
```

## Appendix A — takeover qualification

1. State why PR #1060's merge does not convert BM-W2-04 from NOT_RUN to PASS.
2. Trace the exact public Writer2 RESTRAINT route from `applyCiiWorkspaceTargetWriter2()` through postimage re-intake and product validation.
3. Explain the lexical-I13 RESTRAINT defect fixed in #1060 and why it was a real authority mismatch.
4. List the unresolved direct static-import families of `cii-workspace-core.js` that prevent exact BM-W2-04 execution today.
5. State the exact event that changes BM-W2-04 from NOT_RUN to PASS or FAIL.
