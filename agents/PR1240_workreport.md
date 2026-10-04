# PR1240 work report — CII Writer2 evidence-qualified Compare Review

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1239`
- `PR`: `#1240`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `BASE`: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- `BRANCH`: `fix/cii-writer2-evidence-qualified-review-1239`
- `PATCH_HEAD_AT_PR_CREATION`: `8aad190dc4f9908f8cd69083f78996a1005f10a8`
- `PR_STATE`: OPEN / DRAFT / UNMERGED

## Handover in 60 seconds

PR #1240 repairs the misleading retained Writer2 Compare Review evidence display and closes a fail-closed review/bulk gap without changing correspondence generation or Writer2 mutation authority.

The key corrected RCA is not “every HIGH row is false.” `cii-workspace-alignment.js#boundaryRow()` legitimately marks a NODE HIGH when the two matched elements adjacent to that shared node both carry independently supported HIGH identity evidence. The producer stores that proof as `evidence.leftElement + evidence.rightElement` under authority `ADJACENT_MATCH_BOUNDARY`.

Before this PR, Compare Review did not understand that composite evidence shape. The row therefore displayed `HIGH / BOUND` while the visible evidence rendered `RED · 0/0`, `M1 —`, `M2 —`, `OD REVIEW N/A`, followed by a false direct-node explanation that independent M1 and M2 agreed.

This PR makes the review projection evidence-qualified:

- recognized adjacent-boundary consensus remains HIGH/BOUND when both adjacent edges are identity-supported HIGH;
- it is displayed as `ADJACENT CONSENSUS · 2/2 HIGH` with LEFT/RIGHT M1/M2/OD summaries;
- a bare workflow `status=HIGH` with no candidate, recognized composite, or explicit `identitySupported` evidence is downgraded to REVIEW in the review/bulk layer;
- the underlying correspondence and engineering-delta engines are unchanged;
- Bulk Accept messaging now says decisions are pending and that `Apply approvals to Transfer Preview` performs the rebuild.

## Live ground truth / coordination

