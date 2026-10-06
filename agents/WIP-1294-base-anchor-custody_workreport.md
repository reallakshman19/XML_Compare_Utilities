# #1294 U4.3 work report — Method-A base-anchor node-custody parity

## Recovery header

```text
RESPONSIBILITY: #1294 U4.3
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
BRANCH: fix/cii-method-a-base-anchor-custody-1294
BASE: PR #1297 @ 02e17c61f238dbdfa1a9d1bb5707ec0f235a330b
MERGE_AUTHORITY: OWNER_ONLY / NOT AUTHORIZED
RETAINED_ACCEPTANCE: #1291 ONLY
```

## Selected responsibility

Extend the existing D5.3 node-custody reconciliation to independently qualified canonical Method-A base anchors.

Owner:
`tabs/cii-workspace/cii-workspace-node-custody.js`.

## Preimage

`cii-workspace-node-custody.js@6e7cb74f9533cde025bee083cdc8ac2b0b05cb25`.

## Intended rule

Preserve a node through winner-gap-only custody when it is independently qualified by either:
- `METHOD_A_QUALIFIED_ADJACENT_BOUNDARY`; or
- `METHOD_A_QUALIFIED_BASE_ANCHOR`.

The base-anchor path must be attested by `multiBaseProvenance` from a HIGH/MEDIUM Method-A contributor with row authority `METHOD_A_QUALIFIED_ANCHOR`.

The existing `winnerGapOnlyReview()` predicate remains unchanged.

## Protected

No edits to:
- alignment;
- Method-A projection;
- arbitration;
- element candidate thresholds/winner gap;
- Method B/manual;
- confidence values;
- geometry/preselection;
- review/engineering delta/Writer;
- Benchmark/TEXPECTED.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: parity predicate + generic focused test
```
