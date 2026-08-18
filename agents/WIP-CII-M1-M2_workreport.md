# WIP-CII-M1-M2 — CII M1 Spatial / M2 Network evidence Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_WIP_INITIALIZED
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_M1_M2_EVIDENCE_PHASE
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Phase 4 — differentiate M1 Spatial and M2 Network/Gang correspondence evidence
PR_OR_WIP: WIP-CII-M1-M2
BRANCH: agent/cii-m1-m2-evidence
REPORT_BASIS_HEAD: 070ef9038a9fc2af87a1e7a49b0e8f600d98d3ba
MAIN_HEAD_LAST_CHECKED: ceb0c0193a4be68b28a913b74bdc453ccf79d336
STACKED_DEPENDENCY: PR982 -> PR983 -> this WIP
APPENDIX_A_STATUS: NOT_REQUIRED_SAME_AGENT_CONTINUATION
GROUNDING_EPOCH: GE-CII-M1M2-001
CURRENT_STAGE: BASELINE_AND_PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: COMBINING M1/M2 INTO ONE SCORE OR ALLOWING OD/WT TO ESTABLISH IDENTITY
EXACT_NEXT_ACTION: isolate M1 spatial and M2 network evidence, remove OD from network topology token, remove OD/WT hard identity blockers, add decision-matrix regressions.
```

## 2. Handover in 60 Seconds

Current `cii-workspace-evidence.js` mixes topology, neighbourhood, path sequence, length, OD, wall and registered geometry into one score and hard-blocks candidates for OD/WT deltas. `cii-workspace-topology-adapter.js` also embeds OD in neighbourhood tokens. This conflicts with the approved concept: M1 asks where the item is; M2 asks where it sits in the connected network; OD/WT are independent supporting evidence and may change between revisions.

No production change has been made on this branch yet.

## 3. Scope

In scope:
- explicit M1 Spatial evidence using 3D Euclidean distance;
- explicit M2 Network evidence using topology/neighbourhood/path structure without OD in gang identity tokens;
- independent OD and wall evidence at ±10% defaults;
- fusion status matrix: PASS/PASS, PASS/FAIL, FAIL/PASS, FAIL/FAIL, and method disagreement;
- preserve target custody and winner-gap machinery;
- focused unit regressions including 205 moved-node and 250-series size-change concepts.

Out of scope:
- anchor-seeded BFS propagation;
- Tab 2 UI;
- transfer mutation;
- parser/converter changes;
- target-number offset identity rules.

## 4. Authority / invariants

- M1/M2 identity must be established independently of OD/WT.
- Same OD/WT alone must never establish identity.
- M1 distance uses Euclidean norm, not independent axis boxes.
- M2 topology tokens must not contain OD/WT.
- Existing one-to-one target custody and winner-gap behavior remains authoritative.
- Stage06 remains blocked.

## 5. Current validation

All Phase 4 runtime validations: NOT_RUN.
Baseline source inspection: PASS / SOURCE_INSPECTION.

# APPENDIX A

NOT_REQUIRED_SAME_AGENT_CONTINUATION. A future takeover agent must re-ground and qualify before engineering-critical mutation.
