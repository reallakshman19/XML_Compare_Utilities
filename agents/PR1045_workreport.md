# PR1045 work report — Writer2 W2.12 RESTRAINT one-TARGET0 composite adoption

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: ACTIVE
EXECUTION_MODE: AUTO_MODE
REPOSITORY: reallaksh19/XML_Compare_Utilities
ISSUE: #1044
PR: #1045 (expected successor PR)
BRANCH: agent/cii-writer2-restraint-composite-w212
BASE_MAIN: b2ba46cb8008c8d59a40fe8b3260ead122e063d0
MERGED_PREDECESSOR: PR #1043 / W2.11
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PRODUCT_CORE_AUTHORITY: FALSE
GENERIC_RESTRAINT_CREATE: BLOCKED
```

## Mission

Adopt W2.11 RESTRAINT block DELETE into the existing Writer2 one-original-preimage composite while preserving the established NODE_NAME, SIF DELETE and HANGER DELETE families.

All component writers must derive claims from the same untouched TARGET0. No shifted-offset sequential mutation is allowed.

## Intended architecture

```text
parent bound scope
  -> canonical existing-family child scope -> current NODE/SIF/HANGER composite dry-run from TARGET0
  -> canonical RESTRAINT child scope        -> W2.11 restraint dry-run from TARGET0
  -> collect TARGET0-relative claims
  -> global exact-preimage/overlap arbitration
  -> splice TARGET0 once
  -> independent complete-postimage validation
```

## Authority boundary

Allowed:

```text
new composite-restraint adapter
new independent composite-restraint validator
new focused qualification fixtures/tests
coordination files
```

Not allowed in W2.12:

```text
cii-workspace-core product adoption
UI/browser adoption
plan-routing policy adoption
Writer1B changes
RESTRAINT CREATE/new-block allocation
GUID/default/type synthesis
SIF CREATE
HANGER CREATE
Writer3 topology
```

## Required claim families

```text
existing composite:
  WRITER_2_NODENAME
  WRITER_2_SIF_DELETE
  WRITER_2_HANGER_DELETE_ALL
  WRITER_2_HANGER_PARTIAL_DELETE

new:
  WRITER_2_RESTRAINT_BLOCK_DELETE
```

W2.11 restraint claims admitted:

```text
CONTROL_RESTRAINT_BLOCK_COUNT
ELEMENT_RESTRAINT_POINTER
RESTRAINT_SECTION_PAYLOAD
```

## Validation invariant

```text
expectedFinalBytes = independent reconstruction(TARGET0, canonical parent scope, qualified planners)
PASS only if actualFinalBytes === expectedFinalBytes
```

Writer mutation/component testimony is checked only after final-byte equality.

## Validation truth

```text
source grounding                                  PASS
branch starts at merged main@b2ba46cb...          PASS
composite writer                                  NOT_IMPLEMENTED
independent composite validator                   NOT_IMPLEMENTED
focused tests                                     NOT_RUN
repository npm test                               NOT_RUN
product/browser                                   NOT_APPLICABLE_W2_12
```

## Changed-file ledger

Current planned paths:

```text
agents/PR1045_workreport.md
agents/status/PR1045.yaml
agents/claims/PR1045.yaml
tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js
tabs/cii-workspace/cii-workspace-writer2-composite-restraint-validation.js
tests/cii-workspace-writer2-composite-restraint-fixture.js
tests/cii-workspace-writer2-composite-restraint.test.js
tests/cii-workspace-writer2-composite-restraint-falsifiers.test.js
```

No unexplained paths are authorized.

## Next gate

Implement writer and validator as independent slices, then execute focused R01-R22 qualification. Keep product/core adoption for W2.13.

## Appendix A — expert takeover gate

1. Why must every component consume the same TARGET0?
2. How must sibling APPLY operations be represented in a canonical child scope?
3. Which CONTROL field owns RESTRAINT count and which nearby field must not be touched?
4. Why can a RESTRANT section-payload replacement coexist with ELEMENT pointer claims?
5. How is cross-family overlap detected before mutation?
6. Why may validator code reuse planner authority but not the new composite Writer helpers?
7. How are HANGER partial claims reconstructed independently when combined with RESTRAINT?
8. Why does generic RESTRAINT CREATE remain blocked?
9. What evidence is component-composite qualification versus product qualification?
10. What exactly must W2.13 add after W2.12 merges?
