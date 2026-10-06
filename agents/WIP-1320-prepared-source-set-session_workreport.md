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

## Implemented material

Production:
- `tabs/cii-workspace/cii-workspace-core.js@66907edfd390c0148b5d939c13ac15107a4d625e`
- `tabs/cii-workspace/cii-workspace-writer-version-bridge.js@65cb9c193255f881f672e88501fe06c58654d27a`
- `tabs/cii-workspace/cii-workspace-source-set.js@54b9fe20887346ce9d113eb8c472cedd1b4b486d`

Focused regression:
- `tests/cii-workspace-prepared-source-set-session.test.js@447edec5732bbdac2b895ce4b03367d695944d88`

Implemented:
- symmetric prepared SOURCE consumption in `intakePair()`;
- `prepareCiiWorkspaceSourceWithVersionBridge()`;
- strict `inspectCiiWorkspaceModelsWithPreparedPair()`;
- `prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge()`;
- immutable `CIIWorkspacePreparedSourceSetSession.v1`;
- legacy `inspectCiiWorkspaceSourceSetWithVersionBridge()` remains inspection-only.

## Current state

```text
STATE: PRODUCT_AUTHORED
GENERIC_HOSTED_QUALIFICATION: NOT_YET_RUN
MULTISOURCE_PREVIEW_CACHE: NONE
UI_WIRING: NONE
GENERATION_CANCEL: NONE
BENCHMARK_MUTATION: NONE
NEXT: open stacked draft PR and qualify exact head
```
