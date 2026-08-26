# PR1055 work report — Writer2 program / CAESAR II V11↔V14 bridge

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_ISSUE: #1052
PROGRAM_ROADMAP: #1030
INHERITED_CONTROL_CORRECTION: #1042
PR: #1055
BRANCH: agent/cii-writer2-restraint-product-runtime-w218
BASE_MAIN: 297fb37a0e894a3aac91de9188ebf30e810781fb
CURRENT_STAGE: W2.29_V14_PROJECTION_UNIT_ORDER_HARDENED
PROGRAM_VERDICT: NOT_READY_FOR_WRITER2_RELEASE_FREEZE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
```

Owner direction remains binding:

```text
do not invent a new V14 neutral writer
reuse/copy/adapt CAESAR 11<->14 from reallaksh19/3D_Converters
do not alter the source repository
no GitHub Actions for qualification
```

## 1. Handover in 60 seconds

The bridge remains:

```text
ORIGINAL native V14
  -> frozen V14->V11 (allow_lossy=false)
  -> existing V11 Writer2 only
  -> independently validated exact V11 TARGET1 bytes
  -> frozen V11->V14 canonical modified V14

normalized V11 TARGET0
  -> frozen V11->V14 canonical baseline V14

canonical baseline vs modified
  -> isolate only Writer2-caused delta
  -> project delta onto ORIGINAL native V14 bytes
  -> projected V14 TARGET1
  -> frozen V14->V11
  -> MUST equal exact validated V11 TARGET1 bytes
```

Canonical V14 is differential evidence only; never broad final-output authority.

W2.29 found and fixed a projector authority gap: a unit reorder could be decomposed by LCS as delete+insert, and same-count cardinality changes bypassed unit custody through the fixed-row path. Both now fail closed.

## 2. Binding Issue #1042

```text
CONTROL row1 / field4 / I13 = NONAM
  preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  only qualified RESTRAINT cardinality mutation field
```

Mandatory falsifiers remain W2.11 P19 and W2.12 R09.

## 3. Frozen upstream authority

Pinned source:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

Exact frozen blobs:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

```text
SOURCE_REPOSITORY_MUTATION = NONE
FROZEN_PYTHON_MUTATION = NONE
FROZEN_SOURCE_CUSTODY = PASS_EXACT_BLOB_CUSTODY
```

## 4. Why whole-file V14 roundtrip equality is retired

Exact upstream benchmark archive:

```text
Benchmarks/v11-v14.zip
size      10,740 bytes
Git blob  8409e1c429665e34a83c2a464665ebf5d5f1b0a1
SHA-256   da0b276c4c2f3a44c3dcd0a6cddd6ca9fcdfc44709caac7af61083b79bb7f808
```

Concrete real row:

```text
V14 original    2.044599E+02
V14 -> V11      204.460
V11 -> V14      2.044600E+02
```

26/43 native V14 RIGID rows show this deterministic target-format canonicalization. Therefore:

```text
whole-file cross-version byte equality = RETIRED
semantic-equivalence-only custody       = REJECTED
replacement                             = ORIGINAL-BYTE CHANGE ISOLATION
```

## 5. V14 projection authority

Current module:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema CIIWorkspaceV14ChangeProjection.v2
blob   2f1a9cde4b00ccc25c10f2f89b06628d93aafba9
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

Qualified cardinality units:

```text
NODENAME   1 row/unit
RESTRANT  24 rows/unit
SIF&TEES  14 rows/unit
```

Fail-closed conditions now include:

```text
unlisted changed section
  CII_V14_PROJECTION_CHANGED_SECTION_NOT_AUTHORIZED

duplicate unit identity
  CII_V14_PROJECTION_AMBIGUOUS_DUPLICATE_UNIT

non-isolated replacement
  CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN

retained-unit reorder
  CII_V14_PROJECTION_UNIT_REORDER_NOT_AUTHORIZED

