# WIP-CIIFR-NORMAL-DIRECT-20261021 — Normal alias closure and Fortran numeric parsing

**Authoring principal:** ChatGPT Oracle predecessor, acting as a **code contributor only** following direct Owner request to implement without Agent 1. This principal MUST NOT count as the independent reviewer or sign its own work.

## Scope and source of truth
- Base: Agent 1 draft PR #144 head `9a3c2a13b45ebb95aeb04e1242829d8fc2b4ac56`.
- This branch is additive and is proposed for merge **into Agent 1's feature branch first**, not into main or production.
- Owner aim: complete standalone three-tab VNext, reuse existing UI appearance only, replace production tile only after qualification and Owner decision. #139 and #140 remain controlling.
- Work here is specifically Normal `NODENAME` writer logical-alias closure plus strict CII numeric parsing for actual original-file notation; not Line/Node UI, Geometry or legacy tile.

## Implementation
1. `ui/normal-node-closure.js` + docs mirror: independently derive all physical NODENAME representations of each TARGET-local numerical node from parsed ORIGINAL bytes. An approved rename must cover every alias of the affected node, agree on the original name and write the same new value; otherwise HOLD/error. Conservative on blank names; no Owner blank-policy choice inferred.
2. `ui/writer.js` + docs mirror: apply new closure only for the NORMAL path, **after existing physical byte-span and witness validation**. Preserve the previous Line/Node admission call and Geometry HOLD.
3. `ui/physical.js` + docs mirror: accept strictly formatted FORTRAN `E/e/D/d` exponential numeric fields. Endpoint IDs and pointer/counts still require `Number.isSafeInteger` and correct ranges. The previous expression rejected all 1,042 endpoint fields in each original CII.
4. `tests/cii-fnr-vnext-a1-normal-node-closure.test.mjs`: partial/endpoint-only/mixed-blank/preexisting-disagreement negative, complete and singleton positive, CRLF/LF.
5. `tests/cii-fnr-vnext-a1-scientific-numbers.test.mjs`: v14 synthetic exponential endpoint, pointer, CONTROL count parsing plus closure/byte audit for LF/CRLF.
6. `tests/cii-fnr-vnext-a1.test.mjs`: repair a physically contradictory synthetic positive fixture (node 110 originally OLD-B and OLD-C in different records), approve complete alias set and retain explicit partial-approval rejection.

## Evidence and limits
- Native Node v22.16.0, exact GitHub-equivalent local blob identity verified with `git hash-object` for parser, writer, guard, Normal planner, repaired synthetic test and scientific test. Combined `node --test` 4/4 PASS: three public suites and one local private-original smoke script.
- Actual private SOURCE and TARGET bytes SHA-256 individually verified against sealed receipts. Each original: 803,776 bytes, 521 ELEMENTS blocks, 177 NODENAME records. In-memory replacement: 2 proposals, 2 changed bytes per file, unchanged TARGET0, output SHA, reparse and every diff byte inside approved field spans. **No originals, model content, output copies or golden expected values committed or published.**
- **IMPORTANT provenance caveat:** Local reconstructed Node test tree has exact blob-equivalent NORMAL planner, physical parser, writer, guard and tests; `line-node-admission.js` is a local nonexecuted throwing stand-in. LINE_NODE execution, full repository checkout, actual standalone app browser navigation and GitHub CI = **NOT_RUN**. Real feature tests and browser qualification still required.
- In this environment GitHub git transport is disabled by DNS. GitHub connected API committed changes using exact blob SHA compare-and-swap; **canonical `node utils/backup.cjs save` and repository-local .agent-worklogs manifest before existing-file edits could NOT be run**. Immutable Git blob preimages and this report preserve recovery, but this is an explicitly **unwaived repository policy deviation** that must be reconciled before integration. Do not claim full AGENTS.md conformance. No source code edit to the existing protected tile.
- Inherited Agent 1 base commit `9a3c2a13` changed tracked `.backups/log.json` despite AGENTS.md local-only rule. This branch neither introduces nor resolves the inherited change; remediation must preserve local evidence and receive the proper task authorization.

## Verification required before accepting this PR
- Distinct independent reviewer (not this author) reruns **native full-repository exact-commit** Normal + Line/Node tests and adversarial cases.
- Canonical backup/patch-ledger receipts, source/docs parity, full served Chromium upload/review/validate/apply/export/audit, actual private original data under approved custody and withheld benchmark qualification.
- Owner decides policy for blank+named logical-node representations. Until then this implementation strictly HOLDS ambiguous/mixed sets.
- The whole project remains DRAFT/HOLD: Agent 3 geometry absent and production tile unmodified; no merge/release authority granted.

**EXACT_NEXT_ACTION:** Independent reviewer checks this feature-branch SHA and all above unrun gates; repository maintainer reconciles backups/patch provenance, then integrate only through Owner-authorized workflow. Do not replace production tile.
