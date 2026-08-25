# CII Writer 2 — release/freeze capability matrix

Status: **LIVE STACKED CLOSURE ON PR #1055**

```text
BASE_MAIN = 297fb37a0e894a3aac91de9188ebf30e810781fb
CREATE_AUTHORITY_EDITION = CAESAR II 2019 / Version 11.0 ONLY
LATER_EDITION_CREATE_AUTHORITY = EXCLUDED
PROGRAM_VERDICT = NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

This is the canonical program-level authority matrix. It reconciles merged implementation authority, V11 source blockers, and observed validation evidence. It does not create engineering authority by itself.

V11-only CREATE source record:

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

## 2. V11 authority rule

For Writer2 CREATE qualification:

```text
exact V11 vendor-authored material       authority-bearing
real V11 neutral files                   observation/physical evidence only unless transition-controlled
repository converter defaults            repository policy only unless vendor-sourced
V12/V14/current-version documentation    NOT V11 CREATE authority
later-edition meanings/defaults           MUST NOT be backported to V11
```

The current CREATE blockers are therefore V11-native blockers; they do not depend on later-edition drift arguments.

## 3. Global Writer2 transaction invariants

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

## 4. Binding Issue #1042 CONTROL correction

```text
CONTROL row1 / field4 / I13 = NONAM
  -> preserve byte-identically

CONTROL row2 / field4 / I13 = RESTRAINT auxiliary-block count
  -> mutable only under qualified RESTRAINT cardinality authority
