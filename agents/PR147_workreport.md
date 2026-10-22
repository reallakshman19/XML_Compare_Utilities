# PR147 work report — Normal alias closure + original-file numeric notation

**Status:** DRAFT / implementation complete for narrowly scoped Normal writer and parser, **release HOLD**. This is the formal post-PR work report alongside `agents/WIP-CIIFR-NORMAL-DIRECT-20261021_workreport.md`.

## Author / authority
- Code authored by the **outgoing Oracle** following Owner's direct request to finish without Agent1; the author cannot act as the independent engineering reviewer or certify this work.
- PR #147: from `wip/cii-fnr-vnext/normal-alias-20261021-direct` into the existing Agent1 feature branch `wip/cii-fnr-vnext/a1-ui-normal-20261020`, based on original head `9a3c2a13b45ebb95aeb04e1242829d8fc2b4ac56`.
- Existing main, production tile, Writer2 and legacy Method C untouched. No merge/deploy authority exercised.

## Implemented on this branch
- `ui/normal-node-closure.js` and exact served mirror; ORIGINAL TARGET0 physical numerical-node alias membership, independent complete approval and consistent before/after values, HOLD for incomplete/blank/mismatched representations.
- `ui/writer.js` and mirror; call guard exclusively on Normal, not when existing Line/Node `admitLineNodeClaims` applies. Byte spans, width, postimage reparsing, immutable target and SHA binding otherwise retained.
- `ui/physical.js` and mirror: accept strictly formatted Fortran numeric E/e/D/d exponents; endpoint IDs, pointer IDs and relevant counts still fail if non-safe/non-integer.
- `tests/cii-fnr-vnext-a1-normal-node-closure.test.mjs` new; `tests/cii-fnr-vnext-a1-scientific-numbers.test.mjs` new; `tests/cii-fnr-vnext-a1.test.mjs` corrected synthetic positive to physically consistent same-node label and added incomplete-approval negative.

## Source/mirror and immutable references
- Normal writer / served Git blob: `f6f5a38b70f134cc13ede1b7937a1b2b71e2e541` both.
- Physical parser / served Git blob: `41de816dea6994deff5272e5fbe7fb23a06ba37a` both.
- Normal guard / served Git blob: `14e0be719dbb84f82aa2d014f72d486e5627f82d` both.
- Exact unchanged Normal planner Git blob: `7f4e0e1918b70d1f0ed3d9d8f28a51bc338a9e9e`.
- Tests: repaired `a1.test.mjs` `61050db6d0b46e18b42f9a148bf237fd48a09559`; scientific `a549508e74773786d1f95973c221b628e3bc9074`; alias `609aa0f4a3e2e9ef6a6367d61f8c2c5a56fb8a37`.

## Tests executed, results and limits
- **Native Node v22.16.0** on isolated locally reconstructed files checked byte-identical to above Git blobs:
  `node --test tests/cii-fnr-vnext-a1.test.mjs tests/cii-fnr-vnext-a1-normal-node-closure.test.mjs tests/cii-fnr-vnext-a1-scientific-numbers.test.mjs` → **3 pass / 0 fail**.
- **Negative control:** exact PREPATCH writer blob `4904cd5aad4fe81556bc9fff0fbbdc9b8d3ff4bb` plugged into same local test harness, new alias test **RED (0 pass / 1 fail, Missing expected rejection)**; new writer **GREEN (3 pass / 0 fail)**.
- **Private original input smoke, LOCAL only:** both SHA-verified original SOURCE and TARGET CII bytes 803,776, 521 elements, 177 names each. Real baseline parser failed on scientific-formatted node IDs; corrected parser + Normal writer produced 2 proposed changes / 2 byte changes per file with exact SHA checks, unchanged original TARGET0, successful TARGET1 reparse, each diff byte inside approved claim. Original files, answers, output files and benchmarks NOT committed or published.
- **Browser module navigation attempt:** FAIL `net::ERR_BLOCKED_BY_ADMINISTRATOR` on local HTTP server. Standalone app served UI upload→review→validate→apply→export→audit NOT_RUN. No browser PASS.
- **Full repository native Node suite and Line/Node integration:** NOT_RUN. Local reconstructed tree used a nonexecuted, throwing `line-node-admission.js` stand-in for Normal-only tests; this is NOT evidence that the real LINE_NODE code works with the new branch.
- GitHub CI: 0 observed check runs on prior branch; exact new PR/head status must be checked separately. No workflow changes authorized.

## Recovery and policy deviations
- The connected GitHub API accepted only exact old-blob-SHA compare-and-swap file updates because local `git clone` was blocked by `Could not resolve host: github.com`.
- Thus **canonical pre-edit `node utils/backup.cjs save` and pre-edit .agent-worklogs manifest were NOT_RUN and not waived**. Original content is preserved as Git immutable blobs; a public-code-only locally generated *post-edit recovery ledger* contains preimage blobs matching `4904cd5` (writer), `5e659a0` (physical), `4c989f8` (test) and no-index diffs. This does not fulfill the mandated pre-edit chronology; a maintainer must reconcile it explicitly.
- Parent Agent1 `9a3c2a13` unexpectedly committed `.backups/log.json` in its own diff. This PR did not alter that path. Do not delete other agents' backups without authorization.

## Highest risks
- The new Normal alias semantics HOLD conflicting labels, mixed blank-named nodes and partial endpoint scopes, by design. Owner's blank-name policy remains UNDECIDED; no permissive guess.
- Geometry v1.1 branch operation implementation #142 absent; Tab2 live UI/common-writer integration remains unqualified.
- Independent reviewer of code authored by former Oracle must be a distinct principal (possibly appointed reviewer of record), not this session.
- No production tile replacement/merge/deployment until all agreed gates and Owner authorization.

**EXACT_NEXT_ACTION:** Independent reviewer runs exact PR147 code in a full repository checkout with real native suites and served Chromium, checks safe physical matches on custodied originals and assesses unwaived backup-policy deviation. Only then may Owner consider integration into Agent1's feature branch; final production tile remains gated on independent three-tab qualification.
