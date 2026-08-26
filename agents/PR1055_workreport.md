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
CURRENT_STAGE: W2.27_V14_CHANGE_ISOLATION_RUNTIME_CLOSURE_PENDING
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

W2.26 froze the frozen-source/Pyodide custody architecture. W2.27 corrected one bridge-policy defect using the exact native upstream V11/V14 benchmark.

The former XML admission rule requiring whole-file `V14 -> V11 -> V14 == original V14 bytes` is invalid for the pinned converter. The native benchmark proves target-dialect formatting is intentionally not byte-reversible. The bridge now preserves **original native V14 bytes** and uses the canonical V14 baseline/modified pair only to isolate the Writer2 delta.

Final V14 authority is:

```text
ORIGINAL V14 + isolated canonical Writer2 delta
```

and the final projected V14 must downgrade exactly to the independently validated V11 Writer2 postimage.

Do not restore the retired whole-file equality rule and do not weaken this to generic semantic equivalence.

## 2. Binding #1042

```text
CONTROL row1 / field4 / I13 = NONAM
  preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  only qualified RESTRAINT cardinality mutation field
```

Mandatory falsifiers: W2.11 P19 and W2.12 R09.

## 3. Frozen upstream custody

Pinned source:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

Exact Git blobs:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

```text
FROZEN_SOURCE_CUSTODY = PASS_EXACT_BLOB_CUSTODY
SOURCE_REPOSITORY_MUTATION = NONE
```

W2.26 runtime deployment custody remains: fetch exact bytes, construct Git object bytes `blob <length>\0<bytes>`, SHA-1 them, require pinned blob identity, then write the same verified bytes directly to Pyodide. Browser execution remains `NOT_RUN`.

## 4. Exact native benchmark — W2.27 policy falsifier

Exact recovered upstream archive:

```text
Benchmarks/v11-v14.zip
size = 10,740 bytes
Git blob = 8409e1c429665e34a83c2a464665ebf5d5f1b0a1
SHA-256 = da0b276c4c2f3a44c3dcd0a6cddd6ca9fcdfc44709caac7af61083b79bb7f808
```

Members:

```text
SYS-0001-v14.CII
  168,574 bytes
  SHA-256 d2d4316309d9b1aa34b55ad72f89193fd0e437930db203fecd9ede00e69b2faf

SYS-0001-v11.cii
  316,571 bytes
  SHA-256 41ef8912a55a978aa96b3300f42ba2ff335ba5bb35c4882f4012af0e011dc9cc
```

Concrete native falsifier:

```text
V14 original RIGID[0]     2.044599E+02 0.000000E+00
pinned V14 -> V11         204.460      0.000000
pinned V11 -> V14         2.044600E+02 0.000000E+00
```

26/43 actual V14 `RIGID` rows show this deterministic byte non-reversibility. This is target-dialect formatting, not evidence of a lossy engineering conversion event.

Decision:

```text
DEC-W2.27-01
whole-file cross-version byte-equality admission = RETIRED
semantic-equivalence-only replacement            = REJECTED
replacement                                      = ORIGINAL-BYTE CHANGE ISOLATION
```

Evidence: `docs/cii-writer2-v14-native-benchmark-change-isolation-2026-08-26.md`.

## 5. Current bridge architecture

```text
V14 TARGET0
  -> original V14 SHA custody
  -> frozen V14->V11, allow_lossy=false
  -> normalized V11 TARGET0 + SHA
  -> frozen V11->V14 canonical baseline + SHA
  -> workspace intake SHA == normalized V11 SHA
  -> existing V11 Writer2
  -> independent V11 postimage validation
  -> authoritative Writer2 byteString / V11 TARGET1
  -> frozen V11->V14 canonical modified V14
  -> canonical modified V14 -> V11 must equal exact V11 TARGET1
  -> diff canonical baseline vs canonical modified
  -> project only that delta onto ORIGINAL V14 bytes
  -> projected V14 TARGET1
  -> projected V14 -> V11 must equal exact V11 TARGET1
  -> projected V14 is final output
```

Canonical V14 output is never broad final-output authority.

## 6. V14 projection authority

Module:

```text
tabs/cii-workspace/cii-workspace-v14-change-projection.js
schema CIIWorkspaceV14ChangeProjection.v2
```

Only these changed sections may project:

```text
CONTROL
ELEMENTS
NODENAME
RESTRANT
SIF&TEES
MISCEL_1
```

Any other changed section fails closed.

Qualified cardinality units:

```text
NODENAME   1 row
RESTRANT  24 rows
SIF&TEES  14 rows in V14
```

Duplicate unit identities, unit misalignment and non-isolated cardinality runs fail closed. `MISCEL_1`/HANGER cardinality has no qualified V14 unit model and therefore blocks.

## 7. V11 engineering authority remains unchanged

```text
NODENAME CREATE/DELETE              DONE
SIF existing V11 block DELETE       DONE
HANGER delete-all/partial DELETE    DONE / PRODUCT_ROUTED
RESTRAINT V11 block DELETE          IMPLEMENTED / PRODUCT RUNTIME PENDING

SIF V11 CREATE                      SOURCE_BLOCKED_REAFFIRMED_V11
HANGER V11 CREATE                   SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT V11 CREATE                SOURCE_BLOCKED_REAFFIRMED_V11
Writer3 topology                    OUTSIDE_WRITER2
```

The V14 converter/projector does not fill any V11 CREATE authority gap.

## 8. W2.27 focused runtime evidence

The projection test has a bounded two-file graph: exact authored test + exact projection module. Both were materialized from the current PR and their Git-object identities independently rechecked before execution.

