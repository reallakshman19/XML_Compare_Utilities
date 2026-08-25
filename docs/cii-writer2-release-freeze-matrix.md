# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

This is the canonical program-level authority matrix. It does not create engineering authority; it reconciles merged implementation authority, explicit source blockers, and observed validation evidence.

Detailed 2026-08-25 CREATE source refresh:

```text
docs/cii-writer2-create-source-refresh-2026-08-25.md
```

## 1. Ownership boundary

```text
Writer1A   existing cardinality-preserving fixed fields
Writer1B   extended fixed fields + qualified existing restraint-block free-slot CREATE/CLEAR
Writer1C   pointer-stable / row-count-stable existing auxiliary-field mutation
Writer2    auxiliary cardinality, section expansion/compaction, pointer allocation/reindex,
           governed CONTROL counts, one-TARGET0 multi-family arbitration
Writer3    node / element / connectivity / topology mutation
```

Ordinary P/T/process-field changes remain Writer1A/1B work.

## 2. Global Writer2 invariants

```text
one untouched TARGET0
canonical explicit BOUND APPLY / EXCLUDE scope
cryptographic TARGET0 byte custody
complete deterministic relocation/cardinality plan
exact physical fixed-field/section custody
original-coordinate claim arbitration
no last-writer-wins overlap handling
one final splice pass
postimage SHA custody
canonical physical re-intake
independent complete-postimage oracle
Writer testimony secondary to independent expected final bytes
no fabricated native provenance
no unexecuted test represented as PASS
no Writer3 topology leakage
```

