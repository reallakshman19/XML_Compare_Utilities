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
CURRENT_STAGE: W2.24_V11_V14_BRIDGE_CUSTODY_HARDENED_RUNTIME_PENDING
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

All target copies match the pinned upstream Git blobs exactly:

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

The existing XML `converters/scripts/cii2019_section_rules.py` has a different blob and is not substituted. The frozen converter loads its own isolated upstream dependency.

## 3. Upstream qualification boundary

Upstream source records establish the real paired benchmark:

```text
Benchmarks/v11-v14.zip
  SYS-0001-v11.cii
  SYS-0001-v14.CII
same 112-element model
```

Upstream regression/RCA evidence establishes, among other deltas:

```text
ELEMENTS   V11 15 rows / V14 15 rows
RESTRANT   V11 24 rows / V14 24 rows
SIF&TEES   V11 10 rows / V14 14 rows
REDUCERS   V11 1 row  / V14 2 rows
ALLOWBLS   V11 26 rows / V14 28 rows when present
```

Upstream also records the final external acceptance gate as **NOT_RUN**:

```text
actual V14 source
-> repaired converter
-> generated V11
-> actual CAESAR V11 import/use
-> save/export from CAESAR
-> semantic/record comparison
```

PR #1055 must not promote that external CAESAR acceptance to PASS.

## 4. V11 engineering authority remains unchanged

The V14 bridge is dialect transport only. It does not widen Writer2 engineering semantics.

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

## 5. V14 architecture — reuse, not reinvention

```text
V11 TARGET
  -> existing qualified V11 Writer2 directly

V14 TARGET
  -> frozen 3D_Converters V14 -> V11
       allow_lossy = false
  -> exact untouched V14 -> V11 -> V14 byte admission gate
  -> normalized V11 SHA cross-checked at workspace intake
  -> existing V11 Writer2
  -> existing V11 complete postimage validation
  -> exact authoritative Writer2 byteString custody
  -> frozen 3D_Converters V11 -> V14
       allow_lossy = false
  -> exact modified V11 -> V14 -> V11 byte proof
  -> V14 output
```

The exact cross-version byte gates are an XML Writer2 restriction. The generic upstream converter may legitimately re-render target-dialect records; Writer2 refuses any V14 model where that would prevent exact unrelated-byte custody.

Live UI automatic routing remains disabled until real bridge qualification passes.

## 6. Integration modules

```text
converters/cii-v11-v14-writer-worker.js
  browser/Pyodide transport only
  frozen source loaded from isolated upstream directory

tabs/cii-workspace/cii-workspace-v11-v14-converter.js
  physical version gate
  worker lifecycle
  serialized shared Pyodide execution
  independent SHA custody
  converter-audit schema/byte-count custody
  lossless conversion client
  exact byte helpers

tabs/cii-workspace/cii-workspace-writer-version-bridge.js
  SOURCE/TARGET normalization
  original + normalized SHA provenance
  normalized workspace-intake SHA cross-check
  target baseline exact-roundtrip gate
  stale original and normalized target custody
  existing V11 Writer2 invocation
  exact V11 postimage custody
  V14 restoration
  modified exact-roundtrip proof
  canonical audit-bundle bridge provenance
```

Current V11 core Writer implementation remains unchanged.

## 7. Adapter defects found and fixed

### A. Pyodide job-directory leak

Job files are now unlinked before directory removal; empty input is rejected before filesystem allocation.

### B. Shared-runtime concurrency race

A single Pyodide runtime mutates shared `sys.argv` / `cii_job_argv`. Async message handlers previously allowed two conversion jobs to overlap. Current worker routes jobs through a serial promise queue and a failed job cannot poison the next queued job.

### C. Worker lifecycle/cache custody

```text
messageerror -> reject all pending + terminate/reset
worker error -> reject all pending + terminate/reset
main-thread postMessage throw -> remove pending job + reject
worker cache key advanced after runtime behavior changed
```

### D. Physical VERSION and SHA custody

```text
only integral physical major 11 or 14 admitted
11.4 cannot alias to 11
audit.source_version == physical source
audit.target_version == requested target
physical output VERSION == requested target
independent JS source SHA == converter audit source SHA
independent JS target SHA == converter audit target SHA
```

### E. Converter audit must be structurally valid

The bridge now fails closed unless:

```text
audit.schema == cii-v11-v14-conversion-audit/v1
changed_sections is an array
warnings is an array
loss_events is an array
audit.source_bytes == actual input byte count
audit.target_bytes == actual output byte count
```

Those arrays are frozen before exposure. Missing `loss_events` is not treated as an empty/no-loss result.

### F. Original/normalized SHA custody

Both V11 and V14 inputs now retain `originalSha256`. V14 additionally retains the frozen-converter V11 `normalizedSha256`. Inspection and preview independently verify that the workspace's own document SHA equals the normalized SHA before matching/planning proceeds.

At apply time V14 TARGET must reproduce both:

```text
original V14 SHA
normalized V11 SHA
```

### G. V14 restoration uses authoritative Writer2 bytes

`v11Result.text` is forbidden as restoration authority. The bridge requires `v11Result.byteString`, reconstructs exact V11 postimage bytes, cross-checks the Writer2 postimage SHA, converts those bytes to V14, then proves V14->V11 reproduces the exact V11 postimage.

