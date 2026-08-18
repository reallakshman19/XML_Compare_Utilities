# WIP-CII-COMPARE-REVIEW — CII Compare Review / Engineering Delta Work Report

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_WIP_INITIALIZED
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_PHASE6_COMPARE_REVIEW
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BRANCH: agent/cii-compare-review-deltas
REPORT_BASIS_HEAD: 0f9dac7a512266c5a83a7d412f19d679c59136ec
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984 -> PR985 -> this WIP
GROUNDING_EPOCH: GE-CII-COMPARE-001
CURRENT_STAGE: BASELINE_AND_PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: ENGINEERING PROPERTY DELTAS ALTERING OR OVERSTATING CORRESPONDENCE AUTHORITY
EXACT_NEXT_ACTION: build downstream engineering-delta model, capability-aware summary, then Tab 2 review UI. Do not mutate identity or target CII.
```

## Mission

Implement Phase 6 Compare Review as a read-only consumer of qualified correspondence.

## Non-negotiable rules

- correspondence identity is upstream authority and cannot be recomputed from property deltas;
- identity confidence and engineering change severity are separate fields;
- compare only qualified normalized/raw evidence;
- unsupported/unparsed families remain `NOT_PARSED`/`PARTIAL`, never zero or unchanged;
- restraint code/raw numeric rows may be compared; friction/gap semantic labels require separate parser qualification;
- Stage06 target mutation remains blocked.

## Intended output

- engineering delta rows by family;
- Compare Review executive summary;
- correspondence grid exposing M1, M2, OD, WT, confidence, winner gap and decisions;
- evidence inspector with alternatives/custody evidence;
- engineering delta grid;
- capability limitations for Hanger/SIF/Line/friction semantics.

# APPENDIX A

NOT_REQUIRED_SAME_AGENT_CONTINUATION. Future takeover requires re-grounding before engineering-critical mutation.
