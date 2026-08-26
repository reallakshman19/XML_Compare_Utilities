# CII Writer2 — CAESAR II V11 / V14 change-isolation bridge

## Decision

Do not implement a second independent CAESAR II V14 engineering-semantics writer and do not alter `reallaksh19/3D_Converters`.

Reuse the existing V11<->V14 dialect converter from:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

Use the already-qualified V11 CII Workspace/Writer2 as engineering mutation authority. For V14 output, preserve the original native V14 bytes and project only the Writer2-caused canonical delta onto those original bytes.

## Authority split

```text
3D_Converters authority
  V11 <-> V14 neutral-dialect conversion
  V14/V11 record-shape differences
  semantic SIF mapping
  restraint stiffness sentinel mapping
  ALLOWBLS / REDUCER extension handling
  source/generated structural validation
  explicit lossy-event detection

XML_Compare_Utilities authority
  existing V11 comparison / Writer1 / Writer2 engineering mutation
  one-TARGET0/original-coordinate arbitration
  independent V11 complete-postimage validation
  V14 original-byte custody
  canonical-baseline -> canonical-modified change isolation
  qualified V14 Writer2 changed-section/cardinality projection boundary
  final projected V14 -> V11 exact-postimage proof
```

The V14 bridge in this PR is **Writer2-only**. It does not qualify V14 Writer1A/1B/1C equal-cardinality fixed-field edits.

The converter does not authorize V11 SIF/HANGER/RESTRAINT CREATE and does not widen Writer3/topology authority.

## Exact upstream custody

Frozen blobs:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

At browser runtime, each deployed frozen file is fetched as bytes, Git-object SHA-1 verified against the pinned blob, then the same verified bytes are written directly into Pyodide. No frozen Python text decode/re-encode path is permitted.

## Why whole-file V14 roundtrip equality is retired

The first XML bridge prototype required:

```text
native V14 -> V11 -> V14 == native V14 byte-for-byte
```

That was an XML-side assumption, not an upstream guarantee.

Exact benchmark evidence:

```text
Benchmarks/v11-v14.zip
Git blob  8409e1c429665e34a83c2a464665ebf5d5f1b0a1
size      10,740 bytes

SYS-0001-v14.CII
SHA-256   d2d4316309d9b1aa34b55ad72f89193fd0e437930db203fecd9ede00e69b2faf

SYS-0001-v11.cii
SHA-256   41ef8912a55a978aa96b3300f42ba2ff335ba5bb35c4882f4012af0e011dc9cc
```

Concrete native formatting falsifier:

```text
native V14        2.044599E+02
V14 -> V11        204.460
V11 -> V14        2.044600E+02
```

26/43 native V14 RIGID rows show deterministic cross-dialect byte non-reversibility. Therefore whole-file equality is retired, while generic semantic equivalence is also insufficient for Writer2 unrelated-byte custody.

## Execution paths

### Native V11

```text
V11 SOURCE/TARGET
-> original SHA custody
-> existing CII Workspace intake/preview
-> existing V11 Writer2
-> existing independent complete-postimage validation
-> V11 output
```

### Native V14 Writer2

```text
ORIGINAL V14 TARGET0
   |
   +--> frozen V14->V11, allow_lossy=false
   |       -> normalized V11 TARGET0
   |       -> existing V11 Writer2
   |       -> independently validated V11 TARGET1
   |
   +--> normalized V11 TARGET0 -> frozen V11->V14 -> canonical baseline V14
   |
   +--> validated V11 TARGET1 -> frozen V11->V14 -> canonical modified V14

canonical baseline -> canonical modified
        -> isolate Writer2-caused delta
        -> project onto ORIGINAL V14 bytes
        -> projected V14 TARGET1
        -> frozen V14->V11
        -> MUST equal exact validated V11 TARGET1 bytes
```

Canonical V14 is differential evidence only; it is never final broad-output authority.

## V14 projection contract — W2.30

