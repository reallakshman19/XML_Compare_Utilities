# WP-006 — CII Writer2 benchmark-exact repair work report

## PR Mission Control

- Mission: Repair Utilities → CII Writer 2 — V11/V14 so retained S1/S2/S3 → T matches `Benchmark/TEXPECTED-PARTIALLLYDONE.CII`, with independently correct auto-anchor/correspondence, exact Transfer APPLY set/cardinality, exact Compare result, and full raw dotted NODENAME identity.
- Source task / issue: GitHub #1111; parent programme #1083.
- PR number: PENDING
- Branch: `fix/cii-writer2-benchmark-exact-wp006`
- Base commit: `96b09485b90f6bf92cc0716e2da0142d8cfd91c4`
- Current HEAD: branch initialization pending this report commit
- PR status: NOT_CREATED
- Current stage: Stage 1 — live grounding + failure isolation
- Last completed stage: none
- Engineering status: INVESTIGATING
- Validation status: NOT_RUN
- Current blocker: none for read-only isolation; production writes require this report/issue custody and exact first-wrong-boundary evidence.
- Exact next action: trace raw NODENAME from source graph → correspondence → engineering delta → BM-001 binding → transfer operation, then add a focused regression at the first boundary that loses or ambiguously selects exact dotted identity.

## Handover in 60 Seconds

- What is now true: current main is `96b09485...`; exact retained benchmark files are present; old WP-001 branch `agent/cii-writer2-multisource-nodename-transfer` is diverged and will not be revived; PR #1064 is read-only runtime evidence only.
- What is being worked on: issue #1111 benchmark-exact repair.
- What remains unfinished: independent T→TEXPECTED delta derivation, auto-anchor proof, exact Transfer set proof, `.X` root-cause repair, Compare closure.
- What must not be assumed: benchmark checkpoint meanings (`8870→9040`, `10350→10190`, `1005→925`) are not yet interpreted; a correct row count alone is not acceptance; canonical family equality is not writable NODENAME identity.
- Highest-risk remaining item: correspondence may select the wrong source sibling even if final symptom looks like suffix truncation.
- Exact next action: isolate the first stage where exact source name differs from expected raw source identity.

## Mission and Engineering Intent

### Scope

1. Use exact retained inputs:
   - `Benchmark/S1.CII`
   - `Benchmark/S2.CII`
   - `Benchmark/S3.CII`
   - `Benchmark/T.CII`
   - `Benchmark/TEXPECTED-PARTIALLLYDONE.CII`
2. Treat TEXPECTED as independent retained-real expected postimage; never regenerate it from product output.
3. Prove benchmark-equivalent behavior excluding only suffix-only `.X` differences before suffix repair.
4. After repair require exact expected/actual mutation-set equality and Compare difference count zero.
5. Prove Auto Anchor/correspondence and Transfer tab independently; do not infer correctness from final output alone.

### Governing invariants

- Raw source NODENAME is the only writable name identity once physical correspondence selects a source node.
- Canonical smart-name family (for example `SL-106`) is review/corroboration evidence only.
- Canonical family equality may not pick one sibling among `SL-106.2/.3/.4/...`.
- Transfer APPLY acceptance requires exact set equality, not count equality alone.
- Benchmark IDs/checkpoints/hashes may appear in tests/oracle custody but not as production decision branches.
- Existing V11 Writer2 + frozen V11↔V14 bridge remain the mutation authority unless a concrete falsifier proves the first wrong boundary inside them.
- No Writer1/Writer3/topology authority expansion.

### Explicit non-goals

