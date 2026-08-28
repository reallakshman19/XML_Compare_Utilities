# EP-CII-W2-0012 — PR1064 exact-runtime successor opened

CHAIN_ID: CII-WRITER2-RUNTIME-QUALIFICATION
LEG_ID: PR1064-W2A-EXACT-PUBLIC-RUNTIME
ENDPOINT_ID: EP-CII-W2-0012
PREVIOUS_ENDPOINT: EP-CII-W2-0011

CREATED_AT: 2026-08-28T18:13:00+05:30
ENDPOINT_REASON: POST_MERGE_SUCCESSOR_PR_OPENED

TASK / ISSUE: Writer2 W2 A exact public runtime execution
PR: #1064 — CII: execute Writer2 W2A exact public runtime
BRANCH: agent/cii-writer2-w2a-runtime-execution

CHECKPOINT_HEAD: 09e2c9116db6d35b30b2c0b78b5f7310a33c6cef
MAIN_HEAD_OBSERVED: d35f6aa419244585afec2c47c8fbd0584011931a
MERGE_BASE: d35f6aa419244585afec2c47c8fbd0584011931a
FROZEN_RUNTIME_MATERIAL_BASIS: a9018c131be736606e44fd0379545d233238f33e
FROZEN_RUNTIME_ROOT_TREE: 27eb6c81b8b69742e781720b2450714df7c7f74e
W2_A_TEST_BLOB: 9922377ddeda86fc9167d65f33c97095346e79fa

STATE: BLOCKED
EXECUTION_MODE: AUTO
AUTO_STATE: EXACT_CHECKOUT_EXECUTION_REQUIRED
SCOPE_AUTHORITY: READ_ONLY_W2A_RUNTIME_QUALIFICATION
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
COORDINATION_STATE: SAFE

ENGINEERING_CRITICAL_WRITE_AUTHORITY: FALSE
PRODUCTION_PATCH_AUTHORITY: NONE

## Mission and current state

PR #1063 was squash-merged to main at `d35f6aa419244585afec2c47c8fbd0584011931a` as an evidence/relay-only closure. The merge explicitly preserved W2 A, BM-W2-01..04 public, W2 B, W2.35, W2.35a and W2.40 as `NOT_RUN`, with W2 H `NOT_READY`, and granted no production Writer2, SIF CREATE, Writer3/topology, benchmark/oracle/tolerance or workflow authority.

PR #1064 is the successor leg. Its sole P0 objective is to execute unchanged W2 A through the real public Writer2 route on an exact checkout of the frozen runtime material basis `a9018c131be736606e44fd0379545d233238f33e`.

The successor branch is based on the new main commit `d35f6aa...`, but the runtime evidence target remains the frozen pre-evidence material basis because PR #1063 changed only `agents/**` evidence/relay files and intentionally did not alter product/test/benchmark/oracle/workflow behavior.

## Completed in this leg

- Verified post-merge main moved exactly to `d35f6aa419244585afec2c47c8fbd0584011931a`.
- Confirmed the squash merge message preserves all W2 public runtime gates and authority boundaries without promotion.
- Created successor branch `agent/cii-writer2-w2a-runtime-execution` from exact main `d35f6aa...`.
- Opened draft PR #1064 from that exact base.
- Added only a relay/evidence launch marker before this endpoint.
- Did not change production code, authored W2 A test, benchmarks, independent oracle values, tolerances, parser/converter code or workflows.

## Current blocker

The execution substrate available to this agent still cannot materialize the exact frozen repository checkout. EP11 already exhausted all accessible in-platform transport/artifact routes and explicitly prohibits repeating those probes unless capability changes.

```text
SUCCESSOR_PR                OPEN_DRAFT
SUCCESSOR_BASE              d35f6aa419244585afec2c47c8fbd0584011931a
FROZEN_RUNTIME_BASIS        a9018c131be736606e44fd0379545d233238f33e
STATIC_SOURCE_GRAPH         CLOSED
EXACT_EXECUTABLE_CHECKOUT   UNAVAILABLE_IN_CURRENT_ENVIRONMENT
W2_A                        NOT_RUN
FIRST_AUTHORED_FAILURE      NONE
PRODUCTION_PATCH_AUTHORITY  NONE
```

## Exact next action

In an execution substrate with exact checkout access, follow the already-merged capsule:

```text
agents/evidence/PR1063_w2a_external_execution_capsule.md
```

Materialize exactly:

```text
HEAD      = a9018c131be736606e44fd0379545d233238f33e
root tree = 27eb6c81b8b69742e781720b2450714df7c7f74e
W2 A blob = 9922377ddeda86fc9167d65f33c97095346e79fa
```

Then run unchanged:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

Preserve pre/post worktree state, stdout, stderr, exit code and all three identities.

## Classification rule

```text
checkout/network/materialization stop              -> NOT_RUN / environment
module/environment stop before authored assertion  -> NOT_RUN / environment
first reached authored assertion/product exception -> FAIL
clean authored exit 0 + expected completion         -> candidate PASS
```

Candidate PASS does not automatically grant engineering-critical write or release authority.

## If W2 A candidate PASS

Proceed unchanged in this order:

