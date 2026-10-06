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

## Implemented material

Production helper:
- `tabs/cii-workspace/cii-workspace-common-analysis-key.js@5d55637bb482091592805084c4dfcf24479822a7`

Focused generic test:
- `tests/cii-workspace-common-analysis-authority-key.test.js@eb59e3347d8be7aee95e752a613f586844ad49ad`

Implemented:
- deterministic canonical preimage;
- SHA-256 key;
- explicit writer-independent option allowlist;
- canonical Method-A / Method-B loops;
- canonical independent manual seeds / legacy anchors;
- prepared SOURCE/TARGET custody identity;
- exclusion of review/writer/display/oracle/UI state.

No cache object or preview call is introduced.

## Current state

```text
STATE: PRODUCT_AUTHORED
CACHE: NONE
PREVIEW_EXECUTION: NONE
UI: NONE
BENCHMARK_MUTATION: NONE
NEXT: open stacked draft PR and qualify exact head
```
