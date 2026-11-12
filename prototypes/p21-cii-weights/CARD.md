### P2.1 · RIGID weights from a Change set (L2 CII edit)

**Repo / folder:** XCU, `prototypes/p21-cii-weights/` **Needs:** P0.2 merged (copy its `engine/` into `vendor/kernel/`)

**Goal.** Edit many rigid weights in a CII in one pass from a Change set, check every one afterwards, and export the result. This is the standalone form of step-10 "Review Final weight".

**Build:**

1. `engine/inventory.mjs`: `rigidInventory(bytes)` returns one row per element with a rigid:
   - `{elementIndex, fromNode, toNode, lengthMm, boreMm, rigidPointer, weightToken, weight, typeToken}`
   - `lengthMm` = the length of the element's delta vector.
   - `boreMm` = the element's diameter field.
2. `engine/propose.mjs`: `proposeFromTable(inventory, rows)`. `rows` come from a CSV with the header `fromNode,toNode,newWeight[,note]`. It returns a Change set where:
   - `evidence.source = manual`
   - `approval.approved = false`
   - each row is matched to exactly one element by FROM/TO.
   - No match gives `WEIGHTS_ROW_NOT_FOUND`; two matches give `WEIGHTS_ROW_AMBIGUOUS`.
3. `engine/approve.mjs`: `approveAll(changeset, {by, at, errorLimitPct})`. It approves only changes whose relative change exceeds `errorLimitPct` (default 20, like step 10). The others are left out and listed in `skippedWithinLimit[]`.
4. `engine/run.mjs`: `applyWeights(bytes, changeset)` calls the kernel `applyChangeset`, then checks every applied change by reading the weight back from the new bytes. Its report includes, per change: `{changeId, fromNode, toNode, old, new, readBack, ok}`.
5. `cli.mjs`:
   - `inventory <cii>`
   - `propose <cii> <rows.csv> <out.json>`
   - `approve <in.json> <out.json> --limit 20 --by <name>`
   - `apply <cii> <changeset.json> <out.cii>`
6. `index.html` shows these steps in order:
   1. load the CII
   2. inventory table (columns: Element, FROM, TO, Length, Bore, Weight)
   3. paste or upload the CSV
   4. proposals with "Approve all beyond ±[20]%"
   5. Apply
   6. per-row result
   7. export the revised CII and the Change set (Copy button)

**Tests:**

- T1: `rigidInventory(X-S1)` gives 1 row (element 55).
- T2: `rigidInventory(X-T)` gives 124 rows, and every `weightToken` equals the text at its span.
- T3: A 20-row CSV for X-T (invented new weights) gives a Change set that passes the validator.
- T4: With `errorLimitPct=20`, a row changing 10% is skipped and a row changing 30% is approved.
- T5: Applying 20 approved changes to X-T: the kernel diff shows exactly 20 fields, and all 20 read-backs are `ok`.
- T6: A row naming FROM/TO that does not exist gives `WEIGHTS_ROW_NOT_FOUND`.
- T7: A Change set exported from step 10 of 3D_Converters (P3.1 export: `base.kind:"xml"`) gives the kernel refusal `KERNEL_BASE_KIND`. XML Change sets belong to L3.
- T8: The P0.2 kernel copy in `vendor/` is byte-identical to P0.2's `engine/`. The test compares sha256 against `VENDORED.md`.

**Mutation check:**

- M1: approve inside the limit (T4 red).
- M2: skip the read-back (a test with a deliberately wrong read-back must go red).
- M3: match by FROM only (T6, or a new ambiguity test, red).

**Benchmark:**

- B1: 124 changes on X-T, inventory to apply, under 1 s.
- B2: 1 change on X-S2. Report the time.

**Owner demo.**

1. Load X-T, paste a 20-row CSV, approve beyond ±20%, then Apply.
2. 20 rows show `ok`, and the revised CII opens in CAESAR II.

**BM2 note:** step 10 writes CII 2019, which is **version 11**, so this v14-only kit refuses it. The Owner runs the demo on a v14 CII of their own, for example the BM2 CII re-saved by CAESAR II 14. Record the time and the counts.

**Out of scope:** nearest-weight suggestions from masters (they stay in step 10); XML edits.
