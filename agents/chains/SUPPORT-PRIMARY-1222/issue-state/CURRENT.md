CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0019
LAST_UPDATED: 2026-09-15
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5684858038
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: 5684860299
PR_LEG_010_REVIEW_ID: 5213502126

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_BOTH_SIDES / REAL_INPUT_NOT_RUN | optional current + reference Clash-within-Supports paths exist; real Owner relationship XML remains unpinned |
| TASK-003 | PASS_THROUGH_LEG_010 | #1216 Support/Steel producer authority untouched |
| TASK-004 | IMPLEMENTED_PENDING_BROWSER_QUALIFICATION | exact current-side zone UI/input + fail-closed reference exact-zone scope |
| TASK-005 | IMPLEMENTED_EXPLICIT_PLUS_FALLBACK | topology + reconciliation + count + orphan fallback complete |
| TASK-006 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | conservative orphan recovery complete and release-hardened |
| TASK-007 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | count consumes assembly + recovery occurrence IDs; field provenance aligned |
| TASK-008 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | independent `RELATIONSHIP_TOPOLOGY_V1` + two-sided explicit input plumbing complete |
| TASK-009 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | independent `AXIS_TYPICALITY_V1` + three-channel consensus complete |
| TASK-010 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | Column 22 final-TYPICAL-only publication + Column 23/audit governance complete; PR #1223 remains draft, no merge authorization |

# Completed material legs

LEG-001 through LEG-010 are materially closed.

Latest material receipt: `agents/chains/SUPPORT-PRIMARY-1222/material-legs/LEG-010.md`  
Latest material head: `a47af97cda0539751bfad2de5f8ee0844ce83fc6`.

# Current architecture

`zone -> PS/SL family -> Primary Support Assembly -> count/recovery -> structural + relationship + axis matchers -> TypicalityConsensusV1 -> explicit publication decision -> Columns 22/23 + Trace/Debug audit`

Publication invariant:
- Column 22 publishes only final `TYPICAL` with a retained structural candidate;
- all `REVIEW`, conflict, ambiguity, no-match and secondary-only states are withheld;
- retained review candidate remains visible in Column 23 and `SupportReportTypicalityRowAudit.v1`;
- machine reason codes remain authoritative.

Audit contract:
- `SupportReportTraceCsv.v4`;
- `SupportReportDebugExport.v4`;
- row-level structural, arrangement-resolved structural, relationship, axis, final consensus and publication evidence remain independently visible.

# Protected oracle ledger

Count expectations remain PS-11167=6, PS-11236=4, PS-12060=1, PS-12877=4, PS-12860=6, PS-12120=14. The 11168->14168 structural positive typicality control remains protected.

# Validation truth

PASS by source/material review through LEG-010.

NOT_RUN:
- committed Node tests under an executing GitHub runner;
- browser/deployed qualification;
- ZIP benchmark execution;
- real three-channel Owner relationship qualification;
- real PS-11167/PS-11236 relationship qualification.

LEG-010 Actions at material head:
- qualification run `35000814103`: focused-node/browser jobs `steps=null`;
- ZIP run `35000814152`: benchmark job `steps=null`.

These are infrastructure/non-execution results, not product test failures.

# Open implementation boundary

The architecture and publication policy are now present. The next bounded work should be **release-readiness / qualification consolidation**, not another matcher or authority source:
- re-ground main/PR diff;
- sweep protected count/typicality invariants;
- verify Owner report CSV/XLSX contract vs intentionally versioned Trace/Debug v4;
- static browser/UI contract audit;
- re-run Actions if runners begin executing;
- decide whether PR #1223 may leave draft state.

# Exact next action

On fresh Owner progression, create a new prework endpoint for release-readiness/qualification consolidation. Do not merge without fresh Owner authorization.