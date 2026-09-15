CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0013
LAST_UPDATED: 2026-09-15
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5683170584
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_INPUT_PATH / REAL_INPUT_NOT_RUN | optional scoped current-side Clash-within-Supports path exists; real 1835 relationship XML unpinned |
| TASK-003 | PASS_THROUGH_LEG_007 | #1216 Support/Steel producer authority untouched |
| TASK-004 | IMPLEMENTED_PENDING_BROWSER_QUALIFICATION | exact zone UI/input path exists |
| TASK-005 | IMPLEMENTED_EXPLICIT_PLUS_FALLBACK | topology + reconciliation + count + orphan fallback complete |
| TASK-006 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | conservative orphan recovery complete and release-hardened |
| TASK-007 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | count consumes assembly + recovery occurrence IDs; field provenance aligned |
| TASK-008 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | `RELATIONSHIP_TOPOLOGY_V1` + conservative `TypicalityConsensusV1` added independently |
| TASK-009 | IN_PROGRESS | focused controls committed; runner/browser/real suite NOT_RUN |
| TASK-010 | IN_PROGRESS | PR #1223 remains draft/open/mergeable; Owner-only merge; no authorization |

# Completed material legs

- LEG-001 explicit member topology.
- LEG-002 topology/location reconciliation.
- LEG-003 final assembly count projection.
- LEG-004 exact zone scope + optional relationship XML UI/input.
- LEG-005 conservative orphan recovery.
- LEG-006 release hardening.
- LEG-007 independent `RELATIONSHIP_TOPOLOGY_V1` + conservative consensus.

LEG-007 material receipt: `agents/chains/SUPPORT-PRIMARY-1222/material-legs/LEG-007.md`.
Material head: `a42a3e12cb6369b8c26f02a593ef0264860e3501`.

# LEG-007 result

Relationship topology decision contract:
- complete explicit authority both sides + exact intrinsic signature -> `MATCH`;
- complete explicit authority + material difference -> `NO_MATCH`;
- partial explicit authority -> `REVIEW`;
- missing explicit authority on either side -> `UNAVAILABLE`.

Consensus behavior:
- structural/location candidate + same relationship candidate -> agreement / higher confidence;
- structural/location candidate + relationship `UNAVAILABLE` -> retain candidate with reduced confidence;
- structural/location candidate + informed relationship contradiction -> `REVIEW / CONFLICT`;
- relationship-only match does not promote structural rejection/ambiguity in this conservative integration.

The existing `support-report-typicality.js` structural matcher was not modified in LEG-007.

# Benchmark/oracle ledger

Expected support counts remain PS-11167=6, PS-11236=4, PS-12060=1, PS-12877=4, PS-12860=6, PS-12120=14. The 11168->14168 structural positive control remains protected.

Real relationship-topology qualification remains limited because the reference side currently has no dedicated Clash-within-Supports relationship input and the real 1835 relationship XML remains unpinned.

# Validation truth

PASS by source/material review:
- LEG-007 stayed inside EP-0012 boundary;
- structural matcher implementation unchanged;
- missing topology is `UNAVAILABLE`, not mismatch;
- informed contradiction is fail-visible;
- relationship-only match cannot override structural rejection;
- cache routing reaches bootstrap -> addon -> projection;
- PR #1223 draft/open/mergeable at closeout;
- no unresolved review threads.

Review record: COMMENT review `5212200167`; no approval or change-request review.

NOT_RUN:
- committed Node tests under an executing runner;
- browser/deployed qualification;
- ZIP benchmark execution;
- real two-sided relationship-topology benchmark;
- real PS-11167/PS-11236 relationship qualification.

Infrastructure at material head `a42a3e12...`:
- qualification run `34989138496` -> focused-node/browser jobs `steps=null`;
- ZIP run `34989137742` -> benchmark job `steps=null`.

# Next bounded work

LEG-008 should implement **Axis Typicality V1** as a third independent evidence channel only after a new prework endpoint is frozen.

Required invariants:
- no raw global axis-vector comparison across XMLs;
- use intrinsic relative descriptors: relative axis angles, axial/lateral spacing, traversal/return topology, DN-normalized ratios;
- ambiguous/insufficient axis evidence => `UNAVAILABLE`;
- do not modify the existing structural matcher scoring/gates;
- Axis Typicality alone must not promote a structural rejection in first integration;
- integrate above channels through consensus only.

# Exact next action

Create LEG-008 prework endpoint for Axis Typicality V1 before any product mutation. No merge.