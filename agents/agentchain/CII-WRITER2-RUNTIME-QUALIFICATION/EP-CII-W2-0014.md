# EP-CII-W2-0014 — supersede stale QS0013 qualification basis

CHAIN_ID: CII-WRITER2-RUNTIME-QUALIFICATION
LEG_ID: PR1064-QUALIFICATION-FRESHNESS-RECOVERY
ENDPOINT_ID: EP-CII-W2-0014
PREVIOUS_ENDPOINT: EP-CII-W2-0013

CREATED_AT: 2026-08-29T09:20:00+05:30
ENDPOINT_REASON: SUPERSESSION

TASK / ISSUE: Writer2 W2 A plus BM-W2-01..04 exact public runtime qualification
PR: #1064 — CII: execute Writer2 W2A exact public runtime
BRANCH: agent/cii-writer2-w2a-runtime-execution

CHECKPOINT_HEAD: 6cfa288b02aecd1cec4de6398993a4bc7b47bf03
MAIN_HEAD_OBSERVED: d35f6aa419244585afec2c47c8fbd0584011931a
MERGE_BASE: d35f6aa419244585afec2c47c8fbd0584011931a
FROZEN_RUNTIME_MATERIAL_BASIS: a9018c131be736606e44fd0379545d233238f33e
FROZEN_RUNTIME_ROOT_TREE: 27eb6c81b8b69742e781720b2450714df7c7f74e

STATE: QUALIFICATION_REQUIRED
EXECUTION_MODE: AUTO
AUTO_STATE: TAKEOVER_VERIFIER_REQUIRED
SCOPE_AUTHORITY: READ_ONLY_W2A_AND_BM_PUBLIC_RUNTIME_QUALIFICATION
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
COORDINATION_STATE: SAFE

ENGINEERING_CRITICAL_WRITE_AUTHORITY: FALSE
PRODUCTION_PATCH_AUTHORITY: NONE
QUALIFICATION_STATUS: DEFERRED_VERIFICATION
TAKEOVER_AUTHORITY: READ_ONLY

SUPERSEDES_ENDPOINT: EP-CII-W2-0013
SUPERSEDED_ASSERTION: `QUESTION_SET_STATUS: CURRENT` with `QUALIFICATION_BASIS_HEAD: a9018c131be736606e44fd0379545d233238f33e`.
CORRECTED_STATE: The frozen runtime checkout remains `a9018c...`, but takeover qualification for the current unresolved leg must bind to PR head `6cfa288b...` because the execution batch script and manifest are validation-methodology artifacts added after `a9018c...` and are explicitly tested by Q1-Q5.
EVIDENCE: engineering-pr-delivery-v2 qualification freshness treats validation methodology as material; compare `1e69fbfa... -> 6cfa288b...` adds the batch script, batch manifest, EP0013 and index update.

## Mission and current state

Execute unchanged public Writer2 W2 A on the exact frozen runtime checkout and, only after W2 A candidate PASS, run BM-W2-01 through BM-W2-04 in order. Preserve environment stops as NOT_RUN and the first authored assertion/product exception as FAIL. No Writer2 production mutation is authorized yet.

## This leg completed

- Re-grounded after PR #1063 had already merged at `d35f6aa419244585afec2c47c8fbd0584011931a`.
- Confirmed existing successor PR #1064 is the active non-conflicting chain leg.
- Reconfirmed native Git in the current execution container still fails DNS resolution for github.com.
- Confirmed PR #1064 has no workflow runs or PR comments supplying runtime evidence.
- Audited `PR1064_writer2_public_runtime_batch.sh` and manifest read-only.
- Confirmed all four BM runners emit unique authored completion markers, while the current batch script enforces an explicit completion marker only for W2 A; this is a possible later evidence-hardening improvement, not a Writer2 product defect.
- Identified and corrected the stale takeover qualification basis through this immutable superseding endpoint.

## Currently in progress

Takeover qualification is pending. The incoming candidate may inspect, reproduce and author its answer artifact while READ_ONLY. It may not self-verify or mutate engineering-critical production/validation behavior.

## Remaining work

1. Candidate answers QS-0014 from the live repository.
2. Independent verifier scores the candidate answer against this endpoint and `6cfa288b...`.
3. If `PASS_WRITE_ALLOWED`, retain the granted scope; execution still requires an exact-checkout substrate.
4. Run `bash agents/evidence/PR1064_writer2_public_runtime_batch.sh` in an exact-checkout-capable substrate.
5. Classify raw first nonzero boundary; only an authored FAIL plus valid write authority permits a surgical product patch.
6. Full candidate PASS admits subsequent gate review; it does not automatically promote W2 B/V14/release gates.

## Exact next action

Create `agents/qualifications/CII-WRITER2-RUNTIME-QUALIFICATION/CII-W2-QS-0014-<candidate>-answer.md` from live PR #1064 evidence, then obtain an independent verifier verdict. Until that verdict exists, keep engineering-critical mutation READ_ONLY.

## Known / proven

- PR #1064 head before this metadata recovery is `6cfa288b02aecd1cec4de6398993a4bc7b47bf03` and is based on `main@d35f6aa...`.
- Frozen runtime basis/tree and all five runner blobs remain pinned in the batch manifest.
- W2 A and BM-W2-01..04 public runtime remain NOT_RUN.
- Focused family runtime PASS remains a narrower inherited evidence class only.
- No authored public Writer2 failure has been reached.
- The current tool substrate still cannot clone github.com.
- No independent verifier verdict exists for the current incoming candidate.

## Not proven / NOT_RUN

