# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

```text
BASE_MAIN = 297fb37a0e894a3aac91de9188ebf30e810781fb
V11_ENGINEERING_AUTHORITY = CAESAR II 2019 / Version 11.0
V14_DIALECT_BRIDGE_SOURCE = reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
CURRENT_STAGE = W2.29 V14 PROJECTION UNIT-ORDER + MISCEL HARDENED
PROGRAM_VERDICT = NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

The V14 bridge creates no new engineering semantics. The frozen upstream V11↔V14 implementation is a dialect adapter and differential oracle around the existing V11 Writer2 authority.

## 1. Global invariants

```text
one untouched writer-domain TARGET0
canonical BOUND APPLY / EXCLUDE scope
cryptographic target custody
original-coordinate claim arbitration
no last-writer-wins
one final V11 splice pass
independent complete V11 postimage oracle
no fabricated authority
no unexecuted test represented as PASS
no Writer3 topology leakage
```

V14 invariants:

```text
frozen pinned 3D_Converters source only
allow_lossy = false
original V14 SHA retained
normalized V11 SHA retained
canonical baseline V14 SHA retained
workspace intake SHA == normalized V11 SHA
existing V11 Writer2 only
V11 Writer2 authoritative byteString required
canonical modified V14 must downgrade exactly to Writer2 V11 TARGET1
final V14 output = ORIGINAL V14 bytes + isolated canonical Writer2 delta
final projected V14 must downgrade exactly to Writer2 V11 TARGET1
unchanged V14 sections copied from ORIGINAL, never canonical output
changed section must be explicitly projectable
cardinality changes use qualified physical units only
duplicate physical-unit identities fail closed
retained physical-unit order must be preserved
same-count cardinality-unit replacement is not fixed-row authority
MISCEL_1/HANGER has no V14 projection authority
```

The prior whole-file `V14 -> V11 -> V14 == original bytes` gate remains retired by exact native benchmark evidence.

## 2. Binding Issue #1042

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically
CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  -> mutable only under qualified RESTRAINT cardinality authority
```

W2.11 P19 and W2.12 R09 remain mandatory negative-assurance anchors.

## 3. V14 change-isolation architecture

```text
ORIGINAL V14 TARGET0
   |
   +--> frozen V14->V11 --> normalized V11 TARGET0 --> existing Writer2 --> validated V11 TARGET1
   |
   +--> normalized V11 TARGET0 --> frozen V11->V14 --> canonical baseline V14
                                    validated V11 TARGET1 --> frozen V11->V14 --> canonical modified V14
                                                             |
                                           canonical baseline -> modified delta
                                                             |
                                                project onto ORIGINAL V14
                                                             |
                                                projected V14 TARGET1
                                                             |
                                                  frozen V14->V11 proof
                                                             |
                                      must equal exact validated V11 TARGET1
```

Canonical V14 is differential evidence only and never broad final-output authority.

## 4. Projection authority — W2.29 final

```text
module = tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema = CIIWorkspaceV14ChangeProjection.v2
current blob = 0a16b1383da6ef58abf55c53a91711a0a1f21c17
```

Projectable changed sections are exactly:

```text
CONTROL
ELEMENTS
NODENAME
RESTRANT
SIF&TEES
```

`MISCEL_1` is not projectable. Any V14 HANGER/MISCEL change fails as an unauthorized changed section.

Qualified cardinality units:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit
```

Fail-closed rules include:

```text
changed section outside allowlist
  -> CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED

duplicate unit identity
  -> CII_V14_PROJECTION_AMBIGUOUS_DUPLICATE_UNIT

non-isolated delete+insert replacement
  -> CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN

retained unit reorder
  -> CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED

same-count cardinality-unit replacement
  -> CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED

MISCEL_1 / HANGER change
  -> CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED:MISCEL_1
