# P2.1 report

Branch / head commit: intended `proto/p21-cii-weights-20261112`. Source is the Owner-supplied XCU main ZIP, which contains P0.2 and P1.1. The ZIP contains no Git metadata, so no real main-based branch/commit was created and ancestry cannot be checked with `git log`. No push, merge, deployment, or modifications outside the P2.1 folder. A new-files patch and folder archive are provided for the Oracle to apply to a real checkout. Vendored provenance uses the plan's P0.2 merge commit f5d1b291 and exact snapshot hashes; source files were compared byte for byte.

Tests: 20 pass / 0 fail (engine 17, CLI 1, kit 2). T1–T8 present; three additional mutation/refusal checks plus other safety checks. Existing P0.2: 29 engine + 2 kit = 31 pass, 0 fail. No old failures in those suites; full XCU app suite not run.

Mutation check: each mutation was applied to one owned module, the indicated test run, and the original bytes restored in a finally block. Restored full P2.1 run: 20/20.
- M1: reverse the beyond-limit condition -> T4 red: yes (1 fail).
- M2: bypass the read-back equality require -> M2 wrong read-back through actual apply path red: yes (1 fail).
- M3: remove the TO comparison -> T6 red: yes (1 fail).

Bench: Node v22.16.0; median of 3 inventory-to-apply engine runs, no file I/O inside timer. Pinned input hashes in bench/RESULT.json.

| Bench | Input | Changes | Read-backs OK | Median ms | Runs ms | Limit ms | Pass |
|---|---|---:|---:|---:|---|---:|---|
| B1 | X-T | 124 | 124 | 420.3 | 373, 420.3, 536.9 | 1000 | yes |
| B2 | X-S2 | 1 | 1 | 10.7 | 10, 10.7, 10.8 | report | yes |

Refusal codes added: WEIGHTS_ROW_NOT_FOUND, WEIGHTS_ROW_AMBIGUOUS, WEIGHTS_CSV_INVALID, WEIGHTS_APPROVAL_INVALID, WEIGHTS_FIELD_UNSUPPORTED, WEIGHTS_UNIT_MISMATCH, WEIGHTS_UNITS_UNSUPPORTED, WEIGHTS_DIFF_MISMATCH, WEIGHTS_READBACK_MISMATCH, WEIGHTS_JSON_INVALID, WEIGHTS_OUTPUT_IS_INPUT, WEIGHTS_OUTPUT_FAILED. Each is tested; inherited codes relevant to the card are exercised too.

Anything that did not fit the card (and what was done instead):
- P0.2 has Node-only validator CLI imports. Its engine and dependencies are copied byte-identically. The page uses an import map, throwing stubs for the unused Node file functions and an empty argv shim. The actual validate function and kernel remain unchanged. **Browser smoke not verified**: Chromium refused navigation with ERR_BLOCKED_BY_ADMINISTRATOR for both localhost and an offline fixture origin. Stopped browser verification after two attempts. Owner must verify the page in a normal browser. CLI demo verified instead.
- The inventory returns an array; proposeFromTable takes a third explicit metadata argument `{base, createdAt}` so exported Change sets bind to the actual input SHA-256 and filename without hidden state or I/O.
- CSV has no zero-confirmation column; reject zero there. Explicitly confirmed zeros in imported Change sets are supported and tested. An imported no-op approval is refused because it would not generate a diff field. Unit labels must be mm/kg; explicit non-kg Change set unit is refused. No unit conversion is attempted. Exact kernel numeric precision is enforced at proposal and apply.
- CLI writes a new file atomically using a temporary sibling and a hard link, never overwrites an existing path. Filesystems without hard-link support refuse rather than falling back to an unsafe write.
- T7 uses an invented valid step-10-shaped XML Change set, not an actual Owner file. T3 generates the 20-row CSV in memory; a separate small demo CSV is in the manifest, with benchmark source hash.
- CAESAR II desktop open and Owner-only BM2 v14 demo were not run. No private data used.

Owner demo:
1. From a real XCU checkout, copy the folder or apply the patch; run the tests and bench commands in README.
2. Serve the P2.1 folder locally, open index.html, load Benchmark/T.CII, then tests/fixtures/demo-x-t-20.csv. Build proposals, enter engineer name, approve beyond ±20%, Apply. Expect 124 inventory rows, 20 approved, 20 verified rows; export the two files.
3. CLI demonstration already performed with the README commands and separate fresh output paths: validator OK, exactly 20 RIGID field differences, 20/20 read-backs OK. Demo revised CII and approved Change set delivered separately. Open revised CII in CAESAR II to complete the Owner demo.

Final card-check: PASS C1–C9 (9 checks).

## Review round 1 — 88/100, no HIGH

- Zero approval now requires each change ID in `confirmZeros`, even if the imported row already has `zeroConfirmed` or is approved. CSV zeros remain refused; the shared R9 flag remains required for imported zeros. CLI approval accepts repeated `--confirm-zero <changeId>` options. The page resets imported approval metadata, shows separate zero ticks, and gates Apply on a successful in-session approval. Re-approval of an already approved engine row preserves its original by/at.
- Duplicate CSV elements refuse with `WEIGHTS_ROW_DUPLICATE` and both physical line numbers; Excel trailing empty fields and an omitted optional note are accepted. Nonempty extra fields still refuse. Invalid page JSON refuses with `WEIGHTS_JSON_INVALID`.
- Fresh Node 22 test run: 27/27 pass (original 20 including updated explicit-zero call, plus 7 review tests). Final card-check: 9/9 PASS. No browser or CAESAR II execution. Kernel and other vendored files unchanged. See the refreshed `bench/RESULT.json` for current benchmark timings.
