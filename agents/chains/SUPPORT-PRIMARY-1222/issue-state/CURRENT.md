CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0016
LAST_UPDATED: 2026-09-15
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_LEG_009_PREWORK_SYNC
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP_0016_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: PENDING_LEG_009_PREWORK_SYNC
PR_LEG_008_REVIEW_ID: 5212752129

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_CURRENT_SIDE / LEG_009_IN_PROGRESS_REFERENCE_SIDE | current-side Clash-within-Supports path exists; reference-side symmetric input preworked |
| TASK-003 | PASS_THROUGH_LEG_008 | #1216 Support/Steel producer authority untouched |
| TASK-004 | IMPLEMENTED_PENDING_BROWSER_QUALIFICATION | exact current-side zone UI/input path exists |
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

# LEG-009 frozen scope

Add `Reference Primary Support Relationship XML (optional)` paired with the Typical-structure reference XML.

Reference scope must NOT reuse current-area manual zone selections. The reference Support Report XML is parsed first; exact ancestor zones are discovered from that reference evidence and used as an automatic relationship scope (`REFERENCE_SUPPORT_REPORT_EXACT_ANCESTRY`). The resulting typed `SupportPrimaryRelationshipBundle.v1` is passed only to the reference `buildSupportReportBundle(...)` call.

No matcher code, thresholds, selection, support grouping/count/orphan logic, #1216 producer authority or workflows may change in LEG-009.

Required audit: side, presence, parsed/scoped/excluded relationship row counts, bundle schema/summary, exact auto-scope zone IDs and scope basis.

# Protected oracle ledger

Count expectations remain PS-11167=6, PS-11236=4, PS-12060=1, PS-12877=4, PS-12860=6, PS-12120=14. The 11168->14168 structural positive typicality control remains protected.

# Validation truth entering LEG-009

PASS by source/material review through LEG-008.

NOT_RUN: repository Node/browser/ZIP execution and real relationship benchmarks because Actions jobs still fail before steps and real 1835 relationship XML is unpinned.

# Exact next action

Implement only EP-SUPPORT-PRIMARY-1222-0016 reference-side relationship XML/input/bundle plumbing and focused tests. No matcher mutation. No merge.