# Current Issue State — CSV-REV-REMARKS-1192

CHAIN_STATE_VERSION: 3
WORK_ITEM_SOURCE: GITHUB_ISSUE
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1192
PARENT_WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1181
CHAIN_ID: CSV-REV-REMARKS-1192
ISSUE_BASIS_ID: IB-CSV-REV-REMARKS-1192-0001
ISSUE_BASIS_FILE: agents/chains/CSV-REV-REMARKS-1192/issue-basis/IB-CSV-REV-REMARKS-1192-0001.md
ISSUE_CURRENT_STATE_FILE: agents/chains/CSV-REV-REMARKS-1192/issue-state/CURRENT.md
ACTIVE_ENDPOINT: EP-CSVRMRK-0004
LATEST_MATERIAL_LEG: LEG-001
PR: 1197
BRANCH: issue-1192-remark-remediation
MATERIAL_HEAD: 81c727d3a5841b9b23ba54ad8738a33808f83921
CURRENT_MAIN: 2b473ae1c4e93d92ad2af8e0716bd8e72ac2eab0
POST_BASIS_DRIFT: METADATA_ONLY
ENGINEERING_STATE: IN_PROGRESS
CUSTODY_STATE: HELD
QUALIFICATION_STATE: FAIL
WRITE_AUTHORITY: READ_ONLY
AUTO_STATE: NOT_APPLICABLE
MERGEABILITY: MERGEABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
QUALIFICATION_SCOPE_ID: QSCOPE-XMLCOMPARE-1192-REMARK-CORRECTNESS
QUESTION_SET_ID: QS-CSVRC-1192-0001
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_READY: FALSE
ISSUE_CHAIN_ROOT_COMMENT_ID: 5632283999
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5632287201
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP0004_COMMENT
ISSUE_HANDOVER_SYNC_STATUS: STALE
QUALIFICATION_RECEIPT: agents/qualifications/CSV-REV-REMARKS-1192/QR-CSVRC-1192-R1-0001.md
QUALIFICATION_PR: 1200
QUALIFICATION_HEAD: fcc572b77fdf7e8dae5ee7fe78d020f1dadd47ab
QUALIFICATION_RUN: 34586607702
QUALIFICATION_JOB: 103222162057

## Original task / current authority

Remediate post-merge remark mismatches discovered by Owner comparison after #1181. Parent architecture remains authoritative. Target remarks remain oracle-only; `CIVILSECONDARYSUPPORT + PIPE` remains unique support-location identity. HOLD/Hold Removed remains excluded from automatic evidence.

## R1 material state

LEG-001 implemented only R1:
- Phase-2 oracle recognizes `Support Relocated`;
- trusted accepted ordinary `1->1` movement is relocation-eligible behind the existing coordinate-frame gates;
- renderer v1.3.0 outputs `Support Relocated` and `Minor Load change`;
- final REV2 output wording is asserted by focused tests.

R2 deletion-state projection, common-support replication redesign, support-type attribution, total-support logic, XLSX ingress, and production workflow files remain untouched.

## Qualification truth

Executable qualification now exists and **FAILS R1**.

- Phase 1: expected=1, detected=1, TP=1, FP=0, FN=0, PASS.
- Phase 2: expected=13, detected=14, TP=7, FP=7, FN=6, precision=0.5, recall=0.5384615384615384, F1=0.5185185185185186, FAIL.
- Phase 3: expected=2, detected=2, TP=2, FP=0, FN=0, PASS.
- Phase 4: oracleExpected=3, unsupported=1, expected=2, detected=2, TP=2, FP=0, FN=0, PASS.

The old Phase-2 false green is eliminated: `Support Relocated` produces a non-vacuous expected set of 13. The current rule is nevertheless insufficient: trusted `1->1` eligibility produces seven false positives and still misses six Owner-expected rows.

`main` remains `2b473ae...`; previously classified drift remains metadata-only. PR #1197 remains draft/mergeable but is not merge-qualified.

EXACT_NEXT_ACTION: await a new Owner progression for R1 failure isolation. Trace the seven FP and six FN through accepted lineage/cardinality/coordinate-frame evidence, derive the narrow detector rule without using target remarks as evidence, patch R1, and rerun qualification PR #1200. Do not begin R2 and do not merge #1197 or #1200.