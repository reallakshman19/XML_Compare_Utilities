### P0.2 · CII edit kernel (L0, shared)

**Repo / folder:** XCU, `prototypes/p02-cii-edit-kernel/`
**Needs:** K1, K2

**Goal.** One small engine that applies an approved Change set to CII bytes. It changes exactly the named fields and nothing else, and refuses rather than guesses. Later apps copy this folder; they do not import it.

**Build:**
1. **Reading is done:** use `kit/cii14.mjs`. Do not write another reader.
   - `readCii14(bytes)` returns `{version:14, eol, lines, sectionOrder, sections, counts, elements[{index, from, to, pointers, fields, rows}], rigids[{pointer, element, weight, type}], nodeNames[{pointer, element, from, to}]}`. Every value carries `{start, end, raw, token, value}` byte offsets.
   - `fieldDiff(a, b)` lists every 13-character field that differs, and refuses `CII_STRUCTURE_CHANGED` when rows, sections or line endings differ. `rigidOf(cii, elementIndex)` gives an element's rigid record.
   - It refuses v11 (`CII_VERSION_UNSUPPORTED`), mixed line endings (`CII_MIXED_EOL`) and 15 other `CII_*` cases. Its 16 tests are in `prototypes/_kit/tests/cii14.test.mjs`.
2. `engine/locate.mjs`: `locate(cii, ref, field)` returns `{start, end, token}`. Fields supported in v1:
   - `RIGID/WEIGHT`: the weight field of the rigid that the element named by the `cii` ref points to.
   - `NODENAME/NAME`: the name entry of the node named by the `cii-node` ref. Follow the NODENAME layout in XCU `nodal-transfer.js`.
   - An element that is not found gives `KERNEL_TARGET_NOT_FOUND`.
   - A `cii` ref whose `fromNode`/`toNode` differ from the element at that `elementIndex` gives `KERNEL_REF_NODES_MISMATCH`.
   - An element with no rigid, asked for `RIGID/WEIGHT`, gives `KERNEL_NO_RIGID`.
   - Two refs that land on the same span give `KERNEL_SPAN_SHARED`.
3. `engine/format.mjs`: `formatCiiNumber(value, width=13)`.
   - Write the number the way the file already does: right-aligned in the 13-character field, in the same form as the old token (v14 uses `1.390000E+03`).
   - A value that does not fit gives `KERNEL_VALUE_DOES_NOT_FIT`.
   - Negative weight gives `KERNEL_NEGATIVE_WEIGHT`.
   - 0 is allowed only with `zeroConfirmed`; otherwise `KERNEL_ZERO_NOT_CONFIRMED`.
   - v14 files write numbers in exponent form, 13 characters wide (e.g. `1.390000E+03`, `9.500000E+02`). Write the new value in the same form as the old token of that field. Include a table test of at least 15 values against tokens in X-S1, X-S3C and X-T.
4. `engine/apply.mjs`: `applyChangeset(bytes, changeset)` returns `{ok, bytes?, applied:[{changeId, start, end, oldToken, newToken}], refusals:[]}`. Checks, in this order:
   1. Run the P0.1 validator logic on the Change set (vendor `validate.mjs`). Any rule failure gives `KERNEL_CHANGESET_INVALID` with the R-code in `detail`.
   2. `base.kind` must be `cii`; otherwise `KERNEL_BASE_KIND`.
   3. The sha256 of the bytes must equal `base.sha256`; otherwise `KERNEL_BASE_SHA256_MISMATCH` (this is the checksum lock).
   4. Each change must have `approval.approved === true`; otherwise `KERNEL_NOT_APPROVED`.
   5. Each change's `oldToken` must equal the trimmed text at its located span; otherwise `KERNEL_OLD_TOKEN_MISMATCH`.
   6. Build the new bytes by replacing only the spans, applied from the end of the file backwards so offsets stay valid.
   7. **Re-check:** `readCii(newBytes)` must give the same `numelt`, the same section list, the same line count and the same line endings. Every field other than the changed ones must be byte-identical. Any other difference gives `KERNEL_RECHECK_FAILED`.
   8. Any refusal means no output bytes at all.
5. Use the kit's `fieldDiff` for step 7 and in tests; do not write another one.
6. `cli.mjs`:
   - `node cli.mjs apply <base.cii> <changeset.json> <out.cii>`
   - `node cli.mjs diff <a.cii> <b.cii>`
   - `node cli.mjs read <file.cii>`, which prints counts only.

**Tests (all on public benchmarks or invented fixtures):**
- T1: `readCii14` on X-S1 gives numelt 56, 1 rigid and 49 node names; on X-T it gives numelt 1614 and 124 rigids. X-SRC (v11) is refused with `CII_VERSION_UNSUPPORTED`.
- T2: Applying an empty Change set (0 changes) to X-S1 gives bytes identical to the input.
- T3: A Change set whose `base.sha256` is one hex digit off gives `KERNEL_BASE_SHA256_MISMATCH`, and no bytes.
- T4: Changing 1 rigid weight on X-S1: `fieldDiff` shows exactly 1 field, and its new token equals `formatCiiNumber(newValue, oldToken)`.
- T5: Changing **every** rigid weight on X-T (124 changes, new value = old × 1.1, rounded to 3 decimals): `fieldDiff` shows exactly 124 fields, and the output still reads.
- T6: A wrong `oldToken` gives `KERNEL_OLD_TOKEN_MISMATCH`; the whole set is refused, including the good changes in it.
- T7: Unapproved gives `KERNEL_NOT_APPROVED`. Zero without confirmation gives `KERNEL_ZERO_NOT_CONFIRMED`. With `zeroConfirmed` it is applied.
- T8: A `cii` ref with swapped FROM/TO gives `KERNEL_REF_NODES_MISMATCH`.
- T9: Two changes whose elements share one rigid pointer give `KERNEL_SPAN_SHARED`.
- T10: CRLF and LF copies of one invented fixture give identical results, and line endings are kept.
- T11: A NODENAME change on X-S1 (rename one node) shows exactly the expected difference.
- T12: Each refusal code in the README has a test. Check this with a test that reads the README list.

**Mutation check:**
- M1: skip the sha256 check (T3 must go red).
- M2: replace the whole line instead of the span (T4 must go red).
- M3: drop the re-check (a test that feeds a deliberately bad span must go red).

The reader's own tests already cover reading, so the kernel's tests cover locate, format, apply and re-check.

**Benchmark:**
- B1: Apply 124 weight changes on X-T (2.87 MB). Pass if the median is **under 500 ms**.
- B2: Apply 1 weight change on X-S2. Report the time.
- B3: `readCii14` on X-TEXP. Report the time and numelt. Pass if it is under 2 s (the kit reads X-T in about 120 ms).

**Owner demo.**
1. `node cli.mjs apply` on X-T with an example Change set that changes 3 weights.
2. Open the output in CAESAR II. Only those 3 weights differ.

**Out of scope:** any field other than RIGID/WEIGHT and NODENAME/NAME; a UI; XML.