Implementation:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema: CIIWorkspaceV14ChangeProjection.v2
blob:   0a16b1383da6ef58abf55c53a91711a0a1f21c17
scope:  WRITER2_ONLY
```

### Changed-section authority

Projectable changed sections are exactly:

```text
CONTROL
ELEMENTS
NODENAME
RESTRANT
SIF&TEES
```

Any other canonical changed section fails with:

```text
CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED:<section>
```

`MISCEL_1` is deliberately absent. There is no qualified V14 HANGER/MISCEL projection in this PR.

### Unchanged sections

If canonical baseline and canonical modified section payloads are identical:

```text
copy ORIGINAL V14 section header and rows exactly
```

This is the primary anti-canonicalization rule.

### Writer2 cardinality authority

Qualified physical units:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit
```

Rules:

```text
unit identities must be unique
isolated deletion may remove corresponding original-coordinate unit
isolated insertion may insert modified canonical unit
retained common-unit order must remain unchanged
mixed replacement/cardinality run -> BLOCK
same-count unit replacement       -> BLOCK
duplicate identity                -> BLOCK
unit misalignment                 -> BLOCK
```

Specific blockers:

```text
CII_V14_PROJECTION_AMBIGUOUS_DUPLICATE_UNIT
CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN
CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED
CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED
```

### V14 Writer1 boundary

For `NODENAME`, `RESTRANT`, and `SIF&TEES`, equal-cardinality fixed-field changes remain owned by Writer1A/B/C in V11. They are **not** qualified for V14 projection by this Writer2 PR.

```text
NODENAME existing-field Writer1C change  -> V14 NOT_QUALIFIED
RESTRANT existing-field Writer1A/1B      -> V14 NOT_QUALIFIED
SIF&TEES existing ii/io Writer1C         -> V14 NOT_QUALIFIED
```

A future V14 Writer1 route requires a separate source-qualified field-identity projection authority. It must not be enabled by weakening `CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED`.

### NODENAME existing-section boundary

The existing V11 Writer2 NODENAME writer requires the physical `#$ NODENAME` section and a following section marker. Therefore:

```text
qualified:
  row insertion/deletion within an existing NODENAME section

not qualified:
  creation of an absent whole NODENAME section
```

The V14 bridge does not widen that V11 structural boundary.

### Equal-cardinality non-cardinality sections

For projectable sections that are not governed by `CARDINALITY_UNIT_ROWS` (`CONTROL` and `ELEMENTS`), fixed-width field projection is still subordinate to the independently validated V11 Writer2 postimage:

```text
baseline field unchanged -> preserve ORIGINAL field bytes
baseline field changed   -> project canonical modified field
changed-field preimage   -> must be compatible with ORIGINAL field
ambiguous/non-fixed replacement -> BLOCK
```

### Final proof

Two exact V11 proofs remain mandatory:

```text
canonical modified V14 -> V11
  == exact validated Writer2 V11 TARGET1

projected native-byte V14 -> V11
  == exact validated Writer2 V11 TARGET1
```

The second proof is final projection authority.

## Converter testimony is secondary

The JS client independently verifies:

```text
physical source VERSION = exact integral 11 or 14
physical target VERSION = requested target
SHA256(actual input) = audit.source_sha256
SHA256(actual output) = audit.target_sha256
actual byte counts = audit byte counts
audit.schema = cii-v11-v14-conversion-audit/v1
changed_sections / warnings / loss_events are arrays
```

Audit arrays are frozen after admission. Missing `loss_events` is malformed testimony, not zero loss.

## Shared Pyodide runtime custody

```text
one active Python job at a time
failed job does not poison queue
job files removed before directory removal
empty input rejected before FS allocation
worker error/messageerror rejects pending jobs and resets worker
postMessage failure removes pending request
worker cache identity advances with runtime semantic changes
```

Current worker cache identity:

```text
20260825-frozen-3d-converters-7
```

## Cross-boundary provenance

Each side records:

```text
originalVersion
normalizedVersion = 11
originalSha256
normalizedSha256
baselineCanonicalSha256
exactBaselineRoundTrip  # evidence only, never admission authority
normalization audit
canonicalization audit
```

Inspection/preview require Workspace content SHA to equal normalized V11 SHA. Apply requires fresh V14 downgrade to reproduce the preview-bound original and normalized hashes and the preview-bound canonical baseline SHA.

Canonical exported audit JSON includes version-bridge evidence.

## Fail-closed gates

