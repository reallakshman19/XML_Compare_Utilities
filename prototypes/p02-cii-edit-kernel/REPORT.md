# p02-cii-edit-kernel report
Branch / head commit: `proto/p02-cii-edit-kernel-20261112`, cut from main 1cba98a5. First build 60c20fb8; review repair round 1 is the latest commit on the branch. Not pushed.

Tests: 31 pass / 0 fail   (`# tests 31 · # pass 31 · # fail 0`). T1-T12 are present by name. 16 more tests cover the other refusal codes, the real-path M3 check and a 20-row number-style table. 2 are the kit's own.

Mutation check (each break made in `engine/apply.mjs` and run with `node --test`, then undone; the restored file is byte-identical to the backup and the run is 31/31). These are the results of repair round 1:
- M1: skip the sha256 check (`require(true || got === ...)`) -> **T3 red: yes** (1 fail, 30 pass).
- M2: after writing the span, rewrite the whole line as `"  " + new token` padded to the line width -> **T4 red: yes**, because the re-check refuses and T4 gets no bytes. 8 other tests are also red (9 fail).
- M3 (**real**, review finding 1): delete the line `recheck(base, next, plan);` from `applyOrThrow` -> **"M3 the re-check inside applyChangeset refuses a deliberately bad span fed through the real path" red: yes** (1 fail, 30 pass).
  - That test uses the test-only option `applyChangeset(bytes, cs, {testFault})`, which changes the spans just before the bytes are built. It does this in two ways: it shifts the span one field right, and it adds one byte outside the span. The re-check still compares against the unchanged plan.
  - Before this repair, M3 replaced the body of `recheck()` with `return []`. That only turned red the test that calls `recheck()` directly, so deleting the call went unseen. Reviewer finding, now fixed.

Bench (`node bench/run.mjs`, Node 22, median of 3, engine call only):

| bench | input | what | result | ms | limit | pass |
|---|---|---|---|---|---|---|
| B1 | X-T | apply 124 weight changes (old x 1.1) | 124 applied | 261.7 | 500 | yes |
| B2 | X-S2 | apply 1 weight change | 1 applied | 6 | report | yes |
| B3 | X-TEXP | `readCii14` | numelt 1614 | 84.7 | 2000 | yes |

card-check: `card-check: PASS (9 checks)` with `--final` (C1-C9).

Refusal codes added (all in the README table, each with an `expectRefusal` test, checked by T12): KERNEL_CHANGESET_INVALID, KERNEL_BASE_KIND, KERNEL_BASE_SHA256_MISMATCH, KERNEL_NOT_APPROVED, KERNEL_FIELD_UNSUPPORTED, KERNEL_TARGET_NOT_FOUND, KERNEL_REF_NODES_MISMATCH, KERNEL_NO_RIGID, KERNEL_NO_NODENAME, KERNEL_OLD_TOKEN_MISMATCH, KERNEL_SPAN_HINT_MISMATCH, KERNEL_SPAN_SHARED, KERNEL_VALUE_INVALID, KERNEL_NEGATIVE_WEIGHT, KERNEL_ZERO_NOT_CONFIRMED, KERNEL_TOKEN_FORM_UNKNOWN, KERNEL_VALUE_PRECISION_LOST, KERNEL_VALUE_DOES_NOT_FIT, KERNEL_NAME_NOT_STRING, KERNEL_NAME_INVALID, KERNEL_NAME_IN_USE, KERNEL_RECHECK_FAILED (22). Reader refusals (`CII_*`) pass through unchanged.

