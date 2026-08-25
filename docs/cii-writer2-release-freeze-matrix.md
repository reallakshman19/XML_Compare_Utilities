# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

This document is a program-level authority ledger. It does not create engineering authority by itself. Production authority remains defined by merged source-qualified implementations, explicit blockers, exact runtime evidence, and independent validators.

## 1. Writer ownership boundary

```text
Writer 1A
  existing fixed-width cardinality-preserving fields

Writer 1B
  extended fixed fields
  + qualified CREATE/CLEAR inside an already-existing 24-row restraint block free slot

Writer 1C
  pointer-stable, row-count-stable mutation of already-existing auxiliary records

Writer 2
  auxiliary row/block cardinality changes
  section expansion/compaction
  pointer allocation/reindex
  governed CONTROL count changes
  one-TARGET0 multi-family arbitration

Writer 3
  node / element / connectivity / topology mutation
```

Ordinary P/T/process-field updates remain Writer1A/1B work even when engineering-critical.

## 2. Global Writer2 transaction invariants

Every qualified Writer2 transaction must preserve:

```text
one untouched TARGET0
canonical explicit APPLY / EXCLUDE scope
cryptographic TARGET0 byte custody
complete deterministic relocation/cardinality plan
no opportunistic pointer decrement/increment
exact physical fixed-field/section custody
original-coordinate claim arbitration
no last-writer-wins overlap handling
one final splice pass
postimage SHA custody
canonical physical re-intake
independent complete-postimage oracle
Writer testimony secondary to independently reconstructed final bytes
no fabricated native provenance
no unexecuted test represented as PASS
Writer3 topology authority excluded
```

## 3. Binding inherited CONTROL correction

Issue #1042 correction is normative for all current and future RESTRAINT DELETE claims:

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT block count
  -> mutable only under qualified RESTRAINT cardinality authority
```

Any Writer2 RESTRAINT path that mutates row1/field4 is an engineering failure even when the output reparses.

## 4. Capability matrix

### 4.1 NODENAME

| Operation | Owner | Current disposition | Freeze requirement |
|---|---|---|---|
| Existing fixed-field overwrite | Writer1C | DONE | adjacent regression PASS |
| Row CREATE | Writer2 | DONE | Writer2 regression PASS |
| Row DELETE | Writer2 | DONE | Writer2 regression PASS |
| Pointer allocation/reindex | Writer2 | DONE | Writer2 regression PASS |
| Node create/delete/renumber | Writer3 | OUTSIDE_WRITER2 | must remain blocked from Writer2 |

### 4.2 SIF / TEE

| Operation | Owner | Current disposition | Freeze requirement |
|---|---|---|---|
| Existing selected V11 ii/io update | Writer1C | DONE | adjacent regression PASS |
| Existing block DELETE | Writer2 | DONE | Writer2 regression PASS |
| Block compaction/reindex | Writer2 | DONE | Writer2 regression PASS |
| New block CREATE | Writer2 | SOURCE_BLOCKED | preserve blocker unless complete V11 construction authority is resolved |

Current SIF CREATE qualification disposition:

```text
NOT_READY_FOR_WRITER2_SIF_CREATE_IMPLEMENTATION
```

Known unresolved construction authority includes:

```text
items19..22 complete supported-code construction/default semantics
items23..24 exact V11 raw note/sentinel/default encoding
items27..30 V11 meaning or authoritative reserved/default representation
V11 unused second-tee-slot representation
V11 exact omitted/default field encoding
complete Type + piping-code 60-position construction rule
```

Later-edition V14/B31J semantics must not be backported by item number.

### 4.3 HANGER

| Operation | Owner | Current disposition | Freeze requirement |
|---|---|---|---|
| H=1 delete-all | Writer2 | DONE | exact-head regression PASS |
| H>1 delete-all | Writer2 | DONE | exact-head regression PASS |
| H>1 partial DELETE | Writer2 | DONE + PRODUCT_ROUTED | focused product regression PASS |
| Packed-array compaction/repacking for DELETE | Writer2 | DONE | boundary/regression PASS |
| CONTROL.NOHGRS decrement for DELETE | Writer2 | DONE | regression PASS |
| New HANGER CREATE | Writer2 | SOURCE_BLOCKED | preserve blocker until source acquisition closes hard gates |
| HANGER engineering value editing | none | NOT_AUTHORIZED | explicit future qualification required |

Current HANGER CREATE qualification disposition:

```text
NOT_READY_FOR_WRITER2_HANGER_CREATE_IMPLEMENTATION
```

Hard blockers:

```text
GUID_SOFTWARE_ASSIGNED_CREATE_RULE_UNRESOLVED
FIRST_HANGER_HEADER_DEFAULTS_UNRESOLVED
REPOSITORY_FALLBACK_DEFAULT_CONFLICT
NEW_HANGER_RECORD_INSERTION_POLICY_UNRESOLVED
OMITTED_PER_HANGER_DEFAULTS_NOT_COMPLETE
REAL_NATIVE_CREATE_TRANSITION_NOT_AVAILABLE
```

The existing partial-HANGER record binding remains physical/positional authority only:

```text
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

