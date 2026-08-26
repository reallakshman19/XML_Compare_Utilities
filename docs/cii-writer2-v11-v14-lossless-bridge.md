# CII Writer2 — CAESAR II V11 / V14 change-isolation bridge

## Decision

Do not implement a second independent CAESAR II V14 engineering-semantics writer and do not alter `reallaksh19/3D_Converters`.

Reuse:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

The V14 route in PR #1055 is a **Writer2-only bridge** around the existing V11 Writer2. V14 Writer1A/B/C fixed-field editing remains outside this PR.

## Authority split

```text
3D_Converters
  V11 <-> V14 dialect conversion
  version-specific record shape and semantic mapping
  source/generated structural validation
  explicit lossy-event detection

XML_Compare_Utilities
  existing V11 Writer2 engineering mutation
  independent V11 complete-postimage validation
  original V14 byte custody
  W2.31 exact CONTROL/ELEMENT field identity guard
  W2.29/W2.30 Writer2 cardinality projection
  final projected V14 -> V11 exact-postimage proof
```

The converter does not fill V11 SIF/HANGER/RESTRAINT CREATE gaps and does not authorize Writer3 topology.

## Frozen upstream custody

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

The browser worker fetches exact bytes, verifies each deployed Git-object SHA, and writes those verified bytes directly into Pyodide. No frozen Python text decode/re-encode is permitted.

## Why whole-file V14 roundtrip equality is retired

Exact upstream benchmark:

```text
Benchmarks/v11-v14.zip
Git blob 8409e1c429665e34a83c2a464665ebf5d5f1b0a1
```

Concrete formatter falsifier:

```text
native V14  2.044599E+02
V14 -> V11  204.460
V11 -> V14  2.044600E+02
```

26/43 native V14 RIGID rows are deterministically non-byte-reversible through the V11 dialect. Therefore whole-file byte equality is not admission authority, but broad semantic equivalence is also insufficient for unrelated-byte custody.

## Native V14 Writer2 execution path

```text
ORIGINAL V14 TARGET0
  -> frozen V14->V11, allow_lossy=false
  -> normalized V11 TARGET0
  -> existing V11 Writer2
  -> independently validated V11 TARGET1
  -> frozen V11->V14 canonical modified V14

normalized V11 TARGET0
  -> frozen V11->V14 canonical baseline V14

canonical baseline vs modified
  -> W2.31 exact Writer2 CONTROL/ELEMENT fixed-field guard
  -> W2.29/W2.30 cardinality/change projector
  -> project onto ORIGINAL V14 bytes
  -> projected V14 TARGET1
  -> frozen V14->V11
  -> MUST equal exact validated V11 TARGET1
```

Canonical V14 is differential evidence only; never final broad-output authority.

## W2.30 Writer2 cardinality projector

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema CIIWorkspaceV14ChangeProjection.v2
blob   0a16b1383da6ef58abf55c53a91711a0a1f21c17
```

Changed-section allowlist:

```text
CONTROL
ELEMENTS
NODENAME
RESTRANT
SIF&TEES
```

Qualified physical units:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit
```

Equal-cardinality NODENAME/RESTRANT/SIF&TEES payload mutation is blocked. This is intentional: those fixed-field changes belong to V11 Writer1A/B/C and are not qualified for V14 by PR1055.

`MISCEL_1`/HANGER is not projectable. NODENAME row CREATE/DELETE also requires an already-existing physical NODENAME section.

## W2.31 exact CONTROL/ELEMENT authority

Source audit found a broad projector condition: when canonical baseline equaled original, `mergeChangedRow()` could adopt an entire modified row. The V14 product route therefore now executes a separate guard before projection:

```text
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
schema CIIWorkspaceV14Writer2FixedFieldAuthority.v1
blob   7bc3a83ef37159c9a70fb0e16acaba721fd73b26
```

Bridge integration blob:

```text
8038993f0a97719c0c316f31c2d6c30ea0386ec4
```

