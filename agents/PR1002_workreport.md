# PR1002 — CII Writer 1C authority and future upgrade roadmap

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_REVIEW
PR_RECOVERY_STATE: DRAFT_DOCUMENTATION_COMPLETE
WORK_INTENT: DESIGN_AUTHORITY / ROADMAP
CRITICALITY: ENGINEERING_CRITICAL_WRITER_AUTHORITY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: 1002
IMPLEMENTATION_ISSUE: 1003
BRANCH: agent/cii-writer-1c-roadmap
BASE_AT_GROUNDING: main@5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PREDECESSOR: PR1001 merged -> 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: DOCUMENTATION / IMPLEMENTATION CONTRACT
CURRENT_BLOCKER: NONE FOR DOCUMENT REVIEW; WRITER 1C IMPLEMENTATION IS OWNED BY ISSUE #1003
EXACT_NEXT_ACTION: owner review PR1002; Writer 1C agent must answer Issue #1003 expert-qualification questions before coding; do not merge PR1002 without owner authorization
```

## Handover in 60 seconds

PR1002 changes documentation only. It freezes the Writer 1C boundary before implementation:

```text
Writer 1C = pointer-stable + row-count-stable mutation
            of already-existing auxiliary records
```

It is **not** a catch-all for Writer 1B blockers.

Implementation is delegated to **Issue #1003**, which contains the detailed source-level plan, anti-drift test matrix, Definition of Done, and three mandatory expert-qualification questions.

First planned slice:

```text
existing-row NODENAME field mutation
```

Second planned slice:

```text
existing SIF/TEE 10-row block fields
ONLY after authoritative field-semantic mapping
```

Hanger mutation, pointer allocation/reindexing, auxiliary record creation/deletion, CONTROL count changes, and topology changes are explicitly outside Writer 1C.

---

# 1. Ground truth

At grounding:

```text
main = 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PR1001 = MERGED
PR1002 = OPEN / DRAFT
Issue1003 = OPEN / WRITER_1C_IMPLEMENTATION
branch = agent/cii-writer-1c-roadmap
production-code changes = 0
```

Live GitHub state overrides this snapshot.

---

# 2. Source findings driving the roadmap

## 2.1 NODENAME

`tabs/cii-workspace/cii-workspace-nodename.js` currently establishes:

```text
ELEMENT block rows                  15
NODENAME pointer row                13 zero-based within ELEMENT block
pointer field                       sixth integer
NODENAME FROM slice                 [2,28)
NODENAME TO slice                   [28,53)
```

Current capability can be QUALIFIED when conflicts are absent. Transfer policy can classify a NodeName COPY proposal, but Writer 1B does not own NODENAME physical mutation. This is the cleanest Writer 1C first slice.

## 2.2 SIF / TEE

`tabs/cii-workspace/cii-workspace-auxiliary.js` currently establishes:

```text
SIF/TEE block = 10 rows
ELEMENT SIF/TEE pointer = 1-based block index
existing block ownership = pointer-bound
```

However the same evidence explicitly states:

```text
FIELD_2_SEMANTICS_UNQUALIFIED
```

Therefore Writer 1C may not copy a raw SIF payload merely because block ownership is known. A source-qualified field map is a prerequisite.

## 2.3 Hangers

`tabs/cii-workspace/cii-workspace-hanger.js` proves node presence/count from:

```text
CONTROL.NOHGRS + MISCEL_1.IHGRNODE
```

It intentionally does not normalize HGRDAT/TAG/GUID/other hanger attributes and recognizes multiple physical MISCEL_1 layouts. Hanger creation/deletion shifts packed arrays and CONTROL/cardinality. This is Writer 2, not Writer 1C.

---

# 3. Writer 1C structural gates

Every 1C operation must satisfy all of these:

```text
TARGET auxiliary row/block already exists
AND pointer value remains unchanged
AND pointer index remains unchanged
AND section row count remains unchanged
AND CONTROL counts remain unchanged
AND no record is inserted/deleted/reordered
AND no element/node/connectivity is created/deleted/renumbered
AND exact record ownership is proven
AND exact field semantics or byte-slice custody is source-qualified
AND mutation is explicitly APPLY in the bound transfer scope
```

Failure of any gate keeps the operation in Writer 2/3 territory.

Writer 1C must compose lower writers rather than duplicate them:

```text
Writer 1C
  -> delegate Writer-1A operations to Writer 1A
  -> delegate Writer-1B operations to Writer 1B
  -> patch only Writer-1C-qualified operations itself