Anything that did not fit the card (and what you did instead):
1. **T9 (shared rigid pointer).** The kit reader already refuses a file in which two elements share a rigid pointer (`CII_SHARED_POINTER`), so such a file never reaches the kernel. T9 shows the kernel's own check on a read model where element 2 is made to point at rigid 1, and on a real file with two refs that differ only by an extra key (they pass rule R7 but land on the same bytes). Both give `KERNEL_SPAN_SHARED`.
2. **T7 (zero without confirmation).** Step 1 (the P0.1 rules) runs first, and rule R9 already refuses a plain `0`, so that case gives `KERNEL_CHANGESET_INVALID` with detail `R9 ...`. R9 does not recognise a zero in exponent form (`"0.000000E+00"`); the kernel's own check refuses that with `KERNEL_ZERO_NOT_CONFIRMED`. Both are tested. Worth fixing R9 in P0.1.
3. **NODENAME/NAME has more than one span.** CAESAR II stores a node's name in the node-name record of every element that touches the node (FROM or TO name). `locate` returns `{start, end, token}` of the first span plus `spans[]` with all of them; every span's text must equal `oldToken`, and all are rewritten. If an element at the node has no node-name record, the change is refused (`KERNEL_NO_NODENAME`), because adding a record is a structure change. In X-S1, X-S2, X-S3C and X-T every named node is named the same in all its records, so this never blocks a real rename there.
4. **Extra checks beyond the card**, all fail-closed: `KERNEL_SPAN_HINT_MISMATCH` (the optional `span` hint must point at the old token), `KERNEL_NAME_IN_USE` (rule from XCU `nodal-transfer.js`; swapping two names in one set is allowed), `KERNEL_TOKEN_FORM_UNKNOWN` and a same-exponent-width rule (a value needing a 3-digit exponent is `KERNEL_VALUE_DOES_NOT_FIT`).
5. **Number precision (repair round 1, finding 2).** A new value must fit the old token's form exactly. v14 keeps 7 significant digits. `1529.12345` would be written as `1.529123E+03`, so it is refused with `KERNEL_VALUE_PRECISION_LOST`. A non-zero value that reads or writes as zero (`"1e-400"`) is also refused, even with `zeroConfirmed`.
   - Rule used: the written token, read back, must equal the value within one millionth of a unit in the last place (float noise only).
   - The literal "more than half a unit in the last place" rule never fires, because `toExponential` already rounds to nearest. It would still let `1529.12345` through, so the stricter rule is used.
   - T5 and B1 (old x 1.1 rounded to 3 decimals) still apply all 124 changes.
6. **Vendored validator is Node-only.** `vendor/validate.mjs` imports `node:fs` at its top for its own command line, so `engine/apply.mjs` runs under Node, not in a browser. The engine itself reads no files. If a page is needed later, P0.1 should split `validate()` into a pure module.
7. `.gitattributes` in the card folder keeps the LF and CRLF fixtures byte-exact (`-text`).
8. **Node names must be text (finding 3).** `NODENAME/NAME` with a number as `newValue` (for example `0.1+0.2`) is refused with `KERNEL_NAME_NOT_STRING`. The P0.1 validator is unchanged. Note for P0.1: rule R9 also refuses a node name `"0"` (it reads it as a zero value without `zeroConfirmed`). That is a P0.1 follow-up, not this card's.
9. **CLI same-file guard (finding 4).** `apply` refuses (exit 2) when `out.cii` is the base file. It now compares `realpathSync` paths, lower-cased on Windows (`T.CII` vs `t.cii` is caught).
10. **Repo AGENTS.md ledger.** The `.agent-worklogs/` patch ledger and `utils/backup.cjs` backups were not made, because the brief allows edits only inside this card folder. Git history on the branch is the record.

Owner demo (from `prototypes/p02-cii-edit-kernel` in the XCU checkout):
```
node cli.mjs apply ../../Benchmark/T.CII tests/fixtures/demo-x-t-3-weights.json T-demo.CII
node cli.mjs diff ../../Benchmark/T.CII T-demo.CII
```
The first command prints `"ok": true, "changed": 3` (rigid 1: 9.500000E+02 -> 1.000000E+03, rigid 2: 9.500000E+02 -> 9.755000E+02, rigid 3: 3.978800E+02 -> 4.000000E+02). The second prints `"count": 3` with only those three RIGID fields. Open `T-demo.CII` in CAESAR II: only those 3 rigid weights differ. Running `apply` with the same Change set on any other file is refused with `KERNEL_BASE_SHA256_MISMATCH` and writes nothing.
