# #1301 U8 work report — boundary-local Method-A node custody independence

## Recovery header

```text
RESPONSIBILITY: #1301 U8
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
BRANCH: fix/cii-boundary-local-node-custody-1301
BASE: PR #1298 @ 4c96220447315d538dd85b3a4db5a9cce6eeac77
MERGE_AUTHORITY: OWNER_ONLY / NOT AUTHORIZED
RETAINED_ACCEPTANCE: #1303 ONLY
```

## Selected repair

`METHOD_A_BOUNDARY_LOCAL_NODE_CUSTODY_INDEPENDENCE`

Owner:
`tabs/cii-workspace/cii-workspace-node-custody.js`.

## Preimage

`cii-workspace-node-custody.js@221ae3dd5ea6f1e98afaf763646885db91e51ff2`.

## Intended behavior

When a canonical Method-A adjacent-boundary node carries attested U4.1/U4.2 boundary-local identity, custody may preserve it across REVIEW/AMBIGUOUS incident whole-element rows even when those whole elements prefer another candidate.

Fail closed for:
- correspondence/node conflicts;
- target-custody conflicts;
- missing/inconsistent boundaryIdentity;
- Method-B-only/manual-copycat evidence;
- UNRESOLVED/CONFLICT/hard-fail affected elements;
- missing/non-AMBIGUOUS candidate evidence.

Existing strict winner-gap-only handling remains for:
- legacy adjacent-boundary evidence without boundary-local attestation;
- qualified Method-A base anchors.

No confidence promotion and no element promotion.

## Protected

No edits to:
- alignment;
- Method-A projection;
- arbitration;
- candidate thresholds/winner gap;
- geometry/preselection;
- Method B/manual;
- review/engineering delta/Writer;
- Benchmark/TEXPECTED.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: narrow node-custody predicate + generic test
```
