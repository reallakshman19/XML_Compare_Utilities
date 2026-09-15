CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0018
LAST_UPDATED: 2026-09-15
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_LEG_010_PREWORK_SYNC
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP_0018_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: PENDING_EP_0018_SYNC
PR_LEG_009_REVIEW_ID: 5212927412

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_BOTH_SIDES / REAL_INPUT_NOT_RUN | optional current + reference Clash-within-Supports paths exist; real Owner relationship XML remains unpinned |
| TASK-003 | PASS_THROUGH_LEG_010 | #1216 Support/Steel producer authority frozen |
| TASK-004 | IMPLEMENTED_PENDING_BROWSER_QUALIFICATION | exact current-side zone UI/input + fail-closed reference exact-zone scope |
| TASK-005 | IMPLEMENTED_EXPLICIT_PLUS_FALLBACK | topology + reconciliation + count + orphan fallback complete |
| TASK-006 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | conservative orphan recovery complete and release-hardened |
| TASK-007 | IMPLEMENTED_PENDING_REPO_QUALIFICATION | count consumes assembly + recovery occurrence IDs; field provenance aligned |
| TASK-008 | IMPLEMENTED_PENDING_PUBLICATION_AUDIT | independent `RELATIONSHIP_TOPOLOGY_V1` + two-sided explicit input plumbing complete |
| TASK-009 | IMPLEMENTED_PENDING_PUBLICATION_AUDIT | independent `AXIS_TYPICALITY_V1` + three-channel consensus complete |
| TASK-010 | LEG_010_ACTIVE | govern Column 22/23 publication and preserve all matcher/consensus outputs in audit; PR remains draft; no merge authorization |

# Material state

LEG-001 through LEG-009 are materially closed.

Latest material receipt: `agents/chains/SUPPORT-PRIMARY-1222/material-legs/LEG-009.md`  
Latest material head: `18938c15695453b476192f21b742fe57caae7754`.

LEG-010 prework endpoint: `agents/chains/SUPPORT-PRIMARY-1222/endpoints/EP-SUPPORT-PRIMARY-1222-0018.md`.

# LEG-010 objective

Qualify and, where required, harden the publication seam above the frozen three matcher channels:
- deterministic Column 22 publish/withhold decision;
- Column 23 wording for agreement, unavailable evidence and conflicts;
- preserve structural/location, relationship, axis and final consensus outputs independently in projected row/debug/trace evidence;
- do not retune matcher thresholds or scoring.

Preferred conservative publication policy under review: Column 22 publishes only final `TYPICAL` results. `REVIEW`, `AMBIGUOUS`, `NO_MATCH` and secondary-only candidate states remain blank in Column 22; Column 23 may name the retained review candidate and explain why publication was withheld.

# Qualification matrix

A structural TYPICAL + relationship MATCH same + axis MATCH same -> publish / all-channel agreement.
B structural TYPICAL + relationship UNAVAILABLE + axis MATCH same -> publish / limited relationship evidence.
C structural TYPICAL + relationship MATCH same + axis UNAVAILABLE -> publish / limited axis evidence.
D structural TYPICAL + both secondary UNAVAILABLE -> publish structural candidate with reduced confidence.
E relationship contradiction -> REVIEW / withhold Column 22.
F axis contradiction -> REVIEW / withhold Column 22.
G both contradictions -> multi-channel REVIEW / withhold Column 22.
H structural REVIEW / partial arrangement -> withhold Column 22.
I structural AMBIGUOUS or NO_MATCH -> withhold Column 22.
J structural rejection but secondary match -> withhold; secondary channels do not promote.

# Validation truth

Previous material legs source-reviewed PASS. Repository Node/browser/ZIP execution remains NOT_RUN because Actions jobs fail before steps (`steps=null`).

# Exact next action

Synchronize issue handover to EP-0018, inspect projection/remarks/trace publication behavior against matrix A-J, then make only minimum publication/audit changes. Do not merge without fresh Owner authorization.