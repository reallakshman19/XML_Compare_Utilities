# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

```text
BASE_MAIN = 297fb37a0e894a3aac91de9188ebf30e810781fb
V11_ENGINEERING_AUTHORITY = CAESAR II 2019 / Version 11.0
V14_DIALECT_BRIDGE_SOURCE = reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
PROGRAM_VERDICT = NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

The V14 bridge creates no new Writer2 engineering semantics. It transports an admissible V14 neutral file through the already-qualified V11 mutation domain using the frozen existing converter.

## 1. Global invariants

Writer2 V11 invariants:

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

Additional V14 bridge invariants:

```text
frozen pinned 3D_Converters source only
deployed frozen Python bytes must match pinned Git blob objects before execution
allow_lossy = false
physical VERSION independently admitted as exact integral major 11 or 14
converter audit schema/arrays/byte counts must be valid
independent JS SHA-256 must agree with converter source/output SHA testimony
one shared Pyodide runtime executes conversion jobs serially
exact untouched V14 -> V11 -> V14 byte admission
original V14 SHA + normalized V11 SHA retained
workspace intake SHA == normalized V11 SHA
existing V11 Writer2 only
V11 Writer2 authoritative byteString required for restoration
V11 postimage SHA must agree across Writer2 and conversion boundary
exact modified V11 -> V14 -> V11 byte proof
canonical audit JSON includes version-bridge provenance
no broad converter canonicalization admitted as Writer2 mutation
```

## 2. Binding Issue #1042

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  -> mutable only under qualified RESTRAINT cardinality authority
```

W2.11 P19 and W2.12 R09 remain mandatory negative-assurance anchors.

## 3. Capability matrix

| Family / operation | Owner | V11 disposition | V14 disposition |
|---|---|---|---|
| NODENAME existing field update | Writer1C | DONE | bridge only after qualification |
| NODENAME row CREATE/DELETE + pointer reindex | Writer2 | DONE | bridge only after qualification |
| SIF existing qualified ii/io update | Writer1C | DONE | bridge only when exact-roundtrip admissible |
| SIF block DELETE/compaction/reindex | Writer2 | DONE | bridge only when exact-roundtrip admissible |
| SIF new block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| HANGER delete-all | Writer2 | DONE | bridge only when exact-roundtrip admissible |
| HANGER H>1 partial DELETE/repack | Writer2 | DONE_PRODUCT_ROUTED | bridge only after qualification |
| HANGER CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| RESTRAINT existing numeric/free-slot operations | Writer1A/1B | DONE | bridge only after qualification |
| RESTRAINT whole 24-row block DELETE | Writer2 | IMPLEMENTED_RUNTIME_PENDING | IMPLEMENTED_CUSTODY_HARDENED_RUNTIME_PENDING |
| RESTRAINT new 24-row block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED |
| node/element/connectivity topology | Writer3 | OUTSIDE_WRITER2 | OUTSIDE_WRITER2 |

## 4. V11 CREATE boundary

```text
SIF_CREATE        SOURCE_BLOCKED_REAFFIRMED_V11
HANGER_CREATE     SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT_CREATE  SOURCE_BLOCKED_REAFFIRMED_V11
```

Canonical V11 source record:

```text
docs/cii-writer2-create-source-refresh-2026-08-25.md
```

The V14 converter cannot fill these V11 engineering-authority gaps.

## 5. Frozen converter custody

Pinned target/upstream Git blobs match exactly:

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
```

XML's pre-existing `cii2019_section_rules.py` is not substituted.

W2.26 additionally hardens live deployment custody. Before Python import/execution, the worker fetches each frozen script as bytes, forms the Git object payload `blob <length>\0<bytes>`, computes SHA-1, requires equality with the pinned Git blob SHA, and writes the already-verified bytes directly into Pyodide. No text decode/re-encode path is used.

```text
DEPLOYED_SOURCE_GIT_BLOB_GATE = IMPLEMENTED_BROWSER_RUNTIME_NOT_RUN
```

## 6. Upstream qualification boundary

Pinned upstream evidence identifies the actual pair:

```text
Benchmarks/v11-v14.zip
  SYS-0001-v11.cii
  SYS-0001-v14.CII
