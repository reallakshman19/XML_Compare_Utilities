# PR1240 work report — CII Writer2 evidence-qualified Compare Review

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1239`
- `PR`: `#1240`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `BASE`: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- `BRANCH`: `fix/cii-writer2-evidence-qualified-review-1239`
- `CURRENT_HEAD`: `36a9e02836e121871def76bd7fb386eb15cbd683`
- `PR_STATE`: OPEN / DRAFT / UNMERGED

## Owner correction: audit before implementation

Owner explicitly required **audit first, then implement**. No further product mutation was made until the live producer, current `main`, #1239 contract, PR #1240 diff and current branch behavior were re-audited.

### Audit result

1. `cii-workspace-alignment.js#boundaryRow()` is a legitimate HIGH producer for `ADJACENT_MATCH_BOUNDARY`: it computes left/right element evidence independently and marks the shared NODE HIGH only when both element identities are HIGH.
2. The producer stores the authority as `evidence.leftElement + evidence.rightElement`, not direct NODE `candidates.m1/m2/OD` evidence.
3. Current `main` Compare Review drops that evidence shape, then renders generic direct-node evidence/rationale.
4. Current `main` global `ciiIdentityConfidence()` and `ciiIdentityBound()` still contain workflow-status shortcuts (`row.status === HIGH`).
5. The first PR1240 implementation correctly introduced adjacent-boundary projection, but the audit found a residual review-layer gap: non-boundary rows could still call the global `ciiIdentityConfidence()` fallback and inherit HIGH from workflow status when explicit HIGH confidence was absent.
6. Therefore the first PR1240 patch was not yet sufficient for the issue contract.

Disposition: `CONTINUE`, with a narrower fail-closed review projection correction. No correspondence producer, engineering-delta authority, writer, bridge, Method-A/B algorithm or benchmark change is authorized.

## Implemented after audit

### `tabs/cii-workspace/cii-workspace-compare-review.js`

- recognizes `ADJACENT_MATCH_BOUNDARY` as `ADJACENT_EDGE_CONSENSUS`;
- retains HIGH only when both adjacent element evidences are `identitySupported` and explicitly `HIGH`;
- adds LEFT/RIGHT evidence summaries for review rendering;
- separates review `identityBound` from review `confidence`;
- supported candidate evidence may bind identity, but it does **not** become review HIGH unless an explicit HIGH confidence exists;
- bare workflow `status=HIGH` no longer manufactures review HIGH;
- bare workflow `status=HIGH` no longer manufactures review BOUND;
- manual `LOCKED` remains authoritative;
- removed the review layer's dependency on global `ciiIdentityConfidence()` fallback.

### `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`

- renders adjacent-boundary authority as `ADJACENT CONSENSUS · 2/2 HIGH`;
- shows LEFT/RIGHT M1/M2/OD summaries;
- generic HIGH wording claims direct M1+M2 only when those projected methods actually pass;
- Bulk Accept message explicitly states decisions are pending until `Apply approvals to Transfer Preview` rebuilds the preview.

### `tests/cii-workspace-adjacent-boundary-review.test.mjs`

Deterministic review-boundary coverage now includes:

1. legitimate S2-style adjacent-boundary HIGH remains HIGH/BOUND and bulk eligible;
2. bare workflow HIGH with no evidence becomes REVIEW/unbound and is not bulk accepted;
3. `SUPPORTED` candidate evidence with no explicit confidence may remain bound but cannot become HIGH or bulk-HIGH eligible;
4. explicit direct `identitySupported + identityConfidence=HIGH` remains HIGH/BOUND;
5. manual LOCKED remains LOCKED/BOUND;
6. UI does not render the false `RED · 0/0` / generic direct-M1+M2 explanation for adjacent consensus.

An attempted weak producer-integration assertion was removed during the audit because the alignment scorer is not injectable and a guarded assertion would not prove execution. No false PASS is retained.

## Protected invariants / negative assurance

No change to:

- correspondence generation;
- `cii-workspace-engineering-delta.js` global semantics;
- Writer2 CREATE/DELETE authority;
- Writer1C exact-span mutation semantics;
- V11↔V14 normalization, target shadow, or projector;
- Method-A/B matching mathematics;
- anchor discovery/search budget;
- transfer-scope authority;
- frozen Benchmark files or benchmark answers;
- workflow or deployment files.

No benchmark IDs or expected answers are read by production code in this patch.

## Current diff boundary

Against `main`, PR #1240 changes only:

1. `agents/PR1240_workreport.md`
2. `tabs/cii-workspace/cii-workspace-compare-review.js`
3. `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`
4. `tests/cii-workspace-adjacent-boundary-review.test.mjs`

PR #1234 remains an upstream performance/search-budget responsibility with no exact production-file overlap in this slice.

## Validation truth

| Gate | Status | Observation / oracle |
|---|---|---|
| live main grounding | PASS | `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08` |
| #1239 contract audit | PASS | issue readback |
| actual adjacent-boundary producer trace | PASS | `cii-workspace-alignment.js#boundaryRow()` inspection |
| first-patch residual fallback audit | FAIL → FIXED | review projection still inherited global status-HIGH fallback; removed after audit |
| branch diff boundary | PASS | 2 production review/UI modules + focused test + report |
| deterministic test design inspection | PASS | no benchmark hard-coding in production; no guarded pseudo-pass retained |
| focused imported Node test execution | NOT_RUN | no authenticated full checkout in this connector session |
| existing review/confidence regression execution | NOT_RUN | same environment boundary |
| retained S1/S2/S3→T browser benchmark | NOT_RUN | not claimed on this head |
| byte closure / V11↔V14 retained qualification | NOT_RUN | not claimed on this head |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## Follow-on — not implemented in this slice

Issue #1239 still owns, in this order after this authority repair is executable-validated:

1. full `Correspondence → Source vs Target` census/export, including unmatched source nodes;
2. partial-TEXPECTED 36-delta known-positive overlay, never a negative oracle;
3. direct proposal `Use / Review & Lock / Reject` actions;
4. causal blocker tree and suppression of no-scope hash mismatch noise;
5. hash-keyed Writer2 session persistence.

Issue #1237 remains the broader anchor-seed/cardinality specification. PR #1238 must not independently modify the same authority semantics while #1240 is active.

## Highest risk

The main remaining risk is executable compatibility: the review projection is stricter than `main`, by design. A checkout-capable run must prove that legitimate existing HIGH producers always supply explicit confidence or a recognized composite contract. If a legitimate producer relies solely on workflow `status=HIGH`, that producer must be identified and given an explicit evidence contract rather than restoring the status shortcut.

## EXACT_NEXT_ACTION

Run on exact head `36a9e02836e121871def76bd7fb386eb15cbd683`:

```text
node tests/cii-workspace-adjacent-boundary-review.test.mjs
relevant existing compare-review/confidence tests
retained S1/S2/S3 -> T browser benchmark
```

Classify each PASS / FAIL / NOT_RUN. If any legitimate HIGH row is demoted, trace its producer and add an explicit evidence contract; do not restore `status === HIGH` as authority. Keep PR #1240 draft and unmerged until Owner authorization.