```

---

# 4. Mandatory first slice — existing NODENAME rows

Conservative initial authority:

```text
existing TARGET NODENAME pointer > 0
existing referenced TARGET row exists
pointer ownership is exact
SOURCE/TARGET identity is bound
SOURCE desired name fits exact field width
operation is APPLY
patch in place
pointer unchanged
row count unchanged
```

Creation/deletion stays Writer 2.

Expected fail-closed blockers include:

```text
WRITER_1C_NODENAME_POINTER_REQUIRED
WRITER_1C_NODENAME_ROW_OUT_OF_RANGE
WRITER_1C_NODENAME_LAYOUT_DRIFT
WRITER_1C_NODENAME_FIELD_OVERFLOW
WRITER_1C_NODENAME_PREIMAGE_MISMATCH
WRITER_1C_NODENAME_SHARED_RECORD_CONFLICT
WRITER_1C_NODENAME_CREATE_REQUIRES_WRITER_2
WRITER_1C_NODENAME_RECORD_DELETE_REQUIRES_WRITER_2
```

A shared NODENAME row requires canonical post-state planning. Two operations claiming the same physical field with different desired values must block; last-writer-wins is prohibited.

---

# 5. Planned second slice — existing SIF/TEE fields

Before enabling any SIF/TEE field, establish an authoritative field map containing at minimum:

```text
section
block row
field or byte-column span
numeric/text format
engineering meaning
unit basis where applicable
zero/blank semantics
allowed domain
pointer ownership
preimage expectation
```

Only same-block, same-pointer, same-row-count in-place edits may enter Writer 1C.

Explicitly Writer 2:

```text
record CREATE
record DELETE
new 10-row block allocation
pointer renumbering
section compaction/expansion
CONTROL count change
```

---

# 6. Anti-drift qualification

For every Writer 1C mutation, prove structural invariants:

```text
physical line count unchanged
line-ending style unchanged
section order unchanged
ELEMENT block count unchanged
ELEMENT block row count unchanged
all ELEMENT pointers unchanged
CONTROL values unchanged
NODENAME row count unchanged
SIF/TEE row count unchanged
RESTRANT row count unchanged
RIGID row count unchanged
MISCEL_1 row count unchanged
node count unchanged
element count unchanged
connectivity unchanged
```

Writer 1C must emit exact mutation claims:

```text
lineNumber
startColumn
endColumn
beforeField
afterField
operationId
section
record identity
field identity
```

Then qualification must assert:

```text
ALL bytes outside claimed spans are identical
```

A CII file that reparses successfully but changes an unrelated byte/pointer/count is a FAIL.

Preimage must be re-read before patch. Pointer/index/element ownership from preview must still match at apply time. No nearest-row or best-effort fallback is allowed.

At least one independent oracle is required per Writer-1C family. Production Writer helpers may not calculate the expected output for the same oracle.

---

# 7. Future phases

```text
Phase 0  close retained PR1001 / shell / browser qualification debt
Phase 1  Writer 1C existing NODENAME rows
Phase 2  Writer 1C existing SIF/TEE fields after semantic map
Phase 3  optional existing auxiliary text fields after separate qualification
Phase 4  Writer 2 pointer/cardinality transaction engine
Phase 5  Writer 3 topology transaction engine
Phase 6  mutation manifest / rollback / batch automation
```

Writer 2 must be a relocation transaction engine, not a set of local pointer patches. Writer 3 must own node/element/connectivity changes.

---

# 8. Implementation issue

**Issue #1003 — `CII Writer 1C: pointer-stable auxiliary-record mutation with anti-drift qualification`** is the authoritative implementation handoff.

It requires the next agent to answer three expert-screening questions before coding:

1. shared NODENAME physical-span conflict/arbitration;
2. SIF/TEE physical custody versus unqualified semantic authority;
3. byte-level anti-drift falsifier where a requested edit succeeds but an unrelated pointer changes.

Generic prose is insufficient; the answers must identify source paths, blocker behavior, physical invariants, and falsifying tests.

---

# 9. Changed-file ledger

Expected PR1002 final files:

```text
agents/MASTER_INDEX.md
agents/PR1002_workreport.md
agents/claims/PR1002.yaml
agents/status/PR1002.yaml
docs/CIIcompareconceptnote.md
```

No production code should appear in this PR.

---

# 10. Validation truth

```text
main grounding: PASS_SOURCE_INSPECTION
Writer 1C source-boundary audit: PASS_SOURCE_INSPECTION
documentation diff: PASS_GIT_COMPARE
Issue #1003 implementation handoff: CREATED
production code execution: NOT_APPLICABLE
browser execution: NOT_APPLICABLE
Writer 1C tests: NOT_APPLICABLE_TO_DOC_PR
```

---

# Appendix A — expert handover questionnaire

1. Why is Writer 1C defined by pointer/row-count stability rather than by engineering family name?
2. Why can NODENAME be a first 1C slice while SIF/TEE raw field 2 cannot yet be writable?
3. Which invariant makes a parseable but unrelated-pointer-changing output a failed Writer 1C result?
4. Why are hanger creation/deletion and SIF block creation Writer 2 concerns?
5. How must Writer 1C compose Writer 1A/1B without duplicating their whitelist logic?
6. What exact evidence is needed to turn one SIF/TEE field from PARTIAL raw evidence into writable authority?
7. What prevents two shared-record operations from silently overwriting one another?
8. What independent oracle is appropriate for NODENAME fixed-column mutation?
9. What happens when preview pointer/index ownership no longer matches apply-time TARGET?
10. What future capability belongs in Writer 3 rather than Writer 2?
