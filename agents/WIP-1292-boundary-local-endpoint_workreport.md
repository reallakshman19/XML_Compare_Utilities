# #1292 U4.1 work report — boundary-local endpoint evidence

## Recovery header

```text
RESPONSIBILITY: #1292 U4.1
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
BRANCH: fix/cii-boundary-local-endpoint-1292
BASE: PR #1286 @ d919446c09237558da57b01bf9168985bf6d73db
MERGE_AUTHORITY: OWNER_ONLY / NOT AUTHORIZED
RETAINED_ACCEPTANCE: #1291 ONLY
```

## Design authority

#1289 TASK_EVIDENCE issuecomment-6024313634.

Selected responsibility:
`METHOD_A_BOUNDARY_LOCAL_ENDPOINT_IDENTITY` — raw alignment evidence/emission half only.

## Product preimage

`tabs/cii-workspace/cii-workspace-alignment.js@d4e297006bd6470592c5bf252fff1a66eeebfede`.

## Intended product behavior

- preserve current MATCH→MATCH node rows;
- attach candidate-only local endpoint evidence;
- emit REVIEW node candidates at safe MATCH→INSERT_TARGET / INSERT_TARGET→MATCH path boundaries;
- require registered DIRECT M1 local endpoint pass + M2 pass + OD pass;
- do not promote automatic identity in this child;
- do not change element evidence/status.

## Protected

No changes to:
- multi-base Method-A projection;
- node custody;
- arbitration;
- M1/M2 thresholds;
- candidate winner gap;
- geometry;
- preselection;
- Method B/manual;
- Writer/V11-V14;
- Benchmark/TEXPECTED.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: alignment evidence helpers + generic tests
```