- No physical merge of S1/S2/S3/T.
- No same-cardinality NODENAME overwrite authority expansion.
- No workflow changes.
- No benchmark tolerance weakening.
- No hard-coded fixes for `8870`, `9040`, `10350`, `10190`, `1005`, or `925`.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Independent T→TEXPECTED delta/oracle | P0 | NOT_STARTED | 1/2 | retained files pinned on main |
| Auto-anchor/correspondence proof | P0 | INVESTIGATING | 1/3 | production path identified |
| Transfer exact set/cardinality proof | P0 | NOT_STARTED | 3 | issue #1111 acceptance |
| Exact dotted NODENAME repair | P0 | INVESTIGATING | 1/4 | sources + BM-001 retain dotted names |
| Compare-tab exact closure | P0 | NOT_STARTED | 5 | issue #1111 acceptance |
| Neighbor regression / end-to-end | P1 | NOT_STARTED | 6 | NOT_RUN |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | defect | P0 | INVESTIGATING | Writer2 multi-source result can lose dotted NODENAME suffix or select family-level identity | yes |
| RISK-001 | risk | P0 | ACCEPTED | Symptom may be wrong source sibling/correspondence rather than formatter truncation | yes |
| DEC-001 | decision | P0 | ACCEPTED | Canonical NODENAME family remains corroboration-only; raw selected source value is emission authority | yes |
| DEC-002 | decision | P0 | ACCEPTED | TEXPECTED is independent oracle; product output cannot rewrite expected data | yes |
| QST-001 | question | P0 | INVESTIGATING | Exact engineering meaning of owner checkpoints 8870→9040, 10350→10190, 1005→925 | yes |
| RISK-002 | risk | P0 | ACCEPTED | Old WP-001 branch is diverged; stale branch changes must not be replayed over current main | yes |

## Stage Roadmap

### Stage 1 — Grounding + first-wrong-boundary isolation
Current truth: main is `96b09485...`; branch created from exact main; old WP-001 branch diverged; no active production PR overlaps this repair.

Objective: prove where exact dotted identity first becomes wrong and classify whether auto-anchor/correspondence, BM binding, transfer construction, or physical writer is responsible.

Expected scope/files: read-only inspection plus focused tests; no production patch until first boundary is isolated.

Planned validation: exact source names (`SL-106.2/.3/.4/...`) must remain observable; inspect `cii-workspace-node-name-corroboration.js`, `cii-workspace-anchor-suggestions.js`, `cii-workspace-engineering-delta.js`, `cii-workspace-transfer-plan.js`, `cii-workspace-multisource-preview.js`, Writer2 relocation/write modules.

Known risk: final truncation can mask wrong-sibling mapping.

### Stage 2 — Independent benchmark model
Derive T→TEXPECTED expected mutation rows outside production writer helpers. Produce exact expected operation key set and suffix-only classifier.

### Stage 3 — Auto-anchor/correspondence + Transfer exactness
Make structural/topological correspondence deterministic and fail-closed. Require exact expected Transfer APPLY set and exact APPLY row count; zero missing/extra/duplicate/wrong-target/wrong-action accepted rows.

### Stage 4 — Exact NODENAME identity repair
Patch the smallest first wrong boundary. Preserve canonical review discovery while retaining raw exact identity through operation and Writer2 emission.

### Stage 5 — Compare-tab acceptance
Before suffix repair: non-suffix differences zero. After repair: benchmark differences zero.

### Stage 6 — Regression / retained-real closure
Run focused Writer2/multi-source/bridge tests and repository/browser gates where execution substrate exists. Preserve PASS/FAIL/NOT_RUN truth.

## Current Technical Findings

### Finding A — fixed BM-001 authority preserves exact dotted aliases
`cii-workspace-multisource-nodename-authority.js` stores exact source aliases and its alias key is exact trimmed `sourceName + targetName`; it does not canonicalize away `.X`.

### Finding B — multi-source acceptance inference consumes operation source evidence
`cii-workspace-multisource-preview.js::inferredAcceptanceBinding()` reads `operation.sourceEvidence.value ?? operation.proposed` and binds only when exact alias+target exists in BM-001. Therefore if a truncated value reaches this boundary, the corruption occurred earlier; if the exact value reaches it but final output truncates, the corruption is later.

