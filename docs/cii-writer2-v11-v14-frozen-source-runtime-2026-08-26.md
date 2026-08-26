# CII Writer2 V11/V14 — exact frozen-source authored runtime

Date: 2026-08-26  
PR: #1055  
Initial stage: W2.28  
Current addendum: W2.31  
Pinned upstream: `reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4`

## 1. Retained executed runtime

The last complete authored frozen-source execution used an exact 12-file Git-blob-admitted graph and test blob:

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

The executed graph covered:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tabs/cii-workspace/cii-workspace-v11-v14-converter.js
converters/cii-v11-v14-writer-worker.js
tabs/cii-workspace/cii-workspace-writer-version-bridge.js
tabs/cii-workspace/cii-workspace-v14-change-projection.js
converters/scripts/cii2019_section_rules.py
six frozen upstream Python/dependency files
```

Every participating local file was admitted by recomputing Git-object SHA before execution.

## 2. Post-execution strengthening

The authored source-custody test was subsequently strengthened as the V14 bridge authority narrowed.

W2.28/W2.29 added assertions for:

```text
changed-section allowlist
unit reorder blocker
same-count cardinality-unit blocker
MISCEL_1 exclusion
```

W2.31 adds a thirteenth source file to the custody graph:

```text
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
```

and requires:

```text
bridge imports and calls assertCiiV14Writer2FixedFieldAuthority
fixed-field guard executes before projectCanonicalV14WriterDelta
fixedFieldAuthority is retained in versionBridgeValidation
exact CONTROL coordinates 0:3, 1:3, 2:4
exact ELEMENT coordinates 12:3, 13:4, 13:5
unauthorized CONTROL/ELEMENT field blocker
CONTROL/cardinality correlation blocker
SIF/RESTRAINT cardinality-increase blocker
changed-pointer range blocker
```

Current authored source test blob:

```text
75ba19e9e8027b6d88dbda014cf83edcb11a120a
```

Current exact graph size:

```text
13 files
```

The current `75ba19e...` graph has **not** been executed as a complete exact graph. Therefore:

```text
historical authored JS @18433c...  PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
current authored JS @75ba19e...     NOT_RUN_AFTER_W2_31_FIELD_AUTHORITY_STRENGTHENING
```

No source inspection, previous graph PASS, or incremental reasoning is promoted to a fresh current-blob runtime PASS.

## 3. Independently executed focused W2.31 graph

The newly added W2.31 fixed-field guard has its own exact focused runtime:

```text
guard  7bc3a83ef37159c9a70fb0e16acaba721fd73b26
test   74077b00b094c5e30ff402f8a0adeb1814bb24cc
result  PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_31_FIXED_FIELD_AUTHORITY
```

Evidence:

```text
docs/cii-writer2-v14-fixed-field-authority-runtime-2026-08-26.md
```

This focused PASS does not substitute for rerunning the full current 13-file source-custody graph.

## 4. Frozen source identities

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

Frozen Python remains untouched.

## 5. Scope limits

Neither historical nor focused source-custody runtime qualifies:

```text
browser/Pyodide runtime
W2.13 Writer2 product routing
retained-real V11 RESTRAINT product
real/native V14 change-isolated Writer2 mutation
projected V14 -> V11 real-file postimage proof
repository npm/browser suite
external CAESAR import/save/re-export acceptance
```
