# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

```text
BASE_MAIN = 297fb37a0e894a3aac91de9188ebf30e810781fb
V11_ENGINEERING_AUTHORITY = CAESAR II 2019 / Version 11.0
V14_DIALECT_BRIDGE_SOURCE = reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
CURRENT_STAGE = W2.27 V14 CHANGE ISOLATION
PROGRAM_VERDICT = NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

The V14 bridge creates no new engineering semantics. It uses the frozen V11↔V14 converter only as a dialect adapter and differential oracle around the already-qualified V11 mutation domain.

## 1. Global invariants

V11 Writer2 invariants remain:

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

W2.27 V14 invariants:

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
HANGER/MISCEL cardinality remains unqualified/fail-closed
```

The prior whole-file `V14 -> V11 -> V14 == original bytes` gate is retired. Exact native benchmark evidence proves it is incompatible with the pinned converter's target-dialect formatting and therefore cannot be a valid admission requirement.

## 2. Binding Issue #1042

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically
CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  -> mutable only under qualified RESTRAINT cardinality authority
```

W2.11 P19 and W2.12 R09 remain mandatory negative-assurance anchors.

## 3. Exact native V14 benchmark falsifier

Pinned upstream archive:

```text
Benchmarks/v11-v14.zip
size = 10,740 bytes
Git blob = 8409e1c429665e34a83c2a464665ebf5d5f1b0a1
SHA-256 = da0b276c4c2f3a44c3dcd0a6cddd6ca9fcdfc44709caac7af61083b79bb7f808

SYS-0001-v14.CII
size = 168,574
SHA-256 = d2d4316309d9b1aa34b55ad72f89193fd0e437930db203fecd9ede00e69b2faf

SYS-0001-v11.cii
size = 316,571
SHA-256 = 41ef8912a55a978aa96b3300f42ba2ff335ba5bb35c4882f4012af0e011dc9cc
```

Concrete native row:

```text
V14 original RIGID value   2.044599E+02
V14 -> V11 renderer        204.460
V11 -> V14 renderer        2.044600E+02
```

26 of 43 native V14 `RIGID` rows show deterministic byte non-reversibility from the pinned formatter. This is not a lossy engineering-event claim; it is a physical-format fact that invalidates whole-file cross-version byte equality as an XML bridge admission rule.

Evidence: `docs/cii-writer2-v14-native-benchmark-change-isolation-2026-08-26.md`.

## 4. V14 change-isolation architecture

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
                                                             v
                                                project onto ORIGINAL V14
                                                             |
                                                             v
                                                projected V14 TARGET1
                                                             |
                                                  frozen V14->V11 proof
                                                             |
                                      must equal exact validated V11 TARGET1
```

Canonical V14 bytes are differential evidence only. They are never broad final-output authority.

## 5. Projection authority

Module:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema = CIIWorkspaceV14ChangeProjection.v2
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

Any changed section outside this list fails with `CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED`.

Qualified cardinality units:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit in V14
```

Duplicate canonical unit identities, misaligned unit counts, non-isolated cardinality runs, and unqualified cardinality sections fail closed. `MISCEL_1`/HANGER cardinality is intentionally not qualified yet.

## 6. Capability matrix

| Family / operation | Owner | V11 disposition | V14 disposition |
|---|---|---|---|
| NODENAME existing field update | Writer1C | DONE | change-isolated projection path; runtime pending |
| NODENAME row CREATE/DELETE + pointer reindex | Writer2 | DONE | 1-row projection implemented; runtime pending |
| SIF existing qualified ii/io update | Writer1C | DONE | change-isolated fixed-row projection; runtime pending |
| SIF block DELETE/compaction/reindex | Writer2 | DONE | 14-row projection implemented; runtime pending |
| SIF new block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| HANGER delete-all / partial | Writer2 | DONE / DONE_PRODUCT_ROUTED | cardinality projection NOT_QUALIFIED_FAIL_CLOSED |
| HANGER CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| RESTRAINT existing numeric/free-slot operations | Writer1A/1B | DONE | change-isolated fixed-row projection; runtime pending |
| RESTRAINT whole 24-row block DELETE | Writer2 | IMPLEMENTED_RUNTIME_PENDING | 24-row projection implemented; runtime pending |
| RESTRAINT new 24-row block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| node/element/connectivity topology | Writer3 | OUTSIDE_WRITER2 | OUTSIDE_WRITER2 |

## 7. Frozen converter custody

Exact upstream Git blobs remain unchanged:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

`FROZEN_SOURCE_CUSTODY = PASS_EXACT_BLOB_CUSTODY`.

W2.26 deployed-source Git-blob verification remains implemented but browser runtime is still `NOT_RUN`.

## 8. Runtime evidence

```text
W2.11 RESTRAINT physical runtime          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                             PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic Writer2 product           NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real V11 CII               NOT_RUN_ENVIRONMENT

frozen source Git-blob custody            PASS_EXACT_BLOB_CUSTODY
extracted converter+adapter runtime        PASS_RUNTIME_EXACT_SOURCE_EXCERPT_12_FALSIFIERS
V14 projection focused runtime            PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE
frozen-source authored JS test            NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test        NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real V14 change-isolated Writer2 path      NOT_RUN
browser V14 bridge                        NOT_RUN
external CAESAR V11 acceptance            NOT_RUN
repository npm                            NOT_RUN_ENVIRONMENT
```

Focused projection runtime exact blobs:

```text
module  0a04c75c2ed0880a815c17616a7c99afcde132c2
test    60f1586e5ac469988b59ede2b59258dcdc771e57
command node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js
result  PASS
```

This narrow PASS is not promoted to full bridge/product/browser qualification.

## 9. CREATE and structural boundaries

```text
SIF_CREATE        SOURCE_BLOCKED_REAFFIRMED_V11
HANGER_CREATE     SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT_CREATE  SOURCE_BLOCKED_REAFFIRMED_V11
Writer3 topology  OUTSIDE_WRITER2
UNKNOWN family    FAIL_CLOSED
```

The V14 bridge does not fill any V11 engineering-authority gap.

## 10. Remaining gates

```text
BRIDGE A  exact full repository graph: authored frozen-source + frozen-engine tests
W2 A      unchanged W2.13 synthetic product
W2 B      retained-real V11 RESTRAINT product
BRIDGE B  real/native V14 change-isolated Writer2 roundtrip + exact projected normalization proof
W2 C/D    inherited Writer2 + Writer1 adjacent + npm + browser/product regressions
W2 H      final READY/NOT_READY release-freeze verdict
EXTERNAL  actual CAESAR V11 import/use + save/re-export acceptance
```

## 11. Freeze rule

`READY_FOR_WRITER2_RELEASE_FREEZE` requires every source-qualified V11 Writer2 operation to be runtime-dispositioned, all V11 CREATE blockers explicit/fail-closed, every exposed V14 route to preserve original unrelated bytes through change-isolated projection, and final projected V14 normalization to reproduce the exact independently validated V11 Writer2 postimage. No lossy conversion, broad canonical V14 rewrite, unauthorized changed section, ambiguous physical unit, unqualified HANGER cardinality, malformed/missing converter testimony, text-based postimage authority, generic FUTURE_WRITER ambiguity, or Writer3 topology leakage is permitted.

External CAESAR import/save/re-export acceptance remains separately `NOT_RUN` until actually performed.
