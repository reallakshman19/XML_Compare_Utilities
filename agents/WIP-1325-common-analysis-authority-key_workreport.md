# #1325 P3.3-A work report — deterministic common-analysis authority key

## Recovery header

```text
RESPONSIBILITY: #1325 P3.3-A
PARENT: #1321
DESIGN: #1313 issuecomment-6026961531
MICRO_DECOMPOSITION: #1232 issuecomment-6027252460
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
STACK_BASE: #1324 @ c637db92295d379ca6cc3b8aa69d7ace8ff51b5f
BRANCH: fix/cii-common-analysis-authority-key-1325
MERGE_AUTHORITY: OWNER_ONLY
```

## One responsibility

Define a pure deterministic key for one prepared source member's writer-independent common analysis.

The key owns:
- prepared SOURCE/TARGET custody identity;
- sourceId;
- canonical base/manual authority;
- normalized common-analysis semantic options.

It must exclude:
- writerVersion;
- review decisions;
- transfer scope;
- instrumentation;
- cryptoRef implementation;
- source-set display/search discovery options;
- TEXPECTED/BM identities.

## Protected

No cache.
No preview execution.
No UI.
No Benchmark mutation.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: pure authority key helper + generic falsifiers
```