same-count cardinality-unit replacement
  CII_V14_PROJECTION_EQUAL_CARDINALITY_UNIT_REPLACEMENT_NOT_AUTHORIZED

HANGER/MISCEL cardinality
  CII_V14_PROJECTION_CARDINALITY_SECTION_NOT_QUALIFIED
```

## 6. W2.29 exact projector runtime

Evidence:

```text
docs/cii-writer2-v14-projection-unit-order-runtime-2026-08-26.md
```

First exact graph:

```text
module  6b83e85ff0229e9c6bbe3363beedbe5843d8c2d9
test    ae0f81ed419a26401194abc11e5c78b79164f044
```

Both local files were independently Git-object SHA admitted before execution.

First result:

```text
FAIL
expected reorder blocker
received CII_V14_PROJECTION_ROW_WIDTH_MISMATCH:RESTRANT:0
```

This proved same-count RESTRANT changes were bypassing cardinality semantics.

Correction:

```text
changed equal-cardinality payload in a cardinality-qualified section
  -> never use fixed-row mutation authority
  -> group by physical units
  -> unique identities required
  -> all common units must remain ordered
  -> reorder or replacement blocks
```

Corrected exact graph:

```text
module  2f1a9cde4b00ccc25c10f2f89b06628d93aafba9
test    ae0f81ed419a26401194abc11e5c78b79164f044
command node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js
result  PASS
class   PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE_W2_29
```

No frozen upstream file changed.

## 7. Other runtime evidence

```text
W2.11 RESTRAINT physical DELETE          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                            PASS_RUNTIME_EXACT_BLOB

frozen-engine authored Python test       PASS_RUNTIME_EXACT_SEVEN_FILE_BLOB_GRAPH
  corrected test blob                    43721ed3f2c990080945afa2a8a3702dbb021eb4
  result                                 6/6 PASS

frozen-source authored JS last executed  PASS_RUNTIME_EXACT_TWELVE_FILE_BLOB_GRAPH_NODE_ESM_MODE
  executed test blob                     18433c7664428a02bea97625ce6bdc3c21bd8365

current frozen-source authored JS        NOT_RUN_AFTER_W2_29_ASSERTION_STRENGTHENING
  current test blob                      db29b87f367f7e8c00939b32a7586d8d43ea5bf1

W2.13 synthetic product                  NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
  test blob                              9922377ddeda86fc9167d65f33c97095346e79fa

W2.13 retained-real V11 product          NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
  test blob                              c341b99e2786b0034ef672b4efb03d167d9ad26c

real V14 change-isolated Writer2 path    NOT_RUN
browser/Pyodide bridge                   NOT_RUN
repository npm                           NOT_RUN_ENVIRONMENT
external CAESAR acceptance               NOT_RUN
```

Both W2.13 entrypoints statically import `cii-workspace-core.js`, which immediately expands into the full Workspace intake/topology/correspondence/Writer1/Writer2 validation graph. The current environment cannot clone/materialize that graph. No stub, import rewrite, or partial-core substitute is authorized.

## 8. V11 engineering authority remains unchanged

```text
NODENAME CREATE/DELETE              DONE
SIF existing V11 block DELETE       DONE
HANGER delete-all/partial DELETE    DONE / PRODUCT_ROUTED
RESTRAINT V11 block DELETE          IMPLEMENTED / FULL-WORKSPACE RUNTIME PENDING