`W2 A`, `BM-W2-01..04 public`, `W2 B`, `W2.35`, `W2.35a`, and `W2.40` remain NOT_RUN. `W2 H` remains NOT_READY.

## Active hypothesis

The unresolved blocker is still exact checkout execution, not a demonstrated Writer2 product defect. The batch capsule is suitable for execution, but its current benchmark stages could be evidentially hardened later by requiring each runner's unique completion marker.

## Falsifier

An exact checkout runs W2 A and reaches an authored assertion/product exception. That raw boundary falsifies the environment-only hypothesis. A clean W2 A exit with its required completion marker and clean tree admits BM-W2-01..04.

## Protected invariants

- frozen runtime basis/root tree and runner/source blob identities;
- no stubs, import rewrites, partial-core substitutes or manually reconstructed checkout evidence;
- focused PASS is not public PASS;
- frozen benchmark/oracle/tolerance custody;
- lexical fixed-width integer custody;
- RESTRAINT 24-row block/cardinality and unrelated-byte/topology preservation;
- SIF CREATE and raw field-2 semantics remain blocked/unqualified;
- Writer1C and Writer3/topology boundaries remain unchanged;
- no workflow mutation/bypass;
- candidate != verifier for engineering-critical write authorization.

## Do not redo

Do not redo static W2 A dependency closure or previously exhausted materialization-route probes unless the available tool substrate changes.

## Do not change

Do not change Writer2 production, authored public runners, frozen source/oracles/tolerances, SIF CREATE authority, Writer1C custody, Writer3/topology or workflows while write authority is false.

## Expected next-leg files / domains

Qualification answer/verdict artifacts and relay metadata only until valid write authority plus authored runtime failure exist. Any later material patch must be one first-wrong boundary plus one narrow falsifier/regression.

## Inputs

- `agents/evidence/PR1064_writer2_public_runtime_batch.sh`
- `agents/evidence/PR1064_writer2_public_runtime_batch_manifest.md`
- `tests/cii-workspace-writer2-restraint-product-routing.test.js`
- `Benchmark/CIICompare/BM_CII_SOURCE.CII`

## Benchmarks

- `Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json`
- BM-W2-01 NODENAME CREATE
- BM-W2-02 SIF DELETE
- BM-W2-03 HANGER DELETE-ALL
- BM-W2-04 RESTRAINT DELETE COMPACTION

## Common / governing documents

- `reallaksh19/Common@10d667ce715bb52e1f73035c6fa326db77d0f9dd/skills/engineering-pr-delivery-v2/SKILL.md`
- `references/qualification.md`
- `references/relay-model.md`
- `references/agentchain-schema.md`
- `references/auto-mode.md`

## Authoritative sources

Already-qualified V11 fixed-format/pointer/cardinality custody plus independently frozen benchmark structural expectations. This relay correction creates no new engineering semantic authority.

## Production paths

Unchanged `cii-workspace-core.js` public Writer2 dispatch, canonical intake/topology, Writer2 composite routing/RESTRAINT execution and product validation paths.

## Validation / test paths

- `bash agents/evidence/PR1064_writer2_public_runtime_batch.sh`
- W2 A first, then BM-W2-01 -> 02 -> 03 -> 04 only after W2 A candidate PASS.

## Changed during this leg

Relay metadata only: this immutable superseding endpoint plus the subsequent index update and candidate qualification answer. No product/test/benchmark/oracle/workflow mutation.

## Validation summary

- Live PR/main recovery: PASS artifact inspection.
- Qualification freshness defect: CONFIRMED by compare + governing v2 freshness rule.
- Runtime W2 A/BM public: NOT_RUN.
- Native Git retry: NOT_RUN_ENVIRONMENT / DNS resolution failure.
- Production patch authority: NONE.

## Open risks / questions

The external exact-checkout substrate is still unavailable here. No independent verifier tool is available in this session, so qualification must remain `DEFERRED_VERIFICATION` after the candidate answer is persisted.

## Next-agent qualification

QUALIFICATION_BASIS_HEAD: 6cfa288b02aecd1cec4de6398993a4bc7b47bf03
QUESTION_SET_ID: CII-W2-QS-0014
QUESTION_SET_STATUS: CURRENT

### Q1 — Production Trace

Trace the exact PR1064 batch from identity verification through W2 A public `applyCiiWorkspaceTargetWriter2()` execution and the conditional BM-W2-01..04 sequence. Name the frozen basis/tree/source/runner custody and the first authored W2 A assertion boundary.

### Q2 — Current Unresolved Problem / Failure Isolation

For the first nonzero W2 A result, specify the minimum raw evidence needed to distinguish clone/module/environment NOT_RUN from an authored assertion/product FAIL. Give the prediction under the environment-only hypothesis and the exact falsifier.

### Q3 — Authority / Invariant

State what a valid takeover verdict may authorize and what it cannot authorize. Include public-vs-focused evidence separation, independent oracle custody, lexical I13, SIF CREATE/raw field-2, Writer1C, Writer3/topology, workflow and merge boundaries.

### Q4 — Independent Validation

Independently state the structural expected postconditions for BM-W2-01 through BM-W2-04 and explain why production output cannot be used to regenerate those expected values. Include the authored completion-marker observation and whether enforcing those markers is product logic or validation methodology.

### Q5 — Next Contribution / Minimal Patch

For each outcome—environment NOT_RUN, authored W2 A FAIL, benchmark FAIL after W2 A PASS, or full batch candidate PASS—state the exact next safe contribution. If a fix is permitted, name the smallest allowed patch shape and rollback/falsifier boundary.