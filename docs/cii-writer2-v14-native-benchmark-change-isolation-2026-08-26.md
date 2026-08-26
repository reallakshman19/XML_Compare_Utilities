# CII Writer2 — native V14 benchmark and change-isolation correction

Date: 2026-08-26
PR: #1055
Pinned converter source: `reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4`

## 1. Purpose

This record closes a flaw in the first XML-side V14 bridge policy.

The original bridge required an untouched native V14 CII to satisfy:

```text
native V14 -> frozen V11 -> frozen V14 == native V14 byte-for-byte
```

That requirement was an XML Writer2 invention; it is not an upstream `3D_Converters` guarantee. The pinned converter guarantees same-version no-op byte identity and qualifies cross-version structural/semantic conversion, but intentionally emits target-dialect numeric formatting.

The real paired benchmark proves whole-file cross-version byte identity is not a viable Writer2 admission rule.

## 2. Exact benchmark custody

Pinned archive:

```text
repository  reallaksh19/3D_Converters
commit      ca8d391ac5f829f53bebb3c37adf0547c34a67b4
path        Benchmarks/v11-v14.zip
size        10740 bytes
Git blob    8409e1c429665e34a83c2a464665ebf5d5f1b0a1
SHA-256     da0b276c4c2f3a44c3dcd0a6cddd6ca9fcdfc44709caac7af61083b79bb7f808
```

The archive was retrieved from the pinned GitHub object as base64 ranges, reconstructed locally, decoded, and admitted only after recomputing the Git object hash over:

```text
blob 10740\0<exact zip bytes>
```

The recomputed SHA-1 exactly matched `8409e1c429665e34a83c2a464665ebf5d5f1b0a1`.

Archive members:

```text
SYS-0001-v14.CII
  size       168574 bytes
  ZIP CRC32  fee884d9
  Git blob   0dec86e5efa00195a5e7b487010797bb182272fc
  SHA-256    d2d4316309d9b1aa34b55ad72f89193fd0e437930db203fecd9ede00e69b2faf

SYS-0001-v11.cii
  size       316571 bytes
  ZIP CRC32  c0e384d4
  Git blob   3fbfec215a0283ddf5f6a2ca8a99bf205df64b2b
  SHA-256    41ef8912a55a978aa96b3300f42ba2ff335ba5bb35c4882f4012af0e011dc9cc
```

The pair is the upstream 112-element same-model benchmark.

## 3. Exact physical profile observed

Native V14 section row counts:

```text
VERSION      61
CONTROL       4
ELEMENTS   1680   = 112 x 15
AUX_DATA      0
NODENAME     55
BEND         27
RIGID        43
EXPJT         0
RESTRANT    960   = 40 x 24
DISPLMNT      0
FORCMNT       0
UNIFORM       0
WIND          0
OFFSETS       0
ALLOWBLS      0
SIF&TEES     28   = 2 x 14
REDUCERS      2   = 1 x 2
FLANGES       0
EQUIPMNT      0
MISCEL_1     23
UNITS        28
COORDS        2
```

The V14 member uses CRLF; the V11 member uses LF.

The exact native V14 member also provides the physical-identity check used by projection design:

```text
40 / 40 RESTRAINT 24-row blocks unique
2 / 2 SIF&TEES 14-row blocks unique
55 / 55 NODENAME 1-row units unique
```

This does not remove the runtime duplicate-unit blocker; it only proves the retained benchmark itself is not rejected by that ambiguity rule.

## 4. Decisive cross-version byte-identity falsifier

Pinned formatter authority:

```python
# V11 ordinary mid-range REAL
return f"{value:#.6G}"      # 6 significant digits

# V14 REAL
return f"{value:.6E}"       # 6 digits after decimal = 7 significant digits
```

`RIGID` is not handled by a special semantic converter. The pinned `_convert_section()` falls through to `_generic_numeric_convert()` for RIGID rows.

The first exact native benchmark RIGID row is:

```text
native V14
   2.044599E+02 0.000000E+00
```

Applying the pinned formatter rules gives:

```text
V14 -> V11
        204.460     0.000000

V11 -> V14
   2.044600E+02 0.000000E+00
```

Therefore:

```text
2.044599E+02 != 2.044600E+02
```

The paired native V11 export is independently:

```text
        204.470     0.000000
```

This further confirms that the converter is a qualified dialect/semantic adapter, not a native-export byte emulator.

The same deterministic formatting test finds **26 of the 43 V14 RIGID rows** are non-byte-reversible through the V11 formatter. No lossy engineering audit event is required for this difference.

Disposition:

```text
OLD_WHOLE_FILE_BASELINE_EXACT_ROUNDTRIP_GATE
  = REJECTED_BY_EXACT_BENCHMARK_SOURCE_FALSIFIER

UPSTREAM_CONVERTER_DEFECT
  = FALSE

XML_BRIDGE_POLICY_DEFECT
  = TRUE / CORRECTED_ON_PR1055
```

This source falsifier is independent of the full target-repository converter runtime; it derives from exact benchmark bytes plus exact pinned formatter/routing source.

