# WIP-1268-d3 — Method-A provenance projection

## Mission

Implement #1268 D3 selected design from #1267:
`METHOD_A_SINGLE_SPAN_PROVENANCE_PROJECTION`.

Serial children:
- #1276 D3.1 automatic Method-A anchor provenance
- #1277 D3.2 adjacent-boundary projection
- #1278 D3.3 arbitration/generic identity integration
- #1279 D3.4 exact-head + #1239-stack compatibility
- #1269 retained D4

## Protocol / authority

- PROTOCOL_REF: `reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2`
- parent decomposition: #1268 issuecomment-6022349819
- D2 evidence/design: #1267 issuecomment-6022315384
- merge: OWNER_ONLY / NOT AUTHORIZED

## Exact material basis

- branch: `fix/cii-method-a-provenance-1268`
- base: PR #1265 exact head `a7e96865301a09865e0b4126c38310d7b1c8d421`
- D3 product file at start: `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js`
- #1276 implementation authorization: #1276 issuecomment-6022360653

## Current state

No D3 product file has been modified yet.

Current unit:
`#1276 D3.1 — automatic Method-A anchor provenance only`.

## Selected design

Keep current single Method-A first↔last span.

Before arbitration, project automatic Method-A node evidence:
- qualified anchor endpoints: REVIEW / METHOD_A_QUALIFIED_ANCHOR;
- #1277 later owns qualified adjacent-boundary projection.

Manual topology helper semantics remain unchanged.

## Protected

No changes to:
- preselection;
- topology/manual USER_LOCKED semantics;
- geometry;
- Method-A qualification/confidence thresholds;
- Method B;
- arbitration conflict policy;
- Writer/scope;
- V11/V14;
- Benchmark/TEXPECTED.

## Intended changed files

| File | Role | Status |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js` | Method-A automatic evidence projection | planned |
| focused multi-base correspondence test | generic D3 contracts | planned |
| `agents/WIP-1268-d3_workreport.md` | recovery surface | active |

## Recovery tooling

Normal local repository checkout is unavailable on this execution host. Local backup/agent-worklog utilities cannot be truthfully executed.

Compensation:
- exact GitHub blob SHAs recorded before every replacement;
- writes use expected SHA leases;
- no reset/revert/history rewrite;
- work report carries preimages, final hashes, validation and undo boundary.

## Validation truth

| Check | Status |
|---|---|
| D2 hosted design | PASS |
| final PR #1265 C4 frontier | PASS as evidence / C4 acceptance NOT_ACHIEVED |
| D3.1 implementation | NOT_RUN |
| D3.2 | NOT_RUN |
| D3.3 | NOT_RUN |
| D3.4 | NOT_RUN |
| retained D4 | NOT_RUN |

## EXACT_NEXT_ACTION

Allocate the stacked draft PR, then implement only #1276 anchor endpoint projection with generic tests.
