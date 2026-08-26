# CII Writer2 — CAESAR II V11 / V14 change-isolation bridge

## Decision

Do not implement a second independent CAESAR II V14 engineering-semantics writer and do not alter `reallaksh19/3D_Converters`.

Reuse the existing V11<->V14 dialect converter from:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

Use the already-qualified V11 CII Workspace/Writer2 as engineering mutation authority. For V14 output, preserve the original native V14 bytes and project only the Writer2-caused canonical delta back onto those original bytes.

The six Python engine/dependency files remain vendored byte-identically under:

```text
converters/scripts/cii-v11-v14-upstream/
```

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
  qualified V14 projection family/cardinality boundary
  final projected V14 -> V11 exact-postimage proof
```

The converter does not authorize V11 SIF/HANGER/RESTRAINT CREATE and does not widen Writer3/topology authority.

## Exact upstream custody

Pinned blobs:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

At browser runtime, the worker also verifies each fetched deployed file against the pinned Git object SHA before Python execution:

```text
fetch exact bytes
-> construct "blob <length>\0<bytes>"
-> WebCrypto SHA-1
-> require pinned Git blob SHA
-> write the same verified bytes directly into Pyodide
```

No frozen Python `response.text()` decode/re-encode path is permitted.

## Why whole-file V14 roundtrip equality was retired

The first bridge prototype required:

```text
native V14 -> V11 -> V14 == native V14 byte-for-byte
```

That was an XML-side policy assumption, not an upstream guarantee.

Exact paired benchmark evidence disproves the assumption:

```text
Benchmarks/v11-v14.zip
Git blob 8409e1c429665e34a83c2a464665ebf5d5f1b0a1
size     10740 bytes

SYS-0001-v14.CII
SHA-256  d2d4316309d9b1aa34b55ad72f89193fd0e437930db203fecd9ede00e69b2faf

SYS-0001-v11.cii
SHA-256  41ef8912a55a978aa96b3300f42ba2ff335ba5bb35c4882f4012af0e011dc9cc
```

The pinned formatter uses six significant digits for ordinary mid-range V11 REAL values and seven significant digits for V14 `.6E` values. The first native V14 RIGID row proves the effect:

```text
native V14        2.044599E+02 0.000000E+00
V14 -> V11        204.460      0.000000
V11 -> V14        2.044600E+02 0.000000E+00
```

26 of the 43 exact native V14 RIGID rows exhibit the same deterministic byte non-reversibility. This is target-dialect formatting, not a converter lossy-event defect.

Therefore whole-file cross-version byte equality is retired as V14 admission authority. Generic semantic equivalence is also insufficient for Writer2 unrelated-byte custody.

Canonical evidence:

```text
docs/cii-writer2-v14-native-benchmark-change-isolation-2026-08-26.md
```

## Corrected execution paths

### Native V11

```text
V11 SOURCE/TARGET
-> original SHA custody
-> existing CII Workspace intake/preview
-> existing V11 Writer2
-> existing V11 independent complete-postimage validation
-> V11 output
```

### V14

```text
original native V14 TARGET0
   |
   +--> runtime-verified frozen V14 -> V11, allow_lossy=false
   |       |
   |       +--> normalized V11 TARGET0
   |                |
   |                +--> existing V11 Writer2
   |                         |
   |                         +--> independently validated V11 TARGET1
   |
   +--> normalized V11 TARGET0 -> frozen V11 -> V14
   |       canonical baseline V14
   |
   +--> validated V11 TARGET1 -> frozen V11 -> V14
           canonical modified V14

canonical baseline -> canonical modified
        |
        +--> isolate Writer2-caused fixed-field/record-unit delta
                     |
                     +--> project onto ORIGINAL native V14 bytes
                                  |
                                  +--> projected V14 TARGET1
                                             |
                                             +--> frozen V14 -> V11
                                                  MUST equal exact V11 TARGET1 bytes
```

The canonical modified V14 is an oracle input, never the final Writer2 output.

## V14 projection contract

Implementation:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema: CIIWorkspaceV14ChangeProjection.v2
```

### Changed-section authority

Canonical changes may be projected only in:

```text
CONTROL
ELEMENTS
NODENAME
RESTRANT
SIF&TEES
MISCEL_1
```

Any changed section outside this list fails with `CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED`. Thus converter canonicalization in `RIGID`, `UNITS`, `COORDS`, or another non-owned family cannot become Writer output.

### Unchanged sections

If canonical baseline and canonical modified section payloads are identical:

```text
copy the ORIGINAL V14 section header and rows exactly
```

This is the primary anti-canonicalization rule.

### Equal-cardinality changed rows

For fixed-width rows:

```text
baseline field unchanged -> preserve ORIGINAL field bytes
baseline field changed   -> project canonical modified field
changed-field preimage   -> must be compatible with ORIGINAL field
ambiguous/non-fixed replacement -> BLOCK
```

### Cardinality changes

