# PR1057 Work Report

## Current state

- Base: `main@10b7e60b39c18460c812c9fa6dc9c7f46d81e77e`
- Successor to merged PR #1056.
- Scope: Writer2 runtime/evidence closure only unless an exact runtime gate exposes a concrete defect.
- Frozen `reallaksh19/3D_Converters` V11↔V14 source remains unmodified.
- Merge authority: OWNER_ONLY.
- Merge authorized: FALSE.

## Inherited evidence

- W2.34 focused live V11/V14 bridge/export-custody gate: exact 7-file Git-blob graph materialized; committed test executed unchanged under Node; `PASS_RUNTIME_EXACT_SEVEN_FILE_BLOB_GRAPH_NODE_ESM_MODE`.

## W2 C0 — exact broader product-routing graph

Live committed test: `tests/cii-workspace-writer2-product-routing.test.js`.

The graph is exactly 14 files:

### Executed/imported graph

1. `tests/cii-workspace-writer2-product-routing.test.js` — `2b01a6eba2e60eabdb3dd19b28c7aaba1deb758d`
2. `tabs/cii-workspace/cii-workspace-physical-file.js` — `0c4c445fbd3d4b929b1f9288b789b244547c8867`
3. `tabs/cii-workspace/cii-workspace-nodename.js` — `050df81250d62cc454856e403d6e4ffc85fd9321`
4. `tabs/cii-workspace/cii-workspace-writer2-routing.js` — `0748657f49956acaf01f5d0c9c0a205474f9a7bd`
5. `tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js` — `326954e4d6342ba25915c107c7118b4f51c23610`
6. `parser/fixed-field.js` — `485daa43553681ca54f488499e57f36d2239be58`
7. `tabs/cii-workspace/cii-workspace-contracts.js` — `6ab30d8dd088225fd89bb729bf9ffdebefe652f6`

### Source-read-only product files

8. `tabs/cii-workspace/cii-workspace-core.js` — `cee2858a63992648edf5e61b8f63b3837a937f9e`
9. `tabs/cii-workspace/cii-workspace-transfer-scope.js` — `eab079f074d37aecbe6cf6b82731e987dc71b36b`
10. `tabs/cii-workspace/cii-workspace-transfer-scope-ui.js` — `4d60b2c1f418ed3a7490a1f4d91f3c83f2cc5ae8`
11. `tabs/cii-workspace/cii-workspace-shell.js` — `226ae8f3a7906b0d28a8c10195ad9b27d7f6444e`
12. `tabs/cii-workspace/cii-workspace-engineering-ui.js` — `cff53d820075417f817d6768c16ce550910c28c5`
13. `tabs/cii-workspace/cii-workspace-writer-version-bridge.js` — `8038993f0a97719c0c316f31c2d6c30ea0386ec4`
14. `tabs/cii-workspace/cii-workspace-tab.js` — `b7589c7595f3b33cdd8529a03c7e990da4b68d76`

Why this remains a 14-file gate: `cii-workspace-core.js` and `cii-workspace-transfer-scope.js` are read using `fs.readFileSync()` and inspected with string assertions by this test. They are not imported by the test, so their transitive imports do not enter the W2 C0 executable graph.

### Runtime state

- 10/14 exact files remain materialized locally from the prior qualification workspace and match the Git blob identities above.
- Missing local exact blobs: `cii-workspace-nodename.js`, `cii-workspace-writer2-nodename-relocation.js`, complete `cii-workspace-core.js`, complete `cii-workspace-transfer-scope.js`.
- Direct private-repository checkout attempt on 2026-08-26: `fatal: unable to access 'https://github.com/reallaksh19/XML_Compare_Utilities.git/': Could not resolve host: github.com`.
- Therefore W2 C0 remains `NOT_RUN_EXACT_14_FILE_GRAPH_NOT_FULLY_MATERIALIZED`.
- No partial/stub/import-rewritten execution is accepted as qualification.

## W2 A — W2.13 synthetic public-product audit

Live test: `tests/cii-workspace-writer2-restraint-product-routing.test.js` blob `9922377ddeda86fc9167d65f33c97095346e79fa`.

The test is not a low-level RESTRAINT substitute. It directly imports and calls public `applyCiiWorkspaceTargetWriter2()` from `cii-workspace-core.js`, then proves:

- routed RESTRAINT whole-block DELETE is preview-ready;
- composite readiness identifies `BLOCK_DELETE_COMPACTION`;
- direct Writer2 composite result and public-product result are byte-identical;
- complete product postimage validation is `PASS` with zero unexpected semantic deltas;
- RESTRAINT CREATE remains blocked by `CII_WRITER_2_RESTRAINT_CREATE_BLOCKER`;
- forged policy authority fails closed;
- missing restraint component testimony fails closed;
- forged result schema fails closed;
- stale TARGET bytes fail with `CII_WRITER_2_STALE_TARGET_HASH`;
- Writer2 NODE-only path remains valid when no RESTRAINT mutation exists.

Because this test imports the full Workspace public entrypoint, no smaller restraint/composite unit test substitutes for W2 A. Runtime remains `NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT` until its complete transitive graph is available.

## Execution order

1. W2 C0 — exact 14-file Writer2 product-routing regression.
2. W2 A — unchanged W2.13 synthetic full Workspace runtime.
3. W2 B — retained-real V11 RESTRAINT product runtime.
4. BRIDGE B — real/native V14 change-isolated Writer2 roundtrip.
5. W2 C/D — inherited Writer2, adjacent Writer1 and browser/product regressions.
6. W2 H — final READY/NOT_READY freeze verdict.

## Rules

- No GitHub Actions qualification.
- No stubs, import rewrites, partial-core substitutes or workflow gaming.
- No fabricated PASS; unexecuted gates remain NOT_RUN.
- No lossy conversion.
- No Writer3 topology leakage.
- Preserve V11 CREATE source blockers for SIF/HANGER/RESTRAINT.
- Preserve Writer1A/B/C authority boundaries.
- Do not modify the frozen 3D_Converters source.

## Changed-file ledger

- `agents/PR1057_workreport.md` — living recovery record only.

## Appendix A — takeover qualification

1. State the exact current `main` SHA and PR1057 head SHA before any write.
2. Reconstruct the broader product-routing test graph from the committed imports and prove why it is exactly 14 files.
3. For every runtime PASS, list the exact Git blob SHA for every admitted file and the unchanged test command.
4. Explain why source-read `cii-workspace-core.js` and `cii-workspace-transfer-scope.js` do not expand the executable import graph for W2 C0.
5. State which remaining gate is first NOT_RUN after W2 C0 and why no lower-level substitute qualifies it.
