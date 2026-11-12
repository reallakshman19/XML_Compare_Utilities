# p02-cii-edit-kernel report
Branch / head commit: `proto/p02-cii-edit-kernel-20261112`, code commit 60c20fb8 (cut from main 1cba98a5); this report is the commit after it. Not pushed.

Tests: 28 pass / 0 fail   (`# tests 28 · # pass 28 · # fail 0`, about 1.4 s). T1-T12 are present by name; 13 more tests cover the other refusal codes and a 20-row number-style table; 2 are the kit's own.

Mutation check (each break made in `engine/apply.mjs`, run with `node --test`, then undone; the restored run is 28/28):
- M1 skip the sha256 check (`require(true || got === ...)`) -> **T3 red: yes** (1 fail, 27 pass).
- M2 after writing the span, rewrite the whole line as `"  " + new token` padded to the line width -> **T4 red: yes** (the re-check refuses, so T4 gets no bytes); T5, T7, T10, T11 and 3 refusal tests also red (8 fail).
- M3 drop the re-check (`recheck()` returns `[]` at once) -> **"refusal KERNEL_RECHECK_FAILED for a deliberately bad span (M3 guard)" red: yes** (1 fail). That test feeds a span shifted one field right (onto the rigid TYPE) and a byte changed outside the span.

Bench (`node bench/run.mjs`, Node 22, median of 3, engine call only):

| bench | input | what | result | ms | limit | pass |
|---|---|---|---|---|---|---|
| B1 | X-T | apply 124 weight changes (old x 1.1) | 124 applied | 282.9 | 500 | yes |
| B2 | X-S2 | apply 1 weight change | 1 applied | 6.2 | report | yes |
| B3 | X-TEXP | `readCii14` | numelt 1614 | 96 | 2000 | yes |

card-check: `card-check: PASS (9 checks)` with `--final` (C1-C9).

Refusal codes added (all in the README table, each with an `expectRefusal` test, checked by T12): KERNEL_CHANGESET_INVALID, KERNEL_BASE_KIND, KERNEL_BASE_SHA256_MISMATCH, KERNEL_NOT_APPROVED, KERNEL_FIELD_UNSUPPORTED, KERNEL_TARGET_NOT_FOUND, KERNEL_REF_NODES_MISMATCH, KERNEL_NO_RIGID, KERNEL_NO_NODENAME, KERNEL_OLD_TOKEN_MISMATCH, KERNEL_SPAN_HINT_MISMATCH, KERNEL_SPAN_SHARED, KERNEL_VALUE_INVALID, KERNEL_NEGATIVE_WEIGHT, KERNEL_ZERO_NOT_CONFIRMED, KERNEL_TOKEN_FORM_UNKNOWN, KERNEL_VALUE_DOES_NOT_FIT, KERNEL_NAME_INVALID, KERNEL_NAME_IN_USE, KERNEL_RECHECK_FAILED (20). Reader refusals (`CII_*`) pass through unchanged.

Anything that did not fit the card (and what you did instead):
1. **T9 (shared rigid pointer).** The kit reader already refuses a file in which two elements share a rigid pointer (`CII_SHARED_POINTER`), so such a file never reaches the kernel. T9 shows the kernel's own check on a read model where element 2 is made to point at rigid 1, and on a real file with two refs that differ only by an extra key (they pass rule R7 but land on the same bytes). Both give `KERNEL_SPAN_SHARED`.
2. **T7 (zero without confirmation).** Step 1 (the P0.1 rules) runs first, and rule R9 already refuses a plain `0`, so that case gives `KERNEL_CHANGESET_INVALID` with detail `R9 ...`. R9 does not recognise a zero in exponent form (`"0.000000E+00"`); the kernel's own check refuses that with `KERNEL_ZERO_NOT_CONFIRMED`. Both are tested. Worth fixing R9 in P0.1.
3. **NODENAME/NAME has more than one span.** CAESAR II stores a node's name in the node-name record of every element that touches the node (FROM or TO name). `locate` returns `{start, end, token}` of the first span plus `spans[]` with all of them; every span's text must equal `oldToken`, and all are rewritten. If an element at the node has no node-name record, the change is refused (`KERNEL_NO_NODENAME`), because adding a record is a structure change. In X-S1, X-S2, X-S3C and X-T every named node is named the same in all its records, so this never blocks a real rename there.
4. **Extra checks beyond the card**, all fail-closed: `KERNEL_SPAN_HINT_MISMATCH` (the optional `span` hint must point at the old token), `KERNEL_NAME_IN_USE` (rule from XCU `nodal-transfer.js`; swapping two names in one set is allowed), `KERNEL_TOKEN_FORM_UNKNOWN` and a same-exponent-width rule (a value needing a 3-digit exponent is `KERNEL_VALUE_DOES_NOT_FIT`).
5. **Number rounding.** A new value is written with the old token's number of decimals (6 in v14), so `1529.0000004` is written as `1.529000E+03`. The written token is returned as `newToken` in `applied`.
6. **Vendored validator is Node-only.** `vendor/validate.mjs` imports `node:fs` at its top for its own command line, so `engine/apply.mjs` runs under Node, not in a browser. The engine itself reads no files. If a page is needed later, P0.1 should split `validate()` into a pure module.
7. `.gitattributes` in the card folder keeps the LF and CRLF fixtures byte-exact (`-text`).

Owner demo (from `prototypes/p02-cii-edit-kernel` in the XCU checkout):
```
node cli.mjs apply ../../Benchmark/T.CII tests/fixtures/demo-x-t-3-weights.json T-demo.CII
node cli.mjs diff ../../Benchmark/T.CII T-demo.CII
```
The first command prints `"ok": true, "changed": 3` (rigid 1: 9.500000E+02 -> 1.000000E+03, rigid 2: 9.500000E+02 -> 9.755000E+02, rigid 3: 3.978800E+02 -> 4.000000E+02). The second prints `"count": 3` with only those three RIGID fields. Open `T-demo.CII` in CAESAR II: only those 3 rigid weights differ. Running `apply` with the same Change set on any other file is refused with `KERNEL_BASE_SHA256_MISMATCH` and writes nothing.
