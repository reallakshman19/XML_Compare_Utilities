CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0028
LAST_UPDATED: 2026-09-16
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5692596542
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: 5692028957
PR_LEG_013_REVIEW_ID: 5217561622
PR_LEG_014_REVIEW_ID: 5218485242

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | PASS_EXECUTABLE_LOGIC / OWNER_REPORT_BROWSER_PENDING | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_BOTH_SIDES / REAL_INPUT_NOT_RUN | current + reference Clash-within-Supports inputs exist; authoritative real 1835 relationship XML absent |
| TASK-003 | PASS_SOURCE | #1216 Support/Steel authority untouched |
| TASK-004 | IMPLEMENTED / BROWSER_EXECUTION_NOT_RUN | exact current/reference zone scoping; LEG-015 Playwright coverage coded |
| TASK-005 | PASS_EXECUTABLE_LOGIC | topology + reconciliation + count + orphan fallback exercised |
| TASK-006 | PASS_EXECUTABLE_LOGIC | actual orphan resolver + traversal count-authority guard exercised |
| TASK-007 | PASS_EXECUTABLE_LOGIC | assembly count + provenance decision paths exercised |
| TASK-008 | PASS_EXECUTABLE_LOGIC | RELATIONSHIP_TOPOLOGY_V1 exercised |
| TASK-009 | PASS_EXECUTABLE_LOGIC | AXIS_TYPICALITY_V1 + three-channel consensus exercised |
| TASK-010 | PASS_SOURCE | LEG-013 cache route verified and regression-protected |
| TASK-011 | PASS_PARTIAL_QUALIFICATION | LEG-014 independent executable logic pack: 27/27; real ZIP/browser remain NOT_RUN |
| TASK-012 | COVERAGE_CODED / EXECUTION_NOT_RUN | LEG-015 real UI/debug path asserts independent current/reference relationship scoping; stale Column 23 Node expectation corrected test-only |

# Current state

LEG-015 is closed at `EP-SUPPORT-PRIMARY-1222-0028` with **no production runtime mutation**.

The novice browser regression at `3e3723b88b7c58e2282f83ea067aa34e05fa396b` was source-validated. It drives current exact zone selection, current relationship XML, reference Support Report XML, independently scoped reference relationship XML, report build, and Debug JSON download. It asserts `2 parsed / 1 scoped / 1 excluded` on each side and `REFERENCE_SUPPORT_REPORT_EXACT_ANCESTRY` on the reference side.

Validation also found one stale Node test expectation: the relationship conflict test still expected the old Column 23 string without retained candidate context. Commit `afcbc421006a50fbcf55b69a5292c0e1b49cf27d` fixes that assertion only; production semantics are unchanged.

The novice handover's algorithm items were stale. Relationship topology, Axis Typicality V1, TypicalityConsensusV1, Column 22/23 publication/audit, and symmetric reference relationship evidence were already complete before LEG-015 and are not reopened absent a concrete failure.

Prior independent high-risk logic qualification remains **27 tests / 27 pass / 0 fail** from LEG-014. Full browser execution is still NOT_RUN.

# Protected oracles / authorities

PS-11167=6; PS-11236=4; PS-12060=1; PS-12877=4; PS-12860=6; PS-12120=14; PS-11168 -> PS-14168 positive structural control; #1216 Support/Steel authority; final-TYPICAL-only Column 22 publication.

Synthetic PS-11167/PS-11236 controls are executable regression evidence only; real Owner relationship XML remains required for governed real-input qualification.

# Fresh exact-head CI truth

After the LEG-015 test-contract fix:
- qualification run `35060224626`: focused-node job `104678784345` and browser job `104678784495`, both `steps=null`;
- ZIP benchmark run `35060224603`: benchmark job `104678784187`, `steps=null`.

These are infrastructure NOT_RUN results, not product FAIL.

# Remaining gates

- real `benchmarks/1885.zip` execution on an exact trusted checkout;
- browser qualification execution, including LEG-015 independent current/reference relationship scoping and multi-popup orphan-config behavior;
- real 1835 support-to-support relationship qualification when authoritative Owner input is available;
- focused Node/browser/ZIP CI rerun when jobs actually execute steps.

# Current disposition

Known production/source blocker: NONE.  
Source/material: PASS.  
Independent executable high-risk logic: PASS 27/27.  
Browser coverage: CODED / EXECUTION NOT_RUN.  
Full governed release qualification: PARTIAL / external gates outstanding.  
PR #1223: HOLD_DRAFT.

# Exact next action

Do not change matcher/count/orphan algorithms absent a concrete failing case. Obtain a trusted executing runner/served checkout that can receive the governed 1885 ZIP and run browser qualification; execute those gates. Separately pin/run the real 1835 Clash-within-Supports XML when available. Then repeat ready-for-review disposition. Mark-ready and merge remain separate fresh Owner-authorized transitions.