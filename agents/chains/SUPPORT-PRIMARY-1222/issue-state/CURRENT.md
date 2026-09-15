CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0015
LAST_UPDATED: 2026-09-15
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5683900993
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: 5683905631

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_INPUT_PATH / REAL_INPUT_NOT_RUN | optional scoped current-side Clash-within-Supports path exists; real 1835 relationship XML unpinned |
| TASK-003 | PASS_THROUGH_LEG_008 | #1216 Support/Steel producer authority untouched |
| TASK-004 | IMPLEMENTED_PENDING_BROWSER_QUALIFICATION | exact zone UI/input path exists |
| TASK-005 | IMPLEMENTED_EXPLICIT_PLUS_FALLBACK | topology + reconciliation + count + orphan fallback complete |
| TASK-006 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | conservative orphan recovery complete and release-hardened |
| TASK-007 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | count consumes assembly + recovery occurrence IDs; field provenance aligned |
| TASK-008 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | independent `RELATIONSHIP_TOPOLOGY_V1` + consensus complete |
| TASK-009 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | independent `AXIS_TYPICALITY_V1` + three-channel consensus complete |
| TASK-010 | IN_PROGRESS | PR #1223 remains draft/open/mergeable; Owner-only merge; no authorization |

# Completed material legs

LEG-001 through LEG-008 are materially closed.

Latest material receipt: `agents/chains/SUPPORT-PRIMARY-1222/material-legs/LEG-008.md`  
Latest material head: `c738c03ef0036fba37a23490f83990e5a19fccc5`.

# Current architecture

Support Report now follows:

`zone -> PS/SL family -> Primary Support Assembly -> count/recovery -> structural matcher + relationship matcher + axis matcher -> TypicalityConsensusV1`

Independent typicality channels:
- existing structural/location matcher — unchanged by LEG-007/008;
- `RELATIONSHIP_TOPOLOGY_V1` — explicit topology when both sides have authority;
- `AXIS_TYPICALITY_V1` — intrinsic axis-relative geometry only.

Axis channel invariants:
- no raw global axis-vector comparison across XMLs;
- DN-normalized along/lateral spacing;
- unsigned intra-model relative-axis angles;
- traversal/return topology;
- unavailable/partial evidence fails closed;
- axis-only evidence cannot promote structural rejection.

Consensus:
- independent agreement raises confidence;
- all three agreeing can yield `VERY_HIGH`;
- informed contradiction yields fail-visible REVIEW/CONFLICT;
- unavailable channels do not fabricate mismatch.

# Protected oracle ledger

Count expectations remain PS-11167=6, PS-11236=4, PS-12060=1, PS-12877=4, PS-12860=6, PS-12120=14. The 11168->14168 structural positive typicality control remains protected.

# Validation truth

PASS by source/material review through LEG-008.

NOT_RUN:
- committed Node tests under an executing GitHub runner;
- browser/deployed qualification;
- ZIP benchmark execution;
- real three-channel positive/negative qualification;
- real PS-11167/PS-11236 relationship qualification.

Current LEG-008 Actions:
- qualification run `34994156760`: focused-node/browser jobs `steps=null`;
- ZIP run `34994156668`: benchmark job `steps=null`.

These are infrastructure/non-execution results, not product test failures.

PR review record: COMMENT review `5212752129`; no approval/change-request review. No unresolved inline review threads at material review.

# Open implementation boundary

The primary functional gap before real three-channel relationship qualification is **reference-side explicit Primary Support Relationship XML input**. Current UI only supplies explicit relationship topology to the current/left report, so the relationship channel may be `UNAVAILABLE` even when structural and axis channels are informed.

# Exact next action

On a fresh Owner progression command, create a new bounded prework endpoint for symmetric reference-side relationship XML/input/bundle plumbing. Do not mutate product code before that endpoint. Do not merge without fresh Owner authorization.