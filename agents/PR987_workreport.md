# PR987 — CII auxiliary custody and benchmark qualification Work Report

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_DRAFT_ACTIVE
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_PHASE7_AUX_CUSTODY_AND_BENCHMARK
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR_OR_WIP: PR987
BRANCH: agent/cii-aux-custody-benchmark
STACKED_BASE_PR: PR986
STACKED_BASE_HEAD: 2e84648cb0dfd71ef304be744ea7e2dcb3f3e35f
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984 -> PR985 -> PR986 -> PR987
GROUNDING_EPOCH: GE-987-001
CURRENT_STAGE: SOURCE_AUTHORITY_AND_IMPLEMENTATION
CURRENT_BLOCKER: NONE
HIGHEST_RISK: AUXILIARY RECORD MIS-CUSTODY OR FALSE CAESAR SEMANTICS
EXACT_NEXT_ACTION: implement fixed-layout ELEMENT auxiliary pointer descriptors and qualified RESTRANT/RIGID/SIF record custody, then wire downstream engineering deltas and benchmark tests.
```

## Source authority

Protected writer authority inspected at `reallaksh19/3D_Converters/converters/scripts/inputxml_to_cii2019.py`:

- `_row()` widths are `[15] + [13] * remaining`;
- 15-row ELEMENT block;
- row12 pointer slots: bend, rigid, expjt, restraint, displmnt, forcmnt;
- row13 pointer slots: uniform, wind, offset, allowbl, SIF&TEES, NODENAME;
- row14 pointer slots: reducer, flange, equipment;
- RESTRANT block uses six 4-line slots; line1 = node/type/stiffness/gap/friction/connecting-node; line2 = x/y/z cosines; lines3/4 tag/GUID;
- RIGID payload is indexed by ELEMENT rigid pointer and first numeric value is the writer's rigid weight.

## Benchmark observations

- SOURCE node `130`: restraint code 15, friction 0.0.
- TARGET1 node `20130`: restraint code 9, friction 0.3.
- TARGET1 has a SIF&TEES record at node `20070` with raw code 5; SOURCE has node `70` with raw code 3.
- SOURCE `113→116` element row12 rigid pointer is 9; TARGET1 `20113→20116` rigid pointer is 11. The current generic `parseRigids()` treats RIGID record fields as node/mass and therefore cannot establish element weight custody correctly.

## Scope

1. CII Workspace auxiliary descriptors from raw ELEMENT blocks.
2. Fixed-field source-qualified RESTRANT records including gap/friction.
3. RIGID record-by-index custody and weight comparison.
4. SIF&TEES record-by-index raw comparison; only fields with proven semantics receive semantic labels.
5. Compare Review delta integration.
6. TARGET1/TARGET2 benchmark assertions where oracle evidence is source-qualified.

## Non-goals

No generic parser rewrite unless separately justified, no protected-writer edit, no M1/M2/propagation policy retuning, no node-offset identity, no target CII mutation. Hanger remains unresolved unless MISCEL_1 node/record custody is proven.

## Validation

All PR987 runtime checks: NOT_RUN at GE-987-001. Source-authority inspection PASS.

# APPENDIX A

NOT_REQUIRED_SAME_AGENT_CONTINUATION. A future different implementation agent must re-ground and qualify before engineering-critical mutation.