```text
BM-W2-01 public — NODENAME
BM-W2-02 public — SIF DELETE
BM-W2-03 public — HANGER
BM-W2-04 public — RESTRAINT
```

Do not jump directly to W2 B/W2.35/W2.35a/W2.40.

## If W2 A authored FAIL

- preserve raw first failure;
- identify the first wrong boundary in order: plan routing/readiness -> RESTRAINT composite mutation -> canonical postimage re-intake -> product validator -> public/direct equality/stale-hash/negative cases;
- do not patch until an independent verifier qualifies engineering-critical write authority on the material basis;
- after authority, patch only the first wrong production boundary and rerun W2 A before broader tests.

## Known / proven

- PR #1063 merge did not change product/test/benchmark/oracle/workflow behavior.
- Exact W2 A static dependency closure is complete.
- Frozen W2 A material basis/root-tree/test-blob identities are known.
- Public core path is source-closed through canonical target re-intake/hash protection, RESTRAINT composite dispatch, canonical postimage re-intake and Writer2 product validation.
- First authored W2 A assertion after successful module load is `routedPlan.status === 'PREVIEW_READY'`.

## NOT_RUN / not proven

`W2 A`, `BM-W2-01..04 public`, `W2 B`, `W2.35`, `W2.35a`, and `W2.40` remain `NOT_RUN`. `W2 H` remains `NOT_READY`.

## Protected invariants / authority

- no SIF CREATE authority;
- raw SIF field-2 semantics remain bounded;
- Writer1C custody unchanged;
- no Writer3/topology promotion;
- benchmark/oracle/tolerance custody unchanged;
- no workflow mutation/bypass;
- no source reconstruction or partial-core substitutes;
- lexical I13 RESTRAINT count/pointer fields preserved;
- exact 24-row RESTRAINT block cardinality/deletion compaction preserved;
- unrelated-byte/topology protection preserved;
- focused PASS is not public PASS.

## Do not redo

Do not redo PR #1063 static dependency closure, Actions-artifact search, archive transport probes, historical sparse-mirror search, or Library search unless the execution/tool capability materially changes.

## Inputs

- `agents/evidence/PR1063_w2a_external_execution_capsule.md`
- `agents/evidence/PR1063_w2a_dependency_ledger.md`
- `agents/evidence/PR1063_w2a_static_closure_complete.md`
- `agents/evidence/PR1063_w2a_execution_environment_capability_audit.md`
- `agents/evidence/PR1063_w2a_materialization_route_exhaustion.md`
- `tests/cii-workspace-writer2-restraint-product-routing.test.js`
- `tests/cii-workspace-writer2-composite-restraint-fixture.js`
- `tabs/cii-workspace/cii-workspace-core.js`

## Benchmarks

- `Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json`
- BM-W2-01 NODENAME
- BM-W2-02 SIF DELETE
- BM-W2-03 HANGER
- BM-W2-04 RESTRAINT

## Common / governing documents

- `reallaksh19/Common@10d667ce715bb52e1f73035c6fa326db77d0f9dd/skills/engineering-pr-delivery-v2/SKILL.md`
- associated relay, qualification, auto-mode, source-indexing, engineering-validation, anti-gaming, git/PR and multi-agent references

## Changed this leg

```text
agents/evidence/CII_W2A_RUNTIME_SUCCESSOR_START.md
agents/agentchain/CII-WRITER2-RUNTIME-QUALIFICATION/EP-CII-W2-0012.md
agents/agentchain.md  (next index update)
```

No production/test/benchmark/oracle/workflow file changed.

## Validation summary

```text
PR1063_MERGE                 PASS_EXACT_HEAD_SQUASH
POST_MERGE_MAIN              PASS_D35F6AA
SUCCESSOR_PR                 OPEN_DRAFT
STATIC_SOURCE_CLOSURE        PASS_SOURCE_INSPECTION
W2_A_RUNTIME                 NOT_RUN
```

## Next-agent qualification

QUALIFICATION_BASIS_HEAD: a9018c131be736606e44fd0379545d233238f33e
QUESTION_SET_ID: CII-W2-QS-0012
QUESTION_SET_STATUS: CURRENT

### Q1 — Production Trace
Trace unchanged W2 A from the test entrypoint through plan contract/readiness, public target re-intake/hash custody, RESTRAINT composite mutation, postimage re-intake and product validation. Identify the first authored assertion.

### Q2 — Current Unresolved Problem / Failure Isolation
Define the exact retained evidence package required from an external exact-checkout run and explain how it distinguishes environment `NOT_RUN`, authored `FAIL`, and candidate `PASS`.

### Q3 — Authority / Invariant
Explain why merging PR #1063 does not promote W2 A or any downstream gate, and list the frozen authority boundaries.

### Q4 — Independent Validation
Independently reconstruct `[1,2,3,0] -> [1,0,2,0]`, CONTROL `3 -> 2`, RESTRANT rows `72 -> 48`, lexical I13 and retained-block byte identity without relying on production output.

### Q5 — Next Contribution / Minimal Patch
For each possible W2 A outcome (`NOT_RUN`, `FAIL`, candidate `PASS`), state the exact next safe action and what may or may not be modified.
