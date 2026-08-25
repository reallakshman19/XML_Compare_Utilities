# PR1055 work report — Writer2 program / CAESAR II v11-v14 bridge

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
CURRENT_STAGE: W2.19_FROZEN_3D_CONVERTERS_V11_V14_BRIDGE_HARDENING
PROGRAM_VERDICT: NOT_READY_FOR_WRITER2_RELEASE_FREEZE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
```

Owner direction is binding:

```text
do not invent a new V14 neutral writer
reuse/copy/adapt CAESAR 11<->14 from reallaksh19/3D_Converters
do not alter the source repository
no GitHub Actions for qualification
```

## 1. Binding Issue #1042

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  -> only qualified RESTRAINT cardinality mutation field
```

W2.11 P19 and W2.12 R09 remain mandatory falsifiers. Any RESTRAINT cardinality result changing row1/field4 is an engineering failure even if reparsing succeeds.

## 2. Frozen `3D_Converters` source custody — PASS

Pinned source:

```text
repository  reallaksh19/3D_Converters
commit      ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

Frozen target directory:

```text
converters/scripts/cii-v11-v14-upstream/
```

Current target copies were re-compared directly with pinned upstream and all Git blob SHAs match:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

Disposition:

```text
FROZEN_SOURCE_CUSTODY = PASS_EXACT_BLOB_CUSTODY
SOURCE_REPOSITORY_MUTATION = NONE
```

The pre-existing XML `converters/scripts/cii2019_section_rules.py` has a different blob and is not substituted. The frozen converter loads its own isolated upstream dependency.

## 3. V11 engineering authority remains unchanged

The version bridge is dialect transport only. It does not widen Writer2 engineering semantics.

```text
NODENAME CREATE/DELETE             DONE
SIF existing V11 block DELETE      DONE
HANGER delete-all/partial DELETE   DONE / PRODUCT_ROUTED
RESTRAINT V11 block DELETE         IMPLEMENTED / PRODUCT RUNTIME PENDING

SIF V11 CREATE                     SOURCE_BLOCKED_REAFFIRMED_V11
HANGER V11 CREATE                  SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT V11 CREATE               SOURCE_BLOCKED_REAFFIRMED_V11
Writer3 topology                   OUTSIDE_WRITER2
```

Canonical V11 CREATE source record:

```text
docs/cii-writer2-create-source-refresh-2026-08-25.md
```

## 4. V14 architecture — reuse, not reinvention

```text
V11 TARGET
  -> existing qualified V11 Writer2 directly

V14 TARGET
  -> frozen 3D_Converters V14 -> V11
       allow_lossy = false
  -> exact untouched V14 -> V11 -> V14 byte admission gate
  -> existing V11 Writer2
  -> existing V11 complete postimage validation
  -> frozen 3D_Converters V11 -> V14
       allow_lossy = false
  -> exact modified V11 -> V14 -> V11 byte proof
  -> V14 output
```

The exact cross-version byte gates are an XML Writer2 restriction. The generic upstream converter may canonicalize dialect formatting; Writer2 refuses any V14 model where that would rewrite unrelated physical bytes.

Live UI automatic routing remains disabled until real bridge qualification passes.

## 5. Integration modules

```text
converters/cii-v11-v14-writer-worker.js
  browser/Pyodide transport only
  frozen source loaded from isolated upstream directory

tabs/cii-workspace/cii-workspace-v11-v14-converter.js
  physical version gate
  worker lifecycle
  independent SHA custody
  lossless conversion client
  exact byte helpers

tabs/cii-workspace/cii-workspace-writer-version-bridge.js
  SOURCE/TARGET normalization
  target baseline exact-roundtrip gate
  stale original V14 custody
  existing V11 Writer2 invocation
  exact V11 postimage custody
  V14 restoration
  modified exact-roundtrip proof
```

Current V11 core Writer implementation:

```text
UNCHANGED
```

## 6. Adapter defects found and fixed in this checkpoint

### A. Pyodide job directory leak

Former behavior attempted `rmdir(jobDir)` while input/output/audit files still existed and silently swallowed the failure.

Current behavior:

```text
unlink input
unlink output
unlink audit
rmdir job directory
```

Empty input is rejected before job-directory allocation.

### B. Missing independent physical VERSION checks

Former client trusted converter audit version fields and rounded the physical version token.

Current gates:

```text
physical source VERSION independently parsed
only integral major 11 or 14 admitted
11.4 cannot alias to 11
audit.source_version must equal physical source
audit.target_version must equal requested target
physical output VERSION must equal requested target
```

### C. Converter audit SHA was a shared-cause custody dependency

Current client independently calculates SHA-256 for input and output bytes and requires agreement with converter audit:

```text
CII_VERSION_BRIDGE_SOURCE_SHA256_AUDIT_MISMATCH
CII_VERSION_BRIDGE_TARGET_SHA256_AUDIT_MISMATCH
```

The V14 preview/stale-target path stores and compares the independent JS source SHA, not `audit.source_sha256`.

### D. V14 restoration used Writer2 text instead of authoritative bytes

Current V14 restoration requires:

```text
v11Result.byteString
  -> exact byte reconstruction
  -> frozen V11->V14 conversion
```

It also requires:

```text
independent converter source SHA == v11Result.modifiedTargetSha256
```

before V14 conversion is accepted.

Then:

```text
V14 -> V11 proof bytes == exact Writer2 V11 postimage bytes
```

No `v11Result.text` is used as mutation authority.

### E. Worker pending-job lifecycle

Current client:

```text
messageerror -> reject all pending + terminate/reset worker
worker error -> reject all pending + terminate/reset worker
postMessage throw -> delete that pending job + reject immediately
```

## 7. Authored bridge falsifiers

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
```

