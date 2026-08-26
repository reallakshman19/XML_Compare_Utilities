# CII Writer2 V11/V14 — exact frozen-source authored runtime

Date: 2026-08-26  
PR: #1055  
Initial stage: W2.28  
Current addendum: W2.29  
Pinned upstream: `reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4`

## 1. Scope

This record retains execution of:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
```

against the exact source-custody graph required at the time of execution. It does not execute Pyodide, Writer2 product routing, or a real V14 mutation.

## 2. Exact executed graph

The executed graph contained 12 exact repository files:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tabs/cii-workspace/cii-workspace-v11-v14-converter.js
converters/cii-v11-v14-writer-worker.js
tabs/cii-workspace/cii-workspace-writer-version-bridge.js
tabs/cii-workspace/cii-workspace-v14-change-projection.js
converters/scripts/cii2019_section_rules.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_format.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_records.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_sif.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_validate.py
converters/scripts/cii-v11-v14-upstream/cii2019_section_rules.py
```

Frozen upstream blobs:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

Each participating local file was admitted by recomputing Git object SHA over:

```text
blob <byte_length>\0<exact_bytes>
```

before execution.

## 3. Executed authored test

Executed test blob:

```text
18433c7664428a02bea97625ce6bdc3c21bd8365
```

Command/result:

```text
node --experimental-default-type=module tests/cii-workspace-v11-v14-frozen-source.test.js
CII Workspace frozen 3D_Converters V11/V14 source + change-isolation custody: PASS
```

Classification:

```text
PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
```

The executed assertions covered frozen Python Git-blob custody, dependency isolation, runtime blob pinning, binary fetch/write custody, job serialization/cleanup, converter audit gates, V11/V14 admission, SHA/byte-string helpers, change-isolated bridge policy, final projected-normalization proof requirements, and then-current projector fail-closed contracts.

## 4. Post-execution strengthening history

After the exact PASS, this authored test was strengthened without claiming new runtime evidence.

### W2.28 strengthening

Test blob:

```text
85377e45ab0044d90e4e70cf0ba8cd921d7442e7
```

Added source assertions for:

```text
PROJECTABLE_CHANGED_SECTIONS
changed-section membership gate
CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED
```

### W2.29 strengthening

The projector then gained stronger authority boundaries after an exact two-file falsifier/run:

```text
CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED
CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED
MISCEL_1 removed entirely from projectable changed sections
```

Current frozen-source test blob is:

```text
095ddb65d51b3f3dda577a0db2c9d091e580dc5b
```

It now also asserts that the `PROJECTABLE_CHANGED_SECTIONS` declaration does not contain `MISCEL_1`.

The current `095ddb...` 12-file graph has **not** been rerun. The last actual full source-custody execution remains `18433c...`.

Therefore:

```text
frozen-source authored JS @18433c...  PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
current authored JS @095ddb...       NOT_RUN_AFTER_W2_29_MISCEL_ASSERTION_STRENGTHENING
```

No source inspection or incremental assertion reasoning is represented as a fresh current-blob runtime PASS.

## 5. Related W2.29 projector runtime

The current projector itself has separate exact two-file runtime evidence:

```text
module  0a16b1383da6ef58abf55c53a91711a0a1f21c17
test    586d6be0537162100979df63f56146db9d64c0e5
result  PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_29_FINAL
```

Evidence:

```text
docs/cii-writer2-v14-projection-unit-order-runtime-2026-08-26.md
```

That projector PASS does not substitute for rerunning the complete current 12-file frozen-source test.

## 6. Scope limits

This evidence does not qualify:

```text
browser/Pyodide runtime
runtime deployed-source network fetch
W2.13 Writer2 product routing
retained-real V11 RESTRAINT product
real/native V14 change-isolated Writer2 mutation
projected V14 -> V11 real-file postimage proof
repository npm/browser suite
external CAESAR import/save/re-export acceptance
```