- Default branch at start: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`.
- Source issue: #1239.
- Draft implementation PR: #1240.
- Open CII performance PR #1234 inspected at head `b7fb3513eabbac786a7d095c1be96fcfbbcac8e6`.
- #1234 changes anchor candidate/search/source-set/filter-shell files; it does not overlap the two production files changed by #1240.
- Coordination classification: SAFE for this slice; semantic caution retained because #1234 can change upstream anchor selection.

## Corrected diagnosis

### RCA-01 — legitimate node identity proof is composite, not direct

`ADJACENT_MATCH_BOUNDARY` NODE identity is derived from the two matched elements meeting at the node. Both element matches must independently be HIGH for the boundary node to be HIGH.

### RCA-02 — Compare Review dropped that evidence shape

`cii-workspace-compare-review.js` previously understood candidate/direct evidence only. For `{leftElement,rightElement}` it projected no direct M1/M2/OD details.

### RCA-03 — generic HIGH rationale contradicted the screen

`cii-workspace-multisource-review-ui.js` printed the direct M1+M2 HIGH sentence for any HIGH row, even when the row was HIGH for adjacent-edge consensus.

### RCA-04 — status-only HIGH remained bulk-eligible

The review projection inherited `HIGH/BOUND` from workflow status when no recognized evidence was present. This PR fails closed at the review/bulk boundary while leaving core correspondence/delta behavior untouched.

### RCA-05 — Bulk Accept is a two-step UX

The existing retained UI intentionally marks decisions first, then rebuilds correspondence/Transfer Preview only after `Apply approvals to Transfer Preview`. The prior status message did not make the pending/rebuild distinction sufficiently clear.

## Implementation

### `tabs/cii-workspace/cii-workspace-compare-review.js`

- adds `adjacentBoundaryEvidence()` normalization for `ADJACENT_MATCH_BOUNDARY`;
- captures LEFT/RIGHT confidence, identity support, M1, M2 and OD summaries;
- adds review-specific `reviewIdentityBound()` so status-only HIGH does not become review BOUND;
- preserves LOCKED, supported candidate evidence, explicit direct `identitySupported`, and valid 2/2 adjacent consensus;
- adds `identityEvidenceBasis` and `adjacentBoundary` to the Compare Review row model;
- leaves `cii-workspace-engineering-delta.js` unchanged.

### `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`

- special-cases adjacent boundary evidence rather than rendering RED/0-of-0 direct evidence;
- shows `ADJACENT CONSENSUS · 2/2 HIGH`;
- shows LEFT/RIGHT M1/M2/OD evidence summaries;
- explains that the NODE is the shared boundary of two independently HIGH matched elements;
- generic HIGH rationale now claims independent M1+M2 only when both projected methods actually pass;
- search includes `identityEvidenceBasis`;
- positive bulk status says Accept decisions are pending and identifies the existing Apply-to-preview rebuild step.

### `tests/cii-workspace-adjacent-boundary-review.test.mjs`

Pins both sides of the authority boundary:

1. an S2-style `340→10260` `ADJACENT_MATCH_BOUNDARY` with two supported HIGH adjacent edges remains HIGH/BOUND and is bulk-eligible, but displays the composite evidence truthfully;
2. a synthetic status-only HIGH with no recognized evidence becomes REVIEW/unbound and is not bulk-accepted.

## Protected invariants / negative assurance

No change to:

- Writer2 CREATE/DELETE authority;
- Writer1C exact-span mutation semantics;
- V11↔V14 normalization, target shadow, or projector;
- Method-A/B matching mathematics;
- anchor discovery/search budget;
- frozen Benchmark files or benchmark answers;
- transfer-scope authority;
- workflow or deployment files.

No benchmark IDs or expected answers are read by production code in this patch.

## Validation ledger

| Gate | Status | Observation / oracle |
|---|---|---|
| live main grounding | PASS | GitHub live branch API |
| repository/Common protocol read | PASS | `AGENTS.md` + Common engineering-pr-delivery skill |
| #1234 overlap check | PASS | exact changed-file list; no production file overlap |
| corrected producer trace | PASS | `ADJACENT_MATCH_BOUNDARY` uses two HIGH edge evidences |
| branch diff boundary | PASS | 2 production review/projection modules + 1 focused test + report |
| changed production JS syntax | PASS | local `node --check` on reconstructed exact file text |
| new test syntax | PASS | local `node --check` |
| focused imported Node test execution | NOT_RUN | no authenticated full checkout in this session; container network cannot fetch repo |
| existing review/confidence regression execution | NOT_RUN | same environment boundary |
| retained S1/S2/S3→T browser product path | NOT_RUN | not claimed on this head |
| GitHub Actions on PR head | PENDING / NOT_OBSERVED_AT_PR_CREATION | recheck after PR allocation |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## Environment limitation

This session can read/write GitHub through the authenticated connector but has no full authenticated checkout. Repository-required local `.agent-worklogs/` / `utils/backup.cjs` receipts could not be produced through the connector and are not claimed. The durable remote recovery surface is this report plus Git history. A checkout-capable successor must create the required local ledger/backups before further local product mutation.

## Follow-on explicitly outside this first patch

Issue #1239 retains the next product slices:

1. complete `Correspondence → Source vs Target` census UI/export that enumerates all source nodes, including unmatched/unemitted nodes;
2. overlay of the partial-TEXPECTED known-positive benchmark (36 observed NodeName deltas: 35 REPLACE + 1 CREATE) without treating absence as a negative oracle;
3. direct proposal-row `Use / Review & Lock / Reject` actions;
4. causal Writer blocker presentation and suppression of unbound-scope hash noise;
5. hash-keyed durable session persistence.

## Changed-file ledger at PR creation

1. `tabs/cii-workspace/cii-workspace-compare-review.js`
2. `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`
3. `tests/cii-workspace-adjacent-boundary-review.test.mjs`
4. `agents/PR1240_workreport.md` (replaces WIP report)

## EXACT_NEXT_ACTION

Observe PR #1240 exact-head status/workflow runs. If executable CI is unavailable, do not invent PASS: hand off exact head and run the focused review/confidence tests plus retained browser flow in a checkout-capable environment. Only after this first slice is validated should #1239 proceed to the full Source-vs-Target census/benchmark-audit UI. Keep PR #1240 draft and unmerged until explicit Owner authorization.