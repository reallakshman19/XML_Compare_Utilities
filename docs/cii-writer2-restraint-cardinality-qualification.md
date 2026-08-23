# Writer2 W2.9 — RESTRAINT cardinality qualification

```text
SOURCE_TASK: Issue #1038
BASE_MAIN: ff9d706796e42a43ebfb1c74696350e9b8cc695b
MODE: SOURCE_QUALIFICATION_AND_PLANNER_GATE
PHYSICAL_WRITER_AUTHORITY: FALSE
COMPOSITE_PRODUCT_AUTHORITY: FALSE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
```

## Starting live authority

Current main already distinguishes fixed-capacity restraint-slot work from true cardinality work.

### Writer1B fixed-capacity ownership

`tabs/cii-workspace/cii-workspace-restraint-slot-transfer.js` defines six four-row slots per existing block:

```text
SLOTS = 6
ROWS_PER_SLOT = 4
ROWS_PER_BLOCK = 24
```

Writer1B may create into a clean existing free slot or clear an existing qualified slot without changing section/block cardinality. W2.9 must not absorb this authority.

### Physical block custody

`tabs/cii-workspace/cii-workspace-auxiliary.js` establishes:

```text
ELEMENT restraint pointer = 1-based 24-row RESTRANT block index
RESTRANT block = 6 slots × 4 rows
occupied slot = 2 numeric rows + TAG row + GUID row
```

Current parsed occupied-slot fields are node, type code, stiffness, gap, friction, connecting node, three direction cosines, TAG and GUID.

### Current Writer2 boundary

`tabs/cii-workspace/cii-workspace-writer2-composite-routing.js` still states:

```text
restraintCardinality = BLOCKED_WRITER_2_COMPOSITE
```

This blocker remains unchanged during W2.9.

## W2.9 decision gate

A planner may be authored only after source authority proves, without observation-only inference:

1. the exact unit represented by `CONTROL.RESTRANT`;
2. complete legal 24-row block construction and unused-slot representation;
3. new-block allocation/index policy;
4. empty-block deletion/compaction policy;
5. all pointer relocation consequences, including aliases/shared pointers;
6. TAG/GUID CREATE semantics;
7. edition/layout guard.

Final verdict must be one of:

```text
READY_FOR_WRITER2_RESTRAINT_CARDINALITY_PLANNER
NOT_READY_FOR_WRITER2_RESTRAINT_CARDINALITY_PLANNER
```

If READY, physical writer authority still remains false.