SIF V11 CREATE                      SOURCE_BLOCKED_REAFFIRMED_V11
HANGER V11 CREATE                   SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT V11 CREATE                SOURCE_BLOCKED_REAFFIRMED_V11
Writer3 topology                    OUTSIDE_WRITER2
```

V14 transport does not fill any V11 CREATE authority gap.

## 9. Negative assurance

```text
source 3D_Converters modified                   FALSE
frozen Python modified                          FALSE
allow_lossy enabled                             FALSE
V11 core writer modified                        FALSE
live V14 UI auto-routing modified               FALSE
Writer3/topology implementation modified        FALSE
workflow path introduced                        FALSE
canonical whole V14 used as final output        FALSE
unauthorized changed V14 section projected      FALSE
retained cardinality unit reorder permitted     FALSE
equal-cardinality unit replacement permitted    FALSE
HANGER cardinality claimed V14-qualified        FALSE
v11Result.text used as physical authority       FALSE
current source test promoted without rerun       FALSE
NOT_RUN promoted to PASS                        FALSE
```

## 10. Exact changed-file ledger

Expected PR diff is exactly 25 paths:

```text
agents/PR1055_workreport.md
agents/claims/PR1055.yaml
agents/status/PR1055.yaml
converters/cii-v11-v14-writer-worker.js
converters/scripts/cii-v11-v14-upstream/UPSTREAM.md
converters/scripts/cii-v11-v14-upstream/cii2019_section_rules.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_format.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_records.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_sif.py
converters/scripts/cii-v11-v14-upstream/cii_v11_v14_validate.py
docs/cii-writer2-create-source-refresh-2026-08-25.md
docs/cii-writer2-release-freeze-matrix.md
docs/cii-writer2-v11-v14-frozen-engine-runtime-2026-08-26.md
docs/cii-writer2-v11-v14-frozen-source-runtime-2026-08-26.md
docs/cii-writer2-v11-v14-local-excerpt-runtime-2026-08-25.md
docs/cii-writer2-v11-v14-lossless-bridge.md
docs/cii-writer2-v14-native-benchmark-change-isolation-2026-08-26.md
docs/cii-writer2-v14-projection-unit-order-runtime-2026-08-26.md
tabs/cii-workspace/cii-workspace-v11-v14-converter.js
tabs/cii-workspace/cii-workspace-v14-change-projection.js
tabs/cii-workspace/cii-workspace-writer-version-bridge.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v14-change-projection.test.js
```

No unexplained path is authorized.

## 11. Remaining gates

```text
W2 A
  unchanged W2.13 synthetic product on exact full Workspace graph

W2 B
  retained-real V11 RESTRAINT product on exact full Workspace graph

BRIDGE B
  real/native V14 -> V11 -> Writer2 -> canonical delta -> original-byte projection
  projected V14 -> V11 == exact validated V11 Writer2 postimage

W2 C/D
  inherited Writer2 regressions
  Writer1 adjacent regressions
  repository npm
  browser/product qualification

W2 H
  final READY/NOT_READY release-freeze verdict

EXTERNAL
  actual CAESAR V11 import/use + save/re-export acceptance
```

Current frozen-source test `db29b87f...` also requires a fresh exact 12-file run before current-blob PASS.

## Appendix A — takeover gate

A1. State the Issue #1042 NONAM vs RESTRAINT CONTROL-field correction exactly.

A2. State the pinned `3D_Converters` commit and six frozen blob SHAs.

A3. Explain why whole-file V14→V11→V14 byte equality was retired.

A4. Trace ORIGINAL V14 through normalized V11 Writer2, canonical baseline/modified V14, change projection, and final downgrade proof.

A5. State the changed-section allowlist and cardinality unit sizes.

A6. Explain why unique unit identities alone were insufficient before W2.29.

A7. Show how `A,B -> B,A` could be decomposed by LCS and why that is not Writer2 compaction authority.

A8. State the two W2.29 blockers for retained-unit reorder and same-count unit replacement.

A9. Distinguish W2.29 two-file projector PASS from full bridge/product/browser qualification.

A10. Explain why W2.13 cannot be called PASS until the exact full `cii-workspace-core.js` dependency graph executes unchanged.

## EXACT NEXT ACTION

If exact full Workspace checkout becomes executable, run unchanged:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
node tests/cii-workspace-writer2-restraint-product-real-cii.test.js
```

Then execute the real native V14 change-isolated Writer2 proof. Do not modify frozen Python, do not enable lossy conversion, do not enable live V14 UI routing, and do not merge without fresh owner authorization.
