# WIP-1268 — Method-A authority/provenance repair

## Mission

Implement #1268 / parent #1256 D3 using the hosted #1267 D2 design. The selected repair is **not** multi-span expansion.

Repair only:
1. automatic Method-A anchor provenance currently mislabeled as USER_LOCKED;
2. Method-A adjacent-boundary identity evidence lost through multi-base arbitration canonicalization.

## Protocol / authority

- PROTOCOL_REF: `reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2`
- parent PLAN_UPDATE: #1256 issuecomment-6022360890
- implementation plan: #1268 issuecomment-6022361665
- design authority: #1267 issuecomment-6022325066
- merge authority: OWNER_ONLY / NOT AUTHORIZED

## Exact material basis

- branch: `fix/cii-method-a-authority-projection-1268`
- exact stack base: PR #1265 head `a7e96865301a09865e0b4126c38310d7b1c8d421`
- preimage `cii-workspace-multi-base-correspondence.js`: `fdedb84add2faac6b38bff9300fe79224c8808e5`
- preimage `cii-workspace-correspondence-arbitration.js`: `ff26a1921dc527a7d7cef2e9a94c56b92651484f`
- preimage focused test: `tests/cii-workspace-multi-base-correspondence.test.js@bf5304efb01acc0ec597ca4903551fd6ee315f1b`

## Current root

```text
METHOD_A_CORRESPONDENCE_AUTHORITY_PROJECTION_DEFECT
```

Final C4 on PR #1265:
- S1 correspondence 12/12 attributed;
- S1 mutation 5/12;
- no conflicts.

D2 hosted design proved:
- CURRENT_FIRST_LAST already contains all 12 S1 identity claims;
- provenance-aware interpretation binds all 12;
- multi-local span expansion is unnecessary.

## Planned product changes

| File | Planned role | Status |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js` | convert automatic Method-A anchor rows from USER_LOCKED semantics to METHOD_A_QUALIFIED_ANCHOR review evidence | planned |
| `tabs/cii-workspace/cii-workspace-correspondence-arbitration.js` | preserve qualified Method-A ADJACENT_MATCH_BOUNDARY identity semantics in canonical evidence | planned |
| `tests/cii-workspace-multi-base-correspondence.test.js` | focused authority/provenance/conflict/manual-regression contracts | planned |
| `agents/WIP-1268_workreport.md` | recovery-first control surface | active |

## Protected

No change to:
- `compareLockedCiiAnchorSpan()` generic manual semantics;
- first↔last span selection;
- Method-A geometry;
- preselection;
- Method B;
- confidence thresholds;
- Writer/scope;
- V11/V14;
- Benchmark/TEXPECTED;
- workflow files.

## Hypothesis

If automatic Method-A anchor endpoints are projected as METHOD_A_QUALIFIED_ANCHOR and qualified adjacent-boundary evidence is preserved across arbitration, existing `ciiIdentityBound()` / `ciiIdentityConfidence()` consumers will bind the seven currently review-only S1 rows without multi-span expansion.

## Falsifier

Stop / PLAN_UPDATE if:
- focused generic fixtures require modifying topology/path/geometry;
- manual USER_LOCKED behavior regresses;
- conflict-veto behavior weakens;
- exact retained validation still leaves the same seven rows mutation-incomplete after the minimal patch.

## Recovery / backup limitation

This execution host has no normal repository checkout, so repository-local `node utils/backup.cjs` and local `.agent-worklogs` cannot be run.

Compensation:
- exact preimage blob SHAs are recorded above;
- all GitHub writes use expected blob SHA leases;
- no destructive history operation will be used;
- before/after blobs and undo boundaries will be maintained in this report.

## Validation truth

| Check | Status | Basis |
|---|---|---|
| Appendix A / design authority | PASS | #1267 hosted D2 + #1268 plan |
| product edit | NOT_RUN | no product file changed yet |
| focused tests | NOT_RUN | pending |
| retained D4 | NOT_RUN | #1269 |
| merge | NOT AUTHORIZED | Owner-only |

## EXACT_NEXT_ACTION

Allocate a draft stacked PR, rename this report to the PR-number identity, then implement D3-A endpoint provenance only before D3-B arbitration evidence.
