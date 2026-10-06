# #1284 D5.3 work report — Method-A boundary node-custody reconciliation

## Recovery header

```text
RESPONSIBILITY: #1284 D5.3
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
BRANCH: fix/cii-method-a-boundary-custody-1284
BASE: PR #1280 @ 2751b563505caa2c9be0803294b00c3177c2811a
MERGE_AUTHORITY: OWNER_ONLY / NOT AUTHORIZED
RETAINED_ACCEPTANCE: #1285 ONLY
```

## Selected design

Authority: #1283 TASK_EVIDENCE issuecomment-6023671627.

Implement only:
`METHOD_A_BOUNDARY_IDENTITY_PRESERVES_THROUGH_WINNER_GAP_ONLY_NODE_CUSTODY`.

Owning production function:
`tabs/cii-workspace/cii-workspace-node-custody.js::applyCiiNodeCustodyGates()`.

## Preimage

`cii-workspace-node-custody.js@8fbbf0f4040920172ef2b9ebdf9d62a4aa8bf029`.

## Intended product behavior

Preserve an already-arbitrated, evidence-qualified Method-A adjacent-boundary node through node custody only when every incident risky element is a REVIEW/AMBIGUOUS HIGH-winner candidate whose selected target is the winner, M1/M2 agree, and the sole reason is `WINNER_GAP_NOT_SATISFIED`.

Everything else remains fail-closed.

No confidence promotion and no direct mutation authority.

## Protected

No product edits to:
- Method-A projection;
- arbitration;
- candidate winner-gap;
- geometry/preselection;
- Method B;
- USER_LOCKED/manual seeds;
- Compare Review / engineering delta / transfer;
- Writer / V11-V14;
- Benchmark / TEXPECTED.

## Validation plan

Generic focused fixture only. Required positive/negative falsifiers are defined in #1283. No retained identifiers or benchmark values.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: node-custody predicate + focused generic test
```
