# CII Writer2 V11/V14 — exact frozen-source authored runtime

Date: 2026-08-26  
PR: #1055  
Stage: W2.28  
Pinned upstream: `reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4`

## 1. Scope

This record retains execution of the authored target test:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
```

against the exact source-custody graph required by that test. The runtime is intentionally source/custody focused: it does not execute Pyodide, the browser worker, Writer2 product routing, or a real V14 mutation.

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

The six frozen upstream blobs were:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

Each participating local file was admitted by recomputing its Git object SHA over:

```text
blob <byte_length>\0<exact_bytes>
```

before execution.

## 3. Executed authored test

Executed authored test blob:

```text
18433c7664428a02bea97625ce6bdc3c21bd8365
```

Command:

```text
node --experimental-default-type=module tests/cii-workspace-v11-v14-frozen-source.test.js
```

Result:

```text
CII Workspace frozen 3D_Converters V11/V14 source + change-isolation custody: PASS
```

Classification:

```text
PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
```

The executed assertions covered, among other source-custody invariants:

- exact frozen Python Git-blob custody;
- explicit drift between local repository section rules and the frozen upstream dependency;
- worker runtime pinning of the six frozen blobs;
- binary `arrayBuffer()` fetch and exact-byte Pyodide write path;
- no `response.text()` frozen-source re-encoding path;
- frozen-source queue and cleanup contracts;
- converter audit schema/array/hash/byte-count gates;
- V11/V14 physical version admission;
- byte-string and SHA-256 custody helpers;
- original-V14 plus canonical-delta bridge policy;
- no retired whole-file baseline equality blocker;
- exact final projected-normalization proof requirement;
- V14 projector schema/cardinality/fail-closed source contracts.

## 4. Post-execution test strengthening

After the successful exact-graph run, the authored JS test was strengthened to require the W2.27 changed-section allowlist and its explicit unauthorized-section blocker.

Current strengthened test Git blob:

```text
85377e45ab0044d90e4e70cf0ba8cd921d7442e7
```

The new assertions require the projector source to expose the exact changed-section allowlist and `CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED` fail-closed contract.

The strengthened blob has **not** been rerun as the complete 12-file authored test in the current execution environment. Native checkout still fails because `github.com` cannot be resolved, and no GitHub Actions qualification is authorized.

Therefore the exact status is:

```text
frozen-source authored JS test @18433c...   PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
strengthened authored JS test @85377e...    NOT_RUN_AFTER_ASSERTION_STRENGTHENING
```

No source inspection of the strengthened assertions is promoted to runtime PASS.

## 5. Scope limits

This evidence does **not** qualify:

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

Those remain separate gates.