### 4.4 RESTRAINT

| Operation | Owner | Current disposition | Freeze requirement |
|---|---|---|---|
| Existing qualified numeric update | Writer1A/1B | DONE | adjacent regression PASS |
| CREATE/CLEAR inside existing qualified free slot | Writer1B | DONE | adjacent regression PASS |
| Whole 24-row block DELETE planner | Writer2 | DONE | inherited planner authority retained |
| Whole block physical DELETE/compaction | Writer2 | DONE | W2.11 exact runtime PASS retained |
| One-TARGET0 composite adoption | Writer2 | DONE | W2.12 R01-R22 PASS retained |
| Product/core adoption | Writer2 | IMPLEMENTED / RUNTIME_PENDING | W2.13 synthetic + retained-real-CII runtime required |
| New block CREATE/allocation | Writer2 | SOURCE_BLOCKED | preserve blocker until complete allocation/default/GUID authority exists |

Current RESTRAINT product release truth on PR #1055:

```text
W2.11 focused physical runtime = PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                  = PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product        = NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real-CII        = NOT_RUN_ENVIRONMENT
release/freeze                 = NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

Required RESTRAINT CREATE authority before implementation:

```text
software-assigned GUID behavior
new-block allocation position/index policy
complete restraint-type-dependent/default payload
first-block CREATE semantics
seventh-restraint/new-block transition
shared-pointer alias semantics
native import/roundtrip CREATE transition evidence
```

Current production blocker remains authoritative:

```text
WRITER_2_RESTRAINT_BLOCK_CREATE_ALLOCATION_NOT_QUALIFIED
```

## 5. Structural-family classification audit — Gate G source closure

Live transfer-policy and Writer2 plan-contract source were re-inspected on exact base `297fb37a...`.

The base classifier has a finite family surface:

```text
GEOMETRY       -> protected / Writer3 boundary
PIPE_SIZE      -> Writer1B conditional OD or protected
WALL           -> Writer1A fixed field
PROCESS        -> Writer1A/1B fixed fields
WEIGHT_RIGID   -> Writer1A cardinality-preserving rigid record field
NODE_NAME      -> Writer1C existing field; Writer2 plan layer owns cardinality CREATE/DELETE
RESTRAINT      -> Writer1A/1B existing-block slot semantics; Writer2 plan layer owns qualified block DELETE
HANGER         -> presence/count evidence; Writer2 plan layer owns qualified DELETE
SIF_TEE        -> Writer1C selected ii/io; Writer2 plan layer owns qualified existing-block DELETE
UNKNOWN        -> TRANSFER_FAMILY_NOT_QUALIFIED
```

The Writer2 composite plan contract explicitly admits only:

```text
NODENAME CREATE / DELETE
SIF/Tee record presence DELETE
HANGER presence DELETE
qualified RESTRAINT slot DELETE promoted to block DELETE/compaction
```

Everything else is fail-closed. Its policy surface explicitly states:

```text
sifTeeMutation       = V11_EXISTING_BLOCK_DELETE_REINDEX_ONLY
sifTeeCreate         = BLOCKED_ITEMS_27_30_UNRESOLVED
hangerMutation       = EXISTING_HANGER_DELETE_ALL_OR_QUALIFIED_PARTIAL
hangerCreate         = BLOCKED_PAYLOAD_SEMANTICS_NOT_QUALIFIED
restraintMutation    = QUALIFIED_EXISTING_24_ROW_BLOCK_DELETE_COMPACTION_ONLY
restraintCreate      = BLOCKED_ALLOCATION_DEFAULT_GUID_AUTHORITY_NOT_QUALIFIED
processDefault       = BLOCKED_WRITER_2_COMPOSITE
topologyMutation     = BLOCKED_WRITER_3_ONLY
```

The older base-policy blocker:

```text
SIF_TEE_CARDINALITY_OR_SEMANTIC_REWRITE_REQUIRES_FUTURE_QUALIFICATION
```

is therefore not an ambiguous active Writer2 route. The Writer2 SIF plan contract deterministically promotes only the already-qualified existing-block DELETE case and retains CREATE as blocked.

Gate G source verdict:

```text
REMAINING_STRUCTURAL_FAMILY_AUDIT = PASS_SOURCE_INSPECTION
HIDDEN_WRITER2_FAMILY = NONE_OBSERVED
AMBIGUOUS_GENERIC_FUTURE_WRITER_ROUTE = NONE_OBSERVED
UNKNOWN_FAMILY_BEHAVIOR = FAIL_CLOSED
```

This is a source-classification result, not runtime qualification.

## 6. Current runtime evidence gaps

The following are evidence gaps, not authorization to widen semantics:

```text
W2.13 RESTRAINT synthetic product assertions
W2.13 retained-real-CII RESTRAINT product route
inherited Writer2 NODE/SIF/HANGER product/composite regression matrix on current exact base
repository-wide npm test on exact checkout
browser/product Writer2 flow on current exact head
real repository H>1 HANGER source: NOT_AVAILABLE
real H>1 partial product roundtrip: NOT_RUN_NO_REAL_SOURCE
native SIF CREATE transition: NOT_AVAILABLE
native HANGER CREATE transition: NOT_AVAILABLE
native RESTRAINT block CREATE transition: NOT_AVAILABLE
```

PR #1055 source/static dependency closure is not runtime qualification. Exact local checkout currently fails because github.com cannot be resolved from the execution container.

## 7. Stacked PR #1055 completion sequence

```text
GATE A
  execute unchanged W2.13 synthetic product test on exact repository bytes

