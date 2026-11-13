# P2.3 report — Name Transfer from a Map file

Base XCU main `8409590f36b641bfc755809e27f2e46d315300f2`, verified from ZIP comment. Node v22.16.0. All three benchmark hashes verified. Scope: `prototypes/p23-name-transfer-map/` only. Kernel and vendor files unchanged.

## TESTS

`node --test`: 23 pass / 23 total, 0 fail. T1: 35 proposals, noEntry node 10330. T2: all 35 names refused atomically with `KERNEL_NAME_IN_USE`, no bytes. T2b: explicit 12-name subset applied, exactly 24 NODENAME diffs, 12 read-backs OK. T3–T6 and all additional refusal, CLI and kit tests pass.

## MUTATIONS

M1 allow 26-character names → T4 red (exit 1). M2 inject extra ELEMENTS DX byte into kernel output → revised T2b red (exit 1, NAMES_READBACK_FAILED). M3 bypass map SHA-256 check → T5 red (exit 1). All mutations undone. M1 and M3 were tested in the previous review round; M2 retested against revised T2b.

## BENCH

B1 X-TEXP → X-T, apply the explicitly selected and approved subset: 12 names, 24 slots, 12 verified. Median 293.5 ms (267.3, 293.5, 324.2), limit 2000 ms, PASS. Timing covers apply and verification only, not plan/approval. See `bench/RESULT.json`.

## DECISIONS

1. Oracle confirmed the unchanged kernel must refuse repeated names. Full plan: 35 logical nodes, 70 physical slots, 12 distinct new names, all 12 repeated (11 names occur three times, SL-305 occurs twice); zero singleton names. The missing record is node 10330, SL-305. No output for the full plan.
2. T2b explicitly selects the first eligible proposal per distinct new name, excluding any name already assigned to another target node. This is a deliberate test/benchmark subset, not automatic production filtering. There are 12 selected nodes, 24 physical slots and 24 changed fields; the other 23 proposals are excluded before approval. The kernel still checks global uniqueness. The existing unique-name invented control is retained.
3. Old CSV comparison omitted as instructed: the old path needs seven vendored files and can create records. No new records are created here.
4. Conflicting tokens within a node refuse the whole plan. A missing adjacent NODENAME record goes to noEntry. Selected approval retains unapproved rows; the kernel refuses mixed sets. The shared validator requires evidence.detail.
5. No browser or CAESAR II execution. Browser compatibility shims leave the vendored validator unchanged. Fixtures are invented name tokens on copies of public S1. CLI refuses overwriting existing paths.

## FAILING

None. Final card-check: 9/9 PASS. Browser and CAESAR II are Owner/Oracle checks, not part of this delivery.

## Owner demo

Use the CLI commands in README.md. Full-map plan shows 35 proposals and 1 noEntry; approving all refuses without creating output. Run `node --test --test-name-pattern="T2b explicitly"` for the passing 12-name subset, and `node bench/run.mjs --repo-root ../..` for successful apply timing.

## Review fixes

All four Oracle findings implemented. `wouldRepeat` reports final-name collisions for every proposed node without filtering; full-map warnings match the kernel's 35 refusals, and simultaneous name swaps remain valid. Source and target conflicts identify their file. Blank-source approved pairs enter `skipped` with reason `SOURCE_NAME_BLANK`; totals reconcile. Independent read-back checks every unplanned node's name and record counts. Five new regression tests pass, 23/23 total; final card-check 9/9, B1 PASS. No vendor or kernel changes, no browser execution.
