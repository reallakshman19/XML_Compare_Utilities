CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0029
LAST_UPDATED: 2026-09-16
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5692910361
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: 5692028957
PR_LEG_013_REVIEW_ID: 5217561622
PR_LEG_014_REVIEW_ID: 5218485242
PR_LEG_015_REVIEW_ID: 5218890046
PR_LEG_016_REVIEW_ID: 5219102623

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
| TASK-013 | CI_COVERAGE_READY / EXECUTION_NOT_RUN | LEG-016 focused Node now includes full #1222 primary/relationship/axis/publication tests and both workflows trigger on support-primary/shared parser changes |

# Current state

LEG-016 is closed at `EP-SUPPORT-PRIMARY-1222-0029` with **no production runtime mutation**.

Qualification staging found that the pre-LEG-016 focused Node workflow did not run the dedicated `support-primary-*` tests or the new relationship/axis/reference/publication/zone tests. Its path filter also omitted `support-primary-*.js`, and the ZIP benchmark omitted Primary Support Assembly production modules from its trigger surface.

LEG-016 corrected only the two governed workflow YAML files. Focused Node now executes the complete `support-primary-*` test set plus the #1222 relationship topology, axis typicality/consensus, reference relationship integration, Column 22/23 publication and zone-scope tests. Both qualification workflows now trigger on `support-primary-*.js` and the shared Clash-within-Supports parser. No product JS or authority semantics changed.

Fresh qualification-head `4e2b845f5fa44f14bb7efaebeb145194c80afc53` runs still failed before step allocation:
- qualification run `35062584413`: browser job `104685851356` and focused-node job `104685851514`, both `steps=null`;
- ZIP benchmark run `35062584337`: benchmark job `104685850930`, `steps=null`.

The workflow definitions use `runs-on: ubuntu-latest` and ordinary checkout/setup/test steps. There are no logs because execution never reached Checkout. Classification remains infrastructure NOT_RUN, not product FAIL.

Repository metadata confirms governed ZIP blobs `1884.zip` = `63acc3c0b413f6ee727189ec36d4b76fba44d73a` and `1885.zip` = `5f27f2d6736693eb21dc2e7981fecad22952819a`. Authenticated ranged base64 reads are available, but there is no trusted connector-to-sandbox binary mount/download path; no substitute or manually reconstructed benchmark was accepted.

Prior independent high-risk logic qualification remains **27 tests / 27 pass / 0 fail** from LEG-014. LEG-015 browser coverage remains coded but not executed.

# Protected oracles / authorities

PS-11167=6; PS-11236=4; PS-12060=1; PS-12877=4; PS-12860=6; PS-12120=14; PS-11168 -> PS-14168 positive structural control; #1216 Support/Steel authority; final-TYPICAL-only Column 22 publication.

Synthetic PS-11167/PS-11236 controls are executable regression evidence only; real Owner relationship XML remains required for governed real-input qualification.

# Remaining gates

- execute the expanded focused Node suite on an actual runner;
- execute real `benchmarks/1884.zip` vs `benchmarks/1885.zip` on an exact trusted checkout;
- execute Playwright browser qualification, including LEG-015 independent current/reference relationship scoping and multi-popup orphan-config behavior;
- execute real 1835 support-to-support relationship qualification when authoritative Owner input is available.

# Current disposition

Known production/source blocker: NONE.  
Source/material: PASS.  
Independent executable high-risk logic: PASS 27/27.  
Qualification definitions: READY.  
Browser coverage: CODED / EXECUTION NOT_RUN.  
Full governed release qualification: PARTIAL / external execution and input gates outstanding.  
PR #1223: HOLD_DRAFT.

# Exact next action

Do not change matcher/count/orphan algorithms absent a concrete failing case. Use a trusted executing runner/served checkout that can receive the governed ZIPs, run the expanded focused Node suite, real 1884/1885 ZIP benchmark and browser qualification. Separately pin/run the real 1835 Clash-within-Supports XML when available. Then repeat ready-for-review disposition. Mark-ready and merge remain separate fresh Owner-authorized transitions.