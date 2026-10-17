# PR #119 — Method C G3 independent implementation recovery

**Authority:** Owner directly requested G3 take over Method C implementation, 2026-10-17 10:16 UTC; G3 is implementer, **not independent acceptance checker**. Owner reserves B/C physical-release policy and merger.

**Mission:** Recover WP3 automatic one-anchor proper 3D orientation from original signed physical ELEMENTS; original SHA-bound positive/HOLD evidence; WP6 native rotated Chromium. Baseline PR #118 OPEN DRAFT at `421b1efbd19d0f2f9f7c475e3aeec60a65cf1090`; maintain PR #107 isolation.

**Location / topology:** PR #119 DRAFT; branch `g3/method-c-auto-takeover-20261017` stacked on original `methodc/108-geometry-20261016`. Scope exactly new/owned Method C-only source/docs/tests; no shared tab edits or protected WP7. Current tree contains 3 new code/test files plus initial WIP report; direct predecessor branch remains untouched.

**Qualification (Appendix A):**
- A1: native raw-CII bytes → `buildOriginalGraphFromBytes` → `registerMethodC` → `findMethodCCandidates` → `methodCEvidence`; actual native tab reads own original bytes.
- A2: original 1-anchor registration only manual Euler; two >1000-mm synthetic held-out failures, role-based trust escalation, XY cross missing Z, JSON drops discovery, stale witness and HOLD UI clear.
- A3: numeric proper det+1, scale1, unique pose only with complete competitors and D/H disjoint original signed receipts; A preview ≠ Owner authentication ≠ B physical identity ≠ Writer2 C. B=0 C=0; failure HOLD evidence exported.
- A4: G3 independent pinned production-function reproduction, see #111 comments 6231922702 and 6232008934; local pure new-module Node22 tests below; **hosted full native NOT_RUN**.
- A5: build new pure frame primitive; bounded signed path competitor discovery; integrate with existing owned registration/UI/candidate/exports with local backups before edits; native rotated and protected regression; independent reviewer.

**Changed files on this branch so far:**
1. `agents/WIP-G3-MC-20261017_workreport.md` — predecessor/takeover authority report.
2. `tabs/cii-workspace/cii-workspace-method-c-proper-frame.js` — candidate-only proper 3D frame, det+1, no authentication.
3. `docs/tabs/cii-workspace/cii-workspace-method-c-proper-frame.js` — exact identical mirror.
4. `tests/cii-workspace-method-c-proper-frame.test.mjs` — 5 test cases.

**Validation:** Local Node22 `node --test tests/cii-workspace-method-c-proper-frame.test.mjs`: **5/5 PASS [SIMULATED fixture math]**; two distinct generated proper large-compound rotations (-31,67,43) and (125,41,-67), three plane bases XY/XZ/YZ, true collinear/length/angle negatives, source/docs mirror equality. Local file sha256: source/docs `74b3b17c049994e8a6f2651739f2ad513322c89fec935bc9bb45479041cdc07c`, test `2005fa9a81c7de686ed5ddd422ba6353b0dfcf06c32a4fdfd55ac33cd4edf0dd`. These are **pure primitive tests, NOT actual integrated AUTO**; native Chromium NOT_RUN; protected suite inherited red 12/14; independent checker NOT_ASSIGNED.

**Rollback/ledger:** local scratch `.agent-worklogs/20261017_1020_g3-auto-frame/` contains pre-edit manifest, module log, checksum and /dev/null new-file patches (no existing repo file edited). New files are removable only after current checksums and later edits verified. No source backup is falsely claimed; before editing ANY preexisting file a true repository checkout, `node utils/backup.cjs save` and local ledger are mandatory.

**Blocking/risks:** Hosted executable full original D/H discovery not implemented; current new pure helper is not imported yet; global pose uniqueness/reflection cannot be established from two basis vectors alone; no browser anchor signer approved; product source edits constrained by repository backup gate (connector-only filesystem not a checkout); full native browser not run. Do not claim WP3/WP6 accepted.

**Decision:** SALVAGE_PARTIAL. WIP no merges. Owner direction overrides former XMLwtMethodC future allocation but preserves #118 history.

**EXACT_NEXT_ACTION:** Assemble verifiable local repository checkout for mandated backup/patch ledger or use an approved workspace execution environment; then implement complete signed ORIGINAL ELEMENT D/H hypothesis discovery + proper frame use under the existing Method C scope, correct current rigid-fit and role trust, wire UI/export HOLD SHA custody, commit source/docs identical; run dedicated tests and hosted native Chromium at fresh SHA. Hold WP7 unless separately exact-granted; obtain independent reviewer before any acceptance.

## G3 production integration checkpoint — 2026-10-17, tested commit d594324647bf80d43f22bf38a6fe6e52698d8859

**Supersedes earlier “pure new module only” checkpoint above.** Production Method C integration is now **ACTUALLY COMMITTED** on stacked PR #119; baseline PR #118 head `421b1efbd19d0f2f9f7c475e3aeec60a65cf1090` remains unchanged and PR #107 isolated.