### H. Canonical audit provenance

The bridge evidence is embedded in `preview.audit.versionBridge`, and the artifact bundle is regenerated. A V14-normalized transfer therefore cannot export a canonical audit JSON that silently omits the V14->V11 custody chain.

## 8. Authored bridge falsifiers

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
```

The static test now locks:

```text
frozen Git blob custody
local dependency isolation
worker source root
job cleanup / empty input
serialized shared Pyodide jobs
failed-job queue recovery
worker cache identity
worker pending-job lifecycle
physical VERSION admission
independent SHA custody
converter audit schema/array/byte-count custody
immutable audit arrays
original + normalized SHA provenance
workspace normalized-intake SHA cross-check
stale original + normalized target rejection
canonical audit-bundle bridge provenance
Writer2 byteString/postimage SHA custody
modified exact byte proof
no lossy Writer2 bridge
```

These authored tests remain `NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH` in the present environment.

## 9. Executed extracted-source evidence

Evidence:

```text
docs/cii-writer2-v11-v14-local-excerpt-runtime-2026-08-25.md
```

Eight exact-source-excerpt falsifiers passed:

```text
VERSION 11 admitted
VERSION 14 admitted
VERSION 12 rejected
V14 SIF item15/item16 axial/torsion semantic swap
non-zero V14 SIF item27 rejected
ambiguous non-zero V11 SIF item19 rejected
V14 empty restraint stiffness -> V11 sentinel
non-zero V14 ALLOWBLS item154 rejected
```

Classification remains:

```text
PASS_RUNTIME_EXACT_SOURCE_EXCERPT
```

This is not promoted to full-engine, authored-test, product, or release PASS.

## 10. Current runtime truth

```text
W2.11 RESTRAINT physical DELETE          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                            PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product                  NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real-V11-CII              NOT_RUN_ENVIRONMENT

frozen source custody                    PASS_EXACT_BLOB_CUSTODY
extracted converter semantic slice       PASS_RUNTIME_EXACT_SOURCE_EXCERPT
frozen-source authored JS test           NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test       NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real V14 baseline exact roundtrip        NOT_RUN
real V14 Writer2 modified roundtrip      NOT_RUN
browser/product V14 bridge               NOT_RUN
external CAESAR V11 acceptance           NOT_RUN
repository npm                           NOT_RUN_ENVIRONMENT

engineering failure                      NONE_OBSERVED
```

Environment limitation:

```text
native git checkout -> DNS failure
direct GitHub raw/archive route -> unavailable in execution container
GitHub Actions -> not authorized
```

No alternate route is represented as an exact checkout.

## 11. No-Actions rule

Current PR diff contains no workflow file.

```text
GITHUB_ACTIONS_AUTHORIZED = FALSE
WORKFLOW_RESULT_USED_AS_EVIDENCE = FALSE
```

## 12. Changed-file ledger

Expected PR diff is exactly 19 paths:

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

## 13. Remaining gates

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

EXTERNAL ACCEPTANCE
  actual CAESAR V11 import/use + save/re-export after V14 conversion

W2 C/D
  inherited Writer2 regressions
  Writer1 adjacent regressions
  repository npm
  browser/product qualification

W2 E/H
  mature freeze
  final READY/NOT_READY verdict
```

Live V14 UI auto-routing remains blocked until BRIDGE A/B/C pass. External CAESAR acceptance remains a separately labelled application-qualification gate.

## Appendix A — takeover qualification

A1. State #1042 exactly: CONTROL row1/field4 NONAM immutable; row2/field4 RESTRAINT block count qualified.

A2. State the pinned `3D_Converters` commit and all six frozen blob SHAs.

A3. Explain why the XML-local `cii2019_section_rules.py` cannot replace the frozen dependency.

A4. Trace V14 TARGET through V14->V11->existing Writer2->V14 and identify both exact roundtrip gates.

A5. Explain why `allow_lossy=false` is mandatory and why missing `loss_events` is now a blocker rather than interpreted as no loss.

A6. Explain why the converter does not authorize V11 SIF/HANGER/RESTRAINT CREATE.

A7. Explain the distinction between frozen-source blob custody, extracted-source runtime evidence, target authored runtime, and external CAESAR acceptance.

A8. Explain why one shared Pyodide runtime requires serialized jobs.

A9. Explain why both original V14 SHA and normalized V11 SHA are required at apply time.

A10. Explain why `v11Result.text` is forbidden as V14 restoration authority.

A11. Show where version-bridge provenance enters the canonical audit JSON.

A12. State why live UI auto-routing remains disabled.

A13. State exact next sequence: BRIDGE A -> W2.13 -> retained-real V11 -> BRIDGE B/C -> regressions/repository/browser -> final freeze; external CAESAR acceptance remains separately NOT_RUN until actually executed.

## EXACT NEXT ACTION

Acquire an exact executable repository module graph without stubs/import rewrites and run unchanged:

```text
node tests/cii-workspace-v11-v14-frozen-source.test.js
python tests/cii-workspace-v11-v14-frozen-engine.test.py
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

Then execute retained-real V11 RESTRAINT, followed by retained/native V14 baseline and modified roundtrip gates. Do not enable lossy conversion, do not alter frozen upstream Python, do not auto-route the live V14 UI yet, and do not merge PR #1055 without fresh owner authorization.