```

### W2.29 defect chain

Source audit found three gaps:

```text
1. unique-unit LCS could reinterpret A,B -> B,A as delete+insert
2. equal-cardinality qualified sections bypassed unit custody through fixed-row mutation
3. MISCEL_1 remained projectable despite no qualified V14 HANGER packing authority
```

First exact graph:

```text
module  6b83e85ff0229e9c6bbe3363beedbe5843d8c2d9
test    ae0f81ed419a26401194abc11e5c78b79164f044
result  FAIL
actual  CII_V14_PROJECTION_ROW_WIDTH_MISMATCH:RESTRANT:0
```

Intermediate correction:

```text
module  2f1a9cde4b00ccc25c10f2f89b06628d93aafba9
test    ae0f81ed419a26401194abc11e5c78b79164f044
result  PASS
```

Final MISCEL-tightened committed graph:

```text
module  0a16b1383da6ef58abf55c53a91711a0a1f21c17
test    586d6be0537162100979df63f56146db9d64c0e5
command node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js
result  PASS
class   PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_29_FINAL
```

Evidence: `docs/cii-writer2-v14-projection-unit-order-runtime-2026-08-26.md`.

## 5. Capability matrix

| Family / operation | Owner | V11 disposition | V14 disposition |
|---|---|---|---|
| NODENAME row CREATE/DELETE + pointer reindex | Writer2 | DONE | 1-row projection implemented; full bridge runtime pending |
| SIF block DELETE/compaction/reindex | Writer2 | DONE | 14-row projection implemented; full bridge runtime pending |
| SIF new block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| HANGER delete-all / partial | Writer2 | DONE / DONE_PRODUCT_ROUTED | V14 projection NOT_AUTHORIZED_FAIL_CLOSED |
| HANGER CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| RESTRAINT whole 24-row block DELETE | Writer2 | IMPLEMENTED_RUNTIME_PENDING | 24-row projection implemented; full bridge runtime pending |
| RESTRAINT new 24-row block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| node/element/connectivity topology | Writer3 | OUTSIDE_WRITER2 | OUTSIDE_WRITER2 |

Equal-cardinality existing-field operations remain owned by Writer1A/B/C and are not promoted into Writer2 V14 cardinality authority.

## 6. Frozen converter custody

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

`FROZEN_SOURCE_CUSTODY = PASS_EXACT_BLOB_CUSTODY`. No upstream source was altered.

## 7. Runtime evidence

```text
W2.11 RESTRAINT physical runtime          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                             PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic Writer2 product           NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real V11 CII               NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT

frozen source Git-blob custody            PASS_EXACT_BLOB_CUSTODY
extracted converter+adapter runtime        PASS_RUNTIME_EXACT_SOURCE_EXCERPT_12_FALSIFIERS
frozen-engine authored Python test        PASS_RUNTIME_EXACT_SEVEN_FILE_BLOB_GRAPH
frozen-source authored JS @18433c...      PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
current frozen-source JS @095ddb...       NOT_RUN_AFTER_W2_29_MISCEL_ASSERTION_STRENGTHENING
V14 projector final W2.29 exact graph      PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_29_FINAL
real V14 change-isolated Writer2 path      NOT_RUN
browser V14 bridge                        NOT_RUN
external CAESAR V11 acceptance            NOT_RUN
repository npm                            NOT_RUN_ENVIRONMENT
```

W2.13 exact entrypoints:

```text
synthetic product  9922377ddeda86fc9167d65f33c97095346e79fa
retained-real V11  c341b99e2786b0034ef672b4efb03d167d9ad26c
```

Both statically import `cii-workspace-core.js`, which expands into the full Workspace intake/topology/correspondence/Writer1/Writer2 graph. The current environment cannot clone/materialize that exact graph. No stubs, import rewrites, or partial-core substitutes are authorized.

## 8. CREATE and structural boundaries

```text
SIF_CREATE        SOURCE_BLOCKED_REAFFIRMED_V11
HANGER_CREATE     SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT_CREATE  SOURCE_BLOCKED_REAFFIRMED_V11
Writer3 topology  OUTSIDE_WRITER2
UNKNOWN family    FAIL_CLOSED
```

## 9. Remaining gates

```text
W2 A      unchanged W2.13 synthetic product on exact full Workspace graph
W2 B      retained-real V11 RESTRAINT product on exact full Workspace graph
BRIDGE B  real/native V14 change-isolated Writer2 + exact projected normalization proof
W2 C/D    inherited Writer2 + Writer1 adjacent + npm + browser/product regressions
W2 H      final READY/NOT_READY release-freeze verdict
EXTERNAL  actual CAESAR V11 import/use + save/re-export acceptance
```

Current strengthened frozen-source test blob `095ddb65d51b3f3dda577a0db2c9d091e580dc5b` also requires a fresh exact 12-file run before current-blob PASS.

Native checkout remains unavailable (`Could not resolve host: github.com`). GitHub Actions are not authorized for qualification.

## 10. Freeze rule

`READY_FOR_WRITER2_RELEASE_FREEZE` requires every source-qualified V11 Writer2 operation to be runtime-dispositioned, all V11 CREATE blockers explicit/fail-closed, every exposed V14 route to preserve original unrelated bytes through change-isolated projection, retained physical unit order preserved, and final projected V14 normalization to reproduce the exact independently validated V11 Writer2 postimage. No lossy conversion, broad canonical V14 rewrite, unauthorized changed section, ambiguous unit, retained-unit reorder, same-count unit replacement, MISCEL/HANGER projection, malformed/missing converter testimony, text-based postimage authority, or Writer3 topology leakage is permitted.
