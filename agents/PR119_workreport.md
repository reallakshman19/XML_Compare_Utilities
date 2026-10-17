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