Allowed CONTROL fields, zero-based payload row / fixed-field index:

```text
0:3  CONTROL_NODENAME_NONAM_COUNT
1:3  CONTROL_RESTRAINT_BLOCK_COUNT
2:4  CONTROL_SIF_TEE_BLOCK_COUNT
```

Allowed ELEMENTS fields, zero-based row within each 15-row element block / field index:

```text
12:3 ELEMENT_RESTRAINT_POINTER
13:4 ELEMENT_SIF_TEE_POINTER
13:5 ELEMENT_NODENAME_POINTER
```

These coordinates are grounded to existing V11 writer/custody modules. The pinned converter preserves ELEMENT rows 12-15 rather than relocating or re-rendering them.

Guard rules:

```text
any other CONTROL/ELEMENT field change -> BLOCK
non-integer or negative count/pointer -> BLOCK
ELEMENT rows not multiple of 15 -> BLOCK
cardinality payload change without matching CONTROL count -> BLOCK
CONTROL count change without physical cardinality change -> BLOCK
pointer change without physical cardinality change -> BLOCK
SIF/RESTRANT cardinality increase -> BLOCK
changed pointer outside physical before/after count -> BLOCK
```

The guard returns immutable claims retained under `versionBridgeValidation.fixedFieldAuthority`.

Exact W2.31 focused runtime:

```text
guard  7bc3a83ef37159c9a70fb0e16acaba721fd73b26
test   74077b00b094c5e30ff402f8a0adeb1814bb24cc
result  PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_31_FIXED_FIELD_AUTHORITY
```

Evidence: `docs/cii-writer2-v14-fixed-field-authority-runtime-2026-08-26.md`.

## Final proof chain

For V14 apply, all of the following must succeed:

```text
original V14 hash custody
fresh lossless V14->V11 reproduces preview normalized SHA
existing V11 Writer2 succeeds
independent V11 Writer2 validation succeeds
V11 byteString is authoritative postimage bytes
canonical modified V14->V11 exactly reproduces V11 TARGET1
W2.31 CONTROL/ELEMENT field guard passes
W2.30 cardinality/change projection passes
projected native V14->V11 exactly reproduces V11 TARGET1
```

## Fail-closed boundary

```text
lossy converter event                          BLOCK
malformed converter audit                     BLOCK
stale original/normalized/canonical SHA        BLOCK
changed V14 section outside allowlist          BLOCK
MISCEL/HANGER V14 change                       BLOCK
retained unit reorder                          BLOCK
same-count NODENAME/SIF/RESTRAINT replacement BLOCK
unqualified CONTROL/ELEMENT field              BLOCK
CONTROL/cardinality inconsistency              BLOCK
SIF/RESTRAINT cardinality increase             BLOCK
out-of-range changed pointer                   BLOCK
absent NODENAME whole-section creation         BLOCK
V14 Writer1 fixed-field mutation               NOT QUALIFIED
Writer3 topology                               OUTSIDE WRITER2
```

## Qualification state

```text
frozen source custody                         PASS_EXACT_BLOB_CUSTODY
frozen-engine authored Python                 PASS_RUNTIME_EXACT_SEVEN_FILE_BLOB_GRAPH
historical frozen-source JS @18433c...        PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
W2.30 projector graph                         PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_30_WRITER2_ONLY_SCOPE
W2.31 fixed-field guard graph                 PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_31_FIXED_FIELD_AUTHORITY
current frozen-source JS @75ba19e...          NOT_RUN_AFTER_W2_31_FIELD_AUTHORITY_STRENGTHENING
W2.13 synthetic full Workspace                NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real V11 full Workspace        NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
real native V14 Writer2 mutation              NOT_RUN
browser/product V14 bridge                    NOT_RUN
repository npm/full regressions                NOT_RUN/PARTIAL
external CAESAR acceptance                    NOT_RUN
```

GitHub Actions are not authorized. Live V14 UI auto-routing remains disabled until the required full-path runtime gates pass.
