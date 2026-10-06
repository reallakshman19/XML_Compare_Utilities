# PR1265 work report — authoritative coherent bounded preselection

## Mission

Implement #1263 / parent #1257 / programme #1256 using the final hosted #1262 SELECTED_RULE, superseding the quarantined PR #1260 stale-rule material without rewriting its active branch.

## Protocol / authority

- PROTOCOL_REF: `reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2`
- authoritative design: #1262 issuecomment-6020813942
- design supersession: #1262 issuecomment-6020844009
- #1263 superseding plan: issuecomment-6020844684
- frontier reconciliation: #1263 issuecomment-6020878711
- merge authority: OWNER_ONLY / NOT AUTHORIZED

## Exact material basis

- PR: #1265 (OPEN / DRAFT / stacked on PR #1234)
- branch: `fix/cii-s1-coherent-preselection-1263-r2`
- exact base: PR #1234 head `b7fb3513eabbac786a7d095c1be96fcfbbcac8e6`
- old PR #1260: QUARANTINED / SUPERSEDED FOR R2.3
- old PR #1260 live material at recovery: `20b2fa0787f2cd9312ee0599257cbc73454705b5`

## Selected rule

```text
relativeError <= 0.001
AND sourceOdNormalizedDelta <= 0.1
AND SOURCE OD required

compatibility graph
→ deterministic bridge removal
→ connected components
→ complete components only
→ size >= 3
→ unique strongest component required
→ equal strongest => PRESELECTION_AMBIGUOUS / fail closed
→ READY component: choose up to K from that component only
→ no cross-component/isolated fill
→ NONE: preserve #1234 legacy bounded global spread
```

Candidate generation only. Method A remains geometry/qualification authority.

## Current implementation state

No product file modified on this branch yet. Draft PR #1265 is now the authoritative R2.3 product surface.

## Intended changed-file ledger

| File | Planned role | Status |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js` | strict coherence graph, bridge pruning, complete-component decision, bounded pool selection | planned |
| `tests/cii-workspace-anchor-search-budget.test.js` | focused generic/adversarial contracts | planned |
| `agents/WIP-1263-r2_workreport.md` | recovery/current-state surface | active |

## Local recovery tooling

Normal repository checkout is unavailable in this execution host. Repository-local `node utils/backup.cjs` and local `.agent-worklogs` cannot be executed here.

Compensation:
- exact base and preimage blob SHAs will be recorded before every remote replacement;
- GitHub updates use expected blob SHA leases;
- module-wise before/after blobs and undo instructions will be recorded here;
- no reset/checkout/revert/history rewrite will be used.

This does not convert NOT_RUN validation into PASS.

## Validation truth

| Check | Status | Basis |
|---|---|---|
| final rule design | PASS | #1262 hosted run 37496176167 |
| active-writer recovery | PASS | #1263 issuecomment-6020878711 |
| product patch | NOT_RUN | no product edit on superseding branch |
| focused repository tests | NOT_RUN | pending implementation |
| retained S1 C4 | NOT_RUN | #1258 after #1264 |
| merge | NOT AUTHORIZED | Owner-only |

## Protected invariants

No change to geometry, Method-A confidence, Method B, search bounds 10/3..24, Writer, scope, V11/V14, benchmark/TEXPECTED, or product workflows.

## Highest risk

The preselector must not turn component ranking or stable IDs into identity authority, and must not reintroduce cross-region mixing.

## EXACT_NEXT_ACTION

Allocate the superseding draft PR, record its PR-number work report, then replace only the #1234 selector with the final #1262 rule and focused generic tests.