```text
runtime frozen-source drift
  deployed Git blob mismatch

unsupported/non-integral version
  CII_VERSION_BRIDGE_UNSUPPORTED_VERSION

malformed converter testimony
  CII_VERSION_BRIDGE_AUDIT_REQUIRED
  CII_VERSION_BRIDGE_AUDIT_SCHEMA_MISMATCH
  CII_VERSION_BRIDGE_AUDIT_ARRAY_REQUIRED
  CII_VERSION_BRIDGE_*_BYTE_COUNT_AUDIT_MISMATCH
  CII_VERSION_BRIDGE_*_SHA256_AUDIT_MISMATCH

lossy conversion
  frozen converter raises with allow_lossy=false
  CII_VERSION_BRIDGE_LOSS_NOT_ALLOWED

stale custody
  CII_WRITER_2_STALE_ORIGINAL_V14_TARGET_HASH
  CII_WRITER_2_STALE_NORMALIZED_V11_TARGET_HASH
  CII_VERSION_BRIDGE_BASELINE_CANONICAL_SHA_MISMATCH

projection authority
  CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED
  CII_V14_PROJECTION_AMBIGUOUS_DUPLICATE_UNIT
  CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN
  CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED
  CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED
  CII_V14_PROJECTION_CHANGED_FIELD_PREIMAGE_MISMATCH

V11 postimage mismatch
  CII_VERSION_BRIDGE_V11_POSTIMAGE_BYTES_REQUIRED
  CII_VERSION_BRIDGE_V11_POSTIMAGE_SHA_MISMATCH
  CII_VERSION_BRIDGE_CANONICAL_MODIFIED_ROUNDTRIP_NOT_EXACT
  CII_VERSION_BRIDGE_PROJECTED_V14_NORMALIZED_POSTIMAGE_MISMATCH
```

## Current capability boundary — PR #1055

```text
Writer2 NODENAME row CREATE/DELETE
  V11 DONE, existing NODENAME section required
  V14 1-row projection implemented, existing section required, full bridge runtime pending

Writer2 SIF block DELETE
  V11 DONE
  V14 14-row projection implemented, full bridge runtime pending

Writer2 RESTRAINT 24-row block DELETE
  V11 implemented, full Workspace runtime pending
  V14 24-row projection implemented, full bridge runtime pending

Writer2 HANGER delete/cardinality
  V11 DONE / PRODUCT_ROUTED
  V14 NOT_AUTHORIZED_FOR_PROJECTION

Writer1 NODENAME/SIF/RESTRAINT existing fields
  V11 existing qualified authorities unchanged
  V14 NOT_QUALIFIED in this Writer2 PR

V11 SIF/HANGER/RESTRAINT CREATE
  SOURCE_BLOCKED_REAFFIRMED_V11

Writer3 topology
  OUTSIDE_WRITER2
```

## Qualification state

```text
frozen source repository custody                 PASS_EXACT_BLOB_CUSTODY
exact upstream benchmark custody                 PASS_EXACT_GIT_BLOB
frozen-engine authored Python test               PASS_RUNTIME_EXACT_SEVEN_FILE_BLOB_GRAPH
frozen-source authored JS @18433c...             PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
current frozen-source JS @095ddb...              NOT_RUN_AFTER_W2_29_MISCEL_ASSERTION_STRENGTHENING
W2.30 Writer2-only projector graph               PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_30_WRITER2_ONLY_SCOPE
W2.13 synthetic full Workspace                   NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real V11 full Workspace           NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
real Writer2 projected V14 mutation              NOT_RUN
browser/product V14 bridge                       NOT_RUN
external CAESAR V11 import/re-export             NOT_RUN
```

W2.30 focused runtime:

```text
module  0a16b1383da6ef58abf55c53a91711a0a1f21c17
test    90b7b8fb4edbdb63accbf0ff21a8185610ab06b0
command node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js
result  PASS
```

This narrow PASS is not full converter, bridge, product, browser, V14 Writer1, or release qualification.

Evidence:

```text
docs/cii-writer2-v14-writer2-only-projection-scope-2026-08-26.md
```

GitHub Actions are not authorized. Live V14 UI auto-routing remains disabled until required full-path runtime gates pass.