## 3. Binding #1042 CONTROL correction

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  -> mutable only under qualified RESTRAINT cardinality authority
```

W2.11 P19 and W2.12 R09 remain mandatory negative-assurance anchors.

## 4. Capability matrix

### NODENAME

| Operation | Owner | Disposition |
|---|---|---|
| existing name-field overwrite | Writer1C | DONE |
| row CREATE | Writer2 | DONE |
| row DELETE | Writer2 | DONE |
| pointer allocation/reindex | Writer2 | DONE |
| node create/delete/renumber | Writer3 | OUTSIDE_WRITER2 |

### SIF / TEE

| Operation | Owner | Disposition |
|---|---|---|
| selected existing V11 ii/io UPDATE | Writer1C | DONE |
| existing block DELETE | Writer2 | DONE |
| block compaction/reindex | Writer2 | DONE |
| new block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED |

Current CREATE verdict:

```text
NOT_READY_FOR_WRITER2_SIF_CREATE_IMPLEMENTATION
```

2026-08-25 direct-source refresh established/confirmed:

```text
V11/V12 physical shape (2X,6G13.6), 30 items/tee, 2 tees, 10 rows   PASS_DIRECT_SOURCE_REFRESH
items 1..26 partial semantics                                      PASS_DIRECT_SOURCE_REFRESH
items 27..30 complete V11 CREATE authority                         UNRESOLVED
complete omitted/default/sentinel construction contract            UNRESOLVED
unused second-slot CREATE representation                           UNRESOLVED
V14/B31J item-number backport                                      FORBIDDEN_BY_EDITION_DRIFT
```

Production blocker remains fail-closed.

### HANGER

| Operation | Owner | Disposition |
|---|---|---|
| H=1 delete-all | Writer2 | DONE |
| H>1 delete-all | Writer2 | DONE |
| H>1 partial DELETE | Writer2 | DONE_PRODUCT_ROUTED |
| five packed-array DELETE compaction/repacking | Writer2 | DONE |
| CONTROL.NOHGRS decrement for DELETE | Writer2 | DONE |
| new HANGER CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED |
| HANGER engineering value editing | none | NOT_AUTHORIZED |

Current CREATE verdict:

```text
NOT_READY_FOR_WRITER2_HANGER_CREATE_IMPLEMENTATION
```

2026-08-25 direct-source refresh established/confirmed:

```text
Version12 global hanger-default record dictionary         PASS_DIRECT_SOURCE_REFRESH
IHGRNODE/HGRDAT/TAG/GUID/IHGRFREE/packed-family layout    PASS_DIRECT_SOURCE_REFRESH
HGRDAT items 1..11                                        PASS_DIRECT_SOURCE_REFRESH
HGRDAT items 6 and 7 zero initialization                  PASS_DIRECT_SOURCE_REFRESH
GUID software ownership/display behavior                  PASS_DIRECT_SOURCE_CORROBORATION
GUID fresh-CREATE generation/import rule                  UNRESOLVED
first-hanger/global-default -> exact neutral bytes         UNRESOLVED
new-record insertion policy across correlated arrays      UNRESOLVED
complete omitted/per-hanger default construction          UNRESOLVED
native H=0->1 / H=1->2 transition                         NOT_AVAILABLE
```

Retained hard blockers include:

```text
GUID_SOFTWARE_ASSIGNED_CREATE_RULE_UNRESOLVED
FIRST_HANGER_HEADER_DEFAULTS_UNRESOLVED
REPOSITORY_FALLBACK_DEFAULT_CONFLICT
NEW_HANGER_RECORD_INSERTION_POLICY_UNRESOLVED
OMITTED_PER_HANGER_DEFAULTS_NOT_COMPLETE
REAL_NATIVE_CREATE_TRANSITION_NOT_AVAILABLE
```

### RESTRAINT

| Operation | Owner | Disposition |
|---|---|---|
| existing qualified numeric update | Writer1A/1B | DONE |
| existing 24-row-block free-slot CREATE/CLEAR | Writer1B | DONE |
| whole 24-row block DELETE planner | Writer2 | DONE |
| physical block DELETE/compaction | Writer2 | DONE |
| one-TARGET0 composite adoption | Writer2 | DONE |
| product/core adoption | Writer2 | IMPLEMENTED_RUNTIME_PENDING |
| new 24-row block CREATE/allocation | Writer2 | SOURCE_BLOCKED_REAFFIRMED |

Current RESTRAINT DELETE release truth:

```text
W2.11 physical runtime   PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22            PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product  NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real-CII  NOT_RUN_ENVIRONMENT
```

2026-08-25 CREATE direct-source refresh established/confirmed:

```text
V11/V12 restraint field dictionary and Tag/GUID physical format    PASS_DIRECT_SOURCE_REFRESH
type range 1..62                                                   PASS_DIRECT_SOURCE_REFRESH
translational/rotational unspecified-stiffness defaults            PASS_DIRECT_SOURCE_REFRESH
fresh GUID generation/import behavior                              UNRESOLVED
complete Type-dependent CREATE payload/default representation      UNRESOLVED
new-block allocation/insertion policy                              UNRESOLVED
shared-pointer CREATE alias semantics                              UNRESOLVED
first-block / seventh-restraint transition                         UNRESOLVED
native new-block CREATE transition                                 NOT_AVAILABLE
```

Production blocker remains:

```text
WRITER_2_RESTRAINT_BLOCK_CREATE_ALLOCATION_NOT_QUALIFIED
```

## 5. Gate G — structural-family classification audit

Exact-base `cii-workspace-transfer-policy.js` plus `cii-workspace-writer2-composite-routing.js` were re-inspected.

Finite production family partition:

```text
GEOMETRY       -> protected / Writer3
PIPE_SIZE      -> Writer1B conditional OD or protected
WALL           -> Writer1A
PROCESS        -> Writer1A/1B
WEIGHT_RIGID   -> Writer1A cardinality-preserving
NODE_NAME      -> Writer1C existing field / Writer2 cardinality
RESTRAINT      -> Writer1A/1B existing slot / Writer2 block DELETE
HANGER         -> evidence + Writer2 DELETE
SIF_TEE        -> Writer1C selected existing fields / Writer2 DELETE
UNKNOWN        -> TRANSFER_FAMILY_NOT_QUALIFIED
```

Writer2 composite routing explicitly admits only:

```text
NODENAME CREATE/DELETE
SIF record-presence DELETE
HANGER presence DELETE
qualified RESTRAINT DELETE -> block DELETE/compaction
```

and explicitly blocks:

```text
SIF CREATE
HANGER CREATE
RESTRAINT CREATE
process-default mutation
Writer3 topology
all unsupported non-KEEP families
```

Gate G verdict:

```text
REMAINING_STRUCTURAL_FAMILY_AUDIT       PASS_SOURCE_INSPECTION
HIDDEN_WRITER2_FAMILY                   NONE_OBSERVED
AMBIGUOUS_GENERIC_FUTURE_WRITER_ROUTE   NONE_OBSERVED
UNKNOWN_FAMILY_BEHAVIOR                 FAIL_CLOSED
```

## 6. Gate F — CREATE source acquisition refresh

Detailed evidence is in `docs/cii-writer2-create-source-refresh-2026-08-25.md`.

Final Gate F verdict:

```text
SIF_CREATE_SOURCE_REFRESH        COMPLETE_SOURCE_BLOCKED
HANGER_CREATE_SOURCE_REFRESH     COMPLETE_SOURCE_BLOCKED
RESTRAINT_CREATE_SOURCE_REFRESH  COMPLETE_SOURCE_BLOCKED
PRODUCTION_CREATE_CHANGE         NONE
```

This closes CREATE as a source-classification obligation for the current freeze. Future authoritative source acquisition may reopen one family independently.

## 7. Remaining release blockers

The only unresolved program gates are execution/release evidence for already-implemented authority:

```text
GATE A  unchanged W2.13 synthetic RESTRAINT product assertions on exact repository bytes
GATE B  retained-real-CII RESTRAINT product runtime
GATE C  inherited Writer2 NODE/SIF/HANGER product/composite regressions on current exact base
GATE D  Writer1A/1B/1C adjacent regressions + repository npm + browser/product Writer2 gate
GATE E  mature DELETE/cardinality freeze from Gates A-D
GATE H  final program release/freeze verdict
```

Current environment blocker:

```text
native checkout -> FAIL_ENVIRONMENT_DNS
Could not resolve host: github.com
exact executable mirror -> NOT_AVAILABLE_THIS_RUNTIME
```

Source/static dependency closure is not runtime qualification.

Additional evidence limitations retained:

```text
real repository H>1 HANGER source          NOT_AVAILABLE
real H>1 partial product roundtrip          NOT_RUN_NO_REAL_SOURCE
native SIF CREATE transition                NOT_AVAILABLE
native HANGER CREATE transition             NOT_AVAILABLE
native RESTRAINT block CREATE transition    NOT_AVAILABLE
```

## 8. Program-level freeze rule

Final verdict must be exactly one of:

```text
READY_FOR_WRITER2_RELEASE_FREEZE
NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

READY requires:

```text
all source-qualified Writer2 operations implemented
all implemented Writer2 operations have required exact runtime evidence
one-TARGET0/original-coordinate architecture preserved
independent complete-postimage validation retained
Writer1A/1B/1C adjacent regressions dispositioned
repository gate disposition explicit
browser/product gate disposition explicit
all available real-source roundtrips dispositioned
all unresolved CREATE families explicit and fail-closed
no ambiguous generic FUTURE_WRITER operation
no Writer3 topology leakage
zero unexplained changed paths
```

READY does not require inventing source-blocked CREATE semantics.
