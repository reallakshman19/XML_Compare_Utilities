# PR1260 work report — coherent bounded physical preselection

## Mission

Implement #1257 / parent #1256 C3: repair only the bounded physical Method-A candidate preselection proven by C2 to fragment a strong rigidly coherent S1 raw physical candidate cluster.

## Protocol / authority

- PROTOCOL_REF: `reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2`
- parent PLAN_UPDATE: #1256 issuecomment-6018041920
- child IMPLEMENTATION_PLAN: #1257 issuecomment-6018069396
- implementation-start: #1257 issuecomment-6018070263
- merge authority: OWNER_ONLY / NOT AUTHORIZED

## Exact material basis

- PR: #1260 (OPEN / DRAFT / stacked on PR #1234)
- branch: `fix/cii-s1-coherent-preselection-1257`
- branch base: PR #1234 exact head `b7fb3513eabbac786a7d095c1be96fcfbbcac8e6`
- #1234 base: `d69f71ff9803e7fca1815a36e373335c95ca7dbb`
- repository main at start: `b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- product preimage blob: `tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js` = `18e04998fdf48368f56ff5bf975671075d90cd84`
- focused test preimage blob: `tests/cii-workspace-anchor-search-budget.test.js` = `2bbee4654d1d9ee08e7986d9a5cc5bd6b8f6ad1c`

## Current implementation state

`C3-A` control plane and Appendix A are complete.

No product file has been modified yet. Draft PR #1260 has been allocated for this C3 responsibility.

Next material unit is `C3-B`: implement pure benchmark-blind pairwise rigid-distance coherence helpers and generic tests, then integrate only after the helper contract is coherent.

## Root classification

```text
CANDIDATE_PRESELECTION_DEFECT
```

Raw physical generation already contains a strong coherent S1 candidate region. Existing Method A qualifies that region HIGH / zero residual if supplied intact. The #1234 selector fragments it before Method-A discovery.

## Current hypothesis

A cheap candidate-only pairwise distance-preservation graph can preserve strong rigidly coherent candidate groups within the same hard search budget. The strongest coherent group should be reserved first; remaining slots should reuse existing global spatial-diversity selection.

## Falsifier

Stop / PLAN_UPDATE if:
- preserving generic coherent candidates at the same budget does not allow unchanged Method A to qualify the relevant retained region;
- geometry/confidence changes become necessary;
- success requires retained IDs/NodeName/TEXPECTED/manual pairs;
- runtime loses the bounded-search property;
- deterministic generic invariance contracts fail.

## Authority / protected invariants

Candidate coherence is candidate-generation/preselection evidence only.

Protected:
- `cii-workspace-geometry.js`
- Method-A / Method-B qualification semantics
- MEDIUM/HIGH automatic threshold
- default 10 / range 3..24
- benchmark bytes / TEXPECTED
- manual authority
- Writer/scope/V11-V14 semantics
- workflow files

## Intended changed-file ledger

| File | Planned role | Status |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js` | coherence helpers + bounded reservation + existing diversity fill | planned |
| `tests/cii-workspace-anchor-search-budget.test.js` | generic deterministic/invariance/adversarial contracts | planned |
| `agents/WIP-1256-c3_workreport.md` | recovery-first control surface | active |

## Local backup / patch-ledger state

The execution host cannot resolve `github.com` for a repository clone, so the repository-local `node utils/backup.cjs` command cannot be run against a normal checkout on this host at this checkpoint.

Safety compensation before any remote file replacement:
- exact GitHub blob SHA preimages are recorded above;
- every update will use GitHub's expected blob SHA, so stale/overlapping edits fail rather than overwrite;
- a module-wise preimage/final diff and undo instruction will be recorded in this durable work report;
- no history rewrite/reset/revert will be used.

This limitation is **observability/recovery tooling**, not permission to weaken engineering validation. If a writable/executable checkout becomes available, create the required local .agent-worklogs/backups before further edits.

## Validation truth

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main / #1234 / overlap grounding | PASS | GitHub readback | provider truth |
| Appendix A | PASS | 98/100; min 19/20 | repository/current evidence |
| product change | NOT_RUN | no product edit yet | n/a |
| focused Node tests | NOT_RUN | no executable checkout | implementation-coupled |
| retained S1 | NOT_RUN in C3 | owned by C4 | independent retained |
| S2/S3 non-regression | NOT_RUN | owned by C4 | independent retained |
| Chromium/runtime | NOT_RUN | owned by C4 | independent retained |

## Highest risk

A coherence heuristic could accidentally become a hidden identity rule or over-concentrate the budget on repetitive geometry. Generic adversarial tests and explicit candidate-generation-only metadata are required before retained acceptance.

## Exact work location

`tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js::selectPhysicalCandidatePairs()`

## EXACT_NEXT_ACTION

Create the pure O(n^2) pairwise distance-coherence helpers, expose them only through `_test`, then extend the generic search-budget fixture before integrating coherent reservation into the selector.
