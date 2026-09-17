# EP-SUPPORT-PRIMARY-1225-0011 — execution-boundary revalidation and governed input pinning

CHAIN_ID: SUPPORT-PRIMARY-1225
LEG_ID: QUAL-009
ENDPOINT_ID: EP-SUPPORT-PRIMARY-1225-0011
PREVIOUS_ENDPOINT: EP-SUPPORT-PRIMARY-1225-0010
CUSTODY_EPOCH: 1
ENDPOINT_REASON: Continue the post-correction progression by revalidating runner conditions, exact-RC check receipts, and governed benchmark/input identities without launching a redundant non-executing retry.
CHAIN_STATE_VERSION: 5
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: fed57820909f4984a97d67437340df952b73a5ab
COMMON_PROTOCOL_STATUS: CURRENT
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1225
WORK_ITEM_MODE: EXCLUSIVE
PR: 1223
PR_STATUS: OPEN_DRAFT
MERGED: FALSE
MERGEABILITY: MERGEABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_BRANCH: feature/support-primary-assembly-graph
CUSTODY_BRANCH: agent/support-primary-1225
RC_SHA: 759612b4e355a585aed7d64b566f199340429bdf
PR_HEAD_OBSERVED: 759612b4e355a585aed7d64b566f199340429bdf
MAIN_HEAD_LIVE: 3ee90ca25368f69d42f44cbe967d5bbc81972f77
CUSTODY_HEAD_BASIS: fb22bea6e36587fb9698e77ead24fb16f589b8ef
STATE: ACTIVE
ENGINEERING_STATE: READY
CUSTODY_STATE: HELD
QUALIFICATION_STATE: PENDING
WRITE_AUTHORITY: CUSTODY_ONLY
PRODUCT_WRITE_AUTHORITY: READ_ONLY

### Exact-RC check revalidation
The exact RC currently exposes only three check runs:
- focused-node `104789950832`;
- browser `104789949548`;
- benchmark `104782606659`.

No newer exact-RC check receipt exists. These remain GitHub-UI `failure` but engineering `NOT_RUN — infrastructure` because the corresponding jobs never reached executable repository steps.

### Repository-wide runner-condition test
A newer unrelated repository workflow, CII Writer2 R1 Benchmark run `35164318442` at 2026-09-16T23:54:39Z, was inspected as a possible indication that hosted runner conditions had recovered. Its benchmark job `105021868415` also completed with `steps=[]`, `runner_id=0`, empty runner name/group, and no repository execution.

RUNNER_CONDITION_CHANGE: FALSE
HOSTED_RETRY_DECISION: DO_NOT_RETRY_IDENTICAL_RC_WORKFLOWS
RATIONALE: a later unrelated workflow demonstrates the same pre-allocation failure mode; another identical RC retry would not add qualification evidence

### Governed benchmark/input pinning at RC
Repository benchmark inventory was fetched directly at `RC_SHA` and confirms:
- `benchmarks/1835.zip` blob `c42aafae408caafd5197574834a81654ab04bb2b`, size 551568;
- `benchmarks/1884.zip` blob `63acc3c0b413f6ee727189ec36d4b76fba44d73a`, size 122756;
- `benchmarks/1885.zip` blob `5f27f2d6736693eb21dc2e7981fecad22952819a`, size 585880.

No separate authoritative 1835 Clash-within-Supports/support-to-support relationship XML is present in the benchmark-directory inventory. The governed real-1835 relationship gate therefore remains dependent on a separate Owner input.

### Qualification truth
- Hardened focused Node: `NOT_RUN — infrastructure`.
- Real 1884/1885 benchmark: `NOT_RUN — infrastructure`.
- Protected real-1885 observations `PS-12060=1`, `PS-12877=4`, `PS-12860=6`, `PS-12120=14`: `NOT_RUN`.
- Playwright/browser: `NOT_RUN — infrastructure`.
- Real 1835 relationship qualification: `NOT_RUN / BLOCKED_INPUT`.
- Product defect established: `NO`.
- Product fix decision: `NO-PATCH`.
- Release disposition: `HOLD_DRAFT`.

### Local execution feasibility
The current assistant container does not contain a repository checkout. A direct unauthenticated network git fetch is unavailable, and the governed contract does not permit a reconstructed source workspace to close the exact-checkout Node/ZIP/browser gates. Therefore no substitute local execution is promoted to PASS.

### Exact next action
Remain at the external execution/input boundary until one of two material conditions changes:
1. a trusted environment can obtain and actually execute a clean exact checkout of `RC_SHA`; or
2. the authoritative real 1835 relationship XML is supplied and pinned.

When condition 1 changes, execute focused Node first, followed by real 1884/1885, then Playwright/browser, all against the same RC and with raw evidence retained. When condition 2 changes, execute the real XML through parser -> exact zone scope -> relationship bundle -> reconciliation -> orphan/count path. If any governed execution fails, localize the first wrong production boundary before permitting a minimal regression-backed patch; any product patch creates a new RC and invalidates prior governed PASS receipts.