```text
projection module blob
  0a04c75c2ed0880a815c17616a7c99afcde132c2

projection test blob
  60f1586e5ac469988b59ede2b59258dcdc771e57

command
  node --experimental-default-type=module tests/cii-workspace-v14-change-projection.test.js

result
  PASS
```

The authored assertions cover:

```text
canonical formatting drift does not leak into unchanged native V14 bytes
qualified CONTROL fixed-row mutation projects
changed RIGID section is rejected as unauthorized
RESTRAINT DELETE uses 24-row units
retained RESTRAINT blocks come from original V14 coordinates
duplicate unit identities fail closed
non-isolated NODENAME cardinality fails closed
MISCEL_1/HANGER cardinality fails closed
section-order drift fails closed
LF-only V14 input fails closed
```

Classification:

```text
PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE
```

Limitation: this does **not** qualify the full bridge, Pyodide worker, W2.13 product path, real native V14 mutation, browser path or repository regression suite.

## 9. Current runtime truth

```text
W2.11 RESTRAINT physical DELETE          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                            PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product                  NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real-V11-CII              NOT_RUN_ENVIRONMENT

frozen source repository custody         PASS_EXACT_BLOB_CUSTODY
runtime deployment blob gate             IMPLEMENTED_NOT_RUN_BROWSER
extracted converter/adapter slice         PASS_RUNTIME_EXACT_SOURCE_EXCERPT_12_FALSIFIERS
V14 projection focused runtime           PASS_RUNTIME_EXACT_TWO_FILE_BLOB_GRAPH_NODE_ESM_MODE
frozen-source authored JS test           NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test       NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real V14 change-isolated Writer2 path    NOT_RUN
browser/product V14 bridge               NOT_RUN
external CAESAR V11 acceptance           NOT_RUN
repository npm                           NOT_RUN_ENVIRONMENT

engineering failure                      NONE_OBSERVED
```

## 10. Negative assurance

```text
source 3D_Converters modified                   FALSE
frozen Python modified                          FALSE
allow_lossy enabled                             FALSE
V11 core writer modified                        FALSE
live V14 UI auto-routing modified               FALSE
Writer3/topology path modified                  FALSE
workflow path introduced                        FALSE
canonical whole V14 used as final output        FALSE
unauthorized changed V14 section projected      FALSE
HANGER cardinality claimed V14-qualified        FALSE
v11Result.text used as physical authority       FALSE
NOT_RUN promoted to PASS                        FALSE
```

## 11. Changed-file ledger

Expected PR diff is now exactly 22 paths:

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
docs/cii-writer2-v11-v14-local-excerpt-runtime-2026-08-25.md
docs/cii-writer2-v11-v14-lossless-bridge.md
docs/cii-writer2-v14-native-benchmark-change-isolation-2026-08-26.md
tabs/cii-workspace/cii-workspace-v11-v14-converter.js
tabs/cii-workspace/cii-workspace-v14-change-projection.js
tabs/cii-workspace/cii-workspace-writer-version-bridge.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v14-change-projection.test.js
```

No unexplained path is authorized.

## 12. Coordination state

`agents/MASTER_INDEX.md` was inspected. It remains an older repository-wide snapshot and does not currently enumerate PR1055. Active historical qualification PRs PR1033/PR1039 remain source-authority workstreams; PR1055 does not widen their CREATE authority. No new file overlap or authority collision was introduced in W2.27.

```text
COORDINATION_CLASSIFICATION = SAFE_WITH_EXISTING_AUTHORITY_BOUNDARIES
```

## 13. Remaining gates

```text
BRIDGE A
  exact full repository module graph
  run unchanged frozen-source JS test
  run unchanged frozen-engine Python test

W2 A
  unchanged W2.13 synthetic product

W2 B
  retained-real V11 RESTRAINT product

BRIDGE B
  real/native V14 -> V11 -> Writer2 -> canonical V14 delta -> original-byte projection
  final projected V14 -> V11 == exact validated V11 Writer2 postimage

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

## Appendix A — takeover gate

A1. State #1042 exactly and identify the two CONTROL fields.

A2. State the pinned upstream commit and six Git blob SHAs.

A3. Explain why the native V14 `RIGID` value `2.044599E+02` falsifies whole-file cross-version byte equality.

A4. Explain why generic semantic equivalence is also insufficient for Writer2 unrelated-byte custody.

A5. Trace original V14 through normalized V11 Writer2, canonical baseline/modified V14, delta projection and final downgrade proof.

A6. Explain why canonical V14 bytes are differential evidence only, not final-output authority.

A7. State the V14 changed-section allowlist and why an unexpected RIGID/UNITS/COORDS delta must block.

A8. State the qualified V14 cardinality units: NODENAME=1, RESTRANT=24, SIF&TEES=14.

A9. Explain why duplicate unit identities block original-coordinate projection.

A10. Explain why HANGER/MISCEL cardinality remains blocked for V14.

A11. Explain why `allow_lossy=false` remains mandatory.

A12. Explain why `v11Result.byteString`, not `v11Result.text`, is the cross-boundary physical authority.

A13. Distinguish the focused two-file projection PASS from full bridge/product/browser qualification.

## EXACT NEXT ACTION

Acquire an exact full repository executable graph and run unchanged:

```text
node tests/cii-workspace-v11-v14-frozen-source.test.js
python tests/cii-workspace-v11-v14-frozen-engine.test.py
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

Then execute retained-real V11 RESTRAINT and the real native V14 change-isolated Writer2 proof. Do not alter frozen Python, do not enable lossy conversion, do not enable live V14 UI routing, and do not merge without fresh owner authorization.
