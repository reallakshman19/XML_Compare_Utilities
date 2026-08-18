# WIP-CII-PROPAGATION — Anchor-seeded CII correspondence propagation

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_WIP_INITIALIZED
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_PHASE5_PROPAGATION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BRANCH: agent/cii-anchor-propagation
REPORT_BASIS_HEAD: 72f6aa9f05ce311e7e825a96d6101faa0ced6902
MAIN_HEAD_LAST_CHECKED: ceb0c0193a4be68b28a913b74bdc453ccf79d336
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984 -> this WIP
APPENDIX_A_STATUS: NOT_REQUIRED_SAME_AGENT_CONTINUATION
GROUNDING_EPOCH: GE-CII-PROP-001
CURRENT_STAGE: BASELINE_AND_PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: PROPAGATING THROUGH AMBIGUOUS OR DUPLICATE TARGET CUSTODY
EXACT_NEXT_ACTION: implement bounded anchor-seeded graph propagation for the one-anchor path, reusing PR984 candidate evidence/winner gaps and stopping at ambiguity.
```

## Mission

Replace the current one-anchor, one-hop incident-edge comparison with bounded graph propagation across the connected CII network.

## Required behavior

- seed from engineer-locked SOURCE↔TARGET anchor;
- propagate node-pair/edge-pair custody through connected topology;
- solve each node frontier as a one-to-one assignment, not independent greedy claims;
- only propagate through candidate evidence that is `SUPPORTED`;
- MEDIUM identity may propagate because it is supported identity even though workflow status remains REVIEW;
- stop at `AMBIGUOUS`, method disagreement, insufficient winner gap, structural conflict, or custody conflict;
- never allow two SOURCE edges/nodes to claim one TARGET edge/node;
- retain audit-visible unresolved frontier evidence;
- if unresolved propagation remains, overall correspondence must fail closed for transfer;
- do not modify multi-anchor unique-path authority in this phase.

## Benchmark targets

The production logic must be capable of reaching distant nodes from one seed rather than relying on node-number offsets. Qualification focus:

- SOURCE 200→205→210 ↔ TARGET1 20200→20205→20210;
- SOURCE 250→255→260→270 ↔ TARGET1 20250→20255→20260→20270;
- later blind TARGET2 uses the 102xx numbering family and redistributed 250-series internal lengths.

## Non-goals

No UI changes, engineering property-delta parser expansion, target CII mutation, parser/converter changes, or benchmark-specific node arithmetic.

# APPENDIX A

NOT_REQUIRED_SAME_AGENT_CONTINUATION. A different future implementation agent must re-ground and qualify before engineering-critical mutation.
