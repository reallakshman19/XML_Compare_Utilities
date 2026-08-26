# CII Writer2 V14 projection — unit order / equal-cardinality runtime evidence

Date: 2026-08-26  
PR: #1055  
Stage: W2.29

## 1. Scope

This record retains the exact two-file authored runtime for:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
tests/cii-workspace-v14-change-projection.test.js
```

The purpose is to prove that V14 cardinality projection cannot reinterpret a retained physical-unit reorder as an authorized delete+insert, and cannot treat same-count cardinality-unit replacement as fixed-row mutation.

## 2. Defect found by source audit

The W2.27 projector used unique unit identities and LCS matching for cardinality changes. That was insufficient for this sequence:

```text
baseline: A, B
modified: B, A
```

A plain LCS can represent this as one delete plus one insert, even though Writer2 compaction authority requires the relative order of retained units to remain unchanged.

A second path existed because equal physical row counts were routed through fixed-row projection before cardinality semantics were consulted.

## 3. First W2.29 exact run — real FAIL

Committed graph:

```text
projection module  6b83e85ff0229e9c6bbe3363beedbe5843d8c2d9
projection test    ae0f81ed419a26401194abc11e5c78b79164f044
```

Both local files were independently admitted by recomputing Git-object SHA over:

```text
blob <byte_length>\0<exact_bytes>
```

Command:

```text
node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js
```

Result:

```text
FAIL
expected CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED:RESTRANT
received CII_V14_PROJECTION_ROW_WIDTH_MISMATCH:RESTRANT:0
```

Interpretation: the falsifier correctly proved the equal-cardinality RESTRANT path was still being treated as row mutation instead of cardinality-unit custody.

## 4. Authority correction

The projector now applies this rule:

```text
for sections with qualified cardinality units:
  if canonical baseline != canonical modified
  and physical row count is unchanged
    -> do not route through fixed-row mutation
```

It groups canonical rows by the qualified unit size, requires unique identities, computes the ordered LCS, and then:

```text
moved common unit
  -> CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED

same-count replacement without reorder
  -> CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED
```

Qualified unit sizes remain:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit
```

No upstream `3D_Converters` Python file was changed.

## 5. Corrected exact run

Corrected committed module blob:

```text
2f1a9cde4b00ccc25c10f2f89b06628d93aafba9
```

Authored test blob remains:

```text
ae0f81ed419a26401194abc11e5c78b79164f044
```

The exact local graph was re-admitted by Git-object SHA and executed unchanged.

Result:

```text
CII Workspace V14 canonical-delta projection: PASS
```

Classification:

```text
PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_29
```

## 6. What this proves

Within the projector scope:

- converter canonicalization in unchanged sections does not leak into final native V14 bytes;
- unauthorized changed sections remain blocked;
- RESTRAINT delete retains original V14 bytes for surviving 24-row blocks;
- duplicate unit identities remain blocked;
- retained-unit reordering is explicitly blocked;
- same-count cardinality-unit replacement is not eligible for fixed-row projection;
- non-isolated NODENAME cardinality remains blocked;
- MISCEL_1/HANGER cardinality remains unqualified and blocked;
- section-order drift and LF-only V14 material remain blocked.

## 7. Scope limit

This PASS does not qualify:

```text
full 12-file frozen-source authored test at current graph
browser/Pyodide runtime
W2.13 synthetic product
retained-real V11 product
real native V14 Writer2 bridge
repository npm/browser regressions
external CAESAR acceptance
```
