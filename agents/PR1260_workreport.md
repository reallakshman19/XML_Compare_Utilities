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

`C3-B` pure coherence primitive and generic fixtures are implemented.

`C3-C` bounded coherent-cluster reservation is integrated into the #1234 selector. Existing global SOURCE+TARGET spatial diversity is reused to fill any remaining budget.

`C3-D` focused generic execution, syntax, size, forbidden-input and protected-file audits are complete.

`C3-E` product implementation is ready for exact-head handoff to #1258. C3 does not claim retained acceptance.

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
| `tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js` | coherence helpers + bounded reservation + existing diversity fill | completed |
| `tests/cii-workspace-anchor-search-budget.test.js` | generic deterministic/invariance/adversarial contracts | completed |
| `agents/PR1260_workreport.md` | recovery-first control surface | active |

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
| product module syntax | PASS | actual PR blob parsed after import/export normalization in connector V8 | implementation-coupled |
| generic coherence execution | PASS | actual PR product blob executed against rigid-transform/permutation/renumbering/inconsistent-distance/authority-noise fixtures | implementation-coupled |
| focused test module syntax | PASS | actual test blob parsed with top-level-await-aware wrapper | implementation-coupled |
| focused repository Node command | NOT_RUN | normal checkout unavailable; no hosted run instantiated on C3 head | implementation-coupled |
| retained S1 | NOT_RUN in C3 | owned by C4 | independent retained |
| S2/S3 non-regression | NOT_RUN | owned by C4 | independent retained |
| Chromium/runtime | NOT_RUN | owned by C4 | independent retained |

## Implemented algorithm

The selector now:
1. builds an O(n²) pairwise compatibility graph using SOURCE-vs-TARGET inter-candidate distance preservation;
2. scales candidate-only compatibility tolerance from existing SOURCE incident OD evidence;
3. rejects same-SOURCE or same-TARGET pairs as independent coherence support;
4. filters to the high-support portion of the compatibility graph;
5. selects the strongest deterministic connected coherent component;
6. reserves that component within the unchanged configured budget using existing spread logic;
7. fills any remaining slots with the existing global spread ranking.

New instrumentation:
- `ANCHOR_PHYSICAL_COHERENT_CLUSTER_SIZE`
- `ANCHOR_PHYSICAL_COHERENT_RESERVED_COUNT`

No Method-A geometry or confidence code changed.

## Exact preimage / final blobs / undo

| File | Preimage blob | Current blob | Undo |
|---|---|---|---|
| `tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js` | `18e04998fdf48368f56ff5bf975671075d90cd84` | `e9ee2ec6046a7772ae70f73de83ece6724d7865c` | only after current-blob check, restore exact preimage content from #1234 head |
| `tests/cii-workspace-anchor-search-budget.test.js` | `2bbee4654d1d9ee08e7986d9a5cc5bd6b8f6ad1c` | `f8d235ac64c8d64ba4822bd24ba79e01aa5862b9` | only after current-blob check, restore exact preimage content from #1234 head |

Do not use reset/checkout/revert to undo this responsibility. Preserve the #1234 substrate.

## Retained evidence reused, not re-executed

Existing C2 artifact `11403293444` was inspected during C3. It records:
- 23 raw physical pairs;
- nine-pair proximal raw family;
- unchanged Method A on that family: READY / HIGH / 9 anchors / 0 mm max residual / weight 99.994;
- selected-11 mixed pool: distal five-anchor MEDIUM / 300 mm max residual / weight 76.408.

This is historical exact C2 evidence, not C3 exact-head qualification. #1258 owns the latter.

## Final C3 delta audit

PASS:
- #1234 exact head remained `b7fb3513eabbac786a7d095c1be96fcfbbcac8e6`;
- PR #1260 remains stacked on that exact head;
- changed paths are only the work report, physical selector module, and focused test;
- added production lines contain no retained manual node IDs;
- added production lines contain no TEXPECTED / known-positive references;
- added production lines contain no USER_LOCKED/manual authority;
- added production lines contain no NodeName identity input;
- geometry, Method-B, confidence, Writer, V11/V14, benchmark and workflow files are untouched.

## Highest risk

A coherence heuristic could accidentally become a hidden identity rule or over-concentrate the budget on repetitive geometry. Generic adversarial tests and explicit candidate-generation-only metadata are required before retained acceptance.

## Exact work location

`tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js::selectPhysicalCandidatePairs()`

## EXACT_NEXT_ACTION

Publish C3 STEP TASK_EVIDENCE/TASK_RESULT with the final PR head, then start #1258 validation from that exact head. Do not merge PR #1260.
