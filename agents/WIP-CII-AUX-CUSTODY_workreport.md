# WIP-CII-AUX-CUSTODY — CII auxiliary custody + benchmark qualification

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_WIP_INITIALIZED
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_PHASE7_AUX_CUSTODY_AND_BENCHMARK
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BRANCH: agent/cii-aux-custody-benchmark
REPORT_BASIS_HEAD: 2e84648cb0dfd71ef304be744ea7e2dcb3f3e35f
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984 -> PR985 -> PR986 -> this WIP
GROUNDING_EPOCH: GE-CII-AUX-001
CURRENT_STAGE: SOURCE_AUTHORITY_AND_PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: MISASSOCIATING AUXILIARY RECORDS WITH ELEMENTS OR INVENTING CAESAR SEMANTICS
EXACT_NEXT_ACTION: implement CII-Workspace auxiliary-pointer custody from ELEMENT rows 12-14, source-qualified restraint line1 semantics, bounded SIF/TEE raw records, rigid-record custody, and benchmark assertions. Do not enable target mutation.
```

## Source authority established

Protected writer `3D_Converters/converters/scripts/inputxml_to_cii2019.py` establishes:

- generic fixed rows use widths `[15,13,...]`;
- ELEMENT row12 auxiliary pointer order = bend, rigid, expjt, restraint, displmnt, forcmnt;
- ELEMENT row13 order = uniform, wind, offset, allowbl, SIF&TEES, NODENAME;
- ELEMENT row14 order = reducer, flange, equipment;
- RESTRANT slot is 4 lines; line1 = node, type, stiffness, gap, friction, connecting node; line2 = x/y/z direction cosines; lines3/4 = tag/GUID;
- rigid payload is indexed and pointer-bound to the element; the RIGID record is not a node identifier.

Benchmark evidence already confirms SOURCE `130` restraint code 15 / friction 0 and TARGET1 `20130` code 9 / friction 0.3. `113→116` changes rigid pointer `9→11`, proving current section-only rigid parsing is not sufficient for element custody.

## Scope

- CII-Workspace-specific parsing/custody of ELEMENT auxiliary pointers;
- source-qualified restraint record parser with gap/friction fields;
- source-qualified rigid record index custody;
- bounded SIF&TEES raw record/index custody sufficient to report record changes without inventing unqualified field names;
- update Compare Review delta output to use qualified auxiliary custody;
- benchmark qualification runner/oracle assertions for TARGET1 and TARGET2 where evidence is authoritative.

## Non-goals

No protected-writer changes, no node-offset identity rule, no M1/M2/propagation retuning, no target-CII mutation, and no hanger semantic implementation unless its MISCEL_1 custody can be established without ambiguity.

# APPENDIX A

NOT_REQUIRED_SAME_AGENT_CONTINUATION. Future takeover requires re-grounding before engineering-critical mutation.
