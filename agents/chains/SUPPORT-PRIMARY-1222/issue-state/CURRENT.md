CHAIN_ID: SUPPORT-PRIMARY-1222
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0030
LAST_UPDATED: 2026-09-16
ISSUE_CHAIN_ROOT_COMMENT_ID: 5678826053
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5678831292
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5692910361
ISSUE_HANDOVER_SYNC_STATUS: PENDING_LEG_017_COMMENT_SYNC
RELATED_TYPICALITY_STATUS_COMMENT_ID: 5692028957
PR_LEG_013_REVIEW_ID: 5217561622
PR_LEG_014_REVIEW_ID: 5218485242
PR_LEG_015_REVIEW_ID: 5218890046
PR_LEG_016_REVIEW_ID: 5219102623
PR_LEG_017_REVIEW_ID: PENDING

# Acceptance ledger

| ID | Status | Evidence / next gate |
|---|---|---|
| TASK-001 | PASS_EXECUTABLE_LOGIC / OWNER_REPORT_BROWSER_PENDING | `Multiple primary support` follows final family assembly count >1 |
| TASK-002 | IMPLEMENTED_BOTH_SIDES / REAL_INPUT_NOT_RUN | current + reference Clash-within-Supports inputs exist; authoritative real 1835 relationship XML absent |
| TASK-003 | PASS_SOURCE | #1216 Support/Steel authority untouched |
| TASK-004 | IMPLEMENTED / BROWSER_EXECUTION_NOT_RUN | exact current/reference zone scoping; LEG-015 Playwright coverage coded |
| TASK-005 | PASS_EXECUTABLE_LOGIC | topology + reconciliation + count + orphan fallback exercised |
| TASK-006 | PASS_EXECUTABLE_LOGIC | actual orphan resolver + traversal count-authority guard exercised in LEG-014 |
| TASK-007 | PASS_EXECUTABLE_LOGIC | assembly count + provenance decision paths exercised |
| TASK-008 | PASS_EXECUTABLE_LOGIC | RELATIONSHIP_TOPOLOGY_V1 exercised |
| TASK-009 | PASS_EXECUTABLE_LOGIC | AXIS_TYPICALITY_V1 + three-channel consensus exercised |
| TASK-010 | PASS_SOURCE | LEG-013 cache route verified and regression-protected |
| TASK-011 | PASS_PARTIAL_QUALIFICATION | LEG-014 independent executable logic pack: 27/27; real ZIP/browser remain NOT_RUN |
| TASK-012 | COVERAGE_CODED / EXECUTION_NOT_RUN | LEG-015 real UI/debug path asserts independent current/reference relationship scoping; stale Column 23 Node expectation corrected test-only |
| TASK-013 | CI_COVERAGE_READY / EXECUTION_NOT_RUN | LEG-016 focused Node includes #1222 primary/relationship/axis/publication tests and both workflows trigger on support-primary/shared parser changes |
| TASK-014 | PASS_PARTIAL_EXECUTION / EXTERNAL_GATES_REMAIN | LEG-017 disposable slices 13/13; Actions retry still runner_id=0; 1835 archive inspected and separate relationship input confirmed absent |

# Current state

LEG-017 is closed at `EP-SUPPORT-PRIMARY-1222-0030` with **no production runtime mutation**.

## LEG-017 execution

The hardened LEG-016 Actions were retried again. Qualification run `35062584413`, attempt 2, produced focused-node job `104701302904` and browser job `104701303238`; both completed with `runner_id=0`, `steps=[]` and no runner name. ZIP run `35062584337`, attempt 2, produced benchmark job `104701333618` with the same non-allocation state. A direct log fetch found no job log blob. These are infrastructure **NOT_RUN**, not product FAIL.

Authenticated inspection of `benchmarks/1835.zip` (blob `c42aafae408caafd5197574834a81654ab04bb2b`) shows one archive entry, `1835.xml`. The missing Clash-within-Supports/support-to-support relationship XML is not hidden in that archive. Repository search found no authoritative separate 1835 relationship input, so the real-input gate still requires Owner-supplied XML.

The governed ZIP identities remain `1884.zip` = `63acc3c0b413f6ee727189ec36d4b76fba44d73a` and `1885.zip` = `5f27f2d6736693eb21dc2e7981fecad22952819a`. The connector can authenticate/range-read these private binaries but cannot mount a complete binary into the execution sandbox. No manual base64 reconstruction or substitute input was accepted; the real ZIP benchmark remains NOT_RUN.

A disposable Node 22.16.0 workspace reconstructed authenticated branch text and executed three narrower qualification slices:
- relationship/parser graph: **6/6 pass** using exact branch modules and an adapted harness;
- count/reconciliation: **5/5 pass** using exact relationship/reconciliation/count logic, with a production-equivalent no-axis orphan adapter only for these no-evidence fixtures; this is not represented as a full orphan-resolver rerun;
- relationship-consensus / Column 23 contract: **2/2 pass** using current source-extracted consensus/review-label logic.

LEG-017 partial aggregate: **13/13 pass**. This supplements, and does not replace, LEG-014's actual high-risk production-logic **27/27 pass** or the still-required hardened full Node/browser/ZIP qualification.

The LEG-017 count slice re-executed PS-11167 `7 -> 6`, PS-11236 `-> 4`, PS-12060=1 and PS-12877=4. The consensus slice re-executed PS-11168 -> PS-14168 relationship conflict behavior and verified Column 23 retains `Candidate PS-14168 withheld: ...` while the conservative integration withholds promotion from relationship-only evidence.

Chromium exists in the local sandbox, but `@playwright/test` is not installed and cannot be installed through the sandbox network boundary; there is also no complete exact checkout. Browser E2E therefore remains NOT_RUN.

# Protected oracles / authorities

PS-11167=6; PS-11236=4; PS-12060=1; PS-12877=4; PS-12860=6; PS-12120=14; PS-11168 -> PS-14168 positive structural control; #1216 Support/Steel authority; final-TYPICAL-only Column 22 publication.

Synthetic PS-11167/PS-11236 controls are regression evidence only; real Owner relationship XML remains required for governed real-input qualification.

# Remaining gates

- execute the hardened full focused Node suite on an actual trusted runner/checkout;
- execute real `benchmarks/1884.zip` vs `benchmarks/1885.zip` on that trusted checkout;
- execute Playwright browser qualification, including LEG-015 independent current/reference relationship scoping and multi-popup orphan-config behavior;
- obtain and execute the separate authoritative Owner 1835 Clash-within-Supports relationship XML.

# Current disposition

Known production/source blocker: NONE.  
Source/material: PASS.  
Independent actual high-risk logic: PASS 27/27 from LEG-014.  
LEG-017 partial execution: PASS 13/13 with documented scope/caveats.  
Qualification definitions: READY.  
Full governed Node/ZIP/browser: NOT_RUN due external execution boundary.  
Real 1835 relationship: NOT_RUN due absent input.  
PR #1223: HOLD_DRAFT.

# Exact next action

Do not change matcher/count/orphan algorithms absent a concrete failing case. Use an executing trusted checkout/runner for hardened focused Node + real 1884/1885 ZIP + Playwright. Separately supply/pin the real 1835 Clash-within-Supports XML and run the protected real-input checks. Then repeat ready-for-review disposition. Mark-ready and merge remain separate fresh Owner-authorized transitions.