Cardinality is projected by qualified physical record units, not arbitrary row LCS:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit (V14)
```

Rules:

```text
unique canonical unit identities required
isolated unit deletion -> delete corresponding original-coordinate units
isolated unit insertion -> insert modified canonical units
mixed replacement/cardinality run -> BLOCK
duplicate unit identity -> BLOCK
unit misalignment -> BLOCK
```

`MISCEL_1`/HANGER cardinality is deliberately not yet qualified for V14 projection and therefore blocks.

### Final proof

Two exact V11 proofs remain mandatory:

```text
canonical modified V14 -> V11
  == exact validated Writer2 V11 TARGET1

projected native-byte V14 -> V11
  == exact validated Writer2 V11 TARGET1
```

The second proof is the final projection oracle.

## Converter testimony is secondary

The JS client independently verifies:

```text
physical source VERSION = exact integral 11 or 14
physical target VERSION = requested target
SHA256(actual input) = audit.source_sha256
SHA256(actual output) = audit.target_sha256
actual byte counts = audit byte counts
audit.schema = cii-v11-v14-conversion-audit/v1
changed_sections / warnings / loss_events exist as arrays
```

Audit arrays are frozen after admission. Missing `loss_events` is a malformed audit, not zero loss.

## Shared Pyodide runtime custody

One Pyodide runtime is used, so converter jobs are serialized:

```text
one active Python job at a time
failed job does not poison queue
job files removed before directory removal
empty input rejected before FS allocation
worker error/messageerror rejects pending jobs and resets worker
postMessage failure removes pending request
worker cache key advances with runtime semantic changes
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
exactBaselineRoundTrip   # evidence only, never admission authority
normalization audit
canonicalization audit
```

Inspection/preview require workspace content SHA to equal the normalized V11 SHA.

At apply, a fresh target downgrade must reproduce the preview-bound original V14 SHA and normalized V11 SHA, and its canonical baseline SHA must reproduce the preview-bound canonical baseline SHA.

Canonical exported audit JSON includes this version-bridge evidence.

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

workspace intake drift
  CII_VERSION_BRIDGE_INSPECTION_*_NORMALIZED_HASH_MISMATCH
  CII_VERSION_BRIDGE_PREVIEW_*_NORMALIZED_HASH_MISMATCH

projection authority / preimage / structure ambiguity
  CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED
  CII_V14_PROJECTION_AMBIGUOUS_DUPLICATE_UNIT
  CII_V14_PROJECTION_CARDINALITY_SECTION_NOT_QUALIFIED
  CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN
  CII_V14_PROJECTION_CHANGED_FIELD_PREIMAGE_MISMATCH
  other CII_V14_PROJECTION_* envelope blockers

V11 postimage mismatch
  CII_VERSION_BRIDGE_V11_POSTIMAGE_BYTES_REQUIRED
  CII_VERSION_BRIDGE_V11_POSTIMAGE_SHA_MISMATCH
  CII_VERSION_BRIDGE_CANONICAL_MODIFIED_ROUNDTRIP_NOT_EXACT
  CII_VERSION_BRIDGE_PROJECTED_V14_NORMALIZED_POSTIMAGE_MISMATCH
```

## Current V14 capability boundary

```text
fixed-field Writer1/Writer2 changes
  SOURCE_IMPLEMENTED / FULL-BRIDGE RUNTIME PENDING

NODENAME CREATE/DELETE
  1-row projection implemented / full-bridge runtime pending

RESTRAINT 24-row block DELETE
  24-row projection implemented / full-bridge runtime pending

SIF/TEE block DELETE
  14-row V14 projection implemented / full-bridge runtime pending

HANGER delete/cardinality
  NOT_YET_QUALIFIED_FOR_V14_PROJECTION

V11 SIF/HANGER/RESTRAINT CREATE
  SOURCE_BLOCKED_REAFFIRMED_V11

Writer3 topology
  OUTSIDE_WRITER2
```

## Qualification state

Authored target tests:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
tests/cii-workspace-v14-change-projection.test.js
```

Current evidence:

```text
frozen source repository custody               PASS_EXACT_BLOB_CUSTODY
exact upstream benchmark ZIP custody            PASS_EXACT_GIT_BLOB
exact benchmark pair extraction                 PASS_EXACT_BYTES
old whole-file baseline exact gate              REJECTED_EXACT_BENCHMARK_SOURCE_FALSIFIER
bounded converter/adapter runtime                PASS_RUNTIME_EXACT_SOURCE_EXCERPT_12_FALSIFIERS
V14 change-isolation projection source          IMPLEMENTED_FAIL_CLOSED
focused authored projection runtime             PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE
frozen-source authored JS test                  NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test              NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real benchmark full-converter normalization     NOT_RUN
real Writer2 projected V14 mutation             NOT_RUN
final projected V14 -> V11 postimage proof      IMPLEMENTED_PENDING_RUNTIME
browser/product V14 bridge                      NOT_RUN
external CAESAR V11 import/re-export            NOT_RUN
```

Focused projection runtime used exact current PR blobs:

```text
projection module  0a04c75c2ed0880a815c17616a7c99afcde132c2
projection test    60f1586e5ac469988b59ede2b59258dcdc771e57
command            node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js
result             PASS
```

This narrow PASS is not a full converter, bridge, product, browser, or release qualification.

GitHub Actions are not authorized. Live V14 UI auto-routing remains disabled until the required full-path runtime gates pass.