GATE B
  execute retained-real-CII RESTRAINT product test

GATE C
  execute inherited Writer2 NODE/SIF/HANGER product/composite regression slice

GATE D
  execute Writer1A/1B/1C adjacent regressions + repository npm + browser/product gate

GATE E
  freeze all mature DELETE/cardinality authority with exact runtime evidence

GATE F
  source-acquisition refresh for SIF CREATE / HANGER CREATE / RESTRAINT CREATE
  -> implement only a family that reaches explicit READY source verdict
  -> otherwise preserve SOURCE_BLOCKED

GATE G
  remaining auxiliary/cardinality source classification audit
  -> PASS_SOURCE_INSPECTION at current checkpoint

GATE H
  publish final capability matrix and program verdict
```

No later gate may retroactively convert `NOT_RUN`, `NOT_AVAILABLE`, or `SOURCE_BLOCKED` to PASS.

## 8. Program-level freeze rule

Writer2 may be declared accomplished/frozen when all of the following are true:

```text
all source-qualified Writer2 operations have implementation authority
all implemented Writer2 operations have required exact runtime evidence
one-TARGET0 original-coordinate arbitration is preserved
independent complete-postimage validation covers every variable-length transaction class
Writer1A/1B/1C adjacent regressions pass
repository gate disposition is explicit
browser/product gate disposition is explicit
all available real-source roundtrips are dispositioned
all unresolved CREATE families retain explicit fail-closed blockers
no operation remains ambiguously classified as generic FUTURE_WRITER
no Writer3 topology authority leaks into Writer2
changed-file ledger has zero unexplained paths
```

The final verdict must be exactly one of:

```text
READY_FOR_WRITER2_RELEASE_FREEZE
NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

`READY_FOR_WRITER2_RELEASE_FREEZE` does **not** require inventing source-blocked CREATE semantics. It requires that those operations be explicitly classified and fail closed until authoritative construction data becomes available.
