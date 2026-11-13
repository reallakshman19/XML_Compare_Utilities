### P3.3 · Reference CII → Change set proposals (L3, read-only)

**Repo / folder:** XCU, `prototypes/p33-reference-proposals/` (read-only; placed in XCU so it sits next to P1.x) **Needs:** P1.3 merged

**Goal.** Take an old analysed CII (the "reference") and a new CII, plus an approved Map file between them. Propose the reference's rigid weights as changes for the new CII, as **proposals only**: nothing is approved and nothing is written.

**Build:**

1. `engine/propose.mjs`: `proposeFromReference(referenceBytes, targetBytes, mapFile, {fields:['RIGID/WEIGHT']})`.
   - Check that the map's `source.sha256` equals the reference file and `target.sha256` equals the target file; otherwise `PROPOSE_MAP_FILE_MISMATCH`.
   - For each **approved** element pair where both sides have a rigid and the weights differ: make one change.
     - `evidence.source = reference-cii`, with the `pairId`
     - `oldToken` = the target's token
     - `newValue` = the reference's weight
     - `approval.approved = false`
   - Pairs whose weights are equal go to `unchanged[]`.
   - Pairs where only one side has a rigid go to `notComparable[]` with a reason.
2. `cli.mjs`: `propose <reference.cii> <target.cii> <map.json> <out.json>`.
3. `index.html`: a table with columns Pair, FROM→TO, Target weight, Reference weight, Difference %, Reason. Plus "Export proposals".

**Tests:**

- T1: X-S1M (reference) and X-S1 (target), with the map from P1.3 using "Approve all exact": exactly 1 proposal, the rigid weight the test changed.
- T2: Every proposal has `approval.approved === false`, and the file passes the validator.
- T3: A map made for X-T/X-TEXP but given with X-S1/X-S1M gives `PROPOSE_MAP_FILE_MISMATCH`.
- T4: Candidate and rejected pairs never produce proposals.
- T5: Reference = target (X-T against itself) gives 0 proposals, with all 124 rigid pairs listed in `unchanged`.

**Mutation check:**

- M1: use candidate pairs too (T4 red).
- M2: skip the sha256 check (T3 red).
- M3: mark proposals approved (T2 red).

**Benchmark:**

- B1: X-T → X-TEXP with an approved map. Report the proposal count (0 expected: their weights are equal) and the time; pass if under 1 s.

**Owner demo.** X-S1M as the reference and X-S1 as the target: the one proposal matches the changed weight.

Later, the Owner runs it with an old analysed CII of theirs against the step-10 BM2 CII. Its proposals feed P2.1 (CII) or, after Owner approval, step 10 (XML).

**Out of scope:** applying; fields other than RIGID/WEIGHT.

Oracle amendment (12 Nov 2026): P1.3 gate lifted; use hand-built, validated maps, no P1.3 code; ZIP base 8409590f; no push; browser checks waived.
