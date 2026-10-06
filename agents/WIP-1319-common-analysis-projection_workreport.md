# #1319 P3.1 work report — common analysis / writer projection split

## Recovery header

```text
RESPONSIBILITY: #1319 P3.1
PARENT: #1314
DESIGN: #1313 issuecomment-6026961531
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
BASE: main@c1998df47e4183e6d54c30555cbc022742ffebc5
BRANCH: fix/cii-common-analysis-projection-1319
PRODUCT_OWNER: tabs/cii-workspace/cii-workspace-core.js
MERGE_AUTHORITY: OWNER_ONLY
```

## Exact responsibility

Factor the existing single-pair preview pipeline into:
- writer-independent common analysis;
- writer-specific projection;
- legacy wrapper.

No prepared-session, multi-source adapter, or UI work.

## Protected

- no geometry algorithm changes;
- no correspondence rule changes;
- no Writer policy changes;
- no bridge/source-set changes;
- no Benchmark mutation.

## Preimage

`cii-workspace-core.js@093551ee05def641d9d0927a14d6a4005acbb52f`

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: factor current createCiiWorkspacePreview body without semantic reordering
```
