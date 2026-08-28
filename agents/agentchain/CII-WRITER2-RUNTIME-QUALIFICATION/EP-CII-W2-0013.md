# EP-CII-W2-0013 — PR1064 W2A + BM public runtime batch ready

CHAIN_ID: CII-WRITER2-RUNTIME-QUALIFICATION
LEG_ID: PR1064-W2A-PLUS-BM-PUBLIC-RUNTIME-BATCH-READY
ENDPOINT_ID: EP-CII-W2-0013
PREVIOUS_ENDPOINT: EP-CII-W2-0012

CREATED_AT: 2026-08-28T21:02:13+05:30
ENDPOINT_REASON: NON_MICRO_EXACT_RUNTIME_BATCH_PREPARED

TASK / ISSUE: Writer2 W2 A plus BM-W2-01..04 exact public runtime qualification
PR: #1064 — CII: execute Writer2 W2A exact public runtime
BRANCH: agent/cii-writer2-w2a-runtime-execution

PRE_BATCH_HEAD: 1e69fbfa6ee65c91fb320800a7281f6098675452
MAIN_HEAD_OBSERVED: d35f6aa419244585afec2c47c8fbd0584011931a
MERGE_BASE: d35f6aa419244585afec2c47c8fbd0584011931a
FROZEN_RUNTIME_MATERIAL_BASIS: a9018c131be736606e44fd0379545d233238f33e
FROZEN_RUNTIME_ROOT_TREE: 27eb6c81b8b69742e781720b2450714df7c7f74e

STATE: BLOCKED
EXECUTION_MODE: AUTO
AUTO_STATE: EXTERNAL_EXACT_CHECKOUT_BATCH_REQUIRED
SCOPE_AUTHORITY: READ_ONLY_W2A_AND_BM_PUBLIC_RUNTIME_QUALIFICATION
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
COORDINATION_STATE: SAFE

ENGINEERING_CRITICAL_WRITE_AUTHORITY: FALSE
PRODUCTION_PATCH_AUTHORITY: NONE
BATCH_EXECUTION_CAPSULE: READY
BATCH_EXECUTION_STATUS: NOT_RUN

## Meaningful transition

EP12 established the successor PR and exact W2 A execution gate. This endpoint advances one larger batch rather than creating per-test micro legs: the exact authored W2 A public runtime and all four retained-real public Writer2 benchmark runners are now assembled into one fail-closed execution capsule with frozen blob identity checks and stop-on-first-failure semantics.

This is preparation only. No runtime execution occurred in the current substrate, so no W2 gate is promoted.

## Frozen batch identity

```text
basis      a9018c131be736606e44fd0379545d233238f33e
root tree  27eb6c81b8b69742e781720b2450714df7c7f74e
registry   d786d1e970666aa528a0e3d0822610f6afcb8364
source     e41cd05603b56837cbb6e31b9d4074ef6106fe9b
```

Authored runners:

```text
W2 A       tests/cii-workspace-writer2-restraint-product-routing.test.js
           9922377ddeda86fc9167d65f33c97095346e79fa
BM-W2-01   tests/cii-workspace-writer2-benchmark-nodename-create.test.js
           7ba33984f290550f6f40eb91369ce9ceab1b74af
BM-W2-02   tests/cii-workspace-writer2-benchmark-sif-delete.test.js
           688bc905c877ea63c65ba21624ac647660009eee
BM-W2-03   tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
           93703ac66fec9b663165d95a20afbc654b6e26f4
BM-W2-04   tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
           54c08bf0b2baf8138a703350d9e2600387693008
```

## Batch artifacts

- `agents/evidence/PR1064_writer2_public_runtime_batch.sh`
- `agents/evidence/PR1064_writer2_public_runtime_batch_manifest.md`

The script:

- creates an isolated clone and detached checkout at the frozen basis;
- verifies HEAD, root tree, registry, retained-real source and all five authored runner blobs before execution;
- verifies a clean worktree before runtime and after every successful stage;
- records Git and Node versions, stdout, stderr and exit code per stage;
- runs W2 A first and requires its authored completion marker;
- runs BM-W2-01 -> 02 -> 03 -> 04 only after W2 A candidate PASS;
- stops on the first nonzero benchmark rather than hiding a failure with later execution;
- does not mutate production, tests, benchmarks, oracle values, tolerances or workflows.

## Repo-native execution-path audit

The repository does not currently contain a generic W2 A-capable workflow. The observed workflows are specialized:

```text
.github/workflows/topology-staged-export-interchange.yml
.github/workflows/verify-module-boundaries.yml
.github/workflows/xml-test.yml
```

Repurposing or modifying one merely to create qualification evidence would cross the protected workflow/evidence boundary. No compatible connected terminal/Codespace/runner substrate was available to this agent. Therefore the external exact-checkout batch remains the admissible execution route.

