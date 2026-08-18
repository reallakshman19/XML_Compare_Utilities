# WIP — CII Transfer Preview Qualification

```text
REPOSITORY: reallaksh19/XML_Compare_Utilities
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
PHASE: 8
MISSION: qualify read-only SOURCE->TARGET transfer preview semantics after correspondence/property review
BRANCH: agent/cii-transfer-preview-qualification
STACKED_BASE: agent/cii-aux-custody-benchmark / PR987
MERGE_AUTHORITY: OWNER_GRANTED_IF_ALL_APPROVED_PHASES_COMPLETE_AND_QUALIFIED
TARGET_MUTATION_AUTHORITY: BLOCKED
```

## Objective

Create an auditable transfer-preview contract that answers exactly what an approved SOURCE property would do to TARGET while preserving protected TARGET geometry, OD, wall, numbering, and topology by default.

## Scope

In scope:

- transfer family policy;
- operation classification COPY / CREATE / DELETE / KEEP / BLOCKED;
- reviewed/locked correspondence gates;
- source/target property custody;
- preview-only restraint/gap/friction, hanger presence, SIF/Tee raw data, node name, and rigid weight where source-qualified;
- P1/T1 remains partial and opt-in/blocked by default unless explicitly qualified;
- protected-difference reporting;
- tests and audit evidence.

Out of scope:

- writing/modifying CII text;
- enabling Stage06;
- changing M1/M2, winner gap, propagation or benchmark policy;
- transferring geometry, node numbers, OD or wall by default;
- inventing semantic labels for unqualified SIF/tee codes or restraint type descriptions.

## Prediction

For a reviewed identity:

```text
same value              -> KEEP
source present/target absent -> CREATE or COPY depending family representation
source absent/target present -> DELETE only for explicitly transferable presence families
source != target         -> COPY
protected property delta -> KEEP/PROTECTED, never overwrite by default
unqualified family       -> BLOCKED
unresolved/rejected identity -> no transferable operation
```

## Validation plan

1. focused operation-classification tests;
2. stale review / rejected correspondence fail-closed tests;
3. protected geometry/OD/wall tests;
4. benchmark preview assertions for node130 restraint, node205 hanger deletion, node70 SIF/Tee raw change, 113-116 unchanged rigid weight;
5. verify Stage06 and modified-target export remain blocked.

## Exact next action

Allocate a draft PR, replace this WIP with PR recovery artifacts, then implement transfer policy without adding any target writer.