### Finding C — transfer plan delta operation carries engineering delta sourceValue directly
`cii-workspace-transfer-plan.js::deltaOperation()` stores `sourceEvidence.value = delta.sourceValue` and `proposed = classification.proposedValue`. This boundary should preserve exact source identity if the engineering delta is correct.

### Finding D — existing smart-name corroboration intentionally canonicalizes suffix families
This is acceptable for candidate discovery only and must not become mutation identity.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/WIP-wp006-benchmark-repair_workreport.md` | 1 | 1 | living mission/findings/validation/handover | no product semantics | source review |

## Engineering Decisions and Invariants

### DEC-001 — normalize for review, preserve raw for write
What must remain true: canonical family matching can discover/corroborate candidates, but accepted mutation value must come from the exact physically corresponding source node.

Validation: sibling cases (`SL-106.3` vs `.4`, multi-digit suffix cases) must never collapse to writable `SL-106`.

### DEC-002 — benchmark independence
What must remain true: expected T→TEXPECTED mutation set is derived independently of production writer/transfer helpers; product output never changes the expected oracle.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| source/BM dotted-name source inspection | PASS | `96b09485...` | exact aliases present in source/BM authority |
| first-wrong-boundary focused runtime | NOT_RUN | — | test not yet authored/executed |
| T→TEXPECTED independent delta | NOT_RUN | — | not yet derived |
| Transfer exact-set benchmark | NOT_RUN | — | not yet derived |
| retained-real end-to-end | NOT_RUN | — | not yet executed |
| repository npm/browser | NOT_RUN | — | not yet executed |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| benchmark expected data independent of new repair | PASS | retained TEXPECTED + BM-001 authority |
| no hard-coded production checkpoint logic | PASS so far | no production changes yet |
| correspondence correctness | NOT_RUN | pending independent benchmark derivation |
| Transfer exactness | NOT_RUN | pending independent benchmark derivation |

## Explicitly Not Validated

- Exact meaning of checkpoint pairs.
- Exact T→TEXPECTED operation cardinality.
- Whether current failure first occurs in correspondence or later.
- Browser Compare/Transfer rendering counts.
- Full repository regressions.

## Known / Deferred Work

Open: ISS-001, QST-001. No deferred production work accepted yet.

## Recommended Forward Sequence

1. Add a focused raw-identity regression around engineering delta → transfer operation → multi-source BM binding.
2. If that passes, inspect/patch correspondence source-node selection and candidate canonicalization leakage.
3. If correspondence passes, inspect Writer2 relocation/write payload path.
4. Independently derive T→TEXPECTED operation set and wire exact Transfer/Compare acceptance tests.
5. Run retained-real and neighboring regressions.

## Next-Agent Handover

- Current stopping point: branch initialized; production unchanged.
- PR / branch / HEAD: PR pending / `fix/cii-writer2-benchmark-exact-wp006` / base `96b09485...` plus this report commit.
- Last completed stage: none; Stage 1 active.
- Start here: `tabs/cii-workspace/cii-workspace-multisource-preview.js`, then engineering delta and correspondence source-node selection.
- Do not redo: live main/old-branch overlap grounding.
- Do not assume: formatter is the bug; benchmark checkpoint meanings; correct Transfer set from row count alone.
- Files currently involved: read-only CII workspace multi-source/identity/transfer modules; this report only modified.
- Known failing checks: none executed yet.
- Validation still required: all issue #1111 benchmark gates.
- Open QST-* items: QST-001.
- Highest-risk remaining item: wrong sibling correspondence hidden by family truncation symptom.
- Exact next recommended action: author/execute focused sourceValue-preservation tests around `deltaOperation` + `inferredAcceptanceBinding`, then isolate upstream if exact dotted name is already wrong there.
- Required reading: Issue #1111, parent #1083, current `AGENTS.md`, live Common `engineering-pr-delivery-v2`.
