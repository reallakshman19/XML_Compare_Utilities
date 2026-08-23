# PR1029 — partial H>1 HANGER one-TARGET0 composite adoption

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1028
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1028
PR: #1029
BRANCH: agent/cii-writer2-hanger-partial-composite
BASE_MAIN: e9a28071aa932e5c360206d20807aeaf2e4f9517
GROUNDING_EPOCH: GE-1029-001
CURRENT_STAGE: GROUNDED_PRE_IMPLEMENTATION
CURRENT_BLOCKER: NONE
EVIDENCE_LIMITATION: NO_REAL_REPOSITORY_H_GT_1_CII_PREIMAGE
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

## Mission

Adopt merged PR1027 partial H>1 HANGER physical claims into the existing one-original-preimage Writer2 composite. Product/core routing, browser/UI enablement, and real H>1 product qualification remain a later separate PR.

## Ground truth

```text
PR1027 accepted head  457a2c4572c0773cdf1cd2e15fa36f6a3e305638
PR1027 merge/main     e9a28071aa932e5c360206d20807aeaf2e4f9517
PR1029 base           e9a28071aa932e5c360206d20807aeaf2e4f9517
PR1029 initial head   45041903216ca9725103f6e07150f8425f84d092
relation              1 ahead / 0 behind at allocation
```

No open PR found claiming the Issue1028 composite-HANGER authority. PR1007 is Writer1C custody and does not overlap this production authority.

## Existing composite architecture

`tabs/cii-workspace/cii-workspace-writer2-composite-hanger.js` currently composes from one untouched TARGET0:

```text
WRITER_2_NODENAME
WRITER_2_SIF_DELETE
WRITER_2_HANGER_DELETE_ALL
```

Each component writer dry-runs against TARGET0, exposes original-coordinate claims, the composite rejects overlap, and all accepted claims are applied in one pass.

`tabs/cii-workspace/cii-workspace-writer2-composite-hanger-validation.js` independently rebuilds the same three family claims and requires exact complete-postimage byte equality.

## ISS-1029-001 — legacy family projection is not canonical enough for PR1027 partial writer

Current `projectTransferPlan()`:

```text
family APPLY rows remain operations/APPLY
sibling parent APPLY rows move to excludedOperations/EXCLUDE
parent transferScope is retained unchanged
```

This was sufficient for older component writers. Merged PR1027 partial HANGER intentionally requires exact equality between projected operation containers and BOUND scope APPLY/EXCLUDE/candidate sets.

Therefore a direct call to `applyCiiWriter2HangerPartialDelete()` using the legacy composite projection would fail canonical scope custody whenever sibling family APPLY operations exist.

### Decision DEC-1029-001

Do not weaken PR1027 scope gates. Preserve parent BOUND scope separately and derive a canonical HANGER family subscope for partial deletion.

Required projected partial-HANGER transaction:

```text
operations
  KEEP rows + HANGER APPLY rows

excludedOperations
  original EXCLUDE rows + sibling parent APPLY rows rewritten EXCLUDE

transferScope
  status/authority canonical BOUND
  source/target hashes inherited exactly
  appliedOperationIds  = HANGER family APPLY IDs
  excludedOperationIds = original excluded IDs + sibling parent APPLY IDs
  candidateOperationIds = exact union
  scopeId = deterministic child identity derived from parent scope/family

familyProjection
  explicit parent scope lineage
  parent applied IDs
  projected applied IDs
  sibling applied IDs
  projected child scope ID
```

## Required HANGER dispatch

Use `buildCiiWriter2HangerDeletePlan()` as planner authority on the family projection.

```text
plan.compaction.deleteAll == true && countAfter == 0
  -> existing applyCiiWriter2HangerDeleteAll() unchanged

plan.compaction.partialMultiRecordDelete == true
&& countBefore > 1
&& 0 < countAfter < countBefore
  -> applyCiiWriter2HangerPartialDelete()

anything else
  -> fail closed
```

HANGER CREATE/value editing remain blocked.

## Composite invariants

```text
one untouched TARGET0
parent canonical APPLY/EXCLUDE custody retained
all family claims are original-coordinate TARGET0 claims
partial HANGER authority family distinct from delete-all
no sequential mutation through intermediate files
claim overlap fails closed
one final claim application pass
product/core route unchanged
```

## Independent validation requirement

The composite validator must independently reconstruct partial-HANGER claims from TARGET0 + parent scope + planner/record-binding authority. It must not import/call PR1027 Writer payload/repacking helpers and must not use the partial Writer result as oracle.

Expected partial claims:

```text
CONTROL_HANGER_COUNT
MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
```

The complete expected composite postimage must include sibling NODENAME/SIF claims before exact byte comparison.

## Current evidence truth

```text
PR1027 component authority                         MERGED
PR1027 source inspection evidence                  RETAINED
PR1027 exact native runtime                        NOT_RUN_ENVIRONMENT
real repository H>1 source                         NOT_AVAILABLE
Issue1028 product/core qualification               OUT_OF_SCOPE
PR1029 implementation runtime                      NOT_RUN_NOT_IMPLEMENTED
```

## Initial intended changed-file ledger

```text
tabs/cii-workspace/cii-workspace-writer2-composite-hanger.js
tabs/cii-workspace/cii-workspace-writer2-composite-hanger-validation.js
tests/cii-workspace-writer2-composite-hanger.test.js
agents/PR1029_workreport.md
agents/status/PR1029.yaml
agents/claims/PR1029.yaml
agents/MASTER_INDEX.md
```

A new focused test path may be added only if the existing composite test becomes materially overloaded.

## Exact next action

Implement canonical partial-HANGER family subscope derivation and delete-all/partial dispatch in `cii-workspace-writer2-composite-hanger.js`, add writer-side focused falsifiers, then freeze that slice before extending the independent composite validator.

# APPENDIX A — TAKEOVER QUALIFICATION

1. Trace the current one-TARGET0 HANGER composite from parent transfer scope through family projection, component writer claims, arbitration and final splice.
2. Explain exactly why the legacy family projection is accepted by the delete-all path but cannot satisfy PR1027 partial-HANGER canonical-scope custody with sibling APPLY operations.
3. Define the child partial-HANGER BOUND scope sets from a parent containing NODENAME + SIF DELETE + HANGER DELETE, including original exclusions.
4. Explain how to classify delete-all versus partial without weakening `applyCiiWriter2HangerDeleteAll()`.
5. Design an independent composite falsifier where partial HANGER bytes are correct but a sibling claim overlaps its MISCEL_1 span; state the expected fail-closed boundary.

Threshold: total >=92/100 and each >=17/20 for engineering-critical takeover.
