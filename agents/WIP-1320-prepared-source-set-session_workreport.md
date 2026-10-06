# #1320 P3.2 work report — prepared SOURCE/TARGET source-set session

## Recovery header

```text
RESPONSIBILITY: #1320 P3.2
PARENT: #1314
DESIGN: #1313 issuecomment-6026961531
REFINEMENT: #1320 issuecomment-6027166620
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
STACK_BASE: #1323 @ d3a468bd56e67c6ac84c7bbe004bfd35ad50f67f
BRANCH: fix/cii-prepared-source-set-session-1320
MERGE_AUTHORITY: OWNER_ONLY
```

## Allowed production files

- `tabs/cii-workspace/cii-workspace-core.js` — prepared SOURCE adapter only;
- `tabs/cii-workspace/cii-workspace-writer-version-bridge.js`;
- `tabs/cii-workspace/cii-workspace-source-set.js`.

## Mission

Retain immutable SOURCE/TARGET prepared material from Inspect so later Compare can consume normalized/intaken/topology models without rebuilding them.

Legacy source-set inspection output must remain unchanged.

## Protected

- no correspondence/geometry/writer-policy change;
- no multisource preview/cache logic;
- no UI wiring;
- no generation/cancellation;
- no Benchmark mutation.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: add symmetric prepared SOURCE custody + prepared source-set session
```
