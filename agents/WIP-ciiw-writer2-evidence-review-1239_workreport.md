# WIP — CII Writer2 evidence-qualified correspondence review (#1239)

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1239`
- `WORK_INTENT`: IMPLEMENT
- `REPOSITORY_STATE`: NEW_PR_REQUIRED
- `MUTATION_AUTHORITY`: WRITE_ALLOWED
- `CRITICALITY`: ENGINEERING_CRITICAL
- `TAKEOVER_AUTHORITY`: NOT_APPLICABLE_NEW_ASSIGNMENT
- `RECOVERY_DISPOSITION`: CONTINUE
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `REPORT_BASIS_HEAD`: `b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- `BRANCH`: `fix/cii-writer2-evidence-qualified-review-1239`

## Handover in 60 seconds

Issue #1239 repairs an evidence-authority defect in retained multi-source CII Writer2 review. Current main can project a correspondence row as `HIGH` and `BOUND` from upstream workflow `row.status === 'HIGH'` even when the review projection shows no qualified M1, M2, OD, or Node Name evidence. That false confidence also makes `Accept all HIGH` unsafe/misleading.

First bounded slice only:

1. separate workflow/propagation status from evidence-qualified review confidence/binding;
2. preserve explicit/manual LOCKED authority and existing independently supported identity;
3. make bulk HIGH accept only evidence-qualified, identity-bound rows;
4. make rationale text match actual evidence;
5. add focused regression coverage.

Do not change Writer2 CREATE/DELETE authority, V11↔V14 bridge semantics, geometry mathematics, Method-A search algorithm, frozen benchmark files, workflow files, or deployment.

The larger Source↔Target full audit/benchmark overlay, anchor proposal actions, blocker-tree cleanup, and persistence are follow-on slices recorded in #1239 and are not part of the first commit unless explicitly reconciled after validation.

## Live ground truth

- Default branch: `main`
- Live main SHA at grounding: `b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- Main latest commit: merged PR #1223, unrelated Support/Steel work.
- Source issue: #1239.
- Current implementation PR: none yet.
- Open overlapping CII PR inspected: #1234 `perf(cii): bound physical Method-A search for #1232`, exact head `b7fb3513eabbac786a7d095c1be96fcfbbcac8e6`.
- #1234 changed files include anchor candidate/suggestion/source-set/filter-shell code but do not include the first-slice target files `cii-workspace-engineering-delta.js`, `cii-workspace-compare-review.js`, or `cii-workspace-multisource-review-ui.js`.
- Coordination classification for first slice: `SAFE`, with semantic caution because #1234 changes upstream anchor discovery but not review-confidence authority.

## Diagnosis

### ISS-1239-01 — workflow HIGH is being used as identity confidence

Current `ciiIdentityConfidence(row)` falls back to `HIGH` when `row.status === 'HIGH'` even without explicit candidate/evidence identity confidence.

### ISS-1239-02 — workflow HIGH is being used as identity binding authority

Current `ciiIdentityBound(row)` returns true when `row.status === 'HIGH'` before requiring supported candidate/evidence identity.

### ISS-1239-03 — review rationale trusts the projected label instead of the displayed evidence

`confidenceReason(row)` prints the stock independent-M1+M2+OD HIGH explanation for any projected `row.confidence === 'HIGH'`, including rows whose `methodA`, `methodB`, and `od` projections are absent.

### ISS-1239-04 — bulk HIGH inherits the false classification

`bulkAcceptCiiMultiSourceReview()` accepts rows when `row.confidence === 'HIGH' && row.identityBound`, so false HIGH/BOUND rows are bulk-eligible.

## Hypothesis and falsifier

Hypothesis: removing the bare workflow-HIGH fallbacks from review identity confidence/binding, while preserving explicit candidate/evidence confidence/support and LOCKED authority, will demote unsupported propagated rows to REVIEW without changing genuinely supported correspondence.

Falsifier: a current retained/fixture row whose only valid identity authority is encoded exclusively as workflow `status === 'HIGH'` with no explicit candidate/evidence support would be incorrectly demoted. Before finalizing, inspect correspondence producers/tests for such a contract and preserve only source-qualified authority rather than blanket status fallback.

## Authority / invariants

Protected:

- manual/explicit `LOCKED` correspondence authority;
- candidate status `SUPPORTED` as bound identity when candidate evidence exists;
- explicit `identitySupported === true` evidence where candidate bundle is absent;
- explicit candidate/evidence `winnerIdentityConfidence` / `identityConfidence` when present;
- fail-closed `UNRESOLVED`, `CONFLICT`, `DELETED`, `INSERTED`;
- Writer2 NODENAME CREATE/DELETE authority and scope binding;
- V11↔V14 bridge and target byte custody;
- frozen `Benchmark/*.CII` files;
- geometry / Method-A logic.

Negative assurance:

- no benchmark answer hard-coding;
- no tolerance weakening;
- no mutation-authority expansion;
- no workflow-file edits;
- no local-storage/persistence change in this first slice.

## Planned files

Likely production:

- `tabs/cii-workspace/cii-workspace-engineering-delta.js`
- `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`

Potential projection-only change if required after inspection:

- `tabs/cii-workspace/cii-workspace-compare-review.js`

Focused tests:

- existing confidence/review tests where possible;
- add one focused regression file only if existing tests cannot express the false-HIGH case clearly.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Live main grounding | PASS | GitHub live branch inspection | AUTHORITATIVE_REFERENCE | `main@b2ff4c67...` |
| Repository/local policy read | PASS | `AGENTS.md` + Common engineering-pr-delivery | AUTHORITATIVE_REFERENCE | merge Owner-only |
| #1234 overlap check | PASS | live changed-file list | AUTHORITATIVE_REFERENCE | no exact first-slice file overlap |
| Current defect source trace | PASS | source inspection on main | IMPLEMENTATION_COUPLED | false HIGH/BOUND path identified |
| Focused Node execution | NOT_RUN | not yet attempted | NONE | required after patch |
| Browser retained flow | NOT_RUN | not yet attempted | NONE | only if first-slice UI behavior requires it |

## Changed-file ledger

Current branch changes:

- `agents/WIP-ciiw-writer2-evidence-review-1239_workreport.md` — this recovery record only.

No production files changed yet.

## Appendix A

`NOT_REQUIRED_NEW_ASSIGNMENT`: this is a newly initialized issue/branch rather than takeover of an existing engineering-critical implementation PR. Repository-specific diagnosis, authority boundary, overlap check, hypothesis, falsifier, and minimal-patch plan are recorded above before production mutation.

## Environment limitation

This session can mutate the repository through the authenticated GitHub connector but does not currently have a full authenticated local checkout. Repository-required `.agent-worklogs/` and `utils/backup.cjs` local recovery artifacts cannot be published through the connector. Do not claim those local artifacts as created. Git branch/file history plus this WIP report are the durable remote recovery surface for this session. If a checkout-capable executor takes over, it must create the required local ledger/backups before further local product edits.

## EXACT_NEXT_ACTION

Inspect current confidence/binding producers and focused tests to prove which explicit evidence fields are authoritative; then patch only the minimal review-confidence/binding seam and add a regression for workflow-HIGH with absent qualified evidence. Execute focused validation if possible; otherwise record exact NOT_RUN and open a draft PR with source-inspection truth only.