## 5. Corrected V14 Writer2 model

The bridge now uses the frozen converter as a canonical **differential oracle**, while original native V14 bytes remain physical authority:

```text
original native V14 TARGET0
    |
    +--> frozen V14 -> V11
    |        |
    |        +--> normalized V11 TARGET0
    |                 |
    |                 +--> existing V11 Writer2
    |                           |
    |                           +--> independently validated V11 TARGET1
    |
    +--> normalized V11 TARGET0 -> frozen V11 -> V14
    |        canonical baseline V14
    |
    +--> validated V11 TARGET1 -> frozen V11 -> V14
             canonical modified V14

canonical baseline -> canonical modified
             |
             +--> derive only Writer2-caused row/field/cardinality delta
                         |
                         +--> project onto ORIGINAL native V14 bytes
                                     |
                                     +--> projected V14 TARGET1
                                                |
                                                +--> frozen V14 -> V11
                                                     MUST equal exact V11 TARGET1
```

The canonical V14 file is never the final Writer2 output.

## 6. Projection fail-closed rules

Implementation:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema CIIWorkspaceV14ChangeProjection.v2
```

Changed-section allowlist:

```text
CONTROL
ELEMENTS
NODENAME
RESTRANT
SIF&TEES
MISCEL_1
```

Any canonical delta in an unlisted section, including `RIGID`, `UNITS`, or `COORDS`, blocks rather than being projected.

Equal-cardinality rule:

```text
baseline field unchanged -> retain ORIGINAL native V14 field bytes
baseline field changed   -> apply only the canonical modified field
changed-field preimage   -> must be compatible with ORIGINAL
ambiguous/non-fixed replacement -> BLOCK
```

Cardinality is not row-LCS custody. It uses qualified physical units:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit in V14
```

Rules:

```text
unique canonical unit identities required
isolated unit deletion/insertion only
duplicate unit identity -> BLOCK
unit misalignment -> BLOCK
mixed replacement/cardinality run -> BLOCK
unqualified cardinality section -> BLOCK
```

`MISCEL_1`/HANGER cardinality remains deliberately unqualified and fail-closed.

Final authority gate:

```text
frozen V14->V11(projected V14 TARGET1)
    == exact validated Writer2 V11 TARGET1 bytes
```

Thus converter formatting normalization outside Writer2's actual mutation cannot leak into the final V14 file.

## 7. Focused projection runtime — executed

The projection module has a bounded pure-JS graph. The exact current PR module and authored test were materialized, and their Git-object identities were independently checked before execution:

```text
module
  tabs/cii-workspace/cii-workspace-v14-change-projection.js
  Git blob 0a04c75c2ed0880a815c17616a7c99afcde132c2

test
  tests/cii-workspace-v14-change-projection.test.js
  Git blob 60f1586e5ac469988b59ede2b59258dcdc771e57

command
  node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js

result
  PASS
```

Classification:

```text
PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE
```

The assertions cover original-byte preservation, qualified fixed-row projection, unauthorized `RIGID` delta blocking, 24-row RESTRAINT deletion, duplicate-unit rejection, non-isolated NODENAME cardinality rejection, unqualified MISCEL/HANGER cardinality rejection, section-order rejection and CRLF custody.

This PASS does **not** qualify the full frozen Python graph, Worker/Pyodide bridge, W2.13 product, real native V14 Writer2 mutation, browser path, or external CAESAR acceptance.

## 8. Updated qualification state

```text
BENCHMARK_ZIP_CUSTODY                    PASS_EXACT_GIT_BLOB
BENCHMARK_PAIR_EXTRACTION                PASS_EXACT_BYTES
OLD_BASELINE_EXACT_GATE                  REJECTED_EXACT_BENCHMARK_SOURCE_FALSIFIER
V14_CHANGE_ISOLATION_ARCHITECTURE        IMPLEMENTED
V14_PROJECTION_FOCUSED_RUNTIME           PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE
FULL_FROZEN_ENGINE_RUNTIME               NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
FROZEN_SOURCE_AUTHORED_JS                NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
REAL_BENCHMARK_FULL_CONVERTER_NORMALIZE  NOT_RUN
REAL_WRITER2_PROJECTED_V14_MUTATION      NOT_RUN
PROJECTED_V14_FINAL_NORMALIZATION_PROOF  IMPLEMENTED_PENDING_RUNTIME
BROWSER_PYODIDE_PRODUCT                  NOT_RUN
LIVE_UI_AUTO_ADOPTION                    DISABLED
EXTERNAL_CAESAR_ACCEPTANCE               NOT_RUN
```

## 9. Remaining runtime gates

```text
1. frozen-engine authored Python test on its exact frozen graph
2. frozen-source authored JS test on its exact repository graph
3. real benchmark V14 normalization with the full pinned converter
4. real Writer2 mutation through canonical differential + original-byte projection
5. projected V14 -> V11 exact equality with Writer2 V11 postimage
6. W2.13 / retained-real V11 Writer2 product gates
7. browser/Pyodide product qualification
8. external CAESAR import/save/re-export acceptance, tracked separately
```
