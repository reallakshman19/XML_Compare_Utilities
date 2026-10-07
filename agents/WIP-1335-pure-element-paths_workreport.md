# #1335 P3.3-B0 work report — pure element-path construction

## Recovery header

```text
RESPONSIBILITY: #1335 P3.3-B0
PARENT: #1326
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
STACK_BASE: PR #1331 @ e45c0978e31d9d958c05a061ca775058a5e262b7
BRANCH: fix/cii-pure-element-paths-1335
PRODUCT_OWNER: tabs/model-converters/xml-cii-inputxml-path-aligner.js
MERGE_AUTHORITY: OWNER_ONLY
```

## Proven defect

`buildElementPaths()` annotates input graph edges in place with path-local metadata.

The prepared-session architecture reuses one shared TARGET topology across multiple source-member common analyses. The first analysis deep-freezes its returned common object, including that shared graph. The second member then throws when `finalizePath()` writes `edge.pathId`.

## Selected repair

Path construction must operate on shallow path-local edge copies. The caller graph remains unchanged and may already be frozen.

No path scoring, ordering, alignment, geometry, candidate, Writer or benchmark policy change.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: path-local edge copy + focused immutability/repeatability test
```
