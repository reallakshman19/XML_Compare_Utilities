# PR988 — CII Transfer Preview Qualification Work Report

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTING_STACKED_DRAFT
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: OWNER_GRANTED_IF_ALL_APPROVED_PHASES_COMPLETE_AND_QUALIFIED
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: 988
BRANCH: agent/cii-transfer-preview-qualification
STACKED_BASE_PR: PR987
SCOPE_AUTHORITY: READ_ONLY_TRANSFER_PREVIEW_QUALIFICATION
TARGET_MUTATION_AUTHORITY: BLOCKED
CRITICALITY: ENGINEERING_CRITICAL
CURRENT_STAGE: IMPLEMENT
EXACT_NEXT_ACTION: implement transfer-policy/action classification downstream of approved correspondence/property evidence; keep Stage06 blocked.
```

## Mission

Qualify the read-only transfer preview after correspondence and engineering-delta review. The preview must say what a SOURCE property would do to TARGET without writing CII text.

## In scope

- transfer family policy;
- COPY / CREATE / DELETE / KEEP / BLOCKED action classification;
- reviewed/locked correspondence gates;
- restraint/gap/friction, hanger presence, SIF/Tee raw data, node name, rigid weight when source-qualified;
- protected TARGET geometry/node-number/OD/wall/topology policy;
- deterministic audit/export evidence;
- focused and benchmark tests.

## Out of scope / invariants

- no target CII mutation;
- no Stage06 enablement;
- no protected writer edits;
- no M1/M2 or propagation changes;
- no numbering-offset identity;
- no automatic geometry, OD or wall overwrite;
- no semantic names invented for unqualified raw codes.

## Prediction

```text
source == target                 KEEP
source present, target absent    CREATE where family allows
source absent, target present    DELETE only for explicit presence families
source != target                 COPY where family allows
protected TARGET property        KEEP / PROTECTED
family/custody not qualified     BLOCKED
rejected/unbound identity        no transferable operation
```

## Validation plan

- action classifier unit tests;
- stale/rejected review gates;
- protected-property tests;
- benchmark preview: node130 restraint, node205 hanger deletion, node70 SIF raw change, 113-116 rigid weight unchanged;
- assert Stage06 and modified-target export remain blocked.

# APPENDIX A

`NOT_REQUIRED_SAME_AGENT_CONTINUATION`. A different agent must re-ground PR987/988 and the transfer safety boundary before engineering-critical mutation.