The static test now falsifies:

```text
frozen Git blob drift
local dependency substitution
wrong frozen worker source root
job-file cleanup regression
empty-input directory allocation
physical source/output VERSION gate regression
non-integral VERSION aliasing
independent SHA custody removal
stale V14 target reverting to converter audit SHA
Writer2 byteString custody removal
V11 postimage SHA gate removal
modified proof comparing text instead of exact bytes
messageerror/pending-job lifecycle regression
lossy bridge activation
```

The Python test retains high-risk frozen-engine semantic falsifiers.

These authored tests remain `NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH` in the present environment.

## 8. Executed local extracted-source evidence

Evidence:

```text
docs/cii-writer2-v11-v14-local-excerpt-runtime-2026-08-25.md
```

Executed exact-source-excerpt falsifiers:

```text
VERSION 11 admitted                               PASS
VERSION 14 admitted                               PASS
VERSION 12 rejected                               PASS
V14 SIF item15/item16 axial/torsion swap          PASS
non-zero V14 SIF item27 rejected                  PASS
ambiguous non-zero V11 SIF item19 rejected        PASS
V14 empty restraint stiffness -> V11 sentinel     PASS
non-zero V14 ALLOWBLS item154 rejected            PASS
```

Classification:

```text
PASS_RUNTIME_EXACT_SOURCE_EXCERPT
```

This is not promoted to full-engine, authored-test, product, or release PASS.

## 9. Current runtime truth

```text
W2.11 RESTRAINT physical DELETE          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                            PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product                  NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real-V11-CII              NOT_RUN_ENVIRONMENT

frozen source custody                    PASS_EXACT_BLOB_CUSTODY
extracted converter semantic slice       PASS_RUNTIME_EXACT_SOURCE_EXCERPT
frozen-source authored JS test           NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test       NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real V14 baseline exact roundtrip         NOT_RUN
real V14 Writer2 modified roundtrip        NOT_RUN
browser/product V14 bridge                 NOT_RUN
repository npm                              NOT_RUN_ENVIRONMENT

engineering failure                        NONE_OBSERVED
```

Environment limitation remains:

```text
native git checkout -> DNS failure
direct GitHub archive route -> connector endpoint not supported
GitHub Actions -> not authorized
```

No alternate route is represented as an exact checkout.

## 10. No-Actions rule

The temporary bridge workflow was removed. Current PR diff contains no workflow file.

```text
GITHUB_ACTIONS_AUTHORIZED = FALSE
WORKFLOW_RESULT_USED_AS_EVIDENCE = FALSE
```

## 11. Changed-file ledger

Expected PR diff remains exactly 19 paths:

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
tabs/cii-workspace/cii-workspace-v11-v14-converter.js
tabs/cii-workspace/cii-workspace-writer-version-bridge.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
tests/cii-workspace-v11-v14-frozen-source.test.js
```

No unexplained path is authorized.

## 12. Remaining gates

```text
BRIDGE A
  exact repository module graph
  run authored frozen-source JS test
  run authored frozen-engine Python test

W2 A
  unchanged W2.13 synthetic product

W2 B
  retained-real V11 RESTRAINT product

BRIDGE B
  retained/native V14 baseline exact V14->V11->V14 admission

BRIDGE C
  real Writer2 V14->V11->Writer2->V14 mutation
  exact modified V11->V14->V11 proof

W2 C
  inherited NODE/SIF/HANGER Writer2 regressions

W2 D
  Writer1 adjacent regressions
  repository npm
  browser/product qualification

W2 E/H
  mature freeze
  final READY/NOT_READY verdict
```

Live V14 UI auto-routing remains blocked until BRIDGE A/B/C pass.

## Appendix A — takeover qualification

A1. State #1042 exactly: CONTROL row1/field4 NONAM immutable; row2/field4 RESTRAINT block count qualified.

A2. State the pinned `3D_Converters` commit and all six exact frozen blob SHAs.

A3. Explain why the XML-local `cii2019_section_rules.py` cannot replace the frozen dependency.

A4. Trace V14 TARGET through V14->V11->existing Writer2->V14 and identify both exact roundtrip gates.

A5. Explain why `allow_lossy=false` is mandatory.

A6. Explain why the converter does not authorize V11 SIF/HANGER/RESTRAINT CREATE.

A7. Explain the difference between `PASS_EXACT_BLOB_CUSTODY`, `PASS_RUNTIME_EXACT_SOURCE_EXCERPT`, and a full authored runtime PASS.

A8. Identify the four byte/lifecycle defects corrected during adapter hardening: FS cleanup, physical VERSION/audit gates, independent SHA custody, exact Writer2 byte postimage; also state the pending-worker lifecycle protection.

A9. Explain why `v11Result.text` is forbidden as V14 restoration authority.

A10. Explain how stale V14 target SHA is now independently established and why converter audit SHA is secondary testimony.

A11. State why live UI auto-routing remains disabled.

A12. State exact next sequence: BRIDGE A -> W2.13 -> retained-real V11 -> BRIDGE B/C -> regressions/repository/browser -> final freeze.

## EXACT NEXT ACTION

Acquire an exact executable repository module graph without stubs/import rewrites and run unchanged:

```text
node tests/cii-workspace-v11-v14-frozen-source.test.js
python tests/cii-workspace-v11-v14-frozen-engine.test.py
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

Then execute retained-real V11 RESTRAINT, followed by retained/native V14 baseline and modified roundtrip gates. Do not enable lossy conversion, do not alter frozen upstream Python, do not auto-route the live V14 UI yet, and do not merge PR #1055 without fresh owner authorization.