```

W2.11 P19 and W2.12 R09 remain mandatory negative-assurance anchors.

## 5. Capability matrix

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
| existing V11 block DELETE | Writer2 | DONE |
| block compaction/reindex | Writer2 | DONE |
| new V11 block CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 |

V11 source truth:

```text
#$ SIF&TEES
FORTRAN (2X,6G13.6)
30 items/tee
2 tee slots
5 rows/tee
10 rows/auxiliary
items 1..26 source-identified
items 27..30 unresolved in retained V11 neutral authority
```

Therefore:

```text
V11_COMPLETE_60_POSITION_CREATE_CONTRACT UNRESOLVED
V11_UNUSED_SECOND_TEE_SLOT_CREATE_RULE   UNRESOLVED
SIF_CREATE                               SOURCE_BLOCKED_REAFFIRMED_V11
```

Production blocker:

```text
WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
```

### HANGER

| Operation | Owner | Disposition |
|---|---|---|
| H=1 delete-all | Writer2 | DONE |
| H>1 delete-all | Writer2 | DONE |
| H>1 partial DELETE | Writer2 | DONE_PRODUCT_ROUTED |
| packed-array DELETE compaction/repacking | Writer2 | DONE |
| CONTROL.NOHGRS decrement for DELETE | Writer2 | DONE |
| new V11 HANGER CREATE | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 |
| HANGER engineering value editing | none | NOT_AUTHORIZED |

Exact V11 vendor source qualifies the published physical dictionary, including header/default records, `IHGRNODE`, all 11 `HGRDAT` positions, TAG/GUID, `IHGRFREE`, and packed arrays. V11 also states hanger GUID is software-assigned/display-only.

Still unresolved from V11 alone:

```text
blank/generated GUID CREATE/import behavior
complete universal CREATE defaults
first-hanger header/default exact byte construction
correlated-array record insertion/index policy
native H=0->1 / H=1->2 controlled transition
```

Retained blockers:

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
| new V11 24-row block CREATE/allocation | Writer2 | SOURCE_BLOCKED_REAFFIRMED_V11 |

Exact V11 vendor/source custody establishes:

```text
up to six restraints per element
Node + Type required
remaining input optional
blank stiffness -> rigid behavior
Tag input
GUID software-assigned/display-only
6 slots × 4 rows = 24 rows/block
1-based ELEMENT restraint pointer
CONTROL restraint count = auxiliary-block count
```

Still unresolved from V11 alone:

```text
blank/generated GUID CREATE/import behavior
complete Type-dependent CREATE byte payload/defaults
new-block allocation/index policy
first-block CREATE serialization
shared-pointer CREATE alias semantics
controlled native 0->1 / N->N+1 block transition
```

Production blocker:

```text
WRITER_2_RESTRAINT_BLOCK_CREATE_ALLOCATION_NOT_QUALIFIED
```

Current RESTRAINT DELETE release truth:

```text
W2.11 physical runtime   PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22            PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product  NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
W2.13 retained-real-CII  NOT_RUN_ENVIRONMENT
```

## 6. Gate F — V11-only CREATE source closure

```text
AUTHORITY_SCOPE                       CAESAR_II_2019_VERSION_11_ONLY
LATER_EDITION_AUTHORITY_ALLOWED       FALSE
SIF_CREATE_SOURCE_REFRESH             COMPLETE_SOURCE_BLOCKED_V11
HANGER_CREATE_SOURCE_REFRESH          COMPLETE_SOURCE_BLOCKED_V11
RESTRAINT_CREATE_SOURCE_REFRESH       COMPLETE_SOURCE_BLOCKED_V11
PRODUCTION_CREATE_CHANGE              NONE
```

This closes CREATE as a source-classification obligation for the current Writer2 freeze. A family may reopen only if new V11-authoritative evidence closes its specific blocker.

## 7. Gate G — structural-family classification audit

Exact-base transfer-policy and Writer2 composite-routing source produce the finite partition:

```text
Writer1-class   PROCESS / WALL / qualified OD / RIGID weight
Writer2         NODENAME cardinality / SIF DELETE / HANGER DELETE / RESTRAINT block DELETE
SOURCE_BLOCKED  V11 SIF CREATE / V11 HANGER CREATE / V11 RESTRAINT CREATE
Writer3         topology
UNKNOWN         TRANSFER_FAMILY_NOT_QUALIFIED
```

Writer2 routing explicitly admits only NODENAME CREATE/DELETE, SIF DELETE, HANGER DELETE and qualified RESTRAINT DELETE; unsupported non-KEEP families fail closed.

```text
REMAINING_STRUCTURAL_FAMILY_AUDIT       PASS_SOURCE_INSPECTION
HIDDEN_WRITER2_FAMILY                   NONE_OBSERVED
AMBIGUOUS_GENERIC_FUTURE_WRITER_ROUTE   NONE_OBSERVED
UNKNOWN_FAMILY_BEHAVIOR                 FAIL_CLOSED
```

## 8. Remaining release blockers

The unresolved program gates are execution/release evidence for already-implemented V11 authority:

```text
GATE A  unchanged W2.13 synthetic RESTRAINT product assertions on exact repository bytes
GATE B  retained-real-CII V11 RESTRAINT product runtime
GATE C  inherited V11 Writer2 NODE/SIF/HANGER product/composite regressions
GATE D  Writer1A/1B/1C adjacent regressions + repository npm + browser/product Writer2 gate
GATE E  mature DELETE/cardinality freeze from Gates A-D
GATE H  final Writer2 program verdict
```

Current environment blocker:

```text
native checkout -> FAIL_ENVIRONMENT_DNS
Could not resolve host: github.com
exact executable mirror -> NOT_AVAILABLE_THIS_RUNTIME
```

Source/static closure is not runtime qualification.

## 9. Program-level freeze rule

Final verdict must be exactly one of:

```text
READY_FOR_WRITER2_RELEASE_FREEZE
NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

READY requires all source-qualified V11 Writer2 operations to be implemented and runtime-dispositioned; one-TARGET0/original-coordinate architecture and independent complete-postimage validation must remain intact; adjacent/repository/product gates must be explicit; all unresolved V11 CREATE families must remain fail-closed; no generic FUTURE_WRITER ambiguity or Writer3 topology leakage may remain.

READY does not require inventing source-blocked V11 CREATE semantics.