# #1293 U4.2 work report — Method-A boundary-local identity projection

## Recovery header

```text
RESPONSIBILITY: #1293 U4.2
PROTOCOL_REF: reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2
BRANCH: fix/cii-method-a-boundary-local-projection-1293
BASE: PR #1296 @ 82b238a7521acdca2072727cd6438f73ad593593
MERGE_AUTHORITY: OWNER_ONLY / NOT AUTHORIZED
RETAINED_ACCEPTANCE: #1291 ONLY
```

## Selected responsibility

Consume U4.1 raw `boundaryIdentity` evidence inside qualified Method-A projection only.

Owner:
`tabs/cii-workspace/cii-workspace-multi-base-correspondence.js`.

## Preimage

`cii-workspace-multi-base-correspondence.js@adf5c71f189f564cea87e38f55f62a36817e9d20`.

## Intended rule

For REVIEW `ADJACENT_MATCH_BOUNDARY` rows and a qualified HIGH/MEDIUM Method-A loop:

```text
supported =
  existing HIGH/HIGH whole-edge boundary evidence
  OR
  row.evidence.boundaryIdentity.identitySupported === true
```

When supported:
- identitySupported=true;
- identityConfidence=loop confidence;
- identityEvidenceBasis=METHOD_A_QUALIFIED_ADJACENT_BOUNDARY;
- row remains REVIEW.

No confidence promotion beyond loop evidence.

## Protected

No edits to:
- U4.1 alignment raw evidence;
- arbitration;
- node custody;
- Method B/manual;
- candidate thresholds/winner gap;
- geometry/preselection;
- review/engineering delta/Writer;
- Benchmark/TEXPECTED.

## Current state

```text
STATE: RECOVERY_SURFACE_CREATED
PRODUCT_EDIT: NOT_YET_MADE
NEXT: projection helper + generic focused test
```
