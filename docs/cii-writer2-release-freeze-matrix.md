# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

```text
BASE_MAIN = 297fb37a0e894a3aac91de9188ebf30e810781fb
V11_ENGINEERING_AUTHORITY = CAESAR II 2019 / Version 11.0
V14_DIALECT_BRIDGE_SOURCE = reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
PROGRAM_VERDICT = NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

The v14 bridge does not create new Writer2 engineering semantics. It losslessly translates an admissible V14 neutral file to the already-qualified V11 mutation domain and back by using the frozen existing converter.

Canonical bridge design:

```text
docs/cii-writer2-v11-v14-lossless-bridge.md
```

## 1. Global Writer2 invariants

```text
one untouched writer-domain TARGET0
canonical explicit BOUND APPLY / EXCLUDE scope
cryptographic target custody
original-coordinate claim arbitration
no last-writer-wins overlap handling
one final V11 splice pass
independent complete V11 postimage oracle
no fabricated source authority
no unexecuted test represented as PASS
no Writer3 topology leakage
```

For a V14 target, additional mandatory invariants are:

```text
frozen pinned 3D_Converters source only
allow_lossy = false
exact untouched V14 -> V11 -> V14 byte roundtrip
existing V11 Writer2 only
exact modified V11 -> V14 -> V11 byte roundtrip
no broad converter canonicalization admitted as Writer2 mutation
```

## 2. Binding #1042 CONTROL correction

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
| NODENAME existing field update | Writer1C | DONE | via bridge only after bridge qualification |
| NODENAME row CREATE/DELETE + pointer reindex | Writer2 | DONE | via bridge only after bridge qualification |
| SIF existing qualified ii/io update | Writer1C | DONE | via bridge only if lossless exact-roundtrip admissible |
| SIF block DELETE/compaction/reindex | Writer2 | DONE | via bridge only if lossless exact-roundtrip admissible |
| SIF new block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED through bridge |
| HANGER delete-all | Writer2 | DONE | via bridge only if lossless exact-roundtrip admissible |
| HANGER H>1 partial DELETE/repack | Writer2 | DONE_PRODUCT_ROUTED | via bridge only after bridge qualification |
| HANGER CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED through bridge |
| RESTRAINT existing numeric/free-slot operations | Writer1A/1B | DONE | via bridge only after bridge qualification |
| RESTRAINT whole 24-row block DELETE | Writer2 | IMPLEMENTED_RUNTIME_PENDING | bridge IMPLEMENTED_NOT_RUN |
| RESTRAINT new 24-row block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 | NOT AUTHORIZED through bridge |
| node/element/connectivity topology | Writer3 | OUTSIDE_WRITER2 | OUTSIDE_WRITER2 |

## 4. V11 CREATE boundary remains authoritative

V11 CREATE qualification is unchanged by the v14 converter:

```text
SIF_CREATE        SOURCE_BLOCKED_REAFFIRMED_V11
HANGER_CREATE     SOURCE_BLOCKED_REAFFIRMED_V11
RESTRAINT_CREATE  SOURCE_BLOCKED_REAFFIRMED_V11
```

Canonical V11 source record:

```text
docs/cii-writer2-create-source-refresh-2026-08-25.md
```

The frozen converter's knowledge of v14 physical dialect is not authority to synthesize a Writer2 CREATE operation that is blocked in the V11 mutation policy.

## 5. Frozen converter custody

Pinned source files are vendored byte-identically under:

```text
converters/scripts/cii-v11-v14-upstream/
```

Exact expected Git blobs:

```text
cii_v11_v14.py               6152f28c0c43b4d70029f360d993da5794310c8a
cii_v11_v14_format.py        56f59fb7e095a887fc84e8a008a5f40acbadaec5
cii_v11_v14_records.py       1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235
cii_v11_v14_sif.py           88c1d80bdb7bd2d5197a56c5be60ac2057c02367
cii_v11_v14_validate.py      8e6896e8b61ac3c90d579139d39b29a6ace1637c
cii2019_section_rules.py     efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e
```

The XML repository's pre-existing `converters/scripts/cii2019_section_rules.py` is not substituted for the upstream dependency because the two blobs differ.

## 6. V14 bridge implementation state

```text
frozen upstream Python engine       COPIED_EXACT_BLOB
isolated dependency root            IMPLEMENTED
Pyodide worker adapter              IMPLEMENTED
JS conversion client                IMPLEMENTED
inspection/preview V14->V11 bridge  IMPLEMENTED_ADDITIVE_API
stale original V14 target custody   IMPLEMENTED
V11 Writer2 invocation              REUSES_EXISTING_CORE
V11->V14 restoration                IMPLEMENTED
baseline exact roundtrip gate       IMPLEMENTED
modified exact roundtrip gate       IMPLEMENTED
live Writer2 UI automatic adoption  PENDING_QUALIFICATION
```

No existing V11 core writer source was changed to implement the bridge.

## 7. Runtime evidence

```text
W2.11 RESTRAINT physical runtime        PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                           PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic Writer2 product         NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real V11 CII             NOT_RUN_ENVIRONMENT
frozen upstream target blob test        NOT_RUN_ENVIRONMENT
frozen engine synthetic falsifiers      NOT_RUN_ENVIRONMENT
real V14 bridge baseline                NOT_RUN
real V14 Writer2 mutation               NOT_RUN
browser V14 bridge                      NOT_RUN
repository npm                           NOT_RUN_ENVIRONMENT
```

Bridge qualification files:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
.github/workflows/cii-writer-v11-v14-bridge.yml
```

No workflow run/status has yet been observed. Defined tests/workflows are not represented as PASS.

## 8. Structural-family classification

```text
Writer1-class   PROCESS / WALL / qualified OD / RIGID weight
Writer2         NODENAME cardinality / SIF DELETE / HANGER DELETE / RESTRAINT block DELETE
SOURCE_BLOCKED  V11 SIF CREATE / V11 HANGER CREATE / V11 RESTRAINT CREATE
Writer3         topology
UNKNOWN         TRANSFER_FAMILY_NOT_QUALIFIED
```

```text
HIDDEN_WRITER2_FAMILY                 NONE_OBSERVED
AMBIGUOUS_GENERIC_FUTURE_WRITER_ROUTE NONE_OBSERVED
UNKNOWN_FAMILY_BEHAVIOR               FAIL_CLOSED
```

## 9. Remaining gates

```text
BRIDGE A  exact-checkout frozen-source Git-blob test
BRIDGE B  frozen-engine synthetic falsifiers
BRIDGE C  real/native V14 baseline exact V14->V11->V14 admission
BRIDGE D  real qualified Writer2 mutation through V14->V11->Writer2->V14
BRIDGE E  exact modified V11->V14->V11 proof + browser/product adoption

W2 A      unchanged W2.13 synthetic product assertions
W2 B      retained-real V11 RESTRAINT product runtime
W2 C      inherited Writer2 NODE/SIF/HANGER regressions
W2 D      Writer1 adjacent + repository npm + browser/product regressions
W2 H      final Writer2 release/freeze verdict
```

## 10. Freeze rule

`READY_FOR_WRITER2_RELEASE_FREEZE` requires all source-qualified V11 Writer2 operations to be runtime-dispositioned, all V11 CREATE blockers to remain explicit/fail-closed, and any V14 route exposed in production to pass the lossless exact-roundtrip bridge gates. No lossy V14 conversion, broad unrelated-byte canonicalization, generic FUTURE_WRITER ambiguity, or Writer3 topology leakage is permitted.
