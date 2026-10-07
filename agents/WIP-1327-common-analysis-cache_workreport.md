# #1327 P3.3-C work report — bounded ephemeral common-analysis cache

## Recovery header

```text
RESPONSIBILITY: #1327 P3.3-C
PARENT: #1321
DESIGN: #1313 issuecomment-6026961531
KEY: #1325 / PR #1330
PREPARED_PREVIEW: #1326 + #1335
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
STACK_BASE: #1336 @ 836d2d18ddbf199b5643a226d05649c4a6ce03be
BRANCH: fix/cii-common-analysis-cache-1327
PRODUCT_OWNER: tabs/cii-workspace/cii-workspace-multisource-preview.js
MERGE_AUTHORITY: OWNER_ONLY
```

## Mission

Add optional caller-held common-analysis reuse for the prepared Writer2 path.

Cache invariants:
- one entry per sourceId;
- authority change replaces that entry;
- prepared-session custody change clears all entries;
- no historical key accumulation;
- review/Writer projection state never enters the key.

## Protected

- no generic review-only path;
- no UI wiring;
- no raw legacy API change;
- no geometry/correspondence/Writer policy change;
- no Benchmark mutation.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: explicit cache state + hit/miss/reset instrumentation + focused retained test
```