## Exact next action

In a GitHub-checkout-capable environment, run the batch script from the PR branch:

```text
bash agents/evidence/PR1064_writer2_public_runtime_batch.sh
```

Return the complete emitted evidence directory unchanged.

## Classification / sequencing

```text
clone/checkout/materialization failure                -> NOT_RUN / environment
identity mismatch                                     -> NOT_RUN / wrong material
module/environment stop before authored W2 A code     -> NOT_RUN / environment
first reached authored W2 A assertion/product error   -> FAIL
W2 A exit 0 + marker + clean tree                     -> candidate PASS
```

Only the last state admits:

```text
BM-W2-01 -> BM-W2-02 -> BM-W2-03 -> BM-W2-04
```

A benchmark nonzero stops the batch immediately. The first failing benchmark requires classification from its raw stdout/stderr; all later public benchmarks remain `NOT_RUN`.

## Gate state

```text
W2 A                 NOT_RUN
BM-W2-01 public       NOT_RUN
BM-W2-02 public       NOT_RUN
BM-W2-03 public       NOT_RUN
BM-W2-04 public       NOT_RUN
W2 B                  NOT_RUN
W2.35                 NOT_RUN
W2.35a                NOT_RUN
W2.40                 NOT_RUN
W2 H                  NOT_READY
```

## Protected authority / invariants

- no SIF CREATE authority;
- raw SIF field-2 semantic widening remains prohibited;
- Writer1C custody unchanged;
- no Writer3/topology promotion;
- no benchmark, independent-oracle or tolerance mutation;
- no workflow mutation or unrelated-workflow evidence bypass;
- no regenerated tests, stubs, import rewrites, partial-core substitutes or manually reconstructed checkout evidence;
- lexical fixed-width integer custody remains mandatory where benchmark contracts require it;
- RESTRAINT 24-row block cardinality/compaction and retained-block byte identity remain independently constrained;
- focused family PASS cannot promote public runtime PASS;
- no production patch before a first authored failure is preserved and engineering-critical write authority is independently verified.

## Inputs / benchmarks / common docs

Inputs:
- `agents/evidence/PR1063_w2a_external_execution_capsule.md`
- `agents/evidence/PR1063_w2a_static_closure_complete.md`
- `agents/evidence/PR1063_w2a_materialization_route_exhaustion.md`
- `tests/cii-workspace-writer2-restraint-product-routing.test.js`

Benchmarks:
- `Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json`
- `Benchmark/CIICompare/BM_CII_SOURCE.CII`
- BM-W2-01 NODENAME CREATE
- BM-W2-02 SIF DELETE
- BM-W2-03 HANGER DELETE-ALL
- BM-W2-04 RESTRAINT DELETE COMPACTION

Common / governing:
- `reallaksh19/Common@10d667ce715bb52e1f73035c6fa326db77d0f9dd/skills/engineering-pr-delivery-v2/SKILL.md`

## Validation summary

```text
STATIC_SOURCE_GRAPH          CLOSED
FROZEN_BATCH_IDENTITIES      PINNED
GENERIC_REPO_NATIVE_RUNNER   NONE_ADMISSIBLE
EXTERNAL_BATCH_CAPSULE       READY
W2_A_RUNTIME                 NOT_RUN
BM_W2_01_04_PUBLIC           NOT_RUN
ENGINEERING_CRITICAL_WRITE   FALSE
PRODUCTION_PATCH_AUTHORITY   NONE
```

## Next-agent qualification

QUALIFICATION_BASIS_HEAD: a9018c131be736606e44fd0379545d233238f33e
QUESTION_SET_ID: CII-W2-QS-0013
QUESTION_SET_STATUS: CURRENT

### Q1 — Exact batch identity and order
State the frozen basis, root tree, registry/source custody and all five authored runner identities. Explain why W2 A must execute before BM-W2-01..04 and give the exact benchmark order.

### Q2 — Nonzero W2 A classification
Given a nonzero W2 A run, identify the evidence needed to distinguish an environment/module `NOT_RUN` from an authored assertion/product `FAIL`. State why the exit code alone is insufficient.

### Q3 — Benchmark admission and stop rule
What exact predicate admits BM-W2-01..04? If BM-W2-02 is the first nonzero case, which cases are `PASS` candidates, which require classification, and which remain `NOT_RUN`?

### Q4 — Independent engineering invariants
Without using production output as an oracle, state the independent structural invariants that protect NODENAME, SIF DELETE, HANGER DELETE-ALL and RESTRAINT block compaction, including lexical fixed-width custody and unrelated-byte/topology protection.

### Q5 — Authority after batch outcomes
For environment `NOT_RUN`, authored `FAIL`, and full batch candidate `PASS`, state the next safe action. Identify the independent condition required before any production Writer2 patch and list the authorities that remain prohibited.