same 112-element model
```

Upstream repository regressions cover repaired fixed-record and semantic conversion behavior. Upstream explicitly leaves the following external application gate `NOT_RUN`:

```text
actual V14 -> generated V11 -> CAESAR V11 import/use -> save/re-export -> comparison
```

That external CAESAR acceptance cannot be inherited as a target PASS.

## 7. Hardened bridge implementation

```text
frozen upstream Python engine        COPIED_EXACT_BLOB
isolated dependency root             IMPLEMENTED
runtime deployed-source blob gate    IMPLEMENTED_BROWSER_RUNTIME_PENDING
Pyodide worker adapter               IMPLEMENTED_CUSTODY_HARDENED
JS conversion client                 IMPLEMENTED_CUSTODY_HARDENED
inspection/preview normalization     IMPLEMENTED_ADDITIVE_API
original + normalized SHA custody    IMPLEMENTED
workspace normalized-SHA crosscheck  IMPLEMENTED
canonical audit bridge provenance    IMPLEMENTED
V11 Writer2 invocation               REUSES_EXISTING_CORE
V11 postimage converter input        AUTHORITATIVE_BYTESTRING
V11 postimage SHA cross-check        IMPLEMENTED
V11->V14 restoration                 IMPLEMENTED
baseline exact roundtrip gate        IMPLEMENTED
modified exact roundtrip gate        IMPLEMENTED
live Writer2 UI automatic adoption   PENDING_QUALIFICATION
```

Adapter hardening includes:

```text
deployed frozen scripts Git-blob verified before execution
verified script bytes written directly to Pyodide
job files unlinked before Pyodide directory removal
empty input rejected before FS allocation
shared Pyodide jobs serialized; failed jobs do not poison queue
messageerror / worker error reject all pending and reset worker
postMessage failure removes pending request
worker cache key advanced after runtime semantic change
physical source/output VERSION independently checked
11.4-style version alias blocked
converter audit schema/arrays/byte counts fail closed
converter audit arrays immutable after admission
independent JS input/output SHA cross-checks converter audit
both original SHA and normalized V11 SHA retained
workspace intake independently cross-checks normalized V11 SHA
fresh apply target must reproduce original + normalized target SHA
V11 Writer2 text view excluded from V14 restoration authority
exact Writer2 byte postimage + postimage SHA cross-boundary custody
canonical exported audit includes bridge provenance
```

No frozen Python or V11 core writer source was changed by these fixes.

## 8. Runtime evidence

```text
W2.11 RESTRAINT physical runtime          PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                             PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic Writer2 product           NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real V11 CII               NOT_RUN_ENVIRONMENT

frozen source Git-blob custody            PASS_EXACT_BLOB_CUSTODY
deployed-source Git-blob worker gate      IMPLEMENTED_BROWSER_RUNTIME_NOT_RUN
extracted converter+adapter runtime        PASS_RUNTIME_EXACT_SOURCE_EXCERPT_12_FALSIFIERS
frozen-source authored JS test            NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test        NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real V14 bridge baseline                  NOT_RUN
real V14 Writer2 mutation                 NOT_RUN
browser V14 bridge                        NOT_RUN
external CAESAR V11 acceptance            NOT_RUN
repository npm                            NOT_RUN_ENVIRONMENT
```

Executed bounded falsifiers:

```text
T01 VERSION 11 admitted                                      PASS
T02 VERSION 14 admitted                                      PASS
T03 VERSION 12 rejected                                      PASS
T04 V14 SIF item15/item16 semantic swap                      PASS
T05 non-zero V14 SIF item27 rejected                         PASS
T06 ambiguous non-zero V11 SIF item19 rejected               PASS
T07 V14 empty restraint stiffness -> V11 sentinel            PASS
T08 non-zero V14 ALLOWBLS item154 rejected                   PASS
T09 WebCrypto Git-blob SHA agrees with independent Node SHA  PASS
T10 audit missing loss_events fails closed                   PASS
T11 binary byteString preserves 0x00..0xFF; >0xFF rejects    PASS
T12 failed serialized job cannot overlap/poison next job     PASS
```

Evidence:

```text
docs/cii-writer2-v11-v14-local-excerpt-runtime-2026-08-25.md
```

This evidence is not promoted to full-engine or product PASS.

## 9. Authored falsifiers still pending runtime

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
```

The static test protects repository and deployed frozen-source custody, dependency isolation, worker serialization/lifecycle/cache identity, physical version admission, converter-audit shape, independent SHA custody, normalized-intake custody, canonical audit provenance, exact byteString handling, postimage SHA custody, and no-lossy/no-text-authority regressions.

GitHub Actions are not authorized; current PR diff contains no workflow file.

## 10. Structural-family classification

```text
Writer1-class   PROCESS / WALL / qualified OD / RIGID weight
Writer2         NODENAME cardinality / SIF DELETE / HANGER DELETE / RESTRAINT block DELETE
SOURCE_BLOCKED  V11 SIF CREATE / V11 HANGER CREATE / V11 RESTRAINT CREATE
Writer3         topology
UNKNOWN         TRANSFER_FAMILY_NOT_QUALIFIED
```

```text
HIDDEN_WRITER2_FAMILY                  NONE_OBSERVED
AMBIGUOUS_GENERIC_FUTURE_WRITER_ROUTE NONE_OBSERVED
UNKNOWN_FAMILY_BEHAVIOR                FAIL_CLOSED
```

## 11. Remaining gates

```text
BRIDGE A  exact module graph: authored frozen-source + frozen-engine tests
W2 A      unchanged W2.13 synthetic product
W2 B      retained-real V11 RESTRAINT product
BRIDGE B  retained/native V14 baseline exact V14->V11->V14 admission
BRIDGE C  real V14->V11->Writer2->V14 mutation + exact modified proof
EXTERNAL  actual CAESAR V11 import/use + save/re-export after V14 conversion
W2 C      inherited Writer2 NODE/SIF/HANGER regressions
W2 D      Writer1 adjacent + repository npm + browser/product regressions
W2 H      final Writer2 release/freeze verdict
```

## 12. Freeze rule

`READY_FOR_WRITER2_RELEASE_FREEZE` requires every source-qualified V11 Writer2 operation to be runtime-dispositioned, all V11 CREATE blockers to remain explicit/fail-closed, and every V14 route exposed in production to pass the exact lossless bridge gates. No lossy V14 conversion, unrelated-byte canonicalization, malformed/missing converter testimony, audit-only SHA custody, normalized-intake drift, text-based postimage authority, generic FUTURE_WRITER ambiguity, or Writer3 topology leakage is permitted.

External CAESAR import/save/re-export acceptance is tracked separately and remains `NOT_RUN` until actually performed.
