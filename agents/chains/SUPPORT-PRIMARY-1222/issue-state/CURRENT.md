CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0025
LAST_UPDATED: 2026-09-16
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5690658406
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: 5690660200
PR_LEG_012_REVIEW_ID: 5217444302
PR_LEG_013_REVIEW_ID: 5217561622

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | IMPLEMENTED / EXECUTION_NOT_RUN | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_BOTH_SIDES / REAL_INPUT_NOT_RUN | current + reference Clash-within-Supports inputs exist; authoritative 1835 relationship XML absent from repo/history/#1222 evidence |
| TASK-003 | PASS_SOURCE / EXECUTION_NOT_RUN | #1216 Support/Steel authority untouched |
| TASK-004 | IMPLEMENTED / BROWSER_EXECUTION_NOT_RUN | exact current/reference zone scoping |
| TASK-005 | IMPLEMENTED_EXPLICIT_PLUS_FALLBACK | topology + reconciliation + count + orphan fallback |
| TASK-006 | IMPLEMENTED_HARDENED / EXECUTION_NOT_RUN | orphan recovery + cross-traversal count-authority guard |
| TASK-007 | IMPLEMENTED / EXECUTION_NOT_RUN | assembly count + provenance |
| TASK-008 | IMPLEMENTED / EXECUTION_NOT_RUN | RELATIONSHIP_TOPOLOGY_V1 + two-sided bundles |
| TASK-009 | IMPLEMENTED / EXECUTION_NOT_RUN | AXIS_TYPICALITY_V1 + consensus |
| TASK-010 | HOLD_DRAFT_EXTERNAL_QUALIFICATION | cache blocker resolved; runner allocation and real Owner input remain external gates |

# Completed material legs

LEG-001 through LEG-013 are closed.

Latest receipt: `agents/chains/SUPPORT-PRIMARY-1222/material-legs/LEG-013.md`  
Latest product material head: `efecd8f7cf90e4d5b2dd9d264064f37c3cf50140`.

# LEG-013 accepted result

The prior hot-browser cache blocker is **RESOLVED** using a proof-gated workflow:
- exact addon source read from one stable blob;
- full-file replacement performed only on temporary `verify/leg013-cache-token` branch;
- GitHub compare proved one changed file with 1 addition / 1 deletion;
- verified commit fast-forwarded to feature branch;
- bootstrap advanced with `traversalSafety=20260915-support-primary-traversal-safety-1`;
- addon advances engine with `count=20260915-support-primary-traversal-safety-1`;
- engine advances counting with the same traversal-safety token;
- release-hardening regression asserts the complete route.

No matcher/count/orphan/publication semantics changed.

# Qualification truth

Exact product head workflow runs:
- qualification `35043776094`: focused-node `104629105069`, browser `104629105169`;
- ZIP `35043776109`: benchmark `104629105083`.

All three jobs completed without runner allocation: `runner_id=0`, empty runner name, `steps=[]`. Job-log retrieval returns BlobNotFound. Therefore product tests remain **NOT_RUN**, not FAIL.

Workflow YAML remains a normal `ubuntu-latest` checkout/setup-node/test workflow. Do not alter product/test commands merely to chase a pre-runner infrastructure failure.

# Authoritative input search

Repository/default-branch code search, commit search, branch search, benchmark directory inspection and #1222 issue-comment inspection found no real 1835 Clash-within-Supports/support-to-support XML and no `PS-11167.11` fixture/attachment.

Real PS-11167=6 and PS-11236=4 relationship qualification remains NOT_RUN because authoritative Owner input is absent. Synthetic controls must not be relabeled as real benchmark evidence.

# Protected oracle / authority state

Unchanged:
- PS-11167=6;
- PS-11236=4;
- PS-12060=1;
- PS-12877=4;
- PS-12860=6;
- PS-12120=14;
- PS-11168 -> PS-14168 structural positive control;
- #1216 Support/Steel producer authority;
- first-pass grouping semantics;
- geometry-only recovery cannot override known traversal separation for final count;
- structural/relationship/axis matcher independence;
- final-TYPICAL-only Column 22 publication;
- Owner operational CSV/XLSX columns unchanged.

# Repository state

`main` / merge base remains `242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581`; branch is ahead-only/behind 0; PR #1223 remains open/draft/mergeable/unmerged; unresolved review threads none; merge authority Owner-only; merge authorized FALSE.

# Current disposition

Product/source architecture: **PASS by source/material review; no known product blocker**.  
Release qualification: **BLOCKED_EXTERNALLY / NOT_RUN**.  
PR disposition: **HOLD_DRAFT** pending executable qualification and real Owner relationship input.

# Exact next action

Obtain an executing trusted qualification path (restore GitHub-hosted runner allocation or provide/use a trusted local connected checkout), run focused Node/browser/1885 ZIP controls on product head `efecd8f7...`, and pin/run the real 1835 support-to-support XML when available. Then repeat release-readiness. Do not mark ready or merge without fresh explicit Owner authorization.