**Changed-file ledger (current PR diff relative to #118, 25 paths):**
- New source + docs identical mirrors: `cii-workspace-method-c-proper-frame.js`, `...-signed-paths.js`, `...-orientation-hypotheses.js`, `...-auto-registration.js` (8 paths).
- Existing Method C source + docs mirrors edited: `...-rigid-fit.js` full 3D cross; `...-registration.js` actual AUTO mode plus no role-based qualification; `...-candidates.js` originalDiscovery+pose snapshot; `...-exports.js` SHA-bound positive original discovery; `...-ui.js` native manual/AUTO/HOLD selector and read-only HOLD export (10 paths).
- Dedicated `tests/cii-workspace-method-c-proper-frame.test.js`, `...-orientation-hypotheses.test.js`, `...-auto-registration.test.js`, amended existing `...-registration.test.js` (correct anti-spoof oracle and imported 16 new tests), amended existing `...-native-app-browser.test.js` (actual rotated docs/index.html native acceptance) (5 paths).
- Two G3 takeover/report paths `agents/PR119_workreport.md`, `agents/WIP-G3-MC-20261017_workreport.md` (2 paths).
- Three initially committed new `.test.mjs` files were moved byte-for-byte to allowed `.test.js` paths and removed after verifying matching Git blob SHA; they are absent in final current PR changed-file inventory.
- **No Method A/B, Writer2 production source, PR107-owned path, original S1/S2/S3/T files, workflow file, or protected WP7/WP9 test has been edited.**

**Exact-hosted test evidence at SHA `d594324647bf80d43f22bf38a6fe6e52698d8859`:**
- GitHub Actions run https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39029342483 **OVERALL FAILURE**, no green blanket acceptance.
- Native Chromium `docs/index.html` job https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39029342483/job/117386559665 **2/2 PASS**. Original S1/T SHA 9a9cb14d…/abfa3ffc… and 41/57 preserved. Generated genuine original signed 15-row CII fixtures at angles [-31,67,43] and [125,41,-67] recover correct unique proper R/t automatically with one physical numeric *experimental* anchor, no manual Euler; original SHA and downloaded JSON hashes retained. Symmetry **HOLD 21 poses** and reflection **HOLD 10 rejected hypotheses** both diagnostic JSON downloadable, no selected R or B/C. No browser errors. Artifact https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39029342483/artifacts/12099871852 ZIP SHA256 `8e73d6b0291141207d6977b30126dda7afc996911e8824521d9f14e8b91cdc06`.
- Actual original-CII Node 22 job https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39029342483/job/117386559696 **59/59 PASS** including previously new 16 pure signed-D/H/AUTO tests now imported by existing hosted regression entry, original raw S1/S2/S3/T, rigids XY/XZ/YZ, attacker-forged anchor role and OWNER validator rejection.
- Served module Chromium job **SUCCESS**; other PR107-independent and WP8 benchmark jobs **SUCCESS**. 14/14 source/docs Method C JS/CSS identical Git blob SHAs independently fetched at prior integration exact SHA `7e43c6d9…` (product files unchanged between that and d594).
- Separate G3 current-head isolated production-module execution: two proper rotated signed graph fixtures near machine-precision R, 6/6 candidate rows, positive JSON `originalDiscovery` retained, mutated D/H ledger throws `METHOD_C_EXPORT_STALE_SNAPSHOT`.

**Known open release blockers at d594:**
1. WP7 protected test `tests/cii-workspace-method-c-firebreak.test.js` still asserts caller role `independently-accepted` yields `registration.qualified===true`. Current secure production correctly returns false, with `numericFitAcceptable===true`, so protected oracle fails; G3 **did not change protected test**.
2. WP7 and WP9 historical regex allowlists exclude new mandatory `agents/PR119_workreport.md` and `agents/WIP-G3-MC-20261017_workreport.md`, producing exact scoped RED. Three prior `.mjs` mismatches were resolved by byte-exact `.test.js` migration. Explicit Owner protected two-test grant requested in [#115](https://github.com/reallakshman19/XML_Compare_Utilities/issues/115#issuecomment-6233427885).
3. Two separate inherited baseline tests (`cii-workspace-multi-base-correspondence.test.js`, `cii-workspace-writer2-product-routing.test.js`) remain 12/14 protected RED from approved main (their test stage on this run was **SKIPPED** after firebreak failure). Earlier Owner exact-file grant request pending. Do not waive.
4. Independent implementation checker **NOT ASSIGNED**. G3 authored code and tests; cannot self-approve P2. Owner merge/deployment P3 **NOT AUTHORIZED**.
5. **Repository local backup process limitation:** these existing files were changed using GitHub Contents API with strict current Git blob preimage SHA checks on a new isolated branch. Immutable original blob hashes and prior commit history preserve revertable source, **but `node utils/backup.cjs save` and a local checkout-based `.agent-worklogs` patch ledger were NOT executed before those preexisting-file edits**. This is a **known repo-policy exception requiring review/Owner disposition**, not an assertion of compliance; do not release solely on remote Git history.

**Product authority invariant:** user may explore unverified 3D geometric A candidate preview with full SHA-bound +1 rotation and disjoint D/H evidence; **B=0, C=0**. `AUTO_OWNER_VERIFIED` still HOLD because no Owner-approved pinned verifier, and no browser callback/role can authenticate a physical anchor.

**EXACT_NEXT_ACTION:** Obtain Owner explicit test-only exact-file grant (WP7 firebreak + WP9 review preflight; original two protected tests separate) and designated checker independent from G3; rerun protected and full native suites on exact new HEAD; resolve backup-policy exception; independently review candidate SHA and provide PASS/FAIL/HOLD; obtain Owner P3 release authorization before any production deployment.
